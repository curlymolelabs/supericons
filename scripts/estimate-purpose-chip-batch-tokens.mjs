import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

const batchId = process.argv[2] || 'single-model-batch-01';
const batchPath = path.join(repoRoot, 'data', 'si-registry', 'pilot', 'purpose-chip', `${batchId}.json`);
const reviewedPath = path.join(repoRoot, 'data', 'si-registry', 'pilot', 'purpose-chip', `${batchId}-reviewed-records.json`);
const notesPath = path.join(repoRoot, 'data', 'si-registry', 'pilot', 'purpose-chip', `${batchId}-review-notes.md`);
const metricsPath = path.join(repoRoot, 'data', 'si-registry', 'generated', `${batchId}-metrics.json`);

const REVIEW_INSTRUCTIONS = `
Review each icon using the SI semantic workflow:
1. Confirm what the icon visually depicts.
2. Note motifs, ambiguity, and confusion risk.
3. Decide whether the current lexical draft fits the image and lane.
4. Improve purpose, use_when, avoid_when, semantic_tags, and synonyms where needed.
5. Record evidence_sources, confidence_score, and review_state.
6. Keep the output honest: visual inspection informs the recommendation but does not replace editorial judgment.
`.trim();

function estimateTokensFromText(text) {
  const normalized = String(text || '');
  return Math.ceil(normalized.length / 4);
}

async function readText(filePath) {
  return fs.readFile(filePath, 'utf8');
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

const batchText = await readText(batchPath);
const reviewedText = await readText(reviewedPath);
const notesText = await readText(notesPath);

const visibleInputTokensEstimate =
  estimateTokensFromText(REVIEW_INSTRUCTIONS) +
  estimateTokensFromText(batchText);

const visibleOutputTokensEstimate =
  estimateTokensFromText(reviewedText) +
  estimateTokensFromText(notesText);

const metrics = {
  schema_version: '1.0.0',
  batch_id: batchId,
  token_estimate_method: 'visible_text_characters_divided_by_four_rounded_up',
  note: 'This is a visible payload estimate only. It does not include hidden system prompts or reasoning tokens from the Codex runtime.',
  visible_input_tokens_estimate: visibleInputTokensEstimate,
  visible_output_tokens_estimate: visibleOutputTokensEstimate,
  visible_total_tokens_estimate: visibleInputTokensEstimate + visibleOutputTokensEstimate,
};

await writeJson(metricsPath, metrics);

console.log(`estimate-purpose-chip-batch-tokens: wrote ${path.relative(repoRoot, metricsPath)}`);
