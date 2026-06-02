-- Supericons: make public Data API access explicit.
-- RLS still controls which rows each user can see or change.

begin;

grant usage on schema public to anon, authenticated, service_role;

grant select on table public.si_products to anon, authenticated;
grant select, insert, update, delete on table public.si_products to service_role;

grant select on table public.si_purchases to authenticated;
grant select, insert, update, delete on table public.si_purchases to service_role;

grant select, update on table public.si_profiles to authenticated;
grant select, insert, update, delete on table public.si_profiles to service_role;

grant select on table public.si_subscriptions to authenticated;
grant select, insert, update, delete on table public.si_subscriptions to service_role;

grant select on table public.si_billing_notifications to authenticated;
grant select, insert, update, delete on table public.si_billing_notifications to service_role;

grant usage, select on sequence public.search_request_audit_id_seq to service_role;
grant usage, select on sequence public.icon_registry_import_staging_id_seq to service_role;

do $$
begin
  if to_regclass('public.si_api_keys') is not null then
    execute 'grant select, update on table public.si_api_keys to authenticated';
    execute 'grant select, insert, update, delete on table public.si_api_keys to service_role';
  end if;

  if to_regclass('public.si_credits') is not null then
    execute 'grant select on table public.si_credits to authenticated';
    execute 'grant select, insert, update, delete on table public.si_credits to service_role';
  end if;
end
$$;

commit;
