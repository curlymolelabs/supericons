import { performance } from 'node:perf_hooks';
import { readFileSync } from 'node:fs';

import { searchIcons } from '../mcp/search.js';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function percentile(sorted, fraction) {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1);
  return sorted[index];
}

const evaluationSet = readJson('data/semantic-search-v2/evaluation-set.json');
const icons = readJson('mcp/public/icon-index.json').icons;
const synonyms = readJson('mcp/public/synonyms.json');
const cases = evaluationSet.query_groups
  .flatMap((group) => group.queries || [])
  .map((entry) => ({
    query: String(entry.query || entry.task || entry.slot || '').trim(),
    library: entry.requested_library || null,
    libraryMode: entry.library_mode || 'all',
  }))
  .filter((entry) => entry.query);

for (const entry of cases) {
  searchIcons(entry.query, icons, synonyms, {
    library: entry.library,
    libraryMode: entry.libraryMode,
    limit: 10,
  });
}

const durations = [];
const repetitions = 3;
for (let repetition = 0; repetition < repetitions; repetition += 1) {
  for (const entry of cases) {
    const startedAt = performance.now();
    searchIcons(entry.query, icons, synonyms, {
      library: entry.library,
      libraryMode: entry.libraryMode,
      limit: 10,
    });
    durations.push(performance.now() - startedAt);
  }
}

durations.sort((left, right) => left - right);
const result = {
  status: 'ok',
  environment: 'local_node_process',
  node_version: process.version,
  fixed_case_count: cases.length,
  warmup_passes: 1,
  measured_repetitions: repetitions,
  sample_count: durations.length,
  p50_ms: Number(percentile(durations, 0.5).toFixed(3)),
  p95_ms: Number(percentile(durations, 0.95).toFixed(3)),
  maximum_ms: Number(durations.at(-1).toFixed(3)),
  scope: 'in_process_deterministic_candidate_search_only',
  hosted_network_and_database_latency_included: false,
};

console.log(JSON.stringify(result, null, 2));
