-- Dedicated website icon requests.
--
-- Rollback:
-- 1. Revert website and admin callers to stop creating and reading icon_request rows.
-- 2. Revoke and drop public.si_log_icon_request.
-- 3. Keep icon_request in the table constraints so recorded requests remain truthful.
--    If no icon_request rows exist, the two constraints may instead be restored
--    to their prior definitions after the function is dropped.
--
-- This migration does not alter public.si_log_icon_evidence or any existing row.

alter table public.icon_evidence
  drop constraint if exists icon_evidence_signal_type_valid;

alter table public.icon_evidence
  add constraint icon_evidence_signal_type_valid check (
    signal_type in (
      'copy',
      'replace',
      'kit_download',
      'mcp_call',
      'editorial',
      'favorite',
      'collection',
      'social_gallery',
      'search_attempt',
      'icon_request'
    )
  );

alter table public.icon_evidence
  drop constraint if exists icon_evidence_icon_or_collection_required;

alter table public.icon_evidence
  add constraint icon_evidence_icon_or_collection_required check (
    icon_id is not null
    or signal_type in (
      'kit_download',
      'collection',
      'social_gallery',
      'search_attempt',
      'icon_request'
    )
  );

create or replace function public.si_log_icon_request(
  p_request_text text,
  p_ui_surface text,
  p_session_hash text,
  p_search_query text default null,
  p_result_count integer default null,
  p_library_filter text default null,
  p_job_category text default null,
  p_domain text default null,
  p_context_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_text text := nullif(
    regexp_replace(trim(coalesce(p_request_text, '')), '\s+', ' ', 'g'),
    ''
  );
  v_ui_surface text := nullif(trim(coalesce(p_ui_surface, '')), '');
  v_session_hash text := trim(coalesce(p_session_hash, ''));
  v_search_query text := nullif(
    regexp_replace(trim(coalesce(p_search_query, '')), '\s+', ' ', 'g'),
    ''
  );
  v_library_filter text := nullif(trim(coalesce(p_library_filter, '')), '');
  v_job_category text := nullif(trim(coalesce(p_job_category, '')), '');
  v_domain text := nullif(trim(coalesce(p_domain, '')), '');
  v_context_url text := nullif(trim(coalesce(p_context_url, '')), '');
  v_inserted_id uuid;
begin
  if v_request_text is null or char_length(v_request_text) < 2 then
    raise exception 'request_text must contain at least 2 characters' using errcode = '22023';
  end if;

  if char_length(v_request_text) > 400 then
    raise exception 'request_text must not exceed 400 characters' using errcode = '22023';
  end if;

  if v_ui_surface not in (
    'grid_empty_feedback',
    'grid_low_result_feedback',
    'sidebar_request'
  ) then
    raise exception 'Unsupported icon request ui_surface: %', coalesce(v_ui_surface, '')
      using errcode = '22023';
  end if;

  if v_session_hash = '' then
    raise exception 'session_hash is required' using errcode = '22023';
  end if;

  if (v_search_query is null) <> (p_result_count is null) then
    raise exception 'search_query and result_count must both be present or both be null'
      using errcode = '22023';
  end if;

  if p_result_count is not null and p_result_count < 0 then
    raise exception 'result_count must be nonnegative' using errcode = '22023';
  end if;

  if v_ui_surface = 'grid_empty_feedback'
    and (v_search_query is null or p_result_count <> 0) then
    raise exception 'grid_empty_feedback requires a search with zero results'
      using errcode = '22023';
  end if;

  if v_ui_surface = 'grid_low_result_feedback'
    and (v_search_query is null or p_result_count not between 1 and 2) then
    raise exception 'grid_low_result_feedback requires a search with 1 or 2 results'
      using errcode = '22023';
  end if;

  insert into public.icon_evidence (
    signal_type,
    search_query,
    result_count,
    library_filter,
    ui_surface,
    domain,
    job_category,
    evidence_text,
    context_url,
    session_hash,
    created_at
  )
  values (
    'icon_request',
    v_search_query,
    p_result_count,
    v_library_filter,
    v_ui_surface,
    v_domain,
    v_job_category,
    v_request_text,
    v_context_url,
    v_session_hash,
    timezone('utc', now())
  )
  returning id into v_inserted_id;

  return v_inserted_id;
end;
$$;

comment on function public.si_log_icon_request(
  text,
  text,
  text,
  text,
  integer,
  text,
  text,
  text,
  text
) is 'Records an explicit website icon request without fabricating a search attempt.';

revoke all on function public.si_log_icon_request(
  text,
  text,
  text,
  text,
  integer,
  text,
  text,
  text,
  text
) from public;

grant execute on function public.si_log_icon_request(
  text,
  text,
  text,
  text,
  integer,
  text,
  text,
  text,
  text
) to anon, authenticated, service_role;
