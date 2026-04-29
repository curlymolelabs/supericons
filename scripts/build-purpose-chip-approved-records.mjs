import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildEditorHoldQueueRecord, normalizeReviewedRecordToApprovedRecord } from '../lib/si-registry/purpose-chip-approved-records.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const pilotDir = path.join(repoRoot, 'data', 'si-registry', 'pilot', 'purpose-chip');
const generatedDir = path.join(repoRoot, 'data', 'si-registry', 'generated');

function pilotPath(fileName) {
  return path.join(pilotDir, fileName);
}

function generatedPath(fileName) {
  return path.join(generatedDir, fileName);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function countBy(values, selector) {
  return values.reduce((counts, value) => {
    const key = selector(value);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function getDecisionEntries(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => (typeof entry === 'string' ? { icon_id: entry } : entry));
}

const decisions = await readJson(pilotPath('promotion-decisions.json'));

const approvedRecords = [];
const editorHoldQueue = [];
const draftRecords = [];
const seenApproved = new Set();
const seenHold = new Set();
const seenDraft = new Set();
const batchSummaries = {};

for (const [batchId, batchDecision] of Object.entries(decisions.batches || {})) {
  const reviewedBatch = await readJson(pilotPath(`${batchId}-reviewed-records.json`));
  const reviewedById = new Map((reviewedBatch.reviewed_records || []).map((record) => [record.icon_id, record]));

  const approveEntries = getDecisionEntries(batchDecision.approve_for_import);
  const holdEntries = getDecisionEntries(batchDecision.hold_for_editor_review);
  const draftEntries = getDecisionEntries(batchDecision.keep_as_reviewed_draft);

  for (const entry of approveEntries) {
    const reviewedRecord = reviewedById.get(entry.icon_id);
    if (!reviewedRecord) {
      throw new Error(`Missing reviewed record for approved icon ${entry.icon_id} in ${batchId}`);
    }
    if (seenApproved.has(entry.icon_id)) {
      throw new Error(`Duplicate approved icon id: ${entry.icon_id}`);
    }
    approvedRecords.push(normalizeReviewedRecordToApprovedRecord(reviewedRecord));
    seenApproved.add(entry.icon_id);
  }

  for (const entry of holdEntries) {
    const reviewedRecord = reviewedById.get(entry.icon_id);
    if (!reviewedRecord) {
      throw new Error(`Missing reviewed record for hold icon ${entry.icon_id} in ${batchId}`);
    }
    if (seenHold.has(entry.icon_id)) {
      throw new Error(`Duplicate hold icon id: ${entry.icon_id}`);
    }
    editorHoldQueue.push(buildEditorHoldQueueRecord(reviewedRecord, batchId, entry.note || 'Needs tighter editor framing before approval.'));
    seenHold.add(entry.icon_id);
  }

  for (const entry of draftEntries) {
    const reviewedRecord = reviewedById.get(entry.icon_id);
    if (!reviewedRecord) {
      throw new Error(`Missing reviewed record for draft icon ${entry.icon_id} in ${batchId}`);
    }
    if (seenDraft.has(entry.icon_id)) {
      throw new Error(`Duplicate draft icon id: ${entry.icon_id}`);
    }
    draftRecords.push({
      batch_id: batchId,
      icon_id: reviewedRecord.icon_id,
      label: reviewedRecord.label,
      category: reviewedRecord.category,
      routing_score: reviewedRecord.routing_score,
      why_not_imported_yet: entry.note || 'Still too context-sensitive for approval.',
    });
    seenDraft.add(entry.icon_id);
  }

  batchSummaries[batchId] = {
    approve_for_import: approveEntries.length,
    hold_for_editor_review: holdEntries.length,
    keep_as_reviewed_draft: draftEntries.length,
  };
}

approvedRecords.sort((a, b) => a.icon_id.localeCompare(b.icon_id));
editorHoldQueue.sort((a, b) => a.icon_id.localeCompare(b.icon_id));
draftRecords.sort((a, b) => a.icon_id.localeCompare(b.icon_id));

const approvalSummary = {
  schema_version: '1.0.0',
  total_approved_records: approvedRecords.length,
  total_editor_hold_records: editorHoldQueue.length,
  total_reviewed_drafts: draftRecords.length,
  approved_by_category: countBy(approvedRecords, (record) => record.category),
  batch_summaries: batchSummaries,
  approved_record_path: 'data/si-registry/pilot/purpose-chip/approved-records.json',
  editor_hold_queue_path: 'data/si-registry/pilot/purpose-chip/editor-hold-queue.json',
};

await writeJson(pilotPath('approved-records.json'), approvedRecords);
await writeJson(pilotPath('editor-hold-queue.json'), editorHoldQueue);
await writeJson(generatedPath('purpose-chip-approval-summary.json'), approvalSummary);

console.log(
  `build-purpose-chip-approved-records: approved=${approvedRecords.length}, hold=${editorHoldQueue.length}, draft=${draftRecords.length}`
);
