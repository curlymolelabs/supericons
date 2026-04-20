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

const TEMPLATE_PATH = path.join(automationRoot, 'mingcute-batch-02-selection.json');
const DEFAULT_TARGET = { target_size: 200, target_min: 180, target_max: 220 };

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
    const match = batchId.match(/^mingcute-batch-(\d+)$/);
    if (!match) return currentMax;
    return Math.max(currentMax, Number(match[1]));
  }, 0);
  return `mingcute-batch-${String(maxNumber + 1).padStart(2, '0')}`;
}

function buildFamilyCaps(targetSize, templateCaps, phaseId) {
  if (phaseId === 'full_sweep') {
    return {
      navigation_motion: targetSize,
      file_actions: targetSize,
      folder_actions: targetSize,
      search_discovery: targetSize,
      messages_mail: targetSize,
      status_security: targetSize,
      systems_ai: targetSize,
      ui_shell: targetSize,
      media_controls: targetSize,
      generic_controls: targetSize,
    };
  }

  return { ...templateCaps };
}

function buildPhaseConfigs(baseTemplate, nextBatchId, targetConfig, excludeBatchIds) {
  const common = {
    ...baseTemplate,
    batch_id: nextBatchId,
    library_id: 'mingcute',
    library_label: 'MingCute',
    exclude_automation_batches: excludeBatchIds,
    ...targetConfig,
  };

  return [
    {
      phaseId: 'high_signal',
      description: 'Continue the strongest MingCute UI-style automation pass.',
      config: {
        ...common,
        score_threshold: 2,
        exclude_tokens: [...(baseTemplate.exclude_tokens || [])],
        family_caps: buildFamilyCaps(common.target_size, baseTemplate.family_caps || {}, 'high_signal'),
      },
    },
    {
      phaseId: 'relaxed',
      description: 'Broaden MingCute coverage without yet pulling in the full long-tail sweep.',
      config: {
        ...common,
        score_threshold: 0,
        exclude_tokens: [...(baseTemplate.exclude_tokens || [])],
        family_caps: buildFamilyCaps(common.target_size, baseTemplate.family_caps || {}, 'relaxed'),
      },
    },
    {
      phaseId: 'full_sweep',
      description: 'Sweep the remaining MingCute icons, including long-tail and non-UI shapes, so the library can fully close.',
      config: {
        ...common,
        score_threshold: 0,
        exclude_tokens: [],
        family_caps: buildFamilyCaps(common.target_size, baseTemplate.family_caps || {}, 'full_sweep'),
      },
    },
  ];
}

async function main() {
  const existingBatchIds = await listSemanticAutomationBatchIds();
  const nextBatchId = getNextBatchId(existingBatchIds);
  const template = await readJson(TEMPLATE_PATH);
  const approvedRecords = await readApprovedReferenceRecords();
  const priorWorklistIds = await readPriorWorklistIds(existingBatchIds);

  const mingcuteTotal = (publicIconIndex.icons || []).filter((icon) => icon.lib === 'mingcute').length;
  const remainingCount = mingcuteTotal - priorWorklistIds.size;

  if (remainingCount <= 0) {
    console.log('build-next-mingcute-batch-selection: MingCute is already fully staged.');
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

    const selectedCount = artifacts.summary.selected_count;
    if (selectedCount >= phase.config.target_min || (phase.phaseId === 'full_sweep' && selectedCount > 0)) {
      selectedPhase = phase;
      selectedArtifacts = artifacts;
      break;
    }
  }

  if (!selectedPhase || !selectedArtifacts) {
    throw new Error(`Could not build a valid MingCute selection for ${nextBatchId}`);
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
    library_id: 'mingcute',
    library_label: 'MingCute',
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
    `build-next-mingcute-batch-selection: batch=${nextBatchId} | phase=${selectedPhase.phaseId} | selected=${selectedArtifacts.summary.selected_count} | remaining=${remainingCount}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
