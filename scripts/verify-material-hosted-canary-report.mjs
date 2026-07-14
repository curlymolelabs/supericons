import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readArgument(name, fallback = '') {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((value) => value.startsWith(prefix))?.slice(prefix.length) || fallback;
}

const reportPath = resolve(readArgument('report'));
const expectedReportPath = resolve(readArgument(
  'expected-report',
  'references/verification/material-full-asset-validation-2026-07-14.json',
));
if (!readArgument('report')) throw new Error('Missing --report path');

const report = JSON.parse(readFileSync(reportPath, 'utf8'));
const expectedReport = JSON.parse(readFileSync(expectedReportPath, 'utf8'));
const expectedAsset = expectedReport.assets.find((asset) => (
  asset.icon_id === 'material:settings' && asset.variant === 'outline'
));

assert.ok(expectedAsset, 'Expected settings outline asset is missing from the pinned validation report');
assert.equal(report.mode, 'hosted_seed');
assert.equal(report.source_revision, expectedReport.source_revision);
assert.equal(report.requested_icons, 1);
assert.equal(report.requested_assets, 1);
assert.equal(report.resumed_assets, 0);
assert.equal(report.successful_assets, 1);
assert.equal(report.failed_assets, 0);
assert.equal(report.exception_rate, 0);
assert.deepEqual(report.exceptions, []);
assert.deepEqual(report.assets, [expectedAsset]);

console.log(JSON.stringify({
  status: 'ok',
  icon_id: expectedAsset.icon_id,
  variant: expectedAsset.variant,
  checksum: expectedAsset.checksum,
  source_revision: expectedAsset.source_revision,
  hosted_mutation_verified_by_postflight: false,
}, null, 2));
