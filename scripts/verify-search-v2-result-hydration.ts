import assert from 'node:assert/strict';

import { hydrateFinalSvgRows } from '../supabase/functions/_shared/search-engine/result-hydration.ts';
import type { CandidateRow } from '../supabase/functions/_shared/search-engine/types.ts';

const lightweightRows: CandidateRow[] = [
  {
    icon_id: 'lucide:settings',
    name: 'settings',
    source_library: 'lucide',
    style: 'outline',
    icon_type: 'svg',
    lexical_rank: 4.5,
    registry_rank: 1.25,
    avoid_rank: 0,
    query_variant: 'settings',
    query_variant_rank: 0,
    intent_boost: 6,
    intent_penalty: 0,
  },
  {
    icon_id: 'material:settings',
    name: 'settings',
    source_library: 'material',
    style: 'solid',
    icon_type: 'material',
    lexical_rank: 3.5,
    registry_rank: 0.5,
    avoid_rank: 0,
  },
];

const hydrated = hydrateFinalSvgRows(lightweightRows, [
  { icon_id: 'material:settings', svg: null },
  { icon_id: 'lucide:settings', svg: '<svg>settings</svg>' },
]);

assert.deepEqual(hydrated, [
  { ...lightweightRows[0], svg: '<svg>settings</svg>' },
  { ...lightweightRows[1], svg: null },
]);
assert.deepEqual(lightweightRows.map((row) => row.icon_id), [
  'lucide:settings',
  'material:settings',
]);
assert.throws(
  () => hydrateFinalSvgRows(lightweightRows, [{ icon_id: 'lucide:settings', svg: '<svg />' }]),
  /Final SVG row is missing for material:settings/,
);

console.log(JSON.stringify({
  status: 'ok',
  final_order_preserved: true,
  svg_string_preserved: true,
  null_svg_preserved: true,
  missing_final_row_fails_closed: true,
}, null, 2));
