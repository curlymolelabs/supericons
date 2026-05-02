import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const snapshotPath = path.join(repoRoot, 'data/si-registry/staging/supabase-review-queues/registry-review-queue-snapshot.json');

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const replaceOpen = args.has('--replace-open') || apply;

const TABLES = {
  findings: 'icon_registry_quality_findings',
  queue: 'icon_registry_review_queue',
};

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. Set it in your trusted local terminal before using --apply.`);
  return value;
}

function chunk(items, size) {
  const output = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
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

async function deleteOpenRows(table) {
  await requestSupabase(table, {
    method: 'DELETE',
    searchParams: {
      status: 'eq.open',
    },
  });
}

async function insertRows(table, rows) {
  for (const batch of chunk(rows, 500)) {
    await requestSupabase(table, {
      method: 'POST',
      prefer: 'return=minimal',
      body: batch,
    });
  }
}

async function countOpenRows(table) {
  const response = await requestSupabase(table, {
    method: 'HEAD',
    searchParams: {
      status: 'eq.open',
      select: 'id',
    },
    prefer: 'count=exact',
  });

  const range = response.headers.get('content-range') || '';
  const match = range.match(/\/(\d+)$/);
  return match ? Number(match[1]) : null;
}

const snapshot = JSON.parse(await fs.readFile(snapshotPath, 'utf8'));
const findings = snapshot.tables?.icon_registry_quality_findings || [];
const queueRows = snapshot.tables?.icon_registry_review_queue || [];

if (!Array.isArray(findings) || !Array.isArray(queueRows)) {
  throw new Error(`Invalid review queue snapshot: ${path.relative(repoRoot, snapshotPath)}`);
}

console.log('apply-supabase-registry-review-queues');
console.log(`mode: ${apply ? 'apply' : 'dry-run'}`);
console.log(`snapshot: ${path.relative(repoRoot, snapshotPath)}`);
console.log(`quality findings: ${findings.length}`);
console.log(`review queue rows: ${queueRows.length}`);
console.log(`replace open rows: ${replaceOpen ? 'yes' : 'no'}`);

if (!apply) {
  console.log('Dry run only. No live Supabase tables were modified.');
  process.exit(0);
}

if (!replaceOpen) {
  throw new Error('Refusing --apply without replacement policy. Use --replace-open to make the operation deliberate.');
}

await deleteOpenRows(TABLES.findings);
await deleteOpenRows(TABLES.queue);
await insertRows(TABLES.findings, findings);
await insertRows(TABLES.queue, queueRows);

const liveFindingCount = await countOpenRows(TABLES.findings);
const liveQueueCount = await countOpenRows(TABLES.queue);

console.log('live open row counts:');
console.log(`  ${TABLES.findings}: ${liveFindingCount}`);
console.log(`  ${TABLES.queue}: ${liveQueueCount}`);

if (liveFindingCount !== findings.length) {
  throw new Error(`Live quality findings count mismatch: expected ${findings.length}, got ${liveFindingCount}`);
}

if (liveQueueCount !== queueRows.length) {
  throw new Error(`Live review queue count mismatch: expected ${queueRows.length}, got ${liveQueueCount}`);
}

console.log('apply-supabase-registry-review-queues: ok');
