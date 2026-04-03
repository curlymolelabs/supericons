import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import {
  MATERIAL_EXPORT_DEFAULT_AXES,
  MATERIAL_EXPORT_SOURCE,
  MATERIAL_EXPORT_SUPPORTED_AXES,
} from '../material-export.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const PUBLIC_DIR = join(ROOT, 'public');
const OUTPUT_PATH = join(PUBLIC_DIR, 'material-export-manifest.json');

async function main() {
  await mkdir(PUBLIC_DIR, { recursive: true });

  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: MATERIAL_EXPORT_SOURCE,
    supportedAxes: MATERIAL_EXPORT_SUPPORTED_AXES,
    defaultAxes: MATERIAL_EXPORT_DEFAULT_AXES,
  };

  await writeFile(OUTPUT_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`Wrote material export manifest to ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error('Failed to build material export manifest:', error);
  process.exitCode = 1;
});

