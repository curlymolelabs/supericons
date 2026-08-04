# Daily Website Popularity Plan

Status: approved for implementation
Date: 2026-08-05
Decision: `D-047`

## Outcome

The default website All Icons grid shows up to 50 popular icons first. Supabase recalculates the list every day from the latest 30 calendar days. The owner does not need to download a CSV or keep a computer running.

Everything after the promoted icons keeps its existing relative order. Search, filtered views, personal views, recommendations, MCP responses, and existing score tables remain unchanged.

## Source contract

Included takes:

- Website `copy` evidence from `supericons.dev` or `www.supericons.dev`. Download labels written through the same evidence path also count.
- Hosted MCP `get_icon` tool calls with `status = 'ok'`, `result_count = 1`, and `environment` equal to `production` or `legacy`.

Excluded evidence:

- Searches, previews, recommendations, and result appearances.
- Favourites and Local MCP activity.
- Failed, malformed, or zero-result Hosted MCP calls.
- Controlled-test, preview, local, and internal-test traffic.

The refresh reconstructs older hosted references as `library_filter || ':' || query_norm` only when `metadata.returned_icon_refs[0]` is absent. Every accepted reference must match the lowercase `library:id` format.

## Ranking contract

The daily cutoff uses the current UTC time. The window starts at 00:00 UTC 29 calendar days before the cutoff date and ends at the cutoff. This matches the dashboard's 30-day calendar range.

For each icon:

1. Combine included website and hosted actions.
2. Reduce them to distinct `(icon_ref, UTC day)` pairs.
3. Count active days in the 30-day window.
4. Count active days in the latest 7 UTC calendar days.
5. Keep icons with at least 3 active days.
6. Order by 30-day active days descending, 7-day active days descending, then `library:id` ascending.

The public result is limited to 50 references after filtering against the active outline or solid grid.

## Private schema

New additive objects:

- `website_icon_popularity_snapshots`: immutable calculation metadata.
- `website_icon_popularity_scores`: the full private scored population for each snapshot.
- `website_icon_grid_availability`: exact outline and solid availability by reference.
- `website_icon_grid_availability_state`: counts and SHA-256 fingerprints for both shipped indexes.
- `website_icon_popularity_refresh_state`: active snapshot and latest refresh outcome.
- `si_replace_website_icon_grid_availability(...)`: service-role-only availability loader.
- `si_refresh_website_icon_popularity()`: service-role-only refresh.
- `si_get_website_popular_icons(p_style text)`: bounded public read function.

All tables have row-level security enabled. Anonymous and authenticated roles have no table access. The public function returns only:

```json
{
  "status": "fresh",
  "calculated_at": "2026-08-05T00:20:00Z",
  "stale_after": "2026-08-07T00:20:00Z",
  "icon_refs": ["lucide:search"]
}
```

Allowed statuses are `fresh`, `stale`, `failed`, and `insufficient_evidence`. No response contains scores, counts, identities, hashes, queries, raw events, or unshown references.

## Website behavior

The website keeps the new response in `websitePopularIconRefs`, separate from `popularityMap`.

The prefix applies only when:

- The view is the default icon grid.
- The selected library is All Icons.
- There is no search or use-case filter.
- The view is not Favourites, Recent, a personal collection, or an MCP preview.
- The response is fresh and at least 6 returned references resolve in the active grid.

The transformation is stable:

1. Resolve returned references in server order.
2. Place resolved icons first.
3. Remove those references from their former positions.
4. Append the untouched remainder.

The page shows the calculation time and states the represented population. Failed, stale, or insufficient responses show a short message and preserve the usual order.

## Schedule and observability

The Supabase `pg_cron` job is named `si-refresh-website-icon-popularity-daily` and runs at `20 0 * * *`.

The release verifies:

- The job exists and points only to `si_refresh_website_icon_popularity()`.
- The latest refresh succeeded.
- The active snapshot is newer than 48 hours.
- The public result is bounded to 50 references.
- Availability counts and fingerprints match the exact shipped indexes.

## Backward compatibility

The migration is additive. It does not read from or write to:

- `icon_scores`
- `si_rebuild_icon_scores()`
- `icon_search_private_features`
- Search tables, ranking functions, or recommendations
- MCP writers, schemas, or responses

An older website ignores the new database objects. A newer website fails safely if the database objects, availability data, or fresh snapshot are unavailable.

## Rollback plan

Rollback is operational and preserves evidence:

1. Deploy the previous website commit so the prefix is no longer requested.
2. Unschedule only `si-refresh-website-icon-popularity-daily`.
3. Revoke public execute on `si_get_website_popular_icons(text)`.
4. Keep the isolated tables and last snapshot for investigation.
5. Drop the new objects only through a later cleanup migration after no released website calls them.

No search or MCP rollback is required because those systems are not changed.

## Verification gates

- PostgreSQL 17 migration and rollback smoke test.
- Ranking fixtures for same-day repetition, cross-source deduplication, 30-day and 7-day ordering, qualification, and exclusions.
- Public-privilege and response-boundary tests.
- Availability count and fingerprint parity with both shipped indexes.
- Unit tests proving no duplicate promoted icon and byte-for-byte tail-reference order.
- Browser checks for fresh, stale, failed, insufficient, search, library, Favourites, Recent, style, and MCP preview states.
- Existing icon-grid, search-ranking, hosted-search, MCP schema, localization, and production-build checks.
- Read-only production stability report comparing daily cutoffs and reporting the top 20 and top-50 overlap.

## Release order

1. Commit the reviewed source and fingerprints.
2. Apply only migration `20260805120000` with the guarded runner.
3. Load and verify exact grid availability.
4. Run the initial refresh and verify the bounded public response.
5. Activate and verify the daily schedule.
6. Deploy the website from the exact commit.
7. Verify the live page without generating search or MCP traffic.
