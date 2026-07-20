import assert from 'node:assert/strict';

import { handleGroupedSearchRequest } from '../supabase/functions/_shared/search-engine/grouped-search-request.ts';
import { exceedsSearchRateLimit } from '../supabase/functions/_shared/search-engine/rate-limit.ts';

const originalTierEnforcement = Deno.env.get('SEARCH_ENGINE_TIER_ENFORCEMENT');
Deno.env.delete('SEARCH_ENGINE_TIER_ENFORCEMENT');

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

const nullBody = await handleGroupedSearchRequest(new Request('https://example.test/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: 'null',
}), {
  rateLimitEnforcer: async () => ({ sessionHash: null, ipHash: null, countryCode: null, geoSource: null }),
  singleHandler: async () => new Response('{}'),
});
assert.equal(nullBody.status, 400);
assert.equal((await nullBody.json()).code, 'invalid_search_request');

const invalidJson = await handleGroupedSearchRequest(new Request('https://example.test/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: '{',
}), {
  rateLimitEnforcer: async () => ({ sessionHash: null, ipHash: null, countryCode: null, geoSource: null }),
  singleHandler: async () => new Response('{}'),
});
assert.equal(invalidJson.status, 400);
assert.equal((await invalidJson.json()).code, 'invalid_search_request');

const malformedSubresponse = await handleGroupedSearchRequest(new Request('https://example.test/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ queries: [{ query: 'cog' }] }),
}), {
  rateLimitEnforcer: async () => ({ sessionHash: null, ipHash: null, countryCode: null, geoSource: null }),
  singleHandler: async () => new Response('not-json', { status: 200 }),
});
assert.equal(malformedSubresponse.status, 200);
const malformedPayload = await malformedSubresponse.json();
assert.equal(malformedPayload.responses[0].status, 502);
assert.equal(malformedPayload.responses[0].body.code, 'invalid_grouped_response');

let enforcementHandlerCalls = 0;
Deno.env.set('SEARCH_ENGINE_TIER_ENFORCEMENT', 'on');
const enforcementBlocked = await handleGroupedSearchRequest(new Request('https://example.test/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ queries: [{ query: 'cog' }] }),
}), {
  rateLimitEnforcer: async () => ({ sessionHash: null, ipHash: null, countryCode: null, geoSource: null }),
  singleHandler: async () => {
    enforcementHandlerCalls += 1;
    return new Response('{}');
  },
});
assert.equal(enforcementBlocked.status, 503);
assert.equal((await enforcementBlocked.json()).code, 'grouped_search_temporarily_unavailable');
assert.equal(enforcementHandlerCalls, 0);
Deno.env.delete('SEARCH_ENGINE_TIER_ENFORCEMENT');

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
  /handleSearchRequest/,
  'The stable MCP search route must retain the individual request handler.',
);
assert.match(stableRouteSource, /defaultSource:\s*'mcp'/);
assert.doesNotMatch(stableRouteSource, /handleGroupedSearchRequest/);

const groupedRouteSource = await Deno.readTextFile(
  new URL('../supabase/functions/mcp-search-grouped/index.ts', import.meta.url),
);
assert.match(groupedRouteSource, /handleSharedRecommendationSearchRequest/);
assert.match(groupedRouteSource, /defaultSource:\s*'mcp'/);
assert.match(groupedRouteSource, /defaultEnvironment:\s*null/);
assert.match(groupedRouteSource, /candidateRpcName:\s*'si_search_icon_candidates_v4'/);
assert.match(groupedRouteSource, /hydrateFinalSvg:\s*true/);
assert.match(groupedRouteSource, /includeTimingInResponse:\s*true/);
assert.match(groupedRouteSource, /maxQueries:\s*40/);

if (originalTierEnforcement === undefined) {
  Deno.env.delete('SEARCH_ENGINE_TIER_ENFORCEMENT');
} else {
  Deno.env.set('SEARCH_ENGINE_TIER_ENFORCEMENT', originalTierEnforcement);
}

console.log(JSON.stringify({
  status: 'ok',
  logical_queries: handledBodies.length,
  reserved_rate_limit_cost: rateLimitCosts[0],
  maximum_internal_concurrency: maximumActive,
  response_order_preserved: true,
  synchronous_audit_writes: auditWrites,
  stable_route_unchanged: true,
  additive_grouped_route: true,
  grouped_route_uses_shared_recommendation_pipeline: true,
  grouped_route_max_logical_queries: 40,
  null_body_rejected: true,
  malformed_subresponse_status: malformedPayload.responses[0].status,
  tier_enforcement_fails_closed: true,
}, null, 2));
