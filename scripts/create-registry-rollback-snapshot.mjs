import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const snapshotDir = path.join(repoRoot, 'data/si-registry/archive/rollback-snapshots');
const snapshotPath = path.join(snapshotDir, 'latest-registry-rollback-snapshot.json');

const INCLUDE_PATHS = [
  'data/si-registry/registry-manifest.json',
  'data/si-registry/source',
  'data/si-registry/generated/supabase-registry-import-snapshot.json',
  'data/si-registry/generated/registry-summary.json',
  'data/si-registry/generated/public-record-preview.json',
  'public/registry/summary.json',
  'public/registry/records.json',
  'mcp/public/registry-summary.json',
  'mcp/public/registry-records.json',
];

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function listFiles(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  const stat = await fs.stat(absolutePath);

  if (stat.isFile()) return [relativePath.replaceAll(path.sep, '/')];

  const output = [];
  const entries = await fs.readdir(absolutePath, { withFileTypes: true });
  for (const entry of entries) {
    const childRelativePath = path.join(relativePath, entry.name);
    if (entry.isDirectory()) {
      output.push(...await listFiles(childRelativePath));
    } else if (entry.isFile()) {
      output.push(childRelativePath.replaceAll(path.sep, '/'));
    }
  }
  return output;
}

async function hashFile(relativePath) {
  const bytes = await fs.readFile(path.join(repoRoot, relativePath));
  return {
    path: relativePath.replaceAll(path.sep, '/'),
    bytes: bytes.length,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  };
}

const allFiles = [];
for (const includePath of INCLUDE_PATHS) {
  if (!await exists(path.join(repoRoot, includePath))) continue;
  allFiles.push(...await listFiles(includePath));
}

const uniqueFiles = [...new Set(allFiles)].sort();
const files = [];
for (const file of uniqueFiles) {
  files.push(await hashFile(file));
}

const snapshot = {
  schemaVersion: '1.0.0',
  generatedAt: new Date().toISOString(),
  purpose: 'Rollback proof for Supericons semantic registry source and generated public/MCP projections before Supabase cutover cleanup.',
  sourceOfTruth: 'data/si-registry/source plus data/si-registry/registry-manifest.json',
  includedRoots: INCLUDE_PATHS,
  fileCount: files.length,
  totalBytes: files.reduce((sum, file) => sum + file.bytes, 0),
  aggregateSha256: crypto.createHash('sha256').update(JSON.stringify(files)).digest('hex'),
  files,
};

await fs.mkdir(snapshotDir, { recursive: true });
await fs.writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');

console.log('create-registry-rollback-snapshot');
console.log(`snapshot: ${path.relative(repoRoot, snapshotPath)}`);
console.log(`files: ${snapshot.fileCount}`);
console.log(`bytes: ${snapshot.totalBytes}`);
console.log(`aggregate sha256: ${snapshot.aggregateSha256}`);
