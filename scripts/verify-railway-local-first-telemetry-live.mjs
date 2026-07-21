import assert from 'node:assert/strict';

import { SUPABASE_URL } from '../mcp/auth.js';

const serviceRoleKey = process.env.SUPERICONS_SUPABASE_SERVICE_ROLE_KEY
  || process.env.SUPABASE_SERVICE_ROLE_KEY;
assert.ok(serviceRoleKey, 'Run this check with the Railway MCP service environment.');

const minimumEvents = Math.max(1, Number(process.argv[2] || 11));
const windowStart = new Date(Date.now() - (15 * 60 * 1000)).toISOString();
const query = new URLSearchParams({
  select: 'created_at,tool_name,query_norm,result_count,status,metadata,client_family,channel',
  tool_name: 'eq.recommend_icons',
  created_at: `gte.${windowStart}`,
  order: 'created_at.desc',
  limit: '100',
});
const response = await fetch(`${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/mcp_usage_events?${query}`, {
  headers: {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  },
});
assert.equal(response.ok, true, `Telemetry read failed with HTTP ${response.status}.`);
const rows = await response.json();
const localFirstRows = rows.filter((row) => row.metadata?.search_execution === 'local_first');

assert.ok(
  localFirstRows.length >= minimumEvents,
  `Expected at least ${minimumEvents} recent local-first recommendation events, found ${localFirstRows.length}.`,
);
assert.ok(localFirstRows.every((row) => row.channel === 'hosted_mcp'));
assert.ok(localFirstRows.every((row) => row.status === 'ok'));
assert.ok(localFirstRows.every((row) => Number.isInteger(row.result_count)));

console.log(JSON.stringify({
  status: 'ok',
  recent_local_first_recommendation_events: localFirstRows.length,
  latest_event_at: localFirstRows[0]?.created_at || null,
  channels: [...new Set(localFirstRows.map((row) => row.channel))],
  client_families: [...new Set(localFirstRows.map((row) => row.client_family))],
  execution_modes: [...new Set(localFirstRows.map((row) => row.metadata?.search_execution))],
  statuses: [...new Set(localFirstRows.map((row) => row.status))],
}, null, 2));
