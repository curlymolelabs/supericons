import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  MATERIAL_EXPORT_DEFAULT_AXES,
  buildMaterialOwnedStoragePath,
  buildMaterialUpstreamSnapshotUrl,
  normalizeMaterialSnapshotSvg,
} from '../material-export.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const pilotDir = path.join(repoRoot, 'data', 'si-registry', 'pilot', 'purpose-chip');
const generatedDir = path.join(repoRoot, 'data', 'si-registry', 'generated');
const snapshotDir = path.join(repoRoot, 'public', 'material-export');

function pilotPath(fileName) {
  return path.join(pilotDir, fileName);
}

function generatedPath(fileName) {
  return path.join(generatedDir, fileName);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function seedMaterialIcon(iconId) {
  const url = buildMaterialUpstreamSnapshotUrl(iconId, MATERIAL_EXPORT_DEFAULT_AXES);
  const response = await fetch(url);

  if (!response.ok) {
    const error = new Error(`Failed to fetch Material icon ${iconId} (${response.status})`);
    error.status = response.status;
    error.iconId = iconId;
    throw error;
  }

  const normalizedSvg = normalizeMaterialSnapshotSvg(await response.text());
  const relativePath = buildMaterialOwnedStoragePath(iconId, MATERIAL_EXPORT_DEFAULT_AXES);
  const outputPath = path.join(snapshotDir, relativePath);

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${normalizedSvg}\n`, 'utf8');

  return relativePath;
}

const nextSteps = await readJson(pilotPath('automation-next-steps.json'));
const targetIcons = nextSteps
  .filter((entry) => entry.next_step === 'text_review' && entry.source_library === 'material')
  .map((entry) => entry.icon_id.replace(/^material:/, ''))
  .sort((left, right) => left.localeCompare(right));

const seeded = [];
const failed = [];

for (const iconId of targetIcons) {
  try {
    const relativePath = await seedMaterialIcon(iconId);
    seeded.push({
      icon_id: `material:${iconId}`,
      relative_path: relativePath,
    });
    console.log(`seed-purpose-chip-material-coverage: seeded ${relativePath}`);
  } catch (error) {
    failed.push({
      icon_id: `material:${iconId}`,
      reason: error.message,
      status: Number.isFinite(error?.status) ? error.status : null,
    });
    console.warn(`seed-purpose-chip-material-coverage: skipped material:${iconId} (${error.message})`);
  }
}

await writeJson(generatedPath('purpose-chip-material-coverage-summary.json'), {
  schema_version: '1.0.0',
  target_icon_count: targetIcons.length,
  seeded_icon_count: seeded.length,
  failed_icon_count: failed.length,
  default_axes: MATERIAL_EXPORT_DEFAULT_AXES,
  seeded_icons: seeded,
  failed_icons: failed,
});

if (failed.length > 0) {
  console.log(
    `seed-purpose-chip-material-coverage: seeded ${seeded.length} Material icon snapshot(s), skipped ${failed.length} icon(s)`
  );
} else {
  console.log(`seed-purpose-chip-material-coverage: seeded ${seeded.length} Material icon snapshot(s)`);
}
