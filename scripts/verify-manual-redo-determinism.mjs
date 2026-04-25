import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  isDeterministicManualRedoSelection,
  loadAndValidateDeterministicManualRedoSelection,
} from '../lib/si-registry/manual-redo-determinism.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const manualRedoDir = path.join(repoRoot, 'data', 'si-registry', 'manual-redo');

async function main() {
  const entries = await fs.readdir(manualRedoDir, { withFileTypes: true });
  const selectionFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('-selection.json'))
    .map((entry) => path.join(manualRedoDir, entry.name))
    .sort();

  let checkedCount = 0;
  let skippedCount = 0;

  for (const filePath of selectionFiles) {
    const parsed = JSON.parse(await fs.readFile(filePath, 'utf8'));
    if (!isDeterministicManualRedoSelection(parsed)) {
      skippedCount += 1;
      continue;
    }

    await loadAndValidateDeterministicManualRedoSelection(filePath, repoRoot);
    checkedCount += 1;
  }

  console.log(
    `verify-manual-redo-determinism: ok (${checkedCount} deterministic selection file${checkedCount === 1 ? '' : 's'} checked, ${skippedCount} legacy selection file${skippedCount === 1 ? '' : 's'} skipped)`
  );
}

await main();
