-- Supericons x402: atomic rate-limit counter increment.
--
-- Rollback:
--   drop function if exists public.si_x402_increment_rate_limit(text, timestamptz, integer);

create or replace function public.si_x402_increment_rate_limit(
  p_bucket_key text,
  p_window_start timestamptz,
  p_window_seconds integer
)
returns integer
language sql
security definer
set search_path = public
as $$
  insert into public.si_x402_rate_limit_counters (
    bucket_key,
    window_start,
    window_seconds,
    request_count,
    updated_at
  )
  values (
    p_bucket_key,
    p_window_start,
    p_window_seconds,
    1,
    now()
  )
  on conflict (bucket_key, window_start)
  do update set
    request_count = public.si_x402_rate_limit_counters.request_count + 1,
    window_seconds = excluded.window_seconds,
    updated_at = now()
  returning request_count;
$$;

comment on function public.si_x402_increment_rate_limit(text, timestamptz, integer) is
  'Atomically increments the private x402 rate-limit counter for one bucket/window.';

revoke all on function public.si_x402_increment_rate_limit(text, timestamptz, integer) from public;
revoke all on function public.si_x402_increment_rate_limit(text, timestamptz, integer) from anon, authenticated;
grant execute on function public.si_x402_increment_rate_limit(text, timestamptz, integer) to service_role;
