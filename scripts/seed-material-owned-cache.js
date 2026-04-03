import { mkdir, writeFile } from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import {
  MATERIAL_EXPORT_DEFAULT_AXES,
  buildMaterialOwnedStoragePath,
  buildMaterialUpstreamSnapshotUrl,
  normalizeMaterialSnapshotSvg,
} from '../material-export.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const PUBLIC_DIR = join(ROOT, 'public');
const SNAPSHOT_DIR = join(PUBLIC_DIR, 'material-export');
const INDEX_PATH = join(PUBLIC_DIR, 'icon-index.json');

const HOT_ICON_IDS = [
  'search',
  'home',
  'menu',
  'close',
  'settings',
  'person',
  'account_circle',
  'mail',
  'favorite',
  'star',
  'download',
  'upload',
  'share',
  'check',
  'edit',
  'delete',
  'info',
  'warning',
  'help',
  'shopping_cart',
  'login',
  'logout',
  'lock',
  'visibility',
  'arrow_forward',
  'arrow_back',
];

const PRESETS = {
  default: { ...MATERIAL_EXPORT_DEFAULT_AXES },
  filled: { fill: 1, wght: 400, grad: 0, opsz: 24, snapped: false },
};

function parseArgs(argv) {
  const args = { presets: ['default', 'filled'], icons: null, all: false };

  for (const raw of argv) {
    if (raw === '--all') args.all = true;
    else if (raw.startsWith('--icons=')) {
      args.icons = raw
        .slice('--icons='.length)
        .split(',')
        .map(value => value.trim())
        .filter(Boolean);
    } else if (raw.startsWith('--presets=')) {
      args.presets = raw
        .slice('--presets='.length)
        .split(',')
        .map(value => value.trim())
        .filter(Boolean);
    }
  }

  return args;
}

function getMaterialIconIds() {
  if (!existsSync(INDEX_PATH)) {
    throw new Error(`Missing icon index at ${INDEX_PATH}`);
  }

  const raw = JSON.parse(readFileSync(INDEX_PATH, 'utf8'));
  return raw.icons
    .filter(icon => icon.lib === 'material' && icon.type === 'font')
    .map(icon => icon.id);
}

async function seedIconPreset(iconId, axes) {
  const url = buildMaterialUpstreamSnapshotUrl(iconId, axes);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${iconId} (${response.status})`);
  }

  const normalizedSvg = normalizeMaterialSnapshotSvg(await response.text());
  const relPath = buildMaterialOwnedStoragePath(iconId, axes);
  const outputPath = join(SNAPSHOT_DIR, relPath);

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${normalizedSvg}\n`, 'utf8');
  return relPath;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const availableIcons = new Set(getMaterialIconIds());

  const iconIds = args.all
    ? [...availableIcons]
    : (args.icons || HOT_ICON_IDS).filter(iconId => availableIcons.has(iconId));

  if (iconIds.length === 0) {
    throw new Error('No valid Material icon ids selected for seeding');
  }

  const presets = args.presets
    .map(name => [name, PRESETS[name]])
    .filter(([, axes]) => axes);

  if (presets.length === 0) {
    throw new Error(`No valid presets selected. Available presets: ${Object.keys(PRESETS).join(', ')}`);
  }

  let seeded = 0;
  for (const iconId of iconIds) {
    for (const [, axes] of presets) {
      const relPath = await seedIconPreset(iconId, axes);
      seeded += 1;
      console.log(`Seeded ${relPath}`);
    }
  }

  console.log(`Seeded ${seeded} Material snapshot file(s) into ${SNAPSHOT_DIR}`);
}

main().catch(error => {
  console.error('Failed to seed owned Material cache:', error);
  process.exitCode = 1;
});
