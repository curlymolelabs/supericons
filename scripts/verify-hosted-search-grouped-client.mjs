import assert from 'node:assert/strict';

const originalFetch = globalThis.fetch;
const originalUrl = process.env.SUPERICONS_MCP_SEARCH_URL;
const originalGroupedUrl = process.env.SUPERICONS_MCP_GROUPED_SEARCH_URL;
const originalAnon = process.env.SUPERICONS_MCP_SEARCH_ANON_KEY;
const originalApiKey = process.env.SUPERICONS_API_KEY;

process.env.SUPERICONS_MCP_SEARCH_URL = 'https://example.test/functions/v1/mcp-search';
process.env.SUPERICONS_MCP_GROUPED_SEARCH_URL = 'https://example.test/functions/v1/mcp-search-grouped';
delete process.env.SUPERICONS_MCP_SEARCH_ANON_KEY;
delete process.env.SUPERICONS_API_KEY;

const requests = [];
globalThis.fetch = async (url, options) => {
  requests.push({ url, options, body: JSON.parse(options.body) });
  const queries = JSON.parse(options.body).queries;
  return new Response(JSON.stringify({
    schema_version: 1,
    response_count: queries.length,
    responses: queries.map((query, index) => ({
      index,
      status: 200,
      body: { query: query.query, results: [{ icon_id: `lucide:${query.query}` }] },
    })),
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

try {
  const { searchIconQueriesHostedMcp } = await import('../mcp/hosted-search-client.js');
  const responses = await searchIconQueriesHostedMcp({
    queries: [
      { query: 'cog', libraryMode: 'all', usageContext: { tool_name: 'recommend_icons', request_id: 'request-1' } },
      { query: 'settings', libraryMode: 'all', usageContext: { tool_name: 'recommend_icons', request_id: 'request-1' } },
    ],
  });

  assert.equal(requests.length, 1, 'Grouped client must make one HTTP request.');
  assert.equal(requests[0].url, process.env.SUPERICONS_MCP_GROUPED_SEARCH_URL);
  assert.equal(requests[0].body.queries.length, 2);
  assert.equal(requests[0].body.queries[0].library_mode, 'all');
  assert.equal('libraryMode' in requests[0].body.queries[0], false);
  assert.equal('usageContext' in requests[0].body.queries[0], false);
  assert.deepEqual(responses.map((response) => response.results[0].icon_id), [
    'lucide:cog',
    'lucide:settings',
  ]);

  globalThis.fetch = async (url, options) => {
    requests.push({ url, options, body: JSON.parse(options.body) });
    return new Response(JSON.stringify({
      schema_version: 1,
      response_count: 1,
      responses: [{
        index: 0,
        status: 429,
        body: {
          error: 'daily_allowance_exceeded',
          code: 'daily_allowance_exceeded',
          hint: 'Wait until the allowance resets.',
          retryable: true,
          retry_after_seconds: 43_200,
          details: {
            tier: 'anonymous',
            daily_limit: 300,
            retry_after_seconds: 43_200,
          },
        },
      }],
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  await assert.rejects(
    searchIconQueriesHostedMcp({
      queries: [
        { query: 'cog', usageContext: { tool_name: 'recommend_icons', request_id: 'request-2' } },
      ],
    }),
    (error) => (
      error.code === 'daily_allowance_exceeded'
      && error.status === 429
      && error.retryable === true
      && error.retry_after_seconds === 43_200
      && error.details?.daily_limit === 300
    ),
    'Grouped subrequest failures must preserve actionable rate-limit details.',
  );

  let compatibilityFallbackSearches = 0;
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options, body: JSON.parse(options.body) });
    if (url === process.env.SUPERICONS_MCP_GROUPED_SEARCH_URL) {
      return new Response(JSON.stringify({
        schema_version: 1,
        response_count: 1,
        responses: [{
          index: 0,
          status: 200,
          body: {
            error: 'Grouped search returned a non-JSON response.',
            code: 'invalid_grouped_response',
            retryable: false,
          },
        }],
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    compatibilityFallbackSearches += 1;
    return new Response(JSON.stringify({
      query: 'cog',
      results: [{ icon_id: 'lucide:cog' }],
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const malformedFallback = await searchIconQueriesHostedMcp({
    queries: [
      { query: 'cog', usageContext: { tool_name: 'recommend_icons', request_id: 'request-3' } },
    ],
  });
  assert.equal(compatibilityFallbackSearches, 1);
  assert.equal(malformedFallback[0].results[0].icon_id, 'lucide:cog');

  let rollbackFallbackSearches = 0;
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options, body: JSON.parse(options.body) });
    if (url === process.env.SUPERICONS_MCP_GROUPED_SEARCH_URL) {
      return new Response(JSON.stringify({ error: 'not_found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    rollbackFallbackSearches += 1;
    return new Response(JSON.stringify({
      query: 'settings',
      results: [{ icon_id: 'lucide:settings' }],
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const rollbackFallback = await searchIconQueriesHostedMcp({
    queries: [
      { query: 'settings', usageContext: { tool_name: 'recommend_icons', request_id: 'request-4' } },
    ],
  });
  assert.equal(rollbackFallbackSearches, 1);
  assert.equal(rollbackFallback[0].results[0].icon_id, 'lucide:settings');
} finally {
  globalThis.fetch = originalFetch;
  if (originalUrl === undefined) delete process.env.SUPERICONS_MCP_SEARCH_URL;
  else process.env.SUPERICONS_MCP_SEARCH_URL = originalUrl;
  if (originalGroupedUrl === undefined) delete process.env.SUPERICONS_MCP_GROUPED_SEARCH_URL;
  else process.env.SUPERICONS_MCP_GROUPED_SEARCH_URL = originalGroupedUrl;
  if (originalAnon === undefined) delete process.env.SUPERICONS_MCP_SEARCH_ANON_KEY;
  else process.env.SUPERICONS_MCP_SEARCH_ANON_KEY = originalAnon;
  if (originalApiKey === undefined) delete process.env.SUPERICONS_API_KEY;
  else process.env.SUPERICONS_API_KEY = originalApiKey;
}

console.log(JSON.stringify({
  status: 'ok',
  http_requests: requests.length,
  logical_queries: requests[0].body.queries.length,
  response_order_preserved: true,
  grouped_rate_limit_propagated: true,
  malformed_response_fell_back_to_individual: true,
  grouped_endpoint_rollback_fell_back_to_individual: true,
}, null, 2));
