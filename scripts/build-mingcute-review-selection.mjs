import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const automationRoot = path.join(repoRoot, 'data', 'si-registry', 'automation');
const libraryDir = path.join(automationRoot, 'mingcute');

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function toSelectionFileName(batchId) {
  return `${batchId.replace(/^mingcute-/, '')}-selection.json`;
}

async function main() {
  const sourceBatchId = process.argv[2];
  const mode = process.argv[3];

  if (!sourceBatchId || !['editor', 'visual'].includes(mode)) {
    throw new Error('Usage: node scripts/build-mingcute-review-selection.mjs <source-batch-id> <editor|visual>');
  }

  const sourceSummaryPath = path.join(automationRoot, sourceBatchId, 'summary.json');
  const sourceSummary = await readJson(sourceSummaryPath);
  const sourceBatchLabel = sourceSummary.library_label || 'MingCute';
  const batchId = `mingcute-${sourceBatchId.replace(/^mingcute-/, '')}-${mode}-review`;
  const selectionPath = path.join(libraryDir, toSelectionFileName(batchId));

  const selection = {
    schema_version: '1.0.0',
    batch_id: batchId,
    source_batch_id: sourceBatchId,
    library_id: 'mingcute',
    library_label: sourceBatchLabel,
    purpose: mode === 'editor'
      ? `Review the high-confidence MingCute queue from ${sourceBatchId} before moving deeper into visual-only cases.`
      : `Review the visual-confirmation MingCute queue from ${sourceBatchId} after the high-confidence editor pass is complete.`,
    selection_mode: mode === 'editor' ? 'remaining_editor_review_queue' : 'remaining_visual_review_queue',
    selection_notes: mode === 'editor'
      ? [
          'Pull only unresolved MingCute icons from the source batch that are still marked ready_for_editor_review.',
          'Keep the batch reproducible by saving the generated batch records after the first run.',
          'Hold or keep as draft any icon that still mixes too many product meanings.',
        ]
      : [
          'Pull only unresolved MingCute icons from the source batch that are still marked needs_visual_review.',
          'Keep the batch reproducible by saving the generated batch records after the first run.',
          'Hold or keep as draft any icon that still needs stronger product context after visual confirmation.',
        ],
  };

  await writeJson(selectionPath, selection);

  console.log(`build-mingcute-review-selection: wrote ${path.relative(repoRoot, selectionPath).replaceAll('\\', '/')}`);
  console.log(`build-mingcute-review-selection: batch=${batchId}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
