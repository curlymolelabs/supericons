import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { searchIcons } from '../mcp/search.js';
import { buildSearchQueryFrame } from '../mcp/runtime/search-query-frame.js';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function normalize(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[_:\-]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function candidateText(icon) {
  return normalize([
    icon.lib,
    icon.id,
    icon.name,
    icon.meaning,
    ...(icon.semanticTags || []),
    ...(icon.synonyms || []),
    ...(icon.aliases || []),
    ...(icon.searchTerms || []),
  ].filter(Boolean).join(' '));
}

function candidateMatchesConcept(icon, concepts) {
  const text = ` ${candidateText(icon)} `;
  return concepts.some((concept) => {
    const normalized = normalize(concept);
    if (!normalized) return false;
    return normalized.split(' ').every((token) => text.includes(` ${token} `));
  });
}

const coverage = readJson('data/search-intent-graph/coverage-groups.json');
const icons = readJson('mcp/public/icon-index.json').icons;
const synonyms = readJson('mcp/public/synonyms.json');
const failures = [];
const observations = [];
const localeTotals = {};
const requestedScope = String(
  process.argv.find((argument) => argument.startsWith('--scope='))?.slice('--scope='.length)
  || 'all',
).trim();
const verbose = process.argv.includes('--verbose');
const includeEnglish = requestedScope === 'all' || requestedScope === 'en';
let englishCases = 0;
let localizedCases = 0;

assert.equal(coverage.version, 1);
assert.ok(Array.isArray(coverage.groups));

for (const group of coverage.groups) {
  const concepts = group.positive_concepts || [];
  assert.ok(concepts.length > 0, `${group.id} must include positive_concepts`);

  for (const query of group.phrases || []) {
    const frame = buildSearchQueryFrame(query);
    if (!frame.meaning_groups.includes(group.id)) {
      failures.push(`${group.id}:${query}: query frame did not select the coverage group`);
    }
  }

  for (const query of includeEnglish ? (group.evaluation_queries || []) : []) {
    englishCases += 1;
    const strictRelevance = (group.phrases || []).includes(query);
    const results = searchIcons(query, icons, synonyms, {
      libraryMode: 'all',
      limit: 5,
    });
    const relevant = results.slice(0, 3).filter((icon) => candidateMatchesConcept(icon, [...concepts, query]));
    const minimumResults = strictRelevance ? 3 : 1;
    if (results.length < minimumResults) {
      failures.push(`${group.id}:${query}: expected at least ${minimumResults} results, received ${results.length}`);
    }
    if (strictRelevance && relevant.length < Math.min(2, results.length)) {
      failures.push(`${group.id}:${query}: fewer than 2 relevant results in top 3: ${results.slice(0, 3).map((icon) => `${icon.lib}:${icon.id}`).join(', ')}`);
    }
    observations.push({
      group: group.id,
      query,
      locale: 'en',
      count: results.length,
      relevant_top_3: relevant.length,
      top_refs: results.slice(0, 3).map((icon) => `${icon.lib}:${icon.id}`),
    });
  }

  for (const [locale, phrases] of Object.entries(group.localized_phrases || {})) {
    if (requestedScope !== 'all' && requestedScope !== locale) continue;
    localeTotals[locale] ||= { cases: 0, passed: 0 };
    for (const query of phrases) {
      localizedCases += 1;
      localeTotals[locale].cases += 1;
      const frame = buildSearchQueryFrame(query, { locale });
      const results = searchIcons(query, icons, synonyms, {
        locale,
        libraryMode: 'all',
        limit: 5,
      });
      const relevant = results.slice(0, 3).filter((icon) => candidateMatchesConcept(icon, concepts));
      const passed = frame.meaning_groups.includes(group.id)
        && results.length >= 3
        && relevant.length >= 2;
      if (!passed) {
        failures.push(`${group.id}:${locale}:${query}: frame=${frame.meaning_groups.join(',') || 'none'}, results=${results.slice(0, 3).map((icon) => `${icon.lib}:${icon.id}`).join(', ') || 'none'}, relevant=${relevant.length}`);
      } else {
        localeTotals[locale].passed += 1;
      }
      observations.push({
        group: group.id,
        query,
        locale,
        count: results.length,
        relevant_top_3: relevant.length,
        top_refs: results.slice(0, 3).map((icon) => `${icon.lib}:${icon.id}`),
      });
    }
  }
}

for (const query of includeEnglish ? (coverage.honest_no_result_queries || []) : []) {
  const results = searchIcons(query, icons, synonyms, {
    libraryMode: 'all',
    limit: 5,
  });
  if (results.length !== 0) {
    failures.push(`honest-no-result:${query}: expected zero results, received ${results.map((icon) => `${icon.lib}:${icon.id}`).join(', ')}`);
  }
}

if (failures.length > 0) {
  console.error('verify-search-v2-semantic-coverage: failed');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(JSON.stringify({
    english_cases: englishCases,
    localized_cases: localizedCases,
    locale_totals: localeTotals,
    failure_count: failures.length,
  }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: 'ok',
  english_cases: englishCases,
  localized_cases: localizedCases,
  locale_totals: localeTotals,
  honest_no_result_cases: includeEnglish ? (coverage.honest_no_result_queries || []).length : 0,
  scope: requestedScope,
  ...(verbose ? { observations } : {}),
}, null, 2));
