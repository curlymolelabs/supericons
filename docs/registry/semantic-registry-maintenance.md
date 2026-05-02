# Semantic Registry Maintenance

## Source Rules

- Treat `public/registry/records.json` and `mcp/public/registry-records.json` as generated deployment artifacts.
- Do not hand-edit public or MCP registry output files.
- The current temporary source records are the files listed in `data/si-registry/registry-manifest.json`.
- The future source of truth should be validated canonical records or Supabase/Postgres, not the current generated/manual workflow folder structure.

## Projection Rules

The website and hosted search use:

```text
public/registry/records.json
```

The MCP npm package bundles:

```text
mcp/public/registry-records.json
```

These two files exist for different deployment roots, but they must represent the same public registry projection.

Run:

```powershell
npm run verify:si-registry
```

The verifier checks that both deployment outputs match `data/si-registry/generated/public-record-preview.json`.

## Quality Rules

- Do not approve `depicts` that begins with `A symbol representing`.
- Do not approve `depicts` that begins with `A symbol for`.
- Do not approve brand-only `depicts` such as `official brand` or `product mark`.
- `depicts` should describe the visible form in plain language.
- `use_when` should describe a real UI situation.
- `avoid_when` should distinguish confusing alternatives.

## Supabase Direction

Do not bulk-load the messy current `data/si-registry` workspace into Supabase.

Use this order:

```text
schema and constraints
  -> import validated canonical/approved records
  -> verify database quality gates
  -> export website and MCP projections
```

Supabase should make updating and verifying faster, but only after it has constraints, staging tables, review states, and export scripts. Moving broken JSON into a database first would only make the broken registry faster to query.
