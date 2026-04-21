import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateRegistryRecord } from '../lib/si-registry/record-shape.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const libraryDir = path.join(repoRoot, 'data', 'si-registry', 'automation', 'simpleicons');
const generatedDir = path.join(repoRoot, 'data', 'si-registry', 'generated');

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const approvedRecords = await readJson(path.join(libraryDir, 'approved-records.json'));
const editorHoldQueue = await readJson(path.join(libraryDir, 'editor-hold-queue.json'));
const promotionDecisions = await readJson(path.join(libraryDir, 'promotion-decisions.json'));
const approvalSummary = await readJson(path.join(generatedDir, 'simpleicons-approval-summary.json'));

function extractDecisionIconIds(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map((entry) => (typeof entry === 'string' ? entry : entry?.icon_id))
    .filter((value) => typeof value === 'string' && value.length > 0);
}

const approvedIds = new Set();
for (const record of approvedRecords) {
  validateRegistryRecord(record);
  assert(record.source_library === 'simpleicons', `Approved record must stay in Simple Icons: ${record.icon_id}`);
  assert(record.category === 'brand_identity', `Approved Simple Icons record must stay in brand_identity: ${record.icon_id}`);
  assert(record.access_tier === 'public_open_record', `Approved Simple Icons record must be public-safe: ${record.icon_id}`);
  assert(record.projection_policy === 'future_public_record', `Approved Simple Icons record must project publicly: ${record.icon_id}`);
  assert(!('reviewer_model' in record), `Approved Simple Icons record must not expose reviewer_model: ${record.icon_id}`);
  assert(!('reviewer_reasoning_effort' in record), `Approved Simple Icons record must not expose reviewer_reasoning_effort: ${record.icon_id}`);
  assert(!approvedIds.has(record.icon_id), `Duplicate approved Simple Icons record: ${record.icon_id}`);
  approvedIds.add(record.icon_id);
}

for (const holdRecord of editorHoldQueue) {
  assert(holdRecord.icon_id.startsWith('simpleicons:'), `Hold queue item must stay in Simple Icons: ${holdRecord.icon_id}`);
}

const decisionApproveIds = Object.values(promotionDecisions.batches || {})
  .flatMap((batch) => extractDecisionIconIds(batch.approve_for_import));
const uniqueDecisionApproveIds = new Set(decisionApproveIds);

assert(uniqueDecisionApproveIds.size === approvedRecords.length, 'Approved Simple Icons records must match promotion decisions');
for (const record of approvedRecords) {
  assert(uniqueDecisionApproveIds.has(record.icon_id), `Approved Simple Icons record missing from promotion decisions: ${record.icon_id}`);
}
assert(approvalSummary.total_approved_records === approvedRecords.length, 'Simple Icons approval summary must match approved count');
assert(approvalSummary.total_editor_hold_records === editorHoldQueue.length, 'Simple Icons approval summary must match hold count');

console.log(`verify-simpleicons-approved-records: approved=${approvedRecords.length} | hold=${editorHoldQueue.length} | batches=${Object.keys(promotionDecisions.batches || {}).length}`);
