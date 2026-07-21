import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const repositoryRoot = resolve('.');
const smokeScript = resolve('scripts/verify-search-v2-shared-recommendation-migration-smoke.mjs');
const runOwnerLabelName = 'com.supericons.search-v2-smoke-run';

function runSmoke() {
  return new Promise((resolveChild) => {
    const child = spawn(process.execPath, [smokeScript], {
      cwd: repositoryRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.once('close', (status) => resolveChild({ status, stdout, stderr }));
  });
}

const version = spawnSync('docker', ['version', '--format', '{{.Server.Version}}'], {
  encoding: 'utf8',
});
assert.equal(
  version.status,
  0,
  `Docker Desktop must be running for the concurrency fixture. ${version.stderr || version.stdout}`,
);

const results = await Promise.all([runSmoke(), runSmoke()]);
for (const result of results) {
  assert.equal(result.status, 0, result.stderr || result.stdout);
}
const summaries = results.map((result) => JSON.parse(result.stdout));
assert.notEqual(summaries[0].run_id, summaries[1].run_id);
assert.notEqual(summaries[0].container_name, summaries[1].container_name);
assert.notEqual(summaries[0].container_id, summaries[1].container_id);
assert.equal(summaries.every((summary) => summary.run_owned_container === true), true);

for (const summary of summaries) {
  const remaining = spawnSync('docker', [
    'ps', '-aq', '--filter', `label=${runOwnerLabelName}=${summary.run_id}`,
  ], { encoding: 'utf8' });
  assert.equal(remaining.status, 0, remaining.stderr || remaining.stdout);
  assert.equal(remaining.stdout.trim(), '', `Smoke run ${summary.run_id} left a container behind.`);
}

console.log(JSON.stringify({
  status: 'ok',
  concurrent_runs: summaries.length,
  unique_run_ids: true,
  unique_container_names: true,
  unique_container_ids: true,
  owner_checked_cleanup: true,
}, null, 2));
