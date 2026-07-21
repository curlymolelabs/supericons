import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  buildDashboardV2HistoryState,
  parseDashboardV2Filters,
} from '../lib/admin-dashboard-v2.js';

const api = await readFile('supabase/functions/admin-api/index.ts', 'utf8');
const frontend = await readFile('public/admin-app.js', 'utf8');

const oneDay = parseDashboardV2Filters(
  new URL('https://example.test/v2/search?window=1d&channel=local_mcp&include_test=false'),
  new Date('2026-07-21T12:00:00.000Z'),
);
assert.equal(oneDay.use_raw, true, 'The 24h range must remain a rolling raw-data window.');
assert.equal(oneDay.channel, 'local_mcp');
assert.equal(oneDay.include_test, false);

assert.match(api, /V2_MAX_RAW_ROWS_PER_SOURCE = 30000/);
assert.match(api, /V2_MAX_IDENTITY_ROWS_PER_SOURCE = 30000/);
assert.match(
  api,
  /V2_MAX_RAW_ROWS_PER_SOURCE \+ 1,[\s\S]{0,100}filters\.channel,[\s\S]{0,100}filters\.use_raw && !filters\.include_test/,
  'The raw source query must apply the selected venue and live-data scope before its row allowance.',
);
assert.match(
  api,
  /\['search_outcome', 'tool_call'\]/,
  'The raw source query must exclude unrelated MCP events before its row allowance.',
);
assert.match(
  api,
  /if \(filters\.channel !== 'all'\) query = query\.eq\('channel', filters\.channel\);/,
  'The detailed identity query must apply the selected venue before pagination.',
);
assert.doesNotMatch(
  api,
  /Complete searcher-level history exceeds the safe detail limit/,
  'The dashboard must not blank search history when a detail allowance is reached.',
);

assert.deepEqual(buildDashboardV2HistoryState({ truncated: false, rowLimit: 30000 }), {
  queries_available: true,
  queries_complete: true,
  queries_notice: null,
  queries_unavailable_reason: null,
  queries_export_available: true,
  queries_export_unavailable_reason: null,
});

const bounded = buildDashboardV2HistoryState({ truncated: true, rowLimit: 30000 });
assert.equal(bounded.queries_available, true, 'Bounded history must remain visible.');
assert.equal(bounded.queries_complete, false, 'Bounded history must be labelled incomplete.');
assert.equal(bounded.queries_export_available, false, 'An incomplete history export must be blocked.');
assert.match(bounded.queries_notice, /30,000 records from each search log/);
assert.match(bounded.queries_notice, /Older matching searches may be omitted/);
assert.match(bounded.queries_export_unavailable_reason, /narrower date range or venue/i);

assert.match(frontend, /state\.data\.search\?\.queries_complete === false/);
assert.match(frontend, /first\.queries_export_available === false/);

console.log(JSON.stringify({
  status: 'ok',
  raw_row_limit_per_source: 30000,
  history_behavior_at_limit: 'show_bounded_rows_with_notice',
  complete_export_at_limit: 'blocked',
  selected_venue_applied_before_source_limit: true,
}, null, 2));
