import path from 'node:path';
import { fileURLToPath } from 'node:url';

import restartOrder from '../data/si-registry/manual-redo/restart-order.json' with { type: 'json' };

import { loadAndValidateDeterministicManualRedoSelection } from '../lib/si-registry/manual-redo-determinism.js';
import { resolveReviewPolicy, trackIdFromStage } from '../lib/si-registry/review-batch-policy.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(restartOrder.default_review_policy, 'Missing default_review_policy');
assert(
  Number.isInteger(restartOrder.default_review_policy.batch_size),
  'default_review_policy.batch_size must be an integer'
);
assert(restartOrder.default_review_policy.batch_size > 0, 'default_review_policy.batch_size must be > 0');

for (const stage of restartOrder.stages || []) {
  const policy = resolveReviewPolicy(restartOrder, trackIdFromStage(stage.stage_id));
  assert(policy.phase, `Missing review policy phase for ${stage.stage_id}`);
  assert(Number.isInteger(policy.batch_size), `Missing integer batch_size for ${stage.stage_id}`);
  assert(policy.batch_size > 0, `batch_size must be > 0 for ${stage.stage_id}`);
  assert(policy.approval_scope === 'full_batch', `Unsupported approval_scope for ${stage.stage_id}`);
}

await loadAndValidateDeterministicManualRedoSelection(
  path.join(repoRoot, 'data', 'si-registry', 'manual-redo', 'purpose-chip-batch-01-selection.json'),
  repoRoot
);

console.log('verify-redo-batch-policy: ok');
