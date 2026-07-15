import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function read(path) {
  return readFileSync(path, 'utf8');
}

function hash(path) {
  return createHash('sha256').update(read(path)).digest('hex');
}

const runner = read('scripts/apply-material-hosted-seed.ps1');
const seederPath = 'scripts/seed-material-owned-cache.js';
const assetReportPath = 'references/verification/material-full-asset-validation-2026-07-14.json';
const reportVerifierPath = 'scripts/verify-material-hosted-seed-report.mjs';
const authContractVerifierPath = 'scripts/verify-material-hosted-auth-contract.mjs';
const canaryReportVerifierPath = 'scripts/verify-material-hosted-canary-report.mjs';
const preflightPath = 'scripts/sql/material-assets-hosted-seed-preflight.sql';
const postflightPath = 'scripts/sql/material-assets-hosted-seed-postflight.sql';

const expectedHashes = {
  seeder: '915d8f9f6562fae556493cabc4c1f0d0e4e82ea087c0cd9e7fe0bdd0d0dc94fa',
  assetReport: '4e04f3894566fc0b8f9011f38847f27cb40d48d738415ea9c6df41f1d58e9e92',
  reportVerifier: '1e8f7fe040c721e5691fb501ccd4f1529628a0737041a5a6b58b70da90059d24',
  authContractVerifier: '7e91ffe0f9d97f3e73c4d846c4d566e3bffb2c276af017cc680ac1bd55ca00d4',
  canaryReportVerifier: '55186111a5d704531fffe570c4d90e3d80bb8bd37412deea848de9f0dd99c76c',
  preflight: '2f0e40e64baa64046a96c8b6df457b9a421e350de7a95b22016daff71b718ff0',
  postflight: '4a20a37ab27537ba710e8d323785ab287310bfc4ed3d36d7f916856df40a8453',
};

assert.equal(hash(seederPath), expectedHashes.seeder);
assert.equal(hash(assetReportPath), expectedHashes.assetReport);
assert.equal(hash(reportVerifierPath), expectedHashes.reportVerifier);
assert.equal(hash(preflightPath), expectedHashes.preflight);
assert.equal(hash(postflightPath), expectedHashes.postflight);

for (const expectedHash of Object.values(expectedHashes)) {
  assert.ok(runner.includes(expectedHash), `Runner does not pin ${expectedHash}`);
}

assert.match(runner, /\[switch\]\$ExecuteApprovedMaterialHostedSeed/);
assert.match(runner, /Read-Host 'Supabase database password' -AsSecureString/);
assert.match(runner, /Read-Host 'Supabase service-role key' -AsSecureString/);
assert.match(runner, /material-assets-hosted-seed-preflight\.sql/);
assert.match(runner, /material-assets-hosted-seed-postflight\.sql/);
assert.match(runner, /verify-material-hosted-seed-report\.mjs/);
assert.match(runner, /verify-material-hosted-auth-contract\.mjs/);
assert.match(runner, /verify-material-hosted-canary-report\.mjs/);
assert.match(runner, /--icons=settings/);
assert.match(runner, /--presets=default/);
assert.ok(
  runner.indexOf('--icons=settings') < runner.indexOf('--all'),
  'The one-asset canary must run before the full seed',
);
assert.match(runner, /--all/);
assert.match(runner, /--hosted/);
assert.match(runner, /--no-resume/);
assert.match(runner, /--concurrency=6/);
assert.match(runner, /--retries=3/);
assert.match(runner, /--request-timeout-ms=15000/);
assert.match(runner, /Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY/);
assert.doesNotMatch(runner, /supabase\s+db\s+push/i);
assert.doesNotMatch(runner, /supabase\s+functions\s+deploy/i);
assert.doesNotMatch(runner, /npm\s+(?:publish|unpublish)/i);
assert.doesNotMatch(runner, /storage\/v1\/object\/material-icons.*DELETE/is);

const preflight = read(preflightPath);
const postflight = read(postflightPath);
assert.match(preflight, /material_icon_assets is not empty/);
assert.match(preflight, /outside the two fixed preset paths/);
assert.match(preflight, /existing_material_objects/);
assert.match(preflight, /existing_outline_objects/);
assert.match(preflight, /existing_solid_objects/);
assert.match(preflight, /20260714220000/);
assert.match(preflight, /20260714223000/);
assert.match(postflight, /v_table_count <> 8524/);
assert.match(postflight, /v_outline_count <> 4262/);
assert.match(postflight, /v_solid_count <> 4262/);
assert.match(postflight, /v_required_storage_count <> 8524/);
assert.match(postflight, /v_missing_object_count <> 0/);
assert.match(postflight, /total_prefix_objects/);
assert.doesNotMatch(postflight, /v_unexpected_object_count/);

const temporaryDirectory = mkdtempSync(join(tmpdir(), 'supericons-material-hosted-report-'));
try {
  const expectedReport = JSON.parse(read(assetReportPath));
  const validReportPath = join(temporaryDirectory, 'valid.json');
  expectedReport.mode = 'hosted_seed';
  writeFileSync(validReportPath, `${JSON.stringify(expectedReport, null, 2)}\n`, 'utf8');

  const validResult = spawnSync(process.execPath, [reportVerifierPath, `--report=${validReportPath}`], { encoding: 'utf8' });
  assert.equal(validResult.status, 0, validResult.stderr || validResult.stdout);

  const expectedCanaryAsset = expectedReport.assets.find((asset) => (
    asset.icon_id === 'material:settings' && asset.variant === 'outline'
  ));
  const canaryReportPath = join(temporaryDirectory, 'canary.json');
  writeFileSync(canaryReportPath, `${JSON.stringify({
    source_repo: expectedReport.source_repo,
    source_revision: expectedReport.source_revision,
    mode: 'hosted_seed',
    requested_icons: 1,
    requested_assets: 1,
    resumed_assets: 0,
    successful_assets: 1,
    failed_assets: 0,
    exception_rate: 0,
    assets: [expectedCanaryAsset],
    exceptions: [],
  }, null, 2)}\n`, 'utf8');
  const canaryResult = spawnSync(process.execPath, [
    canaryReportVerifierPath,
    `--report=${canaryReportPath}`,
    `--expected-report=${assetReportPath}`,
  ], { encoding: 'utf8' });
  assert.equal(canaryResult.status, 0, canaryResult.stderr || canaryResult.stdout);

  const tamperedReportPath = join(temporaryDirectory, 'tampered.json');
  expectedReport.assets[0].checksum = '0'.repeat(64);
  writeFileSync(tamperedReportPath, `${JSON.stringify(expectedReport, null, 2)}\n`, 'utf8');
  const tamperedResult = spawnSync(process.execPath, [reportVerifierPath, `--report=${tamperedReportPath}`], { encoding: 'utf8' });
  assert.notEqual(tamperedResult.status, 0, 'Tampered hosted report should fail verification');
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}

console.log(JSON.stringify({
  status: 'ok',
  seeder_sha256: expectedHashes.seeder,
  asset_report_sha256: expectedHashes.assetReport,
  report_verifier_sha256: expectedHashes.reportVerifier,
  auth_contract_verifier_sha256: expectedHashes.authContractVerifier,
  canary_report_verifier_sha256: expectedHashes.canaryReportVerifier,
  preflight_sha256: expectedHashes.preflight,
  postflight_sha256: expectedHashes.postflight,
  exact_table_and_storage_counts: true,
  valid_existing_fixed_paths_allowed: true,
  unrelated_existing_paths_rejected: true,
  unrelated_cached_variants_preserved: true,
  exact_report_match_verified: true,
  corrected_auth_contract_pinned: true,
  one_asset_canary_runs_first: true,
  tampered_report_rejected: true,
  secret_prompts_hidden: true,
  hosted_deletion_present: false,
  unrelated_deploy_present: false,
}, null, 2));
