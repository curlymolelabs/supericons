import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const args = process.argv.slice(2);

function argValue(name, fallback = null) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

const library = argValue('--library');
const batchPathArg = argValue('--batch');
const apply = args.includes('--apply');

if (!library && !batchPathArg) {
  throw new Error('Provide --library material or --batch path/to/batch.json.');
}

const batchPath = batchPathArg
  ? path.resolve(repoRoot, batchPathArg)
  : path.join(repoRoot, 'data/si-registry/staging/supabase-review-batches', `${library}-latest.json`);

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. Run this from your trusted terminal with Supabase env vars set.`);
  return value;
}

async function requestSupabase(pathname, options = {}) {
  const supabaseUrl = requiredEnv('SUPABASE_URL');
  const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  const url = new URL(`${supabaseUrl}/rest/v1/${pathname}`);

  for (const [key, value] of Object.entries(options.searchParams || {})) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: options.prefer || 'return=minimal',
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Supabase ${options.method || 'GET'} ${pathname} failed (${response.status}): ${text}`);
  }

  return response;
}

async function patchRows(table, searchParams, body) {
  await requestSupabase(table, {
    method: 'PATCH',
    searchParams,
    body,
  });
}

async function countRows(table, filters = {}) {
  const response = await requestSupabase(table, {
    method: 'HEAD',
    searchParams: {
      select: '*',
      ...filters,
    },
    prefer: 'count=exact',
  });
  const range = response.headers.get('content-range') || '';
  const match = range.match(/\/(\d+)$/);
  if (!match) throw new Error(`Could not parse count for ${table}: ${range}`);
  return Number(match[1]);
}

function buildUpdatedRecord(existingRecord, update) {
  return {
    ...existingRecord,
    ...(update.label !== undefined ? { label: update.label } : {}),
    ...(update.purpose !== undefined ? { purpose: update.purpose } : {}),
    ...(update.category !== undefined ? { category: update.category } : {}),
    depicts: update.depicts,
    semantic_tags: update.semantic_tags,
    synonyms: update.synonyms,
    use_when: update.use_when,
    avoid_when: update.avoid_when,
  };
}

const batch = JSON.parse(await fs.readFile(batchPath, 'utf8'));
if (!Array.isArray(batch.records)) {
  throw new Error(`Invalid batch file: ${path.relative(repoRoot, batchPath)}`);
}

const updates = batch.records.map((item) => {
  const iconId = item.record?.icon_id || item.queue?.icon_id;
  if (!iconId) throw new Error('Batch record is missing icon_id.');

  const update = item.proposed_update;
  if (!update) throw new Error(`Batch record is missing proposed_update for ${iconId}.`);

  return {
    iconId,
    libraryKey: item.record?.library_key || item.queue?.library_key,
    update,
    existingRecordJson: item.record?.record || {},
  };
});

console.log('apply-supabase-registry-review-batch');
console.log(`mode: ${apply ? 'apply' : 'dry-run'}`);
console.log(`batch: ${path.relative(repoRoot, batchPath)}`);
console.log(`records: ${updates.length}`);
for (const item of updates) {
  console.log(`  ${item.iconId}`);
}

if (!apply) {
  console.log('Dry run only. No live Supabase rows were modified.');
  process.exit(0);
}

for (const item of updates) {
  const updatedRecordJson = buildUpdatedRecord(item.existingRecordJson, item.update);
  const patchBody = {
    depicts: item.update.depicts,
    semantic_tags: item.update.semantic_tags,
    synonyms: item.update.synonyms,
    use_when: item.update.use_when,
    avoid_when: item.update.avoid_when,
    quality_status: 'passing',
    record: updatedRecordJson,
    updated_at: new Date().toISOString(),
  };

  for (const field of ['label', 'purpose', 'category']) {
    if (item.update[field] !== undefined) {
      patchBody[field] = item.update[field];
    }
  }

  await patchRows(
    'icon_registry_records',
    { icon_id: `eq.${item.iconId}` },
    patchBody
  );

  await patchRows(
    'icon_registry_quality_findings',
    {
      icon_id: `eq.${item.iconId}`,
      status: 'eq.open',
    },
    {
      status: 'resolved',
      resolved_at: new Date().toISOString(),
    }
  );

  await patchRows(
    'icon_registry_review_queue',
    {
      icon_id: `eq.${item.iconId}`,
      status: 'eq.open',
    },
    {
      status: 'resolved',
      updated_at: new Date().toISOString(),
    }
  );
}

let remainingOpenFindings = 0;
let remainingOpenQueue = 0;
for (const item of updates) {
  remainingOpenFindings += await countRows('icon_registry_quality_findings', {
    icon_id: `eq.${item.iconId}`,
    status: 'eq.open',
  });
  remainingOpenQueue += await countRows('icon_registry_review_queue', {
    icon_id: `eq.${item.iconId}`,
    status: 'eq.open',
  });
}

console.log('post-apply open rows for batch:');
console.log(`  quality findings: ${remainingOpenFindings}`);
console.log(`  review queue: ${remainingOpenQueue}`);

if (remainingOpenFindings !== 0 || remainingOpenQueue !== 0) {
  throw new Error('Some batch rows still have open findings or queue entries.');
}

console.log('apply-supabase-registry-review-batch: ok');
