import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const outputDir = path.join(repoRoot, 'data/si-registry/staging/supabase-review-batches');

const args = process.argv.slice(2);

function argValue(name, fallback = null) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

const library = argValue('--library');
const limit = Number(argValue('--limit', '10'));

if (!library) {
  throw new Error('Missing --library. Example: npm run pull:registry-review-batch -- --library material --limit 5');
}

if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
  throw new Error('--limit must be an integer from 1 to 100.');
}

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

function safeTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

const queueRows = await requestSupabase('icon_registry_review_queue', {
  select: 'icon_id,library_key,queue_type,priority,source_path,status,created_at,updated_at',
  status: 'eq.open',
  library_key: `eq.${library}`,
  order: 'priority.desc,created_at.asc',
  limit: String(limit),
});

const records = [];
for (const queueRow of queueRows) {
  const [record] = await requestSupabase('icon_registry_records', {
    select: 'icon_id,library_key,source_name,label,purpose,category,depicts,semantic_tags,synonyms,use_when,avoid_when,status,review_state,quality_status,access_tier,projection_policy,record',
    icon_id: `eq.${queueRow.icon_id}`,
    limit: '1',
  });

  const findings = await requestSupabase('icon_registry_quality_findings', {
    select: 'icon_id,library_key,issue_code,severity,field_name,message,source,status,created_at',
    icon_id: `eq.${queueRow.icon_id}`,
    status: 'eq.open',
    order: 'severity.desc,issue_code.asc',
  });

  records.push({
    queue: queueRow,
    record,
    findings,
  });
}

const batch = {
  schemaVersion: '1.0.0',
  generatedAt: new Date().toISOString(),
  source: 'live_supabase',
  library,
  limit,
  count: records.length,
  purpose: 'Review and rewrite semantic registry rows from the live Supabase review queue.',
  instructions: [
    'Edit only the proposed_update fields in a follow-up patch or update script.',
    'Keep icon_id, library_key, and source_name unchanged.',
    'Focus on depicts, semantic_tags, synonyms, use_when, and avoid_when.',
    'Do not paste service role keys or Supabase secrets into this file.',
  ],
  records: records.map((item) => ({
    ...item,
    proposed_update: {
      label: item.record?.label ?? '',
      purpose: item.record?.purpose ?? '',
      category: item.record?.category ?? '',
      depicts: item.record?.depicts ?? '',
      semantic_tags: item.record?.semantic_tags ?? [],
      synonyms: item.record?.synonyms ?? [],
      use_when: item.record?.use_when ?? '',
      avoid_when: item.record?.avoid_when ?? '',
    },
  })),
};

await fs.mkdir(outputDir, { recursive: true });
const outputPath = path.join(outputDir, `${library}-review-batch-${safeTimestamp()}.json`);
const latestPath = path.join(outputDir, `${library}-latest.json`);
await fs.writeFile(outputPath, `${JSON.stringify(batch, null, 2)}\n`, 'utf8');
await fs.writeFile(latestPath, `${JSON.stringify(batch, null, 2)}\n`, 'utf8');

console.log('pull-supabase-registry-review-batch');
console.log(`library: ${library}`);
console.log(`requested limit: ${limit}`);
console.log(`records pulled: ${records.length}`);
console.log(`batch: ${path.relative(repoRoot, outputPath)}`);
console.log(`latest: ${path.relative(repoRoot, latestPath)}`);
