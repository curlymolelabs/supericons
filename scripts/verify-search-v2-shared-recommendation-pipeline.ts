import assert from 'node:assert/strict';

import { handleGroupedSearchRequest } from '../supabase/functions/_shared/search-engine/grouped-search-request.ts';
import {
  handleSharedRecommendationSearchRequest,
} from '../supabase/functions/_shared/search-engine/shared-recommendation-search-request.ts';

function candidate(queryVariant: string, queryVariantRank: number, logicalQueryIndex?: number) {
  return {
    ...(Number.isInteger(logicalQueryIndex) ? { logical_query_index: logicalQueryIndex } : {}),
    query_variant: queryVariant,
    query_variant_rank: queryVariantRank,
    icon_id: 'lucide:settings',
    name: 'settings',
    source_library: 'lucide',
    style: 'outline',
    icon_type: 'svg',
    lexical_rank: 2,
    registry_rank: 1,
    avoid_rank: 0,
  };
}

function createAdminClient() {
  const counters = {
    rpc: 0,
    metadata: 0,
    svg: 0,
    publicSemantic: 0,
    auditInsertCalls: 0,
    auditRows: 0,
  };

  const client = {
    counters,
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
    },
    async rpc(name: string, params: Record<string, unknown>) {
      counters.rpc += 1;
      if (name === 'si_search_icon_candidates_v4') {
        const groups = params.p_query_groups as Array<Record<string, unknown>>;
        return {
          data: groups.map((group) => candidate(
            String(group.query_variant),
            Number(group.query_variant_rank),
            Number(group.logical_query_index),
          )),
          error: null,
        };
      }
      if (name === 'si_search_icon_candidates_v3') {
        const queries = params.p_queries as string[];
        return {
          data: queries.map((query, index) => candidate(query, index)),
          error: null,
        };
      }
      throw new Error(`Unexpected RPC: ${name}`);
    },
    from(table: string) {
      if (table === 'search_request_audit') {
        return {
          async insert(payload: unknown) {
            counters.auditInsertCalls += 1;
            counters.auditRows += Array.isArray(payload) ? payload.length : 1;
            return { data: null, error: null };
          },
        };
      }

      return {
        select() {
          return {
            async in() {
              if (table === 'icon_search_private_manifest') {
                counters.metadata += 1;
                return {
                  data: [{
                    icon_id: 'lucide:settings',
                    semantic_aliases: ['settings'],
                    use_cases: ['application settings'],
                    contraindications: [],
                    trust_tier: 'reviewed',
                    explanation_short: 'Application settings.',
                  }],
                  error: null,
                };
              }
              if (table === 'icon_search_private_features') {
                counters.metadata += 1;
                return {
                  data: [{
                    icon_id: 'lucide:settings',
                    popularity_score: 1,
                    behavioral_score: 1,
                    editorial_score: 1,
                    replace_risk_score: 0,
                    manual_boost: 0,
                    manual_penalty: 0,
                  }],
                  error: null,
                };
              }
              if (table === 'icon_catalog') {
                counters.svg += 1;
                return {
                  data: [{ icon_id: 'lucide:settings', svg: '<svg>settings</svg>' }],
                  error: null,
                };
              }
              if (table === 'icon_registry_public_export') {
                counters.publicSemantic += 1;
                return {
                  data: [{
                    icon_id: 'lucide:settings',
                    source_library: 'lucide',
                    label: 'Settings',
                    purpose: 'Open application settings.',
                    semantic_tags: ['settings'],
                  }],
                  error: null,
                };
              }
              throw new Error(`Unexpected table read: ${table}`);
            },
          };
        },
      };
    },
  };
  return client;
}

const queries = ['cog', 'settings', 'gear', 'preferences'].map((query, index) => ({
  query,
  library_mode: 'all',
  style: 'any',
  limit: 10,
  locale: null,
  include_query_frame: true,
  tool_name: 'recommend_icons',
  request_id: 'shared-recommendation-test',
  dedupe_key: `shared-recommendation-test:${index}`,
}));
function buildRequest() {
  return new Request('https://example.test/recommend-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ queries }),
  });
}

const sharedClient = createAdminClient();
const sharedRateLimitCosts: number[] = [];
const sharedResponse = await handleSharedRecommendationSearchRequest(buildRequest(), {
  adminClientFactory: () => sharedClient,
  candidateRpcName: 'si_search_icon_candidates_v4',
  hydrateFinalSvg: true,
  includeTimingInResponse: true,
  maxQueries: 8,
  timingSink: () => {},
  rateLimitEnforcer: async (_request, cost = 1) => {
    sharedRateLimitCosts.push(cost);
    return { sessionHash: null, ipHash: null, countryCode: null, geoSource: null };
  },
});
assert.equal(sharedResponse.status, 200);
const sharedPayload = await sharedResponse.json();
const sharedTiming = sharedPayload.measurement_timing;
delete sharedPayload.measurement_timing;

const separateClient = createAdminClient();
const separateRateLimitCosts: number[] = [];
const separateResponse = await handleGroupedSearchRequest(buildRequest(), {
  adminClientFactory: () => separateClient,
  candidateRpcName: 'si_search_icon_candidates_v2',
  candidateBatchRpcName: 'si_search_icon_candidates_v3',
  hydrateFinalSvg: true,
  maxQueries: 8,
  concurrency: 1,
  rateLimitEnforcer: async (_request, cost = 1) => {
    separateRateLimitCosts.push(cost);
    return { sessionHash: null, ipHash: null, countryCode: null, geoSource: null };
  },
});
assert.equal(separateResponse.status, 200);
const separatePayload = await separateResponse.json();

assert.deepEqual(sharedPayload, separatePayload, 'Shared pipeline responses must equal separate search responses.');
assert.equal(sharedTiming.event, 'search_stage_timing');
assert.equal(sharedTiming.counts.query_variants > 0, true);
assert.equal(sharedTiming.approximate_sizes.candidate_svg_characters, 0);
assert.equal(
  sharedPayload.responses.every((entry: any) => entry.body.query_expansion.query_frame),
  true,
);
assert.deepEqual(sharedRateLimitCosts, [4]);
assert.deepEqual(separateRateLimitCosts, [4]);
assert.equal(sharedClient.counters.rpc, 1, 'Shared recommendation must use one candidate RPC.');
assert.equal(separateClient.counters.rpc, 4, 'Separate control must use one candidate RPC per logical query.');
assert.equal(sharedClient.counters.metadata, 2, 'Shared metadata must be fetched once per metadata table.');
assert.equal(sharedClient.counters.svg, 1, 'Shared SVG hydration must run once.');
assert.equal(sharedClient.counters.publicSemantic, 1, 'Shared public semantic hydration must run once.');
assert.equal(sharedClient.counters.auditInsertCalls, 1, 'Shared audits must use one bulk insert.');
assert.equal(sharedClient.counters.auditRows, 4, 'Shared audits must retain one row per logical query.');
assert.equal(separateClient.counters.auditRows, 4);

const mixedContract = await handleSharedRecommendationSearchRequest(new Request('https://example.test/recommend-search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    queries: [
      { query: 'cog', library_mode: 'all', limit: 10 },
      { query: 'settings', library_mode: 'all', limit: 20 },
    ],
  }),
}), {
  adminClientFactory: () => createAdminClient(),
  rateLimitEnforcer: async () => ({ sessionHash: null, ipHash: null, countryCode: null, geoSource: null }),
});
assert.equal(mixedContract.status, 400);
assert.equal((await mixedContract.json()).error, 'mixed_grouped_search_contract');

const failingClient: any = createAdminClient();
const originalRpc = failingClient.rpc.bind(failingClient);
failingClient.rpc = async (name: string, params: Record<string, unknown>) => {
  if (name === 'si_search_icon_candidates_v4') {
    failingClient.counters.rpc += 1;
    return { data: null, error: new Error('candidate failure') };
  }
  return originalRpc(name, params);
};
const failedResponse = await handleSharedRecommendationSearchRequest(buildRequest(), {
  adminClientFactory: () => failingClient,
  rateLimitEnforcer: async () => ({
    sessionHash: null,
    ipHash: null,
    countryCode: null,
    geoSource: null,
  }),
});
assert.equal(failedResponse.status, 500);
assert.equal(failingClient.counters.auditInsertCalls, 1);
assert.equal(failingClient.counters.auditRows, 4);

console.log(JSON.stringify({
  status: 'ok',
  logical_queries: queries.length,
  response_parity: true,
  shared_candidate_rpc_calls: sharedClient.counters.rpc,
  control_candidate_rpc_calls: separateClient.counters.rpc,
  shared_metadata_reads: sharedClient.counters.metadata,
  shared_svg_reads: sharedClient.counters.svg,
  shared_public_semantic_reads: sharedClient.counters.publicSemantic,
  shared_audit_insert_calls: sharedClient.counters.auditInsertCalls,
  shared_audit_rows: sharedClient.counters.auditRows,
  reserved_rate_limit_units: sharedRateLimitCosts[0],
  mixed_contract_rejected: true,
  failure_audit_rows: failingClient.counters.auditRows,
  in_band_stage_timing: true,
}, null, 2));
