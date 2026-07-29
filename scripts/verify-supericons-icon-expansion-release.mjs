import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

const expansionIds = [
  'agent-scout',
  'agent-wink',
  'game-pad',
  'game-ghost',
  'toothpaste',
  'bacteria',
  'stomach',
  'lawn-mower',
  'house-key',
  'screw',
  'agent-pod',
  'cashback',
  'lottery-ticket',
  'noodle-bowl',
  'dinosaur',
  'fossil',
  'comb',
  'hairbrush',
  'hair-clipper',
  'mascara',
  'nail-polish',
  'toothbrush',
  'dental-floss',
  'shampoo',
  'lotion',
  'sunscreen',
  'cotton-swab',
  'tweezers',
  'plate',
  'cutting-board',
  'wok',
  'toaster',
  'mixer',
  'grater',
  'peeler',
  'rolling-pin',
  'tongs',
  'colander',
  'corkscrew',
  'can-opener',
];

const noAvoidWhenIds = new Set([
  'house-key',
  'cashback',
  'noodle-bowl',
  'dinosaur',
  'mascara',
  'nail-polish',
  'dental-floss',
  'shampoo',
  'lotion',
  'sunscreen',
  'cotton-swab',
  'cutting-board',
  'wok',
  'peeler',
  'corkscrew',
]);

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(repoRoot, relativePath), 'utf8'));
}

async function readText(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8');
}

const [
  sourceRecords,
  publicIndex,
  mcpIndex,
  publicRegistry,
  mcpRegistry,
  productFacts,
  mcpProductFacts,
  historicalMigration,
  forwardMigration,
  taxonomyExporter,
] = await Promise.all([
  readJson('data/si-registry/source/libraries/supericons-concepts.json'),
  readJson('public/icon-index.json'),
  readJson('mcp/public/icon-index.json'),
  readJson('public/registry/records.json'),
  readJson('mcp/public/registry-records.json'),
  readJson('data/product-facts.json'),
  readJson('mcp/public/product-facts.json'),
  readText('supabase/migrations/20260416_icon_taxonomy_seed_p0.sql'),
  readText('supabase/migrations/20260730003000_supericons_icon_expansion_taxonomy.sql'),
  readText('scripts/export-icon-taxonomy-seed.mjs'),
]);

assert.equal(expansionIds.length, 40, 'the release fixture must cover all 40 expansion icons');
assert.equal(publicIndex.icons.filter((icon) => icon.lib === 'si').length, 146);
assert.equal(mcpIndex.icons.filter((icon) => icon.lib === 'si').length, 146);
assert.equal(publicIndex.totalCount, mcpIndex.totalCount);
assert.equal(productFacts.freeIconCount, publicIndex.totalCount);
assert.equal(mcpProductFacts.freeIconCount, mcpIndex.totalCount);

const sourceById = new Map(sourceRecords.map((record) => [record.icon_id, record]));
const publicRegistryById = new Map(publicRegistry.map((record) => [record.icon_id, record]));
const mcpRegistryById = new Map(mcpRegistry.map((record) => [record.icon_id, record]));

for (const id of expansionIds) {
  const iconId = `si:${id}`;
  assert.ok(sourceById.has(iconId), `source registry is missing ${iconId}`);
  assert.ok(publicRegistryById.has(iconId), `public registry is missing ${iconId}`);
  assert.ok(mcpRegistryById.has(iconId), `MCP registry is missing ${iconId}`);
  assert.match(forwardMigration, new RegExp(`'${iconId}'`), `forward migration is missing ${iconId}`);
  assert.doesNotMatch(
    historicalMigration,
    new RegExp(`'${iconId}'`),
    `historical taxonomy migration should not contain ${iconId}`,
  );
}

for (const id of noAvoidWhenIds) {
  const iconId = `si:${id}`;
  assert.equal('avoid_when' in sourceById.get(iconId), false, `${iconId} should omit avoid_when`);
  assert.equal('avoid_when' in publicRegistryById.get(iconId), false, `${iconId} public record should omit avoid_when`);
  assert.equal('avoid_when' in mcpRegistryById.get(iconId), false, `${iconId} MCP record should omit avoid_when`);
}

assert.equal(sourceRecords.some((record) => record.avoid_when === ''), false);
assert.doesNotMatch(taxonomyExporter, /20260416_icon_taxonomy_seed_p0/u);

const dinosaur = sourceById.get('si:dinosaur');
assert.ok(dinosaur.semantic_tags.includes('sauropod'));
assert.ok(dinosaur.synonyms.includes('long neck dinosaur'));
assert.equal(dinosaur.semantic_tags.includes('t-rex'), false);
assert.equal(dinosaur.semantic_tags.includes('claws'), false);
assert.equal(dinosaur.synonyms.includes('t-rex'), false);

for (const [catalogName, catalog] of [
  ['public', publicIndex],
  ['MCP', mcpIndex],
]) {
  const catalogDinosaur = catalog.icons.find((icon) => icon.lib === 'si' && icon.id === 'dinosaur');
  assert.ok(catalogDinosaur, `${catalogName} catalog is missing si:dinosaur`);
  assert.ok(catalogDinosaur.semanticTags.includes('sauropod'));
  assert.ok(catalogDinosaur.synonyms.includes('long neck dinosaur'));
  assert.equal(catalogDinosaur.semanticTags.includes('t-rex'), false);
  assert.equal(catalogDinosaur.semanticTags.includes('claws'), false);
  assert.equal(catalogDinosaur.synonyms.includes('t-rex'), false);
}

const fossil = sourceById.get('si:fossil');
assert.doesNotMatch(fossil.avoid_when, /stone block/iu);

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [path.join(repoRoot, 'mcp', 'index.js')],
  stderr: 'pipe',
});
const client = new Client({ name: 'supericons-icon-expansion-release-verifier', version: '1.0.0' });

await client.connect(transport);
try {
  for (const id of expansionIds) {
    const query = id.replace(/-/g, ' ');
    const response = await client.callTool({
      name: 'search_icons',
      arguments: {
        query,
        library: 'si',
        library_mode: 'strict',
        style: 'any',
        limit: 50,
      },
    });
    const textContent = response.content?.find((entry) => entry.type === 'text')?.text;
    assert.ok(textContent, `MCP search returned no text payload for ${id}`);
    const payload = JSON.parse(textContent);
    assert.ok(Array.isArray(payload.results), `MCP search returned no results for ${id}`);
    assert.equal(payload.results[0]?.id, id, `MCP exact-name search should rank ${id} first`);
  }
} finally {
  await client.close();
}

console.log(
  `verify-supericons-icon-expansion-release: ok (${expansionIds.length} icons, registry, migration, product facts, and MCP discovery)`,
);
