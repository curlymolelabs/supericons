import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  DETERMINISTIC_BETA_COHORT,
  STABLE_HOSTED_SEARCH_FUNCTION,
  getBetaCohortForRequest,
  getHostedSearchFunctionNameForTool,
  shouldUseLocalFirstBetaSearch,
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

const historicalGuardrailsPath = 'docs/si-v2/search/experiments/search-v2-beta-incident-guardrails-2026-07-16.json';
const currentGuardrailsPath = 'docs/si-v2/search/experiments/search-v2-beta2-incident-guardrails-2026-07-20.json';
const weeklyPath = 'docs/si-v2/search/automation/weekly-search-maintenance-audit.md';
const dailyPath = 'docs/si-v2/search/automation/daily-search-beta-monitor.md';
const packageJson = readJson('mcp/package.json');
const packageLock = readJson('mcp/package-lock.json');
const historicalGuardrails = readJson(historicalGuardrailsPath);
const guardrails = readJson(currentGuardrailsPath);
const groupedGate = read('scripts/verify-search-v2-grouped-http-request.ts');
const materialHydration = read('mcp/material-hydration.js');
const usageDedupeGate = read('scripts/verify-mcp-usage-dedupe.mjs');
const weekly = read(weeklyPath);
const daily = read(dailyPath);

assert.equal(historicalGuardrails.schema_version, 1);
assert.equal(historicalGuardrails.package_version, '0.4.19-beta.0');
assert.equal(historicalGuardrails.tool_routes.search_icons, 'mcp-search-v2-beta');
assert.equal(historicalGuardrails.tool_routes.recommend_icons, STABLE_HOSTED_SEARCH_FUNCTION);
assert.equal(guardrails.schema_version, 1);
assert.equal(packageJson.version, guardrails.package_version);
assert.equal(packageLock.version, packageJson.version);
assert.equal(packageLock.packages[''].version, packageJson.version);
assert.equal(
  getHostedSearchFunctionNameForTool(packageJson.version, 'search_icons'),
  STABLE_HOSTED_SEARCH_FUNCTION,
);
assert.equal(
  getHostedSearchFunctionNameForTool(packageJson.version, 'recommend_icons'),
  STABLE_HOSTED_SEARCH_FUNCTION,
);
assert.equal(shouldUseLocalFirstBetaSearch(packageJson.version, {
  toolName: 'search_icons',
  query: 'settings',
}), true);
assert.equal(shouldUseLocalFirstBetaSearch(packageJson.version, {
  toolName: 'search_icons',
  query: 'calendario',
  locale: 'es',
}), false);
assert.equal(shouldUseLocalFirstBetaSearch(packageJson.version, {
  toolName: 'search_icons',
  query: '日历',
}), false);
assert.equal(shouldUseLocalFirstBetaSearch(packageJson.version, {
  toolName: 'recommend_icons',
  query: 'settings',
}), false);
assert.equal(
  getBetaCohortForRequest(packageJson.version, 'search_icons', { query: 'settings' }),
  DETERMINISTIC_BETA_COHORT,
);
assert.equal(
  getBetaCohortForRequest(packageJson.version, 'search_icons', {
    query: 'calendario',
    locale: 'es',
  }),
  null,
);
assert.equal(guardrails.tool_routes.search_icons_eligible_english, 'local_first_english');
assert.equal(guardrails.tool_routes.search_icons_fallback, STABLE_HOSTED_SEARCH_FUNCTION);
assert.equal(guardrails.tool_routes.recommend_icons, STABLE_HOSTED_SEARCH_FUNCTION);
assert.equal(guardrails.cohort.controlled_label_required_for_gate, true);
assert.equal(guardrails.cohort.organic_reported_separately, true);
assert.equal(guardrails.cohort.unlabeled_attempts_excluded_from_gate, true);

const honoVersion = packageLock.packages['node_modules/hono']?.version;
const qsVersion = packageLock.packages['node_modules/qs']?.version;
assert.ok(versionAtLeast(honoVersion, '4.12.25'), `Hono ${honoVersion} is below the safe floor.`);
assert.ok(versionAtLeast(qsVersion, '6.15.2'), `qs ${qsVersion} is below the safe floor.`);

assert.equal(guardrails.concurrency.grouped_search_internal_max, 2);
assert.equal(guardrails.concurrency.material_snapshot_fetch_max, 4);
assert.equal(guardrails.concurrency.published_smoke_max, 1);
assert.equal(guardrails.concurrency.production_load_test_authorized, false);
assert.match(groupedGate, /concurrency:\s*2/);
assert.match(groupedGate, /maximumActive <= 2/);
assert.match(materialHydration, /SUPERICONS_MATERIAL_HYDRATION_CONCURRENCY \|\| '4'/);

assert.equal(guardrails.quality.fixed_suite_cases, 225);
assert.equal(guardrails.quality.labeled_attempts_required, 200);
assert.equal(guardrails.quality.qualifying_days_required, 3);
assert.equal(guardrails.quality.labeled_attempts_per_qualifying_day_min, 30);
assert.equal(guardrails.quality.reviewed_query_mode_combinations_required, 50);
assert.equal(guardrails.quality.error_rate_percent_max, 1);
assert.equal(guardrails.quality.local_search_p95_ms_max, 500);
assert.equal(guardrails.quality.canary_violations_max, 0);
assert.match(daily, /200 labeled controlled eligible `search_icons` attempts/);
assert.match(daily, /at least 30 labeled attempts on each qualifying day/);
assert.match(daily, /50 manually reviewed distinct query and mode combinations/);
assert.match(daily, /local p95 at or below 500 ms/);
assert.match(daily, /Report organic use separately/);

assert.equal(guardrails.usage_integrity.dedupe_verification_required, true);
assert.match(usageDedupeGate, /Different sessions/i);
assert.match(usageDedupeGate, /same session retry/i);

assert.equal(guardrails.material.capability_truth_required, true);
assert.equal(guardrails.material.outline_and_solid_svg_required, true);
assert.match(weekly, /Material capability/);
assert.match(daily, /Material capability truth/);

assert.match(guardrails.release.archive_sha256, /^[a-f0-9]{64}$/);
assert.equal(guardrails.release.exact_14_case_matrix_required, true);
assert.equal(guardrails.release.exact_150_case_route_required, true);
assert.equal(guardrails.release.vc3_vc4_required, true);
assert.equal(guardrails.release.npm_tag, 'beta');
assert.equal(guardrails.release.rollback_beta_tag_to, '0.4.19-beta.1');
assert.equal(guardrails.release.production_functions_must_remain_unchanged, true);
assert.equal(guardrails.release.npm_latest_must_remain_unchanged, true);
assert.equal(guardrails.release.model_provider_calls, 0);

for (const text of [
  JSON.stringify(historicalGuardrails),
  JSON.stringify(guardrails),
  weekly,
  daily,
]) {
  assert.doesNotMatch(text, /[\u2013\u2014]/, 'Beta guardrail output contains forbidden punctuation.');
}

console.log(JSON.stringify({
  status: 'ok',
  package_version: packageJson.version,
  historical_guardrail_version: historicalGuardrails.package_version,
  search_route: guardrails.tool_routes.search_icons_eligible_english,
  search_fallback_route: guardrails.tool_routes.search_icons_fallback,
  recommendation_route: guardrails.tool_routes.recommend_icons,
  grouped_search_internal_max: guardrails.concurrency.grouped_search_internal_max,
  material_snapshot_fetch_max: guardrails.concurrency.material_snapshot_fetch_max,
  published_smoke_max: guardrails.concurrency.published_smoke_max,
  labeled_attempts_required: guardrails.quality.labeled_attempts_required,
  local_search_p95_ms_max: guardrails.quality.local_search_p95_ms_max,
  dedupe_verification_required: guardrails.usage_integrity.dedupe_verification_required,
  dependency_floors: { hono: honoVersion, qs: qsVersion },
  monitoring_routines: ['weekly', 'daily_beta_only'],
  rollback_beta_tag_to: guardrails.release.rollback_beta_tag_to,
  model_provider_calls: guardrails.release.model_provider_calls,
}, null, 2));
