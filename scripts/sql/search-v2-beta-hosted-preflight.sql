\set ON_ERROR_STOP on
\echo 'Running hosted beta migration preflight'

do $gate_b$
declare
  v_target_column_count integer;
  v_target_index_count integer;
  v_target_function_count integer;
begin
  if to_regclass('public.search_request_audit') is null then
    raise exception 'Required table public.search_request_audit is missing';
  end if;

  if to_regclass('public.mcp_usage_events') is null then
    raise exception 'Required table public.mcp_usage_events is missing';
  end if;

  select count(*)
  into v_target_column_count
  from information_schema.columns
  where table_schema = 'public'
    and table_name in ('search_request_audit', 'mcp_usage_events')
    and column_name in ('library_mode', 'search_outcome', 'confidence_label', 'beta_cohort');

  select count(*)
  into v_target_index_count
  from pg_indexes
  where schemaname = 'public'
    and indexname in (
      'search_request_audit_beta_cohort_created_at_idx',
      'mcp_usage_events_beta_cohort_created_at_idx'
    );

  select count(*)
  into v_target_function_count
  from pg_proc
  where pronamespace = 'public'::regnamespace
    and proname = 'si_log_mcp_search_outcome';

  if v_target_column_count <> 0
    or v_target_index_count <> 0
    or v_target_function_count <> 0 then
    raise exception 'Beta migration objects already exist or are partially applied. Stop and inspect before continuing.';
  end if;
end
$gate_b$;

select 'hosted_beta_preflight_ok' as result;
