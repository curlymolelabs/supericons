import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import registryManifest from '../data/si-registry/registry-manifest.json' with { type: 'json' };
import { buildRegistryProjections } from '../lib/si-registry/projections.js';
import { normalizePremiumManifest } from '../lib/si-registry/premium-normalization.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const generatedDir = path.join(repoRoot, 'data/si-registry/generated');
const defaultSnapshotPath = path.join(generatedDir, 'supabase-registry-import-snapshot.json');

const args = new Set(process.argv.slice(2));
const write = args.has('--write');
const compareCurrent = args.has('--compare-current') || !write;
const outputJson = args.has('--json');

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function readImportSource(importSource) {
  const absolutePath = path.join(repoRoot, importSource.path);
  const source = await readJson(absolutePath);

  if (importSource.id === 'premium-manifest') {
    return normalizePremiumManifest(source);
  }

  throw new Error(`Unknown registry import source: ${importSource.id}`);
}

function stableHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function normalizeComparable(value) {
  if (Array.isArray(value)) return value.map((item) => normalizeComparable(item));
  if (!value || typeof value !== 'object') return value;

  const output = {};
  for (const [key, childValue] of Object.entries(value)) {
    if (key === 'generatedAt') continue;
    output[key] = normalizeComparable(childValue);
  }
  return output;
}

function assertDeepEqualIfExists(label, actual, filePath) {
  return readJson(filePath).then((expected) => {
    assert.deepEqual(
      normalizeComparable(actual),
      normalizeComparable(expected),
      `${label} should match ${path.relative(repoRoot, filePath)} ignoring generatedAt`
    );
    return true;
  });
}

const snapshot = await readJson(defaultSnapshotPath);
const recordRows = snapshot.tables?.icon_registry_records;

if (!Array.isArray(recordRows) || recordRows.length === 0) {
  throw new Error(`Snapshot has no promotable icon_registry_records: ${path.relative(repoRoot, defaultSnapshotPath)}`);
}

const semanticRecords = recordRows.map((row) => row.record);
const importedRecordGroups = await Promise.all((registryManifest.importSources || []).map((importSource) => readImportSource(importSource)));
const sourceRecords = [...semanticRecords, ...importedRecordGroups.flat()];
const projections = buildRegistryProjections(sourceRecords, {
  schemaVersion: registryManifest.schemaVersion,
  provider: registryManifest.provider,
});

const outputFiles = [
  [path.join(generatedDir, 'registry-summary.json'), projections.summary],
  [path.join(generatedDir, 'record-preview.json'), projections.recordPreview],
  [path.join(generatedDir, 'public-record-preview.json'), projections.publicRecordPreview],
  [path.join(generatedDir, 'premium-record-preview.json'), projections.premiumRecordPreview],
  [path.join(generatedDir, 'free-record-preview.json'), projections.freeRecordPreview],
  [path.join(repoRoot, 'public', 'registry', 'summary.json'), projections.publicSummary],
  [path.join(repoRoot, 'public', 'registry', 'records.json'), projections.publicRecordPreview],
  [path.join(repoRoot, 'mcp', 'public', 'registry-summary.json'), projections.publicSummary],
  [path.join(repoRoot, 'mcp', 'public', 'registry-records.json'), projections.publicRecordPreview],
];

if (compareCurrent) {
  for (const [filePath, value] of outputFiles) {
    await assertDeepEqualIfExists(path.basename(filePath), value, filePath);
  }
}

if (write) {
  for (const [filePath, value] of outputFiles) {
    await writeJson(filePath, value);
  }
}

const report = {
  mode: write ? 'write' : 'compare-current',
  snapshot: path.relative(repoRoot, defaultSnapshotPath).replaceAll(path.sep, '/'),
  semanticRecords: semanticRecords.length,
  totalRecords: projections.summary.totalRecordCount,
  publicRecords: projections.publicRecordPreview.length,
  publicHash: stableHash(projections.publicRecordPreview),
  outputFiles: outputFiles.map(([filePath]) => path.relative(repoRoot, filePath).replaceAll(path.sep, '/')),
};

if (outputJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log('export-registry-from-supabase');
  console.log(`mode: ${report.mode}`);
  console.log(`snapshot: ${report.snapshot}`);
  console.log(`semantic records: ${report.semanticRecords}`);
  console.log(`total records: ${report.totalRecords}`);
  console.log(`public records: ${report.publicRecords}`);
  console.log(`public hash: ${report.publicHash}`);
}
