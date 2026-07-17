import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

function readArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : '';
}

const projectRef = readArg('project-ref') || 'kcjmkakdhsqplvasgkjv';
const outputPath = readArg('output');
const releaseFingerprint = readArg('release-fingerprint');
const accessToken = String(process.env.SUPABASE_ACCESS_TOKEN || '').trim();

assert.match(projectRef, /^[a-z]{20}$/, 'Project reference is malformed.');
assert.ok(outputPath, 'Provide --output for retained evidence.');
assert.match(releaseFingerprint, /^[0-9a-f]{64}$/, 'Provide --release-fingerprint.');
assert.ok(accessToken, 'SUPABASE_ACCESS_TOKEN must be present in the process environment.');

const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;
const summary = {
  artifact: 'admin_dashboard_v2_database_preflight',
  project_ref: projectRef,
  release_fingerprint: releaseFingerprint,
  transaction_mode: 'read_only',
  mutations: 0,
  started_at: new Date().toISOString(),
  status: 'running',
};

async function queryDatabase(name, sql, timeoutMs = 10_000) {
  const startedAt = performance.now();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const latencyMs = Math.round((performance.now() - startedAt) * 10) / 10;
  const rawPayload = await response.json().catch(() => null);
  assert.ok(
    response.status === 200 || response.status === 201,
    `${name} failed with HTTP ${response.status}.`,
  );
  const payload = Array.isArray(rawPayload) ? rawPayload[0] : rawPayload;
  assert.ok(payload && typeof payload === 'object' && !Array.isArray(payload), `${name} returned invalid JSON.`);
  return { payload, latency_ms: latencyMs };
}

const schemaSql = `
begin read only;
set local statement_timeout = '3000ms';
select
  current_setting('transaction_read_only') as transaction_read_only,
  (
    select count(*)::int
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'mcp_usage_events'
      and column_name in ('query_origin', 'requested_limit', 'client_ip_public')
  ) as phase_a_columns,
  (
    select count(*)::int
    from pg_constraint
    where conrelid = 'public.mcp_usage_events'::regclass
      and conname in (
        'mcp_usage_events_query_origin_valid',
        'mcp_usage_events_requested_limit_valid'
      )
      and convalidated
  ) as validated_constraints,
  (
    select count(*)::int
    from information_schema.tables
    where table_schema = 'public'
      and table_name in ('admin_rollup_overview', 'admin_rollup_queries')
  ) as rollup_tables,
  (
    select count(*)::int
    from pg_indexes
    where schemaname = 'public'
      and indexname in (
        'mcp_usage_events_admin_window_idx',
        'search_request_audit_admin_window_idx',
        'admin_rollup_overview_filters_idx',
        'admin_rollup_queries_filters_idx',
        'admin_rollup_queries_attention_idx'
      )
  ) as phase_a_indexes,
  (
    select count(*)::int
    from pg_class
    where oid in (
      'public.admin_rollup_overview'::regclass,
      'public.admin_rollup_queries'::regclass
    )
      and relrowsecurity
  ) as rls_enabled_tables,
  (
    not has_table_privilege('anon', 'public.admin_rollup_overview', 'select')
    and not has_table_privilege('anon', 'public.admin_rollup_queries', 'select')
    and not has_table_privilege('authenticated', 'public.admin_rollup_overview', 'select')
    and not has_table_privilege('authenticated', 'public.admin_rollup_queries', 'select')
  ) as public_roles_blocked,
  (
    has_table_privilege('service_role', 'public.admin_rollup_overview', 'select,insert,update,delete')
    and has_table_privilege('service_role', 'public.admin_rollup_queries', 'select,insert,update,delete')
  ) as service_role_ready,
  (select count(*)::int from public.admin_rollup_overview) as overview_rows,
  (select count(*)::int from public.admin_rollup_queries) as query_rows,
  (
    select count(*)::int
    from supabase_migrations.schema_migrations
    where version = '20260716040000'
  ) as migration_history_rows;
rollback;
`;

const backlogSql = `
begin read only;
set local statement_timeout = '3000ms';
with telemetry_days as (
  select distinct (created_at at time zone 'UTC')::date as day
  from public.search_request_audit
  where source <> 'trap'
    and query_norm is not null
    and created_at < date_trunc('day', now() at time zone 'UTC') at time zone 'UTC'
  union
  select distinct (created_at at time zone 'UTC')::date as day
  from public.mcp_usage_events
  where event_type = 'search_outcome'
    and query_norm is not null
    and created_at < date_trunc('day', now() at time zone 'UTC') at time zone 'UTC'
),
overview_days as (
  select distinct day from public.admin_rollup_overview
),
query_days as (
  select distinct day from public.admin_rollup_queries
),
complete_days as (
  select day from overview_days
  intersect
  select day from query_days
),
pending_days as (
  select day from telemetry_days
  except
  select day from complete_days
),
latest_complete as (
  select max(day) as day from complete_days
)
select
  (select count(*)::int from telemetry_days) as telemetry_day_count,
  (select count(*)::int from overview_days) as overview_day_count,
  (select count(*)::int from query_days) as query_day_count,
  (select count(*)::int from complete_days) as complete_rollup_day_count,
  (select count(*)::int from pending_days) as pending_day_count,
  (select min(day)::text from pending_days) as earliest_pending_day,
  (select max(day)::text from pending_days) as latest_pending_day,
  (select day::text from latest_complete) as latest_complete_day,
  (
    select count(*)::int
    from pending_days
    where day <= (select day from latest_complete)
  ) as pending_on_or_before_latest_complete_day,
  (
    select count(*)::int
    from (select day from overview_days except select day from query_days) rows
  ) as overview_only_day_count,
  (
    select count(*)::int
    from (select day from query_days except select day from overview_days) rows
  ) as query_only_day_count;
rollback;
`;

const healthChecks = [
  {
    name: 'recent_mcp_usage',
    limit_ms: 1000,
    sql: `
begin read only;
set local statement_timeout = '1000ms';
select count(*)::int as matched_rows
from (
  select created_at
  from public.mcp_usage_events
  where environment = 'production'
    and channel = 'hosted_mcp'
    and query_origin = 'agent_query'
    and tool_name = 'search_icons'
  order by created_at desc
  limit 1
) recent_mcp_usage;
rollback;
`,
  },
  {
    name: 'recent_search_audit',
    limit_ms: 1000,
    sql: `
begin read only;
set local statement_timeout = '1000ms';
select count(*)::int as matched_rows
from (
  select created_at
  from public.search_request_audit
  where environment = 'production'
    and channel = 'hosted_mcp'
    and tool_name = 'search_icons'
  order by created_at desc
  limit 1
) recent_search_audit;
rollback;
`,
  },
  {
    name: 'latest_rollup_overview',
    limit_ms: 1000,
    sql: `
begin read only;
set local statement_timeout = '1000ms';
select count(*)::int as matched_rows
from (
  select day
  from public.admin_rollup_overview
  where environment = 'production'
    and channel = 'hosted_mcp'
    and query_origin = 'agent_query'
  order by day desc
  limit 1
) latest_rollup_overview;
rollback;
`,
  },
  {
    name: 'recent_telemetry_window',
    limit_ms: 2000,
    sql: `
begin read only;
set local statement_timeout = '2000ms';
select (
  (
    select count(*)
    from public.mcp_usage_events
    where environment = 'production'
      and channel = 'hosted_mcp'
      and query_origin = 'agent_query'
      and tool_name = 'search_icons'
      and created_at >= now() - interval '15 minutes'
  )
  +
  (
    select count(*)
    from public.search_request_audit
    where environment = 'production'
      and channel = 'hosted_mcp'
      and tool_name = 'search_icons'
      and created_at >= now() - interval '15 minutes'
  )
)::int as matched_rows;
rollback;
`,
  },
];

try {
  const schema = await queryDatabase('schema postflight', schemaSql);
  assert.equal(schema.payload.transaction_read_only, 'on');
  assert.equal(Number(schema.payload.phase_a_columns), 3);
  assert.equal(Number(schema.payload.validated_constraints), 2);
  assert.equal(Number(schema.payload.rollup_tables), 2);
  assert.equal(Number(schema.payload.phase_a_indexes), 5);
  assert.equal(Number(schema.payload.rls_enabled_tables), 2);
  assert.equal(schema.payload.public_roles_blocked, true);
  assert.equal(schema.payload.service_role_ready, true);
  assert.equal(Number(schema.payload.migration_history_rows), 1);

  const backlog = await queryDatabase('rollup backlog', backlogSql);
  const pendingDays = Number(backlog.payload.pending_day_count);
  assert.ok(Number.isInteger(pendingDays) && pendingDays >= 0 && pendingDays <= 120);
  assert.equal(Number(backlog.payload.pending_on_or_before_latest_complete_day), 0);
  assert.equal(Number(backlog.payload.overview_only_day_count), 0);
  assert.equal(Number(backlog.payload.query_only_day_count), 0);

  const health = [];
  for (const check of healthChecks) {
    const result = await queryDatabase(check.name, check.sql, check.limit_ms + 5000);
    health.push({
      name: check.name,
      statement_timeout_ms: check.limit_ms,
      request_latency_ms: result.latency_ms,
      matched_rows: Number(result.payload.matched_rows),
    });
  }

  summary.schema = {
    status: 'ok',
    request_latency_ms: schema.latency_ms,
    phase_a_columns: Number(schema.payload.phase_a_columns),
    validated_constraints: Number(schema.payload.validated_constraints),
    private_rollup_tables: Number(schema.payload.rollup_tables),
    phase_a_indexes: Number(schema.payload.phase_a_indexes),
    rls_enabled_tables: Number(schema.payload.rls_enabled_tables),
    public_roles_blocked: true,
    service_role_ready: true,
    migration_history_rows: Number(schema.payload.migration_history_rows),
    overview_rows: Number(schema.payload.overview_rows),
    query_rows: Number(schema.payload.query_rows),
  };
  summary.backlog = {
    ...backlog.payload,
    request_latency_ms: backlog.latency_ms,
    refresh_day_limit: pendingDays,
    refresh_call_limit: pendingDays + 1,
  };
  summary.health = health;
  summary.status = 'ok';
} catch (error) {
  summary.status = 'failed';
  summary.error = error instanceof Error ? error.message : String(error);
  throw error;
} finally {
  summary.finished_at = new Date().toISOString();
  const absoluteOutput = resolve(outputPath);
  await mkdir(dirname(absoluteOutput), { recursive: true });
  await writeFile(absoluteOutput, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ status: summary.status, output: outputPath }));
}
