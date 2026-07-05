import { readFile } from 'node:fs/promises';
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
const confirmSlug = process.env.PREMIUM_UPLOAD_CONFIRM || '';
const dryRun = process.argv.includes('--dry-run') || process.env.PREMIUM_UPLOAD_DRY_RUN === '1';
const timeoutMs = Number(process.env.PREMIUM_STORAGE_TIMEOUT_MS || 10000);

function fail(message) {
  console.error('[premium-pack-upload] FAIL');
  console.error(message);
  process.exit(1);
}

async function uploadObject(file) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const body = await readFile(file.localPath);

  try {
    const response = await fetch(storageObjectUrl({
      supabaseUrl,
      bucket,
      slug,
      file: file.name,
    }), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        'Content-Type': file.contentType,
        'x-upsert': 'true',
      },
      body,
      signal: controller.signal,
    });

    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      body: text,
    };
  } finally {
    clearTimeout(timeout);
  }
}

console.log('[premium-pack-upload] Preparing premium pack storage upload');
console.log(`Pack: ${slug}`);
console.log(`Bucket: ${bucket}`);

if (!dryRun && !serviceRoleKey) {
  fail('SUPABASE_SERVICE_ROLE_KEY is required to upload to the private bucket.');
}

if (!dryRun && confirmSlug !== slug) {
  fail(`Set PREMIUM_UPLOAD_CONFIRM=${slug} to upload. Use --dry-run to inspect without writing.`);
}

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

console.log(`[premium-pack-upload] Local inventory: ${inventory.files.length} files, ${inventory.iconNames.length} icons`);

if (dryRun) {
  console.log('[premium-pack-upload] DRY RUN');
  for (const file of inventory.files) {
    console.log(`- ${slug}/${file.name} (${file.contentType})`);
  }
  console.log('[premium-pack-upload] PASS (dry run)');
  process.exit(0);
}

const failures = [];

for (const file of inventory.files) {
  try {
    const result = await uploadObject(file);
    if (!result.ok) {
      failures.push(`${slug}/${file.name} (${result.status} ${result.statusText}) ${result.body.slice(0, 200)}`);
      continue;
    }
    console.log(`[premium-pack-upload] uploaded ${slug}/${file.name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`${slug}/${file.name} (${message})`);
  }
}

if (failures.length > 0) {
  fail(`Upload failures:\n${failures.map((failure) => `- ${failure}`).join('\n')}`);
}

console.log(`[premium-pack-upload] PASS (${inventory.files.length} files uploaded)`);
