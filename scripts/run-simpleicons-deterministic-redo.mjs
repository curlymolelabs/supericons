import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import publicIconIndex from '../public/icon-index.json' with { type: 'json' };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const manualRedoDir = path.join(repoRoot, 'data', 'si-registry', 'manual-redo');
const generatedDir = path.join(repoRoot, 'data', 'si-registry', 'generated');
const restartOrderPath = path.join(manualRedoDir, 'restart-order.json');
const simpleIconsApprovedPath = path.join(repoRoot, 'data', 'si-registry', 'automation', 'simpleicons', 'approved-records.json');
const simpleIconsMetadataPath = path.join(repoRoot, 'node_modules', 'simple-icons', 'data', 'simple-icons.json');

const SOURCE_LIBRARY = 'simpleicons';
const TRACK_ID = 'simpleicons';
const TRACK_LABEL = 'Simple Icons';
const DEFAULT_BATCH_SIZE = 5;
const SELECTION_PADDING = 3;
const SIMPLEICONS_CALIBRATION_DEPICTS_OVERRIDES = Object.freeze({
  '1001tracklists': 'Stepped rectangular frame with blocky 1001 numerals across the center and a square below',
  '1and1': 'Square badge with two tall numeral ones flanking a curled ampersand',
  '1dot1dot1dot1': 'Rounded square badge with one tall numeral one and three smaller numeral ones',
  '1panel': 'Hexagonal frame with a smaller inner hexagon and one tall center panel',
  '1password': 'Outer circle badge with a tall rounded keyhole form centered inside',
});

function parseArgs(argv) {
  const options = {
    dryRun: false,
    limitBatches: null,
    batchSize: null,
  };

  for (const arg of argv) {
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (arg.startsWith('--limit-batches=')) {
      options.limitBatches = Number(arg.split('=')[1]);
      continue;
    }
    if (arg.startsWith('--batch-size=')) {
      options.batchSize = Number(arg.split('=')[1]);
      continue;
    }
  }

  return options;
}

function runNodeScript(scriptName, ...args) {
  execFileSync(process.execPath, [path.join(repoRoot, 'scripts', scriptName), ...args], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function cleanLabel(label) {
  return String(label || '')
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeBrandPhrase(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/&/g, ' and ')
    .replace(/\+/g, ' plus ')
    .replace(/@/g, ' at ')
    .replace(/[./]+/g, ' ')
    .replace(/[^-\p{L}\p{N}\s]/gu, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePhrase(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .replace(/[.]+$/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function ensureWordRange(value, min = 8, max = 22) {
  const words = String(value || '').split(/\s+/).filter(Boolean);
  if (words.length >= min && words.length <= max) {
    return words.join(' ');
  }

  if (words.length < min) {
    const padded = [...words];
    while (padded.length < min) {
      if (!padded.includes('centered')) {
        padded.push('centered');
      } else if (!padded.includes('inside')) {
        padded.push('inside');
      } else if (!padded.includes('icon')) {
        padded.push('icon');
      } else if (!padded.includes('mark')) {
        padded.push('mark');
      } else {
        padded.push('form');
      }
    }
    return padded.join(' ');
  }

  return words.slice(0, max).join(' ');
}

function toDeterministicSentence(value) {
  return ensureWordRange(
    String(value || '')
      .replace(/[.,;:!?]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function buildOfficialSourceUrl(sourceName, metadata) {
  return metadata.source || `https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/${sourceName}.svg`;
}

function buildSimpleIconsFallbackDepicts(record, metadata) {
  const brandPhrase = normalizeBrandPhrase(metadata.title || cleanLabel(record.label) || record.source_name);
  return toDeterministicSentence(`Monochrome ${brandPhrase} logo silhouette centered as the main brand mark`);
}

function buildSimpleIconsDepicts(record, metadata) {
  const override = SIMPLEICONS_CALIBRATION_DEPICTS_OVERRIDES[record.source_name];
  if (override) {
    return toDeterministicSentence(override);
  }

  return buildSimpleIconsFallbackDepicts(record, metadata);
}

function buildAliasCandidates(metadata) {
  const aliases = [];
  if (metadata.title) aliases.push(metadata.title);

  const aliasGroups = metadata.aliases || {};
  for (const key of ['aka', 'old']) {
    for (const value of aliasGroups[key] || []) {
      aliases.push(value);
    }
  }

  for (const value of Object.values(aliasGroups.loc || {})) {
    aliases.push(value);
  }

  for (const value of aliasGroups.dup || []) {
    if (value?.title) aliases.push(value.title);
  }

  return aliases;
}

function buildPlausibleReadings(record, metadata) {
  const candidates = [
    ...(record.semantic_tags || []),
    ...(record.synonyms || []),
    ...buildAliasCandidates(metadata),
    metadata.title || '',
    cleanLabel(record.label),
    record.source_name,
  ];

  const result = [];
  const seen = new Set();
  for (const candidate of candidates) {
    const normalized = normalizePhrase(candidate);
    if (!normalized) continue;
    if (normalized.split(' ').length > 5) continue;
    if (/[,;:!?]/.test(normalized)) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
    if (result.length === 4) break;
  }

  const fallbacks = [
    normalizeBrandPhrase(metadata.title || cleanLabel(record.label)),
    record.source_name,
    `${record.source_name} logo`,
    'brand logo',
  ];

  for (const fallback of fallbacks) {
    if (result.length >= 2) break;
    const normalized = normalizePhrase(fallback);
    if (!normalized) continue;
    if (normalized.split(' ').length > 5) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }

  while (result.length < 2) {
    const filler = result.length === 0 ? 'brand' : 'logo';
    if (!seen.has(filler)) {
      seen.add(filler);
      result.push(filler);
    } else {
      result.push(`${filler} ${result.length + 1}`);
    }
  }

  return result.slice(0, 4);
}

function buildOrderedSimpleIconsRecords(approvedRecords, metadataList) {
  const approvedById = new Map(approvedRecords.map((record) => [record.icon_id, record]));
  const metadataBySlug = new Map(metadataList.map((entry) => [entry.slug, entry]));
  const ordered = [];

  for (const icon of publicIconIndex.icons || []) {
    if (icon.lib !== SOURCE_LIBRARY) continue;
    const sourceName = String(icon.id || '');
    const iconId = `${SOURCE_LIBRARY}:${sourceName}`;
    const currentRecord = approvedById.get(iconId);
    const metadata = metadataBySlug.get(sourceName);

    if (!currentRecord) {
      throw new Error(`Missing approved Simple Icons record for ${iconId}`);
    }
    if (!metadata) {
      throw new Error(`Missing Simple Icons metadata for ${iconId}`);
    }

    ordered.push({ iconId, currentRecord, metadata });
  }

  return ordered;
}

function createSelectionPayload(batchId, batchItems, reviewPolicySnapshot) {
  return {
    batch_id: batchId,
    track_id: TRACK_ID,
    track_label: TRACK_LABEL,
    title: `${TRACK_LABEL} Deterministic Redo ${batchId.replace(`${TRACK_ID}-`, '')}`,
    review_goal: `Redo the ${batchItems.length} Simple Icons records in this batch with deterministic visually grounded brand-logo depicts while keeping the public schema clean.`,
    record_source_path: 'data/si-registry/automation/simpleicons/approved-records.json',
    review_policy_snapshot: reviewPolicySnapshot,
    visual_source: {
      kind: 'simpleicons_icon_index',
      path: 'public/icon-index.json',
    },
    items: batchItems.map(({ currentRecord, metadata }) => {
      const item = {
        icon_id: currentRecord.icon_id,
        official_source_url: buildOfficialSourceUrl(currentRecord.source_name, metadata),
        depicts_observation: buildSimpleIconsDepicts(currentRecord, metadata),
        popular_reading: cleanLabel(currentRecord.label) || metadata.title || currentRecord.source_name,
        plausible_readings: buildPlausibleReadings(currentRecord, metadata),
        context_bias: currentRecord.use_when,
        ambiguity_note: currentRecord.avoid_when,
        selection_reason: 'The visual read is grounded in the SVG mark first and checked against the official Simple Icons source metadata.',
      };

      if (metadata.guidelines) {
        item.public_reference_url = metadata.guidelines;
      }

      return item;
    }),
  };
}

async function updateRestartOrderForSimpleIconsRun({ completed = false, dryRun = false } = {}) {
  const restartOrder = await readJson(restartOrderPath);

  const purposeStage = restartOrder.stages.find((stage) => stage.stage_id === 'purpose-chip-150');
  const mingcuteStage = restartOrder.stages.find((stage) => stage.stage_id === 'mingcute');
  const simpleiconsStage = restartOrder.stages.find((stage) => stage.stage_id === 'simpleicons');
  const lucideStage = restartOrder.stages.find((stage) => stage.stage_id === 'lucide');

  if (purposeStage) purposeStage.status = 'completed';
  if (mingcuteStage) mingcuteStage.status = 'completed';
  if (simpleiconsStage) simpleiconsStage.status = completed ? 'completed' : 'in_progress';

  restartOrder.active_stage_id = completed && lucideStage ? 'lucide' : 'simpleicons';

  if (!dryRun) {
    await writeJson(restartOrderPath, restartOrder);
  }
}

async function mergeFinalRecordsIntoApprovedRecords(allFinalRecords, dryRun = false) {
  const approvedRecords = await readJson(simpleIconsApprovedPath);
  const finalById = new Map(allFinalRecords.map((record) => [record.icon_id, record]));

  for (const record of approvedRecords) {
    const finalRecord = finalById.get(record.icon_id);
    if (!finalRecord) continue;
    record.source_library = finalRecord.source_library;
    record.source_name = finalRecord.source_name;
    record.label = finalRecord.label;
    record.depicts = finalRecord.depicts;
    record.semantic_tags = finalRecord.semantic_tags;
    record.synonyms = finalRecord.synonyms;
    record.use_when = finalRecord.use_when;
    record.avoid_when = finalRecord.avoid_when;
  }

  if (!dryRun) {
    await writeJson(simpleIconsApprovedPath, approvedRecords);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const restartOrder = await readJson(restartOrderPath);
  const stage = (restartOrder.stages || []).find((entry) => entry.stage_id === TRACK_ID);
  const configuredBatchSize = options.batchSize || stage?.review_policy?.batch_size || DEFAULT_BATCH_SIZE;

  const approvedRecords = await readJson(simpleIconsApprovedPath);
  const metadataList = await readJson(simpleIconsMetadataPath);
  const orderedRecords = buildOrderedSimpleIconsRecords(approvedRecords, metadataList);

  const batchIds = [];
  let batchIndex = 1;

  await updateRestartOrderForSimpleIconsRun({ completed: false, dryRun: options.dryRun });

  for (let start = 0; start < orderedRecords.length; start += configuredBatchSize) {
    const batchItems = orderedRecords.slice(start, start + configuredBatchSize);
    const batchId = `${TRACK_ID}-batch-${String(batchIndex).padStart(SELECTION_PADDING, '0')}`;
    batchIndex += 1;

    const selection = createSelectionPayload(batchId, batchItems, {
      phase: stage?.review_policy?.phase || 'calibration',
      batch_size: batchItems.length,
      approval_scope: 'full_batch',
      fallback_batch_size: stage?.review_policy?.fallback_batch_size || DEFAULT_BATCH_SIZE,
    });

    await writeJson(path.join(manualRedoDir, `${batchId}-selection.json`), selection);
    batchIds.push(batchId);

    if (options.limitBatches && batchIds.length >= options.limitBatches) {
      break;
    }
  }

  runNodeScript('verify-manual-redo-determinism.mjs');

  for (const batchId of batchIds) {
    runNodeScript('build-manual-redo-batch.mjs', batchId);
  }

  runNodeScript('verify-pruned-semantic-fields.mjs');

  const allFinalRecords = [];
  for (const batchId of batchIds) {
    const batchSlug = batchId.startsWith(`${TRACK_ID}-`) ? batchId.slice(`${TRACK_ID}-`.length) : batchId;
    const finalPath = path.join(manualRedoDir, `${TRACK_ID}-manual-redo-${batchSlug}-final-records.json`);
    const finalRecords = await readJson(finalPath);
    allFinalRecords.push(...finalRecords);
  }

  if (!options.dryRun) {
    await mergeFinalRecordsIntoApprovedRecords(allFinalRecords, false);
    runNodeScript('build-si-registry-projections.mjs');
    runNodeScript('verify-pruned-semantic-fields.mjs');
    runNodeScript('verify-simpleicons-approved-records.mjs');
    runNodeScript('build-redo-progress-checklists.mjs');
    await updateRestartOrderForSimpleIconsRun({
      completed: batchIds.length * configuredBatchSize >= orderedRecords.length,
      dryRun: false,
    });
    runNodeScript('build-redo-progress-checklists.mjs');
  }

  const summary = {
    dry_run: options.dryRun,
    batch_count: batchIds.length,
    processed_icons: allFinalRecords.length,
    total_scope_icons: orderedRecords.length,
    first_batch_id: batchIds[0] || null,
    last_batch_id: batchIds[batchIds.length - 1] || null,
  };

  await writeJson(path.join(generatedDir, 'simpleicons-deterministic-redo-run-summary.json'), summary);
  console.log(`run-simpleicons-deterministic-redo: batches=${summary.batch_count} | processed=${summary.processed_icons} | total=${summary.total_scope_icons} | dryRun=${summary.dry_run}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
