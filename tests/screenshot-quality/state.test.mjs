import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildScreenshotConcepts,
  classifyScreenshotQualityState,
  isRecognizedScreenshotFinalRecordsFile,
} from '../../lib/screenshot-quality/state.js';

function publicRecord(sourceName, depicts) {
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

test('recognizes screenshot final records files', () => {
  assert.equal(
    isRecognizedScreenshotFinalRecordsFile(
      'mingcute-screenshot-batch-001-final-records.json',
      'mingcute'
    ),
    true
  );
  assert.equal(
    isRecognizedScreenshotFinalRecordsFile('mingcute-screenshot-batch-001-packet.json', 'mingcute'),
    false
  );
});

test('classifies completed live and reviewed pending records', () => {
  const liveRecords = [publicRecord('alpha', 'old alpha wording'), publicRecord('beta', 'beta wording')];
  const state = classifyScreenshotQualityState({
    library: 'mingcute',
    liveRecords,
    screenshotConcepts: [
      {
        icon_id: 'mingcute:alpha',
        source_name: 'alpha',
        screenshot_files: ['mingcute_alpha_line.png'],
        has_live_registry_match: true,
      },
      {
        icon_id: 'mingcute:beta',
        source_name: 'beta',
        screenshot_files: ['mingcute_beta_line.png'],
        has_live_registry_match: true,
      },
      {
        icon_id: null,
        source_name: null,
        screenshot_files: ['mingcute_gamma_line.png'],
        has_live_registry_match: false,
      },
    ],
    recognizedArtifacts: [
      {
        fileName: 'mingcute-screenshot-batch-001-final-records.json',
        records: [publicRecord('alpha', 'new alpha wording'), publicRecord('beta', 'beta wording')],
      },
    ],
  });

  assert.deepEqual(
    state.reviewed_pending.map((item) => item.icon_id),
    ['mingcute:alpha']
  );
  assert.deepEqual(
    state.completed_live.map((item) => item.icon_id),
    ['mingcute:beta']
  );
  assert.equal(state.unmapped.length, 1);
});

test('builds screenshot concepts with lowercase fallback mapping', () => {
  const concepts = buildScreenshotConcepts({
    library: 'mingcute',
    liveRecords: [publicRecord('abs', 'ABS text')],
    mappingEntries: [
      {
        base_concept_id: 'ABS',
        asset_style: 'outline',
        recommended_screenshot_file_name: 'mingcute_ABS_line.png',
        registry_source_name_candidate: 'ABS',
      },
    ],
  });

  assert.equal(concepts.length, 1);
  assert.equal(concepts[0].icon_id, 'mingcute:abs');
  assert.equal(concepts[0].matched_by, 'lowercase');
});
