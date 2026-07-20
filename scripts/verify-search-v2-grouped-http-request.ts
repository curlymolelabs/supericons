import assert from 'node:assert/strict';

import { handleGroupedSearchRequest } from '../supabase/functions/_shared/search-engine/grouped-search-request.ts';
import { exceedsSearchRateLimit } from '../supabase/functions/_shared/search-engine/rate-limit.ts';

assert.equal(exceedsSearchRateLimit(119, 1, 120), false);
assert.equal(exceedsSearchRateLimit(120, 1, 120), true);
assert.equal(exceedsSearchRateLimit(115, 6, 120), true);

const rateLimitCosts: number[] = [];
const handledBodies: Array<Record<string, unknown>> = [];
let active = 0;
let maximumActive = 0;

const request = new Request('https://example.test/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '203.0.113.1' },
  body: JSON.stringify({
    queries: [
      { query: 'cog', library_mode: 'all' },
      { query: 'settings', library_mode: 'all' },
      { query: 'gear', library_mode: 'all' },
      { query: 'preferences', library_mode: 'all' },
    ],
  }),
});

const response = await handleGroupedSearchRequest(request, {
  maxQueries: 8,
  concurrency: 2,
  rateLimitEnforcer: async (_req, cost = 1) => {
    rateLimitCosts.push(cost);
    return {
      sessionHash: null,
      ipHash: 'abc123',
      countryCode: null,
      geoSource: null,
    };
  },
  singleHandler: async (subrequest) => {
    active += 1;
    maximumActive = Math.max(maximumActive, active);
    const body = await subrequest.json();
    handledBodies.push(body);
    await new Promise((resolve) => setTimeout(resolve, 1));
    active -= 1;
    return new Response(JSON.stringify({ query: body.query, results: [{ icon_id: `lucide:${body.query}` }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  },
});

assert.equal(response.status, 200);
const payload = await response.json();
assert.deepEqual(rateLimitCosts, [4], 'The grouped request must reserve one rate-limit unit per logical query.');
assert.equal(handledBodies.length, 4);
assert.ok(maximumActive <= 2, 'Internal concurrency must obey its bound.');
assert.deepEqual(payload.responses.map((entry) => entry.index), [0, 1, 2, 3]);
assert.deepEqual(payload.responses.map((entry) => entry.body.query), ['cog', 'settings', 'gear', 'preferences']);

const tooMany = await handleGroupedSearchRequest(new Request('https://example.test/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ queries: Array.from({ length: 9 }, (_, index) => ({ query: `q${index}` })) }),
}), {
  maxQueries: 8,
  rateLimitEnforcer: async () => ({ sessionHash: null, ipHash: null, countryCode: null, geoSource: null }),
  singleHandler: async () => new Response('{}'),
});
assert.equal(tooMany.status, 400);
assert.equal((await tooMany.json()).code, 'grouped_query_limit_exceeded');

let auditWrites = 0;
let integratedRateLimitCost = 0;
const emptyQueryBuilder = {
  select() { return this; },
  eq() { return this; },
  gte() { return this; },
  in() { return Promise.resolve({ data: [], error: null }); },
  maybeSingle() { return Promise.resolve({ data: null, error: null }); },
  insert() {
    auditWrites += 1;
    return Promise.resolve({ data: null, error: null });
  },
};
const integratedAdminClient = {
  auth: { getUser: async () => ({ data: { user: null }, error: null }) },
  rpc: async () => ({ data: [], error: null }),
  from: () => emptyQueryBuilder,
};
const integrated = await handleGroupedSearchRequest(new Request('https://example.test/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    queries: [
      { query: 'cog', library_mode: 'all' },
      { query: 'settings', library_mode: 'all' },
    ],
  }),
}), {
  maxQueries: 8,
  concurrency: 2,
  adminClientFactory: () => integratedAdminClient,
  rateLimitEnforcer: async (_req, cost = 1) => {
    integratedRateLimitCost += cost;
    return { sessionHash: null, ipHash: null, countryCode: null, geoSource: null };
  },
});
assert.equal(integrated.status, 200);
assert.equal(integratedRateLimitCost, 2);
assert.equal(auditWrites, 2, 'Every logical grouped search must finish its synchronous audit write.');

const stableRouteSource = await Deno.readTextFile(
  new URL('../supabase/functions/mcp-search/index.ts', import.meta.url),
);
assert.match(
  stableRouteSource,
  /handleGroupedSearchRequest/,
  'The stable MCP search route must accept grouped recommendation requests.',
);
assert.match(stableRouteSource, /defaultSource:\s*'mcp'/);
assert.match(stableRouteSource, /maxQueries:\s*96/);

console.log(JSON.stringify({
  status: 'ok',
  logical_queries: handledBodies.length,
  reserved_rate_limit_cost: rateLimitCosts[0],
  maximum_internal_concurrency: maximumActive,
  response_order_preserved: true,
  synchronous_audit_writes: auditWrites,
  stable_route_grouped_support: true,
}, null, 2));
