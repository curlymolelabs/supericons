import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

function readArgument(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? String(process.argv[index + 1] || '').trim() : '';
}

function normalizeText(value) {
  return String(value).replace(/\r\n/g, '\n');
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function parseFingerprintSource(source) {
  return Object.fromEntries(
    normalizeText(source)
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const separator = line.indexOf('=');
        assert.ok(separator > 0, `Malformed fingerprint line: ${line}`);
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

const suppliedFingerprint = readArgument('fingerprint');
assert.match(suppliedFingerprint, /^[0-9a-f]{64}$/, 'Provide a valid release fingerprint.');

const sourcePath = 'references/verification/icon-request-hosted-migration-fingerprint-2026-07-27.txt';
const source = await readFile(sourcePath, 'utf8');
assert.equal(
  sha256(normalizeText(source)),
  suppliedFingerprint,
  'Release fingerprint does not match the packet source.',
);

const packet = parseFingerprintSource(source);
assert.equal(packet.project_ref, 'kcjmkakdhsqplvasgkjv');
assert.equal(packet.migration_version, '20260727120000');
assert.equal(packet.hash_mode, 'lf_normalized_utf8');

const artifactPaths = {
  migration_sha256: 'supabase/migrations/20260727120000_icon_request_events.sql',
  preflight_sha256: 'scripts/sql/icon-request-hosted-preflight.sql',
  transaction_baseline_sha256: 'scripts/sql/icon-request-hosted-transaction-baseline.sql',
  postflight_sha256: 'scripts/sql/icon-request-hosted-postflight.sql',
  history_postflight_sha256: 'scripts/sql/icon-request-hosted-history-postflight.sql',
  rollback_sha256: 'scripts/sql/icon-request-hosted-operational-rollback.sql',
  runner_sha256: 'scripts/run-icon-request-hosted-migration.ps1',
};

for (const [field, path] of Object.entries(artifactPaths)) {
  const content = await readFile(path, 'utf8');
  assert.equal(
    sha256(normalizeText(content)),
    packet[field],
    `${field} does not match ${path}.`,
  );
}

const [
  runner,
  preflight,
  transactionBaseline,
  postflight,
  historyPostflight,
  rollback,
] = await Promise.all([
  readFile(artifactPaths.runner_sha256, 'utf8'),
  readFile(artifactPaths.preflight_sha256, 'utf8'),
  readFile(artifactPaths.transaction_baseline_sha256, 'utf8'),
  readFile(artifactPaths.postflight_sha256, 'utf8'),
  readFile(artifactPaths.history_postflight_sha256, 'utf8'),
  readFile(artifactPaths.rollback_sha256, 'utf8'),
]);

assert.match(runner, /\$ProjectRef = 'kcjmkakdhsqplvasgkjv'/);
assert.match(runner, /\$MigrationVersion = '20260727120000'/);
assert.match(
  runner,
  /\$ExpectedMigrationHash = '494f3b9662efcc2508a53dda46aca480c8d0637a60262d19ccdb2d547d7d3b76'/,
);
assert.match(runner, /'migration',\s*'repair',\s*\$MigrationVersion,\s*'--status',\s*'applied',\s*'--linked'/s);
assert.doesNotMatch(runner, /\bdb\s+push\b/i);
assert.doesNotMatch(runner, /migration',\s*'repair',\s*'(?!\$MigrationVersion)/s);
assert.match(runner, /-SingleTransaction/);
assert.match(runner, /Assert-WorktreeContainsOnlyKnownDecisionChange/);

assert.match(preflight, /a3f2d83f6c70db8e3e80d905c00d4d7a/);
assert.match(preflight, /58ac2ddc4a3876ac70bb532385056ce5/);
assert.match(preflight, /d9845ddd8cca7b18bd1919bde49af90a/);
assert.match(transactionBaseline, /icon_request_migration_baseline/);
assert.match(postflight, /89f2e6bb7ebd589ae21194592d4905ca/);
assert.match(postflight, /existing icon evidence rows changed during migration/i);
assert.match(postflight, /PUBLIC can execute the icon request function/);
assert.match(historyPostflight, /Migration 20260727120000 is not recorded exactly once/);
assert.match(rollback, /drop function public\.si_log_icon_request/);
assert.match(rollback, /Keep the expanded constraints and migration history/);
assert.doesNotMatch(rollback, /delete\s+from\s+public\.icon_evidence/i);

console.log(JSON.stringify({
  status: 'ok',
  project_ref: packet.project_ref,
  migration_version: packet.migration_version,
  fingerprint: suppliedFingerprint,
  artifacts_verified: Object.keys(artifactPaths).length,
  exact_history_mark_only: true,
  broad_db_push_absent: true,
  row_preservation_guard: true,
  operational_rollback_preserves_rows: true,
}, null, 2));
