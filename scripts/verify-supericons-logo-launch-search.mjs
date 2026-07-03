import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { searchIcons } from '../mcp/search.js';
import {
  createSemanticRegistryMap,
  searchSemanticRegistryRecords,
} from '../mcp/semantic-registry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(repoRoot, relativePath), 'utf8'));
}

async function readText(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8');
}

function iconId(icon) {
  return `${icon.lib}:${icon.id}`;
}

function requireString(value, message) {
  assert.equal(typeof value, 'string', message);
  assert.equal(value.trim().length > 0, true, message);
}

function requireStringArray(value, message) {
  assert.equal(Array.isArray(value), true, message);
  assert.equal(value.length > 0, true, message);
  assert.equal(value.every((item) => typeof item === 'string' && item.trim().length > 0), true, message);
}

function assertProfileRecord(record) {
  for (const field of [
    'icon_id',
    'source_library',
    'source_name',
    'label',
    'purpose',
    'category',
    'job_category',
    'use_when',
    'avoid_when',
    'version',
    'status',
    'access_tier',
    'projection_policy',
    'depicts',
    'review_state',
  ]) {
    requireString(record[field], `${record.icon_id} should include ${field}`);
  }

  for (const field of [
    'semantic_tags',
    'synonyms',
    'ai_filter_tags',
    'secondary_categories',
    'evidence',
  ]) {
    requireStringArray(record[field], `${record.icon_id} should include ${field}`);
  }

  assert.equal(record.source_library, 'si', `${record.icon_id} should stay in the Supericons library`);
  assert.equal(record.category, 'brand_identity', `${record.icon_id} should be a brand identity record`);
  assert.equal(record.access_tier, 'public_open_record', `${record.icon_id} should stay public`);
  assert.match(record.projection_policy, /^(public_open_record|future_public_record)$/, `${record.icon_id} should stay on a public projection policy`);
  assert.equal(record.is_premium, false, `${record.icon_id} should stay free`);
}

function assertPublicRegistryRecord(record) {
  for (const field of [
    'icon_id',
    'source_library',
    'source_name',
    'label',
    'purpose',
    'category',
    'depicts',
    'use_when',
    'avoid_when',
  ]) {
    requireString(record[field], `${record.icon_id} should include public ${field}`);
  }

  for (const field of ['semantic_tags', 'synonyms']) {
    requireStringArray(record[field], `${record.icon_id} should include public ${field}`);
  }

  assert.equal(record.source_library, 'si', `${record.icon_id} should stay in the Supericons library`);
  assert.equal('access_tier' in record, false, `${record.icon_id} should not expose access_tier publicly`);
  assert.equal('is_premium' in record, false, `${record.icon_id} should not expose is_premium publicly`);
  assert.equal('internalSignals' in record, false, `${record.icon_id} should not expose internal signals publicly`);
  assert.equal('editorialNotes' in record, false, `${record.icon_id} should not expose editorial notes publicly`);
}

function assertPublicIndexProfile(icon) {
  for (const field of [
    'assetType',
    'pack',
    'sourceUrl',
    'sourceTrust',
    'meaning',
    'rights',
    'qualityStatus',
    'access',
  ]) {
    requireString(icon[field], `${iconId(icon)} should expose ${field} in public icon index`);
  }

  for (const field of [
    'semanticTags',
    'synonyms',
    'aliases',
    'searchTerms',
    'filterTags',
    'aiFilterTags',
    'secondaryCategories',
    'variants',
  ]) {
    requireStringArray(icon[field], `${iconId(icon)} should expose ${field} in public icon index`);
  }
}

function assertFirstResult(query, expectedId, icons, synonyms) {
  const results = searchIcons(query, icons, synonyms, { limit: 8 });
  const ids = results.map(iconId);
  assert.equal(ids[0], expectedId, `${query} should rank ${expectedId} first. Got: ${ids.join(', ')}`);
  console.log(`[PASS] local first: ${query} -> ${ids.slice(0, 5).join(', ')}`);
}

function assertIncludedResult(query, expectedIds, icons, synonyms) {
  const results = searchIcons(query, icons, synonyms, { limit: 8 });
  const ids = results.map(iconId);
  assert.equal(
    expectedIds.some((expectedId) => ids.includes(expectedId)),
    true,
    `${query} should include one of ${expectedIds.join(', ')}. Got: ${ids.join(', ')}`,
  );
  console.log(`[PASS] local intent: ${query} -> ${ids.slice(0, 5).join(', ')}`);
}

function assertSemanticFirst(query, expectedId, semanticMap) {
  const ids = searchSemanticRegistryRecords(query, semanticMap, { limit: 8, minimumScore: 1 })
    .map((match) => match.record.icon_id);
  assert.equal(ids[0], expectedId, `${query} should rank ${expectedId} first in MCP semantic registry. Got: ${ids.join(', ')}`);
  console.log(`[PASS] semantic first: ${query} -> ${ids.slice(0, 5).join(', ')}`);
}

function assertSemanticIncluded(query, expectedIds, semanticMap) {
  const ids = searchSemanticRegistryRecords(query, semanticMap, { limit: 8, minimumScore: 1 })
    .map((match) => match.record.icon_id);
  assert.equal(
    expectedIds.some((expectedId) => ids.includes(expectedId)),
    true,
    `${query} should include one of ${expectedIds.join(', ')} in MCP semantic registry. Got: ${ids.join(', ')}`,
  );
  console.log(`[PASS] semantic intent: ${query} -> ${ids.slice(0, 5).join(', ')}`);
}

function assertSupericonsLibraryFirst(query, expectedId, icons, synonyms) {
  const results = searchIcons(query, icons, synonyms, { library: 'si', limit: 8 });
  const ids = results.map(iconId);
  assert.equal(ids[0], expectedId, `${query} should rank ${expectedId} first in the Supericons library. Got: ${ids.join(', ')}`);
  console.log(`[PASS] si local first: ${query} -> ${ids.slice(0, 5).join(', ')}`);
}

function assertSupericonsSemanticFirst(query, expectedId, semanticMap) {
  const ids = searchSemanticRegistryRecords(query, semanticMap, { limit: 8, minimumScore: 1 })
    .map((match) => match.record.icon_id);
  assert.equal(ids[0], expectedId, `${query} should rank ${expectedId} first in the Supericons MCP registry. Got: ${ids.join(', ')}`);
  console.log(`[PASS] si semantic first: ${query} -> ${ids.slice(0, 5).join(', ')}`);
}

function uniqueStrings(values) {
  const seen = new Set();
  const normalized = [];
  for (const value of values || []) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(trimmed);
  }
  return normalized;
}

const iconIndex = await readJson('public/icon-index.json');
const synonyms = await readJson('public/synonyms.json');
const sourceSupericonsRecords = await readJson('data/si-registry/source/libraries/supericons.json');
const publicRecords = await readJson('public/registry/records.json');
const mcpRecords = await readJson('mcp/public/registry-records.json');
const productFacts = await readJson('data/product-facts.json');
const mcpProductFacts = await readJson('mcp/public/product-facts.json');
const mcpIndexSource = await readText('mcp/index.js');
const remoteServerSource = await readText('mcp/remote-server.js');

const icons = iconIndex.icons || [];
const supericons = icons.filter((icon) => icon.lib === 'si');
const publicSupericonsRecords = publicRecords.filter((record) => record.icon_id?.startsWith('si:'));
const mcpSupericonsRecords = mcpRecords.filter((record) => record.icon_id?.startsWith('si:'));
const freeLibraryCount = new Set(icons.map((icon) => icon.lib)).size;

assert.equal(supericons.length, 50, 'public icon index should include 50 Supericons logos');
assert.equal(sourceSupericonsRecords.length, 50, 'source registry should include 50 Supericons logo records');
assert.equal(publicSupericonsRecords.length, 50, 'public registry should include 50 Supericons logo records');
assert.equal(mcpSupericonsRecords.length, 50, 'MCP registry should include 50 Supericons logo records');
assert.deepEqual(mcpRecords, publicRecords, 'MCP registry records should mirror public registry records');
assert.equal(freeLibraryCount, 11, 'public icon index should include 11 free libraries including Supericons');
assert.equal(productFacts.freeIconCount, icons.length, 'data product facts should match public icon count');
assert.equal(mcpProductFacts.freeIconCount, icons.length, 'MCP product facts should match public icon count');
assert.equal(productFacts.freeLibraryCount, freeLibraryCount, 'data product facts should match public library count');
assert.equal(mcpProductFacts.freeLibraryCount, freeLibraryCount, 'MCP product facts should match public library count');
assert.match(mcpIndexSource, /si:\s*\{\s*name:\s*'Supericons'/, 'local stdio MCP should advertise the Supericons library');
assert.match(remoteServerSource, /\['si',\s*'Supericons'/, 'hosted MCP should advertise the Supericons library');

for (const record of sourceSupericonsRecords) assertProfileRecord(record);
for (const record of publicSupericonsRecords) assertPublicRegistryRecord(record);
for (const icon of supericons) assertPublicIndexProfile(icon);

console.log('[PASS] profile coverage: 50 source records include launch profile fields');
console.log('[PASS] public coverage: 50 public/MCP records expose public-safe semantic fields');
console.log('[PASS] library discovery: product facts and MCP library metadata include Supericons');

const semanticMap = createSemanticRegistryMap(mcpRecords);
const supericonsSemanticMap = createSemanticRegistryMap(mcpSupericonsRecords);

for (const record of sourceSupericonsRecords) {
  const expectedId = record.icon_id;
  const identityQueries = uniqueStrings([
    `${record.label} logo`,
    `${record.source_name} logo`,
    `${record.icon_id.replace(/^si:/, '')} logo`,
  ]);

  for (const query of identityQueries) {
    assertSupericonsLibraryFirst(query, expectedId, icons, synonyms);
    assertSupericonsSemanticFirst(query, expectedId, supericonsSemanticMap);
  }
}

for (const query of [
  'xai artificial intelligence logo',
  'XAI logo',
  'x.ai logo',
  'grok logo',
  'grok imagine logo',
  'grok image generation logo',
  'grok video generation logo',
  'grok images logo',
  'grok video logo',
]) {
  assertSupericonsLibraryFirst(query, 'si:x-ai', icons, synonyms);
  assertSupericonsSemanticFirst(query, 'si:x-ai', supericonsSemanticMap);
}

for (const [query, expectedId] of [
  ['bolt logo', 'si:bolt'],
  ['pinecone logo', 'si:pinecone'],
  ['cartesia logo', 'si:cartesia'],
  ['context7 mcp logo', 'si:context7'],
  ['openai codex logo', 'si:openai-codex-app'],
]) {
  assertFirstResult(query, expectedId, icons, synonyms);
  assertSemanticFirst(query, expectedId, semanticMap);
}

for (const [query, expectedIds] of [
  ['ai app builder logo', ['si:base44', 'si:bolt', 'si:lovable', 'si:bridgemind-ai']],
  ['browser automation agent logo', ['si:browserbase', 'si:stagehand']],
  ['mcp server directory logo', ['si:glama', 'si:smithery']],
  ['text to speech ai logo', ['si:cartesia']],
  ['vector database ai logo', ['si:pinecone']],
  ['ai video generator logo', ['si:runway', 'si:kling-ai', 'si:pika', 'si:luma-ai', 'si:pixverse', 'si:higgsfield', 'si:heygen', 'si:capcut', 'si:fal-ai']],
]) {
  assertIncludedResult(query, expectedIds, icons, synonyms);
  assertSemanticIncluded(query, expectedIds, semanticMap);
}

console.log('verify-supericons-logo-launch-search: ok');
