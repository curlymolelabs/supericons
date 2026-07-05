import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import registryManifest from '../data/si-registry/registry-manifest.json' with { type: 'json' };
import { buildRegistryProjections } from '../lib/si-registry/projections.js';
import { normalizePremiumManifest } from '../lib/si-registry/premium-normalization.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const generatedDir = path.join(repoRoot, 'data', 'si-registry', 'generated');

async function readRecordGroup(recordGroup) {
  const absolutePath = path.join(repoRoot, 'data', 'si-registry', recordGroup.path);
  const records = JSON.parse(await fs.readFile(absolutePath, 'utf8'));

  if (!Array.isArray(records)) {
    throw new Error(`Registry record group must be an array: ${recordGroup.path}`);
  }

  return records.map((record) => ({
    source_group: record.source_group ?? recordGroup.sourceGroup,
    ...record,
  }));
}

async function readImportSource(importSource) {
  const absolutePath = path.join(repoRoot, importSource.path);
  const source = JSON.parse(await fs.readFile(absolutePath, 'utf8'));

  if (importSource.id === 'premium-manifest') {
    return normalizePremiumManifest(source);
  }

  throw new Error(`Unknown registry import source: ${importSource.id}`);
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const contents = `${JSON.stringify(value, null, 2)}\n`;
  const maxAttempts = process.platform === 'win32' ? 5 : 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await fs.writeFile(filePath, contents, 'utf8');
      return;
    } catch (error) {
      if (attempt >= maxAttempts || !['EBUSY', 'EPERM', 'UNKNOWN'].includes(error?.code)) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, attempt * 100));
    }
  }
}

const sourceRecordGroups = await Promise.all(registryManifest.recordGroups.map((recordGroup) => readRecordGroup(recordGroup)));
const importedRecordGroups = await Promise.all((registryManifest.importSources || []).map((importSource) => readImportSource(importSource)));
const sourceRecords = [...sourceRecordGroups.flat(), ...importedRecordGroups.flat()];
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

for (const [filePath, value] of outputFiles) {
  await writeJson(filePath, value);
}

console.log(
  `build-si-registry-projections: wrote ${outputFiles
    .map(([filePath]) => path.relative(repoRoot, filePath))
    .join(', ')}`
);
