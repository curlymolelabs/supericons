import {
  DEFAULT_PACK_SLUG,
  DEFAULT_STORAGE_BUCKET,
  DEFAULT_SUPABASE_URL,
  buildPackInventory,
  checkLocalInventory,
  storageObjectUrl,
} from './lib/premium-pack-storage.mjs';

const slug = process.env.PREMIUM_PACK_SLUG || DEFAULT_PACK_SLUG;
const bucket = process.env.PREMIUM_STORAGE_BUCKET || DEFAULT_STORAGE_BUCKET;
const supabaseUrl = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const localOnly = process.argv.includes('--local-only') || process.env.PREMIUM_STORAGE_LOCAL_ONLY === '1';
const timeoutMs = Number(process.env.PREMIUM_STORAGE_TIMEOUT_MS || 10000);

function fail(message) {
  console.error('[premium-pack-storage] FAIL');
  console.error(message);
  process.exit(1);
}

async function remoteObjectExists(fileName) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(storageObjectUrl({
      supabaseUrl,
      bucket,
      slug,
      file: fileName,
    }), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
      signal: controller.signal,
    });

    await response.arrayBuffer();
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
    };
  } finally {
    clearTimeout(timeout);
  }
}

console.log('[premium-pack-storage] Checking premium pack storage inventory');
console.log(`Pack: ${slug}`);
console.log(`Bucket: ${bucket}`);

let inventory;
try {
  inventory = await buildPackInventory({ slug });
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  fail(`Could not build local inventory: ${message}`);
}

const localResults = await checkLocalInventory(inventory);
const missingLocal = localResults.filter((file) => !file.exists);

if (missingLocal.length > 0) {
  fail(`Missing local files:\n${missingLocal.map((file) => `- ${file.localPath}`).join('\n')}`);
}

console.log(`[premium-pack-storage] Local inventory: ${localResults.length} files, ${inventory.iconNames.length} icons`);

if (!serviceRoleKey) {
  const message = 'SUPABASE_SERVICE_ROLE_KEY is not set, so the private bucket cannot be verified.';
  if (localOnly) {
    console.log(`[premium-pack-storage] Remote bucket: SKIP (${message})`);
    console.log('[premium-pack-storage] PASS (local only)');
    process.exit(0);
  }
  fail(`${message}\nRun with --local-only to verify local files only.`);
}

const remoteResults = [];
for (const file of inventory.files) {
  try {
    const result = await remoteObjectExists(file.name);
    remoteResults.push({ file: file.name, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    remoteResults.push({ file: file.name, ok: false, status: 'REQUEST_FAILED', statusText: message });
  }
}

const missingRemote = remoteResults.filter((file) => !file.ok);
if (missingRemote.length > 0) {
  fail(`Missing or inaccessible remote files:\n${missingRemote.map((file) => `- ${slug}/${file.file} (${file.status} ${file.statusText})`).join('\n')}`);
}

console.log(`[premium-pack-storage] Remote bucket: ${remoteResults.length} files present`);
console.log('[premium-pack-storage] PASS');
