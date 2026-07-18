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

## Release boundaries

The dashboard API and additive database migration are in scope. Deploying
`mcp-search`, publishing an npm package, changing storage, and changing Railway
are outside this fix.
