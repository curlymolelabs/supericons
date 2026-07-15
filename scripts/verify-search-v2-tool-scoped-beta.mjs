import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  BETA_HOSTED_SEARCH_FUNCTION,
  DETERMINISTIC_BETA_COHORT,
  STABLE_HOSTED_SEARCH_FUNCTION,
  getBetaCohortForTool,
  getHostedSearchFunctionNameForTool,
} from '../mcp/release-channel.js';
import {
  getRecommendationQueryVariantLimit,
  recommendIconsForTask,
} from '../mcp/recommend-icons.js';
import { logMcpSearchAttempt } from '../mcp/telemetry.js';

const betaVersion = '0.4.18-beta.0';
const packageVersion = JSON.parse(readFileSync('mcp/package.json', 'utf8')).version;
const activeSearchFunction = getHostedSearchFunctionNameForTool(packageVersion, 'search_icons');
const activeRecommendationFunction = getHostedSearchFunctionNameForTool(packageVersion, 'recommend_icons');
const activeSearchCohort = getBetaCohortForTool(packageVersion, 'search_icons');
assert.equal(
  getHostedSearchFunctionNameForTool(betaVersion, 'search_icons'),
  BETA_HOSTED_SEARCH_FUNCTION,
);
assert.equal(
  getHostedSearchFunctionNameForTool(betaVersion, 'recommend_icons'),
  STABLE_HOSTED_SEARCH_FUNCTION,
);
assert.equal(
  getHostedSearchFunctionNameForTool('0.4.17', 'search_icons'),
  STABLE_HOSTED_SEARCH_FUNCTION,
);
assert.equal(getBetaCohortForTool(betaVersion, 'search_icons'), DETERMINISTIC_BETA_COHORT);
assert.equal(getBetaCohortForTool(betaVersion, 'recommend_icons'), null);

assert.equal(getRecommendationQueryVariantLimit(null), 4);
assert.equal(getRecommendationQueryVariantLimit(undefined), 4);
assert.equal(getRecommendationQueryVariantLimit('en'), 4);
assert.equal(getRecommendationQueryVariantLimit('unsupported'), 4);
for (const locale of ['zh-Hans', 'zh-Hant', 'ja', 'ko', 'es', 'de', 'pt', 'ar', 'hi', 'vi', 'th']) {
  assert.equal(getRecommendationQueryVariantLimit(locale), 8, `${locale} must use the localized limit`);
}

const stubIcon = {
  id: 'settings',
  name: 'Settings',
  lib: 'lucide',
  style: 'outline',
  svg: '<svg></svg>',
};
async function captureRecommendationWorkload(locale) {
  let groupedQueries = [];
  await recommendIconsForTask({
    task: 'Choose an icon for application settings.',
    slots: ['cog'],
    limitPerSlot: 1,
    responseMode: 'plan',
    locale,
    semanticMap: new Map(),
    searchIconsForQuery: async () => {
      throw new Error('The grouped workload probe must not use separate searches.');
    },
    searchIconsForQueries: async (queries) => {
      groupedQueries = queries;
      return queries.map(() => [stubIcon]);
    },
    buildIconResult: async (icon) => icon,
  });
  return groupedQueries;
}

const defaultEnglishWorkload = await captureRecommendationWorkload(null);
const explicitEnglishWorkload = await captureRecommendationWorkload('en');
const localizedWorkload = await captureRecommendationWorkload('zh-Hans');
assert.equal(defaultEnglishWorkload.length, 4);
assert.equal(explicitEnglishWorkload.length, 4);
assert.equal(localizedWorkload.length, 8);

const localMcp = readFileSync('mcp/index.js', 'utf8');
const hostedMcp = readFileSync('mcp/remote-server.js', 'utf8');
assert.doesNotMatch(
  localMcp,
  /locale:\s*z\.enum\(\[[^\]]*['"]en['"]/s,
  'The public recommendation locale schema must not accept en.',
);
assert.match(localMcp, /toolName:\s*'recommend_icons'/);
assert.match(localMcp, /latencyMs:\s*performance\.now\(\) - toolStartedAt/);
assert.match(hostedMcp, /getBetaCohortForTool/);
assert.match(hostedMcp, /const toolBetaCohort = getBetaCohortForTool\(packageJson\.version, toolName\)/);
assert.doesNotMatch(hostedMcp, /const mcpBetaCohort =/);

const originalFetch = globalThis.fetch;
const originalUrl = process.env.SUPERICONS_MCP_SEARCH_URL;
const originalAnon = process.env.SUPERICONS_MCP_SEARCH_ANON_KEY;
const originalApiKey = process.env.SUPERICONS_API_KEY;
delete process.env.SUPERICONS_MCP_SEARCH_URL;
delete process.env.SUPERICONS_MCP_SEARCH_ANON_KEY;
delete process.env.SUPERICONS_API_KEY;

const requests = [];
try {
  globalThis.fetch = async (url, options) => {
    const body = JSON.parse(options.body);
    requests.push({ url: String(url), body });
    if (String(url).includes('/rest/v1/rpc/')) {
      return new Response(null, { status: 204 });
    }
    if (Array.isArray(body.queries)) {
      return new Response(JSON.stringify({
        schema_version: 1,
        response_count: body.queries.length,
        responses: body.queries.map((query, index) => ({
          index,
          status: 200,
          body: { query: query.query, results: [stubIcon] },
        })),
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ query: body.query, results: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const {
    searchIconQueriesHostedMcp,
    searchIconsHostedMcp,
  } = await import('../mcp/hosted-search-client.js');
  const searchPayload = await searchIconsHostedMcp({
    query: 'settings',
    routeToolName: 'search_icons',
    usageContext: { tool_name: 'search_icons' },
  });
  const recommendPayload = await searchIconsHostedMcp({
    query: 'settings',
    routeToolName: 'recommend_icons',
    usageContext: { tool_name: 'recommend_icons' },
  });
  assert.deepEqual(recommendPayload, searchPayload, 'Routing must not alter the hosted response body.');

  const hostedRequests = requests.filter((request) => !request.url.includes('/rest/v1/rpc/'));
  assert.equal(hostedRequests.length, 2);
  assert.match(hostedRequests[0].url, new RegExp(`/${activeSearchFunction}$`));
  assert.match(hostedRequests[1].url, new RegExp(`/${activeRecommendationFunction}$`));
  assert.equal(hostedRequests[0].body.beta_cohort, activeSearchCohort || undefined);
  assert.equal(hostedRequests[1].body.beta_cohort, undefined);
  assert.equal(hostedRequests[1].body.tool_name, 'recommend_icons');

  async function buildRecommendation(searchIconsForQueries) {
    return await recommendIconsForTask({
      task: 'Choose an icon for application settings.',
      slots: ['cog'],
      limitPerSlot: 1,
      responseMode: 'plan',
      locale: null,
      semanticMap: new Map(),
      searchIconsForQuery: async () => {
        throw new Error('Recommendation route parity must use grouped search.');
      },
      searchIconsForQueries,
      buildIconResult: async (icon) => icon,
    });
  }

  const stableRecommendation = await buildRecommendation(async (queries) => (
    queries.map(() => [stubIcon])
  ));
  const routedRecommendation = await buildRecommendation(async (queries) => {
    const payloads = await searchIconQueriesHostedMcp({
      queries: queries.map((query, index) => ({
        ...query,
        routeToolName: 'recommend_icons',
        usageContext: {
          tool_name: 'recommend_icons',
          request_id: 'tool-route-parity',
          dedupe_key: `tool-route-parity:${index}`,
        },
      })),
    });
    return payloads.map((payload) => payload.results);
  });
  assert.equal(
    JSON.stringify(routedRecommendation),
    JSON.stringify(stableRecommendation),
    'Tool routing must preserve the full recommendation response bytes.',
  );

  const groupedRecommendationRequest = requests.find((request) => Array.isArray(request.body.queries));
  assert.ok(groupedRecommendationRequest);
  assert.match(groupedRecommendationRequest.url, new RegExp(`/${STABLE_HOSTED_SEARCH_FUNCTION}$`));

  await logMcpSearchAttempt({
    query: 'settings',
    resultCount: 3,
    toolName: 'recommend_icons',
    latencyMs: 1234.4,
  });
  const telemetryRequest = requests.find((request) => request.url.endsWith('/rpc/si_log_mcp_search_outcome_v2'));
  assert.ok(telemetryRequest, 'Tool telemetry must use the latency-aware RPC.');
  assert.equal(telemetryRequest.body.p_latency_ms, 1234);
  assert.equal(telemetryRequest.body.p_tool_name, 'recommend_icons');
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
  package_version: packageVersion,
  active_search_route: activeSearchFunction,
  active_recommendation_route: activeRecommendationFunction,
  active_search_beta_cohort: activeSearchCohort,
  beta_contract_search_route: BETA_HOSTED_SEARCH_FUNCTION,
  beta_contract_recommendation_route: STABLE_HOSTED_SEARCH_FUNCTION,
  beta_contract_search_cohort: DETERMINISTIC_BETA_COHORT,
  recommendation_beta_cohort: null,
  english_variant_limit: 4,
  localized_variant_limit: 8,
  measured_english_query_count: defaultEnglishWorkload.length,
  measured_localized_query_count: localizedWorkload.length,
  route_level_response_parity: true,
  recommendation_response_byte_parity: true,
  end_to_end_tool_latency_rpc: 'si_log_mcp_search_outcome_v2',
}, null, 2));
