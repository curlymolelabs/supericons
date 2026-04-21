import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import libraryOrder from '../../data/si-registry/automation/library-order.json' with { type: 'json' };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..', '..');
const automationRoot = path.join(repoRoot, 'data', 'si-registry', 'automation');

export function getLibraryAutomationOrder() {
  return [...libraryOrder.libraries].sort((left, right) => left.order - right.order);
}

export function getLibraryAutomationConfig(libraryId) {
  return getLibraryAutomationOrder().find((entry) => entry.library_id === libraryId) || null;
}

function getBatchSelectionPath(batchId) {
  return path.join(automationRoot, `${batchId}-selection.json`);
}

export async function getSemanticAutomationBatchConfig(batchId) {
  const selectionPath = getBatchSelectionPath(batchId);
  try {
    const parsed = JSON.parse(await fs.readFile(selectionPath, 'utf8'));
    const libraryConfig = getLibraryAutomationConfig(parsed.library_id);
    if (libraryConfig) {
      return {
        library_label: libraryConfig.label,
        template_mode: libraryConfig.template_mode,
        ...parsed,
      };
    }
    return parsed;
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

export async function listSemanticAutomationBatchIds() {
  const entries = await fs.readdir(automationRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.includes('-batch-') && entry.name.endsWith('-selection.json'))
    .map((entry) => entry.name.replace(/-selection\.json$/i, ''))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
}
