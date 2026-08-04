# Website Popularity Daily Verification

Date: 2026-08-05
Branch: `codex/daily-website-popularity-30d`
Status: pre-release gates complete, hosted release pending

## Scope

This release adds a website-only popularity prefix to the default All Icons grid. It does not change search, recommendations, MCP behavior, personal views, or the existing `icon_scores` ranking.

The exact take query and ranking implementation is in:

- `supabase/migrations/20260805120000_website_icon_popularity.sql`

The guarded hosted release entry point is:

- `scripts/run-website-popularity-hosted-release.ps1`

The operational database rollback is:

- `scripts/sql/website-popularity-hosted-operational-rollback.sql`

## Read-only production audit

Audit command:

```text
node scripts/audit-website-popularity-live.mjs --output .tmp/website-popularity-live-audit.json
```

Audit result:

- Transaction mode: read only
- Mutations: 0
- Cutoff: `2026-08-04 17:36:41.87833+00`
- Window start: `2026-07-06 00:00:00+00`
- Qualifying icons: 221 total, 220 outline, 22 solid
- Hosted references checked against stored and reconstructed forms: 1,658
- Hosted reference mismatches: 0

Stability overlap:

| Comparison cutoff | Top 50 overlap | Top 20 overlap |
| --- | ---: | ---: |
| 1 day earlier | 48 | 19 |
| 3 days earlier | 41 | 19 |
| 7 days earlier | 35 | 17 |

Current outline top 20:

1. `lucide:shield-check`
2. `lucide:search`
3. `lucide:workflow`
4. `lucide:users`
5. `lucide:database`
6. `lucide:brain-cog`
7. `lucide:network`
8. `lucide:triangle-alert`
9. `lucide:sparkles`
10. `lucide:package`
11. `lucide:route`
12. `lucide:chart-no-axes-combined`
13. `lucide:map-pin`
14. `lucide:star`
15. `lucide:users-round`
16. `tabler:brand-openai`
17. `lucide:refresh-cw`
18. `lucide:clipboard-check`
19. `lucide:trash-2`
20. `lucide:settings`

## Passed gates

- Website popularity helper and privacy contract
- PostgreSQL 17 migration, ranking, failure, rollback, and hosted packet checks
- Chromium popularity prefix, exact tail order, search exclusion, library exclusion, personal view exclusion, explicit MCP preview exclusion, style switch, and fail-safe states
- Existing icon grid behavior
- Existing search query fixtures
- Existing search ranking policy
- Existing MCP agent response contract
- Existing icon request entry points and Chromium flow
- Existing store shell contract
- All 12 source locale catalogs and their public copies
- Protected Search v2 public artifact scan
- Production build
- Release surface preflight

The PostgreSQL fixture verified one counted take per icon per UTC day across included sources, website copy and download evidence, older Hosted MCP reference reconstruction, controlled traffic exclusion, private score rows, bounded response fields, and unchanged `icon_scores`, `icon_search_private_features`, and `si_rebuild_icon_scores()`.

## Baseline issues outside this release

Two untouched legacy gates were not green:

- `verify:hosted-search-engine` failed its existing `avoid_when` ranking assertion. The test and its hosted search inputs have no diff in this branch.
- `verify:mcp-preview-persistence` timed out without output. The new Chromium popularity test independently passed the explicit MCP preview ordering check.

These findings are recorded as separate evidence. No search or MCP code was changed to address them.

## Hosted release evidence

Pending. This section will record the exact commit, migration and schedule fingerprints, database postflight, cron state, deployment ID, live public response, and live page check after the guarded release completes.
