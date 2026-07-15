import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(path, 'utf8');
}

const original = read('supabase/migrations/20260714220000_material_icon_assets.sql');
const recovery = read('supabase/migrations/20260714223000_material_icon_assets_private_roles.sql');
const recoveryRollback = read('supabase/rollbacks/20260714223000_material_icon_assets_private_roles.down.sql');
const runner = read('scripts/apply-material-private-roles-recovery-hosted.ps1');
const preflight = read('scripts/sql/material-assets-private-roles-recovery-preflight.sql');
const postflight = read('scripts/sql/material-assets-hosted-postflight.sql');
const originalHash = createHash('sha256').update(original).digest('hex');
const recoveryHash = createHash('sha256').update(recovery).digest('hex');

assert.equal(originalHash, '497f6b838e8e3b01e8a3bbeb8d2e57327512c16784d3ad37c2824b6c99699d08');
assert.equal(recoveryHash, '2be4ba6f0cf81f1093108dedf41b27328590c92cc77a36f251f0e69b3f91827e');
assert.ok(runner.includes(`$expectedOriginalHash = '${originalHash}'`));
assert.ok(runner.includes(`$expectedRecoveryHash = '${recoveryHash}'`));
assert.match(runner, /\[switch\]\$ExecuteApprovedMaterialPrivateRolesRecovery/);
assert.match(runner, /material-assets-private-roles-recovery-preflight\.sql/);
assert.match(runner, /"\/migrations\/\$recoveryName" -SingleTransaction/);
assert.match(runner, /material-assets-hosted-postflight\.sql/);
assert.match(runner, /supabase migration repair \$originalVersion --status applied --linked/);
assert.match(runner, /supabase migration repair \$recoveryVersion --status applied --linked/);
assert.doesNotMatch(runner, /supabase db push/i);
assert.doesNotMatch(runner, /"\/migrations\/\$originalName"/);

assert.match(preflight, /material_icon_assets is not empty/);
assert.match(preflight, /production privilege mismatch is not present/);
assert.match(recovery, /revoke all on table public\.material_icon_assets from anon, authenticated/);
assert.match(recoveryRollback, /Never restore anon or authenticated access/);
assert.match(postflight, /A public role can read material_icon_assets/);

console.log(JSON.stringify({
  status: 'ok',
  original_migration_sha256: originalHash,
  recovery_migration_sha256: recoveryHash,
  recovery_single_transaction: true,
  original_sql_rerun_present: false,
  exact_history_repairs: ['20260714220000', '20260714223000'],
  recovery_preflight_requires_empty_table: true,
  recovery_postflight_checks_private_access: true,
  normal_db_push_present: false,
}, null, 2));
