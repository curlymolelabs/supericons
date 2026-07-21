import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  rmdirSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';

function readArgument(name, fallback = '') {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const action = readArgument('--action');
const lockName = readArgument('--name');
const runId = readArgument('--run-id');
const repositoryRoot = resolve(readArgument('--repository-root', process.cwd()));
const ownerProcessId = Number(readArgument('--owner-process-id', '0'));
const minimumStaleAgeMs = Number(readArgument('--minimum-stale-age-ms', '60000'));

assert.ok(['acquire', 'release', 'inspect', 'list', 'cleanup-stale'].includes(action));
if (action !== 'list') {
  assert.match(lockName, /^[a-z0-9][a-z0-9-]{2,80}$/);
}
if (['acquire', 'release', 'cleanup-stale'].includes(action)) {
  assert.match(runId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
}
if (action === 'acquire') {
  assert.ok(Number.isSafeInteger(ownerProcessId) && ownerProcessId > 0);
}
if (action === 'cleanup-stale') {
  assert.ok(Number.isSafeInteger(minimumStaleAgeMs) && minimumStaleAgeMs >= 0);
}

const gitCommonDir = execFileSync(
  'git',
  ['-C', repositoryRoot, 'rev-parse', '--path-format=absolute', '--git-common-dir'],
  { encoding: 'utf8' },
).trim();
const lockRoot = resolve(gitCommonDir, 'codex-release-locks');
const lockPath = resolve(lockRoot, lockName);
const ownerPath = resolve(lockPath, 'owner.json');

function readOwner() {
  try {
    return JSON.parse(readFileSync(ownerPath, 'utf8'));
  } catch (error) {
    const detail = error?.code === 'ENOENT' ? 'owner record is missing' : error.message;
    throw new Error(`Release lock ${lockName} is not readable: ${detail}.`);
  }
}

function processIsAlive(processId) {
  try {
    process.kill(processId, 0);
    return true;
  } catch (error) {
    if (error?.code === 'EPERM') return true;
    if (error?.code === 'ESRCH') return false;
    throw error;
  }
}

function listLocks() {
  if (!existsSync(lockRoot)) return [];
  return readdirSync(lockRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const listedOwnerPath = resolve(lockRoot, entry.name, 'owner.json');
      try {
        const owner = JSON.parse(readFileSync(listedOwnerPath, 'utf8'));
        return {
          status: 'held',
          ...owner,
          owner_process_alive: Number.isSafeInteger(owner.process_id)
            ? processIsAlive(owner.process_id)
            : null,
        };
      } catch (error) {
        return {
          status: 'unreadable',
          lock_name: entry.name,
          detail: error.message,
        };
      }
    });
}

if (action === 'acquire') {
  mkdirSync(lockRoot, { recursive: true });
  try {
    mkdirSync(lockPath);
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
    let owner = null;
    try {
      owner = readOwner();
    } catch {
      // A missing or unreadable owner remains locked for safe manual inspection.
    }
    const ownerDetail = owner?.run_id ? ` by run ${owner.run_id}` : '';
    throw new Error(`Release lock ${lockName} is already held${ownerDetail}.`);
  }

  const owner = {
    schema_version: 2,
    lock_name: lockName,
    run_id: runId,
    process_id: ownerProcessId,
    lock_manager_process_id: process.pid,
    worktree: repositoryRoot,
    acquired_at: new Date().toISOString(),
  };
  try {
    writeFileSync(ownerPath, `${JSON.stringify(owner, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
    });
  } catch (error) {
    rmSync(lockPath, { recursive: true, force: true });
    throw error;
  }
  console.log(JSON.stringify({ status: 'acquired', ...owner }, null, 2));
} else if (action === 'release') {
  const owner = readOwner();
  assert.equal(
    owner.run_id,
    runId,
    `Release lock ${lockName} belongs to another run and was not released.`,
  );
  rmSync(ownerPath);
  rmdirSync(lockPath);
  console.log(JSON.stringify({
    status: 'released',
    lock_name: lockName,
    run_id: runId,
  }, null, 2));
} else if (action === 'inspect') {
  const owner = readOwner();
  console.log(JSON.stringify({
    status: 'held',
    ...owner,
    owner_process_alive: Number.isSafeInteger(owner.process_id)
      ? processIsAlive(owner.process_id)
      : null,
  }, null, 2));
} else if (action === 'list') {
  console.log(JSON.stringify({ status: 'ok', locks: listLocks() }, null, 2));
} else {
  const ownerText = readFileSync(ownerPath, 'utf8');
  const owner = JSON.parse(ownerText);
  assert.equal(owner.schema_version, 2, 'Only version 2 locks have trustworthy owner PIDs.');
  assert.equal(
    owner.run_id,
    runId,
    `Release lock ${lockName} belongs to another run and was not cleaned up.`,
  );
  assert.ok(
    Number.isSafeInteger(owner.process_id) && owner.process_id > 0,
    `Release lock ${lockName} has no trustworthy owner PID.`,
  );
  assert.equal(
    processIsAlive(owner.process_id),
    false,
    `Release lock ${lockName} still has a live owner process and was not cleaned up.`,
  );
  const acquiredAtMs = Date.parse(owner.acquired_at);
  assert.ok(Number.isFinite(acquiredAtMs), `Release lock ${lockName} has an invalid acquisition time.`);
  const staleAgeMs = Date.now() - acquiredAtMs;
  assert.ok(
    staleAgeMs >= minimumStaleAgeMs,
    `Release lock ${lockName} is only ${staleAgeMs} ms old and was not cleaned up.`,
  );
  assert.equal(
    readFileSync(ownerPath, 'utf8'),
    ownerText,
    `Release lock ${lockName} changed during stale cleanup.`,
  );
  rmSync(ownerPath);
  rmdirSync(lockPath);
  console.log(JSON.stringify({
    status: 'cleaned_stale',
    lock_name: lockName,
    run_id: runId,
    process_id: owner.process_id,
    stale_age_ms: staleAgeMs,
  }, null, 2));
}
