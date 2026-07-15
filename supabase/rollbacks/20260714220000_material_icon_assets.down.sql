-- Run only after reverting code that reads or writes Material asset rows.

drop index if exists public.mcp_usage_events_error_code_created_at_idx;
drop index if exists public.search_request_audit_error_code_created_at_idx;

alter table if exists public.mcp_usage_events
  drop constraint if exists mcp_usage_events_error_code_valid,
  drop column if exists error_code;

alter table if exists public.search_request_audit
  drop constraint if exists search_request_audit_error_code_valid,
  drop column if exists error_code;

drop table if exists public.material_icon_assets;
