import libraryOrder from '../../data/si-registry/automation/library-order.json' with { type: 'json' };
import mingcuteBatchSelection from '../../data/si-registry/automation/mingcute-batch-01-selection.json' with { type: 'json' };
import mingcuteBatch02Selection from '../../data/si-registry/automation/mingcute-batch-02-selection.json' with { type: 'json' };

const BATCH_SELECTIONS = Object.freeze({
  [mingcuteBatchSelection.batch_id]: mingcuteBatchSelection,
  [mingcuteBatch02Selection.batch_id]: mingcuteBatch02Selection,
});

export function getLibraryAutomationOrder() {
  return [...libraryOrder.libraries].sort((left, right) => left.order - right.order);
}

export function getLibraryAutomationConfig(libraryId) {
  return getLibraryAutomationOrder().find((entry) => entry.library_id === libraryId) || null;
}

export function getSemanticAutomationBatchConfig(batchId) {
  return BATCH_SELECTIONS[batchId] || null;
}

export function listSemanticAutomationBatchIds() {
  return Object.keys(BATCH_SELECTIONS);
}
