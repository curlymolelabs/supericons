import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const existingPath = 'supabase/migrations/20260503_icon_catalog_public_payload.sql';
const lightweightPath = 'supabase/migrations/20260713150000_search_v2_lightweight_candidates.sql';
const schemaPath = 'supabase/migrations/20260418_hosted_search_engine_schema.sql';

const existing = readFileSync(existingPath, 'utf8');
const lightweight = readFileSync(lightweightPath, 'utf8');
const schema = readFileSync(schemaPath, 'utf8');

const rollbackPosition = lightweight.indexOf('-- Rollback plan:');
const createPosition = lightweight.indexOf('create or replace function');
assert.ok(rollbackPosition >= 0 && rollbackPosition < createPosition, 'Rollback plan must appear before SQL changes.');
assert.match(lightweight, /create or replace function public\.si_search_icon_candidates_v2\(/i);
assert.doesNotMatch(lightweight, /drop function[^;]*si_search_icon_candidates\s*\(/i);
assert.doesNotMatch(lightweight, /create or replace function public\.si_search_icon_candidates\s*\(/i);
assert.match(lightweight, /grant execute on function public\.si_search_icon_candidates_v2[^;]+service_role/i);
assert.match(schema, /create table if not exists public\.icon_catalog\s*\(\s*icon_id text primary key/i);

function functionBody(sql) {
  const start = sql.indexOf('as $$');
  const end = sql.indexOf('$$;', start);
  assert.ok(start >= 0 && end > start, 'SQL function body was not found.');
  return sql
    .slice(start + 5, end)
    .replace(/\bc\.svg,\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

assert.equal(
  functionBody(lightweight),
  functionBody(existing),
  'The v2 matching and ranking body must differ only by removal of c.svg.',
);

const returnsStart = lightweight.indexOf('returns table (');
const returnsEnd = lightweight.indexOf(')\nlanguage sql', returnsStart);
const returnShape = lightweight.slice(returnsStart, returnsEnd);
assert.doesNotMatch(returnShape, /\bsvg\b/i);
for (const field of [
  'icon_id text',
  'name text',
  'source_library text',
  'style text',
  'icon_type text',
  'lexical_rank double precision',
  'registry_rank double precision',
  'avoid_rank double precision',
]) {
  assert.ok(returnShape.includes(field), `Missing v2 return field: ${field}`);
}

console.log(JSON.stringify({
  status: 'ok',
  production_rpc_untouched: true,
  matching_and_ranking_body_equal: true,
  svg_returned_by_v2: false,
  final_svg_lookup_key: 'icon_catalog.icon_id_primary_key',
}, null, 2));
