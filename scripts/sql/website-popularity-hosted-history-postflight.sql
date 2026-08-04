\set ON_ERROR_STOP on

do $$
begin
  if not exists (
    select 1
    from supabase_migrations.schema_migrations
    where version = '20260805120000'
  ) then
    raise exception 'Migration 20260805120000 is not recorded';
  end if;
end
$$;

select jsonb_build_object(
  'status', 'pass',
  'migration_version', '20260805120000'
) as website_popularity_history_postflight;
