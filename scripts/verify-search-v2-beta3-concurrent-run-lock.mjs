import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve('.');
const manifestPath = resolve(
  'docs/si-v2/search/reviews/search-v2-beta3-shared-grouped-release-manifest-2026-07-21.json',
);
const runnerPath = resolve('scripts/run-search-v2-beta3-grouped-release.ps1');
const lockScript = resolve('scripts/manage-search-v2-release-lock.mjs');
const lockName = 'search-v2-beta3-shared-grouped';
const simulationLockName = 'search-v2-beta3-shared-grouped-simulation';
const lockOwnerRunId = randomUUID();
const probeLockName = process.argv.includes('--probe-preheld-lock')
  ? process.argv[process.argv.indexOf('--probe-preheld-lock') + 1]
  : null;
const evidencePaths = [
  resolve('references/verification/search-v2-beta3-shared-grouped-live-2026-07-21.json'),
  resolve('references/verification/search-v2-beta3-shared-fr47-live-2026-07-21.json'),
  resolve('references/verification/search-v2-beta3-shared-grouped-release-completion-2026-07-21.json'),
  resolve('references/verification/search-v2-beta3-shared-grouped-release-rollback-2026-07-21.json'),
];

function normalizedSha256(path) {
  const text = readFileSync(path, 'utf8').replace(/\r\n?/g, '\n');
  return createHash('sha256').update(text).digest('hex');
}

function snapshotEvidence() {
  return Object.fromEntries(evidencePaths.map((path) => {
    if (!existsSync(path)) return [path, { exists: false }];
    const stats = statSync(path);
    return [path, { exists: true, size: stats.size, mtime_ms: stats.mtimeMs }];
  }));
}

function releaseWorkspaces() {
  const temporaryRoot = resolve('.tmp');
  if (!existsSync(temporaryRoot)) return [];
  return readdirSync(temporaryRoot)
    .filter((name) => name.startsWith('search-v2-beta3-shared-grouped-'))
    .sort();
}

const worktreeLines = execFileSync('git', ['worktree', 'list', '--porcelain'], {
  cwd: repoRoot,
  encoding: 'utf8',
}).split(/\r?\n/);
const worktrees = worktreeLines
  .filter((line) => line.startsWith('worktree '))
  .map((line) => resolve(line.slice('worktree '.length)));
const lockOwnerWorktree = worktrees.find((path) => path !== repoRoot) || repoRoot;

function acquireLock(name, runId) {
  execFileSync(process.execPath, [
    lockScript,
    '--action', 'acquire',
    '--name', name,
    '--run-id', runId,
    '--repository-root', lockOwnerWorktree,
  ], { cwd: repoRoot, stdio: ['ignore', 'pipe', 'pipe'] });
}

function releaseLock(name, runId) {
  execFileSync(process.execPath, [
    lockScript,
    '--action', 'release',
    '--name', name,
    '--run-id', runId,
    '--repository-root', lockOwnerWorktree,
  ], { cwd: repoRoot, stdio: ['ignore', 'pipe', 'pipe'] });
}

if (probeLockName) {
  const probeRunId = randomUUID();
  let probeAcquired = false;
  try {
    acquireLock(probeLockName, probeRunId);
    probeAcquired = true;
  } finally {
    if (probeAcquired) releaseLock(probeLockName, probeRunId);
  }
  console.log(JSON.stringify({ status: 'unexpected_probe_acquisition' }));
  process.exit(0);
}

function verifyPreheldLockFailure(name) {
  const ownerRunId = randomUUID();
  let ownerAcquired = false;
  try {
    acquireLock(name, ownerRunId);
    ownerAcquired = true;
    const result = spawnSync(process.execPath, [
      'scripts/verify-search-v2-beta3-concurrent-run-lock.mjs',
      '--probe-preheld-lock', name,
    ], {
      cwd: repoRoot,
      encoding: 'utf8',
      timeout: 30_000,
      maxBuffer: 16 * 1024 * 1024,
    });
    assert.notEqual(result.status, 0, `A pre-held ${name} lock must be refused.`);
    const output = `${result.stdout}\n${result.stderr}`;
    assert.match(output, new RegExp(`Release lock ${name} is already held`));
    assert.doesNotMatch(output, /belongs to another run and was not released/);
  } finally {
    if (ownerAcquired) releaseLock(name, ownerRunId);
  }
}

const evidenceBefore = snapshotEvidence();
const workspacesBefore = releaseWorkspaces();
verifyPreheldLockFailure(lockName);
verifyPreheldLockFailure(simulationLockName);

let runnerResult;
let simulationResult;
let releaseTestLockAcquired = false;
try {
  acquireLock(lockName, lockOwnerRunId);
  releaseTestLockAcquired = true;

  runnerResult = spawnSync('powershell', [
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', runnerPath,
    '-ExpectedManifest', normalizedSha256(manifestPath),
  ], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 60_000,
    maxBuffer: 16 * 1024 * 1024,
  });
} finally {
  if (releaseTestLockAcquired) releaseLock(lockName, lockOwnerRunId);
}

const simulationOwnerRunId = randomUUID();
let simulationTestLockAcquired = false;
try {
  acquireLock(simulationLockName, simulationOwnerRunId);
  simulationTestLockAcquired = true;
  simulationResult = spawnSync(process.execPath, [
    'scripts/verify-search-v2-beta3-grouped-rollback-simulation.mjs',
  ], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 60_000,
    maxBuffer: 16 * 1024 * 1024,
  });
} finally {
  if (simulationTestLockAcquired) releaseLock(simulationLockName, simulationOwnerRunId);
}

assert.ok(runnerResult);
assert.notEqual(runnerResult.status, 0, 'A concurrent release runner must be refused.');
assert.match(
  `${runnerResult.stdout}\n${runnerResult.stderr}`,
  /Release lock search-v2-beta3-shared-grouped is already held/,
);
assert.ok(simulationResult);
assert.notEqual(simulationResult.status, 0, 'A concurrent rollback simulation must be refused.');
assert.match(
  `${simulationResult.stdout}\n${simulationResult.stderr}`,
  /Release lock search-v2-beta3-shared-grouped-simulation is already held/,
);
assert.deepEqual(snapshotEvidence(), evidenceBefore, 'A refused runner changed release evidence.');
assert.deepEqual(releaseWorkspaces(), workspacesBefore, 'A refused runner changed release workspaces.');

console.log(JSON.stringify({
  status: 'ok',
  cross_worktree_lock: lockOwnerWorktree !== repoRoot,
  concurrent_runner_refused: true,
  concurrent_rollback_simulation_refused: true,
  preheld_release_lock_preserved_original_error: true,
  preheld_simulation_lock_preserved_original_error: true,
  evidence_unchanged: true,
  release_workspaces_unchanged: true,
}, null, 2));
