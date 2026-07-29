import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

import {
  isDeterministicStableVersion,
  shouldUseLocalFirstSearch,
} from '../mcp/release-channel.js';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const packageJson = JSON.parse(readFileSync(join(repoRoot, 'mcp', 'package.json'), 'utf8'));
const packageLock = JSON.parse(readFileSync(join(repoRoot, 'mcp', 'package-lock.json'), 'utf8'));
const serverJson = JSON.parse(readFileSync(join(repoRoot, 'mcp', 'server.json'), 'utf8'));
const productFacts = JSON.parse(readFileSync(join(repoRoot, 'data', 'product-facts.json'), 'utf8'));
const clientSource = readFileSync(join(repoRoot, 'lib', 'search-engine-client.js'), 'utf8');

assert.equal(packageJson.version, '0.4.26');
assert.equal(packageLock.version, packageJson.version);
assert.equal(packageLock.packages[''].version, packageJson.version);
assert.equal(serverJson.version, packageJson.version);
assert.equal(serverJson.packages[0].version, packageJson.version);
assert.equal(productFacts.mcpPackageVersion, packageJson.version);
assert.equal(isDeterministicStableVersion(packageJson.version), true);
assert.equal(shouldUseLocalFirstSearch(packageJson.version, {
  toolName: 'search_icons',
  query: 'application settings',
}), true);
assert.equal(shouldUseLocalFirstSearch(packageJson.version, {
  toolName: 'search_icons',
  query: '設定',
  locale: 'ja',
}), true);
assert.equal(shouldUseLocalFirstSearch(packageJson.version, {
  toolName: 'recommend_icons',
  query: 'fitness application navigation',
}), true);
assert.match(clientSource, /https:\/\/mcp\.supericons\.dev\/search-icons/);
assert.match(clientSource, /if \(!isSupabaseSearchUrl\(searchUrl\)\)/);

const port = 18_000 + Math.floor(Math.random() * 1_000);
const baseUrl = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['mcp/remote-server.js'], {
  cwd: repoRoot,
  env: {
    ...process.env,
    PORT: String(port),
    SUPERICONS_RAILWAY_LOCAL_FIRST: 'on',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
});

let childOutput = '';
for (const stream of [child.stdout, child.stderr]) {
  stream.on('data', (chunk) => {
    childOutput = `${childOutput}${chunk}`.slice(-12_000);
  });
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`Remote server exited before health was ready.\n${childOutput}`);
    }
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return response.json();
    } catch {
      // The server is still starting.
    }
    await delay(250);
  }
  throw new Error(`Remote server did not become ready.\n${childOutput}`);
}

async function postSearch(body) {
  const response = await fetch(`${baseUrl}/search-icons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { response, payload: await response.json() };
}

try {
  const health = await waitForHealth();
  assert.equal(health.version, packageJson.version);
  assert.equal(health.railway_local_first.enabled, true);
  assert.equal(health.railway_local_first.search_mode, 'hosted_primary');
  assert.equal(health.railway_local_first.recommendation_mode, 'local_first');

  const cases = [
    { query: 'dropdown', limit: 10 },
    { query: 'application settings', limit: 20 },
    { query: '設定', locale: 'ja', limit: 10 },
    { query: 'dumbbell', style: 'outline', limit: 10 },
  ];
  const summaries = [];
  for (const searchCase of cases) {
    const { response, payload } = await postSearch(searchCase);
    assert.equal(response.status, 200, JSON.stringify(payload));
    assert.ok(payload.results.length > 0, `Expected results for ${searchCase.query}`);
    assert.ok(['hosted', 'hosted_fused', 'local_fallback'].includes(payload.search_runtime.mode));
    assert.equal(payload.search_runtime.hosted_search_calls, 1);
    for (const result of payload.results) {
      assert.match(result.icon_id, /^[a-z0-9-]+:.+/i);
      assert.equal(Object.hasOwn(result, 'svg'), false);
      assert.equal(Object.hasOwn(result, 'semantic'), false);
    }
    summaries.push({
      query: searchCase.query,
      count: payload.results.length,
      first: payload.results[0].icon_id,
    });
  }

  const invalid = await postSearch({ query: '' });
  assert.equal(invalid.response.status, 400);
  assert.equal(invalid.payload.error, 'search_query_required');
  assert.match(invalid.payload.message, /search term/i);
  assert.equal(invalid.payload.retryable, false);

  console.log(JSON.stringify({
    status: 'passed',
    version: packageJson.version,
    health: health.railway_local_first,
    searches: summaries,
  }, null, 2));
} finally {
  child.kill('SIGTERM');
  await Promise.race([
    new Promise((resolveExit) => child.once('exit', resolveExit)),
    delay(2_000),
  ]);
  if (child.exitCode === null) child.kill('SIGKILL');
}
