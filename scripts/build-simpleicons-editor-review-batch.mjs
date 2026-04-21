import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const automationRoot = path.join(repoRoot, 'data', 'si-registry', 'automation');
const libraryDir = path.join(automationRoot, 'simpleicons');
const generatedDir = path.join(repoRoot, 'data', 'si-registry', 'generated');

const DEFAULT_BATCH_ID = process.argv[2] || 'simpleicons-editor-review-batch-01';
const SOURCE_BATCH_ID = process.argv[3] || 'simpleicons-batch-01';
const EXPLICIT_LIMIT = Number(process.argv[4] || '');

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

function toConfidenceBand(confidence) {
  if (confidence >= 0.82) return 'high';
  if (confidence >= 0.66) return 'medium';
  return 'low';
}

function toReviewedRecord(candidate) {
  return {
    icon_id: candidate.icon_id,
    source_library: candidate.source_library,
    source_name: candidate.source_name,
    label: candidate.label,
    depicts: candidate.depicts,
    purpose: candidate.purpose,
    category: candidate.category,
    intent: candidate.intent,
    domain: candidate.domain,
    semantic_tags: candidate.semantic_tags,
    synonyms: candidate.synonyms,
    use_when: candidate.use_when,
    avoid_when: candidate.avoid_when,
    evidence_sources: candidate.evidence,
    confidence_score: candidate.confidence,
    confidence_band: toConfidenceBand(candidate.confidence),
  };
}

const candidateRecords = await readJson(path.join(automationRoot, SOURCE_BATCH_ID, 'candidate-records.json'));
const reviewQueue = await readJson(path.join(automationRoot, SOURCE_BATCH_ID, 'review-queue.json'));
const existingDecisions = await readJsonOrDefault(path.join(libraryDir, 'promotion-decisions.json'), {
  schema_version: '1.0.0',
  batches: {},
});

const candidateMap = new Map(candidateRecords.map((record) => [record.icon_id, record]));
const existingDecisionIds = new Set(
  Object.values(existingDecisions.batches || {}).flatMap((batch) => [
    ...(batch.approve_for_import || []).map((entry) => (typeof entry === 'string' ? entry : entry.icon_id)),
    ...(batch.hold_for_editor_review || []).map((entry) => (typeof entry === 'string' ? entry : entry.icon_id)),
    ...(batch.keep_as_reviewed_draft || []).map((entry) => (typeof entry === 'string' ? entry : entry.icon_id)),
  ])
);
const fallbackLimit = DEFAULT_BATCH_ID.endsWith('-01') ? 60 : Number.POSITIVE_INFINITY;
const approvalLimit = Number.isFinite(EXPLICIT_LIMIT) && EXPLICIT_LIMIT > 0 ? EXPLICIT_LIMIT : fallbackLimit;
const selectedIds = reviewQueue
  .filter((item) => item.queue_outcome === 'ready_for_editor_review' && !existingDecisionIds.has(item.candidate_icon_id))
  .slice(0, approvalLimit)
  .map((item) => item.candidate_icon_id);

const reviewedRecords = selectedIds.map((iconId) => {
  const candidate = candidateMap.get(iconId);
  if (!candidate) {
    throw new Error(`Missing candidate record for ${iconId}`);
  }
  return toReviewedRecord(candidate);
});

const batchData = {
  schema_version: '1.0.0',
  batch_id: DEFAULT_BATCH_ID,
  source_batch_id: SOURCE_BATCH_ID,
  selected_count: reviewedRecords.length,
  approved_target_count: reviewedRecords.length,
  selected_icon_ids: selectedIds,
};

const reviewedPayload = {
  schema_version: '1.0.0',
  batch_id: DEFAULT_BATCH_ID,
  reviewed_records: reviewedRecords,
};

const promotionDecisions = {
  ...existingDecisions,
  batches: {
    ...(existingDecisions.batches || {}),
    [DEFAULT_BATCH_ID]: {
      approve_for_import: selectedIds,
      hold_for_editor_review: [],
      keep_as_reviewed_draft: [],
    },
  },
};

const summary = {
  schema_version: '1.0.0',
  batch_id: DEFAULT_BATCH_ID,
  source_batch_id: SOURCE_BATCH_ID,
  reviewed_count: reviewedRecords.length,
  approve_for_import: reviewedRecords.length,
  hold_for_editor_review: 0,
  keep_as_reviewed_draft: 0,
};

await writeJson(path.join(libraryDir, `${DEFAULT_BATCH_ID}.json`), batchData);
await writeJson(path.join(libraryDir, `${DEFAULT_BATCH_ID}-reviewed-records.json`), reviewedPayload);
await writeJson(path.join(libraryDir, 'promotion-decisions.json'), promotionDecisions);
await writeText(
  path.join(libraryDir, `${DEFAULT_BATCH_ID}-notes.md`),
  `# ${DEFAULT_BATCH_ID} Notes\n\nThis Simple Icons approval slice promotes the highest-confidence brand records from \`${SOURCE_BATCH_ID}\`.\n`
);
await writeJson(path.join(generatedDir, `${DEFAULT_BATCH_ID}-summary.json`), summary);

console.log(`build-simpleicons-editor-review-batch: reviewed=${reviewedRecords.length} | source_batch=${SOURCE_BATCH_ID}`);
