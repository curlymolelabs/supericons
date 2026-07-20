import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const repoRoot = resolve('.');
const manifestPath = resolve(
  'docs/si-v2/search/reviews/search-v2-beta3-grouped-release-manifest-2026-07-20.json',
);
const runnerPath = resolve('scripts/run-search-v2-beta3-grouped-release.ps1');
const workspace = resolve('.tmp/search-v2-beta3-grouped-rollback-simulation');
const binDir = join(workspace, 'bin');
const evidencePaths = [
  resolve('references/verification/search-v2-beta3-grouped-live-2026-07-20.json'),
  resolve('references/verification/search-v2-beta3-fr47-live-2026-07-20.json'),
  resolve('references/verification/search-v2-beta3-grouped-release-completion-2026-07-20.json'),
  resolve('references/verification/search-v2-beta3-grouped-release-rollback-2026-07-20.json'),
];
const rollbackEvidencePath = evidencePaths[3];
const realNode = process.execPath;
const windowsSystemDirectory = process.env.SystemRoot
  ? join(process.env.SystemRoot, 'System32')
  : null;
const gitGnuTarCandidates = [
  process.env.ProgramFiles
    ? join(process.env.ProgramFiles, 'Git', 'usr', 'bin', 'tar.exe')
    : null,
  process.env.LOCALAPPDATA
    ? join(process.env.LOCALAPPDATA, 'Programs', 'Git', 'usr', 'bin', 'tar.exe')
    : null,
].filter(Boolean);
const gitGnuTarPath = gitGnuTarCandidates.find((path) => existsSync(path)) || null;

function normalizedSha256(path) {
  const text = readFileSync(path, 'utf8').replace(/\r\n?/g, '\n');
  return createHash('sha256').update(text).digest('hex');
}

function writeText(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text, 'utf8');
}

function removeGeneratedEvidence() {
  for (const path of evidencePaths) {
    if (existsSync(path)) rmSync(path, { force: true });
  }
}

for (const path of evidencePaths) {
  assert.equal(
    existsSync(path),
    false,
    `Rollback simulation refuses to replace existing release evidence: ${path}`,
  );
}

rmSync(workspace, { recursive: true, force: true });
mkdirSync(binDir, { recursive: true });

writeText(join(binDir, 'node.cmd'), [
  '@echo off',
  '"%BETA3_REAL_NODE%" "%~dp0node-wrapper.mjs" %*',
  'exit /b %ERRORLEVEL%',
  '',
].join('\r\n'));

writeText(join(binDir, 'npx.cmd'), [
  '@echo off',
  '"%BETA3_REAL_NODE%" "%~dp0npx-shim.mjs" %*',
  'exit /b %ERRORLEVEL%',
  '',
].join('\r\n'));

writeText(join(binDir, 'node-wrapper.mjs'), `
import { spawnSync } from 'node:child_process';
import { basename } from 'node:path';

const realNode = process.env.BETA3_REAL_NODE;
const args = process.argv.slice(2);
const scriptName = basename(args[0] || '');

if (scriptName === 'verify-search-v2-beta3-grouped-live.mjs') {
  console.error('Simulated grouped live-gate failure.');
  process.exit(1);
}

const childArgs = scriptName === 'verify-search-v2-beta3-grouped-packet.mjs'
  ? [...args, '--skip-nested-release-simulations']
  : args;
const result = spawnSync(realNode, childArgs, {
  cwd: process.cwd(),
  env: {
    ...process.env,
    SUPERICONS_BETA3_NESTED_RELEASE_SIMULATION: '1',
  },
  stdio: 'inherit',
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
`.trimStart());

writeText(join(binDir, 'npx-shim.mjs'), `
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

const statePath = process.env.BETA3_SHIM_STATE_PATH;
const logPath = process.env.BETA3_SHIM_LOG_PATH;
const scenario = process.env.BETA3_SHIM_SCENARIO;
const args = process.argv.slice(2);
const command = args.slice(0, 3).join(' ');
const state = existsSync(statePath)
  ? JSON.parse(readFileSync(statePath, 'utf8'))
  : { deployed: false, grouped_list_count: 0, delete_count: 0 };

function save() {
  writeFileSync(statePath, JSON.stringify(state, null, 2) + '\\n', 'utf8');
}

function log(event, details = {}) {
  appendFileSync(logPath, JSON.stringify({ event, ...details }) + '\\n', 'utf8');
}

const stableFunction = {
  id: 'ce1f7353-c5e7-4c8c-aeac-75d1f4df5a43',
  name: 'mcp-search',
  slug: 'mcp-search',
  version: 40,
  updated_at: 1784045797971,
  verify_jwt: false,
  status: 'ACTIVE',
};

if (command === 'supabase functions list') {
  const functions = [stableFunction];
  if (state.deployed) {
    const capturedId = '11111111-1111-4111-8111-111111111111';
    const mismatchedId = '22222222-2222-4222-8222-222222222222';
    const groupedId = scenario === 'mismatch' && state.grouped_list_count >= 1
      ? mismatchedId
      : capturedId;
    functions.push({
      id: groupedId,
      name: 'mcp-search-grouped',
      slug: 'mcp-search-grouped',
      version: 1,
      updated_at: 1784563200000,
      verify_jwt: false,
      status: 'ACTIVE',
    });
    state.grouped_list_count += 1;
  }
  save();
  log('list', {
    grouped_present: state.deployed,
    grouped_list_count: state.grouped_list_count,
  });
  console.log(JSON.stringify(functions));
  process.exit(0);
}

if (command === 'supabase functions deploy') {
  state.deployed = true;
  state.grouped_list_count = 0;
  save();
  log('deploy', { function_name: args[3] });
  console.log('Simulated grouped deployment.');
  process.exit(scenario === 'missing_id' ? 1 : 0);
}

if (command === 'supabase functions delete') {
  state.deployed = false;
  state.delete_count += 1;
  save();
  log('delete', { function_name: args[3] });
  console.log('Simulated grouped deletion.');
  process.exit(0);
}

console.error('Unsupported shim command: ' + args.join(' '));
process.exit(3);
`.trimStart());

function parseLog(path) {
  return readFileSync(path, 'utf8')
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function runScenario({
  id,
  expectedStatus,
  expectedDeleteCount,
  tarDirectory = null,
}) {
  const scenarioDir = join(workspace, id);
  const statePath = join(scenarioDir, 'state.json');
  const logPath = join(scenarioDir, 'commands.jsonl');
  mkdirSync(scenarioDir, { recursive: true });

  const result = spawnSync('powershell', [
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', runnerPath,
    '-ExpectedManifest', normalizedSha256(manifestPath),
    '-ExecuteApprovedGroupedRelease',
  ], {
    cwd: repoRoot,
    env: {
      ...process.env,
      PATH: [
        binDir,
        ...(tarDirectory ? [tarDirectory] : []),
        process.env.PATH,
      ].join(';'),
      BETA3_REAL_NODE: realNode,
      BETA3_SHIM_STATE_PATH: statePath,
      BETA3_SHIM_LOG_PATH: logPath,
      BETA3_SHIM_SCENARIO: id,
    },
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    timeout: 240_000,
  });

  assert.notEqual(
    result.status,
    0,
    `${id} simulation unexpectedly completed the release.`,
  );
  assert.equal(existsSync(rollbackEvidencePath), true);

  const rollback = JSON.parse(readFileSync(rollbackEvidencePath, 'utf8'));
  const state = JSON.parse(readFileSync(statePath, 'utf8'));
  const commands = parseLog(logPath);

  assert.equal(rollback.status, expectedStatus);
  assert.equal(rollback.stable_function_mutated, false);
  assert.equal(state.delete_count, expectedDeleteCount);
  assert.equal(
    commands.filter((entry) => entry.event === 'delete').length,
    expectedDeleteCount,
  );

  if (expectedStatus === 'blocked_unverified_function') {
    assert.equal(rollback.expected_function_id, null);
    assert.equal(
      rollback.observed_function_id,
      '11111111-1111-4111-8111-111111111111',
    );
  }
  if (expectedStatus === 'blocked_mismatched_function') {
    assert.equal(
      rollback.expected_function_id,
      '11111111-1111-4111-8111-111111111111',
    );
    assert.equal(
      rollback.observed_function_id,
      '22222222-2222-4222-8222-222222222222',
    );
  }
  if (expectedStatus === 'removed') {
    assert.equal(rollback.expected_function_id, rollback.observed_function_id);
    assert.equal(state.deployed, false);
  }

  removeGeneratedEvidence();
  return {
    status: rollback.status,
    delete_commands: expectedDeleteCount,
  };
}

let results;
try {
  results = {
    missing_id: runScenario({
      id: 'missing_id',
      expectedStatus: 'blocked_unverified_function',
      expectedDeleteCount: 0,
    }),
    mismatch: runScenario({
      id: 'mismatch',
      expectedStatus: 'blocked_mismatched_function',
      expectedDeleteCount: 0,
    }),
    match: runScenario({
      id: 'match_bsdtar',
      expectedStatus: 'removed',
      expectedDeleteCount: 1,
      tarDirectory: windowsSystemDirectory,
    }),
    ...(gitGnuTarPath
      ? {
          match_gnu_tar: runScenario({
            id: 'match_gnu_tar',
            expectedStatus: 'removed',
            expectedDeleteCount: 1,
            tarDirectory: dirname(gitGnuTarPath),
          }),
        }
      : {
          match_gnu_tar: {
            status: 'not_available',
            delete_commands: 0,
          },
        }),
  };
} finally {
  removeGeneratedEvidence();
  rmSync(workspace, { recursive: true, force: true });
}

console.log(JSON.stringify({
  status: 'ok',
  scenarios: results,
  stable_function_mutations: 0,
  archive_tools: {
    bsdtar: windowsSystemDirectory ? 'tested' : 'not_available',
    gnu_tar: gitGnuTarPath ? 'tested' : 'not_available',
  },
}, null, 2));
