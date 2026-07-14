import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  MATERIAL_EXPORT_SOURCE,
  MATERIAL_MCP_PRESETS,
  buildMaterialOwnedStoragePath,
  buildMaterialUpstreamSnapshotUrl,
} from '../material-export.js';
import {
  checksumMaterialSvg,
  normalizeAndValidateMaterialSvg,
} from '../lib/material-asset-pipeline.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const PUBLIC_DIR = join(ROOT, 'public');
const SNAPSHOT_DIR = join(PUBLIC_DIR, 'material-export');
const INDEX_PATH = join(PUBLIC_DIR, 'icon-index.json');
const DEFAULT_REPORT_PATH = join(ROOT, 'output', 'material-assets', 'seed-report.json');

const HOT_ICON_IDS = [
  'search', 'home', 'menu', 'close', 'settings', 'person', 'account_circle', 'mail',
  'favorite', 'star', 'download', 'upload', 'share', 'check', 'edit', 'delete',
  'info', 'warning', 'help', 'shopping_cart', 'login', 'logout', 'lock', 'visibility',
  'arrow_forward', 'arrow_back',
];

const PRESETS = {
  default: { variant: 'outline', axes: { ...MATERIAL_MCP_PRESETS.outline } },
  filled: { variant: 'solid', axes: { ...MATERIAL_MCP_PRESETS.solid } },
};

export function parseMaterialSeedArgs(argv) {
  const args = {
    presets: ['default', 'filled'],
    icons: null,
    all: false,
    hosted: false,
    dryRun: false,
    concurrency: 6,
    retries: 3,
    reportPath: DEFAULT_REPORT_PATH,
  };

  for (const raw of argv) {
    if (raw === '--all') args.all = true;
    else if (raw === '--hosted') args.hosted = true;
    else if (raw === '--dry-run') args.dryRun = true;
    else if (raw.startsWith('--icons=')) {
      args.icons = raw.slice('--icons='.length).split(',').map((value) => value.trim()).filter(Boolean);
    } else if (raw.startsWith('--presets=')) {
      args.presets = raw.slice('--presets='.length).split(',').map((value) => value.trim()).filter(Boolean);
    } else if (raw.startsWith('--concurrency=')) {
      args.concurrency = Math.max(1, Math.min(20, Number.parseInt(raw.slice('--concurrency='.length), 10) || 1));
    } else if (raw.startsWith('--retries=')) {
      args.retries = Math.max(1, Math.min(8, Number.parseInt(raw.slice('--retries='.length), 10) || 1));
    } else if (raw.startsWith('--report=')) {
      args.reportPath = resolve(raw.slice('--report='.length));
    }
  }

  return args;
}

function getMaterialIconIds() {
  if (!existsSync(INDEX_PATH)) throw new Error(`Missing icon index at ${INDEX_PATH}`);
  const raw = JSON.parse(readFileSync(INDEX_PATH, 'utf8'));
  return raw.icons
    .filter((icon) => icon.lib === 'material' && icon.type === 'font')
    .map((icon) => icon.id)
    .sort();
}

async function fetchWithRetries(url, retries) {
  let lastError = null;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      lastError = new Error(`Upstream returned ${response.status}`);
      if (response.status < 500 && response.status !== 429) break;
    } catch (error) {
      lastError = error;
    }
    if (attempt < retries) {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, Math.min(250 * (2 ** (attempt - 1)), 2000)));
    }
  }
  throw lastError || new Error('Upstream request failed');
}

function getHostedConfig() {
  const supabaseUrl = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const serviceRoleKey = process.env.SUPERICONS_SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || '';
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('--hosted requires SUPABASE_URL and a Supabase service-role key');
  }
  return { supabaseUrl, serviceRoleKey };
}

async function uploadHostedAsset(config, storagePath, svg) {
  const encodedPath = storagePath.split('/').map(encodeURIComponent).join('/');
  const response = await fetch(`${config.supabaseUrl}/storage/v1/object/material-icons/${encodedPath}`, {
    method: 'POST',
    headers: {
      apikey: config.serviceRoleKey,
      authorization: `Bearer ${config.serviceRoleKey}`,
      'content-type': 'image/svg+xml; charset=utf-8',
      'x-upsert': 'true',
    },
    body: svg,
  });
  if (!response.ok) throw new Error(`Storage upload failed (${response.status})`);
}

async function upsertHostedAsset(config, row) {
  const response = await fetch(`${config.supabaseUrl}/rest/v1/material_icon_assets?on_conflict=icon_id,variant`, {
    method: 'POST',
    headers: {
      apikey: config.serviceRoleKey,
      authorization: `Bearer ${config.serviceRoleKey}`,
      'content-type': 'application/json',
      prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(row),
  });
  if (!response.ok) throw new Error(`Asset-table upsert failed (${response.status})`);
}

async function seedAsset(task, args, hostedConfig) {
  const upstreamUrl = buildMaterialUpstreamSnapshotUrl(task.iconId, task.axes);
  const response = await fetchWithRetries(upstreamUrl, args.retries);
  const svg = normalizeAndValidateMaterialSvg(await response.text());
  const checksum = checksumMaterialSvg(svg);
  const storagePath = buildMaterialOwnedStoragePath(task.iconId, task.axes);
  const row = {
    icon_id: `material:${task.iconId}`,
    variant: task.variant,
    svg,
    axes: task.axes,
    source_repo: MATERIAL_EXPORT_SOURCE.repository,
    source_revision: MATERIAL_EXPORT_SOURCE.ref,
    checksum,
    license: 'Apache-2.0',
  };

  if (!args.dryRun) {
    const outputPath = join(SNAPSHOT_DIR, storagePath);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${svg}\n`, 'utf8');
    if (hostedConfig) {
      await uploadHostedAsset(hostedConfig, storagePath, svg);
      await upsertHostedAsset(hostedConfig, row);
    }
  }

  return {
    icon_id: row.icon_id,
    variant: row.variant,
    storage_path: storagePath,
    checksum,
    source_revision: row.source_revision,
  };
}

async function mapConcurrent(tasks, concurrency, worker) {
  const results = new Array(tasks.length);
  let cursor = 0;
  async function runWorker() {
    while (cursor < tasks.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(tasks[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, () => runWorker()));
  return results;
}

export async function runMaterialSeed(argv = process.argv.slice(2)) {
  const args = parseMaterialSeedArgs(argv);
  const availableIcons = new Set(getMaterialIconIds());
  const iconIds = args.all
    ? [...availableIcons].sort()
    : (args.icons || HOT_ICON_IDS).filter((iconId) => availableIcons.has(iconId)).sort();
  if (iconIds.length === 0) throw new Error('No valid Material icon IDs selected for seeding');

  const presets = args.presets.map((name) => [name, PRESETS[name]]).filter(([, preset]) => preset);
  if (presets.length === 0) {
    throw new Error(`No valid presets selected. Available presets: ${Object.keys(PRESETS).join(', ')}`);
  }

  const hostedConfig = args.hosted ? getHostedConfig() : null;
  const tasks = iconIds.flatMap((iconId) => presets.map(([presetName, preset]) => ({
    iconId,
    presetName,
    variant: preset.variant,
    axes: preset.axes,
  })));
  const failures = [];
  const assets = (await mapConcurrent(tasks, args.concurrency, async (task) => {
    try {
      const asset = await seedAsset(task, args, hostedConfig);
      console.log(`${args.dryRun ? 'Validated' : 'Seeded'} ${asset.storage_path}`);
      return asset;
    } catch (error) {
      failures.push({
        icon_id: `material:${task.iconId}`,
        variant: task.variant,
        code: 'asset_seed_failed',
        message: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  })).filter(Boolean);

  failures.sort((left, right) => left.icon_id.localeCompare(right.icon_id) || left.variant.localeCompare(right.variant));
  assets.sort((left, right) => left.icon_id.localeCompare(right.icon_id) || left.variant.localeCompare(right.variant));
  const report = {
    source_repo: MATERIAL_EXPORT_SOURCE.repository,
    source_revision: MATERIAL_EXPORT_SOURCE.ref,
    mode: args.dryRun ? 'dry_run' : (args.hosted ? 'hosted_seed' : 'local_seed'),
    requested_icons: iconIds.length,
    requested_assets: tasks.length,
    successful_assets: assets.length,
    failed_assets: failures.length,
    exception_rate: tasks.length > 0 ? failures.length / tasks.length : 0,
    assets,
    exceptions: failures,
  };
  await mkdir(dirname(args.reportPath), { recursive: true });
  await writeFile(args.reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`Material seed report: ${args.reportPath}`);
  if (failures.length > 0) process.exitCode = 1;
  return report;
}

if (resolve(process.argv[1] || '') === __filename) {
  runMaterialSeed().catch((error) => {
    console.error('Failed to seed owned Material cache:', error);
    process.exitCode = 1;
  });
}
