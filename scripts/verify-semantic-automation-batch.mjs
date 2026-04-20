import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import publicIconIndex from '../public/icon-index.json' with { type: 'json' };

import { validateRegistryRecord } from '../lib/si-registry/record-shape.js';
import { getSemanticAutomationBatchConfig } from '../lib/si-registry/semantic-automation-config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const automationDir = path.join(repoRoot, 'data', 'si-registry', 'automation');
const generatedDir = path.join(repoRoot, 'data', 'si-registry', 'generated');

function automationPath(batchId, fileName) {
  return path.join(automationDir, batchId, fileName);
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

async function main() {
  const batchId = process.argv[2] || 'mingcute-batch-01';
  const batchConfig = getSemanticAutomationBatchConfig(batchId);
  if (!batchConfig) {
    throw new Error(`Unknown semantic automation batch: ${batchId}`);
  }

  const worklist = await readJson(automationPath(batchId, 'worklist.json'));
  const candidateRecords = await readJson(automationPath(batchId, 'candidate-records.json'));
  const reviewQueue = await readJson(automationPath(batchId, 'review-queue.json'));
  const batchSummary = await readJson(automationPath(batchId, 'summary.json'));
  const globalSummary = await readJson(generatedPath('semantic-automation-summary.json'));

  const iconIndexMap = new Map((publicIconIndex.icons || []).map((icon) => [icon.id, icon]));

  assert(worklist.length >= batchConfig.target_min, `Selected worklist must be at least ${batchConfig.target_min}`);
  assert(worklist.length <= batchConfig.target_max, `Selected worklist must be at most ${batchConfig.target_max}`);
  assert(candidateRecords.length === worklist.length, 'Candidate record count must match the worklist count');
  assert(reviewQueue.length === worklist.length, 'Review queue count must match the worklist count');
  assert(batchSummary.selected_count === worklist.length, 'Batch summary selected count must match the worklist count');
  assert(globalSummary.batch_id === batchId, 'Global semantic automation summary must point to the current batch');

  for (const worklistItem of worklist) {
    assert(worklistItem.icon_id.startsWith(`${batchConfig.library_id}:`), `Worklist item must belong to ${batchConfig.library_id}`);
    assert(iconIndexMap.has(worklistItem.source_asset_name), `Missing icon-index source asset for ${worklistItem.source_asset_name}`);
  }

  for (const candidateRecord of candidateRecords) {
    validateRegistryRecord(candidateRecord);
    assert(candidateRecord.source_library === batchConfig.library_id, `Candidate ${candidateRecord.icon_id} must stay in ${batchConfig.library_id}`);
    assert(candidateRecord.access_tier === 'private_operational_enrichment', `Candidate ${candidateRecord.icon_id} must stay private during staging`);
    assert(candidateRecord.projection_policy === 'internal_only', `Candidate ${candidateRecord.icon_id} must remain internal_only during staging`);
    assert(!('reviewer_model' in candidateRecord), `Candidate ${candidateRecord.icon_id} must not expose reviewer_model`);
    assert(!('reviewer_reasoning_effort' in candidateRecord), `Candidate ${candidateRecord.icon_id} must not expose reviewer_reasoning_effort`);
  }

  const reviewIds = new Set(reviewQueue.map((item) => item.candidate_icon_id));
  for (const candidateRecord of candidateRecords) {
    assert(reviewIds.has(candidateRecord.icon_id), `Missing review queue item for ${candidateRecord.icon_id}`);
  }

  console.log(
    `verify-semantic-automation-batch: batch=${batchId} | selected=${worklist.length} | queue=${reviewQueue.length}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
