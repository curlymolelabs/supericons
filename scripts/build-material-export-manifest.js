import { mkdir, readdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import {
  MATERIAL_EXPORT_DEFAULT_AXES,
  MATERIAL_EXPORT_SOURCE,
  MATERIAL_EXPORT_STORAGE,
  MATERIAL_EXPORT_SUPPORTED_AXES,
  buildMaterialCacheKey,
  parseMaterialOwnedStoragePath,
} from '../material-export.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const PUBLIC_DIR = join(ROOT, 'public');
const SNAPSHOT_DIR = join(PUBLIC_DIR, 'material-export');
const OUTPUT_PATH = join(PUBLIC_DIR, 'material-export-manifest.json');

async function walk(dir) {
  const results = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...await walk(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

async function collectOwnedEntries() {
  const entries = {};
  if (!existsSync(SNAPSHOT_DIR)) return entries;

  const files = (await walk(SNAPSHOT_DIR))
    .filter(file => file.endsWith('.svg'))
    .sort((a, b) => a.localeCompare(b));
  for (const file of files) {
    const relPath = relative(SNAPSHOT_DIR, file).replace(/\\/g, '/');
    const parsed = parseMaterialOwnedStoragePath(relPath);
    if (!parsed) continue;
    entries[buildMaterialCacheKey(parsed.iconId, parsed.axes)] = {
      path: relPath,
    };
  }

  return entries;
}

async function main() {
  await mkdir(PUBLIC_DIR, { recursive: true });

  const entries = await collectOwnedEntries();
  const manifest = {
    version: 2,
    upstream: MATERIAL_EXPORT_SOURCE,
    exportMatrix: MATERIAL_EXPORT_SUPPORTED_AXES,
    defaultAxes: MATERIAL_EXPORT_DEFAULT_AXES,
    storage: {
      ...MATERIAL_EXPORT_STORAGE,
      entryCount: Object.keys(entries).length,
    },
    entries,
  };

  await writeFile(OUTPUT_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`Wrote material export manifest to ${OUTPUT_PATH} (${Object.keys(entries).length} owned entries)`);
}

main().catch((error) => {
  console.error('Failed to build material export manifest:', error);
  process.exitCode = 1;
});
