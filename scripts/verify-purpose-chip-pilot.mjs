import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateRegistryRecord, REQUIRED_RECORD_FIELDS, OPTIONAL_RECORD_FIELDS } from '../lib/si-registry/record-shape.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const pilotDir = path.join(repoRoot, 'data', 'si-registry', 'pilot', 'purpose-chip');
const generatedDir = path.join(repoRoot, 'data', 'si-registry', 'generated');

const PILOT_LANES = [
  'ai-agent-workflows',
  'navigation-wayfinding',
  'status-feedback',
];

const PROTECTED_APPROVED_FIELDS = new Set(['editorialNotes', 'internalSignals']);
const ALLOWED_APPROVED_FIELDS = new Set(
  [...REQUIRED_RECORD_FIELDS, ...OPTIONAL_RECORD_FIELDS].filter((field) => !PROTECTED_APPROVED_FIELDS.has(field))
);

function pilotPath(fileName) {
  return path.join(pilotDir, fileName);
}

function generatedPath(fileName) {
  return path.join(generatedDir, fileName);
}

async function readJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read ${path.relative(repoRoot, filePath)}: ${error.message}`);
  }
}

function asArray(value, label) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value && typeof value === 'object') {
    for (const key of ['items', 'records', 'worklist', 'candidates', 'queue', 'visualReviewInputs', 'approvedRecords']) {
      if (Array.isArray(value[key])) {
        return value[key];
      }
    }
  }

  throw new Error(`Expected ${label} to be an array`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function countBy(values, selector) {
  return values.reduce((counts, value) => {
    const key = selector(value);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function getCandidateId(record) {
  return record?.icon_id ?? record?.candidate_icon_id ?? record?.candidate_id ?? null;
}

function getQueueCandidateId(record) {
  return record?.candidate_icon_id ?? record?.candidate_id ?? record?.icon_id ?? null;
}

function getWorklistLaneId(record) {
  return record?.purpose_chip_category_id ?? record?.lane_id ?? record?.jobCategory ?? null;
}

function hasOnlyAllowedApprovedFields(record) {
  return Object.keys(record).every((field) => ALLOWED_APPROVED_FIELDS.has(field));
}

const requiredFiles = [
  pilotPath('worklist.json'),
  pilotPath('candidate-records.json'),
  pilotPath('visual-review-inputs.json'),
  pilotPath('review-queue.json'),
  pilotPath('approved-records.json'),
  generatedPath('purpose-chip-pilot-summary.json'),
];

const missingFiles = [];
for (const filePath of requiredFiles) {
  try {
    await fs.access(filePath);
  } catch {
    missingFiles.push(path.relative(repoRoot, filePath));
  }
}

if (missingFiles.length > 0) {
  throw new Error(`Missing required pilot artifacts: ${missingFiles.join(', ')}`);
}

const worklist = asArray(await readJson(pilotPath('worklist.json')), 'worklist');
const candidates = asArray(await readJson(pilotPath('candidate-records.json')), 'candidate records');
const visualReviewInputs = asArray(await readJson(pilotPath('visual-review-inputs.json')), 'visual review inputs');
const reviewQueue = asArray(await readJson(pilotPath('review-queue.json')), 'review queue');
const approvedRecords = asArray(await readJson(pilotPath('approved-records.json')), 'approved records');
const generatedSummary = await readJson(generatedPath('purpose-chip-pilot-summary.json'));

assert(worklist.length === 150, `Expected 150 worklist records, received ${worklist.length}`);

const laneCounts = countBy(worklist, getWorklistLaneId);
for (const laneId of PILOT_LANES) {
  assert(laneCounts[laneId] === 50, `Expected 50 worklist records for ${laneId}, received ${laneCounts[laneId] || 0}`);
}

const candidateById = new Map();
for (const candidate of candidates) {
  const candidateId = getCandidateId(candidate);
  assert(typeof candidateId === 'string' && candidateId.length > 0, 'Every candidate record must have an icon identifier');
  assert(PILOT_LANES.includes(candidate.purpose_chip_category_id), `Candidate ${candidateId} is not assigned to a valid purpose-chip lane`);
  candidateById.set(candidateId, candidate);
}

assert(candidateById.size === candidates.length, 'Candidate records must have unique icon identifiers');

for (const item of reviewQueue) {
  const candidateId = getQueueCandidateId(item);
  assert(typeof candidateId === 'string' && candidateId.length > 0, 'Every review queue item must point to a candidate');
  assert(candidateById.has(candidateId), `Review queue item points to missing candidate: ${candidateId}`);
}

for (const input of visualReviewInputs) {
  const candidateId = getCandidateId(input);
  assert(typeof candidateId === 'string' && candidateId.length > 0, 'Every visual-review input must point to a candidate');
  assert(candidateById.has(candidateId), `Visual-review input points to missing candidate: ${candidateId}`);
  assert(
    ['svg_available', 'svg_available_local_material', 'metadata_only'].includes(input.visual_payload_status),
    `Visual-review input for ${candidateId} must declare svg_available, svg_available_local_material, or metadata_only`
  );
}

assert(generatedSummary.total_worklist_count === worklist.length, 'Generated summary worklist count must match the worklist');
assert(generatedSummary.candidate_count === candidates.length, 'Generated summary candidate count must match candidate records');
assert(
  generatedSummary.visual_review_input_count === visualReviewInputs.length,
  'Generated summary visual review count must match visual-review inputs'
);
const visualPayloadStatusCount = Object.values(generatedSummary.visual_payload_status_counts || {}).reduce((total, value) => total + value, 0);
assert(
  visualPayloadStatusCount === visualReviewInputs.length,
  'Generated summary visual payload status counts must add up to the visual-review input count'
);
const materialCoverage = generatedSummary.material_coverage || {};
const materialCoverageTotal = Object.values(materialCoverage.by_visual_payload_status || {}).reduce((total, value) => total + value, 0);
assert(
  materialCoverageTotal === visualReviewInputs.filter((input) => input.source_library === 'material').length,
  'Generated summary material coverage counts must add up to the number of Material visual-review inputs'
);
assert(generatedSummary.approved_record_count === approvedRecords.length, 'Generated summary approved count must match approved records');

for (const approvedRecord of approvedRecords) {
  const candidateId = getCandidateId(approvedRecord);
  assert(typeof candidateId === 'string' && candidateId.length > 0, 'Approved records must have an icon identifier');
  assert(candidateById.has(candidateId), `Approved record is not a subset of the candidate set: ${candidateId}`);
  assert(approvedRecord.source_group === 'free', `Approved record ${candidateId} must stay in the free source group`);
  assert(approvedRecord.access_tier === 'public_open_record', `Approved record ${candidateId} must be public_open_record`);
  validateRegistryRecord(approvedRecord);
  assert(hasOnlyAllowedApprovedFields(approvedRecord), `Approved record ${candidateId} exposes non-registry fields`);
  assert(!('editorialNotes' in approvedRecord), `Approved record ${candidateId} leaks editorialNotes`);
  assert(!('internalSignals' in approvedRecord), `Approved record ${candidateId} leaks internalSignals`);
}

console.log(
  [
    `verify-purpose-chip-pilot: worklist=${worklist.length}`,
    `candidates=${candidates.length}`,
    `visualReviewInputs=${visualReviewInputs.length}`,
    `reviewQueue=${reviewQueue.length}`,
    `approvedRecords=${approvedRecords.length}`,
    `laneCounts=${JSON.stringify(laneCounts)}`,
  ].join(' | ')
);
