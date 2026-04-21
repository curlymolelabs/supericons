import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import publicIconIndex from '../public/icon-index.json' with { type: 'json' };
import registryManifest from '../data/si-registry/registry-manifest.json' with { type: 'json' };

import { listSemanticAutomationBatchIds } from '../lib/si-registry/semantic-automation-config.js';
import { buildSemanticAutomationBatchArtifacts } from '../lib/si-registry/semantic-automation.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const automationRoot = path.join(repoRoot, 'data', 'si-registry', 'automation');

const TEMPLATE_PATH = path.join(automationRoot, 'lucide-batch-01-selection.json');
const DEFAULT_TARGET = { target_size: 220, target_min: 180, target_max: 300 };

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

function getLucideBatchIds(batchIds) {
  return batchIds.filter((batchId) => /^lucide-batch-\d+$/i.test(batchId));
}

async function readPriorWorklistIds(batchIds) {
  const ids = new Set();
  for (const batchId of batchIds) {
    const worklist = await readJsonOrDefault(path.join(automationRoot, batchId, 'worklist.json'), []);
    for (const item of worklist) {
      if (item?.icon_id) {
        ids.add(item.icon_id);
      }
    }
  }
  return ids;
}

function getNextBatchId(batchIds) {
  const maxNumber = batchIds.reduce((currentMax, batchId) => {
    const match = batchId.match(/^lucide-batch-(\d+)$/i);
    if (!match) {
      return currentMax;
    }
    return Math.max(currentMax, Number(match[1]));
  }, 0);
  return `lucide-batch-${String(maxNumber + 1).padStart(2, '0')}`;
}

function buildPhaseConfigs(template, nextBatchId, targetConfig, excludeBatchIds) {
  const common = {
    ...template,
    batch_id: nextBatchId,
    library_id: 'lucide',
    library_label: 'Lucide',
    exclude_automation_batches: excludeBatchIds,
    ...targetConfig,
  };

  return [
    {
      phaseId: 'high_signal',
      description: 'Continue the Lucide rollout with the strongest remaining UI and product-control icons.',
      config: {
        ...common,
        score_threshold: 2,
        exclude_tokens: [...(template.exclude_tokens || [])],
        family_caps: { ...(template.family_caps || {}) },
      },
    },
    {
      phaseId: 'relaxed',
      description: 'Broaden Lucide coverage while still avoiding the obviously decorative long-tail shapes.',
      config: {
        ...common,
        score_threshold: 0,
        exclude_tokens: [...(template.exclude_tokens || [])],
        family_caps: { ...(template.family_caps || {}) },
      },
    },
    {
      phaseId: 'full_sweep',
      description: 'Sweep the remaining Lucide library so the rollout can fully close.',
      config: {
        ...common,
        score_threshold: -10,
        exclude_tokens: [],
        family_caps: {},
      },
    },
  ];
}

async function main() {
  const existingBatchIds = getLucideBatchIds(await listSemanticAutomationBatchIds());
  const nextBatchId = getNextBatchId(existingBatchIds);
  const template = await readJson(TEMPLATE_PATH);
  const approvedRecords = await readApprovedReferenceRecords();
  const priorWorklistIds = await readPriorWorklistIds(existingBatchIds);

  const lucideTotal = (publicIconIndex.icons || []).filter((icon) => icon.lib === 'lucide').length;
  const remainingCount = lucideTotal - priorWorklistIds.size;

  if (remainingCount <= 0) {
    console.log('build-next-lucide-batch-selection: Lucide is already fully staged.');
    return;
  }

  const targetConfig = remainingCount < DEFAULT_TARGET.target_min
    ? {
        target_size: remainingCount,
        target_min: remainingCount,
        target_max: remainingCount,
      }
    : { ...DEFAULT_TARGET };

  const phaseConfigs = buildPhaseConfigs(template, nextBatchId, targetConfig, existingBatchIds);
  let selectedPhase = null;
  let selectedArtifacts = null;

  for (const phase of phaseConfigs) {
    const artifacts = buildSemanticAutomationBatchArtifacts({
      iconIndexEntries: publicIconIndex.icons || [],
      approvedRecords,
      batchConfig: phase.config,
      excludedIconIds: [...priorWorklistIds],
    });

    if (artifacts.summary.selected_count >= phase.config.target_min || (phase.phaseId === 'full_sweep' && artifacts.summary.selected_count > 0)) {
      selectedPhase = phase;
      selectedArtifacts = artifacts;
      break;
    }
  }

  if (!selectedPhase || !selectedArtifacts) {
    throw new Error(`Could not build a valid Lucide selection for ${nextBatchId}`);
  }

  const actualSelectedCount = selectedArtifacts.summary.selected_count;
  const normalizedTargetConfig = actualSelectedCount < selectedPhase.config.target_min
    ? {
        target_size: actualSelectedCount,
        target_min: actualSelectedCount,
        target_max: actualSelectedCount,
      }
    : {
        target_size: selectedPhase.config.target_size,
        target_min: selectedPhase.config.target_min,
        target_max: selectedPhase.config.target_max,
      };

  const selection = {
    schema_version: '1.0.0',
    batch_id: nextBatchId,
    library_id: 'lucide',
    library_label: 'Lucide',
    target_size: normalizedTargetConfig.target_size,
    target_min: normalizedTargetConfig.target_min,
    target_max: normalizedTargetConfig.target_max,
    score_threshold: selectedPhase.config.score_threshold,
    phase_id: selectedPhase.phaseId,
    phase_description: selectedPhase.description,
    exclude_automation_batches: existingBatchIds,
    core_tokens: selectedPhase.config.core_tokens,
    boost_tokens: selectedPhase.config.boost_tokens,
    exclude_tokens: selectedPhase.config.exclude_tokens,
    family_caps: selectedPhase.config.family_caps,
    preview_selected_count: selectedArtifacts.summary.selected_count,
    preview_queue_counts: selectedArtifacts.summary.review_queue_counts,
  };

  const selectionPath = path.join(automationRoot, `${nextBatchId}-selection.json`);
  await writeJson(selectionPath, selection);

  console.log(
    `build-next-lucide-batch-selection: batch=${nextBatchId} | phase=${selectedPhase.phaseId} | selected=${selectedArtifacts.summary.selected_count} | remaining=${remainingCount}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
