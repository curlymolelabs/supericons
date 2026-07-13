import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(path, 'utf8');
}

const migration = read('supabase/migrations/20260713150000_search_v2_lightweight_candidates.sql');
const runner = read('scripts/apply-search-v2-lightweight-candidates-hosted.ps1');
const preflight = read('scripts/sql/search-v2-lightweight-candidates-hosted-preflight.sql');
const postflight = read('scripts/sql/search-v2-lightweight-candidates-hosted-postflight.sql');
const migrationHash = createHash('sha256').update(migration).digest('hex');

assert.equal(migrationHash, '8ad558920ae3565bd26fe3706a1ba8ef0e8c3b2ac9ddafce9f7b15e995ede42e');
assert.ok(runner.includes(`$expectedMigrationHash = '${migrationHash}'`));
assert.match(runner, /\[switch\]\$ExecuteApprovedLatencyGateA/);
assert.match(runner, /Invoke-PsqlFile -ContainerPath "\/migrations\/\$migrationName" -SingleTransaction/);
assert.match(runner, /supabase migration repair \$migrationVersion --status applied --linked/);
assert.match(runner, /\$script:databaseUrl = "\$\{poolerUrl\}\?sslmode=require&application_name=supericons_latency_gate_a"/);
assert.match(runner, /Read-Host 'Supabase database password' -AsSecureString/);
assert.match(runner, /Remove-Item Env:PGPASSWORD/);
assert.match(runner, /Remove-Item Env:SUPABASE_DB_PASSWORD/);
assert.doesNotMatch(runner, /supabase db push/i);
assert.doesNotMatch(runner, /migration repair (?!\$migrationVersion)/i);

assert.match(preflight, /si_search_icon_candidates_v2\(text,text,integer\)'\) is not null/);
assert.match(preflight, /PRIMARY KEY \(icon_id\)/);
assert.match(postflight, /Existing production candidate RPC was removed/);
assert.match(postflight, /Lightweight RPC unexpectedly returns SVG/);
assert.match(postflight, /PUBLIC can execute the lightweight RPC/);
assert.match(postflight, /except all/);
assert.match(postflight, /'settings'::text/);
assert.match(postflight, /'cog'::text, 'bootstrap'::text/);
assert.match(postflight, /'respond'::text, 'phosphor'::text/);

console.log(JSON.stringify({
  status: 'ok',
  migration_sha256: migrationHash,
  single_transaction_apply: true,
  exact_history_repair_version: '20260713150000',
  hidden_password_prompt: true,
  normal_db_push_present: false,
  old_rpc_preservation_check: true,
  old_new_parity_queries: 4,
}, null, 2));
