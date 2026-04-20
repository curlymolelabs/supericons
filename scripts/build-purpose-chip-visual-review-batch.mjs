import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const pilotDir = path.join(repoRoot, 'data', 'si-registry', 'pilot', 'purpose-chip');
const generatedDir = path.join(repoRoot, 'data', 'si-registry', 'generated');

const BATCH_ID = 'visual-review-batch-02';

const REVIEW_DECISIONS = Object.freeze({
  'material:account_tree': {
    outcome: 'approve_for_import',
  },
  'material:arrow_downward': {
    outcome: 'approve_for_import',
  },
  'material:arrow_upward': {
    outcome: 'approve_for_import',
  },
  'material:dock_to_left': {
    outcome: 'approve_for_import',
  },
  'material:dock_to_right': {
    outcome: 'approve_for_import',
  },
  'material:hub': {
    outcome: 'approve_for_import',
  },
  'material:network_intelligence': {
    outcome: 'approve_for_import',
    overrides: {
      purpose: 'Show connected-system insight, graph intelligence, or analysis across linked parts of a system.',
      use_when: 'Use when the product shows network-level insight, graph-style intelligence, or relationships across connected system parts.',
      avoid_when: 'Do not use for generic AI branding, simple sharing, or ordinary node diagrams when the meaning is not system insight or connected analysis.',
    },
  },
  'material:network_intelligence_history': {
    outcome: 'approve_for_import',
    overrides: {
      label: 'Network History',
      purpose: 'Show historical network insight, past graph activity, or connected-system analysis over time.',
      use_when: 'Use when the product shows earlier network patterns, historical connected-system activity, or past graph intelligence.',
      avoid_when: 'Do not use for generic history, logging, or timeline screens when the meaning is not tied to connected-system insight.',
    },
  },
  'material:psychology': {
    outcome: 'approve_for_import',
  },
  'material:subdirectory_arrow_right': {
    outcome: 'approve_for_import',
  },
  'material:swap_horiz': {
    outcome: 'approve_for_import',
  },
  'material:swap_vert': {
    outcome: 'approve_for_import',
  },
  'material:auto_awesome': {
    outcome: 'keep_as_reviewed_draft',
    note: 'The sparkle cluster still reads too broadly across magic, polish, delight, and AI enhancement.',
    overrides: {
      confidence: 0.8,
    },
  },
  'material:network_intelligence_update': {
    outcome: 'hold_for_editor_review',
    note: 'The down-arrow variant still mixes graph insight, refresh, and inbound update meanings too broadly.',
    overrides: {
      confidence: 0.82,
    },
  },
  'material:prompt_suggestion': {
    outcome: 'hold_for_editor_review',
    note: 'The hooked arrow shape reads more like insert, return, or submit than a clearly AI-specific prompt suggestion.',
    overrides: {
      confidence: 0.8,
      purpose: 'Show inserting a suggested prompt, reusing suggested text, or applying a prompt suggestion into an input.',
      use_when: 'Use when the interface inserts or applies a suggested prompt into a text field or composer.',
      avoid_when: 'Do not use for generic send, reply, continue, or enter actions when the meaning is not specifically about applying a suggestion.',
    },
  },
  'material:density_medium': {
    outcome: 'hold_for_editor_review',
    note: 'The stacked density bars still need tighter wording to separate view density from generic list or layout controls.',
    overrides: {
      confidence: 0.8,
    },
  },
  'material:double_arrow': {
    outcome: 'hold_for_editor_review',
    note: 'The doubled arrow still drifts between jump ahead, fast forward, skip, and high-speed motion.',
    overrides: {
      confidence: 0.81,
    },
  },
  'material:psychology_alt': {
    outcome: 'hold_for_editor_review',
    note: 'The head-and-question-mark shape does not safely read as reasoning; it drifts toward ask, doubt, or uncertainty instead.',
    overrides: {
      confidence: 0.81,
      label: 'Questioning',
      purpose: 'Show questioning, uncertainty, or a thinking state centered on an open question.',
      use_when: 'Use when the interface highlights uncertainty, open questions, or a thinking step focused on what to ask next.',
      avoid_when: 'Do not use for generic AI reasoning, settings, or knowledge icons when the meaning is not specifically about questioning or uncertainty.',
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

function buildReviewedRecord(stagedRecord, decision) {
  const overrides = decision.overrides || {};
  const confidence = overrides.confidence ?? stagedRecord.confidence;

  return {
    icon_id: stagedRecord.icon_id,
    source_library: stagedRecord.source_library,
    source_name: stagedRecord.source_name,
    label: overrides.label ?? stagedRecord.label,
    depicts: overrides.depicts ?? stagedRecord.depicts,
    purpose: overrides.purpose ?? stagedRecord.purpose,
    category: overrides.category ?? stagedRecord.category,
    intent: overrides.intent ?? stagedRecord.intent,
    domain: overrides.domain ?? stagedRecord.domain,
    semantic_tags: overrides.semantic_tags ?? stagedRecord.semantic_tags,
    synonyms: overrides.synonyms ?? stagedRecord.synonyms,
    use_when: overrides.use_when ?? stagedRecord.use_when,
    avoid_when: overrides.avoid_when ?? stagedRecord.avoid_when,
    evidence_sources: ['source-name', 'visual-inspection', 'editorial-review'],
    confidence_score: confidence,
    confidence_band: confidence >= 0.86 ? 'high' : 'medium',
  };
}

const existingBatch = await readJsonOrDefault(pilotPath(`${BATCH_ID}.json`), { records: [] });
const candidateRecords = await readJson(pilotPath('candidate-records.json'));
const stagedRecords = await readJson(pilotPath('automation-staged-records.json'));
const visualInputs = await readJson(pilotPath('visual-review-inputs.json'));
const promotionDecisions = await readJson(pilotPath('promotion-decisions.json'));

const existingBatchById = new Map(
  (existingBatch.records || []).map((record) => [record.icon_id, record.current_candidate_record]).filter((entry) => entry[1])
);
const candidateById = new Map(candidateRecords.map((record) => [record.icon_id, record]));
const stagedById = new Map(stagedRecords.map((record) => [record.icon_id, record]));
const visualById = new Map(visualInputs.map((record) => [record.icon_id, record]));

const visualReviewEntries = Object.keys(REVIEW_DECISIONS)
  .map((iconId) => {
    const candidateRecord = stagedById.get(iconId) || existingBatchById.get(iconId) || candidateById.get(iconId);
    const visualInput = visualById.get(iconId);

    if (!candidateRecord) {
      throw new Error(`Missing candidate record for ${iconId}`);
    }

    if (!visualInput) {
      throw new Error(`Missing visual input for ${iconId}`);
    }

    return {
      icon_id: iconId,
      purpose_chip_category_id: candidateRecord.purpose_chip_category_id,
      purpose_chip_category_label: candidateRecord.purpose_chip_category_label,
      queue_outcome: 'visual_review',
      confidence_band: candidateRecord.confidence >= 0.86 ? 'high' : 'medium',
      current_candidate_record: candidateRecord,
      visual_review_input: visualInput,
    };
  })
  .sort(
    (left, right) =>
      right.current_candidate_record.confidence - left.current_candidate_record.confidence ||
      left.icon_id.localeCompare(right.icon_id)
  );

const records = visualReviewEntries;

const reviewedRecords = records.map((record) => buildReviewedRecord(record.current_candidate_record, REVIEW_DECISIONS[record.icon_id]));

const approveForImport = [];
const holdForEditorReview = [];
const keepAsReviewedDraft = [];

for (const record of reviewedRecords) {
  const decision = REVIEW_DECISIONS[record.icon_id];
  if (decision.outcome === 'approve_for_import') {
    approveForImport.push(record.icon_id);
    continue;
  }

  if (decision.outcome === 'hold_for_editor_review') {
    holdForEditorReview.push({
      icon_id: record.icon_id,
      note: decision.note,
    });
    continue;
  }

  if (decision.outcome === 'keep_as_reviewed_draft') {
    keepAsReviewedDraft.push({
      icon_id: record.icon_id,
      note: decision.note,
    });
    continue;
  }

  throw new Error(`Unsupported review outcome for ${record.icon_id}: ${decision.outcome}`);
}

promotionDecisions.batches[BATCH_ID] = {
  approve_for_import: approveForImport,
  hold_for_editor_review: holdForEditorReview,
  keep_as_reviewed_draft: keepAsReviewedDraft,
};

const batch = {
  schema_version: '1.0.0',
  batch_id: BATCH_ID,
  purpose: 'Visual-review batch for the remaining purpose-chip icons that already have real SVG payloads.',
  selection_notes: [
    'Take only icons currently routed to visual_review.',
    'Use the rendered icon shapes to confirm or tighten the staged semantic meaning.',
    'Hold or draft icons that still read too broadly after visual inspection.',
  ],
  total_icons: records.length,
  counts: {
    by_lane: countBy(records, (record) => record.purpose_chip_category_id),
    by_visual_payload_status: countBy(records, (record) => record.visual_review_input.visual_payload_status),
  },
  records,
};

const summary = {
  schema_version: '1.0.0',
  batch_id: BATCH_ID,
  total_icons: reviewedRecords.length,
  approved_for_import_count: approveForImport.length,
  hold_for_editor_review_count: holdForEditorReview.length,
  reviewed_draft_count: keepAsReviewedDraft.length,
  by_lane: countBy(records, (record) => record.purpose_chip_category_id),
  by_category: countBy(reviewedRecords, (record) => record.category),
};

const notes = `# ${BATCH_ID} Notes

## Outcome

This batch resolves the next Material-heavy visual-review slice that became available after the local SVG coverage pass.

- Total reviewed: ${reviewedRecords.length}
- Approved for import: ${approveForImport.length}
- Hold for editor review: ${holdForEditorReview.length}
- Keep as reviewed draft: ${keepAsReviewedDraft.length}

## Main pattern

The strong approvals in this batch are the icons whose directional or structural shapes map cleanly to navigation or connected-system meaning.

The unresolved icons stayed unresolved for a clear reason:

- sparkles and thinking symbols still read too broadly
- a few AI-leaning icons need tighter product framing even after visual review
- a few control icons still span too many nearby navigation meanings
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

console.log(
  `build-purpose-chip-visual-review-batch: batch=${records.length}, approved=${approveForImport.length}, hold=${holdForEditorReview.length}, draft=${keepAsReviewedDraft.length}`
);
