import fs from 'node:fs';

export function selectNextScreenshotBatch({ untouched, size }) {
  if (!Number.isInteger(size) || size <= 0) {
    throw new Error(`Batch size must be a positive integer. Received: ${size}`);
  }

  return {
    items: untouched.slice(0, size),
    counts: {
      requested: size,
      selected: Math.min(size, untouched.length),
    },
  };
}

export function assertBatchIdUnused({ batchId, manualRedoDir }) {
  const existingFileNames = fs.existsSync(manualRedoDir) ? fs.readdirSync(manualRedoDir) : [];
  const conflicts = existingFileNames.filter((fileName) => fileName.includes(batchId));
  if (conflicts.length > 0) {
    throw new Error(`Batch id ${batchId} conflicts with existing files: ${conflicts.join(', ')}`);
  }
}

export function assertNoReviewedPendingOverlap({ selectedItems, reviewedPending }) {
  const pending = new Set(reviewedPending.map((item) => item.icon_id));
  const overlap = selectedItems.filter((item) => pending.has(item.icon_id));
  if (overlap.length > 0) {
    throw new Error(
      `Selected batch overlaps reviewed-pending icons: ${overlap
        .map((item) => item.icon_id)
        .join(', ')}`
    );
  }
}
