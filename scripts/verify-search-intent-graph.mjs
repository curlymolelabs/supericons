import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const sourcePath = resolve('data/search-intent-graph/intent-groups.json');
const fixturesPath = resolve('data/search-intent-graph/intent-fixtures.json');
const libGeneratedPath = resolve('lib/generated-search-intent-graph.js');
const mcpGeneratedPath = resolve('mcp/runtime/generated-search-intent-graph.js');
const libFramePath = resolve('lib/search-query-frame.js');
const mcpFramePath = resolve('mcp/runtime/search-query-frame.js');

const source = JSON.parse(readFileSync(sourcePath, 'utf8'));
const fixtures = JSON.parse(readFileSync(fixturesPath, 'utf8'));
const failures = [];
const runtimePaths = [
  libGeneratedPath,
  mcpGeneratedPath,
  libFramePath,
  mcpFramePath,
];
const missingRuntimePaths = runtimePaths.filter((path) => !existsSync(path));
let buildSearchQueryFrame = null;

const forbiddenFieldPatterns = [
  /reviewer/i,
  /reasoning/i,
  /prompt_notes/i,
  /workflow_trace/i,
  /private_confidence/i,
  /service_role/i,
  /secret/i,
];
const conditionalConceptPattern = /\b(?:when|unless)\b/i;

for (const path of missingRuntimePaths) {
  failures.push(`${path}: missing generated/runtime file; run npm run build:search-intent-graph`);
}

if (missingRuntimePaths.length === 0) {
  ({ buildSearchQueryFrame } = await import('../lib/search-query-frame.js'));
}

function normalize(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[_:]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hashFile(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function includesAll(actual, expected, label) {
  const normalizedActual = actual.map((value) => normalize(value));
  for (const value of expected || []) {
    const normalized = normalize(value);
    if (!actual.includes(value) && !normalizedActual.includes(normalized)) {
      failures.push(`${label}: missing "${normalized}" in ${JSON.stringify(actual)}`);
    }
  }
}

function excludesAll(actual, forbidden, label) {
  const normalizedActual = actual.map((value) => normalize(value));
  for (const value of forbidden || []) {
    const normalized = normalize(value);
    if (actual.includes(value) || normalizedActual.includes(normalized)) {
      failures.push(`${label}: forbidden "${normalized}" found in ${JSON.stringify(actual)}`);
    }
  }
}

function walkKeys(value, path = []) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkKeys(item, [...path, String(index)]));
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    for (const pattern of forbiddenFieldPatterns) {
      if (pattern.test(key)) {
        failures.push(`${path.concat(key).join('.')}: forbidden field name`);
      }
    }
    walkKeys(child, [...path, key]);
  }
}

assert.equal(typeof source.version, 'number', 'intent graph version must be a number');
assert.ok(Array.isArray(source.groups), 'intent graph groups must be an array');
assert.equal(typeof fixtures.version, 'number', 'intent fixtures version must be a number');
assert.ok(Array.isArray(fixtures.fixtures), 'intent fixtures must be an array');

walkKeys(source);
walkKeys(fixtures);

const groupIds = new Set();
const phraseKeys = new Set();

for (const group of source.groups) {
  const id = String(group.id || '').trim();
  if (!/^[a-z0-9_]+$/.test(id)) failures.push(`${id || '(empty)'}: group id must be snake_case`);
  if (groupIds.has(id)) failures.push(`${id}: duplicate group id`);
  groupIds.add(id);

  for (const field of [
    'label',
    'description',
    'gap_strategy',
    'confidence_floor',
  ]) {
    if (!String(group[field] || '').trim()) failures.push(`${id}: ${field} is required`);
  }

  for (const field of [
    'domains',
    'facets',
    'intent_types',
    'phrases',
    'positive_concepts',
    'avoid_concepts',
    'fallback_terms',
    'result_families',
  ]) {
    if (!Array.isArray(group[field])) {
      failures.push(`${id}: ${field} must be an array`);
      continue;
    }
    if (['phrases', 'positive_concepts', 'result_families'].includes(field) && group[field].length === 0) {
      failures.push(`${id}: ${field} must not be empty`);
    }
    for (const value of group[field]) {
      if (!String(value || '').trim()) failures.push(`${id}: ${field} contains an empty string`);
      if (field === 'avoid_concepts' && conditionalConceptPattern.test(String(value || ''))) {
        failures.push(`${id}: ${field} "${value}" must be an atomic concept, not conditional guidance`);
      }
    }
  }

  for (const phrase of group.phrases || []) {
    const key = `en:${normalize(phrase)}`;
    if (phraseKeys.has(key)) failures.push(`${id}: duplicate phrase "${phrase}"`);
    phraseKeys.add(key);
  }

  if (group.localized_phrases !== undefined) {
    if (!group.localized_phrases || typeof group.localized_phrases !== 'object' || Array.isArray(group.localized_phrases)) {
      failures.push(`${id}: localized_phrases must be an object when present`);
    } else {
      for (const [locale, phrases] of Object.entries(group.localized_phrases)) {
        if (!Array.isArray(phrases)) {
          failures.push(`${id}: localized_phrases.${locale} must be an array`);
          continue;
        }
        for (const phrase of phrases) {
          const normalized = normalize(phrase);
          if (!normalized) failures.push(`${id}: localized phrase for ${locale} is empty`);
          const key = `${locale}:${normalized}`;
          if (phraseKeys.has(key)) failures.push(`${id}: duplicate localized phrase "${phrase}" for ${locale}`);
          phraseKeys.add(key);
        }
      }
    }
  }
}

for (const fixture of fixtures.fixtures) {
  const query = String(fixture.query || '').trim();
  if (!query) {
    failures.push('fixture has empty query');
    continue;
  }

  if (!buildSearchQueryFrame) continue;
  const frame = buildSearchQueryFrame(query);
  includesAll(frame.meaning_groups, fixture.expected_groups, query);
  includesAll(frame.intent_types, fixture.expected_intent_types, query);
  includesAll(frame.positive_concepts, fixture.expected_positive_concepts, query);
  includesAll(frame.avoid_concepts, fixture.expected_avoid_concepts, query);
  excludesAll(frame.meaning_groups, fixture.forbidden_groups, query);

  if (fixture.expected_language && frame.language !== fixture.expected_language) {
    failures.push(`${query}: expected language ${fixture.expected_language}, got ${frame.language}`);
  }
}

if (existsSync(libGeneratedPath) && existsSync(mcpGeneratedPath) && hashFile(libGeneratedPath) !== hashFile(mcpGeneratedPath)) {
  failures.push('generated intent graph files differ between lib and mcp runtime');
}

if (existsSync(libFramePath) && existsSync(mcpFramePath) && hashFile(libFramePath) !== hashFile(mcpFramePath)) {
  failures.push('query-frame runtime files differ between lib and mcp runtime');
}

if (failures.length > 0) {
  console.error('verify-search-intent-graph: failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`verify-search-intent-graph: ok (${source.groups.length} groups, ${fixtures.fixtures.length} fixtures)`);
