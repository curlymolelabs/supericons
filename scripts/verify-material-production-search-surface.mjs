import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const IMPLEMENTATION_REVISION = '425d8c2873e244988ed93ade18396e0f5c688f5e';
const EXPECTED_AGGREGATE_SHA256 = '050db70ca82676339aa0e186d23e50d50c1578a0f6e77f71262764e400b60733';
const entrypoint = 'supabase/functions/mcp-search/index.ts';
const expectedPaths = [
  'lib/cjk-search-core.js',
  'lib/generated-search-intent-graph.js',
  'lib/generated-search-intent-rules.js',
  'lib/generated-search-ranking-policy.js',
  'lib/hosted-search-core.js',
  'lib/search-intent-core.js',
  'lib/search-query-frame.js',
  'lib/search-ranking-policy.js',
  'supabase/functions/_shared/search-engine/candidate-retrieval.ts',
  'supabase/functions/_shared/search-engine/catalog.ts',
  'supabase/functions/_shared/search-engine/handle-search-request.ts',
  'supabase/functions/_shared/search-engine/material-serving.ts',
  'supabase/functions/_shared/search-engine/normalize.ts',
  'supabase/functions/_shared/search-engine/rank.ts',
  'supabase/functions/_shared/search-engine/rate-limit.ts',
  'supabase/functions/_shared/search-engine/result-hydration.ts',
  'supabase/functions/_shared/search-engine/stage-timing.ts',
  'supabase/functions/_shared/search-engine/types.ts',
  entrypoint,
];

function normalizedHash(path) {
  const raw = readFileSync(path, 'utf8').replace(/\r\n?/g, '\n');
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

const rows = expectedPaths.map((path) => `${path}=${normalizedHash(path)}`);
const aggregate = createHash('sha256').update(`${rows.join('\n')}\n`, 'utf8').digest('hex');
assert.equal(aggregate, EXPECTED_AGGREGATE_SHA256, 'mcp-search deploy surface changed');

const info = spawnSync('deno', ['info', '--json', entrypoint], { encoding: 'utf8' });
assert.equal(info.status, 0, info.stderr || info.stdout);
const graph = JSON.parse(info.stdout);
const repositoryRoot = process.cwd().replaceAll('\\', '/');
const graphPaths = (graph.modules || [])
  .map((module) => module.specifier)
  .filter((specifier) => specifier.startsWith('file:'))
  .map((specifier) => fileURLToPath(specifier).replaceAll('\\', '/'))
  .map((path) => path.slice(repositoryRoot.length + 1))
  .sort();
assert.deepEqual(graphPaths, [...expectedPaths].sort(), 'mcp-search local dependency graph changed');

const unchanged = spawnSync('git', [
  'diff',
  '--exit-code',
  `${IMPLEMENTATION_REVISION}..HEAD`,
  '--',
  ...expectedPaths,
], { encoding: 'utf8' });
assert.equal(unchanged.status, 0, unchanged.stderr || unchanged.stdout);

const checked = spawnSync('deno', ['check', entrypoint], { encoding: 'utf8' });
assert.equal(checked.status, 0, checked.stderr || checked.stdout);

const config = readFileSync('supabase/config.toml', 'utf8');
assert.match(
  config,
  /\[functions\.mcp-search\]\s*verify_jwt\s*=\s*false/,
  'Stable mcp-search must keep public gateway JWT verification disabled.',
);

console.log(JSON.stringify({
  status: 'ok',
  implementation_revision: IMPLEMENTATION_REVISION,
  local_modules: expectedPaths.length,
  aggregate_sha256: aggregate,
  dependency_graph_locked: true,
  deno_check_passed: true,
  verify_jwt: false,
}, null, 2));
