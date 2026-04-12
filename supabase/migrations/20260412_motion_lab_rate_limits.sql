create table if not exists public.si_motion_lab_rate_limits (
  bucket text not null,
  subject_kind text not null,
  subject_key text not null,
  window_started_at timestamptz not null,
  window_seconds integer not null,
  request_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint si_motion_lab_rate_limits_window_seconds_positive check (window_seconds > 0),
  constraint si_motion_lab_rate_limits_request_count_nonnegative check (request_count >= 0),
  constraint si_motion_lab_rate_limits_bucket_nonempty check (char_length(trim(bucket)) > 0),
  constraint si_motion_lab_rate_limits_subject_kind_nonempty check (char_length(trim(subject_kind)) > 0),
  constraint si_motion_lab_rate_limits_subject_key_nonempty check (char_length(trim(subject_key)) > 0),
  constraint si_motion_lab_rate_limits_window_unique unique (bucket, subject_kind, subject_key, window_started_at)
);

create index if not exists si_motion_lab_rate_limits_updated_at_idx
  on public.si_motion_lab_rate_limits (updated_at);

create index if not exists si_motion_lab_rate_limits_subject_bucket_updated_at_idx
  on public.si_motion_lab_rate_limits (subject_key, bucket, updated_at desc);

comment on table public.si_motion_lab_rate_limits is
  'Fixed-window rate limit counters for hosted Motion Lab endpoints.';

create or replace function public.si_enforce_motion_lab_rate_limit(
  p_bucket text,
  p_subject_kind text,
  p_subject_key text,
  p_limit integer,
  p_window_seconds integer,
  p_now timestamptz default timezone('utc', now())
)
returns table (
  allowed boolean,
  request_count integer,
  remaining integer,
  retry_after_seconds integer,
  window_started_at timestamptz,
  window_ends_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bucket text := trim(coalesce(p_bucket, ''));
  v_subject_kind text := trim(coalesce(p_subject_kind, ''));
  v_subject_key text := trim(lower(coalesce(p_subject_key, '')));
  v_now timestamptz := coalesce(p_now, timezone('utc', now()));
  v_window_started_at timestamptz;
  v_window_ends_at timestamptz;
  v_request_count integer;
begin
  if v_bucket = '' or v_subject_kind = '' or v_subject_key = '' then
    raise exception 'Motion Lab rate limit identifiers are required.'
      using errcode = '22023';
  end if;

  if p_limit is null or p_limit <= 0 or p_window_seconds is null or p_window_seconds <= 0 then
    raise exception 'Motion Lab rate limit threshold configuration is invalid.'
      using errcode = '22023';
  end if;

  v_window_started_at := to_timestamp(
    floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds
  );
  v_window_ends_at := v_window_started_at + make_interval(secs => p_window_seconds);

  insert into public.si_motion_lab_rate_limits (
    bucket,
    subject_kind,
    subject_key,
    window_started_at,
    window_seconds,
    request_count,
    created_at,
    updated_at
  )
  values (
    v_bucket,
    v_subject_kind,
    v_subject_key,
    v_window_started_at,
    p_window_seconds,
    1,
    timezone('utc', now()),
    timezone('utc', now())
  )
  on conflict on constraint si_motion_lab_rate_limits_window_unique
  do update set
    request_count = public.si_motion_lab_rate_limits.request_count + 1,
    updated_at = timezone('utc', now())
  returning public.si_motion_lab_rate_limits.request_count
  into v_request_count;

  if random() < 0.01 then
    delete from public.si_motion_lab_rate_limits
    where ctid in (
      select ctid
      from public.si_motion_lab_rate_limits
      where updated_at < timezone('utc', now()) - interval '1 day'
      limit 500
    );
  end if;

  return query
  select
    (v_request_count <= p_limit) as allowed,
    v_request_count as request_count,
    greatest(0, p_limit - v_request_count) as remaining,
    greatest(0, ceil(extract(epoch from (v_window_ends_at - v_now)))::integer) as retry_after_seconds,
    v_window_started_at as window_started_at,
    v_window_ends_at as window_ends_at;
end;
$$;

comment on function public.si_enforce_motion_lab_rate_limit(text, text, text, integer, integer, timestamptz) is
  'Atomically enforces a fixed-window Motion Lab rate limit and returns the current window state.';

revoke all on table public.si_motion_lab_rate_limits from public;
revoke all on function public.si_enforce_motion_lab_rate_limit(text, text, text, integer, integer, timestamptz) from public;

grant select, insert, update, delete on table public.si_motion_lab_rate_limits to service_role;
grant execute on function public.si_enforce_motion_lab_rate_limit(text, text, text, integer, integer, timestamptz) to service_role;
