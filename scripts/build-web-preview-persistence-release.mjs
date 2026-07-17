import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';

const args = process.argv.slice(2);
const repoRoot = resolve(import.meta.dirname, '..');
const defaultPrivateRecord = process.env.LOCALAPPDATA
  ? join(process.env.LOCALAPPDATA, 'Supericons', 'private', 'search-v2-engine-canaries.json')
  : join(homedir(), '.supericons', 'private', 'search-v2-engine-canaries.json');

function getArgument(name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}

function sha256Buffer(value) {
  return createHash('sha256').update(value).digest('hex');
}

function sha256File(path) {
  return sha256Buffer(readFileSync(path));
}

function walkFiles(root) {
  const output = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) output.push(...walkFiles(path));
    else output.push(path);
  }
  return output;
}

function inventoryTree(root) {
  const files = walkFiles(root)
    .map((path) => ({
      path: relative(root, path).split(sep).join('/'),
      bytes: statSync(path).size,
      sha256: sha256File(path),
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
  const treeInput = files
    .map((file) => `${file.sha256} ${file.bytes} ${file.path}`)
    .join('\n');
  return {
    files,
    file_count: files.length,
    total_bytes: files.reduce((sum, file) => sum + file.bytes, 0),
    tree_sha256: sha256Buffer(`${treeInput}\n`),
  };
}

function copyProtectedWebSurface(protectedRoot, distRoot) {
  const entries = [
    'synonyms.json',
    'search-engine-license.txt',
    'third-party-notices.md',
    'THIRD_PARTY_PROVENANCE.json',
    'THIRD_PARTY_LICENSES',
    'runtime',
  ];
  for (const entry of entries) {
    const source = join(protectedRoot, entry);
    const target = join(distRoot, entry);
    mkdirSync(dirname(target), { recursive: true });
    cpSync(source, target, { recursive: true, force: true });
  }
}

const outputRoot = resolve(getArgument('--output-root'));
const privateRecordPath = resolve(getArgument('--private-record', defaultPrivateRecord));
const expectedPrivateRecordHash = getArgument('--expected-record-sha256');
const sourceCommit = getArgument('--source-commit');

assert.ok(outputRoot, '--output-root is required.');
assert.match(expectedPrivateRecordHash || '', /^[a-f0-9]{64}$/);
assert.match(sourceCommit || '', /^[a-f0-9]{40}$/);
assert.equal(sha256File(privateRecordPath), expectedPrivateRecordHash);

rmSync(outputRoot, { recursive: true, force: true });
mkdirSync(outputRoot, { recursive: true });

execFileSync(process.execPath, [
  join(repoRoot, 'node_modules', 'vite', 'bin', 'vite.js'),
  'build',
], {
  cwd: repoRoot,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
});
execFileSync(process.execPath, [
  join(repoRoot, 'scripts', 'cleanup-dist-admin-artifacts.mjs'),
], {
  cwd: repoRoot,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
});

const distRoot = join(outputRoot, 'dist');
cpSync(join(repoRoot, 'dist'), distRoot, { recursive: true });

const protectedRoot = join(outputRoot, '.protected');
execFileSync(process.execPath, [
  join(repoRoot, 'scripts', 'build-search-v2-protected-public-artifacts.mjs'),
  '--source-root',
  repoRoot,
  '--output-root',
  protectedRoot,
  '--private-record',
  privateRecordPath,
  '--expected-record-sha256',
  expectedPrivateRecordHash,
  '--source-commit',
  sourceCommit,
], {
  cwd: repoRoot,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
});

copyProtectedWebSurface(join(protectedRoot, 'web'), distRoot);
rmSync(protectedRoot, { recursive: true, force: true });

const inventory = inventoryTree(distRoot);
const report = {
  schema_version: 1,
  status: 'prepared',
  source_commit: sourceCommit,
  private_record_sha256: expectedPrivateRecordHash,
  artifact: {
    directory: 'dist',
    file_count: inventory.file_count,
    total_bytes: inventory.total_bytes,
    tree_sha256: inventory.tree_sha256,
  },
  files: inventory.files,
};
writeFileSync(
  join(outputRoot, 'web-preview-persistence-release-artifact.json'),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(JSON.stringify({
  status: report.status,
  source_commit: report.source_commit,
  private_record_sha256: report.private_record_sha256,
  artifact: report.artifact,
}, null, 2));
