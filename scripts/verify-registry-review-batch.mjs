import assert from 'node:assert/strict';
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

if (!library && !batchPathArg) {
  throw new Error('Provide --library material or --batch path/to/batch.json.');
}

const batchPath = batchPathArg
  ? path.resolve(repoRoot, batchPathArg)
  : path.join(repoRoot, 'data/si-registry/staging/supabase-review-batches', `${library}-latest.json`);

const BLOCKED = [
  ['a symbol representing', (value) => value.includes('a symbol representing')],
  ['a symbol for', (value) => value.includes('a symbol for')],
  ['product mark', (value) => value.includes('product mark')],
  ['official+brand', (value) => value.includes('official') && value.includes('brand')],
  ['symbol for', (value) => value.includes('symbol for')],
];

const batch = JSON.parse(await fs.readFile(batchPath, 'utf8'));
assert.equal(Array.isArray(batch.records), true, 'batch.records must be an array');

for (const item of batch.records) {
  const id = item.record?.icon_id || item.queue?.icon_id || '(missing)';
  const update = item.proposed_update;
  assert.equal(typeof update, 'object', `missing proposed_update for ${id}`);

  for (const field of ['label', 'purpose', 'category']) {
    if (update[field] !== undefined) {
      assert.equal(typeof update[field], 'string', `${field} must be a string for ${id}`);
      assert.equal(update[field].trim().length > 0, true, `${field} cannot be empty for ${id}`);
    }
  }

  for (const field of ['depicts', 'use_when', 'avoid_when']) {
    assert.equal(typeof update[field], 'string', `${field} must be a string for ${id}`);
    assert.equal(update[field].trim().length >= 36, true, `${field} is too short for ${id}`);
  }

  assert.equal(Array.isArray(update.semantic_tags), true, `semantic_tags must be an array for ${id}`);
  assert.equal(update.semantic_tags.length >= 4, true, `semantic_tags needs at least 4 items for ${id}`);
  assert.equal(Array.isArray(update.synonyms), true, `synonyms must be an array for ${id}`);
  assert.equal(update.synonyms.length >= 4, true, `synonyms needs at least 4 items for ${id}`);

  const depicts = update.depicts.toLowerCase();
  for (const [label, test] of BLOCKED) {
    assert.equal(test(depicts), false, `blocked depicts phrase "${label}" found for ${id}`);
  }
}

console.log('verify-registry-review-batch: ok');
console.log(`batch: ${path.relative(repoRoot, batchPath)}`);
console.log(`records: ${batch.records.length}`);
