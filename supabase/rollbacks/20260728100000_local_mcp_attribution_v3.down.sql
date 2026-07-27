-- Roll back Local MCP attribution v3 database writes.
--
-- Run only after rolling the npm package and telemetry endpoint back.
-- Existing v3 rows and nullable columns remain for evidence and compatibility.

begin;

do $$
declare
  v_job_id bigint;
begin
  if exists (
    select 1
    from pg_namespace
    where nspname = 'cron'
  ) then
    select jobid
    into v_job_id
    from cron.job
    where jobname = 'si-prune-local-mcp-attribution-v3-daily';

    if v_job_id is not null then
      perform cron.unschedule(v_job_id);
    end if;
  end if;
exception
  when undefined_table or undefined_function then
    null;
end;
$$;

drop trigger if exists zz_enrich_local_mcp_final_attribution_v3
  on public.mcp_usage_events;

drop function if exists public.si_enrich_local_mcp_final_attribution_v3();
drop function if exists public.si_prune_local_mcp_attribution_v3();
drop function if exists public.si_ingest_local_mcp_search_outcome_v3(
  text,
  integer,
  uuid,
  uuid,
  uuid,
  text,
  integer,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  text,
  text,
  text,
  text,
  text,
  text
);

commit;
