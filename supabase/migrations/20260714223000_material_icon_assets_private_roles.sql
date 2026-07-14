-- Remove production default table privileges from the private Material asset store.
--
-- Rollback plan:
-- - Do not restore anon or authenticated access to this private table.
-- - A full Material feature rollback uses
--   supabase/rollbacks/20260714220000_material_icon_assets.down.sql, which drops
--   the table after serving code and seed writers are stopped.
--
-- Backward compatibility:
-- - This changes no table shape and no data.
-- - service_role access is unchanged.

do $$
begin
  if to_regclass('public.material_icon_assets') is null then
    raise exception 'Required table public.material_icon_assets is missing';
  end if;
end $$;

revoke all on table public.material_icon_assets from anon, authenticated;
