import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const expectedReportPath = 'references/verification/material-full-asset-validation-2026-07-14.json';
const expectedReportHash = '4e04f3894566fc0b8f9011f38847f27cb40d48d738415ea9c6df41f1d58e9e92';
const expectedRevision = '30f8fddd293b1f0189896dc4aaecdfaba1d37ae0';

function readArg(name) {
  const prefix = `--${name}=`;
  const entry = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : '';
}

function hash(text) {
  return createHash('sha256').update(text).digest('hex');
}

function normalizedAsset(asset) {
  return {
    icon_id: asset.icon_id,
    variant: asset.variant,
    storage_path: asset.storage_path,
    checksum: asset.checksum,
    source_revision: asset.source_revision,
    source_icon_id: asset.source_icon_id,
    source_kind: asset.source_kind,
  };
}

const reportPath = readArg('report');
assert.ok(reportPath, 'Provide --report=<hosted seed report path>');

const expectedText = readFileSync(expectedReportPath, 'utf8');
assert.equal(hash(expectedText), expectedReportHash, 'Pinned full asset report hash changed');

const actualText = readFileSync(reportPath, 'utf8');
const expected = JSON.parse(expectedText);
const actual = JSON.parse(actualText);

assert.equal(actual.mode, 'hosted_seed');
assert.equal(actual.source_revision, expectedRevision);
assert.equal(actual.requested_icons, 4262);
assert.equal(actual.requested_assets, 8524);
assert.equal(actual.resumed_assets, 0);
assert.equal(actual.successful_assets, 8524);
assert.equal(actual.failed_assets, 0);
assert.equal(actual.exception_rate, 0);
assert.deepEqual(actual.exceptions, []);
assert.equal(actual.assets.length, 8524);

const actualKeys = new Set(actual.assets.map((asset) => `${asset.icon_id}:${asset.variant}`));
assert.equal(actualKeys.size, 8524, 'Hosted report contains duplicate asset keys');
assert.deepEqual(actual.assets.map(normalizedAsset), expected.assets.map(normalizedAsset));

console.log(JSON.stringify({
  status: 'ok',
  report_sha256: hash(actualText),
  source_revision: actual.source_revision,
  requested_assets: actual.requested_assets,
  successful_assets: actual.successful_assets,
  resumed_assets: actual.resumed_assets,
  failed_assets: actual.failed_assets,
  exact_asset_match: true,
}, null, 2));
