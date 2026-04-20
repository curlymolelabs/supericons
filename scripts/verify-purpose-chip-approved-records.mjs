import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateRegistryRecord } from '../lib/si-registry/record-shape.js';

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

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function getDecisionEntries(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((entry) => (typeof entry === 'string' ? { icon_id: entry } : entry));
}

const decisions = await readJson(pilotPath('promotion-decisions.json'));
const approvedRecords = await readJson(pilotPath('approved-records.json'));
const editorHoldQueue = await readJson(pilotPath('editor-hold-queue.json'));
const summary = await readJson(generatedPath('purpose-chip-approval-summary.json'));

const expectedApprovedIds = [];
const expectedHoldIds = [];

for (const batchDecision of Object.values(decisions.batches || {})) {
  expectedApprovedIds.push(...getDecisionEntries(batchDecision.approve_for_import).map((entry) => entry.icon_id));
  expectedHoldIds.push(...getDecisionEntries(batchDecision.hold_for_editor_review).map((entry) => entry.icon_id));
}

const approvedIds = approvedRecords.map((record) => record.icon_id);
const holdIds = editorHoldQueue.map((record) => record.icon_id);

assert(new Set(approvedIds).size === approvedIds.length, 'Approved records must have unique icon ids');
assert(new Set(holdIds).size === holdIds.length, 'Editor hold queue must have unique icon ids');
assert(approvedIds.length === expectedApprovedIds.length, 'Approved record count must match promotion decisions');
assert(holdIds.length === expectedHoldIds.length, 'Editor hold queue count must match promotion decisions');

for (const iconId of expectedApprovedIds) {
  assert(approvedIds.includes(iconId), `Missing approved record for ${iconId}`);
}

for (const iconId of expectedHoldIds) {
  assert(holdIds.includes(iconId), `Missing editor hold queue record for ${iconId}`);
}

for (const record of approvedRecords) {
  validateRegistryRecord(record);
  assert(record.source_group === 'free', `Approved record ${record.icon_id} must stay in free source_group`);
  assert(record.access_tier === 'public_open_record', `Approved record ${record.icon_id} must be public_open_record`);
  assert(record.projection_policy === 'future_public_record', `Approved record ${record.icon_id} must be future_public_record`);
  assert(!('editorialNotes' in record), `Approved record ${record.icon_id} must not expose editorialNotes`);
  assert(!('internalSignals' in record), `Approved record ${record.icon_id} must not expose internalSignals`);
}

for (const item of editorHoldQueue) {
  assert(typeof item.why_not_approved_yet === 'string' && item.why_not_approved_yet.length > 0, `Editor hold item ${item.icon_id} must explain why it is not approved yet`);
}

assert(summary.total_approved_records === approvedRecords.length, 'Approval summary approved count must match approved records');
assert(summary.total_editor_hold_records === editorHoldQueue.length, 'Approval summary hold count must match editor hold queue');

console.log(
  `verify-purpose-chip-approved-records: approved=${approvedRecords.length} | hold=${editorHoldQueue.length} | batches=${Object.keys(decisions.batches || {}).length}`
);
