import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const automationRoot = path.join(repoRoot, 'data', 'si-registry', 'automation');
const libraryDir = path.join(automationRoot, 'heroicons');
const generatedDir = path.join(repoRoot, 'data', 'si-registry', 'generated');

const BATCH_ID = process.argv[2] || 'heroicons-editor-review-batch-01';
const SOURCE_BATCH_ID = process.argv[3] || 'heroicons-batch-01';

const REVIEW_DECISIONS = Object.freeze({});

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
    if (batchId === excludedBatchId) continue;
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
      throw new Error(`Missing Heroicons candidate record for ${iconId}`);
  }
  return buildBaseReviewedRecord(candidateRecord);
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
  purpose: 'Approve the high-confidence Heroicons editor-review queue from the current Heroicons automation batch.',
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

This batch clears the high-confidence Heroicons editor-review queue from ${SOURCE_BATCH_ID}.

## What stayed conservative

High-confidence editor-review items move forward by default. Any future holds or drafts in this batch must be added as explicit decisions.
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
  `build-heroicons-editor-review-batch: reviewed=${reviewedRecords.length}, approved=${approveForImport.length}, hold=${holdForEditorReview.length}, draft=${keepAsReviewedDraft.length}`
);
