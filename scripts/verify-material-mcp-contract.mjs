import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { getMaterialMcpPreset as getRootPreset } from '../material-export.js';
import { getMaterialMcpPreset as getPackagePreset } from '../mcp/material-export.js';

const expectedOutline = { fill: 0, wght: 300, grad: 0, opsz: 24, snapped: false };
const expectedSolid = { fill: 1, wght: 400, grad: 0, opsz: 24, snapped: false };

assert.deepEqual(getRootPreset('outline'), expectedOutline);
assert.deepEqual(getRootPreset('any'), expectedOutline);
assert.deepEqual(getRootPreset('solid'), expectedSolid);
assert.deepEqual(getPackagePreset('outline'), expectedOutline);
assert.deepEqual(getPackagePreset('any'), expectedOutline);
assert.deepEqual(getPackagePreset('solid'), expectedSolid);

const index = JSON.parse(readFileSync(new URL('../public/icon-index.json', import.meta.url), 'utf8'));
const materialIcons = index.icons.filter((icon) => icon.lib === 'material');
assert.equal(materialIcons.length, 4262);
assert.equal(new Set(materialIcons.map((icon) => icon.id)).size, 4262);

const variantVerifier = readFileSync(new URL('./verify-mcp-variant-access.mjs', import.meta.url), 'utf8');
assert.doesNotMatch(variantVerifier, /<material-snapshot\s*\/>/);
assert.match(variantVerifier, /Verification requires a real SVG/);

const localServer = readFileSync(new URL('../mcp/index.js', import.meta.url), 'utf8');
assert.match(localServer, /count: 4262, outlineCount: 4262, solidCount: 4262/);

console.log(JSON.stringify({
  status: 'ok',
  material_ids: materialIcons.length,
  outline_preset: expectedOutline,
  solid_preset: expectedSolid,
  fake_svg_placeholder_removed: true,
  package_and_root_presets_match: true,
}, null, 2));
