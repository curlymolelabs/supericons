import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [app, api, helper, telemetry, localServer, migration] = await Promise.all([
  readFile('public/admin-app.js', 'utf8'),
  readFile('supabase/functions/admin-api/index.ts', 'utf8'),
  readFile('lib/admin-dashboard-v2.js', 'utf8'),
  readFile('mcp/telemetry.js', 'utf8'),
  readFile('mcp/index.js', 'utf8'),
  readFile('supabase/migrations/20260718190000_mcp_usage_query_origin_attribution.sql', 'utf8'),
]);
const queryExplorerRenderer = app.slice(
  app.indexOf('function renderQueryExplorer()'),
  app.indexOf('function renderWorklist()'),
);

assert.doesNotMatch(
  app,
  /const STANDARD_CHANNELS = \[[^\]]*['"]api['"][^\]]*\]/,
  'The venue menu must not advertise an API venue without an active producer.',
);
assert.doesNotMatch(
  app,
  /const STANDARD_CHANNELS = \[[^\]]*['"]cli['"][^\]]*\]/,
  'The venue menu must not advertise a CLI venue without an active producer.',
);
assert.doesNotMatch(
  api,
  /QUERY_CHANNEL_FILTERS[^\n]*['"](?:api|cli)['"]/,
  'The API must not accept venue filters that have no active producer.',
);
assert.doesNotMatch(
  app,
  /minimum_across_attempts/,
  'The browser must not present a minimum as if it were an exact result count.',
);
assert.match(
  queryExplorerRenderer,
  /\{\s*label:\s*'Requests'/,
  'Search history must show the request count for each query summary.',
);
assert.match(
  queryExplorerRenderer,
  /\{\s*label:\s*'Est\. client IDs'/,
  'Search history must show the estimated client ID count without claiming people.',
);
assert.match(
  queryExplorerRenderer,
  /\{\s*label:\s*'Typical result'/,
  'Search history must show the median recorded result count.',
);
assert.match(
  api,
  /maximum_result_count/,
  'The API must retain both ends of a grouped result-count range.',
);
assert.match(
  helper,
  /range_across_attempts/,
  'Compact query rows must label varying result counts as a range.',
);
assert.match(
  api,
  /separateQueryOrigins:\s*true,[\s\S]*separateChannels:\s*false,[\s\S]*separateSearchers:\s*false,[\s\S]*includeSearcherDetails:\s*false/,
  'Search history must group by query, library, and origin without splitting rows by venue or searcher.',
);
assert.match(
  api,
  /query_row_grain:\s*\['query',\s*'library_filter',\s*'query_origin'\]/,
  'Search history must publish its exact summary grain.',
);
assert.match(
  api,
  /separateChannels\s*=\s*false/,
  'Raw and rollup query grouping must expose an explicit venue-separation option.',
);
assert.match(
  helper,
  /country_count:/,
  'Compact query rows must state how many countries were grouped.',
);
assert.match(
  telemetry,
  /export function getMcpTelemetrySessionHash\(\)/,
  'Local hosted-fallback searches must reuse the local telemetry session identity.',
);
assert.match(
  localServer,
  /session_hash:\s*getMcpTelemetrySessionHash\(\)/,
  'Local MCP hosted-fallback requests must send the privacy-safe session hash.',
);
assert.match(
  migration,
  /when 'recommend_icons' then 'agent_query'/,
  'Local recommendation tool events must be attributed as user queries.',
);
assert.match(
  migration,
  /create trigger normalize_mcp_usage_query_origin/,
  'Future local MCP tool events must receive query-origin attribution.',
);
assert.match(
  migration,
  /update public\.mcp_usage_events[\s\S]*where query_origin is null/,
  'Existing local MCP tool events with missing attribution must be corrected.',
);

console.log(JSON.stringify({
  status: 'ok',
  checks: 17,
  contract: 'admin_dashboard_v2_telemetry_integrity',
}));
