import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import publicIconIndex from '../public/icon-index.json' with { type: 'json' };
import registryManifest from '../data/si-registry/registry-manifest.json' with { type: 'json' };

import { getSemanticAutomationBatchConfig } from '../lib/si-registry/semantic-automation-config.js';
import { buildSemanticAutomationBatchArtifacts } from '../lib/si-registry/semantic-automation.js';

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

async function readJsonOrDefault(filePath, fallbackValue) {
  try {
    return await readJson(filePath);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return fallbackValue;
    }
    throw error;
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function readApprovedReferenceRecords() {
  const freeGroups = (registryManifest.recordGroups || []).filter((group) => group.sourceGroup === 'free');
  const groups = await Promise.all(
    freeGroups.map(async (group) => {
      const absolutePath = path.join(repoRoot, 'data', 'si-registry', group.path);
      const records = await readJsonOrDefault(absolutePath, []);
      return Array.isArray(records) ? records : [];
    })
  );
  return groups.flat();
}

async function readExcludedIconIds(batchConfig) {
  const excluded = new Set(batchConfig.exclude_icon_ids || []);
  for (const priorBatchId of batchConfig.exclude_automation_batches || []) {
    const priorWorklist = await readJsonOrDefault(automationPath(priorBatchId, 'worklist.json'), []);
    for (const item of priorWorklist) {
      if (item?.icon_id) {
        excluded.add(item.icon_id);
      }
    }
  }
  return [...excluded];
}

async function main() {
  const batchId = process.argv[2] || 'mingcute-batch-01';
  const batchConfig = await getSemanticAutomationBatchConfig(batchId);

  if (!batchConfig) {
    throw new Error(`Unknown semantic automation batch: ${batchId}`);
  }

  const approvedRecords = await readApprovedReferenceRecords();
  const excludedIconIds = await readExcludedIconIds(batchConfig);
  const artifacts = buildSemanticAutomationBatchArtifacts({
    iconIndexEntries: publicIconIndex.icons || [],
    approvedRecords,
    batchConfig,
    excludedIconIds,
  });

  const batchSummary = {
    ...artifacts.summary,
    worklist_path: path.relative(repoRoot, automationPath(batchId, 'worklist.json')).replaceAll('\\', '/'),
    candidate_record_path: path.relative(repoRoot, automationPath(batchId, 'candidate-records.json')).replaceAll('\\', '/'),
    review_queue_path: path.relative(repoRoot, automationPath(batchId, 'review-queue.json')).replaceAll('\\', '/'),
  };

  await writeJson(automationPath(batchId, 'worklist.json'), artifacts.worklist);
  await writeJson(automationPath(batchId, 'candidate-records.json'), artifacts.candidateRecords);
  await writeJson(automationPath(batchId, 'review-queue.json'), artifacts.reviewQueue);
  await writeJson(automationPath(batchId, 'summary.json'), batchSummary);
  await writeJson(generatedPath('semantic-automation-summary.json'), batchSummary);

  console.log(
    `build-semantic-automation-batch: batch=${batchId} | selected=${artifacts.summary.selected_count} | references=${artifacts.summary.reference_match_count}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
