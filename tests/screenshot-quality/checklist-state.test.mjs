import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyScreenshotQualityState } from '../../lib/screenshot-quality/state.js';

function record(sourceName, depicts) {
  return {
    icon_id: `mingcute:${sourceName}`,
    source_library: 'mingcute',
    source_name: sourceName,
    label: sourceName,
    depicts,
    semantic_tags: [sourceName],
    synonyms: [sourceName],
    use_when: `Use for ${sourceName}.`,
    avoid_when: `Do not use for not ${sourceName}.`,
  };
}

test('reviewed pending artifacts are not treated as untouched', () => {
  const state = classifyScreenshotQualityState({
    library: 'mingcute',
    liveRecords: [record('a', 'old visual wording')],
    screenshotConcepts: [
      {
        icon_id: 'mingcute:a',
        source_name: 'a',
        screenshot_files: ['mingcute_a_line.png'],
        has_live_registry_match: true,
      },
    ],
    recognizedArtifacts: [
      {
        fileName: 'mingcute-screenshot-batch-001-final-records.json',
        records: [record('a', 'new visual wording')],
      },
    ],
  });

  assert.equal(state.reviewed_pending.length, 1);
  assert.equal(state.untouched.length, 0);
});
