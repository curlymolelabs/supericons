\set ON_ERROR_STOP on
\pset pager off
\pset format unaligned
\pset tuples_only on

begin transaction read only;

\echo section=configured_settings
select jsonb_build_object(
  'section', 'configured_settings',
  'captured_at', timezone('utc', now()),
  'server_version', current_setting('server_version'),
  'session_entry_statement_timeout', current_setting('statement_timeout'),
  'session_entry_lock_timeout', current_setting('lock_timeout'),
  'max_connections', current_setting('max_connections')::integer,
  'superuser_reserved_connections', current_setting('superuser_reserved_connections')::integer,
  'reserved_connections', coalesce(nullif(current_setting('reserved_connections', true), '')::integer, 0),
  'sql_visible_non_superuser_ceiling', greatest(
    current_setting('max_connections')::integer
      - current_setting('superuser_reserved_connections')::integer
      - coalesce(nullif(current_setting('reserved_connections', true), '')::integer, 0),
    0
  )
)::text;

\echo section=server_setting_sources
select jsonb_build_object(
  'section', 'server_setting',
  'name', name,
  'session_value', setting,
  'unit', unit,
  'configured_reset_value', reset_val,
  'source', source,
  'pending_restart', pending_restart
)::text
from pg_catalog.pg_settings
where name in (
  'statement_timeout',
  'lock_timeout',
  'idle_in_transaction_session_timeout',
  'max_connections',
  'superuser_reserved_connections',
  'reserved_connections'
)
order by name;

set local statement_timeout = '5000ms';
set local lock_timeout = '1000ms';
set local idle_in_transaction_session_timeout = '30000ms';

\echo section=diagnostic_session_guards
select jsonb_build_object(
  'section', 'diagnostic_session_guards',
  'transaction_read_only', current_setting('transaction_read_only'),
  'statement_timeout', current_setting('statement_timeout'),
  'lock_timeout', current_setting('lock_timeout'),
  'idle_in_transaction_session_timeout', current_setting('idle_in_transaction_session_timeout')
)::text;

\echo section=connection_activity
select jsonb_build_object(
  'section', 'connection_activity',
  'database_scope', case when datname = current_database() then current_database() else 'other_or_none' end,
  'backend_type', backend_type,
  'state', coalesce(state, 'none'),
  'connections', count(*)
)::text
from pg_catalog.pg_stat_activity
group by
  case when datname = current_database() then current_database() else 'other_or_none' end,
  backend_type,
  coalesce(state, 'none')
order by 1;

\echo section=table_maintenance_search_and_usage
select jsonb_build_object(
  'section', 'table_maintenance',
  'table', s.relname,
  'estimated_live_rows', s.n_live_tup,
  'estimated_dead_rows', s.n_dead_tup,
  'estimated_dead_row_ratio', case
    when s.n_live_tup + s.n_dead_tup > 0
      then round((s.n_dead_tup::numeric / (s.n_live_tup + s.n_dead_tup)::numeric), 6)
    else 0
  end,
  'modifications_since_analyze', s.n_mod_since_analyze,
  'last_vacuum', s.last_vacuum,
  'last_autovacuum', s.last_autovacuum,
  'last_analyze', s.last_analyze,
  'last_autoanalyze', s.last_autoanalyze,
  'vacuum_count', s.vacuum_count,
  'autovacuum_count', s.autovacuum_count,
  'analyze_count', s.analyze_count,
  'autoanalyze_count', s.autoanalyze_count,
  'sequential_scans', s.seq_scan,
  'index_scans', s.idx_scan,
  'table_bytes', pg_catalog.pg_relation_size(c.oid),
  'total_bytes', pg_catalog.pg_total_relation_size(c.oid)
)::text
from pg_catalog.pg_stat_user_tables s
join pg_catalog.pg_class c
  on c.relname = s.relname
join pg_catalog.pg_namespace n
  on n.oid = c.relnamespace
 and n.nspname = s.schemaname
where s.schemaname = 'public'
  and s.relname in ('search_request_audit', 'mcp_usage_events')
order by s.relname;

\echo section=table_maintenance_icon_catalog
select jsonb_build_object(
  'section', 'icon_catalog_maintenance',
  'estimated_live_rows', s.n_live_tup,
  'estimated_dead_rows', s.n_dead_tup,
  'estimated_dead_row_ratio', case
    when s.n_live_tup + s.n_dead_tup > 0
      then round((s.n_dead_tup::numeric / (s.n_live_tup + s.n_dead_tup)::numeric), 6)
    else 0
  end,
  'modifications_since_analyze', s.n_mod_since_analyze,
  'last_vacuum', s.last_vacuum,
  'last_autovacuum', s.last_autovacuum,
  'last_analyze', s.last_analyze,
  'last_autoanalyze', s.last_autoanalyze,
  'sequential_scans', s.seq_scan,
  'index_scans', s.idx_scan,
  'table_bytes', pg_catalog.pg_relation_size(c.oid),
  'total_bytes', pg_catalog.pg_total_relation_size(c.oid)
)::text
from pg_catalog.pg_stat_user_tables s
join pg_catalog.pg_class c
  on c.relname = s.relname
join pg_catalog.pg_namespace n
  on n.oid = c.relnamespace
 and n.nspname = s.schemaname
where s.schemaname = 'public'
  and s.relname = 'icon_catalog';

\echo section=icon_catalog_planner_statistics
select jsonb_build_object(
  'section', 'icon_catalog_planner_statistics',
  'column', attname,
  'inherited', inherited,
  'null_fraction', null_frac,
  'estimated_distinct_values', n_distinct,
  'correlation', correlation
)::text
from pg_catalog.pg_stats
where schemaname = 'public'
  and tablename = 'icon_catalog'
  and attname in ('icon_id', 'name', 'source_library', 'style', 'search_document')
order by attname;

\echo section=relevant_indexes
select jsonb_build_object(
  'section', 'relevant_index',
  'table', table_class.relname,
  'index', index_class.relname,
  'is_valid', index_state.indisvalid,
  'is_ready', index_state.indisready,
  'is_live', index_state.indislive,
  'is_unique', index_state.indisunique,
  'predicate', pg_catalog.pg_get_expr(index_state.indpred, index_state.indrelid),
  'definition', pg_catalog.pg_get_indexdef(index_state.indexrelid)
)::text
from pg_catalog.pg_index index_state
join pg_catalog.pg_class table_class
  on table_class.oid = index_state.indrelid
join pg_catalog.pg_class index_class
  on index_class.oid = index_state.indexrelid
join pg_catalog.pg_namespace table_namespace
  on table_namespace.oid = table_class.relnamespace
where table_namespace.nspname = 'public'
  and table_class.relname in ('search_request_audit', 'mcp_usage_events', 'icon_catalog')
order by table_class.relname, index_class.relname;

\echo section=rate_limit_index
select jsonb_build_object(
  'section', 'rate_limit_index',
  'present', count(*) > 0,
  'valid', coalesce(bool_and(index_state.indisvalid), false),
  'ready', coalesce(bool_and(index_state.indisready), false),
  'definitions', coalesce(jsonb_agg(pg_catalog.pg_get_indexdef(index_state.indexrelid)), '[]'::jsonb)
)::text
from pg_catalog.pg_index index_state
join pg_catalog.pg_class table_class
  on table_class.oid = index_state.indrelid
join pg_catalog.pg_class index_class
  on index_class.oid = index_state.indexrelid
join pg_catalog.pg_namespace table_namespace
  on table_namespace.oid = table_class.relnamespace
where table_namespace.nspname = 'public'
  and table_class.relname = 'search_request_audit'
  and index_class.relname = 'search_request_audit_ip_created_at_idx';

\echo section=rate_limit_planner_only_plan
explain (format json, costs true, verbose false)
select count(*)
from public.search_request_audit
where ip_hash = repeat('0', 64)
  and created_at >= timezone('utc', now()) - interval '1 minute';

\echo section=candidate_rpc_definitions
select jsonb_build_object(
  'section', 'candidate_rpc_definitions',
  'functions', coalesce(jsonb_agg(jsonb_build_object(
    'signature', functions.signature,
    'language', functions.language,
    'security_definer', functions.security_definer,
    'definition', functions.definition
  ) order by functions.signature), '[]'::jsonb)
)::text
from (
  select
    p.oid::regprocedure::text as signature,
    language.lanname as language,
    p.prosecdef as security_definer,
    pg_catalog.pg_get_functiondef(p.oid) as definition
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n
    on n.oid = p.pronamespace
  join pg_catalog.pg_language language
    on language.oid = p.prolang
  where n.nspname = 'public'
    and p.proname like 'si_search_icon_candidates%'
) functions;

select
  case when pg_catalog.to_regclass('extensions.pg_stat_statements') is not null then 'true' else 'false' end as has_extensions_pgss,
  case when pg_catalog.to_regclass('public.pg_stat_statements') is not null then 'true' else 'false' end as has_public_pgss,
  case when pg_catalog.to_regclass('extensions.pg_stat_statements_info') is not null then 'true' else 'false' end as has_extensions_pgss_info,
  case when pg_catalog.to_regclass('public.pg_stat_statements_info') is not null then 'true' else 'false' end as has_public_pgss_info
\gset

\echo section=pg_stat_statements_availability
select jsonb_build_object(
  'section', 'pg_stat_statements_availability',
  'extensions_view', :'has_extensions_pgss'::boolean,
  'public_view', :'has_public_pgss'::boolean,
  'extensions_info_view', :'has_extensions_pgss_info'::boolean,
  'public_info_view', :'has_public_pgss_info'::boolean
)::text;

\echo section=pg_stat_statements_reset
\if :has_extensions_pgss_info
select jsonb_build_object(
  'section', 'pg_stat_statements_reset',
  'available', true,
  'stats_reset', stats_reset
)::text
from extensions.pg_stat_statements_info;
\elif :has_public_pgss_info
select jsonb_build_object(
  'section', 'pg_stat_statements_reset',
  'available', true,
  'stats_reset', stats_reset
)::text
from public.pg_stat_statements_info;
\else
select jsonb_build_object(
  'section', 'pg_stat_statements_reset',
  'available', false,
  'stats_reset', null
)::text;
\endif

\echo section=pg_stat_statements_candidate_rpc
\if :has_extensions_pgss
select jsonb_build_object(
  'section', 'pg_stat_statements_candidate_rpc',
  'source_schema', 'extensions',
  'entries', coalesce(jsonb_agg(to_jsonb(history) order by history.total_exec_time_ms desc), '[]'::jsonb)
)::text
from (
  select
    queryid::text as query_id,
    calls,
    round(total_exec_time::numeric, 3) as total_exec_time_ms,
    round(mean_exec_time::numeric, 3) as mean_exec_time_ms,
    round(max_exec_time::numeric, 3) as max_exec_time_ms,
    rows,
    left(query, 1000) as normalized_query
  from extensions.pg_stat_statements
  where lower(query) like '%si_search_icon_candidates%'
  order by total_exec_time desc
  limit 25
) history;
\elif :has_public_pgss
select jsonb_build_object(
  'section', 'pg_stat_statements_candidate_rpc',
  'source_schema', 'public',
  'entries', coalesce(jsonb_agg(to_jsonb(history) order by history.total_exec_time_ms desc), '[]'::jsonb)
)::text
from (
  select
    queryid::text as query_id,
    calls,
    round(total_exec_time::numeric, 3) as total_exec_time_ms,
    round(mean_exec_time::numeric, 3) as mean_exec_time_ms,
    round(max_exec_time::numeric, 3) as max_exec_time_ms,
    rows,
    left(query, 1000) as normalized_query
  from public.pg_stat_statements
  where lower(query) like '%si_search_icon_candidates%'
  order by total_exec_time desc
  limit 25
) history;
\else
select jsonb_build_object(
  'section', 'pg_stat_statements_candidate_rpc',
  'source_schema', null,
  'entries', '[]'::jsonb
)::text;
\endif

\echo section=pg_stat_statements_rate_limit
\if :has_extensions_pgss
select jsonb_build_object(
  'section', 'pg_stat_statements_rate_limit',
  'source_schema', 'extensions',
  'entries', coalesce(jsonb_agg(to_jsonb(history) order by history.total_exec_time_ms desc), '[]'::jsonb)
)::text
from (
  select
    queryid::text as query_id,
    calls,
    round(total_exec_time::numeric, 3) as total_exec_time_ms,
    round(mean_exec_time::numeric, 3) as mean_exec_time_ms,
    round(max_exec_time::numeric, 3) as max_exec_time_ms,
    rows,
    left(query, 1000) as normalized_query
  from extensions.pg_stat_statements
  where lower(query) like '%search_request_audit%'
    and lower(query) like '%ip_hash%'
    and lower(query) like '%created_at%'
  order by total_exec_time desc
  limit 25
) history;
\elif :has_public_pgss
select jsonb_build_object(
  'section', 'pg_stat_statements_rate_limit',
  'source_schema', 'public',
  'entries', coalesce(jsonb_agg(to_jsonb(history) order by history.total_exec_time_ms desc), '[]'::jsonb)
)::text
from (
  select
    queryid::text as query_id,
    calls,
    round(total_exec_time::numeric, 3) as total_exec_time_ms,
    round(mean_exec_time::numeric, 3) as mean_exec_time_ms,
    round(max_exec_time::numeric, 3) as max_exec_time_ms,
    rows,
    left(query, 1000) as normalized_query
  from public.pg_stat_statements
  where lower(query) like '%search_request_audit%'
    and lower(query) like '%ip_hash%'
    and lower(query) like '%created_at%'
  order by total_exec_time desc
  limit 25
) history;
\else
select jsonb_build_object(
  'section', 'pg_stat_statements_rate_limit',
  'source_schema', null,
  'entries', '[]'::jsonb
)::text;
\endif

rollback;
\echo diagnostic_complete=true
