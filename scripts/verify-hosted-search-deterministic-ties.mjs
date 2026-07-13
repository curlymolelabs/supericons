import assert from 'node:assert/strict';

import { rerankHostedSearchCandidates } from '../lib/hosted-search-core.js';

const candidates = [
  {
    icon_id: 'lucide:chevron-down',
    name: 'chevron down',
    source_library: 'lucide',
    style: 'outline',
    icon_type: 'svg',
    lexical_rank: 1,
  },
  {
    icon_id: 'heroicons:chevron-down',
    name: 'chevron down',
    source_library: 'heroicons',
    style: 'outline',
    icon_type: 'svg',
    lexical_rank: 1,
  },
  {
    icon_id: 'tabler:chevron-down',
    name: 'chevron down',
    source_library: 'tabler',
    style: 'outline',
    icon_type: 'svg',
    lexical_rank: 1,
  },
];

function rankedIds(rows) {
  return rerankHostedSearchCandidates('chevron', rows).map((row) => row.icon_id);
}

const forward = rankedIds(candidates);
const reverse = rankedIds([...candidates].reverse());
const rotated = rankedIds([candidates[1], candidates[2], candidates[0]]);

assert.deepEqual(reverse, forward);
assert.deepEqual(rotated, forward);
assert.deepEqual(forward, [
  'heroicons:chevron-down',
  'lucide:chevron-down',
  'tabler:chevron-down',
]);

console.log(JSON.stringify({
  status: 'ok',
  tested_input_orders: 3,
  deterministic_icon_order: forward,
}, null, 2));
