import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(path, 'utf8');
}

const migration = read('supabase/migrations/20260714220000_material_icon_assets.sql');
const runner = read('scripts/apply-material-assets-hosted.ps1');
const preflight = read('scripts/sql/material-assets-hosted-preflight.sql');
const postflight = read('scripts/sql/material-assets-hosted-postflight.sql');
const migrationHash = createHash('sha256').update(migration).digest('hex');

assert.equal(migrationHash, '497f6b838e8e3b01e8a3bbeb8d2e57327512c16784d3ad37c2824b6c99699d08');
assert.ok(runner.includes(`$expectedMigrationHash = '${migrationHash}'`));
assert.match(runner, /\[switch\]\$ExecuteApprovedMaterialAssetMigration/);
assert.match(runner, /Invoke-PsqlFile -ContainerPath "\/migrations\/\$migrationName" -SingleTransaction/);
assert.match(runner, /supabase migration repair \$migrationVersion --status applied --linked/);
assert.match(runner, /application_name=supericons_material_asset_migration/);
assert.match(runner, /Read-Host 'Supabase database password' -AsSecureString/);
assert.match(runner, /Remove-Item Env:PGPASSWORD/);
assert.match(runner, /Remove-Item Env:SUPABASE_DB_PASSWORD/);
assert.doesNotMatch(runner, /supabase db push/i);
assert.doesNotMatch(runner, /migration repair (?!\$migrationVersion)/i);

assert.match(preflight, /material_icon_assets already exists/);
assert.match(preflight, /An error_code column already exists/);
assert.match(postflight, /material_icon_assets was not empty after migration/);
assert.match(postflight, /A public role can read material_icon_assets/);
assert.match(postflight, /Material asset validation constraints are incomplete/);
assert.match(postflight, /Required error_code constraints are missing or unvalidated/);
assert.match(postflight, /A required Material support index is missing/);

console.log(JSON.stringify({
  status: 'ok',
  migration_sha256: migrationHash,
  single_transaction_apply: true,
  exact_history_repair_version: '20260714220000',
  hidden_password_prompt: true,
  normal_db_push_present: false,
  preflight_stops_partial_apply: true,
  postflight_checks_private_access: true,
}, null, 2));
