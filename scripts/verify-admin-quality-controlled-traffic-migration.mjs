import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const path = 'supabase/migrations/20260722230000_admin_quality_controlled_traffic_correction.sql';
const sql = await readFile(path, 'utf8');

assert.match(sql, /begin;/i);
assert.match(sql, /commit;/i);
assert.match(sql, /Rollback plan:/);
assert.match(sql, /metadata\s*=\s*coalesce\(metadata, '\{\}'::jsonb\)/i);
assert.match(sql, /'traffic_class',[\s\S]*'controlled_test'/i);
assert.match(sql, /beta_cohort\s*=\s*'controlled-run:historical-validation'/i);
assert.match(sql, /event_type\s*=\s*'search_outcome'/i);
assert.match(sql, /channel\s*=\s*'local_mcp'/i);
assert.match(sql, /client_family\s*=\s*'mcp_stdio'/i);
assert.match(sql, /tool_name\s*=\s*'recommend_icons'/i);
assert.match(sql, /created_at\s*>=\s*timestamptz '2026-07-20 00:00:00\+00'/i);
assert.match(sql, /created_at\s*<\s*timestamptz '2026-07-23 00:00:00\+00'/i);
assert.doesNotMatch(sql, /delete\s+from/i);

console.log(JSON.stringify({
  status: 'ok',
  migration: path,
  bounded_time_window: true,
  controlled_traffic_only: true,
  destructive_delete: false,
}, null, 2));
