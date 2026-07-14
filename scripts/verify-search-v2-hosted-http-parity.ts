import assert from 'node:assert/strict';

import { handleSearchRequest } from '../supabase/functions/_shared/search-engine/handle-search-request.ts';

type CandidateMode = 'control' | 'treatment' | 'batched';
type Scenario = 'svg' | 'null_svg' | 'candidate_error';

const identity = {
  sessionHash: null,
  ipHash: null,
  countryCode: null,
  geoSource: null,
};

function createQuery(result: { data?: unknown; error?: unknown } = { data: [], error: null }) {
  const query: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'gte', 'update']) {
    query[method] = () => query;
  }
  query.in = () => Promise.resolve(result);
  query.insert = () => Promise.resolve(result);
  query.maybeSingle = () => Promise.resolve(result);
  return query;
}

function candidateForScenario(scenario: Scenario, includeSvg: boolean) {
  const isMaterial = scenario === 'null_svg';
  return {
    icon_id: isMaterial ? 'material:settings' : 'lucide:settings',
    name: 'settings',
    source_library: isMaterial ? 'material' : 'lucide',
    style: isMaterial ? 'solid' : 'outline',
    icon_type: isMaterial ? 'material' : 'svg',
    ...(includeSvg ? { svg: isMaterial ? null : '<svg>settings</svg>' } : {}),
    lexical_rank: 3.5,
    registry_rank: 1.25,
    avoid_rank: 0,
  };
}

function createAdminClient(mode: CandidateMode, scenario: Scenario) {
  const calls = {
    rpcNames: [] as string[],
    tables: [] as string[],
  };
  const includeCandidateSvg = mode === 'control';
  const candidate = candidateForScenario(scenario, includeCandidateSvg);
  const svg = scenario === 'null_svg' ? null : '<svg>settings</svg>';

  const client = {
    calls,
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
    },
    rpc: async (name: string, params: Record<string, unknown>) => {
      calls.rpcNames.push(name);
      if (scenario === 'candidate_error') {
        return { data: null, error: new Error('Candidate lookup failed.') };
      }
      if (name === 'si_search_icon_candidates_v3') {
        return {
          data: (params.p_queries as string[]).map((variant, index) => ({
            ...candidate,
            query_variant: variant,
            query_variant_rank: index,
          })),
          error: null,
        };
      }
      return { data: [candidate], error: null };
    },
    from: (table: string) => {
      calls.tables.push(table);
      if (table === 'icon_search_private_manifest') {
        return createQuery({
          data: [{
            icon_id: candidate.icon_id,
            semantic_aliases: ['cog'],
            use_cases: ['application settings'],
            contraindications: [],
            trust_tier: 't2',
            explanation_short: 'Settings control.',
          }],
          error: null,
        });
      }
      if (table === 'icon_search_private_features') {
        return createQuery({
          data: [{
            icon_id: candidate.icon_id,
            popularity_score: 1,
            behavioral_score: 1,
            editorial_score: 1,
            replace_risk_score: 0,
            manual_boost: 0,
            manual_penalty: 0,
          }],
          error: null,
        });
      }
      if (table === 'icon_catalog') {
        return createQuery({ data: [{ icon_id: candidate.icon_id, svg }], error: null });
      }
      if (table === 'material_icon_assets') {
        return createQuery({
          data: scenario === 'null_svg'
            ? [{ icon_id: candidate.icon_id, variant: 'solid', svg: '<svg>material-settings</svg>' }]
            : [],
          error: null,
        });
      }
      if (table === 'icon_registry_public_export') {
        return createQuery({
          data: [{
            icon_id: candidate.icon_id,
            source_library: candidate.source_library,
            source_name: 'settings',
            label: 'Settings',
            purpose: 'Open application settings.',
            category: 'interface',
            depicts: 'A cog.',
            semantic_tags: ['settings', 'preferences'],
            synonyms: ['cog', 'gear'],
            use_when: 'Use for application settings.',
            avoid_when: 'Avoid for construction work.',
            record: {
              asset_type: 'icon',
              rights: 'open-source',
            },
          }],
          error: null,
        });
      }
      return createQuery({ data: [], error: null });
    },
  };

  return client;
}

function makeRequest(body: Record<string, unknown>) {
  return new Request('https://local.test/search', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function runPath(mode: CandidateMode, body: Record<string, unknown>, scenario: Scenario) {
  const adminClient = createAdminClient(mode, scenario);
  const response = await handleSearchRequest(makeRequest(body), {
    defaultSource: 'internal_test',
    defaultEnvironment: 'test',
    candidateRpcName: mode === 'control'
      ? 'si_search_icon_candidates'
      : 'si_search_icon_candidates_v2',
    candidateBatchRpcName: mode === 'batched' ? 'si_search_icon_candidates_v3' : null,
    hydrateFinalSvg: mode !== 'control',
    adminClientFactory: () => adminClient,
    rateLimitEnforcer: async () => identity,
  });
  return {
    status: response.status,
    headers: [...response.headers.entries()].sort(([left], [right]) => left.localeCompare(right)),
    body: await response.text(),
    calls: adminClient.calls,
  };
}

const cases = [
  { id: 'svg_result', body: { query: 'settings', limit: 1 }, scenario: 'svg' as const },
  { id: 'null_svg_result', body: { query: 'settings', style: 'solid', limit: 1 }, scenario: 'null_svg' as const },
  { id: 'empty_result', body: { query: '' }, scenario: 'svg' as const },
  { id: 'invalid_request', body: { query: 'settings', library_mode: 'unsupported' }, scenario: 'svg' as const },
  { id: 'candidate_error', body: { query: 'settings' }, scenario: 'candidate_error' as const },
];

for (const testCase of cases) {
  const control = await runPath('control', testCase.body, testCase.scenario);
  const treatment = await runPath('treatment', testCase.body, testCase.scenario);
  const batched = await runPath('batched', testCase.body, testCase.scenario);
  assert.equal(treatment.status, control.status, `${testCase.id}: status changed`);
  assert.deepEqual(treatment.headers, control.headers, `${testCase.id}: headers changed`);
  assert.equal(treatment.body, control.body, `${testCase.id}: response bytes changed`);
  assert.equal(batched.status, treatment.status, `${testCase.id}: batched status changed`);
  assert.deepEqual(batched.headers, treatment.headers, `${testCase.id}: batched headers changed`);
  assert.equal(batched.body, treatment.body, `${testCase.id}: batched response bytes changed`);

  if (testCase.id.endsWith('_result') && testCase.id !== 'empty_result') {
    assert.ok(control.calls.rpcNames.every((name) => name === 'si_search_icon_candidates'));
    assert.ok(treatment.calls.rpcNames.every((name) => name === 'si_search_icon_candidates_v2'));
    assert.deepEqual(batched.calls.rpcNames, ['si_search_icon_candidates_v3']);
    assert.equal(control.calls.tables.includes('icon_catalog'), false);
    assert.equal(
      treatment.calls.tables.includes('icon_catalog'),
      testCase.scenario !== 'null_svg',
    );
  }
}

const svgResponse = JSON.parse((await runPath('treatment', { query: 'settings', limit: 1 }, 'svg')).body);
const nullSvgResponse = JSON.parse((await runPath('treatment', { query: 'settings', style: 'solid', limit: 1 }, 'null_svg')).body);
assert.equal(svgResponse.results[0].svg, '<svg>settings</svg>');
assert.equal(nullSvgResponse.results[0].svg, '<svg>material-settings</svg>');
assert.deepEqual(Object.keys(svgResponse.results[0].semantic), [
  'source_library',
  'source_name',
  'label',
  'purpose',
  'category',
  'asset_type',
  'depicts',
  'semantic_tags',
  'synonyms',
  'use_when',
  'avoid_when',
  'rights',
]);

console.log(JSON.stringify({
  status: 'ok',
  full_http_parity_cases: cases.length,
  batched_http_parity_cases: cases.length,
  exact_status_headers_and_body_match: true,
  one_batched_candidate_rpc: true,
  svg_value_preserved: true,
  material_svg_hydrated: true,
  semantic_field_order_preserved: true,
  error_response_preserved: true,
}, null, 2));
