import { createIconSemanticAliasMap } from '../lib/icon-semantic-aliases.js';
import { buildHostedSearchManifestSeedRows } from '../lib/hosted-search-core.js';

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

const rows = buildHostedSearchManifestSeedRows(createIconSemanticAliasMap());

for (const batch of chunk(rows, 500)) {
  await upsertRows('icon_search_private_manifest', batch);
}

console.log(`seed-private-search-manifests: seeded ${rows.length} rows`);
