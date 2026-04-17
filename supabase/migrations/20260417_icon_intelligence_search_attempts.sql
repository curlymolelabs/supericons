-- Supericons P0.02 Phase 4B: explicit search-attempt telemetry
-- Adds a first-class search_attempt evidence type so admin can report:
--   - zero-result queries
--   - low-result queries
--   - query volume independent of copy/favorite outcomes

alter table public.icon_evidence
  add column if not exists result_count integer,
  add column if not exists library_filter text;

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
      'search_attempt'
    )
  );

alter table public.icon_evidence
  drop constraint if exists icon_evidence_icon_or_collection_required;

alter table public.icon_evidence
  add constraint icon_evidence_icon_or_collection_required check (
    icon_id is not null
    or signal_type in ('kit_download', 'collection', 'social_gallery', 'search_attempt')
  );

alter table public.icon_evidence
  drop constraint if exists icon_evidence_result_count_nonnegative;

alter table public.icon_evidence
  add constraint icon_evidence_result_count_nonnegative check (
    result_count is null or result_count >= 0
  );

create index if not exists icon_evidence_search_attempt_query_created_at_idx
  on public.icon_evidence (search_query, created_at desc)
  where signal_type = 'search_attempt'
    and search_query is not null;

drop function if exists public.si_log_icon_evidence(
  text,
  text,
  uuid,
  text,
  text,
  integer,
  integer,
  text,
  text,
  text,
  text,
  integer,
  boolean,
  double precision,
  text,
  text,
  text,
  timestamptz
);

create or replace function public.si_log_icon_evidence(
  p_signal_type text,
  p_icon_id text default null,
  p_batch_id uuid default null,
  p_collection_id text default null,
  p_search_query text default null,
  p_result_position integer default null,
  p_time_to_copy_ms integer default null,
  p_ui_surface text default null,
  p_domain text default null,
  p_job_category text default null,
  p_replaced_with text default null,
  p_retained_days integer default null,
  p_agent_converged boolean default null,
  p_confidence double precision default null,
  p_evidence_text text default null,
  p_context_url text default null,
  p_session_hash text default null,
  p_created_at timestamptz default timezone('utc', now()),
  p_result_count integer default null,
  p_library_filter text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_signal_type text := trim(coalesce(p_signal_type, ''));
  v_icon_id text := nullif(trim(coalesce(p_icon_id, '')), '');
  v_collection_id text := nullif(trim(coalesce(p_collection_id, '')), '');
  v_search_query text := nullif(trim(coalesce(p_search_query, '')), '');
  v_ui_surface text := nullif(trim(coalesce(p_ui_surface, '')), '');
  v_domain text := nullif(trim(coalesce(p_domain, '')), '');
  v_job_category text := nullif(trim(coalesce(p_job_category, '')), '');
  v_replaced_with text := nullif(trim(coalesce(p_replaced_with, '')), '');
  v_evidence_text text := nullif(trim(coalesce(p_evidence_text, '')), '');
  v_context_url text := nullif(trim(coalesce(p_context_url, '')), '');
  v_session_hash text := trim(coalesce(p_session_hash, ''));
  v_library_filter text := nullif(trim(coalesce(p_library_filter, '')), '');
  v_inserted_id uuid;
begin
  if v_signal_type = '' then
    raise exception 'signal_type is required' using errcode = '22023';
  end if;

  if v_signal_type not in (
    'copy',
    'replace',
    'kit_download',
    'mcp_call',
    'editorial',
    'favorite',
    'collection',
    'social_gallery',
    'search_attempt'
  ) then
    raise exception 'Unsupported signal_type: %', v_signal_type using errcode = '22023';
  end if;

  if v_session_hash = '' then
    raise exception 'session_hash is required' using errcode = '22023';
  end if;

  if v_signal_type = 'search_attempt' and v_search_query is null then
    raise exception 'search_query is required for search_attempt' using errcode = '22023';
  end if;

  if v_signal_type = 'search_attempt' and p_result_count is null then
    raise exception 'result_count is required for search_attempt' using errcode = '22023';
  end if;

  if v_job_category is null and v_icon_id is not null then
    select im.job_category
    into v_job_category
    from public.icon_metadata im
    where im.icon_id = v_icon_id
    limit 1;
  end if;

  insert into public.icon_evidence (
    signal_type,
    icon_id,
    batch_id,
    collection_id,
    search_query,
    result_position,
    time_to_copy_ms,
    ui_surface,
    domain,
    job_category,
    replaced_with,
    retained_days,
    agent_converged,
    confidence,
    evidence_text,
    context_url,
    session_hash,
    created_at,
    result_count,
    library_filter
  )
  values (
    v_signal_type,
    v_icon_id,
    p_batch_id,
    v_collection_id,
    v_search_query,
    p_result_position,
    p_time_to_copy_ms,
    v_ui_surface,
    v_domain,
    v_job_category,
    v_replaced_with,
    p_retained_days,
    p_agent_converged,
    p_confidence,
    v_evidence_text,
    v_context_url,
    v_session_hash,
    coalesce(p_created_at, timezone('utc', now())),
    p_result_count,
    v_library_filter
  )
  returning id into v_inserted_id;

  return v_inserted_id;
end;
$$;

comment on function public.si_log_icon_evidence(
  text,
  text,
  uuid,
  text,
  text,
  integer,
  integer,
  text,
  text,
  text,
  text,
  integer,
  boolean,
  double precision,
  text,
  text,
  text,
  timestamptz,
  integer,
  text
) is 'Public-safe RPC used by the web app and MCP to insert a single icon evidence event, including search attempts.';

revoke all on function public.si_log_icon_evidence(
  text,
  text,
  uuid,
  text,
  text,
  integer,
  integer,
  text,
  text,
  text,
  text,
  integer,
  boolean,
  double precision,
  text,
  text,
  text,
  timestamptz,
  integer,
  text
) from public;

grant execute on function public.si_log_icon_evidence(
  text,
  text,
  uuid,
  text,
  text,
  integer,
  integer,
  text,
  text,
  text,
  text,
  integer,
  boolean,
  double precision,
  text,
  text,
  text,
  timestamptz,
  integer,
  text
) to anon, authenticated, service_role;
