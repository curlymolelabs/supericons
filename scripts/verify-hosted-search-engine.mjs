import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createIconSemanticAliasMap } from '../lib/icon-semantic-aliases.js';
import {
  buildHostedSearchManifestSeedRows,
  indexRowsByIconId,
  rerankHostedSearchCandidates,
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

const rpcPath = path.join(repoRoot, 'supabase', 'migrations', '20260418_hosted_search_engine_rpcs.sql');
const functionPath = path.join(repoRoot, 'supabase', 'functions', 'search-icons', 'index.ts');
const sharedHandlerPath = path.join(repoRoot, 'supabase', 'functions', '_shared', 'search-engine', 'handle-search-request.ts');

const rpcSql = await fs.readFile(rpcPath, 'utf8');
assert.match(rpcSql, /si_search_icon_candidates/i, 'RPC migration should define si_search_icon_candidates');

const functionSource = await fs.readFile(functionPath, 'utf8');
assert.match(functionSource, /handleSearchRequest/i, 'hosted search function should delegate to the shared handler');

const sharedHandlerSource = await fs.readFile(sharedHandlerPath, 'utf8');
assert.match(sharedHandlerSource, /search_request_audit/i, 'shared hosted search handler should record request audits');
assert.match(sharedHandlerSource, /engine_version/i, 'shared hosted search handler should return an engine version');

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
}

console.log('verify-hosted-search-engine: ok');
