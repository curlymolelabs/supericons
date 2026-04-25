import assert from 'node:assert/strict';
import test from 'node:test';

import { mergeFinalRecordsIntoApprovedRecords } from '../../lib/screenshot-quality/promotion.js';

test('promotes public fields while preserving structural fields', () => {
  const approved = [
    {
      icon_id: 'mingcute:chrome',
      source_group: 'free',
      source_library: 'mingcute',
      source_name: 'chrome',
      label: 'Chrome',
      purpose: 'Show Chrome.',
      category: 'brand_identity',
      semantic_tags: ['chrome'],
      use_when: 'Use for Chrome.',
      avoid_when: 'Do not use for other browsers.',
      version: '1.0.0',
      status: 'reviewed',
      access_tier: 'public_open_record',
      projection_policy: 'future_public_record',
      is_premium: false,
      depicts: 'old',
      review_state: 'human_reviewed',
      evidence: ['source_name'],
      synonyms: ['chrome'],
    },
  ];

  const merged = mergeFinalRecordsIntoApprovedRecords({
    approvedRecords: approved,
    finalRecords: [
      {
        icon_id: 'mingcute:chrome',
        source_library: 'mingcute',
        source_name: 'chrome',
        label: 'Chrome',
        depicts: 'circle divided into three curved sections around a small center circle',
        semantic_tags: ['chrome'],
        synonyms: ['chrome'],
        use_when: 'Use for Chrome.',
        avoid_when: 'Do not use for other browsers.',
      },
    ],
  });

  assert.equal(merged[0].depicts, 'circle divided into three curved sections around a small center circle');
  assert.equal(merged[0].access_tier, 'public_open_record');
  assert.equal(merged[0].source_group, 'free');
});
