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
const evidenceBefore = snapshotEvidence();
const workspacesBefore = releaseWorkspaces();

let runnerResult;
let simulationResult;
try {
  execFileSync(process.execPath, [
    lockScript,
    '--action', 'acquire',
    '--name', lockName,
    '--run-id', lockOwnerRunId,
    '--repository-root', lockOwnerWorktree,
  ], { cwd: repoRoot, stdio: ['ignore', 'pipe', 'pipe'] });

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
  execFileSync(process.execPath, [
    lockScript,
    '--action', 'release',
    '--name', lockName,
    '--run-id', lockOwnerRunId,
    '--repository-root', lockOwnerWorktree,
  ], { cwd: repoRoot, stdio: ['ignore', 'pipe', 'pipe'] });
}

const simulationOwnerRunId = randomUUID();
try {
  execFileSync(process.execPath, [
    lockScript,
    '--action', 'acquire',
    '--name', simulationLockName,
    '--run-id', simulationOwnerRunId,
    '--repository-root', lockOwnerWorktree,
  ], { cwd: repoRoot, stdio: ['ignore', 'pipe', 'pipe'] });
  simulationResult = spawnSync(process.execPath, [
    'scripts/verify-search-v2-beta3-grouped-rollback-simulation.mjs',
  ], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 60_000,
    maxBuffer: 16 * 1024 * 1024,
  });
} finally {
  execFileSync(process.execPath, [
    lockScript,
    '--action', 'release',
    '--name', simulationLockName,
    '--run-id', simulationOwnerRunId,
    '--repository-root', lockOwnerWorktree,
  ], { cwd: repoRoot, stdio: ['ignore', 'pipe', 'pipe'] });
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
  evidence_unchanged: true,
  release_workspaces_unchanged: true,
}, null, 2));
