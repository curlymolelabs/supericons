import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildHostedSearchCatalogRows,
  buildHostedSearchPublicRegistryRows,
  resolveHostedSearchRegistryIconId,
} from '../lib/hosted-search-core.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

for (const [name, value] of [
  ['SUPABASE_URL', SUPABASE_URL],
  ['SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY],
]) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

function chunk(items, size) {
  const output = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
}

async function upsertRows(table, rows, onConflict = 'icon_id') {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  url.searchParams.set('on_conflict', onConflict);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Supabase upsert failed for ${table} (${response.status}): ${text}`);
  }
}

async function readJsonIfExists(relativePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(path.join(repoRoot, relativePath), 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return fallback;
    throw error;
  }
}

function normalizeRegistryRecords(rawRegistry) {
  if (Array.isArray(rawRegistry)) return rawRegistry;
  if (Array.isArray(rawRegistry?.records)) return rawRegistry.records;
  if (Array.isArray(rawRegistry?.icons)) return rawRegistry.icons;
  return [];
}

function buildTaxonomyByIconId(rawTaxonomy) {
  const output = {};
  const entries = Array.isArray(rawTaxonomy?.entries)
    ? rawTaxonomy.entries
    : Array.isArray(rawTaxonomy?.icons)
      ? rawTaxonomy.icons
      : Array.isArray(rawTaxonomy)
        ? rawTaxonomy
        : [];

  for (const entry of entries) {
    const iconId = entry?.icon_id || entry?.iconId || entry?.id;
    if (!iconId) continue;
    output[iconId] = entry;
  }

  return output;
}

function resolveRegistryRows(records, taxonomyByIconId, catalogRows) {
  const catalogIconIds = new Set((catalogRows || []).map((row) => row.icon_id));
  const resolvedRecords = [];
  const unresolvedIconIds = [];
  const taxonomyByResolvedIconId = {};

  for (const record of records) {
    const originalIconId = record?.icon_id || '(missing-icon-id)';
    const resolvedIconId = resolveHostedSearchRegistryIconId(record, catalogIconIds);
    if (!resolvedIconId) {
      unresolvedIconIds.push(originalIconId);
      continue;
    }

    const resolvedTaxonomy = taxonomyByIconId[originalIconId]
      || taxonomyByIconId[resolvedIconId]
      || null;

    if (resolvedTaxonomy) {
      taxonomyByResolvedIconId[resolvedIconId] = resolvedTaxonomy;
    }

    resolvedRecords.push({
      ...record,
      icon_id: resolvedIconId,
    });
  }

  return {
    resolvedRecords,
    unresolvedIconIds,
    taxonomyByResolvedIconId,
  };
}

const raw = JSON.parse(await fs.readFile(path.join(repoRoot, 'public', 'icon-index.json'), 'utf8'));
const rows = buildHostedSearchCatalogRows(raw.icons);

for (const batch of chunk(rows, 500)) {
  await upsertRows('icon_catalog', batch);
}

const rawRegistry = await readJsonIfExists('public/registry/records.json', []);
const rawTaxonomy = await readJsonIfExists('public/icon-taxonomy.json', { entries: [] });
const taxonomyByIconId = buildTaxonomyByIconId(rawTaxonomy);
const { resolvedRecords, unresolvedIconIds, taxonomyByResolvedIconId } = resolveRegistryRows(
  normalizeRegistryRecords(rawRegistry),
  taxonomyByIconId,
  rows,
);
const registryRows = buildHostedSearchPublicRegistryRows(
  resolvedRecords,
  taxonomyByResolvedIconId,
);

for (const batch of chunk(registryRows, 500)) {
  await upsertRows('icon_search_public_registry_metadata', batch);
}

console.log(`sync-search-catalog-to-supabase: synced ${rows.length} catalog rows`);
console.log(`sync-search-catalog-to-supabase: synced ${registryRows.length} public registry metadata rows`);
console.log(`sync-search-catalog-to-supabase: skipped ${unresolvedIconIds.length} unresolved registry rows`);
