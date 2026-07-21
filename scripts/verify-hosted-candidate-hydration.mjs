import assert from 'node:assert/strict';

import { createHostedIconHydrator } from '../mcp/hosted-candidate-hydration.js';

const hydrate = createHostedIconHydrator([
  {
    id: 'settings',
    name: 'Settings',
    lib: 'lucide',
    type: 'svg',
    style: 'outline',
    svg: '<svg>outline settings</svg>',
  },
  {
    id: 'settings',
    name: 'Settings filled',
    lib: 'lucide',
    type: 'svg',
    style: 'solid',
    svg: '<svg>solid settings</svg>',
  },
  {
    id: 'home',
    name: 'Home',
    lib: 'material',
    type: 'font',
    style: 'outline',
  },
  {
    id: 'search',
    name: 'Search',
    lib: 'lucide',
    type: 'svg',
    style: 'outline',
    svg: '<svg>outline search</svg>',
  },
]);

const outline = hydrate({
  icon_id: 'lucide:settings',
  name: 'settings',
  source_library: 'lucide',
  style: 'outline',
  icon_type: 'svg',
  semantic: {
    label: 'Settings',
    synonyms: ['preferences'],
  },
});
assert.equal(outline.svg, '<svg>outline settings</svg>');
assert.equal(outline.hosted, true);
assert.deepEqual(outline.semantic, {
  label: 'Settings',
  synonyms: ['preferences'],
});

const solid = hydrate({
  icon_id: 'lucide:settings',
  source_library: 'lucide',
  style: 'solid',
  icon_type: 'svg',
});
assert.equal(solid.svg, '<svg>solid settings</svg>');
assert.equal(solid.style, 'solid');

const missingSolid = hydrate({
  icon_id: 'lucide:search',
  source_library: 'lucide',
  style: 'solid',
  icon_type: 'svg',
});
assert.equal(missingSolid.svg, '<svg>outline search</svg>');
assert.equal(missingSolid.style, 'outline');

const hostedSvg = hydrate({
  icon_id: 'lucide:settings',
  source_library: 'lucide',
  style: 'outline',
  svg: '<svg>hosted settings</svg>',
});
assert.equal(hostedSvg.svg, '<svg>hosted settings</svg>');

const material = hydrate({
  icon_id: 'material:home',
  source_library: 'material',
  style: 'outline',
  icon_type: 'font',
});
assert.equal(material.svg, null);
assert.equal(material.lib, 'material');

assert.equal(hydrate({
  icon_id: 'unknown:missing',
  source_library: 'unknown',
  style: 'outline',
}), null);

console.log(JSON.stringify({
  status: 'ok',
  local_outline_svg_restored: true,
  local_solid_svg_restored: true,
  fallback_svg_style_reported_accurately: true,
  hosted_svg_preserved: true,
  hosted_semantic_profile_preserved: true,
  material_deferred_hydration_preserved: true,
  missing_non_material_rejected: true,
}, null, 2));
