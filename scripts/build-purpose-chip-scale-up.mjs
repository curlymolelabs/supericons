import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildPurposeChipScaleUpArtifacts } from '../lib/si-registry/purpose-chip-scale-up.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const pilotDir = path.join(repoRoot, 'data', 'si-registry', 'pilot', 'purpose-chip');
const generatedDir = path.join(repoRoot, 'data', 'si-registry', 'generated');

function pilotPath(fileName) {
  return path.join(pilotDir, fileName);
}

function generatedPath(fileName) {
  return path.join(generatedDir, fileName);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

const worklist = await readJson(pilotPath('worklist.json'));
const candidateRecords = await readJson(pilotPath('candidate-records.json'));
const visualReviewInputs = await readJson(pilotPath('visual-review-inputs.json'));
const approvedRecords = await readJson(pilotPath('approved-records.json'));
const editorHoldQueue = await readJson(pilotPath('editor-hold-queue.json'));
const promotionDecisions = await readJson(pilotPath('promotion-decisions.json'));

const { stagedRecords, nextSteps, scaleUpSummary, fullCoverageSummary } = buildPurposeChipScaleUpArtifacts({
  worklist,
  candidateRecords,
  visualReviewInputs,
  approvedRecords,
  editorHoldQueue,
  promotionDecisions,
});

await writeJson(pilotPath('automation-staged-records.json'), stagedRecords);
await writeJson(pilotPath('automation-next-steps.json'), nextSteps);
await writeJson(generatedPath('purpose-chip-scale-up-summary.json'), scaleUpSummary);
await writeJson(generatedPath('purpose-chip-full-coverage-summary.json'), fullCoverageSummary);

console.log(
  `build-purpose-chip-scale-up: staged=${stagedRecords.length}, next-steps=${nextSteps.length}, total=${fullCoverageSummary.total_icons}`
);
