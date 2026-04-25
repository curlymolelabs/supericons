import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertNoReviewedPendingOverlap,
  selectNextScreenshotBatch,
} from '../../lib/screenshot-quality/batch-selection.js';

test('selects only requested number of untouched records', () => {
  const result = selectNextScreenshotBatch({
    untouched: [
      { icon_id: 'mingcute:a', source_name: 'a' },
      { icon_id: 'mingcute:b', source_name: 'b' },
      { icon_id: 'mingcute:c', source_name: 'c' },
    ],
    size: 2,
  });

  assert.deepEqual(
    result.items.map((item) => item.icon_id),
    ['mingcute:a', 'mingcute:b']
  );
});

test('rejects reviewed pending overlap', () => {
  assert.throws(
    () =>
      assertNoReviewedPendingOverlap({
        selectedItems: [{ icon_id: 'mingcute:a' }],
        reviewedPending: [{ icon_id: 'mingcute:a' }],
      }),
    /overlaps reviewed-pending/
  );
});
