import assert from 'node:assert/strict';
import test from 'node:test';

import { buildFinalRecordsFromDepictsOnly, buildReviewPacket } from '../../lib/screenshot-quality/review-packet.js';

const liveRecord = {
  icon_id: 'mingcute:chrome',
  source_library: 'mingcute',
  source_name: 'chrome',
  label: 'Chrome',
  depicts: 'old',
  semantic_tags: ['chrome'],
  synonyms: ['chrome'],
  use_when: 'Use for Chrome.',
  avoid_when: 'Do not use for other browsers.',
};

test('builds agent packet from selected icons and live records', () => {
  const packet = buildReviewPacket({
    library: 'mingcute',
    batchId: 'mingcute-screenshot-batch-034',
    selectedItems: [
      {
        icon_id: 'mingcute:chrome',
        source_name: 'chrome',
        screenshot_files: ['mingcute_chrome_fill.png', 'mingcute_chrome_line.png'],
      },
    ],
    liveRecords: [liveRecord],
    screenshotRoot: 'output/icon_screenshot/mingcute',
  });

  assert.equal(packet.items[0].line_screenshot, 'output/icon_screenshot/mingcute/mingcute_chrome_line.png');
  assert.equal(packet.items[0].fill_screenshot, 'output/icon_screenshot/mingcute/mingcute_chrome_fill.png');
});

test('merges depicts-only agent output with live public records', () => {
  const records = buildFinalRecordsFromDepictsOnly({
    liveRecords: [liveRecord],
    agentDepicts: [
      {
        icon_id: 'mingcute:chrome',
        depicts: 'circle divided into three curved sections around a small center circle',
      },
    ],
  });

  assert.equal(records[0].depicts, 'circle divided into three curved sections around a small center circle');
  assert.deepEqual(records[0].semantic_tags, ['chrome']);
});
