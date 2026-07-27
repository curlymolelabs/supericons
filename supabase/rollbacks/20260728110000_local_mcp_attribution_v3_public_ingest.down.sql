begin;

revoke all on function public.si_log_local_mcp_search_outcome_v3(jsonb)
  from public, anon, authenticated;
drop function if exists public.si_log_local_mcp_search_outcome_v3(jsonb);

commit;
