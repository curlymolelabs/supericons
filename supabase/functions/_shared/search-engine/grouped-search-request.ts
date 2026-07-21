import {
  buildErrorResponse,
  corsHeaders,
  handleSearchRequest,
  type SearchRequestHandlerOptions,
} from './handle-search-request.ts';
import {
  enforceSearchRateLimit,
  isTierEnforcementEnabled,
} from './rate-limit.ts';

type RateLimitIdentity = Awaited<ReturnType<typeof enforceSearchRateLimit>>;
type SingleHandler = (request: Request, options: SearchRequestHandlerOptions) => Promise<Response>;

interface GroupedSearchRequestOptions extends SearchRequestHandlerOptions {
  maxQueries?: number;
  concurrency?: number;
  singleHandler?: SingleHandler;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
) {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  const workerCount = Math.min(items.length, Math.max(1, concurrency));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

export async function handleGroupedSearchRequest(
  req: Request,
  {
    maxQueries = 96,
    concurrency = 8,
    singleHandler = handleSearchRequest,
    rateLimitEnforcer = enforceSearchRateLimit,
    ...handlerOptions
  }: GroupedSearchRequestOptions = {},
) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  let parsedBody: unknown;
  try {
    parsedBody = await req.json();
  } catch {
    return jsonResponse({
      error: 'The search request body is not valid JSON.',
      code: 'invalid_search_request',
      hint: 'Send one JSON object containing either normal search fields or a queries array.',
      retryable: false,
    }, 400);
  }

  if (!parsedBody || typeof parsedBody !== 'object' || Array.isArray(parsedBody)) {
    return jsonResponse({
      error: 'The search request body must be a JSON object.',
      code: 'invalid_search_request',
      hint: 'Send one JSON object containing either normal search fields or a queries array.',
      retryable: false,
    }, 400);
  }
  const body = parsedBody as Record<string, unknown>;

  if (!Array.isArray(body.queries)) {
    const singleRequest = new Request(req.url, {
      method: 'POST',
      headers: req.headers,
      body: JSON.stringify(body),
    });
    return await singleHandler(singleRequest, { rateLimitEnforcer, ...handlerOptions });
  }

  if (body.queries.length < 1 || body.queries.length > maxQueries) {
    return jsonResponse({
      error: 'Grouped search query count is outside the allowed range.',
      code: 'grouped_query_limit_exceeded',
      hint: `Provide between 1 and ${maxQueries} queries.`,
      retryable: false,
    }, 400);
  }
  if (body.queries.some((query) => !query || typeof query !== 'object' || Array.isArray(query))) {
    return jsonResponse({
      error: 'Each grouped search entry must be an object.',
      code: 'invalid_grouped_query',
      hint: 'Provide the normal search request fields for each query.',
      retryable: false,
    }, 400);
  }

  if (isTierEnforcementEnabled()) {
    return jsonResponse({
      error: 'Grouped search is temporarily unavailable while hosted allowance accounting is active.',
      code: 'grouped_search_temporarily_unavailable',
      hint: 'Retry these searches as individual requests.',
      retryable: true,
    }, 503);
  }

  let identity: RateLimitIdentity;
  try {
    identity = await rateLimitEnforcer(req, body.queries.length);
  } catch (error) {
    return buildErrorResponse(error);
  }

  const sharedFields = Object.fromEntries(
    Object.entries(body).filter(([key]) => key !== 'queries'),
  );
  const responses = await mapWithConcurrency(
    body.queries as Array<Record<string, unknown>>,
    concurrency,
    async (query, index) => {
      const subrequest = new Request(req.url, {
        method: 'POST',
        headers: req.headers,
        body: JSON.stringify({ ...sharedFields, ...query }),
      });
      const response = await singleHandler(subrequest, {
        ...handlerOptions,
        rateLimitEnforcer: async () => identity,
      });
      let responseBody: unknown;
      let responseStatus = response.status;
      try {
        responseBody = JSON.parse(await response.text());
      } catch {
        responseBody = {
          error: 'Grouped search returned a non-JSON response.',
          code: 'invalid_grouped_response',
          retryable: false,
        };
        responseStatus = 502;
      }
      return {
        index,
        status: responseStatus,
        body: responseBody,
      };
    },
  );

  return jsonResponse({
    schema_version: 1,
    response_count: responses.length,
    responses,
  });
}
