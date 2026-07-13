import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(path, 'utf8');
}

const migration = read('supabase/migrations/20260714120000_search_v2_batched_candidates.sql');
const runner = read('scripts/apply-search-v2-batched-candidates-hosted.ps1');
const preflight = read('scripts/sql/search-v2-batched-candidates-hosted-preflight.sql');
const postflight = read('scripts/sql/search-v2-batched-candidates-hosted-postflight.sql');
const migrationHash = createHash('sha256').update(migration).digest('hex');

assert.equal(migrationHash, 'f965c0b354a8d2e31be8791ac5b2041838be6bc8a2b40a97735f90d27f81cded');
assert.ok(runner.includes(`$expectedMigrationHash = '${migrationHash}'`));
assert.match(runner, /\[switch\]\$ExecuteApprovedRoundtripGateA/);
assert.match(runner, /Invoke-PsqlFile -ContainerPath "\/migrations\/\$migrationName" -SingleTransaction/);
assert.match(runner, /supabase migration repair \$migrationVersion --status applied --linked/);
assert.match(runner, /\$script:databaseUrl = "\$\{poolerUrl\}\?sslmode=require&application_name=supericons_roundtrip_gate_a"/);
assert.match(runner, /Read-Host 'Supabase database password' -AsSecureString/);
assert.match(runner, /Remove-Item Env:PGPASSWORD/);
assert.match(runner, /Remove-Item Env:SUPABASE_DB_PASSWORD/);
assert.doesNotMatch(runner, /supabase db push/i);
assert.doesNotMatch(runner, /migration repair (?!\$migrationVersion)/i);

assert.match(preflight, /si_search_icon_candidates_v2\(text,text,integer\)'\) is null/);
assert.match(preflight, /si_search_icon_candidates_v3\(text\[\],text,integer\)'\) is not null/);
assert.match(postflight, /Lightweight candidate RPC was removed/);
assert.match(postflight, /PUBLIC can execute the batched RPC/);
assert.match(postflight, /except all/);
assert.match(postflight, /array\['settings', 'hello', 'cog', 'respond'\]/);
assert.match(postflight, /array\['cog', 'cog'\]/);

console.log(JSON.stringify({
  status: 'ok',
  migration_sha256: migrationHash,
  single_transaction_apply: true,
  exact_history_repair_version: '20260714120000',
  hidden_password_prompt: true,
  normal_db_push_present: false,
  v2_preservation_check: true,
  fixed_parity_queries: 4,
}, null, 2));
