# Registry Projection Contract

## Source Rule

`public/registry/records.json` and `mcp/public/registry-records.json` are generated deployment artifacts. They are not registry source files and should not be hand-edited.

The current temporary source records live under `data/si-registry` and are listed by `data/si-registry/registry-manifest.json`.

The planned long-term source of truth is either:

- validated canonical records, or
- Supabase/Postgres tables with quality constraints and export scripts.

## Why Two Public Files Exist

The website and hosted search flow use:

```text
public/registry/records.json
```

The MCP npm package bundles:

```text
mcp/public/registry-records.json
```

The MCP package needs a self-contained copy because it is published and installed separately from the website.

## Required Invariant

Both public registry files must be generated from the same public projection and must stay identical.

The current projection flow is:

```text
source records
  -> data/si-registry/generated/public-record-preview.json
  -> public/registry/records.json
  -> mcp/public/registry-records.json
```

`npm run verify:si-registry` must fail if either deployment file drifts from the generated public projection.

## Supabase Migration Rule

Do not bulk import the current messy `data/si-registry` folder into Supabase.

The safe migration order is:

```text
database schema and constraints
  -> validated canonical/approved records only
  -> database quality checks
  -> generated website and MCP projections
```

Supabase should become the operational source of truth only after the schema, constraints, import scripts, export scripts, and quality gates are ready.
