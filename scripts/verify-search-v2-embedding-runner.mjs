import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  buildEmbeddingWorkPlan,
  normalizeEmbeddingRunnerMode,
  validateEmbeddingCandidates,
} from '../lib/search-v2-embedding-plan.js';

const candidates = JSON.parse(readFileSync('data/semantic-search-v2/embedding-candidates.json', 'utf8'));
const documents = [
  { document_id: 'si:one#identity#en', document_type: 'identity', locale: 'en', content: 'Identity: One', content_hash: 'a' },
  { document_id: 'si:one#meaning#en', document_type: 'meaning', locale: 'en', content: 'Meaning: first icon', content_hash: 'b' },
  { document_id: 'si:two#identity#ja', document_type: 'identity', locale: 'ja', content: 'Identity: Two', content_hash: 'c' },
];

assert.equal(normalizeEmbeddingRunnerMode('plan'), 'plan');
assert.equal(normalizeEmbeddingRunnerMode('dry-run'), 'dry-run');
assert.throws(() => normalizeEmbeddingRunnerMode('build'), /Only plan and dry-run/);

const validated = validateEmbeddingCandidates(candidates);
assert.equal(validated.length, 5, 'shortlist should contain five candidate configurations');
assert.ok(validated.every((candidate) => candidate.dimensions <= 2000), 'all candidates should fit vector HNSW');

const plan = buildEmbeddingWorkPlan({
  documents,
  candidates: validated,
  mode: 'plan',
  batchSize: 2,
});
assert.equal(plan.mode, 'plan');
assert.equal(plan.network_allowed, false);
assert.equal(plan.document_count, 3);
assert.equal(plan.candidate_count, 5);
assert.deepEqual(plan.documents_by_locale, { en: 2, ja: 1 });
assert.ok(plan.content_fingerprint);
assert.equal('batches' in plan.candidates[0], false, 'plan mode should not enumerate batches');

const dryRun = buildEmbeddingWorkPlan({
  documents,
  candidates: validated,
  mode: 'dry-run',
  batchSize: 2,
});
assert.equal(dryRun.mode, 'dry-run');
assert.equal(dryRun.network_allowed, false);
assert.equal(dryRun.candidates[0].batch_count, 2);
assert.deepEqual(dryRun.candidates[0].sample_document_ids, ['si:one#identity#en', 'si:one#meaning#en', 'si:two#identity#ja']);
assert.deepEqual(
  buildEmbeddingWorkPlan({ documents, candidates: validated, mode: 'dry-run', batchSize: 2 }),
  dryRun,
  'dry-run output should be deterministic',
);

for (const path of [
  'lib/search-v2-embedding-plan.js',
  'scripts/search-v2-embedding-runner.mjs',
]) {
  const source = readFileSync(path, 'utf8');
  assert.doesNotMatch(source, /\bfetch\s*\(|https?:\/\/|node:(?:http|https|net)|child_process/);
}

console.log(JSON.stringify({
  status: 'ok',
  candidates: validated.map((candidate) => candidate.id),
  plan_fingerprint: plan.content_fingerprint,
  dry_run_batches_per_candidate: dryRun.candidates.map((candidate) => candidate.batch_count),
}, null, 2));
