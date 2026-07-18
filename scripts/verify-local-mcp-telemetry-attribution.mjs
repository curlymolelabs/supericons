import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const migrationPath = 'supabase/migrations/20260718100000_local_mcp_telemetry_attribution.sql';
const localMcpSource = readFileSync('mcp/index.js', 'utf8');
const telemetrySource = readFileSync('mcp/telemetry.js', 'utf8');
const measurementPlan = readFileSync(
  'docs/si-v2/search/experiments/deterministic-mcp-beta-measurement-and-rollback-plan-2026-07-12.md',
  'utf8',
);

assert.ok(existsSync(migrationPath), 'Local MCP telemetry correction migration is missing.');
assert.doesNotMatch(
  localMcpSource,
  /channel:\s*betaCohort\s*\?\s*'hosted_mcp'\s*:\s*'local_mcp'/,
  'A beta cohort must not change a local MCP client into Hosted MCP.',
);
assert.match(localMcpSource, /channel:\s*'local_mcp'/);
assert.match(localMcpSource, /environment:\s*'production'/);
assert.match(telemetrySource, /p_ui_surface:\s*'local_mcp'/);
assert.match(measurementPlan, /channel is `local_mcp`/);
assert.match(measurementPlan, /environment is `production`/);

const migration = readFileSync(migrationPath, 'utf8');
assert.match(migration, /create or replace function public\.si_log_mcp_search_outcome_v2/);
assert.match(migration, /'local_mcp'/);
assert.match(migration, /'production'/);
assert.match(migration, /create trigger normalize_local_mcp_search_audit_attribution/);
assert.match(migration, /create trigger normalize_local_mcp_icon_evidence_attribution/);
assert.match(migration, /update public\.mcp_usage_events/);
assert.match(migration, /update public\.search_request_audit/);
assert.match(migration, /update public\.icon_evidence/);

console.log(JSON.stringify({
  status: 'ok',
  venue: 'local_mcp',
  environment: 'production',
  beta_cohort_separate: true,
  current_package_compatible: true,
  historical_correction_present: true,
}, null, 2));
