/**
 * Upload premium icon assets to Supabase Storage.
 * 
 * Usage: node scripts/upload-premium-assets.js
 * 
 * Prompts for the Supabase service role key at runtime (never stored).
 * Uploads all SVG and CSS files from public/packs/{collection}/ to the
 * private 'premium-icons' bucket.
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = 'https://kcjmkakdhsqplvasgkjv.supabase.co';
const BUCKET = 'premium-icons';
const PACKS_DIR = path.join(__dirname, '..', 'public', 'packs');

// Collections to upload (folder names inside public/packs/)
const COLLECTIONS = [
  'ai-agentic',
  'data-charts',
  'ecommerce',
  'media-playback',
  'navigation-menus',
  'security-auth',
  'social-communication',
  'status-feedback',
];

async function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function uploadFile(serviceKey, slug, filename, filePath) {
  const fileContent = fs.readFileSync(filePath);
  const storagePath = `${slug}/${filename}`;
  const contentType = filename.endsWith('.css') ? 'text/css' : 'image/svg+xml';

  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${storagePath}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body: fileContent,
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to upload ${storagePath}: ${res.status} ${err}`);
  }

  return storagePath;
}

async function main() {
  console.log('Supericons: Upload Premium Assets to Supabase Storage');
  console.log('=====================================================\n');

  const serviceKey = await prompt('Paste your Supabase SERVICE ROLE key (starts with eyJ...): ');

  if (!serviceKey || serviceKey.length < 20) {
    console.error('Invalid key. Aborting.');
    process.exit(1);
  }

  // Verify bucket exists
  const bucketCheck = await fetch(`${SUPABASE_URL}/storage/v1/bucket/${BUCKET}`, {
    headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey },
  });

  if (!bucketCheck.ok) {
    console.error(`Bucket '${BUCKET}' not found. Create it first in the Supabase dashboard.`);
    process.exit(1);
  }

  console.log(`\nBucket '${BUCKET}' found. Starting upload...\n`);

  let totalUploaded = 0;
  let totalErrors = 0;

  for (const slug of COLLECTIONS) {
    const collectionDir = path.join(PACKS_DIR, slug);

    if (!fs.existsSync(collectionDir)) {
      console.warn(`  SKIP: ${slug} (directory not found)`);
      continue;
    }

    const files = fs.readdirSync(collectionDir)
      .filter(f => f.endsWith('.svg') || f.endsWith('.css'));

    console.log(`  ${slug}: ${files.length} files`);

    for (const file of files) {
      try {
        await uploadFile(serviceKey, slug, file, path.join(collectionDir, file));
        totalUploaded++;
        // Progress dot every 10 files
        if (totalUploaded % 10 === 0) process.stdout.write('.');
      } catch (err) {
        console.error(`\n    ERROR: ${err.message}`);
        totalErrors++;
      }
    }

    console.log(` done`);
  }

  console.log(`\n=====================================================`);
  console.log(`Uploaded: ${totalUploaded} files`);
  if (totalErrors > 0) console.log(`Errors: ${totalErrors}`);
  console.log(`Done.`);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
