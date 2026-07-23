import assert from 'node:assert/strict';

const originalFetch = globalThis.fetch;
const originalSearchUrl = process.env.SUPERICONS_MCP_SEARCH_URL;
const originalGroupedUrl = process.env.SUPERICONS_MCP_GROUPED_SEARCH_URL;
const originalAnonKey = process.env.SUPERICONS_MCP_SEARCH_ANON_KEY;

process.env.SUPERICONS_MCP_SEARCH_URL = 'https://example.test/search';
process.env.SUPERICONS_MCP_GROUPED_SEARCH_URL = 'https://example.test/search-grouped';
delete process.env.SUPERICONS_MCP_SEARCH_ANON_KEY;

const episodeId = '7089f7e0-d25b-43ba-8ec7-ae5e745a5349';
const recoveryChainId = 'f1c77cab-a578-4894-803e-53c2ddfa2f92';
let attemptNumber = 0;
const usageContext = {
  source: 'mcp',
  channel: 'hosted_mcp',
  environment: 'production',
  client_family: 'test',
  tool_name: 'search_icons',
  request_id: 'request-linkage-test',
  contract_version: 1,
  episode_id: episodeId,
  recovery_chain_id: recoveryChainId,
  next_attempt_number: () => {
    attemptNumber += 1;
    return attemptNumber;
  },
};

const requests = [];
globalThis.fetch = async (url, options) => {
  const body = JSON.parse(options.body);
  requests.push({ url, body });
  if (Array.isArray(body.queries)) {
    return new Response(JSON.stringify({
      responses: body.queries.map((query, index) => ({
        index,
        status: 200,
        body: {
          query: query.query,
          results: [{ icon_id: `lucide:${query.query}` }],
        },
      })),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify({
    query: body.query,
    results: [{ icon_id: `lucide:${body.query}` }],
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

try {
  const {
    searchIconQueriesHostedMcp,
    searchIconsHostedMcp,
  } = await import('../mcp/hosted-search-client.js');

  await searchIconsHostedMcp({
    query: 'camera',
    libraryMode: 'all',
    usageContext,
  });

  const singleAttempt = requests[0].body;
  assert.equal(singleAttempt.contract_version, 1);
  assert.equal(singleAttempt.episode_id, episodeId);
  assert.equal(singleAttempt.recovery_chain_id, recoveryChainId);
  assert.match(singleAttempt.attempt_id, /^[0-9a-f-]{36}$/);
  assert.equal(singleAttempt.attempt_number, 1);
  assert.equal(singleAttempt.query_variant, 'camera');
  assert.equal(singleAttempt.query_origin, 'user');
  assert.equal(singleAttempt.search_engine, 'search_v2');

  await searchIconQueriesHostedMcp({
    queries: [
      {
        query: 'settings',
        libraryMode: 'all',
        usageContext: { ...usageContext, tool_name: 'recommend_icons' },
      },
      {
        query: 'profile',
        libraryMode: 'all',
        usageContext: { ...usageContext, tool_name: 'recommend_icons' },
      },
    ],
  });

  const groupedAttempts = requests[1].body.queries;
  assert.deepEqual(groupedAttempts.map((row) => row.attempt_number), [2, 3]);
  assert.equal(new Set(groupedAttempts.map((row) => row.attempt_id)).size, 2);
  for (const row of groupedAttempts) {
    assert.equal(row.episode_id, episodeId);
    assert.equal(row.recovery_chain_id, recoveryChainId);
    assert.equal(row.query_origin, 'recommendation_variant');
  }

  console.log(JSON.stringify({
    status: 'ok',
    final_episode_shared: true,
    unique_attempt_ids: 3,
    ordered_attempt_numbers: [1, 2, 3],
    search_behavior_changed: false,
  }, null, 2));
} finally {
  globalThis.fetch = originalFetch;
  if (originalSearchUrl === undefined) delete process.env.SUPERICONS_MCP_SEARCH_URL;
  else process.env.SUPERICONS_MCP_SEARCH_URL = originalSearchUrl;
  if (originalGroupedUrl === undefined) delete process.env.SUPERICONS_MCP_GROUPED_SEARCH_URL;
  else process.env.SUPERICONS_MCP_GROUPED_SEARCH_URL = originalGroupedUrl;
  if (originalAnonKey === undefined) delete process.env.SUPERICONS_MCP_SEARCH_ANON_KEY;
  else process.env.SUPERICONS_MCP_SEARCH_ANON_KEY = originalAnonKey;
}
