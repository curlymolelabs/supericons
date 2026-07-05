alter table public.search_request_audit
  add column if not exists country_code text,
  add column if not exists geo_source text,
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists is_registered boolean not null default false,
  add column if not exists account_plan text,
  add column if not exists subscription_status text,
  add column if not exists is_pro boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'search_request_audit_country_code_format'
      and conrelid = 'public.search_request_audit'::regclass
  ) then
    alter table public.search_request_audit
      add constraint search_request_audit_country_code_format
      check (country_code is null or country_code ~ '^[A-Z]{2}$')
      not valid;
  end if;
end $$;

create index if not exists search_request_audit_country_created_at_idx
  on public.search_request_audit (country_code, created_at desc)
  where country_code is not null;

create index if not exists search_request_audit_user_created_at_idx
  on public.search_request_audit (user_id, created_at desc)
  where user_id is not null;

create index if not exists search_request_audit_pro_created_at_idx
  on public.search_request_audit (is_pro, created_at desc)
  where is_registered = true;

comment on column public.search_request_audit.country_code is 'Trusted two-letter country code from hosting or proxy headers, when available.';
comment on column public.search_request_audit.geo_source is 'Trusted infrastructure source that supplied country_code.';
comment on column public.search_request_audit.user_id is 'Authenticated user id resolved from a valid hosted-search bearer token, when available.';
comment on column public.search_request_audit.is_registered is 'True when hosted search resolved a signed-in account.';
comment on column public.search_request_audit.account_plan is 'Subscription plan captured at request time, when available.';
comment on column public.search_request_audit.subscription_status is 'Subscription status captured at request time, when available.';
comment on column public.search_request_audit.is_pro is 'True when the resolved subscription was active at request time.';
