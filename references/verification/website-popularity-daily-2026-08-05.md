# Website Popularity Daily Verification

Date: 2026-08-05
Branch: `codex/daily-website-popularity-30d`
Status: released and verified

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

Release source:

- Commit: `006f9f28b8aa2db77b1aa4500841cee5e4b197f4`
- Migration: `20260805120000`
- Migration SHA-256: `105c016c08f9dbde830d0521917950ba43831a43dbef1a8a4a4f65d7372d55b6`
- Schedule SHA-256: `5df29215d22ba3a1564c8687d6e7f009d778f8690b8978d5548cc74ed66f7446`
- Supabase project: `kcjmkakdhsqplvasgkjv`

Database release completed at `2026-08-04T17:39:45.1162801Z`. The guarded runner recorded passes for preflight, migration postflight, the exact migration-history mark, availability initialization, the initial refresh, and schedule activation.

Production database result:

- Existing `icon_scores` rows before release: 162
- Existing `icon_search_private_features` rows before release: 161
- Protected object fingerprints unchanged after migration: yes
- Availability rows loaded: 25,862
- Outline response: `fresh`, 50 references
- Solid response: `fresh`, 22 references
- Daily job: `si-refresh-website-icon-popularity-daily`
- Daily schedule: `20 0 * * *`
- Scheduled command: `select public.si_refresh_website_icon_popularity();`

Website release:

- Netlify site: `dcccabac-ae47-4c69-80c4-aefc8c15e2e5`
- Production deploy: `6a722472c52cda1e9e84ef81`
- Published at: `2026-08-04T17:42:28.963Z`
- Production URL: `https://supericons.dev`
- Exact deploy URL: `https://6a722472c52cda1e9e84ef81--lucky-faun-ce5f50.netlify.app`
- Previous production deploy for website rollback: `6a70dd7cd0bd6a491c8594c6`

The live Chromium check loaded the real production page without performing a search or MCP call. It verified:

- Popularity status: `fresh`
- Applied outline references: 50
- First 20 references: exact match to the audited list above
- Search query: empty
- Active library: All Icons
- Visible copy included the represented population and update time
- Production searches generated by the check: 0
- Production MCP calls generated by the check: 0

Rollback remains separated by stage. Republish Netlify deploy `6a70dd7cd0bd6a491c8594c6` first. Then run `scripts/sql/website-popularity-hosted-operational-rollback.sql` to remove only the new cron job and public RPC access while preserving the private snapshot for investigation.
