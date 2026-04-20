import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateRegistryRecord } from '../lib/si-registry/record-shape.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const libraryDir = path.join(repoRoot, 'data', 'si-registry', 'automation', 'mingcute');
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
const approvalSummary = await readJson(path.join(generatedDir, 'mingcute-approval-summary.json'));

const approvedIds = new Set();
for (const record of approvedRecords) {
  validateRegistryRecord(record);
  assert(record.source_library === 'mingcute', `Approved record must stay in MingCute: ${record.icon_id}`);
  assert(record.access_tier === 'public_open_record', `Approved MingCute record must be public-safe: ${record.icon_id}`);
  assert(record.projection_policy === 'future_public_record', `Approved MingCute record must project publicly: ${record.icon_id}`);
  assert(!('reviewer_model' in record), `Approved MingCute record must not expose reviewer_model: ${record.icon_id}`);
  assert(!('reviewer_reasoning_effort' in record), `Approved MingCute record must not expose reviewer_reasoning_effort: ${record.icon_id}`);
  assert(!approvedIds.has(record.icon_id), `Duplicate approved MingCute record: ${record.icon_id}`);
  approvedIds.add(record.icon_id);
}

for (const holdRecord of editorHoldQueue) {
  assert(holdRecord.icon_id.startsWith('mingcute:'), `Hold queue item must stay in MingCute: ${holdRecord.icon_id}`);
}

const decisionApproveIds = Object.values(promotionDecisions.batches || {})
  .flatMap((batch) => Array.isArray(batch.approve_for_import) ? batch.approve_for_import : []);
const uniqueDecisionApproveIds = new Set(decisionApproveIds);

assert(uniqueDecisionApproveIds.size === approvedRecords.length, 'Approved MingCute records must match promotion decisions');
for (const record of approvedRecords) {
  assert(uniqueDecisionApproveIds.has(record.icon_id), `Approved MingCute record missing from promotion decisions: ${record.icon_id}`);
}
assert(approvalSummary.total_approved_records === approvedRecords.length, 'MingCute approval summary must match approved count');
assert(approvalSummary.total_editor_hold_records === editorHoldQueue.length, 'MingCute approval summary must match hold count');

console.log(
  `verify-mingcute-approved-records: approved=${approvedRecords.length} | hold=${editorHoldQueue.length} | batches=${Object.keys(promotionDecisions.batches || {}).length}`
);
