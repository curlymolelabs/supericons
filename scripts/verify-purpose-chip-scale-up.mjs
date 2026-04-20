import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateRegistryRecord } from '../lib/si-registry/record-shape.js';
import { SCALE_UP_NEXT_STEPS, getPurposeChipHandledStateMap } from '../lib/si-registry/purpose-chip-scale-up.js';

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

const worklist = await readJson(pilotPath('worklist.json'));
const approvedRecords = await readJson(pilotPath('approved-records.json'));
const editorHoldQueue = await readJson(pilotPath('editor-hold-queue.json'));
const promotionDecisions = await readJson(pilotPath('promotion-decisions.json'));
const stagedRecords = await readJson(pilotPath('automation-staged-records.json'));
const nextSteps = await readJson(pilotPath('automation-next-steps.json'));
const scaleUpSummary = await readJson(generatedPath('purpose-chip-scale-up-summary.json'));
const fullCoverageSummary = await readJson(generatedPath('purpose-chip-full-coverage-summary.json'));

const handledStateMap = getPurposeChipHandledStateMap({
  approvedRecords,
  editorHoldQueue,
  promotionDecisions,
});

const handledIds = new Set(handledStateMap.keys());
const stagedIds = stagedRecords.map((record) => record.icon_id);
const nextStepIds = nextSteps.map((entry) => entry.icon_id);
const worklistIds = new Set(worklist.map((item) => item.icon_id));

assert(new Set(stagedIds).size === stagedIds.length, 'Automation staged records must have unique icon ids');
assert(new Set(nextStepIds).size === nextStepIds.length, 'Automation next-step entries must have unique icon ids');
assert(stagedIds.length === nextStepIds.length, 'Staged record count must match next-step count');

for (const record of stagedRecords) {
  validateRegistryRecord(record);
  assert(record.status === 'draft', `Staged record ${record.icon_id} must stay draft`);
  assert(record.access_tier === 'private_operational_enrichment', `Staged record ${record.icon_id} must stay private_operational_enrichment`);
  assert(record.projection_policy === 'internal_only', `Staged record ${record.icon_id} must stay internal_only`);
  assert(!handledIds.has(record.icon_id), `Staged record ${record.icon_id} must not overlap with handled ids`);
  assert(worklistIds.has(record.icon_id), `Staged record ${record.icon_id} must belong to the 150-icon worklist`);
}

for (const entry of nextSteps) {
  assert(SCALE_UP_NEXT_STEPS.includes(entry.next_step), `Invalid next step for ${entry.icon_id}: ${entry.next_step}`);
  assert(stagedIds.includes(entry.icon_id), `Next-step entry ${entry.icon_id} must point to a staged record`);
}

assert(fullCoverageSummary.total_icons === worklist.length, 'Full coverage summary total_icons must match worklist');
assert(fullCoverageSummary.state_counts.approved === approvedRecords.length, 'Full coverage summary approved count must match approved records');
assert(fullCoverageSummary.state_counts.editor_hold === editorHoldQueue.length, 'Full coverage summary hold count must match hold queue');
assert(fullCoverageSummary.state_counts.automation_staged === stagedRecords.length, 'Full coverage summary staged count must match staged records');

const expectedReviewedDraftCount = [...handledStateMap.values()].filter((value) => value === 'reviewed_draft').length;
assert(fullCoverageSummary.state_counts.reviewed_draft === expectedReviewedDraftCount, 'Full coverage summary reviewed_draft count must match handled map');

const summedCoverage = Object.values(fullCoverageSummary.state_counts).reduce((total, value) => total + value, 0);
assert(summedCoverage === worklist.length, 'Coverage state counts must add up to the 150-icon worklist');

assert(scaleUpSummary.total_remaining_icons === stagedRecords.length, 'Scale-up summary remaining count must match staged records');

console.log(
  `verify-purpose-chip-scale-up: staged=${stagedRecords.length} | approved=${approvedRecords.length} | hold=${editorHoldQueue.length} | coverage=${worklist.length}`
);
