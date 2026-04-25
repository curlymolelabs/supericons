import assert from 'node:assert/strict';
import test from 'node:test';

import { auditFinalRecords } from '../../lib/screenshot-quality/quality-audit.js';

test('flags repeated depicts across modifier variants', () => {
  const issues = auditFinalRecords({
    records: [
      {
        icon_id: 'mingcute:calendar',
        source_name: 'calendar',
        depicts: 'Calendar frame with top binding tabs and a grid below',
      },
      {
        icon_id: 'mingcute:calendar_add',
        source_name: 'calendar_add',
        depicts: 'Calendar frame with top binding tabs and a grid below',
      },
      {
        icon_id: 'mingcute:calendar_x',
        source_name: 'calendar_x',
        depicts: 'Calendar frame with top binding tabs and a grid below',
      },
    ],
  });

  assert.equal(issues.some((item) => item.code === 'duplicate_depicts_modifier_family'), true);
});

test('flags missing visible modifier words', () => {
  const issues = auditFinalRecords({
    records: [
      {
        icon_id: 'mingcute:camera_2_off',
        source_name: 'camera_2_off',
        depicts: 'Camera body with circular lens',
      },
      {
        icon_id: 'mingcute:camera_rotate',
        source_name: 'camera_rotate',
        depicts: 'Camera body with circular lens',
      },
      {
        icon_id: 'mingcute:camera_2_ai',
        source_name: 'camera_2_ai',
        depicts: 'Camera body with circular lens',
      },
    ],
  });

  assert.equal(issues.some((item) => item.code === 'missing_off_visual'), true);
  assert.equal(issues.some((item) => item.code === 'missing_rotate_visual'), true);
  assert.equal(issues.some((item) => item.code === 'missing_ai_visual'), true);
});
