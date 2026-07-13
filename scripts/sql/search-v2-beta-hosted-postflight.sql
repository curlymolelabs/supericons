\set ON_ERROR_STOP on
\echo 'Running hosted beta migration postflight'

do $gate_b$
declare
  v_column_count integer;
  v_constraint_count integer;
  v_index_count integer;
  v_function_count integer;
begin
  select count(*)
  into v_column_count
  from information_schema.columns
  where table_schema = 'public'
    and table_name in ('search_request_audit', 'mcp_usage_events')
    and column_name in ('library_mode', 'search_outcome', 'confidence_label', 'beta_cohort');

  select count(*)
  into v_constraint_count
  from pg_constraint
  where conrelid in (
      'public.search_request_audit'::regclass,
      'public.mcp_usage_events'::regclass
    )
    and conname in (
      'search_request_audit_library_mode_valid',
      'search_request_audit_outcome_valid',
      'search_request_audit_confidence_label_valid',
      'mcp_usage_events_library_mode_valid',
      'mcp_usage_events_outcome_valid',
      'mcp_usage_events_confidence_label_valid'
    )
    and convalidated = true;

  select count(*)
  into v_index_count
  from pg_indexes
  where schemaname = 'public'
    and indexname in (
      'search_request_audit_beta_cohort_created_at_idx',
      'mcp_usage_events_beta_cohort_created_at_idx'
    );

  select count(*)
  into v_function_count
  from pg_proc
  where pronamespace = 'public'::regnamespace
    and proname = 'si_log_mcp_search_outcome';

  if v_column_count <> 8
    or v_constraint_count <> 6
    or v_index_count <> 2
    or v_function_count <> 1 then
    raise exception 'Unexpected beta schema counts: columns %, constraints %, indexes %, functions %',
      v_column_count,
      v_constraint_count,
      v_index_count,
      v_function_count;
  end if;
end
$gate_b$;

begin;

select public.si_log_mcp_search_outcome(
  'gate-c-database-clarification',
  0,
  'all',
  'all',
  'clarification',
  'recommend_icons',
  repeat('a', 64),
  'en',
  'low',
  'deterministic-v2-beta',
  '0.4.18-beta.0'
);

do $gate_b$
begin
  if not exists (
    select 1
    from public.mcp_usage_events
    where query_norm = 'gate-c-database-clarification'
      and event_type = 'search_outcome'
      and channel = 'hosted_mcp'
      and environment = 'preview'
      and tool_name = 'recommend_icons'
      and library_mode = 'all'
      and search_outcome = 'clarification'
      and confidence_label = 'low'
      and beta_cohort = 'deterministic-v2-beta'
      and locale = 'en'
      and result_count = 0
  ) then
    raise exception 'Valid beta audit row did not match the expected public fields';
  end if;
end
$gate_b$;

do $gate_b$
begin
  begin
    perform public.si_log_mcp_search_outcome(
      'gate-c-invalid-mode', 0, 'all', 'invalid', 'zero', 'search_icons',
      repeat('b', 64), 'en', 'low', 'deterministic-v2-beta', '0.4.18-beta.0'
    );
    raise exception 'Invalid library mode was accepted';
  exception when sqlstate '22023' then
    null;
  end;

  begin
    perform public.si_log_mcp_search_outcome(
      'gate-c-invalid-outcome', 0, 'all', 'strict', 'invalid', 'search_icons',
      repeat('b', 64), 'en', 'low', 'deterministic-v2-beta', '0.4.18-beta.0'
    );
    raise exception 'Invalid search outcome was accepted';
  exception when sqlstate '22023' then
    null;
  end;

  begin
    perform public.si_log_mcp_search_outcome(
      'gate-c-invalid-confidence', 0, 'all', 'strict', 'zero', 'search_icons',
      repeat('b', 64), 'en', 'invalid', 'deterministic-v2-beta', '0.4.18-beta.0'
    );
    raise exception 'Invalid confidence label was accepted';
  exception when sqlstate '22023' then
    null;
  end;

  begin
    perform public.si_log_mcp_search_outcome(
      'gate-c-invalid-session', 0, 'all', 'strict', 'zero', 'search_icons',
      'not-a-sha256', 'en', 'low', 'deterministic-v2-beta', '0.4.18-beta.0'
    );
    raise exception 'Invalid session hash was accepted';
  exception when sqlstate '22023' then
    null;
  end;
end
$gate_b$;

rollback;

select 'hosted_beta_postflight_ok' as result;
