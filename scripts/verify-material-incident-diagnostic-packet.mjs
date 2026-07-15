import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

const STATIC_ONLY = process.argv.includes('--static-only');
const SQL_PATH = 'scripts/sql/material-incident-production-diagnostic.sql';
const RUNNER_PATH = 'scripts/run-material-incident-production-diagnostic.ps1';
const VERIFIER_PATH = 'scripts/verify-material-incident-diagnostic-packet.mjs';
const PACKAGE_PATH = 'package.json';
const DOCUMENT_PATH = 'references/verification/material-incident-sql-diagnostic-approval-2026-07-15.md';

function read(path) {
  return readFileSync(path, 'utf8');
}

function normalize(value) {
  return value.replace(/\r\n?/g, '\n');
}

function normalizedHash(value) {
  return createHash('sha256').update(normalize(value), 'utf8').digest('hex');
}

function hashFile(path) {
  return normalizedHash(read(path));
}

function countMatches(value, pattern) {
  return [...value.matchAll(pattern)].length;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function expectedHashFromDocument(document, path) {
  const pattern = new RegExp(`\\|\\s+\\\`${escapeRegExp(path)}\\\`\\s+\\|\\s+\\\`([a-f0-9]{64})\\\`\\s+\\|`);
  const match = document.match(pattern);
  assert.ok(match, `Approval document does not pin ${path}.`);
  return match[1];
}

const sql = normalize(read(SQL_PATH));
const runner = normalize(read(RUNNER_PATH));
const verifier = normalize(read(VERIFIER_PATH));
const packageManifest = JSON.parse(read(PACKAGE_PATH));
const sqlHash = normalizedHash(sql);
const runnerHash = normalizedHash(runner);
const verifierHash = normalizedHash(verifier);
const packageHash = hashFile(PACKAGE_PATH);

assert.equal(normalizedHash('line one\nline two\n'), normalizedHash('line one\r\nline two\r\n'));

assert.match(sql, /begin transaction read only;/i);
assert.match(sql, /set local statement_timeout = '5000ms';/i);
assert.match(sql, /set local lock_timeout = '1000ms';/i);
assert.match(sql, /set local idle_in_transaction_session_timeout = '30000ms';/i);
assert.match(sql, /rollback;\s*\\echo diagnostic_complete=true\s*$/i);
assert.doesNotMatch(sql, /\\gexec|\\copy|\\!/i);
assert.doesNotMatch(sql, /^\s*(?:insert|update|delete|merge|create|alter|drop|truncate|grant|revoke|copy|call|do|vacuum|analyze|reindex|cluster|refresh)\b/im);
assert.doesNotMatch(sql, /explain\s*(?:\([^)]*\banalyze\b|analyze\b)/i);
assert.equal(countMatches(sql, /^explain\b/gim), 1, 'The diagnostic must contain exactly one planner-only EXPLAIN.');
assert.equal(countMatches(sql, /from\s+public\.search_request_audit\b/gi), 1);
assert.match(sql, /explain \(format json, costs true, verbose false\)\s+select count\(\*\)\s+from public\.search_request_audit\s+where ip_hash = repeat\('0', 64\)\s+and created_at >=/i);
assert.doesNotMatch(sql, /from\s+public\.(?:mcp_usage_events|icon_catalog)\b/i);
assert.doesNotMatch(sql, /from\s+public\.si_search_icon_candidates/i);
assert.match(sql, /pg_catalog\.pg_stat_user_tables/);
assert.match(sql, /pg_catalog\.pg_stat_activity/);
assert.match(sql, /pg_catalog\.pg_settings/);
assert.match(sql, /configured_reset_value/);
assert.match(sql, /pg_catalog\.pg_stats/);
assert.match(sql, /pg_catalog\.pg_index/);
assert.match(sql, /pg_catalog\.pg_proc/);
assert.match(sql, /pg_get_functiondef/);
assert.match(sql, /si_search_icon_candidates%/);
assert.match(sql, /pg_stat_statements_candidate_rpc/);
assert.match(sql, /pg_stat_statements_rate_limit/);
assert.match(sql, /pg_stat_statements_reset/);
assert.match(sql, /search_request_audit_ip_created_at_idx/);

assert.match(runner, /\[switch\]\$ExecuteApprovedMaterialIncidentSqlDiagnostic/);
assert.match(runner, new RegExp(`\\$expectedSqlHash = '${sqlHash}'`));
assert.match(runner, /\$expectedFunctionVersion = 38/);
assert.match(runner, /supabase functions list/);
assert.match(runner, /--output-format json/);
assert.match(runner, /default_transaction_read_only=on/);
assert.match(runner, /statement_timeout=5000/);
assert.match(runner, /lock_timeout=1000/);
assert.match(runner, /Read-Host 'Supabase database password' -AsSecureString/);
assert.match(runner, /Remove-Item Env:PGPASSWORD/);
assert.match(runner, /Remove-Item Env:PGOPTIONS/);
assert.match(runner, /Diagnostic evidence already exists and will not be overwritten/);
assert.match(runner, /source = 'verify'/);
assert.match(runner, /channel = 'internal_test'/);
assert.match(runner, /client_family = 'material_incident_diagnostic'/);
assert.match(runner, /query = 'calendar'/);
assert.match(runner, /library = 'lucide'/);
assert.match(runner, /library_mode = 'strict'/);
assert.match(runner, /validSvgCount -ne \$results\.Count/);
assert.match(runner, /material-incident-sql-diagnostic-2026-07-15\.txt/);
assert.match(runner, /material-incident-health-before-2026-07-15\.json/);
assert.match(runner, /material-incident-health-after-2026-07-15\.json/);
assert.doesNotMatch(runner, /supabase\s+(?:db|migration|functions\s+deploy)/i);
assert.doesNotMatch(runner, /railway\s+up|npm\s+(?:publish|unpublish)|seed-material/i);

const beforeIndex = runner.indexOf("$beforeProbe = Invoke-StableHealthProbe -Phase 'before'");
const sqlIndex = runner.lastIndexOf('Invoke-ReadOnlySqlDiagnostic');
const afterIndex = runner.indexOf("$afterProbe = Invoke-StableHealthProbe -Phase 'after'");
assert.ok(beforeIndex >= 0 && sqlIndex > beforeIndex && afterIndex > sqlIndex, 'Health and SQL steps are out of order.');

assert.equal(
  packageManifest.scripts['verify:material-incident-diagnostic-packet'],
  'node scripts/verify-material-incident-diagnostic-packet.mjs',
);

if (!STATIC_ONLY) {
  assert.ok(existsSync(DOCUMENT_PATH), 'Approval document is missing.');
  const document = normalize(read(DOCUMENT_PATH));
  const pinnedFiles = [SQL_PATH, RUNNER_PATH, VERIFIER_PATH, PACKAGE_PATH];
  const actualHashes = new Map([
    [SQL_PATH, sqlHash],
    [RUNNER_PATH, runnerHash],
    [VERIFIER_PATH, verifierHash],
    [PACKAGE_PATH, packageHash],
  ]);
  for (const path of pinnedFiles) {
    assert.equal(expectedHashFromDocument(document, path), actualHashes.get(path), `${path} hash mismatch.`);
  }

  assert.match(document, /Status: Draft\. Not approved or executed\./);
  assert.match(document, /Hash mode: LF-normalized UTF-8 without a byte-order mark\./);
  assert.match(document, /Free plan, observed by the owner in the Supabase dashboard/);
  assert.match(document, /Supavisor and platform pool settings may not be visible through PostgreSQL/);
  assert.match(document, /recommendation baseline was invalidated/i);
  assert.match(document, /No replacement recommendation baseline is run by this packet/i);
  assert.match(document, /plain `EXPLAIN`/);
  assert.match(document, /does not execute the candidate RPC/i);
  assert.match(document, /does not calculate exact full-table counts/i);

  const fingerprintMatch = document.match(/## Fingerprint input[\s\S]*?```text\n([\s\S]*?)```/);
  assert.ok(fingerprintMatch, 'Fingerprint input block is missing.');
  const fingerprintInput = fingerprintMatch[1].endsWith('\n')
    ? fingerprintMatch[1]
    : `${fingerprintMatch[1]}\n`;
  const fingerprint = normalizedHash(fingerprintInput);
  const recordedFingerprint = document.match(/- Approval fingerprint: `([a-f0-9]{64})`/i)?.[1];
  assert.equal(recordedFingerprint, fingerprint, 'Approval fingerprint does not match its input block.');
  assert.match(fingerprintInput, /hash_mode=lf_normalized_utf8\n/);
  assert.match(fingerprintInput, /function_version_required=38\n/);
  assert.match(fingerprintInput, /health_probes_authorized=2\n/);
  assert.match(fingerprintInput, /sql_transaction_mode=read_only\n/);
  assert.match(fingerprintInput, /exact_full_table_counts_authorized=false\n/);
  assert.match(fingerprintInput, /candidate_rpc_execution_authorized=false\n/);
  assert.match(fingerprintInput, /load_test_authorized=false\n/);
  assert.match(fingerprintInput, /diagnostic_sql_database_writes_authorized=false\n/);
  assert.match(fingerprintInput, /deployments_authorized=0\n/);
  assert.match(document, new RegExp(`Approve Material incident SQL diagnostic for fingerprint ${'`'}${fingerprint}${'`'}`));
}

console.log(JSON.stringify({
  status: 'ok',
  mode: STATIC_ONLY ? 'static_only' : 'full_packet',
  hash_mode: 'lf_normalized_utf8',
  sql_sha256: sqlHash,
  runner_sha256: runnerHash,
  verifier_sha256: verifierHash,
  package_sha256: packageHash,
  transaction_read_only: true,
  candidate_rpc_execution_present: false,
  exact_full_table_count_present: false,
  planner_only_explain_count: 1,
  production_mutation_commands_present: false,
}, null, 2));
