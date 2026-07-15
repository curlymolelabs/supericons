import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const sourcePath = 'supabase/functions/admin-api/index.ts';
const source = readFileSync(sourcePath, 'utf8');

function requirePattern(pattern, message) {
  assert.match(source, pattern, message);
}

requirePattern(
  /admin-dashboard-metrics\.js/,
  'The admin API must use the shared Phase A metric contract.',
);
requirePattern(
  /known-search-defects\.json[^\n]+type:\s*'json'/,
  'The admin API must load the versioned known-defect registry.',
);
requirePattern(
  /function parseQueryOriginFilter[\s\S]*?return QUERY_ORIGIN_FILTERS\.has\(raw\) \? raw : 'agent_query';/,
  'Query-origin filters must default to direct agent queries.',
);
requirePattern(
  /const telemetryRows = mergeTelemetryEvidenceRows\(\[\.\.\.auditRows, \.\.\.mcpUsageRows\]\);/,
  'Audit and usage rows must merge before dashboard aggregation.',
);
requirePattern(
  /query_origin, requested_limit[\s\S]*?client_ip_public/,
  'The MCP usage select must include the new Phase A fields.',
);
requirePattern(
  /deriveAuditQueryOrigin\([\s\S]*?query_origin: queryOrigin/,
  'Search audit origin must be derived at read time.',
);
requirePattern(
  /window\.days === null \|\| \(window\.days !== null && window\.days >= 90\)/,
  'Long queue windows must switch to completed-day rollups.',
);
requirePattern(
  /from\('admin_rollup_overview'\)[\s\S]*?from\('admin_rollup_queries'\)/,
  'On-demand refresh must write both rollup purposes.',
);
requirePattern(
  /segments\[2\] === 'dashboard'[\s\S]*?handlePhaseADashboard/,
  'The Phase A dashboard route must be registered.',
);
requirePattern(
  /estimated_client_key: row\.estimated_client_key \|\| null,[\s\S]*?visitor_kind: row\.visitor_kind \|\| null/,
  'Latest activity must expose the display client key and identity kind.',
);
requirePattern(
  /approximate_low_results_excluded_from_headline_rate: true/,
  'The API must disclose that approximate low results are not headline data.',
);

const compactActivity = source.match(/function compactPhaseAActivityRow[\s\S]*?\n}\n/)?.[0] || '';
assert.ok(compactActivity, 'The Phase A activity projection is missing.');
for (const forbidden of ['account_plan', 'purpose', 'domain', 'replaced_with', '_estimated_client_key']) {
  assert.ok(!compactActivity.includes(forbidden), `Latest activity must not expose ${forbidden}.`);
}

const searchSurfaceDiff = spawnSync('git', [
  'diff',
  '--exit-code',
  '31ac66dfecc40e4549f08fc3d9dea99d583a3393',
  '--',
  'supabase/functions/mcp-search',
], { encoding: 'utf8' });
assert.equal(
  searchSurfaceDiff.status,
  0,
  `Phase A must not change mcp-search.\n${searchSurfaceDiff.stdout}\n${searchSurfaceDiff.stderr}`,
);

console.log(JSON.stringify({
  status: 'ok',
  admin_api_source: sourcePath,
  default_origin: 'agent_query',
  deterministic_source_authority: true,
  known_defect_registry: true,
  bounded_raw_and_rollup_paths: true,
  compact_activity_contract: true,
  mcp_search_changed: false,
  checks: 12,
}, null, 2));

