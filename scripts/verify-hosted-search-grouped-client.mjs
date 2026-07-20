import assert from 'node:assert/strict';

const originalFetch = globalThis.fetch;
const originalUrl = process.env.SUPERICONS_MCP_SEARCH_URL;
const originalAnon = process.env.SUPERICONS_MCP_SEARCH_ANON_KEY;
const originalApiKey = process.env.SUPERICONS_API_KEY;

process.env.SUPERICONS_MCP_SEARCH_URL = 'https://example.test/functions/v1/mcp-search-v2-treatment';
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
  assert.equal(requests[0].url, process.env.SUPERICONS_MCP_SEARCH_URL);
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
} finally {
  globalThis.fetch = originalFetch;
  if (originalUrl === undefined) delete process.env.SUPERICONS_MCP_SEARCH_URL;
  else process.env.SUPERICONS_MCP_SEARCH_URL = originalUrl;
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
}, null, 2));
