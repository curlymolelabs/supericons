import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  BETA_HOSTED_SEARCH_FUNCTION,
  STABLE_HOSTED_SEARCH_FUNCTION,
  getHostedSearchFunctionNameForTool,
} from '../mcp/release-channel.js';

function read(path) {
  return readFileSync(path, 'utf8');
}

function readJson(path) {
  return JSON.parse(read(path));
}

function numericVersion(value) {
  return String(value || '').split('.').map((part) => Number.parseInt(part, 10) || 0);
}

function versionAtLeast(actual, expected) {
  const left = numericVersion(actual);
  const right = numericVersion(expected);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    if ((left[index] || 0) > (right[index] || 0)) return true;
    if ((left[index] || 0) < (right[index] || 0)) return false;
  }
  return true;
}

const guardrailsPath = 'docs/si-v2/search/experiments/search-v2-beta-incident-guardrails-2026-07-16.json';
const weeklyPath = 'docs/si-v2/search/automation/weekly-search-maintenance-audit.md';
const dailyPath = 'docs/si-v2/search/automation/daily-search-beta-monitor.md';
const packageJson = readJson('mcp/package.json');
const packageLock = readJson('mcp/package-lock.json');
const guardrails = readJson(guardrailsPath);
const groupedGate = read('scripts/verify-search-v2-grouped-http-request.ts');
const materialHydration = read('mcp/material-hydration.js');
const usageDedupeGate = read('scripts/verify-mcp-usage-dedupe.mjs');
const stageTiming = read('supabase/functions/_shared/search-engine/stage-timing.ts');
const weekly = read(weeklyPath);
const daily = read(dailyPath);

assert.equal(guardrails.schema_version, 1);
assert.equal(packageJson.version, guardrails.package_version);
assert.equal(packageLock.version, packageJson.version);
assert.equal(packageLock.packages[''].version, packageJson.version);
assert.equal(
  getHostedSearchFunctionNameForTool(packageJson.version, 'search_icons'),
  BETA_HOSTED_SEARCH_FUNCTION,
);
assert.equal(
  getHostedSearchFunctionNameForTool(packageJson.version, 'recommend_icons'),
  STABLE_HOSTED_SEARCH_FUNCTION,
);

const honoVersion = packageLock.packages['node_modules/hono']?.version;
const qsVersion = packageLock.packages['node_modules/qs']?.version;
assert.ok(versionAtLeast(honoVersion, '4.12.25'), `Hono ${honoVersion} is below the safe floor.`);
assert.ok(versionAtLeast(qsVersion, '6.15.2'), `qs ${qsVersion} is below the safe floor.`);

assert.equal(guardrails.concurrency.grouped_search_internal_max, 2);
assert.equal(guardrails.concurrency.material_snapshot_fetch_max, 4);
assert.equal(guardrails.concurrency.gate_c_live_smoke_max, 1);
assert.equal(guardrails.concurrency.production_load_test_authorized, false);
assert.match(groupedGate, /concurrency:\s*2/);
assert.match(groupedGate, /maximumActive <= 2/);
assert.match(materialHydration, /SUPERICONS_MATERIAL_HYDRATION_CONCURRENCY \|\| '4'/);

assert.equal(guardrails.error_evidence.platform_function_error_rate_required, true);
assert.equal(guardrails.error_evidence.search_audit_error_rate_required, true);
assert.equal(guardrails.error_evidence.audit_rows_are_not_the_only_error_source, true);
assert.equal(guardrails.error_evidence.eligible_request_audit_capture_percent_min, 95);
assert.equal(guardrails.error_evidence.error_rate_percent_max, 1);
assert.match(daily, /platform function evidence and from search audit rows separately/);
assert.match(daily, /audit capture ratio/);

assert.equal(guardrails.usage_integrity.dedupe_verification_required, true);
assert.match(usageDedupeGate, /Different sessions/i);
assert.match(usageDedupeGate, /same session retry/i);

assert.equal(guardrails.latency.first_request_reported_separately, true);
assert.equal(guardrails.latency.reused_worker_reported_separately, true);
assert.match(stageTiming, /first_request/);
assert.match(stageTiming, /reused_worker/);
assert.match(daily, /Never hide first requests inside a warm average/);

assert.equal(guardrails.material.capability_truth_required, true);
assert.equal(guardrails.material.outline_and_solid_svg_required, true);
assert.match(weekly, /Material capability/);
assert.match(daily, /Material capability truth/);

assert.equal(guardrails.release.gate_c_required_before_npm_publication, true);
assert.equal(guardrails.release.production_functions_must_remain_unchanged, true);
assert.equal(guardrails.release.npm_latest_must_remain_unchanged, true);
assert.equal(guardrails.release.model_provider_calls, 0);

for (const text of [JSON.stringify(guardrails), weekly, daily]) {
  assert.doesNotMatch(text, /[\u2013\u2014]/, 'Beta guardrail output contains forbidden punctuation.');
}

console.log(JSON.stringify({
  status: 'ok',
  package_version: packageJson.version,
  search_route: guardrails.tool_routes.search_icons,
  recommendation_route: guardrails.tool_routes.recommend_icons,
  grouped_search_internal_max: guardrails.concurrency.grouped_search_internal_max,
  material_snapshot_fetch_max: guardrails.concurrency.material_snapshot_fetch_max,
  live_smoke_max: guardrails.concurrency.gate_c_live_smoke_max,
  platform_error_rate_required: guardrails.error_evidence.platform_function_error_rate_required,
  audit_capture_percent_min: guardrails.error_evidence.eligible_request_audit_capture_percent_min,
  dedupe_verification_required: guardrails.usage_integrity.dedupe_verification_required,
  first_request_reported_separately: guardrails.latency.first_request_reported_separately,
  dependency_floors: { hono: honoVersion, qs: qsVersion },
  monitoring_routines: ['weekly', 'daily_beta_only'],
  model_provider_calls: guardrails.release.model_provider_calls,
}, null, 2));
