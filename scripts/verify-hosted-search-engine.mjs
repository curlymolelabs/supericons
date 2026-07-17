import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createIconSemanticAliasMap } from '../lib/icon-semantic-aliases.js';
import {
  buildHostedSearchManifestSeedRows,
  buildHostedSearchPublicRegistryRows,
  indexRowsByIconId,
  rerankHostedSearchCandidates,
  resolveHostedSearchRegistryIconId,
} from '../lib/hosted-search-core.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

function looksLikeJwt(value) {
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(String(value || '').trim());
}

function shouldRequireJwt() {
  const raw = String(process.env.SUPERICONS_SEARCH_ENGINE_REQUIRE_JWT || '').trim().toLowerCase();
  return raw !== '0' && raw !== 'false' && raw !== 'off';
}

const manifests = indexRowsByIconId(buildHostedSearchManifestSeedRows(createIconSemanticAliasMap()));
const features = indexRowsByIconId([
  {
    icon_id: 'heroicons:server-stack',
    popularity_score: 22,
    behavioral_score: 11,
    editorial_score: 3,
    replace_risk_score: 0.05,
    manual_boost: 0,
    manual_penalty: 0,
  },
  {
    icon_id: 'lucide:server',
    popularity_score: 12,
    behavioral_score: 3,
    editorial_score: 0,
    replace_risk_score: 0.12,
    manual_boost: 0,
    manual_penalty: 0,
  },
  {
    icon_id: 'material:home_storage',
    popularity_score: 9,
    behavioral_score: 2,
    editorial_score: 0,
    replace_risk_score: 0.08,
    manual_boost: 0,
    manual_penalty: 0,
  },
]);

const registryRows = buildHostedSearchPublicRegistryRows([
  {
    icon_id: 'heroicons:server-stack',
    label: 'Server stack',
    purpose: 'Represents infrastructure, hosting, and grouped servers.',
    category: 'systems_architecture',
    semantic_tags: ['hosting', 'infrastructure', 'servers'],
    synonyms: ['self hosted', 'server cluster'],
    use_when: 'Use for hosted systems, infrastructure, and server groups.',
    avoid_when: 'Avoid for personal home storage.',
    depicts: 'Three stacked server blocks.',
  },
], {
  'heroicons:server-stack': {
    jobCategory: 'engineering_developer_tools',
    secondaryCategories: ['systems_architecture', 'security'],
    rank: 12,
  },
});

assert.equal(registryRows.length, 1, 'registry row builder should create one row');
assert.deepEqual(
  registryRows[0].synonyms,
  ['self hosted', 'server cluster', 'server stack'],
  'registry row builder should normalize synonyms and include the public label',
);
assert.equal(
  registryRows[0].job_category,
  'engineering developer tools',
  'registry row builder should normalize taxonomy job category',
);
assert.deepEqual(
  registryRows[0].secondary_categories,
  ['systems architecture', 'security'],
  'registry row builder should normalize taxonomy secondary categories',
);
assert.equal(
  registryRows[0].avoid_when,
  'avoid for personal home storage',
  'registry row builder should preserve negative guidance separately',
);

const knownCatalogIconIds = new Set([
  'bootstrap:align-bottom',
  'mingcute:add_circle_line',
]);

assert.equal(
  resolveHostedSearchRegistryIconId(
    {
      icon_id: 'bootstrap:align_bottom',
      source_library: 'bootstrap',
      source_name: 'align_bottom',
    },
    knownCatalogIconIds,
  ),
  'bootstrap:align-bottom',
  'registry icon resolver should normalize underscore ids to catalog ids',
);
assert.equal(
  resolveHostedSearchRegistryIconId(
    {
      icon_id: 'mingcute:add_circle',
      source_library: 'mingcute',
      source_name: 'add_circle',
    },
    knownCatalogIconIds,
  ),
  'mingcute:add_circle_line',
  'registry icon resolver should map MingCute records to line icon ids',
);
assert.equal(
  resolveHostedSearchRegistryIconId(
    {
      icon_id: 'mingcute:abs',
      source_library: 'mingcute',
      source_name: 'abs',
    },
    knownCatalogIconIds,
  ),
  null,
  'registry icon resolver should return null when no catalog icon exists',
);

const candidates = [
  {
    icon_id: 'lucide:server',
    name: 'server',
    source_library: 'lucide',
    style: 'outline',
    icon_type: 'svg',
    lexical_rank: 0.96,
  },
  {
    icon_id: 'heroicons:server-stack',
    name: 'server stack',
    source_library: 'heroicons',
    style: 'outline',
    icon_type: 'svg',
    lexical_rank: 0.68,
  },
  {
    icon_id: 'material:home_storage',
    name: 'home storage',
    source_library: 'material',
    style: 'outline',
    icon_type: 'font',
    lexical_rank: 0.45,
  },
];

const ranked = rerankHostedSearchCandidates('self hosted', candidates, manifests, features).slice(0, 3);

assert.equal(ranked[0]?.icon_id, 'heroicons:server-stack', 'hosted reranker should surface the best private alias hit first');
assert.ok(
  ranked.some((result) => result.icon_id === 'lucide:server'),
  'hosted reranker should keep relevant lexical candidates in the result set',
);

const registryOnlyRanked = rerankHostedSearchCandidates('self hosted', [
  {
    icon_id: 'lucide:server',
    name: 'server',
    source_library: 'lucide',
    style: 'outline',
    icon_type: 'svg',
    lexical_rank: 0.4,
    registry_rank: 0.01,
    avoid_rank: 0,
  },
  {
    icon_id: 'tabler:server-cog',
    name: 'server cog',
    source_library: 'tabler',
    style: 'outline',
    icon_type: 'svg',
    lexical_rank: 0.4,
    registry_rank: 1.2,
    avoid_rank: 0,
  },
  {
    icon_id: 'tabler:server-off',
    name: 'server off',
    source_library: 'tabler',
    style: 'outline',
    icon_type: 'svg',
    lexical_rank: 0.4,
    registry_rank: 1.1,
    avoid_rank: 2.5,
  },
], new Map(), new Map());

assert.equal(
  registryOnlyRanked[0]?.icon_id,
  'tabler:server-cog',
  'registry rank should promote strong public registry matches',
);
assert.ok(
  registryOnlyRanked.findIndex((result) => result.icon_id === 'tabler:server-off')
    > registryOnlyRanked.findIndex((result) => result.icon_id === 'tabler:server-cog'),
  'avoid_when rank should penalize icons whose negative guidance matches the query',
);

const rpcPath = path.join(repoRoot, 'supabase', 'migrations', '20260418_hosted_search_engine_rpcs.sql');
const publicRegistryMigrationPath = path.join(
  repoRoot,
  'supabase',
  'migrations',
  '20260501_hosted_search_public_registry_metadata.sql',
);
const registryRpcPath = path.join(
  repoRoot,
  'supabase',
  'migrations',
  '20260501_hosted_search_registry_rpc.sql',
);
const functionPath = path.join(repoRoot, 'supabase', 'functions', 'search-icons', 'index.ts');
const sharedHandlerPath = path.join(repoRoot, 'supabase', 'functions', '_shared', 'search-engine', 'handle-search-request.ts');
const syncScriptPath = path.join(repoRoot, 'scripts', 'sync-search-catalog-to-supabase.mjs');

const rpcSql = await fs.readFile(rpcPath, 'utf8');
assert.match(rpcSql, /si_search_icon_candidates/i, 'RPC migration should define si_search_icon_candidates');

const publicRegistryMigrationSql = await fs.readFile(publicRegistryMigrationPath, 'utf8');
assert.match(
  publicRegistryMigrationSql,
  /icon_search_public_registry_metadata/,
  'public registry metadata migration should define the metadata table',
);
assert.match(
  publicRegistryMigrationSql,
  /search_document/,
  'public registry metadata migration should define a weighted search document',
);
assert.match(
  publicRegistryMigrationSql,
  /avoid_document/,
  'public registry metadata migration should define a negative-guidance search document',
);
assert.match(
  publicRegistryMigrationSql,
  /service_role/,
  'public registry metadata migration should grant service_role access',
);

const registryRpcSql = await fs.readFile(registryRpcPath, 'utf8');
assert.match(
  registryRpcSql,
  /icon_search_public_registry_metadata/,
  'registry-aware RPC should join public registry metadata',
);
assert.match(
  registryRpcSql,
  /drop function if exists public\.si_search_icon_candidates\(text, text, integer\)/i,
  'registry-aware RPC migration should drop the old function before changing the return shape',
);
assert.match(registryRpcSql, /registry_rank/, 'registry-aware RPC should return registry_rank');
assert.match(registryRpcSql, /avoid_rank/, 'registry-aware RPC should return avoid_rank');

const functionSource = await fs.readFile(functionPath, 'utf8');
assert.match(functionSource, /handleSearchRequest/i, 'hosted search function should delegate to the shared handler');

const sharedHandlerSource = await fs.readFile(sharedHandlerPath, 'utf8');
assert.match(sharedHandlerSource, /search_request_audit/i, 'shared hosted search handler should record request audits');
assert.match(sharedHandlerSource, /engine_version/i, 'shared hosted search handler should return an engine version');

const syncScriptSource = await fs.readFile(syncScriptPath, 'utf8');
assert.match(
  syncScriptSource,
  /icon_search_public_registry_metadata/,
  'search catalog sync should upsert public registry metadata rows',
);
assert.match(
  syncScriptSource,
  /public\/registry\/records\.json/,
  'search catalog sync should read the public registry records projection',
);
assert.match(
  syncScriptSource,
  /public\/icon-taxonomy\.json/,
  'search catalog sync should read icon taxonomy metadata',
);
assert.match(
  syncScriptSource,
  /duplicateResolvedIconIds/,
  'search catalog sync should dedupe registry records that resolve to the same catalog icon id',
);

if (process.env.SUPERICONS_RUN_LIVE_HOSTED_SEARCH === '1') {
  const baseUrl = process.env.SUPERICONS_SEARCH_ENGINE_URL
    || process.env.SUPABASE_FUNCTIONS_BASE_URL
    || `${process.env.SUPABASE_URL}/functions/v1/search-icons`;
  const anonKey = process.env.SUPERICONS_SEARCH_ENGINE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  assert.ok(baseUrl, 'SUPABASE_URL or SUPERICONS_SEARCH_ENGINE_URL is required for live hosted search verification');
  assert.ok(anonKey, 'SUPABASE_ANON_KEY or SUPERICONS_SEARCH_ENGINE_ANON_KEY is required for live hosted search verification');
  if (shouldRequireJwt()) {
    assert.ok(
      looksLikeJwt(anonKey),
      'Live hosted search requires a legacy anon JWT for Authorization; publishable keys are not valid bearer tokens.',
    );
  }

  const headers = {
    'Content-Type': 'application/json',
    apikey: anonKey,
  };
  if (looksLikeJwt(anonKey)) {
    headers.Authorization = `Bearer ${anonKey}`;
  }

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query: 'self hosted',
      library: null,
      limit: 5,
      source: 'verify',
    }),
  });

  const raw = await response.text();
  if (response.status === 401) {
    assert.fail(`hosted search endpoint returned 401. Body: ${raw}`);
  }

  assert.equal(response.status, 200, `hosted search endpoint should respond with 200. Body: ${raw}`);
  const payload = JSON.parse(raw);
  assert.ok(Array.isArray(payload.results), 'payload.results should be an array');
  assert.ok(payload.results.length > 0, 'hosted search should return at least one result');

  async function assertHostedSearchIncludes(query, expectedIconId) {
    const registryResponse = await fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query,
        library: null,
        limit: 8,
        source: 'verify',
      }),
    });

    const registryRaw = await registryResponse.text();
    assert.equal(registryResponse.status, 200, `hosted search should respond with 200 for ${query}. Body: ${registryRaw}`);
    const registryPayload = JSON.parse(registryRaw);
    const ids = (registryPayload.results || []).map((result) => result.icon_id);
    assert.ok(
      ids.includes(expectedIconId),
      `hosted search for "${query}" should include ${expectedIconId}. Got: ${ids.join(', ')}`,
    );
  }

  await assertHostedSearchIncludes('database', 'iconoir:database');
  await assertHostedSearchIncludes('move down', 'lucide:move-down');
}

console.log('verify-hosted-search-engine: ok');
