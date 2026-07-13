import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migrationPath = 'supabase/migrations/20260714120000_search_v2_batched_candidates.sql';
const sql = readFileSync(migrationPath, 'utf8');

const rollbackPosition = sql.indexOf('-- Rollback plan:');
const createPosition = sql.indexOf('create or replace function');
assert.ok(rollbackPosition >= 0 && rollbackPosition < createPosition, 'Rollback plan must appear before SQL changes.');
assert.match(sql, /create or replace function public\.si_search_icon_candidates_v3\(\s*p_queries text\[\]/i);
assert.match(sql, /from\s+unnest\([\s\S]*?p_queries[\s\S]*?\)\s+with ordinality/i);
assert.match(sql, /query_variant text/i);
assert.match(sql, /query_variant_rank integer/i);
assert.match(sql, /partition by query_variant_rank/i);
assert.match(sql, /order by query_variant_rank asc, candidate_rank asc/i);
assert.doesNotMatch(sql, /\bsvg\b/i);
assert.match(sql, /grant execute on function public\.si_search_icon_candidates_v3\(text\[\], text, integer\) to service_role/i);
assert.doesNotMatch(sql, /create or replace function public\.si_search_icon_candidates(?:_v2)?\s*\(/i);

console.log(JSON.stringify({
  status: 'ok',
  rpc: 'si_search_icon_candidates_v3',
  input: 'ordered_query_array',
  provenance: ['query_variant', 'query_variant_rank'],
  svg_returned: false,
  production_rpcs_untouched: true,
}, null, 2));
