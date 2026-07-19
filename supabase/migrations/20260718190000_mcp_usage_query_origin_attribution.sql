-- Attribute local MCP tool-level events without changing the public RPC signature.
--
-- Rollback:
-- 1. Drop the trigger public.normalize_mcp_usage_query_origin.
-- 2. Drop the function public.si_normalize_mcp_usage_query_origin().
-- 3. Keep the historical query_origin corrections because they replace missing
--    attribution with values derived from the recorded tool name.

begin;

create or replace function public.si_normalize_mcp_usage_query_origin()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.query_origin is null or trim(new.query_origin) = '' then
    new.query_origin := case lower(trim(coalesce(new.tool_name, '')))
      when 'search_icons' then 'agent_query'
      when 'recommend_icons' then 'agent_query'
      when 'get_icon' then 'icon_lookup'
      else 'legacy_unknown'
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists normalize_mcp_usage_query_origin
  on public.mcp_usage_events;

create trigger normalize_mcp_usage_query_origin
before insert or update of tool_name, query_origin
on public.mcp_usage_events
for each row
execute function public.si_normalize_mcp_usage_query_origin();

update public.mcp_usage_events
set query_origin = case lower(trim(coalesce(tool_name, '')))
  when 'search_icons' then 'agent_query'
  when 'recommend_icons' then 'agent_query'
  when 'get_icon' then 'icon_lookup'
  else 'legacy_unknown'
end
where query_origin is null or trim(query_origin) = '';

comment on function public.si_normalize_mcp_usage_query_origin()
is 'Fills missing MCP query origin from the recorded tool name.';

commit;
