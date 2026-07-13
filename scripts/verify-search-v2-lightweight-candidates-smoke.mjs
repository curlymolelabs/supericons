import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const containerName = 'supericons_search_v2_lightweight_smoke';
const postgresImage = 'postgres:17-alpine';

function runDocker(args, { input = null } = {}) {
  const result = spawnSync('docker', args, { encoding: 'utf8', input });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
}

function removeContainer() {
  spawnSync('docker', ['rm', '-f', containerName], { encoding: 'utf8' });
}

function waitForDatabase() {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    const result = spawnSync('docker', [
      'exec', containerName, 'pg_isready', '-U', 'postgres', '-d', 'postgres',
    ], { encoding: 'utf8' });
    if (result.status === 0) return;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
  }
  throw new Error('Disposable PostgreSQL did not become ready.');
}

function runSql(sql) {
  return runDocker([
    'exec', '-i', containerName,
    'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-tA',
  ], { input: sql })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

const prerequisiteSql = `
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role;
  end if;
end $$;

create table public.icon_catalog (
  icon_id text primary key,
  name text not null,
  source_library text not null,
  style text not null,
  icon_type text not null,
  search_text text not null,
  search_document tsvector generated always as (to_tsvector('simple', search_text)) stored,
  svg text
);

create table public.icon_search_private_manifest (
  icon_id text primary key references public.icon_catalog(icon_id),
  semantic_aliases text[] not null default '{}',
  use_cases text[] not null default '{}'
);

create table public.icon_search_public_registry_metadata (
  icon_id text primary key references public.icon_catalog(icon_id),
  search_document tsvector not null default ''::tsvector,
  avoid_document tsvector not null default ''::tsvector
);

insert into public.icon_catalog (icon_id, name, source_library, style, icon_type, search_text, svg) values
  ('lucide:settings', 'settings', 'lucide', 'outline', 'svg', 'settings cog gear preferences', '<svg>settings</svg>'),
  ('bootstrap:gear', 'gear', 'bootstrap', 'outline', 'svg', 'settings cog gear options', '<svg>gear</svg>'),
  ('phosphor:reply', 'arrow-bend-up-left', 'phosphor', 'outline', 'svg', 'respond reply message', '<svg>reply</svg>'),
  ('simpleicons:threads', 'threads', 'simpleicons', 'solid', 'svg', 'threads social brand', '<svg>threads</svg>');

insert into public.icon_search_private_manifest (icon_id, semantic_aliases, use_cases) values
  ('lucide:settings', array['cog'], array['application settings']),
  ('bootstrap:gear', array['cog'], array['preferences']),
  ('phosphor:reply', array['respond'], array['message reply']),
  ('simpleicons:threads', array['threads'], array['social brand']);

insert into public.icon_search_public_registry_metadata (icon_id, search_document, avoid_document) values
  ('lucide:settings', to_tsvector('simple', 'settings cog gear preferences'), ''::tsvector),
  ('bootstrap:gear', to_tsvector('simple', 'settings cog gear options'), ''::tsvector),
  ('phosphor:reply', to_tsvector('simple', 'respond reply message'), ''::tsvector),
  ('simpleicons:threads', to_tsvector('simple', 'threads social brand'), to_tsvector('simple', 'respond reply'));
`;

function candidateJson(functionName, query, library = null) {
  const librarySql = library === null ? 'null' : `'${library.replaceAll("'", "''")}'`;
  const querySql = `'${query.replaceAll("'", "''")}'`;
  const removeSvg = functionName === 'si_search_icon_candidates' ? " - 'svg'" : '';
  const [line] = runSql(`
    select coalesce(jsonb_agg(to_jsonb(candidate)${removeSvg}), '[]'::jsonb)
    from public.${functionName}(${querySql}, ${librarySql}, 40) candidate;
  `);
  return JSON.parse(line);
}

removeContainer();
try {
  runDocker([
    'run', '--name', containerName,
    '-e', 'POSTGRES_PASSWORD=local-smoke-only',
    '-e', 'POSTGRES_DB=postgres',
    '-d', postgresImage,
  ]);
  waitForDatabase();
  runSql(prerequisiteSql);
  runSql(readFileSync('supabase/migrations/20260503_icon_catalog_public_payload.sql', 'utf8'));
  runSql(readFileSync('supabase/migrations/20260713150000_search_v2_lightweight_candidates.sql', 'utf8'));

  const cases = [
    { query: 'settings', library: null },
    { query: 'cog', library: 'bootstrap' },
    { query: 'respond', library: 'phosphor' },
    { query: '', library: null },
  ];
  for (const entry of cases) {
    assert.deepEqual(
      candidateJson('si_search_icon_candidates_v2', entry.query, entry.library),
      candidateJson('si_search_icon_candidates', entry.query, entry.library),
      `Candidate parity failed for ${entry.query || '(empty query)'}.`,
    );
  }

  const [returnShapes] = runSql(`
    select concat_ws('|',
      pg_get_function_result('public.si_search_icon_candidates(text,text,integer)'::regprocedure),
      pg_get_function_result('public.si_search_icon_candidates_v2(text,text,integer)'::regprocedure)
    );
  `);
  const [existingShape, lightweightShape] = returnShapes.split('|');
  assert.match(existingShape, /svg text/i);
  assert.doesNotMatch(lightweightShape, /svg text/i);

  const indexUse = runSql(`
    set enable_seqscan = off;
    explain (format json)
    select icon_id, svg from public.icon_catalog where icon_id in ('lucide:settings', 'bootstrap:gear');
  `).join('\n');
  assert.match(indexUse, /Index Scan/);

  runSql('drop function public.si_search_icon_candidates_v2(text, text, integer);');
  assert.equal(candidateJson('si_search_icon_candidates', 'settings').length > 0, true);

  console.log(JSON.stringify({
    status: 'ok',
    database: 'disposable_postgresql_17',
    parity_cases: cases.length,
    v2_svg_column: false,
    existing_rpc_preserved_after_rollback: true,
    final_svg_lookup_plan: 'primary_key_index_scan',
    hosted_systems_touched: false,
  }, null, 2));
} finally {
  removeContainer();
}
