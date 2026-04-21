import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateRegistryRecord } from '../lib/si-registry/record-shape.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const libraryDir = path.join(repoRoot, 'data', 'si-registry', 'automation', 'bootstrap');
const generatedDir = path.join(repoRoot, 'data', 'si-registry', 'generated');
const overlapSourcePaths = [
  path.join(repoRoot, 'data', 'si-registry', 'records', 'free-pilot.json'),
  path.join(repoRoot, 'data', 'si-registry', 'pilot', 'purpose-chip', 'approved-records.json'),
  path.join(repoRoot, 'data', 'si-registry', 'automation', 'mingcute', 'approved-records.json'),
  path.join(repoRoot, 'data', 'si-registry', 'automation', 'simpleicons', 'approved-records.json'),
  path.join(repoRoot, 'data', 'si-registry', 'automation', 'lucide', 'approved-records.json'),
  path.join(repoRoot, 'data', 'si-registry', 'automation', 'tabler', 'approved-records.json'),
  path.join(repoRoot, 'data', 'si-registry', 'automation', 'phosphor', 'approved-records.json'),
  path.join(repoRoot, 'data', 'si-registry', 'automation', 'heroicons', 'approved-records.json'),
];

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function loadOverlapIds() {
  const overlapIds = new Set();
  for (const filePath of overlapSourcePaths) {
    const records = await readJson(filePath);
    for (const record of records) {
      overlapIds.add(record.icon_id);
    }
  }
  return overlapIds;
}

const approvedRecords = await readJson(path.join(libraryDir, 'approved-records.json'));
const editorHoldQueue = await readJson(path.join(libraryDir, 'editor-hold-queue.json'));
const promotionDecisions = await readJson(path.join(libraryDir, 'promotion-decisions.json'));
const approvalSummary = await readJson(path.join(generatedDir, 'bootstrap-approval-summary.json'));
const overlapIds = await loadOverlapIds();

const approvedIds = new Set();
for (const record of approvedRecords) {
  validateRegistryRecord(record);
  assert(record.source_library === 'bootstrap', `Approved record must stay in Bootstrap: ${record.icon_id}`);
  assert(record.access_tier === 'public_open_record', `Approved Bootstrap record must be public-safe: ${record.icon_id}`);
  assert(record.projection_policy === 'future_public_record', `Approved Bootstrap record must project publicly: ${record.icon_id}`);
  assert(!('reviewer_model' in record), `Approved Bootstrap record must not expose reviewer_model: ${record.icon_id}`);
  assert(!('reviewer_reasoning_effort' in record), `Approved Bootstrap record must not expose reviewer_reasoning_effort: ${record.icon_id}`);
  assert(!approvedIds.has(record.icon_id), `Duplicate approved Bootstrap record: ${record.icon_id}`);
  approvedIds.add(record.icon_id);
}

for (const holdRecord of editorHoldQueue) {
  assert(holdRecord.icon_id.startsWith('bootstrap:'), `Hold queue item must stay in Bootstrap: ${holdRecord.icon_id}`);
}

const decisionApproveIds = Object.values(promotionDecisions.batches || {})
  .flatMap((batch) => Array.isArray(batch.approve_for_import) ? batch.approve_for_import : []);
const uniqueDecisionApproveIds = new Set(decisionApproveIds.filter((iconId) => !overlapIds.has(iconId)));

assert(uniqueDecisionApproveIds.size === approvedRecords.length, 'Approved Bootstrap records must match promotion decisions');
for (const record of approvedRecords) {
  assert(uniqueDecisionApproveIds.has(record.icon_id), `Approved Bootstrap record missing from promotion decisions: ${record.icon_id}`);
}
assert(approvalSummary.total_approved_records === approvedRecords.length, 'Bootstrap approval summary must match approved count');
assert(approvalSummary.total_editor_hold_records === editorHoldQueue.length, 'Bootstrap approval summary must match hold count');
assert(approvalSummary.overlap_skipped_count === decisionApproveIds.length - uniqueDecisionApproveIds.size, 'Bootstrap approval summary must match overlap-skipped count');

console.log(
  `verify-bootstrap-approved-records: approved=${approvedRecords.length} | hold=${editorHoldQueue.length} | overlap_skipped=${approvalSummary.overlap_skipped_count} | batches=${Object.keys(promotionDecisions.batches || {}).length}`
);
