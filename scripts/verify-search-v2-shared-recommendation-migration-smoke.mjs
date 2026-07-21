import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const containerName = 'supericons_search_v2_shared_recommendation_smoke';
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
  ('phosphor:reply', 'arrow-bend-up-left', 'phosphor', 'outline', 'svg', 'respond reply message', '<svg>reply</svg>');

insert into public.icon_search_private_manifest (icon_id, semantic_aliases, use_cases) values
  ('lucide:settings', array['cog'], array['application settings']),
  ('bootstrap:gear', array['cog'], array['preferences']),
  ('phosphor:reply', array['respond'], array['message reply']);

insert into public.icon_search_public_registry_metadata (icon_id, search_document, avoid_document) values
  ('lucide:settings', to_tsvector('simple', 'settings cog gear preferences'), ''::tsvector),
  ('bootstrap:gear', to_tsvector('simple', 'settings cog gear options'), ''::tsvector),
  ('phosphor:reply', to_tsvector('simple', 'respond reply message'), ''::tsvector);
`;

function sharedCandidateJson(queryGroups, library = null) {
  const librarySql = library === null ? 'null' : `'${library.replaceAll("'", "''")}'`;
  const groupsSql = `'${JSON.stringify(queryGroups).replaceAll("'", "''")}'::jsonb`;
  const [line] = runSql(`
    select coalesce(jsonb_agg(to_jsonb(candidate)), '[]'::jsonb)
    from public.si_search_icon_candidates_v4(${groupsSql}, ${librarySql}, 40) candidate;
  `);
  return JSON.parse(line);
}

function batchedCandidateJson(queries, library = null) {
  const librarySql = library === null ? 'null' : `'${library.replaceAll("'", "''")}'`;
  const queriesSql = `array[${queries
    .map((query) => `'${query.replaceAll("'", "''")}'`)
    .join(',')}]::text[]`;
  const [line] = runSql(`
    select coalesce(jsonb_agg(to_jsonb(candidate)), '[]'::jsonb)
    from public.si_search_icon_candidates_v3(${queriesSql}, ${librarySql}, 40) candidate;
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

  const batchedMigration = readFileSync(
    'supabase/migrations/20260714120000_search_v2_batched_candidates.sql',
    'utf8',
  );
  runSql(batchedMigration);

  const migration = readFileSync(
    'supabase/migrations/20260714190000_search_v2_shared_recommendation_candidates.sql',
    'utf8',
  );
  runSql(migration);
  runSql(migration);

  const queryGroups = [
    { logical_query_index: 0, query_variant: 'cog', query_variant_rank: 0 },
    { logical_query_index: 0, query_variant: 'settings', query_variant_rank: 1 },
    { logical_query_index: 1, query_variant: 'respond', query_variant_rank: 0 },
    { logical_query_index: 2, query_variant: 'cog', query_variant_rank: 0 },
  ];
  const rows = sharedCandidateJson(queryGroups);

  assert.ok(rows.some((row) => row.logical_query_index === 0 && row.query_variant_rank === 0));
  assert.ok(rows.some((row) => row.logical_query_index === 0 && row.query_variant_rank === 1));
  assert.ok(rows.some((row) => row.logical_query_index === 1 && row.query_variant_rank === 0));
  assert.ok(rows.some((row) => row.logical_query_index === 2 && row.query_variant_rank === 0));
  assert.equal(rows.every((row) => row.svg === undefined), true);
  assert.equal(
    rows.every((row) => queryGroups.some((group) => (
      group.logical_query_index === row.logical_query_index
      && group.query_variant === row.query_variant
      && group.query_variant_rank === row.query_variant_rank
    ))),
    true,
  );

  const lucideRows = sharedCandidateJson(queryGroups, 'lucide');
  assert.equal(lucideRows.length > 0, true);
  assert.equal(lucideRows.every((row) => row.source_library === 'lucide'), true);

  const parityQueries = ['settings', 'hello', 'cog', 'respond'];
  const parityGroups = parityQueries.map((query, index) => ({
    logical_query_index: index,
    query_variant: query,
    query_variant_rank: 0,
  }));
  const sharedParityRows = sharedCandidateJson(parityGroups)
    .map(({ query_variant_rank, ...row }) => row);
  const batchedParityRows = batchedCandidateJson(parityQueries)
    .map(({ query_variant_rank, ...row }) => ({
      logical_query_index: query_variant_rank,
      ...row,
    }));
  assert.deepEqual(sharedParityRows, batchedParityRows);

  runSql('drop function public.si_search_icon_candidates_v4(jsonb, text, integer);');
  const [functionCount] = runSql(`
    select count(*)
    from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname = 'si_search_icon_candidates_v4';
  `);
  assert.equal(functionCount, '0');

  console.log(JSON.stringify({
    status: 'ok',
    database: 'disposable_postgresql_17',
    migration_idempotent: true,
    logical_queries: 3,
    query_variants: queryGroups.length,
    provenance_preserved: true,
    svg_returned: false,
    library_filter_preserved: true,
    exact_batched_result_parity: true,
    rollback_isolated: true,
    hosted_systems_touched: false,
  }, null, 2));
} finally {
  removeContainer();
}
