-- Material Symbols serving assets and error classification.
--
-- Rollback plan, written before the schema change:
-- 1. Revert every handler and candidate-query version that reads material_icon_assets.
-- 2. Stop the Material seeder and confirm no active process writes this table.
-- 3. Run supabase/rollbacks/20260714220000_material_icon_assets.down.sql.
-- 4. Restore the temporary Material exclusion if full serving is not available.
--
-- Backward compatibility:
-- - The new table and both error_code columns are additive.
-- - Existing readers and writers continue to work while the columns are null.
-- - No existing catalog or audit rows are changed or backfilled.

create table if not exists public.material_icon_assets (
  icon_id text not null references public.icon_catalog(icon_id) on delete cascade,
  variant text not null,
  svg text not null,
  axes jsonb not null,
  source_repo text not null,
  source_revision text not null,
  checksum text not null,
  license text not null default 'Apache-2.0',
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (icon_id, variant),
  constraint material_icon_assets_icon_id_valid check (icon_id ~ '^material:[^:]+$'),
  constraint material_icon_assets_variant_valid check (variant in ('outline', 'solid')),
  constraint material_icon_assets_svg_nonempty check (char_length(trim(svg)) > 0),
  constraint material_icon_assets_axes_object check (jsonb_typeof(axes) = 'object'),
  constraint material_icon_assets_source_repo_nonempty check (char_length(trim(source_repo)) > 0),
  constraint material_icon_assets_source_revision_valid check (source_revision ~ '^[a-f0-9]{40}$'),
  constraint material_icon_assets_checksum_valid check (checksum ~ '^[a-f0-9]{64}$'),
  constraint material_icon_assets_license_nonempty check (char_length(trim(license)) > 0)
);

create index if not exists material_icon_assets_variant_revision_idx
  on public.material_icon_assets (variant, source_revision);

alter table public.material_icon_assets enable row level security;
revoke all on table public.material_icon_assets from public;
grant select, insert, update, delete on table public.material_icon_assets to service_role;

alter table if exists public.search_request_audit
  add column if not exists error_code text;

alter table if exists public.mcp_usage_events
  add column if not exists error_code text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'search_request_audit_error_code_valid'
      and conrelid = 'public.search_request_audit'::regclass
  ) then
    alter table public.search_request_audit
      add constraint search_request_audit_error_code_valid
      check (error_code is null or error_code ~ '^[a-z0-9_]{1,80}$')
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'mcp_usage_events_error_code_valid'
      and conrelid = 'public.mcp_usage_events'::regclass
  ) then
    alter table public.mcp_usage_events
      add constraint mcp_usage_events_error_code_valid
      check (error_code is null or error_code ~ '^[a-z0-9_]{1,80}$')
      not valid;
  end if;
end $$;

alter table public.search_request_audit validate constraint search_request_audit_error_code_valid;
alter table public.mcp_usage_events validate constraint mcp_usage_events_error_code_valid;

create index if not exists search_request_audit_error_code_created_at_idx
  on public.search_request_audit (error_code, created_at desc)
  where error_code is not null;

create index if not exists mcp_usage_events_error_code_created_at_idx
  on public.mcp_usage_events (error_code, created_at desc)
  where error_code is not null;

comment on table public.material_icon_assets is
  'Private validated SVG assets for fixed Material Symbols MCP variants.';
comment on column public.material_icon_assets.icon_id is
  'Hosted catalog key in material:icon_name format.';
comment on column public.search_request_audit.error_code is
  'Machine-readable engine failure code. Content zeros leave this field null.';
comment on column public.mcp_usage_events.error_code is
  'Machine-readable MCP failure code. Normal results leave this field null.';
