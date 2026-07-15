import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

function readArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : '';
}

function normalizedText(path) {
  const value = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
  assert.equal(value.includes('\r'), false, `${path} contains a bare carriage return.`);
  return value;
}

function sha256Text(path) {
  return createHash('sha256').update(normalizedText(path)).digest('hex');
}

const expectedFingerprint = readArg('fingerprint');
assert.match(expectedFingerprint, /^[0-9a-f]{64}$/);
const sourcePath = 'references/verification/admin-dashboard-phase-a-migration-fingerprint-2026-07-16.txt';
const source = normalizedText(sourcePath);
assert.equal(source.endsWith('\n'), true);
assert.equal(createHash('sha256').update(source).digest('hex'), expectedFingerprint);

const fields = Object.fromEntries(source.trimEnd().split('\n').map((line) => {
  const split = line.indexOf('=');
  assert.ok(split > 0, `Malformed fingerprint line: ${line}`);
  return [line.slice(0, split), line.slice(split + 1)];
}));

assert.equal(fields.packet, 'admin_dashboard_phase_a_migration');
assert.equal(fields.implementation_revision, '3ce3224205c4ef13f7eb3ad0d83556db4c08c708');
assert.equal(fields.project_ref, 'kcjmkakdhsqplvasgkjv');
assert.equal(fields.migration_version, '20260716040000');
assert.equal(fields.database_migrations_authorized, '1');
assert.equal(fields.history_repairs_authorized, '1');
assert.equal(fields.function_deployments_authorized, '0');
assert.equal(fields.railway_deployments_authorized, '0');
assert.equal(fields.storage_changes_authorized, 'false');
assert.equal(fields.npm_publication_authorized, 'false');

for (const [path, field] of [
  ['supabase/migrations/20260716040000_admin_dashboard_phase_a.sql', 'migration_sha256'],
  ['scripts/sql/admin-dashboard-phase-a-hosted-preflight.sql', 'preflight_sha256'],
  ['scripts/sql/admin-dashboard-phase-a-hosted-postflight.sql', 'postflight_sha256'],
  ['scripts/run-admin-dashboard-phase-a-migration.ps1', 'runner_sha256'],
  ['scripts/verify-admin-dashboard-phase-a-migration-packet.mjs', 'verifier_sha256'],
]) {
  assert.equal(sha256Text(path), fields[field], `${path} hash does not match the packet.`);
}

const tree = execFileSync('git', ['rev-parse', `${fields.implementation_revision}^{tree}`], { encoding: 'utf8' }).trim();
assert.equal(tree, fields.implementation_tree);

const runner = normalizedText('scripts/run-admin-dashboard-phase-a-migration.ps1');
assert.equal((runner.match(/Invoke-PsqlFile -ContainerPath "\/migrations\/\$MigrationName" -SingleTransaction/g) || []).length, 1);
assert.equal((runner.match(/supabase migration repair \$MigrationVersion --status applied --linked/g) || []).length, 1);
assert.match(runner, /Read-Host 'Supabase database password' -AsSecureString/);
assert.match(runner, /Remove-Item Env:PGPASSWORD/);
assert.doesNotMatch(runner, /supabase db push/i);
assert.doesNotMatch(runner, /functions deploy|railway up|npm publish/i);

console.log(JSON.stringify({
  status: 'ok',
  approval_fingerprint: expectedFingerprint,
  implementation_revision: fields.implementation_revision,
  project_ref: fields.project_ref,
  migration_version: fields.migration_version,
  mutation_budget: {
    migration: 1,
    history_repair: 1,
    function_deployments: 0,
    railway_deployments: 0,
    storage_changes: 0,
    npm_publication: 0
  }
}, null, 2));
