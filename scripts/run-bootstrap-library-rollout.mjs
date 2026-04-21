import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import publicIconIndex from '../public/icon-index.json' with { type: 'json' };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const automationRoot = path.join(repoRoot, 'data', 'si-registry', 'automation');
const generatedDir = path.join(repoRoot, 'data', 'si-registry', 'generated');

function runNodeScript(scriptName, ...args) {
  execFileSync(process.execPath, [path.join(repoRoot, 'scripts', scriptName), ...args], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function readJsonOrDefault(filePath, fallbackValue) {
  try {
    return await readJson(filePath);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return fallbackValue;
    }
    throw error;
  }
}

async function getBootstrapBatchIds() {
  const entries = await fs.readdir(automationRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && /^bootstrap-batch-\d+-selection\.json$/i.test(entry.name))
    .map((entry) => entry.name.replace(/-selection\.json$/i, ''))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
}

function buildEditorBatchId(sourceBatchId) {
  const match = sourceBatchId.match(/^bootstrap-batch-(\d+)$/i);
  if (!match) throw new Error(`Cannot derive Bootstrap editor batch id from ${sourceBatchId}`);
  return `bootstrap-editor-review-batch-${match[1].padStart(2, '0')}`;
}

function buildVisualBatchId(sourceBatchId) {
  const match = sourceBatchId.match(/^bootstrap-batch-(\d+)$/i);
  if (!match) throw new Error(`Cannot derive Bootstrap visual batch id from ${sourceBatchId}`);
  return `bootstrap-visual-review-batch-${match[1].padStart(2, '0')}`;
}

async function getResolvedIds() {
  const decisions = await readJsonOrDefault(path.join(automationRoot, 'bootstrap', 'promotion-decisions.json'), {
    schema_version: '1.0.0',
    batches: {},
  });
  const resolved = new Set();
  for (const batchDecision of Object.values(decisions.batches || {})) {
    for (const key of ['approve_for_import', 'hold_for_editor_review', 'keep_as_reviewed_draft']) {
      for (const entry of batchDecision[key] || []) {
        resolved.add(typeof entry === 'string' ? entry : entry?.icon_id);
      }
    }
  }
  return resolved;
}

async function getBatchQueueState(batchId, resolvedIds) {
  const reviewQueue = await readJsonOrDefault(path.join(automationRoot, batchId, 'review-queue.json'), []);
  const readyIds = reviewQueue
    .filter((item) => item.queue_outcome === 'ready_for_editor_review' && !resolvedIds.has(item.candidate_icon_id))
    .map((item) => item.candidate_icon_id);
  const visualIds = reviewQueue
    .filter((item) => item.queue_outcome === 'needs_visual_review' && !resolvedIds.has(item.candidate_icon_id))
    .map((item) => item.candidate_icon_id);
  return { readyIds, visualIds };
}

async function getStagedBootstrapCount(batchIds) {
  let count = 0;
  for (const batchId of batchIds) {
    const worklist = await readJsonOrDefault(path.join(automationRoot, batchId, 'worklist.json'), []);
    count += worklist.length;
  }
  return count;
}

async function processExistingBatches(batchIds) {
  let didWork = false;
  const resolvedIds = await getResolvedIds();

  for (const batchId of batchIds) {
    const { readyIds, visualIds } = await getBatchQueueState(batchId, resolvedIds);
    if (readyIds.length > 0) {
      runNodeScript('build-bootstrap-editor-review-batch.mjs', buildEditorBatchId(batchId), batchId);
      didWork = true;
    }
    if (visualIds.length > 0) {
      runNodeScript('build-bootstrap-visual-review-batch.mjs', buildVisualBatchId(batchId), batchId);
      didWork = true;
    }
  }

  if (didWork) {
    runNodeScript('build-bootstrap-approved-records.mjs');
  }

  return didWork;
}

async function stageNextBatch() {
  const beforeBatchIds = await getBootstrapBatchIds();
  const beforeSet = new Set(beforeBatchIds);
  runNodeScript('build-next-bootstrap-batch-selection.mjs');
  const afterBatchIds = await getBootstrapBatchIds();
  const createdBatchId = afterBatchIds.find((batchId) => !beforeSet.has(batchId)) || null;

  if (!createdBatchId) {
    return null;
  }

  runNodeScript('build-semantic-automation-batch.mjs', createdBatchId);
  runNodeScript('verify-semantic-automation-batch.mjs', createdBatchId);
  return createdBatchId;
}

async function main() {
  const bootstrapTotal = (publicIconIndex.icons || []).filter((icon) => icon.lib === 'bootstrap').length;
  let iterations = 0;

  while (iterations < 400) {
    iterations += 1;
    const batchIds = await getBootstrapBatchIds();
    const processed = await processExistingBatches(batchIds);
    if (processed) {
      continue;
    }

    const stagedCount = await getStagedBootstrapCount(batchIds);
    if (stagedCount >= bootstrapTotal) {
      break;
    }

    const createdBatchId = await stageNextBatch();
    if (!createdBatchId) {
      break;
    }
  }

  runNodeScript('build-bootstrap-approved-records.mjs');
  runNodeScript('build-si-registry-projections.mjs');
  runNodeScript('verify-bootstrap-approved-records.mjs');
  runNodeScript('verify-si-registry-projections.mjs');

  const approvalSummary = await readJson(path.join(generatedDir, 'bootstrap-approval-summary.json'));
  const registrySummary = await readJson(path.join(generatedDir, 'registry-summary.json'));

  console.log(
    `run-bootstrap-library-rollout: approved=${approvalSummary.total_approved_records} | hold=${approvalSummary.total_editor_hold_records} | draft=${approvalSummary.total_reviewed_drafts} | public_free=${registrySummary.publicRecordCount}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
