import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  readFileSync,
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

assert.ok(['acquire', 'release', 'inspect'].includes(action));
assert.match(lockName, /^[a-z0-9][a-z0-9-]{2,80}$/);
if (action !== 'inspect') {
  assert.match(runId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
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
    schema_version: 1,
    lock_name: lockName,
    run_id: runId,
    process_id: process.pid,
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
} else {
  const owner = readOwner();
  console.log(JSON.stringify({ status: 'held', ...owner }, null, 2));
}
