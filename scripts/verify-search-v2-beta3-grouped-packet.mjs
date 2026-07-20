import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

function readArgument(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function normalizedText(value) {
  return String(value).replace(/\r\n?/g, '\n');
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function sha256TextFile(path) {
  return sha256(normalizedText(readFileSync(path, 'utf8')));
}

function gitText(revision, path) {
  return execFileSync('git', ['show', `${revision}:${path}`], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
}

function run(command, args) {
  execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    maxBuffer: 64 * 1024 * 1024,
  });
}

const manifestPath =
  'docs/si-v2/search/reviews/search-v2-beta3-grouped-release-manifest-2026-07-20.json';
const expectedManifestHash = readArgument('--manifest-hash');
assert.match(expectedManifestHash || '', /^[0-9a-f]{64}$/, 'Provide --manifest-hash with 64 lowercase hex characters.');

const manifestText = normalizedText(readFileSync(manifestPath, 'utf8'));
const manifestHash = sha256(manifestText);
assert.equal(manifestHash, expectedManifestHash, 'The release manifest hash does not match.');
const manifest = JSON.parse(manifestText);

assert.equal(manifest.schema_version, 1);
assert.equal(manifest.release, 'search-v2-beta3-grouped-endpoint');
assert.equal(manifest.project_ref, 'kcjmkakdhsqplvasgkjv');
assert.equal(manifest.function_name, 'mcp-search-grouped');
assert.equal(manifest.stable_function.name, 'mcp-search');
assert.equal(manifest.stable_function.verify_jwt, false);
assert.equal(manifest.stable_function.status, 'ACTIVE');
assert.equal(manifest.grouped_function_present_before, false);
assert.equal(manifest.deployments_authorized, 1);
assert.equal(manifest.conditional_deletions_authorized, 1);
assert.equal(manifest.stable_function_deployments_authorized, 0);
assert.equal(manifest.npm_publications_authorized, 0);
assert.equal(manifest.rollback, 'delete_new_grouped_function');
assert.match(manifest.source_revision, /^[0-9a-f]{40}$/);
assert.match(manifest.source_tree, /^[0-9a-f]{40}$/);
assert.match(manifest.stable_route_blob, /^[0-9a-f]{40}$/);

assert.equal(
  execFileSync('git', ['rev-parse', manifest.source_revision], { encoding: 'utf8' }).trim(),
  manifest.source_revision,
);
assert.equal(
  execFileSync('git', ['rev-parse', `${manifest.source_revision}^{tree}`], { encoding: 'utf8' }).trim(),
  manifest.source_tree,
);
assert.equal(
  execFileSync(
    'git',
    ['rev-parse', `${manifest.source_revision}:supabase/functions/mcp-search/index.ts`],
    { encoding: 'utf8' },
  ).trim(),
  manifest.stable_route_blob,
);
assert.equal(
  execFileSync('git', ['rev-parse', 'main:supabase/functions/mcp-search/index.ts'], {
    encoding: 'utf8',
  }).trim(),
  manifest.stable_route_blob,
  'The stable mcp-search source must be byte-identical to main.',
);

for (const entry of manifest.source_files) {
  assert.match(entry.sha256, /^[0-9a-f]{64}$/);
  assert.equal(
    sha256(normalizedText(gitText(manifest.source_revision, entry.path))),
    entry.sha256,
    `${entry.path} does not match the pinned source revision.`,
  );
}

for (const entry of manifest.packet_files) {
  assert.match(entry.sha256, /^[0-9a-f]{64}$/);
  assert.equal(sha256TextFile(entry.path), entry.sha256, `${entry.path} hash does not match.`);
}

const sourceGraphPaths = manifest.source_files.map((entry) => entry.path);
const sourceGraphDiff = execFileSync(
  'git',
  ['diff', '--name-only', manifest.source_revision, '--', ...sourceGraphPaths],
  { encoding: 'utf8' },
).trim();
assert.equal(sourceGraphDiff, '', 'Packet commits must not alter the pinned deployment source graph.');

const packageJson = JSON.parse(readFileSync('mcp/package.json', 'utf8'));
assert.equal(packageJson.version, '0.4.19-beta.2');

const runnerPath = 'scripts/run-search-v2-beta3-grouped-release.ps1';
const livePath = 'scripts/verify-search-v2-beta3-grouped-live.mjs';
const latencyPath = 'scripts/measure-search-v2-beta3-fr47-live.mjs';
const runner = normalizedText(readFileSync(runnerPath, 'utf8'));
const live = normalizedText(readFileSync(livePath, 'utf8'));
const latency = normalizedText(readFileSync(latencyPath, 'utf8'));

assert.match(runner, /\$FunctionName = 'mcp-search-grouped'/);
assert.match(runner, /\$StableFunctionName = 'mcp-search'/);
assert.equal((runner.match(/supabase functions deploy \$FunctionName/g) || []).length, 1);
assert.equal((runner.match(/supabase functions delete \$FunctionName/g) || []).length, 1);
assert.match(runner, /--project-ref \$ProjectRef/);
assert.match(runner, /--no-verify-jwt/);
assert.match(runner, /--use-api/);
assert.match(runner, /--workdir \$sourceWorkspace/);
assert.match(runner, /The tracked worktree must be clean/);
assert.match(runner, /git status --porcelain=v1 --untracked-files=no/);
assert.match(runner, /preGrouped\.Count -ne 0/);
assert.match(runner, /Remove-GroupedFunctionForRollback/);
assert.match(runner, /Assert-StableFunctionPin/);
assert.match(runner, /stable_function_mutated = \$false/);
assert.match(runner, /ExecuteApprovedGroupedRelease/);
assert.equal(runner.includes('Read-Host'), false);
assert.equal(/supabase functions deploy \$StableFunctionName/.test(runner), false);
assert.equal(/supabase functions delete \$StableFunctionName/.test(runner), false);
assert.equal(/npm\s+publish/i.test(runner), false);

assert.match(live, /direct_grouped_http/);
assert.match(live, /mcp_grouped_client/);
assert.match(live, /missing_grouped_uses_stable_fallback/);
assert.match(live, /rollback-probe-missing/);
assert.match(live, /AbortSignal\.timeout\(requestTimeoutMs\)/);

assert.match(latency, /id: 'one_slot'/);
assert.match(latency, /id: 'ten_slots'/);
assert.match(latency, /id: 'twenty_slots'/);
assert.match(latency, /id: 'japanese_twenty_slots'/);
assert.match(latency, /p95LimitMs: 3000/);
assert.match(latency, /p95LimitMs: 10000/);
assert.match(latency, /p95LimitMs: 15000/);
assert.match(latency, /timeoutMs === 20000/);
assert.match(latency, /payload\?\.all_slots_resolved, true/);
assert.match(latency, /entry\) => Boolean\(entry\.recommended\)/);
assert.match(latency, /minimumIntervalMs/);
assert.match(latency, /measuredSamples: samples/);
assert.match(latency, /measuredSamples: 1/);

for (const path of [runnerPath, livePath, latencyPath, manifestPath]) {
  const text = readFileSync(path, 'utf8');
  assert.equal(/[\u2013\u2014]/u.test(text), false, `${path} contains a prohibited dash character.`);
}

run('node', ['scripts/verify-hosted-search-grouped-client.mjs']);
run('node', ['scripts/verify-mcp-agent-friendly-errors.mjs']);
run('node', ['scripts/verify-hosted-search-resilience.mjs']);
run('deno', [
  'run',
  '--allow-read',
  '--allow-env',
  'scripts/verify-search-v2-grouped-http-request.ts',
]);
run('deno', ['check', 'supabase/functions/mcp-search-grouped/index.ts']);

console.log(JSON.stringify({
  status: 'ok',
  manifest_sha256: manifestHash,
  source_revision: manifest.source_revision,
  source_tree: manifest.source_tree,
  source_file_count: manifest.source_files.length,
  packet_file_count: manifest.packet_files.length,
  stable_route_blob: manifest.stable_route_blob,
  mutations: {
    grouped_function_deployments: 1,
    conditional_grouped_function_deletions: 1,
    stable_function_deployments: 0,
    npm_publications: 0,
  },
}, null, 2));
