import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const manifestPath = 'docs/si-v2/search/reviews/search-v2-search-only-beta-authorization-manifest-2026-07-16.json';
const requestPath = 'docs/si-v2/search/reviews/search-v2-search-only-beta-approval-request-2026-07-16.md';
const expectedManifestHash = 'bf59e6cfd4b73a8df654ce37ec293f399a43b024ee3f785fa98566e55621d734';

function normalizeText(value) {
  return value.replace(/\r\n?/g, '\n');
}

function sha256Text(value) {
  return createHash('sha256').update(normalizeText(value)).digest('hex');
}

function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function gitShow(commit, path) {
  return execFileSync('git', ['show', `${commit}:${path}`], { encoding: 'utf8' });
}

function runNpm(args, cwd) {
  const npmExecPath = process.env.npm_execpath;
  const command = npmExecPath ? process.execPath : 'npm';
  const commandArgs = npmExecPath ? [npmExecPath, ...args] : args;
  return execFileSync(command, commandArgs, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: !npmExecPath && process.platform === 'win32',
  });
}

function packCommittedPackage(commit) {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'supericons-beta-packet-'));
  const worktreePath = join(temporaryRoot, 'worktree');
  const packPath = join(temporaryRoot, 'pack');
  let worktreeAdded = false;

  try {
    mkdirSync(packPath, { recursive: true });
    execFileSync('git', ['worktree', 'add', '--detach', '--quiet', worktreePath, commit], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    worktreeAdded = true;
    const output = runNpm([
      'pack',
      '--json',
      '--ignore-scripts',
      '--pack-destination',
      packPath,
    ], join(worktreePath, 'mcp'));
    const [record] = JSON.parse(output);
    return {
      ...record,
      tarballSha256: sha256File(join(packPath, record.filename)),
    };
  } finally {
    try {
      if (worktreeAdded) {
        execFileSync('git', ['worktree', 'remove', '--force', worktreePath], {
          stdio: ['ignore', 'pipe', 'pipe'],
        });
      }
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    }
  }
}

const manifestText = readFileSync(manifestPath, 'utf8');
const request = readFileSync(requestPath, 'utf8');
const manifest = JSON.parse(manifestText);
const commit = manifest.implementation.commit;

assert.equal(manifest.hash_mode, 'utf8_lf_normalized_text');
assert.equal(sha256Text(manifestText), expectedManifestHash);
assert.equal(
  manifest.database.migration_sha256,
  sha256Text(gitShow(commit, manifest.database.migration_file)),
);
assert.equal(
  manifest.database.runner_sha256,
  sha256Text(gitShow(commit, manifest.database.runner)),
);
assert.equal(
  manifest.implementation.endpoint_entry_sha256,
  sha256Text(gitShow(commit, 'supabase/functions/mcp-search-v2-beta/index.ts')),
);
assert.equal(
  manifest.incident_guardrails.sha256,
  sha256Text(gitShow(commit, manifest.incident_guardrails.file)),
);

const packed = packCommittedPackage(commit);
assert.equal(packed.version, manifest.package.version);
assert.equal(packed.entryCount, manifest.package.clean_commit_file_count);
assert.equal(packed.size, manifest.package.clean_commit_package_size_bytes);
assert.equal(packed.unpackedSize, manifest.package.clean_commit_unpacked_size_bytes);
assert.equal(packed.shasum, manifest.package.clean_commit_npm_shasum);
assert.equal(packed.integrity, manifest.package.clean_commit_npm_integrity);
assert.equal(packed.tarballSha256, manifest.package.clean_commit_tarball_sha256);

assert.equal(manifest.tool_routes.search_icons, 'mcp-search-v2-beta');
assert.equal(manifest.tool_routes.recommend_icons, 'mcp-search');
assert.equal(manifest.package.version, '0.4.19-beta.0');
assert.equal(manifest.package.publish_tag, 'beta');
assert.equal(manifest.package.build_source, 'temporary_clean_worktree_at_implementation_commit');
assert.equal(manifest.package.publish_exact_verified_tarball, true);
assert.equal(manifest.package.latest_tag_must_remain, '0.4.17');
assert.equal(manifest.external_actions.maximum_sql_migrations, 1);
assert.equal(manifest.external_actions.maximum_migration_history_repairs, 1);
assert.equal(manifest.external_actions.maximum_isolated_function_deployments, 1);
assert.equal(manifest.external_actions.maximum_npm_prerelease_publications, 1);
assert.equal(manifest.external_actions.production_function_deployments, 0);
assert.equal(manifest.external_actions.normal_database_pushes, 0);
assert.equal(manifest.external_actions.production_load_tests, 0);
assert.equal(manifest.external_actions.model_provider_calls, 0);
assert.equal(manifest.external_actions.monitoring_automation_activations, 0);
assert.equal(manifest.incident_guardrails.gate_c_live_smoke_max, 1);
assert.equal(manifest.incident_guardrails.platform_function_error_rate_required, true);
assert.equal(manifest.incident_guardrails.search_audit_error_rate_required, true);
assert.equal(manifest.incident_guardrails.eligible_request_audit_capture_percent_min, 95);
assert.equal(manifest.release_gates.platform_and_audit_error_evidence_required_before_publish, true);
assert.equal(manifest.release_gates.material_capability_truth_required, true);
assert.equal(manifest.release_gates.material_outline_and_solid_svg_required, true);
assert.equal(manifest.monitoring.activation_authorized, false);
assert.ok(manifest.excluded_scope.includes('recommend_icons_beta_route'));
assert.ok(manifest.excluded_scope.includes('shared_recommendation_v4_migration'));

assert.match(request, new RegExp(expectedManifestHash));
assert.match(request, /If platform error evidence or audit evidence cannot be read, Gate C is incomplete/);
assert.match(request, /recommend_icons.*stable `mcp-search`/s);
assert.match(request, /No normal database push, older migration repair, production load test, scheduled warm ping, automated public invitation, monitoring activation, or model-provider call is authorized/);
assert.doesNotMatch(request, /Approve Search v2 search-only beta manifest[^\n]+20260714190000/);

for (const artifact of [manifestText, request]) {
  assert.doesNotMatch(artifact, /[\u2013\u2014]/);
}

console.log(JSON.stringify({
  status: 'ok',
  manifest_sha256: expectedManifestHash,
  implementation_commit: commit,
  migration_version: manifest.database.migration_version,
  migration_sha256: manifest.database.migration_sha256,
  clean_commit_package_files: packed.entryCount,
  clean_commit_tarball_sha256: packed.tarballSha256,
  search_route: manifest.tool_routes.search_icons,
  recommendation_route: manifest.tool_routes.recommend_icons,
  live_smoke_max_concurrency: manifest.incident_guardrails.gate_c_live_smoke_max,
  production_deployments_authorized: manifest.external_actions.production_function_deployments,
  normal_db_push_authorized: manifest.external_actions.normal_database_pushes,
  monitoring_activations_authorized: manifest.external_actions.monitoring_automation_activations,
  model_provider_calls_authorized: manifest.external_actions.model_provider_calls,
}, null, 2));
