import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

import { searchIcons } from '../mcp/search.js';

const icons = JSON.parse(readFileSync('mcp/public/icon-index.json', 'utf8')).icons;
const synonyms = JSON.parse(readFileSync('mcp/public/synonyms.json', 'utf8'));
const cases = [
  { query: 'amazing', locale: null },
  { query: 'sports', locale: null },
  { query: 'danger and risk', locale: null },
  { query: 'application settings', locale: null },
  { query: 'スポーツ', locale: 'ja' },
  { query: '素晴らしい', locale: 'ja' },
  { query: 'deportes', locale: 'es' },
  { query: '体育运动', locale: 'zh-Hans' },
  { query: 'esporte', locale: 'pt' },
  { query: 'florblequux', locale: null, expectedCount: 0 },
];

function runCase(searchCase) {
  const startedAt = performance.now();
  const results = searchIcons(searchCase.query, icons, synonyms, {
    locale: searchCase.locale,
    libraryMode: 'all',
    limit: 5,
  });
  const latencyMs = performance.now() - startedAt;
  const expectedCount = searchCase.expectedCount ?? 1;
  if (expectedCount === 0) {
    assert.equal(results.length, 0, `${searchCase.query} must remain an honest no-result.`);
  } else {
    assert.ok(results.length >= expectedCount, `${searchCase.query} returned no results.`);
  }
  return {
    query: searchCase.query,
    locale: searchCase.locale || 'en',
    latency_ms: Number(latencyMs.toFixed(1)),
    top_ref: results[0] ? `${results[0].lib}:${results[0].id}` : null,
  };
}

const cold = runCase(cases[0]);
const samples = [];
for (let round = 0; round < 3; round += 1) {
  for (const searchCase of cases) samples.push(runCase(searchCase));
}

const sorted = samples.map((sample) => sample.latency_ms).sort((a, b) => a - b);
const p95 = sorted[Math.ceil(sorted.length * 0.95) - 1];
assert.ok(cold.latency_ms <= 1_000, `First semantic search took ${cold.latency_ms} ms, above 1000 ms.`);
assert.ok(p95 <= 500, `Local semantic search p95 was ${p95} ms, above 500 ms.`);

console.log(JSON.stringify({
  status: 'ok',
  icon_count: icons.length,
  cold_first_search: cold,
  sample_count: samples.length,
  p95_latency_ms: p95,
  slowest: [...samples].sort((a, b) => b.latency_ms - a.latency_ms).slice(0, 5),
}, null, 2));
