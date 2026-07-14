import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { MATERIAL_EXPORT_SOURCE } from '../material-export.js';
import {
  checksumMaterialSvg,
  normalizeAndValidateMaterialSvg,
  validateMaterialSvg,
} from '../lib/material-asset-pipeline.js';
import { runMaterialSeed } from './seed-material-owned-cache.js';

const expectedRevision = '30f8fddd293b1f0189896dc4aaecdfaba1d37ae0';
assert.equal(MATERIAL_EXPORT_SOURCE.ref, expectedRevision);
assert.match(MATERIAL_EXPORT_SOURCE.baseUrl, new RegExp(expectedRevision));
assert.doesNotMatch(MATERIAL_EXPORT_SOURCE.baseUrl, /\/master\//);

const normalized = normalizeAndValidateMaterialSvg('<svg viewBox="0 0 24 24"><path d="M0 0h1v1z"/></svg>');
assert.match(normalized, /fill="currentColor"/);
assert.equal(validateMaterialSvg(normalized).valid, true);
assert.equal(checksumMaterialSvg(normalized).length, 64);
assert.equal(validateMaterialSvg('<svg><script/></svg>').valid, false);
assert.equal(validateMaterialSvg('<svg viewBox="0 0 24 24"><image href="https://example.com/x"/></svg>').valid, false);

const reportPath = join(tmpdir(), 'supericons-material-seed-verification.json');
await rm(reportPath, { force: true });
const report = await runMaterialSeed([
  '--icons=settings',
  '--presets=default,filled',
  '--dry-run',
  '--concurrency=2',
  `--report=${reportPath}`,
]);
const exported = JSON.parse(readFileSync(reportPath, 'utf8'));
await rm(reportPath, { force: true });

assert.equal(report.failed_assets, 0);
assert.equal(report.successful_assets, 2);
assert.equal(exported.source_revision, expectedRevision);
assert.deepEqual(exported.assets.map((asset) => asset.variant).sort(), ['outline', 'solid']);
assert.ok(exported.assets.every((asset) => /^[a-f0-9]{64}$/.test(asset.checksum)));

const edgeFunction = readFileSync(new URL('../supabase/functions/serve-material-snapshot/index.ts', import.meta.url), 'utf8');
assert.match(edgeFunction, new RegExp(expectedRevision));
assert.doesNotMatch(edgeFunction, /material-design-icons\/master/);

console.log(JSON.stringify({
  status: 'ok',
  source_revision: expectedRevision,
  selected_icon_assets_validated: report.successful_assets,
  exception_count: report.failed_assets,
  deterministic_checksums: true,
  unsafe_svg_fixtures_rejected: true,
  hosted_systems_touched: false,
}, null, 2));
