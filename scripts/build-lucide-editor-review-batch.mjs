import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const automationRoot = path.join(repoRoot, 'data', 'si-registry', 'automation');
const libraryDir = path.join(automationRoot, 'lucide');
const generatedDir = path.join(repoRoot, 'data', 'si-registry', 'generated');

const BATCH_ID = process.argv[2] || 'lucide-editor-review-batch-01';
const SOURCE_BATCH_ID = process.argv[3] || 'lucide-batch-01';

const REVIEW_DECISIONS = Object.freeze({
  'lucide:calendar_x': {
    outcome: 'hold_for_editor_review',
    note: 'The calendar-plus-x shape still drifts between remove event, blocked date, and disabled calendar without stronger nearby product context.',
  },
  'lucide:clock_arrow_down': {
    outcome: 'hold_for_editor_review',
    note: 'The clock-and-arrow reading still mixes postpone, slow down, and move earlier or later too broadly.',
  },
  'lucide:clock_arrow_up': {
    outcome: 'hold_for_editor_review',
    note: 'The clock-and-arrow reading still mixes reschedule, speed up, and move earlier or later too broadly.',
  },
});

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

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value, 'utf8');
}

function normalizeEvidenceSources(values) {
  return [...new Set((values || []).map((value) => String(value).replaceAll('_', '-')))];
}

function buildBaseReviewedRecord(candidateRecord) {
  const confidenceScore = candidateRecord.confidence ?? 0.84;
  return {
    icon_id: candidateRecord.icon_id,
    source_library: candidateRecord.source_library,
    source_name: candidateRecord.source_name,
    label: candidateRecord.label,
    depicts: candidateRecord.depicts,
    purpose: candidateRecord.purpose,
    category: candidateRecord.category,
    intent: candidateRecord.intent,
    domain: candidateRecord.domain,
    semantic_tags: candidateRecord.semantic_tags,
    synonyms: candidateRecord.synonyms || [],
    use_when: candidateRecord.use_when,
    avoid_when: candidateRecord.avoid_when,
    evidence_sources: normalizeEvidenceSources(candidateRecord.evidence || ['source_name', 'editorial_judgment']),
    confidence_score: confidenceScore,
    confidence_band: confidenceScore >= 0.86 ? 'high' : 'medium',
  };
}

function withOverrides(record, overrides) {
  const reviewed = { ...record, ...overrides };
  const confidenceScore = overrides.confidence_score ?? record.confidence_score;
  reviewed.confidence_score = confidenceScore;
  reviewed.confidence_band = confidenceScore >= 0.86 ? 'high' : 'medium';
  return reviewed;
}

function applyPatternOverrides(record) {
  if (record.icon_id === 'lucide:calendar_search') {
    return withOverrides(record, {
      label: 'Search Calendar',
      depicts: 'A calendar paired with a search cue.',
      purpose: 'Show searching for dates, events, or schedule entries inside a calendar view.',
      category: 'search_discovery',
      intent: 'discover',
      domain: 'ui_shell',
      semantic_tags: ['calendar search', 'find event', 'date lookup', 'schedule search', 'search'],
      synonyms: ['search calendar', 'find event', 'date lookup', 'search schedule'],
      use_when: 'Use when the interface searches events, dates, or schedule entries in a calendar context.',
      avoid_when: 'Do not use for global search when the meaning is specifically event or calendar lookup.',
      confidence_score: 0.88,
    });
  }

  if (record.icon_id === 'lucide:list_filter_plus') {
    return withOverrides(record, {
      label: 'Add Filter',
      depicts: 'A list filter symbol paired with an add cue.',
      purpose: 'Show adding another filter, refinement rule, or scoped condition to a result set.',
      category: 'data_controls',
      intent: 'refine',
      domain: 'ui_controls',
      semantic_tags: ['add filter', 'new filter', 'refine results', 'conditions', 'filter'],
      synonyms: ['new filter', 'add rule', 'apply another filter', 'add condition'],
      use_when: 'Use when the interface adds a new filter, refinement condition, or scoped rule to visible results.',
      avoid_when: 'Do not use for generic create actions when the meaning is specifically filter setup or refinement.',
      confidence_score: 0.88,
    });
  }

  if (record.icon_id === 'lucide:grid_2_x_2_check') {
    return withOverrides(record, {
      label: 'Confirmed Grid',
      depicts: 'A grid layout paired with a confirmation check.',
      purpose: 'Show a grid item selection, confirmed grid state, or a validated tile layout.',
      category: 'navigation_interface',
      intent: 'confirm',
      domain: 'ui_shell',
      semantic_tags: ['confirmed grid', 'grid selected', 'checked tiles', 'layout', 'grid'],
      synonyms: ['grid selection', 'checked grid', 'validated layout', 'tile selection'],
      use_when: 'Use when the interface confirms a grid item, validated tile state, or checked grid layout.',
      avoid_when: 'Do not use for a plain grid view when there is no confirm or selection meaning.',
      confidence_score: 0.86,
    });
  }

  if (record.icon_id === 'lucide:grid_2_x_2_plus' || record.icon_id === 'lucide:grid_2x2_plus') {
    return withOverrides(record, {
      label: 'Add Grid Item',
      depicts: 'A grid layout paired with an add cue.',
      purpose: 'Show adding another tile, module, or item into a grid layout.',
      category: 'navigation_interface',
      intent: 'act',
      domain: 'ui_shell',
      semantic_tags: ['add grid item', 'new tile', 'grid add', 'layout', 'grid'],
      synonyms: ['new grid tile', 'add tile', 'insert module', 'add grid card'],
      use_when: 'Use when the interface adds a tile, module, or item into a grid layout or dashboard.',
      avoid_when: 'Do not use for a plain grid toggle when the meaning is specifically adding a new grid item.',
      confidence_score: 0.86,
    });
  }

  return record;
}

function countBy(values, selector) {
  return values.reduce((counts, value) => {
    const key = selector(value);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function getDecisionIconIds(batches, excludedBatchId) {
  const resolved = new Set();
  for (const [batchId, batchDecision] of Object.entries(batches || {})) {
    if (batchId === excludedBatchId) {
      continue;
    }
    for (const key of ['approve_for_import', 'hold_for_editor_review', 'keep_as_reviewed_draft']) {
      for (const entry of batchDecision[key] || []) {
        resolved.add(typeof entry === 'string' ? entry : entry.icon_id);
      }
    }
  }
  return resolved;
}

const summary = await readJson(path.join(automationRoot, SOURCE_BATCH_ID, 'summary.json'));
const candidateRecords = await readJson(path.join(automationRoot, SOURCE_BATCH_ID, 'candidate-records.json'));
const reviewQueue = await readJson(path.join(automationRoot, SOURCE_BATCH_ID, 'review-queue.json'));
const existingDecisions = await readJsonOrDefault(path.join(libraryDir, 'promotion-decisions.json'), {
  schema_version: '1.0.0',
  batches: {},
});
const existingBatch = await readJsonOrDefault(path.join(libraryDir, `${BATCH_ID}.json`), { selected_icon_ids: [] });

const candidateMap = new Map(candidateRecords.map((record) => [record.icon_id, record]));
const resolvedOtherBatchIds = getDecisionIconIds(existingDecisions.batches, BATCH_ID);
const liveSelectedIds = reviewQueue
  .filter((item) => item.queue_outcome === 'ready_for_editor_review' && !resolvedOtherBatchIds.has(item.candidate_icon_id))
  .map((item) => item.candidate_icon_id);
const selectedIds = Array.isArray(existingBatch.selected_icon_ids) && existingBatch.selected_icon_ids.length >= liveSelectedIds.length
  ? existingBatch.selected_icon_ids
  : liveSelectedIds;

const reviewedRecords = selectedIds.map((iconId) => {
  const candidateRecord = candidateMap.get(iconId);
  if (!candidateRecord) {
    throw new Error(`Missing Lucide candidate record for ${iconId}`);
  }
  return applyPatternOverrides(buildBaseReviewedRecord(candidateRecord));
});

const approveForImport = [];
const holdForEditorReview = [];
const keepAsReviewedDraft = [];

for (const reviewedRecord of reviewedRecords) {
  const decision = REVIEW_DECISIONS[reviewedRecord.icon_id] || { outcome: 'approve_for_import' };

  if (decision.outcome === 'approve_for_import') {
    approveForImport.push(reviewedRecord.icon_id);
    continue;
  }

  if (decision.outcome === 'hold_for_editor_review') {
    holdForEditorReview.push({
      icon_id: reviewedRecord.icon_id,
      note: decision.note,
    });
    continue;
  }

  if (decision.outcome === 'keep_as_reviewed_draft') {
    keepAsReviewedDraft.push({
      icon_id: reviewedRecord.icon_id,
      note: decision.note,
    });
    continue;
  }

  throw new Error(`Unsupported review outcome for ${reviewedRecord.icon_id}`);
}

const promotionDecisions = {
  ...existingDecisions,
  batches: {
    ...(existingDecisions.batches || {}),
    [BATCH_ID]: {
      approve_for_import: approveForImport,
      hold_for_editor_review: holdForEditorReview,
      keep_as_reviewed_draft: keepAsReviewedDraft,
    },
  },
};

const batchData = {
  schema_version: '1.0.0',
  batch_id: BATCH_ID,
  source_batch_id: SOURCE_BATCH_ID,
  library_id: summary.library_id,
  library_label: summary.library_label,
  purpose: 'Approve the high-confidence Lucide editor-review queue from the first Lucide automation batch.',
  selected_count: selectedIds.length,
  selected_icon_ids: selectedIds,
};

const summaryPayload = {
  schema_version: '1.0.0',
  batch_id: BATCH_ID,
  source_batch_id: SOURCE_BATCH_ID,
  reviewed_count: reviewedRecords.length,
  approve_for_import: approveForImport.length,
  hold_for_editor_review: holdForEditorReview.length,
  keep_as_reviewed_draft: keepAsReviewedDraft.length,
  by_category: countBy(reviewedRecords, (record) => record.category),
  by_domain: countBy(reviewedRecords, (record) => record.domain || 'unknown'),
};

const notes = `# ${BATCH_ID} Notes

## Outcome

- Total reviewed: ${reviewedRecords.length}
- Approved for import: ${approveForImport.length}
- Holds added: ${holdForEditorReview.length}
- Drafts added: ${keepAsReviewedDraft.length}

## Why this batch exists

This batch clears the high-confidence Lucide editor-review queue from the first staged Lucide automation batch.

## What stayed conservative

- calendar removal or disabled-calendar meaning
- clock-plus-arrow variants where time shift vs movement meaning still blends together
`;

await writeJson(path.join(libraryDir, `${BATCH_ID}.json`), batchData);
await writeJson(path.join(libraryDir, `${BATCH_ID}-reviewed-records.json`), {
  schema_version: '1.0.0',
  batch_id: BATCH_ID,
  reviewed_records: reviewedRecords,
});
await writeJson(path.join(libraryDir, 'promotion-decisions.json'), promotionDecisions);
await writeJson(path.join(generatedDir, `${BATCH_ID}-summary.json`), summaryPayload);
await writeText(path.join(libraryDir, `${BATCH_ID}-notes.md`), notes);

console.log(
  `build-lucide-editor-review-batch: reviewed=${reviewedRecords.length}, approved=${approveForImport.length}, hold=${holdForEditorReview.length}, draft=${keepAsReviewedDraft.length}`
);
