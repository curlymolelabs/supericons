import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  DETERMINISTIC_BETA_COHORT,
  getBetaCohortForTool,
  getBetaCohortForVersion,
  getDefaultHostedSearchFunctionName,
  getHostedSearchFunctionNameForTool,
} from '../mcp/release-channel.js';
import { logMcpSearchAttempt } from '../mcp/telemetry.js';

function read(path) {
  return readFileSync(path, 'utf8');
}

const packageJson = JSON.parse(read('mcp/package.json'));
const packageLock = JSON.parse(read('mcp/package-lock.json'));
const migration = read('supabase/migrations/20260712_search_v2_beta_measurement.sql');
const toolLatencyMigration = read('supabase/migrations/20260714180000_search_v2_tool_latency_evidence.sql');
const lightweightCandidateMigration = read('supabase/migrations/20260713150000_search_v2_lightweight_candidates.sql');
const handler = read('supabase/functions/_shared/search-engine/handle-search-request.ts');
const betaEndpoint = read('supabase/functions/mcp-search-v2-beta/index.ts');
const supabaseConfig = read('supabase/config.toml');
const hostedClient = read('mcp/hosted-search-client.js');
const localMcp = read('mcp/index.js');
const hostedMcp = read('mcp/remote-server.js');
const adminApi = read('supabase/functions/admin-api/index.ts');
const hostedMigrationRunner = read('scripts/apply-search-v2-beta-hosted.ps1');

assert.equal(packageJson.version, '0.4.19-beta.1');
assert.equal(packageLock.version, packageJson.version);
assert.equal(packageLock.packages[''].version, packageJson.version);
assert.ok(packageJson.files.includes('release-channel.js'));
assert.equal(getDefaultHostedSearchFunctionName(packageJson.version), 'mcp-search-v2-beta');
assert.equal(getDefaultHostedSearchFunctionName('0.4.17'), 'mcp-search');
assert.equal(getBetaCohortForVersion(packageJson.version), DETERMINISTIC_BETA_COHORT);
assert.equal(getBetaCohortForVersion('0.4.17'), null);
assert.equal(getHostedSearchFunctionNameForTool(packageJson.version, 'recommend_icons'), 'mcp-search');
assert.equal(getBetaCohortForTool(packageJson.version, 'recommend_icons'), null);

assert.ok(betaEndpoint.includes("defaultSource: 'mcp_beta'"));
assert.ok(betaEndpoint.includes("defaultEnvironment: 'preview'"));
assert.ok(betaEndpoint.includes(`betaCohort: '${DETERMINISTIC_BETA_COHORT}'`));
const betaVariant = betaEndpoint.includes("measurementVariant: 'control'") ? 'control' : 'treatment';
if (betaVariant === 'control') {
  assert.ok(betaEndpoint.includes("candidateRpcName: 'si_search_icon_candidates'"));
  assert.ok(betaEndpoint.includes('hydrateFinalSvg: false'));
} else {
  assert.ok(betaEndpoint.includes("measurementVariant: 'treatment'"));
  assert.ok(betaEndpoint.includes("candidateRpcName: 'si_search_icon_candidates_v2'"));
  assert.ok(betaEndpoint.includes("candidateBatchRpcName: 'si_search_icon_candidates_v3'"));
  assert.ok(betaEndpoint.includes('hydrateFinalSvg: true'));
  assert.ok(betaEndpoint.includes('includeTimingInResponse: true'));
}
assert.match(lightweightCandidateMigration, /create or replace function public\.si_search_icon_candidates_v2/);
assert.doesNotMatch(lightweightCandidateMigration, /drop function[^;]*si_search_icon_candidates\s*\(/i);
assert.match(supabaseConfig, /\[functions\.mcp-search-v2-beta\]\s+verify_jwt = false/);
assert.ok(hostedClient.includes('getHostedSearchFunctionNameForTool'));
assert.ok(hostedClient.includes('beta_cohort'));
assert.ok(hostedMigrationRunner.includes(
  '$script:databaseUrl = "${poolerUrl}?sslmode=require&application_name=supericons_gate_b"',
), 'hosted runner must preserve the pooler URL when adding connection options');

const rollbackPosition = migration.indexOf('-- Rollback plan');
const firstAlterPosition = migration.indexOf('alter table');
assert.ok(rollbackPosition >= 0 && rollbackPosition < firstAlterPosition);
for (const field of ['library_mode', 'search_outcome', 'confidence_label', 'beta_cohort']) {
  assert.ok(migration.includes(`add column if not exists ${field} text`), `${field} migration is missing`);
  assert.ok(handler.includes(field), `${field} hosted audit write is missing`);
  assert.ok(adminApi.includes(field), `${field} admin read is missing`);
}
assert.ok(migration.includes('create or replace function public.si_log_mcp_search_outcome'));
assert.ok(toolLatencyMigration.includes('create or replace function public.si_log_mcp_search_outcome_v2'));
for (const field of ['worker_state', 'worker_request_ordinal', 'module_age_ms_at_handler_entry']) {
  assert.ok(toolLatencyMigration.includes(`add column if not exists ${field}`), `${field} migration is missing`);
  assert.ok(handler.includes(field), `${field} hosted audit write is missing`);
}
assert.ok(migration.includes("search_outcome in ('results', 'clarification', 'zero', 'error')"));
assert.ok(migration.includes("library_mode in ('strict', 'prefer', 'all')"));
assert.ok(migration.includes("confidence_label in ('low', 'medium', 'high')"));
assert.ok(migration.includes('where beta_cohort is not null'));

assert.ok(handler.includes("search_outcome: results.length > 0 ? 'results' : 'zero'"));
assert.ok(handler.includes("search_outcome: 'error'"));
assert.ok(handler.includes('confidence_label: auditQueryFrame.confidence_floor'));
assert.ok(localMcp.includes('searchOutcome: payload.needs_clarification'));
assert.ok(localMcp.includes("? 'clarification'"));
assert.ok(localMcp.includes("toolName: 'recommend_icons'"));
assert.ok(localMcp.includes("channel: betaCohort ? 'hosted_mcp' : 'local_mcp'"));
assert.ok(localMcp.includes("environment: betaCohort ? 'preview' : 'local'"));
assert.ok(hostedMcp.includes("event_type: ['search_icons', 'recommend_icons'].includes(toolName)"));
assert.ok(adminApi.includes("if (searchOutcome === 'clarification')"));
assert.ok(adminApi.includes("signal_type: row.beta_cohort || hasIconAttempt ? 'hosted_search_audit' : 'search_attempt'"));
assert.ok(adminApi.includes("signal_type: row.event_type === 'search_outcome' ? 'search_attempt' : 'mcp_call'"));
assert.ok(adminApi.includes('locale_attempt_counts'));

const originalFetch = globalThis.fetch;
const originalConsoleError = console.error;
let capturedRequest = null;
try {
  globalThis.fetch = async (url, options) => {
    capturedRequest = { url: String(url), options };
    return new Response(null, { status: 204 });
  };
  await logMcpSearchAttempt({
    query: 'hello',
    resultCount: 0,
    libraryFilter: 'all',
    libraryMode: 'all',
    searchOutcome: 'clarification',
    toolName: 'recommend_icons',
    locale: 'en',
    confidenceLabel: 'low',
    betaCohort: DETERMINISTIC_BETA_COHORT,
    mcpServerVersion: packageJson.version,
    latencyMs: 1234.4,
  });
  assert.ok(capturedRequest?.url.endsWith('/rest/v1/rpc/si_log_mcp_search_outcome_v2'));
  const body = JSON.parse(capturedRequest.options.body);
  assert.equal(body.p_search_outcome, 'clarification');
  assert.equal(body.p_result_count, 0);
  assert.equal(body.p_library_mode, 'all');
  assert.equal(body.p_tool_name, 'recommend_icons');
  assert.equal(body.p_beta_cohort, DETERMINISTIC_BETA_COHORT);
  assert.equal(body.p_mcp_server_version, packageJson.version);
  assert.equal(body.p_latency_ms, 1234);
  assert.match(body.p_session_hash, /^[a-f0-9]{64}$/);

  let failureLogged = false;
  console.error = () => {
    failureLogged = true;
  };
  globalThis.fetch = async () => new Response(null, { status: 503 });
  await logMcpSearchAttempt({
    query: 'database',
    resultCount: 0,
    libraryMode: 'strict',
    searchOutcome: 'error',
    toolName: 'search_icons',
    betaCohort: DETERMINISTIC_BETA_COHORT,
    mcpServerVersion: packageJson.version,
  });
  assert.equal(failureLogged, true, 'audit write failure should be contained and reported');
} finally {
  globalThis.fetch = originalFetch;
  console.error = originalConsoleError;
}

console.log(JSON.stringify({
  status: 'ok',
  package_version: packageJson.version,
  beta_endpoint: 'mcp-search-v2-beta',
  beta_cohort: DETERMINISTIC_BETA_COHORT,
  beta_measurement_variant: betaVariant,
  audit_fields: [
    'library_mode',
    'search_outcome',
    'confidence_label',
    'beta_cohort',
    'worker_state',
    'worker_request_ordinal',
    'module_age_ms_at_handler_entry',
    'latency_ms',
  ],
  telemetry_success_path: 'verified_with_stub_transport',
  telemetry_failure_path: 'contained_with_stub_transport',
}, null, 2));
