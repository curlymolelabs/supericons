import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const pilotDir = path.join(repoRoot, 'data', 'si-registry', 'pilot', 'purpose-chip');
const generatedDir = path.join(repoRoot, 'data', 'si-registry', 'generated');

const BATCH_ID = 'editor-review-batch-02';

const REVIEW_DECISIONS = Object.freeze({
  'material:generating_tokens': {
    outcome: 'hold_for_editor_review',
    note: 'The token badge with sparkles still reads more like tokenized magic or enhanced output than a stable token-generation concept.',
    overrides: {
      routing_score: 0.81,
    },
  },
  'material:model_training': {
    outcome: 'hold_for_editor_review',
    note: 'The looping bulb icon still mixes training, iteration, and idea refinement too broadly.',
    overrides: {
      routing_score: 0.81,
    },
  },
  'material:segment': {
    outcome: 'hold_for_editor_review',
    note: 'The stacked bars icon does not clearly read as a segmented control without stronger UI context.',
    overrides: {
      routing_score: 0.8,
      purpose: 'Show segment layout, grouped bars, or a compact segmented interface when nearby UI context makes that meaning clear.',
      use_when: 'Use when the interface refers to segment-based layout or grouped sections with clear surrounding context.',
      avoid_when: 'Do not use for generic list, density, or alignment controls when the meaning is not specifically about segments or grouped sections.',
    },
  },
  'material:token': {
    outcome: 'hold_for_editor_review',
    note: 'The cube token icon is useful, but it still spans package, object, artifact, and token-unit meanings.',
    overrides: {
      routing_score: 0.81,
    },
  },
  'material:data_object': {
    outcome: 'keep_as_reviewed_draft',
    note: 'The braces read clearly as structured data, but the exact product meaning still drifts between object, code, and typed schema.',
    overrides: {
      routing_score: 0.82,
    },
  },
});

function pilotPath(fileName) {
  return path.join(pilotDir, fileName);
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

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value, 'utf8');
}

function countBy(values, selector) {
  return values.reduce((counts, value) => {
    const key = selector(value);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function buildReviewedRecord(stagedRecord) {
  const decision = REVIEW_DECISIONS[stagedRecord.icon_id] || {};
  const overrides = decision.overrides || {};
  const routingScore = overrides.routing_score ?? stagedRecord.routing_score ?? 0;

  return {
    icon_id: stagedRecord.icon_id,
    source_library: stagedRecord.source_library,
    source_name: stagedRecord.source_name,
    label: overrides.label ?? stagedRecord.label,
    depicts: overrides.depicts ?? stagedRecord.depicts,
    purpose: overrides.purpose ?? stagedRecord.purpose,
    category: overrides.category ?? stagedRecord.category,
    semantic_tags: overrides.semantic_tags ?? stagedRecord.semantic_tags,
    synonyms: overrides.synonyms ?? stagedRecord.synonyms,
    use_when: overrides.use_when ?? stagedRecord.use_when,
    avoid_when: overrides.avoid_when ?? stagedRecord.avoid_when,
    evidence_sources: stagedRecord.evidence?.map((value) => value.replaceAll('_', '-')) || ['source-name', 'editor-review'],
    routing_score: routingScore,
    routing_band: routingScore >= 0.86 ? 'high' : 'medium',
  };
}

const existingBatch = await readJsonOrDefault(pilotPath(`${BATCH_ID}.json`), { records: [] });
const stagedRecords = await readJson(pilotPath('automation-staged-records.json'));
const nextSteps = await readJson(pilotPath('automation-next-steps.json'));
const visualInputs = await readJson(pilotPath('visual-review-inputs.json'));
const promotionDecisions = await readJson(pilotPath('promotion-decisions.json'));

const stagedById = new Map(stagedRecords.map((record) => [record.icon_id, record]));
const visualById = new Map(visualInputs.map((record) => [record.icon_id, record]));
const existingBatchById = new Map(
  (existingBatch.records || []).map((record) => [record.icon_id, record.current_candidate_record]).filter((entry) => entry[1])
);

const liveEditorReviewEntries = nextSteps.filter((entry) => entry.next_step === 'editor_review');
const savedEditorReviewEntries = (existingBatch.records || []).map((record) => ({ icon_id: record.icon_id }));
const editorReviewEntries = (
  savedEditorReviewEntries.length >= liveEditorReviewEntries.length
    ? savedEditorReviewEntries
    : liveEditorReviewEntries
).sort((left, right) => {
  const leftScore = stagedById.get(left.icon_id)?.routing_score ?? existingBatchById.get(left.icon_id)?.routing_score ?? 0;
  const rightScore = stagedById.get(right.icon_id)?.routing_score ?? existingBatchById.get(right.icon_id)?.routing_score ?? 0;
  return rightScore - leftScore || left.icon_id.localeCompare(right.icon_id);
});

const batchRecords = editorReviewEntries.map((entry) => {
  const stagedRecord = stagedById.get(entry.icon_id) || existingBatchById.get(entry.icon_id);
  const visualInput = visualById.get(entry.icon_id);

  if (!stagedRecord) {
    throw new Error(`Missing staged record for ${entry.icon_id}`);
  }

  if (!visualInput) {
    throw new Error(`Missing visual input for ${entry.icon_id}`);
  }

  return {
    icon_id: entry.icon_id,
    purpose_chip_category_id: stagedRecord.purpose_chip_category_id,
    purpose_chip_category_label: stagedRecord.purpose_chip_category_label,
    queue_outcome: entry.next_step,
    routing_band: (stagedRecord.routing_score ?? 0) >= 0.86 ? 'high' : 'medium',
    current_candidate_record: stagedRecord,
    visual_review_input: visualInput,
  };
});

const reviewedRecords = editorReviewEntries.map((entry) =>
  buildReviewedRecord(stagedById.get(entry.icon_id) || existingBatchById.get(entry.icon_id))
);
const approvedIds = [];
const holdForEditorReview = [];
const keepAsReviewedDraft = [];

for (const record of reviewedRecords) {
  const decision = REVIEW_DECISIONS[record.icon_id] || { outcome: 'approve_for_import' };

  if (decision.outcome === 'approve_for_import') {
    approvedIds.push(record.icon_id);
    continue;
  }

  if (decision.outcome === 'hold_for_editor_review') {
    holdForEditorReview.push({
      icon_id: record.icon_id,
      note: decision.note || 'Needs tighter editor framing before approval.',
    });
    continue;
  }

  if (decision.outcome === 'keep_as_reviewed_draft') {
    keepAsReviewedDraft.push({
      icon_id: record.icon_id,
      note: decision.note || 'Still too context-sensitive for approval.',
    });
    continue;
  }

  throw new Error(`Unsupported review outcome for ${record.icon_id}: ${decision.outcome}`);
}

promotionDecisions.batches[BATCH_ID] = {
  approve_for_import: approvedIds,
  hold_for_editor_review: holdForEditorReview,
  keep_as_reviewed_draft: keepAsReviewedDraft,
};

const batch = {
  schema_version: '1.0.0',
  batch_id: BATCH_ID,
  purpose: 'Short editor-review pass for the strongest automation-staged purpose-chip icons.',
  selection_notes: [
    'Take only the icons currently routed to editor_review.',
    'Keep the batch business-safe and free of internal model details.',
    'Approve the batch unless an obvious semantic mismatch appears.',
  ],
  total_icons: batchRecords.length,
  counts: {
    by_lane: countBy(batchRecords, (record) => record.purpose_chip_category_id),
    by_visual_payload_status: countBy(batchRecords, (record) => record.visual_review_input.visual_payload_status),
  },
  records: batchRecords,
};

const summary = {
  schema_version: '1.0.0',
  batch_id: BATCH_ID,
  total_icons: reviewedRecords.length,
  approved_for_import_count: approvedIds.length,
  hold_for_editor_review_count: holdForEditorReview.length,
  reviewed_draft_count: keepAsReviewedDraft.length,
  by_lane: countBy(batchRecords, (record) => record.purpose_chip_category_id),
  by_category: countBy(reviewedRecords, (record) => record.category),
};

const notes = `# ${BATCH_ID} Notes

## Outcome

This batch covers the main remaining editor-review queue from the purpose-chip scale-up.

- Total reviewed: ${reviewedRecords.length}
- Approved for import: ${approvedIds.length}
- Holds added: ${holdForEditorReview.length}
- Drafts added: ${keepAsReviewedDraft.length}

## Why this batch matters

These icons were already in the \`editor_review\` bucket, which means the semantic draft was close enough that the remaining work is mainly editorial tightening.

## Next focus after this batch

- any editor holds or drafts that remain after this batch
- the final text-review queue that still depends on missing visual payloads
`;

await writeJson(pilotPath(`${BATCH_ID}.json`), batch);
await writeJson(pilotPath(`${BATCH_ID}-reviewed-records.json`), {
  schema_version: '1.0.0',
  batch_id: BATCH_ID,
  reviewed_records: reviewedRecords,
});
await writeJson(generatedPath(`${BATCH_ID}-summary.json`), summary);
await writeJson(pilotPath('promotion-decisions.json'), promotionDecisions);
await writeText(pilotPath(`${BATCH_ID}-notes.md`), notes);

console.log(`build-purpose-chip-editor-review-batch: batch=${batchRecords.length}, approved=${approvedIds.length}`);
