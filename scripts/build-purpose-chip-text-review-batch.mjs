import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const pilotDir = path.join(repoRoot, 'data', 'si-registry', 'pilot', 'purpose-chip');
const generatedDir = path.join(repoRoot, 'data', 'si-registry', 'generated');

const BATCH_ID = 'text-review-batch-01';

const TEXT_REVIEW_TARGETS = [
  {
    icon_id: 'material:launch',
    approved_reference_icon_id: 'material:open_in_new',
    reviewed_record: {
      label: 'Open In New',
      depicts: 'An outward arrow showing content opening in a new destination.',
      purpose: 'Show opening content in a new tab, new window, or external destination.',
      category: 'navigation_interface',
      intent: 'navigate',
      domain: 'navigation',
      semantic_tags: ['open in new', 'external', 'new tab', 'launch', 'outbound'],
      synonyms: ['open external', 'new tab', 'launch page', 'open separately'],
      use_when: 'Use when the interface opens content in a new tab, new window, or external destination.',
      avoid_when: 'Do not use for send or share when the meaning is specifically opening elsewhere.',
      evidence_sources: ['source-name', 'approved-reference', 'metadata-only'],
      confidence_score: 0.91,
      confidence_band: 'high',
    },
  },
  {
    icon_id: 'material:workflow',
    approved_reference_icon_id: 'lucide:workflow',
    reviewed_record: {
      label: 'Workflow',
      depicts: 'Workflow shown as a structured process or layered system symbol.',
      purpose: 'Show a multi-step workflow, orchestration path, or linked automation sequence.',
      category: 'agent_lifecycle',
      intent: 'inform',
      domain: 'ai_agents',
      semantic_tags: ['workflow', 'orchestration', 'pipeline', 'sequence', 'automation'],
      synonyms: ['agent flow', 'automation flow', 'process map', 'pipeline'],
      use_when: 'Use when the interface needs to show a linked sequence of automated or agent-driven steps.',
      avoid_when: 'Do not use for a simple hierarchy, organization chart, or generic navigation pattern.',
      evidence_sources: ['source-name', 'approved-reference', 'metadata-only'],
      confidence_score: 0.9,
      confidence_band: 'high',
    },
  },
];

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

const stagedRecords = await readJson(pilotPath('automation-staged-records.json'));
const approvedRecords = await readJson(pilotPath('approved-records.json'));
const existingBatch = await readJsonOrDefault(pilotPath(`${BATCH_ID}.json`), null);

const stagedById = new Map(stagedRecords.map((record) => [record.icon_id, record]));
const approvedById = new Map(approvedRecords.map((record) => [record.icon_id, record]));
const existingBatchById = new Map((existingBatch?.records || []).map((record) => [record.icon_id, record]));

const records = TEXT_REVIEW_TARGETS.map((target) => {
  const stagedRecord = stagedById.get(target.icon_id) || existingBatchById.get(target.icon_id)?.current_candidate_record;
  if (!stagedRecord) {
    throw new Error(`Missing staged record for ${target.icon_id}`);
  }

  const approvedReferenceRecord = approvedById.get(target.approved_reference_icon_id);
  if (!approvedReferenceRecord) {
    throw new Error(`Missing approved reference record for ${target.approved_reference_icon_id}`);
  }

  return {
    icon_id: target.icon_id,
    purpose_chip_category_id: stagedRecord.purpose_chip_category_id,
    purpose_chip_category_label: stagedRecord.purpose_chip_category_label,
    queue_outcome: 'text_review',
    confidence_band: 'high',
    current_candidate_record: stagedRecord,
    approved_reference_record: approvedReferenceRecord,
  };
});

const reviewedRecords = TEXT_REVIEW_TARGETS.map((target) => {
  const stagedRecord = records.find((record) => record.icon_id === target.icon_id)?.current_candidate_record;
  return {
    icon_id: target.icon_id,
    source_library: stagedRecord.source_library,
    source_name: stagedRecord.source_name,
    ...target.reviewed_record,
  };
});

const summary = {
  schema_version: '1.0.0',
  batch_id: BATCH_ID,
  total_icons: records.length,
  approved_for_import: records.length,
  hold_for_editor_review: 0,
  keep_as_reviewed_draft: 0,
  by_lane: records.reduce((counts, record) => {
    counts[record.purpose_chip_category_id] = (counts[record.purpose_chip_category_id] || 0) + 1;
    return counts;
  }, {}),
};

const batchFile = {
  schema_version: '1.0.0',
  batch_id: BATCH_ID,
  purpose: 'Text-review batch for the final purpose-chip icons that still lack local visual payloads.',
  selection_notes: [
    'Take only icons currently routed to text_review.',
    'Resolve them only when the source name is clear and an already-approved semantic equivalent exists.',
    'Use approved reference records to keep the wording aligned with the existing SI standard.',
  ],
  total_icons: records.length,
  counts: {
    by_lane: summary.by_lane,
    by_visual_payload_status: {
      metadata_only: records.length,
    },
  },
  records,
};

const reviewedRecordFile = {
  schema_version: '1.0.0',
  batch_id: BATCH_ID,
  reviewed_records: reviewedRecords,
};

const notes = `# ${BATCH_ID} Notes

## Outcome

This batch resolves the final text-only records in the first purpose-chip rollout.

- Total reviewed: ${records.length}
- Approved for import: ${records.length}
- Holds added: 0
- Drafts added: 0

## Why this batch matters

These icons were the last remaining items in the rollout and were blocked only by missing local Material visual payloads, not by weak semantic drafts.

## Why approval was safe

- both source names were direct and low-ambiguity
- both staged records already matched the existing SI wording pattern closely
- both had a strong approved reference record to anchor the final wording
`;

await writeJson(pilotPath(`${BATCH_ID}.json`), batchFile);
await writeJson(pilotPath(`${BATCH_ID}-reviewed-records.json`), reviewedRecordFile);
await writeJson(generatedPath(`${BATCH_ID}-summary.json`), summary);
await writeText(pilotPath(`${BATCH_ID}-notes.md`), notes);

console.log(`build-purpose-chip-text-review-batch: reviewed=${records.length} | approved=${records.length}`);
