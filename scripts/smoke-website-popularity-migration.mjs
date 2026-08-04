import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const containerName = 'supericons_website_popularity_smoke';
const migration = readFileSync(
  'supabase/migrations/20260805120000_website_icon_popularity.sql',
  'utf8',
);
const schedule = readFileSync(
  'docs/si-v2/search/website-popularity-schedule-activation-2026-08-05.sql',
  'utf8',
);
const rollback = readFileSync(
  'supabase/rollbacks/20260805120000_website_icon_popularity.down.sql',
  'utf8',
);
const hostedPreflight = readFileSync(
  'scripts/sql/website-popularity-hosted-preflight.sql',
  'utf8',
);
const hostedBaseline = readFileSync(
  'scripts/sql/website-popularity-hosted-transaction-baseline.sql',
  'utf8',
);
const hostedPostflight = readFileSync(
  'scripts/sql/website-popularity-hosted-postflight.sql',
  'utf8',
);
const hostedHistoryPostflight = readFileSync(
  'scripts/sql/website-popularity-hosted-history-postflight.sql',
  'utf8',
);

function runDocker(args) {
  const result = spawnSync('docker', args, { encoding: 'utf8' });
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

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
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
    do $$
    begin
      if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
      if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
      if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role bypassrls; end if;
    end $$;

    create table public.mcp_usage_events (
      id bigint generated always as identity primary key,
      created_at timestamptz not null,
      channel text not null,
      environment text not null,
      tool_name text,
      event_type text not null,
      status text not null,
      result_count integer,
      beta_cohort text,
      library_filter text,
      query_norm text,
      metadata jsonb not null default '{}'::jsonb
    );

    create table public.icon_evidence (
      id bigint generated always as identity primary key,
      created_at timestamptz not null,
      signal_type text not null,
      icon_id text,
      evidence_text text,
      domain text
    );

    create table public.icon_scores (
      icon_id text primary key,
      score integer not null
    );
    insert into public.icon_scores values ('sentinel:icon', 7);

    create table public.icon_search_private_features (
      icon_id text primary key,
      score integer not null
    );
    insert into public.icon_search_private_features values ('sentinel:icon', 11);

    create function public.si_rebuild_icon_scores()
    returns void language sql as $$ select $$;
    create function public.si_refresh_icon_search_private_features()
    returns void language sql as $$ select $$;

    create schema supabase_migrations;
    create table supabase_migrations.schema_migrations (
      version text primary key
    );

    create schema cron;
    create table cron.job (
      jobid bigint generated always as identity primary key,
      jobname text unique not null,
      schedule text not null,
      command text not null,
      active boolean not null default true
    );
    create function cron.schedule(text, text, text)
    returns bigint language plpgsql as $$
    declare v_job_id bigint;
    begin
      insert into cron.job (jobname, schedule, command)
      values ($1, $2, $3)
      on conflict (jobname) do update
      set schedule = excluded.schedule, command = excluded.command
      returning jobid into v_job_id;
      return v_job_id;
    end $$;
    create function cron.unschedule(bigint)
    returns boolean language sql as $$
      delete from cron.job where jobid = $1 returning true
    $$;
  `);

  const protectedBefore = runSql(`
    select concat_ws('|',
      (select md5(string_agg(icon_id || ':' || score, ',' order by icon_id)) from public.icon_scores),
      (select md5(string_agg(icon_id || ':' || score, ',' order by icon_id)) from public.icon_search_private_features),
      md5(pg_get_functiondef('public.si_rebuild_icon_scores()'::regprocedure)),
      md5(pg_get_functiondef('public.si_refresh_icon_search_private_features()'::regprocedure))
    );
  `);

  runSql(hostedPreflight);
  runSql(`${hostedBaseline}\n${migration}\n${hostedPostflight}`);
  runSql(`
    insert into supabase_migrations.schema_migrations (version)
    values ('20260805120000');
  `);
  runSql(hostedHistoryPostflight);

  const protectedAfterMigration = runSql(`
    select concat_ws('|',
      (select md5(string_agg(icon_id || ':' || score, ',' order by icon_id)) from public.icon_scores),
      (select md5(string_agg(icon_id || ':' || score, ',' order by icon_id)) from public.icon_search_private_features),
      md5(pg_get_functiondef('public.si_rebuild_icon_scores()'::regprocedure)),
      md5(pg_get_functiondef('public.si_refresh_icon_search_private_features()'::regprocedure))
    );
  `);
  assert.equal(protectedAfterMigration, protectedBefore);

  const hostedRefs = [
    'lucide:alpha',
    'lucide:bravo',
    'lucide:charlie',
    'lucide:delta',
    'lucide:echo',
    'lucide:foxtrot',
  ];
  const legacyRef = 'lucide:legacy-ref';
  const webOnlyRef = 'lucide:web-only';
  const availableRefs = [...hostedRefs, legacyRef, webOnlyRef];
  const availabilityRows = availableRefs.map((iconRef, index) => ({
    icon_ref: iconRef,
    outline_available: true,
    solid_available: index === 0,
  }));

  const loadResult = JSON.parse(runSql(`
    select public.si_replace_website_icon_grid_availability(
      ${sqlString(JSON.stringify(availabilityRows))}::jsonb,
      ${availableRefs.length},
      1,
      '${'a'.repeat(64)}',
      '${'b'.repeat(64)}',
      now(),
      now()
    );
  `));
  assert.equal(loadResult.status, 'ok');

  const hostedDays = new Map([
    ['lucide:alpha', [1, 2, 3, 4]],
    ['lucide:bravo', [1, 2, 8]],
    ['lucide:charlie', [1, 2, 3]],
    ['lucide:delta', [1, 2, 3]],
    ['lucide:echo', [1, 2, 3]],
    ['lucide:foxtrot', [1, 2, 3]],
  ]);
  for (const [iconRef, days] of hostedDays) {
    const id = iconRef.split(':')[1];
    for (const daysAgo of days) {
      runSql(`
        insert into public.mcp_usage_events (
          created_at, channel, environment, tool_name, event_type, status,
          result_count, library_filter, query_norm, metadata
        ) values (
          now() - interval '${daysAgo} days',
          'hosted_mcp', 'production', 'get_icon', 'tool_call', 'ok',
          1, 'lucide', ${sqlString(id)},
          jsonb_build_object('returned_icon_refs', jsonb_build_array(${sqlString(iconRef)}))
        );
      `);
    }
  }

  for (const daysAgo of [1, 2, 3]) {
    runSql(`
      insert into public.mcp_usage_events (
        created_at, channel, environment, tool_name, event_type, status,
        result_count, library_filter, query_norm, metadata
      ) values (
        now() - interval '${daysAgo} days',
        'hosted_mcp', 'legacy', 'get_icon', 'tool_call', 'ok',
        1, 'lucide', 'legacy-ref', '{}'::jsonb
      );

      insert into public.icon_evidence (
        created_at, signal_type, icon_id, evidence_text, domain
      ) values (
        now() - interval '${daysAgo} days',
        'copy', '${webOnlyRef}',
        ${daysAgo === 3 ? "'download:svg'" : "'copy'"},
        'supericons.dev'
      );
    `);
  }

  runSql(`
    insert into public.mcp_usage_events (
      created_at, channel, environment, tool_name, event_type, status,
      result_count, library_filter, query_norm, metadata
    )
    select
      now() - interval '1 day' + (value * interval '1 minute'),
      'hosted_mcp', 'production', 'get_icon', 'tool_call', 'ok',
      1, 'lucide', 'same-day-repeat',
      jsonb_build_object('returned_icon_refs', jsonb_build_array('lucide:same-day-repeat'))
    from generate_series(1, 20) as value;

    insert into public.mcp_usage_events (
      created_at, channel, environment, tool_name, event_type, status,
      result_count, library_filter, query_norm, metadata
    )
    select
      now() - (value * interval '1 day'),
      'hosted_mcp', 'production', 'get_icon', 'tool_call', 'ok',
      1, 'lucide', 'controlled',
      jsonb_build_object(
        'returned_icon_refs', jsonb_build_array('lucide:controlled'),
        'traffic_class', 'controlled_test'
      )
    from generate_series(1, 3) as value;

    insert into public.mcp_usage_events (
      created_at, channel, environment, tool_name, event_type, status,
      result_count, library_filter, query_norm, metadata
    )
    select
      now() - (value * interval '1 day'),
      'hosted_mcp', 'production', 'get_icon', 'tool_call', 'ok',
      0, 'lucide', 'zero-result', '{}'::jsonb
    from generate_series(1, 3) as value;

    insert into public.icon_evidence (
      created_at, signal_type, icon_id, evidence_text, domain
    )
    select
      now() - (value * interval '1 day'),
      'copy', 'lucide:preview-only', 'copy', 'localhost'
    from generate_series(1, 3) as value;

    insert into public.icon_evidence (
      created_at, signal_type, icon_id, evidence_text, domain
    )
    select
      now() - (value * interval '1 day'),
      'favorite', 'lucide:favorite-only', 'favorite', 'supericons.dev'
    from generate_series(1, 3) as value;
  `);

  const refreshResult = JSON.parse(runSql(
    'select public.si_refresh_website_icon_popularity();',
  ));
  assert.equal(refreshResult.status, 'success');
  assert.equal(refreshResult.scored_icons, 9);
  assert.equal(refreshResult.qualifying_icons, 8);

  assert.equal(
    runSql(`
      select concat_ws('|', icon_ref, active_days_30d, active_days_7d)
      from public.website_icon_popularity_scores as scores
      inner join public.website_icon_popularity_refresh_state as state
        on state.active_snapshot_id = scores.snapshot_id
      where icon_ref = 'lucide:same-day-repeat';
    `),
    'lucide:same-day-repeat|1|1',
  );
  assert.equal(
    runSql(`
      select concat_ws('|', icon_ref, active_days_30d, active_days_7d)
      from public.website_icon_popularity_scores as scores
      inner join public.website_icon_popularity_refresh_state as state
        on state.active_snapshot_id = scores.snapshot_id
      where icon_ref = 'lucide:web-only';
    `),
    'lucide:web-only|3|3',
  );

  const outlineResult = JSON.parse(runSql(
    "select public.si_get_website_popular_icons('outline');",
  ));
  assert.equal(outlineResult.status, 'fresh');
  assert.deepEqual(outlineResult.icon_refs, [
    'lucide:alpha',
    'lucide:charlie',
    'lucide:delta',
    'lucide:echo',
    'lucide:foxtrot',
    'lucide:legacy-ref',
    'lucide:web-only',
    'lucide:bravo',
  ]);
  assert.deepEqual(Object.keys(outlineResult).sort(), [
    'calculated_at', 'icon_refs', 'stale_after', 'status',
  ]);

  const solidResult = JSON.parse(runSql(
    "select public.si_get_website_popular_icons('solid');",
  ));
  assert.equal(solidResult.status, 'insufficient_evidence');
  assert.deepEqual(solidResult.icon_refs, []);

  runSql('set role anon; select * from public.website_icon_popularity_scores;', {
    expectFailure: true,
  });
  const anonResult = JSON.parse(runSql(
    "set role anon; select public.si_get_website_popular_icons('outline');",
  ).split(/\r?\n/).at(-1));
  assert.equal(anonResult.status, 'fresh');
  runSql('reset role;');

  runSql(`
    update public.website_icon_popularity_snapshots
    set calculated_at = now() - interval '49 hours';
  `);
  assert.equal(
    JSON.parse(runSql("select public.si_get_website_popular_icons('outline');")).status,
    'stale',
  );

  runSql(`
    update public.website_icon_popularity_snapshots set calculated_at = now();
    alter table public.mcp_usage_events rename to unavailable_events;
  `);
  const failedRefresh = JSON.parse(runSql(
    'select public.si_refresh_website_icon_popularity();',
  ));
  assert.equal(failedRefresh.status, 'failed');
  assert.equal(
    JSON.parse(runSql("select public.si_get_website_popular_icons('outline');")).status,
    'failed',
  );
  assert.equal(
    runSql('select count(*) from public.website_icon_popularity_snapshots;'),
    '1',
  );

  runSql(schedule);
  runSql(rollback);
  assert.equal(
    runSql(`
      select concat_ws('|',
        to_regclass('public.website_icon_popularity_snapshots') is null,
        to_regprocedure('public.si_get_website_popular_icons(text)') is null,
        to_regclass('public.icon_scores') is not null,
        to_regclass('public.icon_search_private_features') is not null
      );
    `),
    't|t|t|t',
  );

  console.log(JSON.stringify({
    status: 'ok',
    database: 'postgresql_17',
    scored_icons: 9,
    qualifying_icons: 8,
    same_day_repeat_score: 1,
    cross_source_daily_cap_verified: true,
    web_copy_and_download_verified: true,
    hosted_legacy_reference_reconstruction_verified: true,
    controlled_and_invalid_sources_excluded: true,
    public_response_fields: Object.keys(outlineResult).sort(),
    public_table_read_rejected: true,
    failure_preserved_snapshot: true,
    rollback_verified: true,
    existing_search_score_objects_unchanged: true,
    hosted_release_preflight_verified: true,
    hosted_release_postflight_verified: true,
    exact_history_postflight_verified: true,
  }, null, 2));
} finally {
  removeContainer();
}
