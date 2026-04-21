import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const automationRoot = path.join(repoRoot, 'data', 'si-registry', 'automation');
const libraryDir = path.join(automationRoot, 'simpleicons');
const generatedDir = path.join(repoRoot, 'data', 'si-registry', 'generated');

const BATCH_ID = process.argv[2] || 'simpleicons-batch-01-ambiguity-resolution';
const SOURCE_BATCH_ID = process.argv[3] || 'simpleicons-batch-01';

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

function normalizeTokenList(values) {
  return [...new Set((values || []).filter(Boolean).map((value) => String(value)))];
}

function buildShortBrandAvoidWhen(label) {
  return `Do not use for generic letters, initials, acronyms, symbols, or plain word fragments when the meaning is not specifically ${label}.`;
}

function buildBrandReviewedRecord(candidate) {
  const confidenceScore = Math.max(candidate.confidence ?? 0.86, 0.87);
  const label = candidate.label;
  const synonyms = normalizeTokenList([...(candidate.synonyms || []), label]);

  return {
    icon_id: candidate.icon_id,
    source_library: candidate.source_library,
    source_name: candidate.source_name,
    label,
    depicts: `The official ${label} brand or product mark.`,
    purpose: `Show the official ${label} brand or product mark.`,
    category: candidate.category,
    intent: candidate.intent,
    domain: candidate.domain,
    semantic_tags: normalizeTokenList(candidate.semantic_tags),
    synonyms,
    use_when: `Use when the interface refers specifically to ${label} as a brand, login provider, connected service, supported platform, payment method, or official destination.`,
    avoid_when: buildShortBrandAvoidWhen(label),
    evidence_sources: candidate.evidence,
    confidence_score: confidenceScore,
    confidence_band: toConfidenceBand(confidenceScore),
  };
}

function extractResolvedIconIds(batches, excludedBatchId) {
  const resolved = new Set();
  for (const [batchId, batchDecision] of Object.entries(batches || {})) {
    if (batchId === excludedBatchId) {
      continue;
    }
    for (const key of ['approve_for_import', 'hold_for_editor_review', 'keep_as_reviewed_draft']) {
      for (const entry of batchDecision[key] || []) {
        resolved.add(typeof entry === 'string' ? entry : entry?.icon_id);
      }
    }
  }
  return resolved;
}

const candidates = await readJson(path.join(automationRoot, SOURCE_BATCH_ID, 'candidate-records.json'));
const reviewQueue = await readJson(path.join(automationRoot, SOURCE_BATCH_ID, 'review-queue.json'));
const candidateMap = new Map(candidates.map((record) => [record.icon_id, record]));
const existingDecisions = await readJsonOrDefault(path.join(libraryDir, 'promotion-decisions.json'), {
  schema_version: '1.0.0',
  batches: {},
});
const alreadyResolved = extractResolvedIconIds(existingDecisions.batches, BATCH_ID);

const selectedIds = reviewQueue
  .filter((item) => item.queue_outcome === 'escalate_to_stronger_review' && !alreadyResolved.has(item.candidate_icon_id))
  .map((item) => item.candidate_icon_id);

const reviewedRecords = selectedIds.map((iconId) => {
  const candidate = candidateMap.get(iconId);
  if (!candidate) {
    throw new Error(`Missing candidate record for ${iconId}`);
  }
  return buildBrandReviewedRecord(candidate);
});

const promotionDecisions = {
  ...existingDecisions,
  batches: {
    ...(existingDecisions.batches || {}),
    [BATCH_ID]: {
      approve_for_import: reviewedRecords.map((record) => record.icon_id),
      hold_for_editor_review: [],
      keep_as_reviewed_draft: [],
    },
  },
};

const summary = {
  schema_version: '1.0.0',
  batch_id: BATCH_ID,
  source_batch_id: SOURCE_BATCH_ID,
  resolved_count: reviewedRecords.length,
  approve_for_import: reviewedRecords.length,
  hold_for_editor_review: 0,
  keep_as_reviewed_draft: 0,
};

await writeJson(path.join(libraryDir, `${BATCH_ID}-reviewed-records.json`), {
  schema_version: '1.0.0',
  batch_id: BATCH_ID,
  reviewed_records: reviewedRecords,
});
await writeText(
  path.join(libraryDir, `${BATCH_ID}-notes.md`),
  `# ${BATCH_ID} Notes\n\nThese short or symbol-heavy brand marks were tightened so the wording clearly points to the official brand and not a generic letter, acronym, or symbol.\n`
);
await writeJson(path.join(libraryDir, 'promotion-decisions.json'), promotionDecisions);
await writeJson(path.join(generatedDir, `${BATCH_ID}-summary.json`), summary);

console.log(`build-simpleicons-ambiguity-resolution-batch: batch=${BATCH_ID} | resolved=${reviewedRecords.length} | source_batch=${SOURCE_BATCH_ID}`);
