import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

const candidatePath = path.join(repoRoot, 'data', 'si-registry', 'pilot', 'purpose-chip', 'candidate-records.json');
const visualPath = path.join(repoRoot, 'data', 'si-registry', 'pilot', 'purpose-chip', 'visual-review-inputs.json');
const queuePath = path.join(repoRoot, 'data', 'si-registry', 'pilot', 'purpose-chip', 'review-queue.json');

const BATCH_DEFINITIONS = Object.freeze({
  'single-model-batch-01': {
    purpose: 'Balanced SVG-ready single-model semantic evaluation slice for the purpose-chip pilot.',
    selection_notes: [
      'Keep only icons with real SVG payloads.',
      'Mix AI & Agents with Status & Feedback.',
      'Include both ready_for_editor_review and needs_visual_review cases.',
      'Use this batch to judge whether one strong model can satisfy the current minimum viable semantic standard.',
    ],
    iconIds: [
      'lucide:bot-message-square',
      'lucide:brain-circuit',
      'lucide:scan-search',
      'lucide:workflow',
      'tabler:circle-check',
      'tabler:alert-circle',
      'tabler:shield-check',
      'tabler:trending-up',
      'tabler:ban',
      'tabler:circle-x',
      'tabler:toggle-right',
      'tabler:trophy',
    ],
  },
  'single-model-batch-02': {
    purpose: 'Navigation-heavy single-model semantic evaluation slice using newly unlocked local Material SVG payloads.',
    selection_notes: [
      'Prioritize newly unlocked local Material SVGs from the Navigation lane.',
      'Keep a smaller mix of AI and Status icons so the batch is not single-lane only.',
      'Use this batch to judge whether the single-model path still holds up once navigation and UI-shell shapes are included.',
    ],
    iconIds: [
      'material:menu',
      'material:close',
      'material:home',
      'material:search',
      'material:settings',
      'material:arrow_back',
      'material:arrow_forward',
      'lucide:binary',
      'lucide:blocks',
      'lucide:code-xml',
      'tabler:alert-triangle',
      'tabler:power',
    ],
  },
  'single-model-batch-03': {
    purpose: 'Ambiguity-focused SVG-ready evaluation slice for testing the semantic approval rubric against broader and more context-sensitive icons.',
    selection_notes: [
      'Bias toward icons that remain broad, context-sensitive, or lane-drifting after lexical prefill.',
      'Mix abstract AI or developer-like symbols with status icons that are easy to misuse.',
      'Use this batch to judge whether the semantic approval rubric creates consistent outcomes on harder icons.',
    ],
    iconIds: [
      'tabler:sparkles',
      'tabler:send',
      'tabler:filter',
      'tabler:link',
      'tabler:refresh',
      'tabler:trash',
      'tabler:bolt',
      'tabler:flame',
      'lucide:brain',
      'lucide:brain-cog',
      'lucide:circuit-board',
      'lucide:search-code',
    ],
  },
});

function countBy(values, selector) {
  return values.reduce((counts, value) => {
    const key = selector(value);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function assertSvgReady(record) {
  if (!['svg_available', 'svg_available_local_material'].includes(record.visual_payload_status)) {
    throw new Error(`Batch icon is not SVG-ready: ${record.icon_id}`);
  }
}

const candidates = await readJson(candidatePath);
const visuals = await readJson(visualPath);
const queueItems = await readJson(queuePath);

const candidateById = new Map(candidates.map((record) => [record.icon_id, record]));
const visualById = new Map(visuals.map((record) => [record.icon_id, record]));
const queueById = new Map(queueItems.map((record) => [record.candidate_icon_id || record.icon_id, record]));

for (const [batchId, definition] of Object.entries(BATCH_DEFINITIONS)) {
  const records = definition.iconIds.map((iconId) => {
    const candidate = candidateById.get(iconId);
    const visual = visualById.get(iconId);
    const queue = queueById.get(iconId);

    if (!candidate) throw new Error(`Missing candidate record for ${iconId}`);
    if (!visual) throw new Error(`Missing visual input for ${iconId}`);
    if (!queue) throw new Error(`Missing review queue item for ${iconId}`);

    assertSvgReady(visual);

    return {
      icon_id: iconId,
      purpose_chip_category_id: candidate.purpose_chip_category_id,
      purpose_chip_category_label: candidate.purpose_chip_category_label,
      queue_outcome: queue.queue_outcome || queue.queue,
      routing_band: queue.routing_band,
      current_candidate_record: candidate,
      visual_review_input: visual,
    };
  });

  const batch = {
    schema_version: '1.0.0',
    batch_id: batchId,
    purpose: definition.purpose,
    selection_notes: definition.selection_notes,
    total_icons: records.length,
    counts: {
      by_lane: countBy(records, (record) => record.purpose_chip_category_id),
      by_queue_outcome: countBy(records, (record) => record.queue_outcome),
      by_visual_payload_status: countBy(records, (record) => record.visual_review_input.visual_payload_status),
    },
    records,
  };

  const batchPath = path.join(repoRoot, 'data', 'si-registry', 'pilot', 'purpose-chip', `${batchId}.json`);
  await writeJson(batchPath, batch);
  console.log(`build-purpose-chip-single-model-batch: wrote ${path.relative(repoRoot, batchPath)} with ${records.length} records`);
}
