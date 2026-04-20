import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import publicIconIndex from '../public/icon-index.json' with { type: 'json' };
import { buildReviewQueue, summarizeReviewQueue } from '../lib/si-registry/review-routing.js';
import { buildPurposeChipCandidateRecords } from '../lib/si-registry/semantic-prefill.js';
import { buildVisualReviewInputs } from '../lib/si-registry/visual-review-prep.js';
import { buildPurposeChipWorklist, summarizePurposeChipWorklist } from '../lib/si-registry/purpose-chip-pilot.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const pilotDir = path.join(repoRoot, 'data', 'si-registry', 'pilot', 'purpose-chip');
const generatedDir = path.join(repoRoot, 'data', 'si-registry', 'generated');

function writeJson(filePath, value) {
  return fs.mkdir(path.dirname(filePath), { recursive: true }).then(() => fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8'));
}

async function readJsonOrDefault(filePath, fallbackValue) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return fallbackValue;
    }
    throw error;
  }
}

function buildIconIndexMap(iconIndex) {
  const entries = iconIndex?.icons || [];
  const map = new Map();
  for (const icon of entries) {
    map.set(`${icon.lib}:${icon.id}`, icon);
  }
  return map;
}

function countBy(values, selector) {
  return values.reduce((counts, value) => {
    const key = selector(value);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function buildMaterialCoverageSummary(visualReviewInputs) {
  const materialInputs = visualReviewInputs.filter((item) => item.source_library === 'material');
  return {
    total_material_icons: materialInputs.length,
    by_visual_payload_status: countBy(materialInputs, (item) => item.visual_payload_status || 'unknown'),
    navigation_wayfinding_material_with_svg: materialInputs.filter(
      (item) =>
        item.purpose_chip_category_id === 'navigation-wayfinding' &&
        item.visual_payload_status !== 'metadata_only'
    ).length,
  };
}

function assertPilotCounts({ worklist, worklistSummary, candidateRecords, visualReviewInputs }) {
  if (worklist.length !== 150) {
    throw new Error(`Purpose-chip worklist must contain 150 records, received ${worklist.length}`);
  }

  for (const laneId of ['ai-agent-workflows', 'navigation-wayfinding', 'status-feedback']) {
    if (worklistSummary[laneId] !== 50) {
      throw new Error(`Purpose-chip lane ${laneId} must contain 50 records, received ${worklistSummary[laneId]}`);
    }
  }

  if (candidateRecords.length !== worklist.length) {
    throw new Error(`Purpose-chip candidate count must match the worklist count, received ${candidateRecords.length} vs ${worklist.length}`);
  }

  if (visualReviewInputs.length !== worklist.length) {
    throw new Error(`Purpose-chip visual-review count must match the worklist count, received ${visualReviewInputs.length} vs ${worklist.length}`);
  }
}

async function main() {
  const iconIndexMap = buildIconIndexMap(publicIconIndex);
  const worklist = buildPurposeChipWorklist();
  const candidateRecords = buildPurposeChipCandidateRecords(worklist, iconIndexMap);
  const visualReviewInputs = buildVisualReviewInputs(publicIconIndex.icons || [], candidateRecords);
  const reviewQueue = buildReviewQueue(candidateRecords);
  const approvedRecords = await readJsonOrDefault(path.join(pilotDir, 'approved-records.json'), []);
  const worklistSummary = summarizePurposeChipWorklist(worklist);
  const reviewQueueSummary = summarizeReviewQueue(reviewQueue);
  const visualPayloadStatusCounts = countBy(visualReviewInputs, (item) => item.visual_payload_status || 'unknown');
  const materialCoverage = buildMaterialCoverageSummary(visualReviewInputs);

  assertPilotCounts({
    worklist,
    worklistSummary,
    candidateRecords,
    visualReviewInputs,
  });

  const summary = {
    schema_version: '1.0.0',
    generated_at: new Date().toISOString(),
    pilot_id: 'purpose-chip-semantic-ops',
    total_worklist_count: worklist.length,
    lane_counts: worklistSummary,
    candidate_count: candidateRecords.length,
    visual_review_input_count: visualReviewInputs.length,
    visual_payload_status_counts: visualPayloadStatusCounts,
    material_coverage: materialCoverage,
    confidence_bands: reviewQueueSummary.byBand,
    review_queue_counts: reviewQueueSummary.byOutcome,
    approved_record_count: approvedRecords.length,
    approved_import_path: 'data/si-registry/pilot/purpose-chip/approved-records.json',
  };

  const outputFiles = [
    [path.join(pilotDir, 'worklist.json'), worklist],
    [path.join(pilotDir, 'candidate-records.json'), candidateRecords],
    [path.join(pilotDir, 'visual-review-inputs.json'), visualReviewInputs],
    [path.join(pilotDir, 'review-queue.json'), reviewQueue],
    [path.join(pilotDir, 'approved-records.json'), approvedRecords],
    [path.join(generatedDir, 'purpose-chip-pilot-summary.json'), summary],
  ];

  for (const [filePath, value] of outputFiles) {
    await writeJson(filePath, value);
  }

  console.log(
    `build-purpose-chip-pilot: wrote ${outputFiles
      .map(([filePath]) => path.relative(repoRoot, filePath))
      .join(', ')}`
  );
  console.log(
    `build-purpose-chip-pilot: worklist=${worklist.length}, candidates=${candidateRecords.length}, review=${reviewQueue.length}, approved=${approvedRecords.length}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
