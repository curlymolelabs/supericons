# Search Engine Registry Metadata Cutover Implementation Plan

> **For agentic workers:** Execute this plan step-by-step and verify each gate before claiming browser or MCP search is wired to registry metadata.

**Goal:** Wire the enhanced public semantic registry into hosted search so browser search and MCP hosted search can rank icons using labels, purposes, categories, semantic tags, synonyms, usage guidance, and depicts.

**Architecture:** Keep Supabase as the live query layer for hosted search. Add a public-safe registry metadata table beside `icon_catalog`, update the search RPC to rank against that table, then sync metadata from the generated public registry export.

**Tech Stack:** Supabase Postgres, Supabase CLI linked project query, Node.js ESM sync scripts, existing MCP hosted search client.

---

## Scope

This cutover applies the hosted-search registry metadata layer. It does not rewrite icon records; the live registry already has zero open review rows.

## Steps

1. Confirm the worktree is clean.
2. Apply `supabase/migrations/20260501_hosted_search_public_registry_metadata.sql` to the linked Supabase project.
3. Apply `supabase/migrations/20260501_hosted_search_registry_rpc.sql` to the linked Supabase project.
4. Run `node --env-file=.env.local scripts/sync-search-catalog-to-supabase.mjs`.
5. Verify `icon_search_public_registry_metadata` has rows.
6. Verify sample RPC queries return registry-aware `registry_rank` / `avoid_rank` columns.
7. Run local verification:
   - `npm run verify:hosted-search-engine`
   - `npm run verify:si-registry`
   - `node --env-file=.env.local scripts/verify-live-supabase-registry-state.mjs`
8. Commit the plan and any projection changes produced by the sync/export checks.

## Manual Browser Check

After the database cutover passes, open the app and search:

- `move down`
- `shield`
- `database`
- `warning`
- `server`
- `shopping bag`

Expected result: searches should benefit from registry metadata, not only source icon names.
