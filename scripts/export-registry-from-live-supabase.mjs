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
const args = new Set(process.argv.slice(2));
const write = args.has('--write');
const outputJson = args.has('--json');

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. Run this from your trusted terminal with Supabase env vars set.`);
  return value;
}

async function requestSupabase(pathname, searchParams = {}) {
  const supabaseUrl = requiredEnv('SUPABASE_URL');
  const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  const url = new URL(`${supabaseUrl}/rest/v1/${pathname}`);

  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Supabase GET ${pathname} failed (${response.status}): ${text}`);
  }

  return response.json();
}

async function fetchAll(pathname, searchParams = {}) {
  const pageSize = 1000;
  const rows = [];

  for (let offset = 0; ; offset += pageSize) {
    const page = await requestSupabase(pathname, {
      ...searchParams,
      limit: String(pageSize),
      offset: String(offset),
    });

    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return rows;
}

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

const liveRows = await fetchAll('icon_registry_public_export', {
  select: 'record',
  order: 'icon_id.asc',
});

const semanticRecords = liveRows.map((row) => row.record);
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

if (write) {
  for (const [filePath, value] of outputFiles) {
    await writeJson(filePath, value);
  }
}

const report = {
  mode: write ? 'write' : 'dry-run',
  source: 'live_supabase',
  semanticRecords: semanticRecords.length,
  totalRecords: projections.summary.totalRecordCount,
  publicRecords: projections.publicRecordPreview.length,
  publicHash: stableHash(projections.publicRecordPreview),
  outputFiles: outputFiles.map(([filePath]) => path.relative(repoRoot, filePath).replaceAll(path.sep, '/')),
};

if (outputJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log('export-registry-from-live-supabase');
  console.log(`mode: ${report.mode}`);
  console.log(`semantic records: ${report.semanticRecords}`);
  console.log(`total records: ${report.totalRecords}`);
  console.log(`public records: ${report.publicRecords}`);
  console.log(`public hash: ${report.publicHash}`);
}
