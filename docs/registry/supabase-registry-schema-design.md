# Supabase Registry Schema Design

## Goal

The Supabase registry should make icon search data easier to update, verify, export, and protect from accidental quality regressions.

It should not be a direct copy of the current folder structure. It should be a structured operational registry with staging, review, quality, and export gates.

## Recommended Data Flow

```text
manifest-listed approved JSON records
  -> staging import
  -> database constraints and quality checks
  -> approved registry tables
  -> generated public projection
  -> public/registry/records.json
  -> mcp/public/registry-records.json
```

After cutover:

```text
Supabase approved registry tables
  -> generated public projection
  -> website registry file
  -> MCP package registry file
```

## Core Tables

### `icon_libraries`

Stores one row per icon library.

Recommended fields:

```text
id uuid primary key
library_key text unique not null
display_name text not null
source_group text not null
package_name text
homepage_url text
license_name text
status text not null default 'active'
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

### `icon_registry_records`

Stores the current approved operational registry row for each icon.

Recommended fields:

```text
icon_id text primary key
library_key text not null references icon_libraries(library_key)
source_name text not null
label text not null
purpose text
category text
depicts text not null
semantic_tags text[] not null default '{}'
synonyms text[] not null default '{}'
use_when text not null
avoid_when text not null
status text not null
review_state text not null
quality_status text not null
access_tier text not null
projection_policy text not null
is_premium boolean not null default false
record jsonb not null
search_document tsvector
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Recommended unique constraint:

```text
unique (library_key, source_name)
```

### `icon_registry_record_versions`

Stores previous versions so a bad update can be traced and rolled back.

Recommended fields:

```text
id uuid primary key
icon_id text not null references icon_registry_records(icon_id)
version_number integer not null
record jsonb not null
change_reason text
created_at timestamptz not null default now()
created_by uuid
```

Recommended unique constraint:

```text
unique (icon_id, version_number)
```

### `icon_registry_quality_findings`

Stores quality failures found by scripts, imports, or review.

Recommended fields:

```text
id uuid primary key
icon_id text not null
library_key text
issue_code text not null
severity text not null
field_name text not null
message text not null
source text not null
status text not null default 'open'
created_at timestamptz not null default now()
resolved_at timestamptz
```

### `icon_registry_review_queue`

Stores records needing human review or repair.

Recommended fields:

```text
id uuid primary key
icon_id text not null
library_key text
queue_type text not null
priority integer not null default 50
source_path text
status text not null default 'open'
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

### `icon_registry_projection_exports`

Stores export runs and hashes so website/MCP drift can be detected.

Recommended fields:

```text
id uuid primary key
target text not null
record_count integer not null
content_hash text not null
quality_failure_count integer not null default 0
generated_at timestamptz not null default now()
source_snapshot jsonb
```

## Required Constraints

### Required field constraints

Block empty approved records:

```text
length(trim(icon_id)) > 0
length(trim(library_key)) > 0
length(trim(source_name)) > 0
length(trim(label)) > 0
length(trim(depicts)) > 0
length(trim(use_when)) > 0
length(trim(avoid_when)) > 0
```

### Status constraints

Use explicit status values:

```text
status in ('draft', 'reviewed', 'approved', 'deprecated')
review_state in ('pending', 'reviewed', 'needs_repair', 'rejected')
quality_status in ('passing', 'warning', 'failing')
access_tier in ('public_open_record', 'premium_record', 'private_record')
projection_policy in ('future_public_record', 'premium_record', 'private_record')
```

### Quality constraints

The database should block known bad public `depicts` phrases for approved/exportable records.

Recommended blocked patterns:

```text
a symbol representing
a symbol for
official%brand
product mark
```

These should be implemented as a check constraint or a trigger so the database refuses bad approved rows instead of relying only on agent memory.

### Projection eligibility constraint

Only records with approved review state and passing quality should enter the public export view.

Recommended view rule:

```text
status in ('reviewed', 'approved')
and review_state = 'reviewed'
and quality_status = 'passing'
and access_tier = 'public_open_record'
and projection_policy = 'future_public_record'
```

## Recommended Indexes

Use btree indexes for filters:

```text
icon_registry_records(library_key)
icon_registry_records(source_name)
icon_registry_records(status)
icon_registry_records(review_state)
icon_registry_records(quality_status)
icon_registry_records(updated_at)
```

Use GIN indexes for arrays:

```text
gin(semantic_tags)
gin(synonyms)
```

Use a GIN index for full-text search:

```text
gin(search_document)
```

The importer or export-preparation job should populate `search_document`. Do not rely on a generated column for array-based search text unless the expression has been verified against the target Postgres version.

If typo-tolerant search is needed, enable `pg_trgm` and add trigram indexes on searchable text fields such as `label`, `source_name`, `depicts`, and `synonyms` materialized text.

## Public And Private Access

Recommended access model:

| Surface | Access |
| --- | --- |
| public website search | read only from export view or generated JSON |
| MCP hosted search | read only through controlled API/function |
| registry import scripts | service role only |
| registry editing tools | authenticated admin role only |
| staging and quality findings | admin/service role only |

Do not expose the operational tables directly to anonymous clients. Public clients should use generated exports or a controlled search API.

## Library Segregation

Yes, the database should segregate records by library.

Recommended approach:

- Store all libraries in one normalized `icon_registry_records` table.
- Use `library_key` for filtering, constraints, review queues, and exports.
- Add indexes on `library_key` and `(library_key, source_name)`.
- Export per-library slices when useful for review or package distribution.

This is cleaner than one giant JSON file while still allowing a unified search index across all libraries.

## Import Strategy

Do not import these folders as operational records:

```text
data/si-registry/generated/
data/si-registry/manual-redo/
output/icon_screenshot/
public/registry/
mcp/public/
```

Initial import should use only manifest-listed approved sources:

```text
data/si-registry/registry-manifest.json
```

The importer should:

1. Read the manifest.
2. Load only listed record groups and import sources.
3. Validate required fields.
4. Reject known bad `depicts` phrases.
5. Insert rows into staging.
6. Promote only passing rows to `icon_registry_records`.
7. Write failures to `icon_registry_quality_findings`.

## Export Strategy

The exporter should:

1. Query only the public export view.
2. Sort records deterministically.
3. Write `data/si-registry/generated/public-record-preview.json`.
4. Write `public/registry/records.json`.
5. Write `mcp/public/registry-records.json`.
6. Record content hashes in `icon_registry_projection_exports`.
7. Run `npm run verify:si-registry`.

## Protection Reality

Moving the registry to Supabase can protect the source-of-truth workflow from accidental overwrites, bad imports, and uncontrolled local edits.

It does not make public registry data impossible to copy if the same semantic data is shipped to browsers or bundled into a public MCP package.

The protection value comes from:

- keeping source tables private,
- exposing only the minimum public projection,
- enforcing quality gates in the database,
- limiting edit/write access,
- logging versions and exports,
- serving richer search through controlled APIs when appropriate.

## Recommended Next Implementation Step

Create the Supabase migration for the schema above, then build a dry-run importer that reads the current manifest and reports what would pass, fail, and be promoted. Do not switch production export to Supabase until the dry run can rebuild the current public and MCP projections and pass quality gates.
