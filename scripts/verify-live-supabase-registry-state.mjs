const REQUIRED_TABLES = [
  'icon_registry_libraries',
  'icon_registry_import_staging',
  'icon_registry_records',
  'icon_registry_quality_findings',
  'icon_registry_review_queue',
];

const LIBRARIES = [
  'bootstrap',
  'heroicons',
  'iconoir',
  'ionicons',
  'lucide',
  'material',
  'mingcute',
  'phosphor',
  'simpleicons',
  'tabler',
];

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
      Prefer: options.prefer || 'count=exact',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Supabase ${options.method || 'GET'} ${pathname} failed (${response.status}): ${text}`);
  }

  return response;
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

const tableCounts = {};
for (const table of REQUIRED_TABLES) {
  tableCounts[table] = await countRows(table);
}

const publicExportCount = await countRows('icon_registry_public_export');
const openFindingsCount = await countRows('icon_registry_quality_findings', { status: 'eq.open' });
const openQueueCount = await countRows('icon_registry_review_queue', { status: 'eq.open' });

const recordsByLibrary = {};
const openQueueByLibrary = {};

for (const library of LIBRARIES) {
  recordsByLibrary[library] = await countRows('icon_registry_records', {
    library_key: `eq.${library}`,
  });
  openQueueByLibrary[library] = await countRows('icon_registry_review_queue', {
    status: 'eq.open',
    library_key: `eq.${library}`,
  });
}

console.log('verify-live-supabase-registry-state');
console.log('table counts:');
for (const [table, count] of Object.entries(tableCounts)) {
  console.log(`  ${table}: ${count}`);
}
console.log(`  icon_registry_public_export: ${publicExportCount}`);
console.log(`open quality findings: ${openFindingsCount}`);
console.log(`open review queue rows: ${openQueueCount}`);

console.log('records by library:');
for (const [library, count] of Object.entries(recordsByLibrary).sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`  ${library}: ${count}`);
}

console.log('open review queue by library:');
for (const [library, count] of Object.entries(openQueueByLibrary).filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${library}: ${count}`);
}

if (tableCounts.icon_registry_records !== 15103) {
  throw new Error(`Expected 15103 registry records, found ${tableCounts.icon_registry_records}`);
}
if (publicExportCount !== 15103) {
  throw new Error(`Expected 15103 public export records, found ${publicExportCount}`);
}
if (openFindingsCount > tableCounts.icon_registry_quality_findings) {
  throw new Error(`Open findings cannot exceed total findings: ${openFindingsCount}`);
}
if (openQueueCount > tableCounts.icon_registry_review_queue) {
  throw new Error(`Open queue rows cannot exceed total queue rows: ${openQueueCount}`);
}

console.log('verify-live-supabase-registry-state: ok');
