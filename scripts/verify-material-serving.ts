import assert from 'node:assert/strict';

import { handleSearchRequest } from '../supabase/functions/_shared/search-engine/handle-search-request.ts';
import { handleSharedRecommendationSearchRequest } from '../supabase/functions/_shared/search-engine/shared-recommendation-search-request.ts';

const identity = { sessionHash: null, ipHash: null, countryCode: null, geoSource: null };
const candidates = [
  {
    icon_id: 'material:settings', name: 'settings', source_library: 'material',
    style: 'outline', icon_type: 'font', svg: null, lexical_rank: 10,
  },
  {
    icon_id: 'lucide:settings', name: 'settings', source_library: 'lucide',
    style: 'outline', icon_type: 'svg', svg: '<svg>lucide-settings</svg>', lexical_rank: 9,
  },
  {
    icon_id: 'tabler:settings', name: 'settings', source_library: 'tabler',
    style: 'outline', icon_type: 'svg', svg: '<svg>tabler-settings</svg>', lexical_rank: 8,
  },
];
const defaultMaterialAssets = [
  { icon_id: 'material:settings', variant: 'outline', svg: '<svg>material-outline</svg>' },
  { icon_id: 'material:settings', variant: 'solid', svg: '<svg>material-solid</svg>' },
];

function createQuery(rows = [], onInsert = null) {
  const filters = [];
  const query = {
    select: () => query,
    eq: (column, value) => {
      filters.push((row) => row[column] === value);
      return query;
    },
    gte: () => query,
    update: () => query,
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    insert: (payload) => {
      if (onInsert) onInsert(payload);
      return Promise.resolve({ data: null, error: null });
    },
    in: (column, values) => {
      filters.push((row) => values.includes(row[column]));
      return Promise.resolve({ data: rows.filter((row) => filters.every((filter) => filter(row))), error: null });
    },
  };
  return query;
}

function createAdminClient({ materialAssets = defaultMaterialAssets } = {}) {
  const auditRows = [];
  return {
    auditRows,
    auth: { getUser: async () => ({ data: { user: null }, error: null }) },
    rpc: async (_name, params) => {
      const eligibleCandidates = candidates.filter((row) => !params.p_library || row.source_library === params.p_library);
      if (Array.isArray(params.p_query_groups)) {
        return {
          data: params.p_query_groups.flatMap((group) => eligibleCandidates.map((row) => ({
            ...row,
            logical_query_index: group.logical_query_index,
            query_variant: group.query_variant,
            query_variant_rank: group.query_variant_rank,
          }))),
          error: null,
        };
      }
      return { data: eligibleCandidates, error: null };
    },
    from: (table) => {
      if (table === 'material_icon_assets') return createQuery(materialAssets);
      if (table === 'icon_catalog') {
        return createQuery(candidates.filter((row) => row.source_library !== 'material').map((row) => ({
          icon_id: row.icon_id,
          svg: row.svg,
        })));
      }
      if (table === 'search_request_audit') {
        return createQuery([], (rows) => auditRows.push(...rows));
      }
      return createQuery([]);
    },
  };
}

function makeRequest(body) {
  return new Request('https://local.test/search', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function runDirect(body, options = {}) {
  const adminClient = createAdminClient(options);
  const response = await handleSearchRequest(makeRequest(body), {
    defaultSource: 'internal_test',
    defaultEnvironment: 'test',
    hydrateFinalSvg: false,
    adminClientFactory: () => adminClient,
    rateLimitEnforcer: async () => identity,
  });
  return { status: response.status, body: await response.json(), auditRows: adminClient.auditRows };
}

const solid = await runDirect({
  query: 'settings', library: 'material', library_mode: 'strict', style: 'solid', limit: 1,
});
assert.equal(solid.status, 200);
assert.equal(solid.body.results[0].icon_id, 'material:settings');
assert.equal(solid.body.results[0].style, 'solid');
assert.equal(solid.body.results[0].icon_type, 'svg');
assert.equal(solid.body.results[0].svg, '<svg>material-solid</svg>');

const outline = await runDirect({
  query: 'settings', library: 'material', library_mode: 'strict', style: 'outline', limit: 1,
});
assert.equal(outline.body.results[0].svg, '<svg>material-outline</svg>');

const allMode = await runDirect({ query: 'settings', library_mode: 'all', limit: 2 });
assert.equal(allMode.body.results.length, 2);
assert.deepEqual(allMode.body.results.map((row) => row.icon_id), ['material:settings', 'lucide:settings']);
assert.ok(allMode.body.results.every((row) => Boolean(row.svg)));

const unavailable = await runDirect({
  query: 'settings', library: 'material', library_mode: 'strict', style: 'solid', limit: 1,
}, { materialAssets: [] });
assert.equal(unavailable.status, 503);
assert.equal(unavailable.body.error, 'material_asset_unavailable');
assert.equal(unavailable.auditRows.at(-1)?.search_outcome, 'error');
assert.equal(unavailable.auditRows.at(-1)?.error_code, 'material_asset_unavailable');

const groupedClient = createAdminClient();
const groupedResponse = await handleSharedRecommendationSearchRequest(makeRequest({
  queries: [{
    query: 'settings', library: 'material', library_mode: 'strict', style: 'solid', limit: 1,
  }],
}), {
  defaultSource: 'internal_test',
  defaultEnvironment: 'test',
  hydrateFinalSvg: false,
  adminClientFactory: () => groupedClient,
  rateLimitEnforcer: async () => identity,
});
const grouped = await groupedResponse.json();
assert.equal(groupedResponse.status, 200);
assert.equal(grouped.responses[0].body.results[0].svg, '<svg>material-solid</svg>');
assert.equal(grouped.responses[0].body.results[0].style, 'solid');

const unavailableGroupedClient = createAdminClient({ materialAssets: [] });
const unavailableGroupedResponse = await handleSharedRecommendationSearchRequest(makeRequest({
  queries: [{
    query: 'settings', library: 'material', library_mode: 'strict', style: 'solid', limit: 1,
  }],
}), {
  defaultSource: 'internal_test',
  defaultEnvironment: 'test',
  hydrateFinalSvg: false,
  adminClientFactory: () => unavailableGroupedClient,
  rateLimitEnforcer: async () => identity,
});
const unavailableGrouped = await unavailableGroupedResponse.json();
assert.equal(unavailableGroupedResponse.status, 503);
assert.equal(unavailableGrouped.error, 'material_asset_unavailable');
assert.equal(unavailableGroupedClient.auditRows.at(-1)?.search_outcome, 'error');
assert.equal(unavailableGroupedClient.auditRows.at(-1)?.error_code, 'material_asset_unavailable');

const remoteServerSource = await Deno.readTextFile(new URL('../mcp/remote-server.js', import.meta.url));
assert.match(remoteServerSource, /search_result_svg_unavailable/);
assert.match(remoteServerSource, /material_asset_unavailable/);
assert.doesNotMatch(remoteServerSource, /\.map\(normalizeHostedIcon\)\s*\.filter\(Boolean\)/);

console.log(JSON.stringify({
  status: 'ok',
  strict_outline_hydrated: true,
  strict_solid_hydrated_before_style_filter: true,
  hydration_mandatory_when_flag_false: true,
  all_mode_full_results: true,
  missing_asset_is_engine_error: true,
  error_code_audited: true,
  shared_recommendation_hydrated: true,
  shared_recommendation_missing_asset_is_engine_error: true,
  remote_ranked_results_fail_closed: true,
}, null, 2));
