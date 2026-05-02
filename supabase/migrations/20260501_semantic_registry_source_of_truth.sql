create table if not exists public.icon_registry_libraries (
  library_key text primary key,
  display_name text not null,
  source_group text not null,
  package_name text,
  homepage_url text,
  license_name text,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint icon_registry_libraries_key_nonempty check (char_length(trim(library_key)) > 0),
  constraint icon_registry_libraries_display_name_nonempty check (char_length(trim(display_name)) > 0),
  constraint icon_registry_libraries_source_group_valid check (source_group in ('free', 'premium', 'private')),
  constraint icon_registry_libraries_status_valid check (status in ('active', 'deprecated', 'hidden'))
);

create table if not exists public.icon_registry_import_staging (
  id bigserial primary key,
  import_batch_id text not null,
  icon_id text not null,
  library_key text not null,
  source_name text not null,
  source_path text not null,
  record jsonb not null,
  import_status text not null default 'pending',
  quality_failure_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  constraint icon_registry_import_staging_import_batch_nonempty check (char_length(trim(import_batch_id)) > 0),
  constraint icon_registry_import_staging_icon_id_nonempty check (char_length(trim(icon_id)) > 0),
  constraint icon_registry_import_staging_library_key_nonempty check (char_length(trim(library_key)) > 0),
  constraint icon_registry_import_staging_source_name_nonempty check (char_length(trim(source_name)) > 0),
  constraint icon_registry_import_staging_source_path_nonempty check (char_length(trim(source_path)) > 0),
  constraint icon_registry_import_staging_status_valid check (import_status in ('pending', 'passed', 'failed', 'promoted', 'rejected')),
  constraint icon_registry_import_staging_quality_failure_count_nonnegative check (quality_failure_count >= 0)
);

create table if not exists public.icon_registry_records (
  icon_id text primary key,
  library_key text not null references public.icon_registry_libraries(library_key) on update cascade,
  source_name text not null,
  label text not null,
  purpose text,
  category text,
  depicts text not null,
  semantic_tags text[] not null default '{}'::text[],
  synonyms text[] not null default '{}'::text[],
  use_when text not null,
  avoid_when text not null,
  status text not null,
  review_state text not null,
  quality_status text not null,
  access_tier text not null,
  projection_policy text not null,
  is_premium boolean not null default false,
  record jsonb not null,
  search_document tsvector,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint icon_registry_records_library_source_unique unique (library_key, source_name),
  constraint icon_registry_records_icon_id_nonempty check (char_length(trim(icon_id)) > 0),
  constraint icon_registry_records_library_key_nonempty check (char_length(trim(library_key)) > 0),
  constraint icon_registry_records_source_name_nonempty check (char_length(trim(source_name)) > 0),
  constraint icon_registry_records_label_nonempty check (char_length(trim(label)) > 0),
  constraint icon_registry_records_depicts_nonempty check (char_length(trim(depicts)) > 0),
  constraint icon_registry_records_use_when_nonempty check (char_length(trim(use_when)) > 0),
  constraint icon_registry_records_avoid_when_nonempty check (char_length(trim(avoid_when)) > 0),
  constraint icon_registry_records_icon_id_matches_source check (icon_id = library_key || ':' || source_name),
  constraint icon_registry_records_status_valid check (status in ('draft', 'reviewed', 'approved', 'deprecated')),
  constraint icon_registry_records_review_state_valid check (review_state in ('pending', 'reviewed', 'needs_repair', 'rejected')),
  constraint icon_registry_records_quality_status_valid check (quality_status in ('passing', 'warning', 'failing')),
  constraint icon_registry_records_access_tier_valid check (access_tier in ('public_open_record', 'premium_record', 'private_record')),
  constraint icon_registry_records_projection_policy_valid check (projection_policy in ('future_public_record', 'premium_record', 'private_record')),
  constraint icon_registry_records_public_depicts_quality check (
    not (
      status in ('reviewed', 'approved')
      and review_state = 'reviewed'
      and quality_status = 'passing'
      and access_tier = 'public_open_record'
      and projection_policy = 'future_public_record'
      and (
        lower(depicts) like 'a symbol representing%'
        or lower(depicts) like 'a symbol for%'
        or lower(depicts) like '%product mark%'
        or (lower(depicts) like '%official%' and lower(depicts) like '%brand%')
      )
    )
  )
);

create table if not exists public.icon_registry_record_versions (
  id uuid primary key default gen_random_uuid(),
  icon_id text not null references public.icon_registry_records(icon_id) on delete cascade,
  version_number integer not null,
  record jsonb not null,
  change_reason text,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  constraint icon_registry_record_versions_version_positive check (version_number > 0),
  constraint icon_registry_record_versions_unique unique (icon_id, version_number)
);

create table if not exists public.icon_registry_quality_findings (
  id uuid primary key default gen_random_uuid(),
  icon_id text not null,
  library_key text,
  issue_code text not null,
  severity text not null,
  field_name text not null,
  message text not null,
  source text not null,
  status text not null default 'open',
  created_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  constraint icon_registry_quality_findings_icon_id_nonempty check (char_length(trim(icon_id)) > 0),
  constraint icon_registry_quality_findings_issue_code_nonempty check (char_length(trim(issue_code)) > 0),
  constraint icon_registry_quality_findings_severity_valid check (severity in ('info', 'warning', 'error', 'blocker')),
  constraint icon_registry_quality_findings_field_name_nonempty check (char_length(trim(field_name)) > 0),
  constraint icon_registry_quality_findings_message_nonempty check (char_length(trim(message)) > 0),
  constraint icon_registry_quality_findings_source_nonempty check (char_length(trim(source)) > 0),
  constraint icon_registry_quality_findings_status_valid check (status in ('open', 'resolved', 'ignored'))
);

create table if not exists public.icon_registry_review_queue (
  id uuid primary key default gen_random_uuid(),
  icon_id text not null,
  library_key text,
  queue_type text not null,
  priority integer not null default 50,
  source_path text,
  status text not null default 'open',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint icon_registry_review_queue_icon_id_nonempty check (char_length(trim(icon_id)) > 0),
  constraint icon_registry_review_queue_type_nonempty check (char_length(trim(queue_type)) > 0),
  constraint icon_registry_review_queue_priority_range check (priority between 0 and 100),
  constraint icon_registry_review_queue_status_valid check (status in ('open', 'in_review', 'resolved', 'rejected'))
);

create table if not exists public.icon_registry_projection_exports (
  id uuid primary key default gen_random_uuid(),
  target text not null,
  record_count integer not null,
  content_hash text not null,
  quality_failure_count integer not null default 0,
  generated_at timestamptz not null default timezone('utc', now()),
  source_snapshot jsonb,
  constraint icon_registry_projection_exports_target_valid check (target in ('generated_public_projection', 'website_public_registry', 'mcp_public_registry')),
  constraint icon_registry_projection_exports_record_count_nonnegative check (record_count >= 0),
  constraint icon_registry_projection_exports_hash_nonempty check (char_length(trim(content_hash)) > 0),
  constraint icon_registry_projection_exports_quality_failure_count_nonnegative check (quality_failure_count >= 0)
);

create or replace view public.icon_registry_public_export as
select
  icon_id,
  library_key as source_library,
  source_name,
  label,
  purpose,
  category,
  depicts,
  semantic_tags,
  synonyms,
  use_when,
  avoid_when,
  record,
  updated_at
from public.icon_registry_records
where status in ('reviewed', 'approved')
  and review_state = 'reviewed'
  and quality_status = 'passing'
  and access_tier = 'public_open_record'
  and projection_policy = 'future_public_record';

create index if not exists icon_registry_import_staging_batch_idx
  on public.icon_registry_import_staging (import_batch_id, import_status);

create index if not exists icon_registry_import_staging_icon_idx
  on public.icon_registry_import_staging (icon_id);

create index if not exists icon_registry_records_library_idx
  on public.icon_registry_records (library_key, source_name asc);

create index if not exists icon_registry_records_status_idx
  on public.icon_registry_records (status, review_state, quality_status);

create index if not exists icon_registry_records_updated_at_idx
  on public.icon_registry_records (updated_at desc);

create index if not exists icon_registry_records_semantic_tags_idx
  on public.icon_registry_records using gin (semantic_tags);

create index if not exists icon_registry_records_synonyms_idx
  on public.icon_registry_records using gin (synonyms);

create index if not exists icon_registry_records_search_document_idx
  on public.icon_registry_records using gin (search_document);

create index if not exists icon_registry_quality_findings_status_idx
  on public.icon_registry_quality_findings (status, severity, created_at desc);

create index if not exists icon_registry_quality_findings_icon_idx
  on public.icon_registry_quality_findings (icon_id, status);

create index if not exists icon_registry_review_queue_status_idx
  on public.icon_registry_review_queue (status, priority desc, created_at asc);

create index if not exists icon_registry_projection_exports_target_idx
  on public.icon_registry_projection_exports (target, generated_at desc);

alter table public.icon_registry_libraries enable row level security;
alter table public.icon_registry_import_staging enable row level security;
alter table public.icon_registry_records enable row level security;
alter table public.icon_registry_record_versions enable row level security;
alter table public.icon_registry_quality_findings enable row level security;
alter table public.icon_registry_review_queue enable row level security;
alter table public.icon_registry_projection_exports enable row level security;

revoke all on table public.icon_registry_libraries from public;
revoke all on table public.icon_registry_import_staging from public;
revoke all on table public.icon_registry_records from public;
revoke all on table public.icon_registry_record_versions from public;
revoke all on table public.icon_registry_quality_findings from public;
revoke all on table public.icon_registry_review_queue from public;
revoke all on table public.icon_registry_projection_exports from public;
revoke all on table public.icon_registry_public_export from public;

grant select, insert, update, delete on table public.icon_registry_libraries to service_role;
grant select, insert, update, delete on table public.icon_registry_import_staging to service_role;
grant select, insert, update, delete on table public.icon_registry_records to service_role;
grant select, insert, update, delete on table public.icon_registry_record_versions to service_role;
grant select, insert, update, delete on table public.icon_registry_quality_findings to service_role;
grant select, insert, update, delete on table public.icon_registry_review_queue to service_role;
grant select, insert, update, delete on table public.icon_registry_projection_exports to service_role;
grant select on table public.icon_registry_public_export to service_role;
