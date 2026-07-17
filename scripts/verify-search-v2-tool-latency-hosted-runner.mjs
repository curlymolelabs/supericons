import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(path, 'utf8');
}

function normalizeText(text) {
  return text.replace(/\r\n?/g, '\n');
}

const migration = read('supabase/migrations/20260714180000_search_v2_tool_latency_evidence.sql');
const runner = read('scripts/apply-search-v2-tool-latency-hosted.ps1');
const preflight = read('scripts/sql/search-v2-tool-latency-hosted-preflight.sql');
const postflight = read('scripts/sql/search-v2-tool-latency-hosted-postflight.sql');
const migrationHash = createHash('sha256').update(normalizeText(migration)).digest('hex');

assert.equal(migrationHash, 'd482408f156320fbbf518d6d66ac51ba1c1660321bacff9485f4e32a408fc3b5');
assert.ok(runner.includes(`$expectedMigrationHash = '${migrationHash}'`));
assert.match(runner, /function Get-NormalizedTextSha256/);
assert.match(runner, /\.Replace\("`r`n", "`n"\)\.Replace\("`r", "`n"\)/);
assert.match(runner, /\[System\.Text\.UTF8Encoding\]::new\(\$false\)/);
assert.match(runner, /\$actualMigrationHash = Get-NormalizedTextSha256 \$migrationPath/);
assert.match(runner, /\[switch\]\$ExecuteApprovedSearchOnlyBetaGateB/);
assert.match(runner, /Invoke-PsqlFile -ContainerPath "\/migrations\/\$migrationName" -SingleTransaction/);
assert.match(runner, /supabase migration repair \$migrationVersion --status applied --linked/);
assert.match(runner, /\$script:databaseUrl = "\$\{poolerUrl\}\?sslmode=require&application_name=supericons_search_only_beta_gate_b"/);
assert.match(runner, /Read-Host 'Supabase database password' -AsSecureString/);
assert.match(runner, /Remove-Item Env:PGPASSWORD/);
assert.match(runner, /Remove-Item Env:SUPABASE_DB_PASSWORD/);
assert.doesNotMatch(runner, /supabase db push/i);
assert.doesNotMatch(runner, /migration repair (?!\$migrationVersion)/i);

assert.match(preflight, /Existing MCP outcome logger is missing/);
assert.match(preflight, /objects already exist or require reconciliation/);
assert.match(postflight, /Expected three worker evidence columns/);
assert.match(postflight, /Expected three validated worker evidence constraints/);
assert.match(postflight, /Expected two beta evidence indexes/);
assert.match(postflight, /tool_latency_postflight_ok/);
assert.match(postflight, /rollback;/);

console.log(JSON.stringify({
  status: 'ok',
  migration_sha256: migrationHash,
  hash_input: 'utf8_lf_normalized_text',
  single_transaction_apply: true,
  exact_history_repair_version: '20260714180000',
  hidden_password_prompt: true,
  normal_db_push_present: false,
  postflight_test_row_rolled_back: true,
}, null, 2));
