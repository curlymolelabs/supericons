import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const manifestPath = 'docs/si-v2/search/reviews/search-v2-search-only-beta-authorization-manifest-2026-07-14.json';
const requestPath = 'docs/si-v2/search/reviews/search-v2-search-only-beta-approval-request-2026-07-14.md';
const migrationPath = 'supabase/migrations/20260714180000_search_v2_tool_latency_evidence.sql';
const runnerPath = 'scripts/apply-search-v2-tool-latency-hosted.ps1';
const endpointPath = 'supabase/functions/mcp-search-v2-beta/index.ts';
const expectedManifestHash = 'c2d76a1674f38e9c07c0ec7624d3c048c82ebb1e45f75e296e9e3bfc491adbc6';

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function gitShow(commit, path) {
  return execFileSync('git', ['show', `${commit}:${path}`], { encoding: 'utf8' });
}

const manifestText = readFileSync(manifestPath, 'utf8');
const request = readFileSync(requestPath, 'utf8');
const manifest = JSON.parse(manifestText);
const commit = manifest.implementation.commit;

assert.equal(sha256(manifestText), expectedManifestHash);
assert.equal(manifest.database.migration_sha256, sha256(readFileSync(migrationPath)));
assert.equal(manifest.database.runner_sha256, sha256(readFileSync(runnerPath)));
assert.equal(manifest.implementation.endpoint_entry_sha256, sha256(readFileSync(endpointPath)));
assert.equal(manifest.database.migration_sha256, sha256(gitShow(commit, migrationPath)));
assert.equal(manifest.database.runner_sha256, sha256(gitShow(commit, runnerPath)));
assert.equal(manifest.implementation.endpoint_entry_sha256, sha256(gitShow(commit, endpointPath)));

assert.equal(manifest.tool_routes.search_icons, 'mcp-search-v2-beta');
assert.equal(manifest.tool_routes.recommend_icons, 'mcp-search');
assert.equal(manifest.package.version, '0.4.18-beta.0');
assert.equal(manifest.package.publish_tag, 'beta');
assert.equal(manifest.package.latest_tag_must_remain, '0.4.17');
assert.equal(manifest.package.clean_commit_file_count, 38);
assert.equal(manifest.external_actions.maximum_sql_migrations, 1);
assert.equal(manifest.external_actions.maximum_migration_history_repairs, 1);
assert.equal(manifest.external_actions.maximum_isolated_function_deployments, 1);
assert.equal(manifest.external_actions.maximum_npm_prerelease_publications, 1);
assert.equal(manifest.external_actions.production_function_deployments, 0);
assert.equal(manifest.external_actions.normal_database_pushes, 0);
assert.equal(manifest.external_actions.model_provider_calls, 0);
assert.equal(manifest.beta_window.initial_days, 7);
assert.equal(manifest.beta_window.maximum_days_if_underpowered, 14);
assert.equal(manifest.release_gates.search_warm_p95_ms_max, 2000);
assert.equal(manifest.release_gates.error_rate_percent_max, 1);
assert.ok(manifest.excluded_scope.includes('recommend_icons_beta_route'));
assert.ok(manifest.excluded_scope.includes('shared_recommendation_v4_migration'));

assert.match(request, new RegExp(expectedManifestHash));
assert.match(request, /Supabase CLI read-only function check returned HTTP 401/);
assert.match(request, /recommend_icons.*stable `mcp-search`/s);
assert.match(request, /No normal database push, older migration repair, scheduled warm ping, automated public invitation, or model-provider call is authorized/);
assert.doesNotMatch(request, /Approve Search v2 search-only beta manifest[^\n]+20260714190000/);

console.log(JSON.stringify({
  status: 'ok',
  manifest_sha256: expectedManifestHash,
  implementation_commit: commit,
  migration_version: manifest.database.migration_version,
  migration_sha256: manifest.database.migration_sha256,
  clean_commit_package_files: manifest.package.clean_commit_file_count,
  search_route: manifest.tool_routes.search_icons,
  recommendation_route: manifest.tool_routes.recommend_icons,
  production_deployments_authorized: manifest.external_actions.production_function_deployments,
  normal_db_push_authorized: manifest.external_actions.normal_database_pushes,
  model_provider_calls_authorized: manifest.external_actions.model_provider_calls,
}, null, 2));
