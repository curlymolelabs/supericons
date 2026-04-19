import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildProductFactsObject, readExistingProductFacts } from './product-facts-core.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const mcpFactsPath = path.join(repoRoot, 'mcp', 'public', 'product-facts.json');

let existingFacts;
try {
  existingFacts = await readExistingProductFacts();
} catch (error) {
  console.error('verify-product-facts: data/product-facts.json is missing. Run: node scripts/build-product-facts.mjs');
  process.exit(1);
}

let mcpFacts;
try {
  mcpFacts = JSON.parse(await fs.readFile(mcpFactsPath, 'utf8'));
} catch (error) {
  console.error('verify-product-facts: mcp/public/product-facts.json is missing. Run: node scripts/build-product-facts.mjs');
  process.exit(1);
}

const expectedFacts = await buildProductFactsObject();
const comparableExisting = { ...existingFacts, generatedAt: '__ignored__' };
const comparableMcpFacts = { ...mcpFacts, generatedAt: '__ignored__' };
const comparableExpected = { ...expectedFacts, generatedAt: '__ignored__' };

assert.deepEqual(
  comparableExisting,
  comparableExpected,
  'data/product-facts.json is stale. Run: node scripts/build-product-facts.mjs'
);

assert.deepEqual(
  comparableMcpFacts,
  comparableExpected,
  'mcp/public/product-facts.json is stale. Run: node scripts/build-product-facts.mjs'
);

console.log('verify-product-facts: ok');
