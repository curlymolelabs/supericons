# Admin dashboard telemetry integrity fix

## Problem

The query explorer could combine attempts with the same query text across
different venues and countries. The resulting row could show a venue, country,
client count, and result count that never occurred together in one event.

The venue menu also listed API and CLI even though no active telemetry producer
writes either value. Local MCP tool-level events could have a missing query
origin, and local recommendation subqueries did not carry the same privacy-safe
session identifier as the tool-level event.

## Verified causes

1. Query grouping used query text, library, job, and origin, but not venue.
2. Compact rows selected one country and one venue from grouped sets.
3. The result label used `min`, which could be read as minutes instead of
   minimum.
4. API and CLI remained in the dashboard vocabulary without active producers.
5. Recommendation requests expand into several internal search variants. The
   tool-level request and its variants are separate telemetry records by design.
6. Local hosted-fallback variants did not reuse the local MCP session hash.

## Fix

1. Keep query explorer groups separate by venue.
2. Do not show a single country or venue when a grouped row contains several.
3. Show grouped minimum result counts as `N+` with a plain-language tooltip.
4. Remove API and CLI from visible and accepted dashboard venue filters.
5. Label recommendation variants and exact icon lookups in the explorer.
6. Label privacy-safe distinct identities as client IDs, not clients or users.
7. Reuse the local MCP session hash for hosted-fallback variants.
8. Fill missing MCP query origin from the recorded tool name.
9. Raise the bounded 30-day identity source from 25,000 to 30,000 rows after
   live traffic exceeded the previous bound by 113 rows.

## Acceptance

- The same query from Local MCP and Hosted MCP appears as separate rows.
- A row never combines the newest timestamp from one venue with the country or
  result count from another venue.
- Multiple-country groups state that several countries are present.
- The venue menu contains Web, Hosted MCP, Local MCP, and any genuinely observed
  nonstandard value, but does not advertise unused API or CLI options.
- The exact `recommend_icons` task is labeled as a user query.
- Its generated searches are labeled as recommendation subqueries.
- Grouped result counts cannot be mistaken for elapsed time.
- Existing raw event records are preserved.
- The 30-day overview remains complete at the measured live volume and stays
  within a fixed source bound.

## Release boundaries

The dashboard API and additive database migration are in scope. Deploying
`mcp-search`, publishing an npm package, changing storage, and changing Railway
are outside this fix.

## Verification result

Production verification completed successfully on 2026-07-18:

- Database migration `20260718190000` is applied.
- Missing MCP query-origin rows fell from 2,267 to zero.
- The reported top-level local recommendation is now an `agent_query`.
- The reported local variant is a separate Local MCP row with one client ID and
  15 results.
- Older Hosted MCP variants remain separate and state when they include more
  than one country.
- Admin API version 77 is active. `mcp-search` remained on version 39.
- The 30-day source contained 25,113 audit rows, so the 30,000-row bound now
  covers the measured live volume without truncation.
- The live API contract passed all routes and supported time windows.
- The live browser walkthrough made 18 API requests, rendered four charts,
  showed 27 completed chart days, and had no horizontal overflow.
- The full production build passed.
- No `mcp-search`, Railway, storage, or npm mutation occurred.
