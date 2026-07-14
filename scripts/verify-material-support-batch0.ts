import assert from 'node:assert/strict';

import { handleSearchRequest } from '../supabase/functions/_shared/search-engine/handle-search-request.ts';

const identity = {
  sessionHash: null,
  ipHash: null,
  countryCode: null,
  geoSource: null,
};

const candidates = [
  {
    icon_id: 'material:settings',
    name: 'settings',
    source_library: 'material',
    style: 'outline',
    icon_type: 'font',
    svg: null,
    lexical_rank: 10,
  },
  {
    icon_id: 'lucide:settings',
    name: 'settings',
    source_library: 'lucide',
    style: 'outline',
    icon_type: 'svg',
    svg: '<svg>lucide-settings</svg>',
    lexical_rank: 9,
  },
  {
    icon_id: 'tabler:settings',
    name: 'settings',
    source_library: 'tabler',
    style: 'outline',
    icon_type: 'svg',
    svg: '<svg>tabler-settings</svg>',
    lexical_rank: 8,
  },
];

function createQuery(result: { data?: unknown; error?: unknown } = { data: [], error: null }) {
  const query: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'gte', 'update']) query[method] = () => query;
  query.in = () => Promise.resolve(result);
  query.insert = () => Promise.resolve(result);
  query.maybeSingle = () => Promise.resolve(result);
  return query;
}

function createAdminClient() {
  const auditRows: Array<Record<string, unknown>> = [];
  const client = {
    auditRows,
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
    },
    rpc: async (_name: string, params: Record<string, unknown>) => ({
      data: candidates.filter((row) => !params.p_library || row.source_library === params.p_library),
      error: null,
    }),
    from: (table: string) => {
      if (table === 'search_request_audit') {
        const query = createQuery();
        query.insert = (rows: Array<Record<string, unknown>>) => {
          auditRows.push(...rows);
          return Promise.resolve({ data: null, error: null });
        };
        return query;
      }
      if (table === 'icon_registry_public_export') return createQuery({ data: [], error: null });
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

async function run(body: Record<string, unknown>) {
  const adminClient = createAdminClient();
  const response = await handleSearchRequest(makeRequest(body), {
    defaultSource: 'internal_test',
    defaultEnvironment: 'test',
    adminClientFactory: () => adminClient,
    rateLimitEnforcer: async () => identity,
  });
  return {
    status: response.status,
    body: await response.json(),
    auditRows: adminClient.auditRows,
  };
}

const allMode = await run({ query: 'settings', library_mode: 'all', limit: 2 });
assert.equal(allMode.status, 200);
assert.equal(allMode.body.results.length, 2);
assert.deepEqual(allMode.body.results.map((row: { icon_id: string }) => row.icon_id), [
  'lucide:settings',
  'tabler:settings',
]);
assert.ok(allMode.body.results.every((row: { svg?: string | null }) => Boolean(row.svg)));

const strictMaterial = await run({
  query: 'settings',
  library: 'material',
  library_mode: 'strict',
  limit: 2,
});
assert.equal(strictMaterial.status, 503);
assert.equal(strictMaterial.body.error, 'material_support_pending');
assert.equal(strictMaterial.body.retryable, true);
assert.equal(strictMaterial.auditRows.at(-1)?.search_outcome, 'error');

const remoteServerSource = await Deno.readTextFile(new URL('../mcp/remote-server.js', import.meta.url));
assert.match(remoteServerSource, /library === 'material'/);
assert.match(remoteServerSource, /material_support_pending/);

console.log(JSON.stringify({
  status: 'ok',
  all_mode_full_usable_results: true,
  strict_material_explicit_error: true,
  strict_material_audited_as_error: true,
  remote_material_null_svg_is_explicit: true,
}, null, 2));
