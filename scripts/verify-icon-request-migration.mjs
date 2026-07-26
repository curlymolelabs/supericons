import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const containerName = 'supericons_icon_request_smoke';
const migration = readFileSync(
  'supabase/migrations/20260727120000_icon_request_events.sql',
  'utf8',
);

function runDocker(args, { input = null, expectFailure = false } = {}) {
  const result = spawnSync('docker', args, { encoding: 'utf8', input });
  if (expectFailure) {
    assert.notEqual(result.status, 0, `Expected SQL failure, received: ${result.stdout}`);
    return result.stderr;
  }
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

function runSql(sql, { expectFailure = false } = {}) {
  const result = spawnSync('docker', [
    'exec', '-i', containerName,
    'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-tA',
  ], { encoding: 'utf8', input: sql });
  if (expectFailure) {
    assert.notEqual(result.status, 0, `Expected SQL failure, received: ${result.stdout}`);
    return result.stderr;
  }
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

removeContainer();
try {
  runDocker([
    'run', '--name', containerName,
    '-e', 'POSTGRES_PASSWORD=local-smoke-only',
    '-e', 'POSTGRES_DB=postgres',
    '-d', 'postgres:17-alpine',
  ]);
  waitForDatabase();
  runSql(`
    create extension if not exists pgcrypto;
    do $$
    begin
      if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
      if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
      if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role bypassrls; end if;
    end $$;

    create table public.icon_evidence (
      id uuid primary key default gen_random_uuid(),
      signal_type text not null,
      icon_id text,
      batch_id uuid,
      collection_id text,
      search_query text,
      result_position integer,
      time_to_copy_ms integer,
      ui_surface text,
      domain text,
      job_category text,
      replaced_with text,
      retained_days integer,
      agent_converged boolean,
      confidence double precision,
      evidence_text text,
      context_url text,
      session_hash text not null,
      created_at timestamptz not null default timezone('utc', now()),
      result_count integer,
      library_filter text,
      constraint icon_evidence_signal_type_valid check (
        signal_type in (
          'copy', 'replace', 'kit_download', 'mcp_call', 'editorial',
          'favorite', 'collection', 'social_gallery', 'search_attempt'
        )
      ),
      constraint icon_evidence_icon_or_collection_required check (
        icon_id is not null
        or signal_type in ('kit_download', 'collection', 'social_gallery', 'search_attempt')
      ),
      constraint icon_evidence_result_count_nonnegative check (
        result_count is null or result_count >= 0
      )
    );

    revoke all on table public.icon_evidence from public;
    grant select, insert, update, delete on table public.icon_evidence to service_role;

    create function public.si_log_icon_evidence(p_signal_type text)
    returns text
    language sql
    as $$ select p_signal_type $$;
  `);

  const evidenceFunctionBefore = runSql(`
    select md5(pg_get_functiondef('public.si_log_icon_evidence(text)'::regprocedure));
  `);
  runSql(migration);
  runSql(migration);
  const evidenceFunctionAfter = runSql(`
    select md5(pg_get_functiondef('public.si_log_icon_evidence(text)'::regprocedure));
  `);
  assert.equal(evidenceFunctionAfter, evidenceFunctionBefore, 'The existing evidence RPC changed.');

  runSql(`
    select public.si_log_icon_request(
      'Missing calendar badge',
      'grid_empty_feedback',
      repeat('a', 64),
      'calendar badge',
      0,
      'all',
      null,
      'supericons.dev',
      '/'
    );
    select public.si_log_icon_request(
      'More precise route icon',
      'grid_low_result_feedback',
      repeat('b', 64),
      'route marker',
      2
    );
    select public.si_log_icon_request(
      'A standalone sidebar request',
      'sidebar_request',
      repeat('c', 64)
    );
  `);

  assert.equal(
    runSql(`
      select concat_ws('|',
        count(*),
        count(*) filter (where signal_type = 'icon_request'),
        count(*) filter (where ui_surface = 'sidebar_request' and search_query is null and result_count is null)
      )
      from public.icon_evidence;
    `),
    '3|3|1',
  );

  for (const invalidSql of [
    `select public.si_log_icon_request('Bad pair', 'sidebar_request', repeat('d', 64), 'query only', null);`,
    `select public.si_log_icon_request('Bad zero', 'grid_empty_feedback', repeat('e', 64), 'query', 1);`,
    `select public.si_log_icon_request('Bad low', 'grid_low_result_feedback', repeat('f', 64), 'query', 3);`,
    `select public.si_log_icon_request('Bad surface', 'unknown', repeat('0', 64));`,
  ]) {
    runSql(invalidSql, { expectFailure: true });
  }

  assert.equal(
    runSql(`
      select has_function_privilege(
        'anon',
        'public.si_log_icon_request(text,text,text,text,integer,text,text,text,text)',
        'EXECUTE'
      );
    `),
    't',
  );
  runSql('set role anon; select * from public.icon_evidence;', { expectFailure: true });

  runSql(`
    revoke all on function public.si_log_icon_request(
      text, text, text, text, integer, text, text, text, text
    ) from public, anon, authenticated, service_role;
    drop function public.si_log_icon_request(
      text, text, text, text, integer, text, text, text, text
    );
  `);
  assert.equal(
    runSql(`select count(*) from public.icon_evidence where signal_type = 'icon_request';`),
    '3',
    'Operational rollback removed request evidence.',
  );

  console.log(JSON.stringify({
    status: 'ok',
    database: 'disposable_postgresql_17',
    migration_applied_twice: true,
    existing_evidence_rpc_unchanged: true,
    valid_surfaces_written: 3,
    invalid_contexts_rejected: 4,
    standalone_null_context_saved: true,
    anonymous_rpc_execute_granted: true,
    public_table_read_rejected: true,
    operational_rollback_preserved_rows: true,
    hosted_systems_touched: false,
  }, null, 2));
} finally {
  removeContainer();
}
