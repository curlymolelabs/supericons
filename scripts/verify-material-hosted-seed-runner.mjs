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
const preflightPath = 'scripts/sql/material-assets-hosted-seed-preflight.sql';
const postflightPath = 'scripts/sql/material-assets-hosted-seed-postflight.sql';

const expectedHashes = {
  seeder: 'a3dd8a252819930cd7ab1dfa014eea76907fff6b9a9d2ed51715214fced82b19',
  assetReport: '4e04f3894566fc0b8f9011f38847f27cb40d48d738415ea9c6df41f1d58e9e92',
  reportVerifier: '1e8f7fe040c721e5691fb501ccd4f1529628a0737041a5a6b58b70da90059d24',
  preflight: '897ffbfad2a4ff65fb0286b7a972f0aee7231bba6a3e6da858d7cf20aee83cee',
  postflight: 'a06ad0cc8a4c4e9cb9b5ad01f3f6328c64dce1598302fd243a97216b2125a5d4',
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
assert.match(preflight, /Material bucket prefix is not empty/);
assert.match(preflight, /20260714220000/);
assert.match(preflight, /20260714223000/);
assert.match(postflight, /v_table_count <> 8524/);
assert.match(postflight, /v_outline_count <> 4262/);
assert.match(postflight, /v_solid_count <> 4262/);
assert.match(postflight, /v_storage_count <> 8524/);
assert.match(postflight, /v_missing_object_count <> 0/);
assert.match(postflight, /v_unexpected_object_count <> 0/);

const temporaryDirectory = mkdtempSync(join(tmpdir(), 'supericons-material-hosted-report-'));
try {
  const expectedReport = JSON.parse(read(assetReportPath));
  const validReportPath = join(temporaryDirectory, 'valid.json');
  expectedReport.mode = 'hosted_seed';
  writeFileSync(validReportPath, `${JSON.stringify(expectedReport, null, 2)}\n`, 'utf8');

  const validResult = spawnSync(process.execPath, [reportVerifierPath, `--report=${validReportPath}`], { encoding: 'utf8' });
  assert.equal(validResult.status, 0, validResult.stderr || validResult.stdout);

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
  preflight_sha256: expectedHashes.preflight,
  postflight_sha256: expectedHashes.postflight,
  exact_table_and_storage_counts: true,
  exact_report_match_verified: true,
  tampered_report_rejected: true,
  secret_prompts_hidden: true,
  hosted_deletion_present: false,
  unrelated_deploy_present: false,
}, null, 2));
