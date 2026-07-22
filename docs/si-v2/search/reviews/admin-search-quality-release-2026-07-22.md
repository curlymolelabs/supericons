# Admin search quality release, 2026-07-22

## Decision

GO for a bounded internal rollout.

The implementation meets the required acceptance criteria for accurate exact-lookup outcomes, useful event exports, privacy-safe identity grouping, complete-export enforcement, future telemetry, scorecard definitions, and local admin authentication. Browser, API, MCP integration, static, and production build checks pass.

## Release units

1. Supabase `admin-api`: adds the event-detail endpoint, correct lookup outcome aggregation, privacy-safe root request linking, complete-export metadata, and constant-time secret comparison.
2. Railway hosted MCP: records future returned icon references, build and execution metadata, traffic class, privacy-safe root request hash, and structured `icon_not_found` errors.
3. Local admin dashboard: adds summary and event CSV and JSON exports, clear metric definitions, stronger CSV safety, and an opaque local session cookie.
4. Database correction: classifies a bounded set of high-confidence repository validation workloads as controlled tests. The selection is limited by tool, channel, client family, date, and known validation tasks.

The database correction is additive. It updates traffic labels in existing JSON metadata and does not delete events or change the public schema.

## Runtime assumptions

- `ADMIN_SECRET` remains a Supabase function secret and can be rotated without rebuilding the dashboard.
- The local server holds the entered secret only in server memory and gives the browser an opaque HttpOnly session cookie.
- `SUPABASE_ACCESS_TOKEN` is required only for the function deployment.
- Railway deployment uses the existing Supericons production project, environment, service, and health endpoint.

## Observability

- Supabase function list exposes function version, status, update time, and JWT verification mode.
- Railway exposes deployment status and the hosted MCP health endpoint.
- The event export exposes field coverage and completeness.
- The scorecard reports data-quality failures, top-level tool outcomes, diagnostic lower-level rows, latency, explicit locale coverage, and traffic classification.
- A short-lived event snapshot keeps all CSV and JSON pages consistent while avoiding repeated full-history database work.
- The scorecard reports error codes, channel and version breakdowns, per-source field coverage, and suspicious repeated workloads.

## Residual risk

- Old rows remain incomplete where the original telemetry omitted a field. Missing values stay explicit.
- Recommendation completion does not measure relevance.
- The deployed MCP dependency scan contains a moderate Windows-only static-file advisory in a code path this Linux service does not use. This risk is accepted for this release and should be removed when the MCP SDK dependency range supports a safe compatible update.
- The rollback source is verified by commit identity, but the new release's rollback path is exercised only if a live smoke check fails.

## Rollout

1. Commit the verified source on `codex/admin-quality-20260722`.
2. Record the current Supabase function version and Railway deployment ID.
3. Deploy `admin-api` from the candidate commit.
4. Verify unauthenticated rejection, authenticated event response, completeness fields, and exact lookup outcome fields.
5. Deploy the `mcp` directory to the existing Railway service.
6. Verify deployment success, health, exact found and not-found behavior, and telemetry ingestion.
7. Export seven days of events and run the scorecard.
8. Merge the candidate into `main` so the normal `npm run dev:admin` command uses one maintained folder.

## Rollback

- Supabase: deploy `supabase/functions/admin-api` from the pre-release commit, then repeat the unauthenticated and authenticated smoke checks.
- Railway: redeploy the pre-release commit's `mcp` directory, then verify the deployment status and health endpoint.
- Local dashboard: revert the merge commit if the local browser flow fails after integration.
- Database correction: remove `metadata.traffic_class` from rows labeled `controlled-run:historical-validation`, then set that cohort value back to null. Existing founder labels remain unchanged.

## Worst credible failure in the first 24 hours

An event-detail request could be slow for a broad period or return an inconsistent multi-page selection. The API builds one bounded short-lived snapshot, pages from that snapshot, limits each source, and makes exports fail closed when completeness or snapshot consistency cannot be proven.

## Rollout result

- Supabase `admin-api` advanced from version 85 to version 87. Its status is active, JWT verification remains disabled by design, and an unauthenticated event request returns 403. The deployed bundle SHA-256 is `da3ee402dce735084adee48da0d475e5fd7a86757b794f839175cfdb8bdec020`.
- Railway deployment `ee02bdca-96b6-46f2-9637-7636a2271f33` completed successfully with image digest `sha256:66359ee5f8d6be692d0a3fe9ae44df561e2cf4cb564c1425d157c45bd7084728`.
- The Railway live handshake passed with MCP version 0.4.20, 8,524 Material assets, all required tools, zero synthetic tool calls, and a healthy closed resilience circuit.
- Migration `20260722230000_admin_quality_controlled_traffic_correction.sql` is recorded in linked migration history and corrected 3,041 high-confidence validation rows without deleting history. A post-migration read-only database aggregate confirms that these rows include 628 recommendation errors that no longer count as unclassified live behavior.
- A fresh seven-day production aggregate contains 879 unclassified hosted direct searches: 770 successes, 108 zero results, and one error. It also contains 267 unclassified recommendations across hosted and local MCP: 260 successes, five zero results, and two errors. Exact lookup contains 572 attempts: 541 found, 26 not found, and five errors.
- A repeatable post-migration replay over the complete earlier 11,014-event snapshot corrected the 2,942 matching rows that existed at that snapshot's cutoff. The version 2 scorecard then reported no suspected unlabelled controlled workloads, no data-quality blockers, and `trustworthy_for_operational_counts: true`. It does not claim recommendation relevance, multilingual parity, or organic usage.
- The broad live detail path was too slow before this release and exceeded 180 seconds in a direct check. Against the same production data source, the bounded snapshot implementation generated the first page in 1.881 seconds and returned the complete 111-page, 11,014-event export in another 1.638 seconds from that snapshot.
- The current rotated production secret was not read by this release session. The production browser credential path therefore remains an owner-operated smoke check. Local login, session, endpoint, browser, CSV, JSON, snapshot, and rejection checks passed, and the dashboard prompt accepts the current value without saving it in browser storage or source code.

## Operating follow-up

- Run `npm run analyze:admin-search-quality -- --input <events-json>` after each seven-day Events JSON export and before making product-quality claims.
- Treat the direct-search zero rate, recommendation error rate, exact lookup not-found rate, p95 latency, suspicious workload detector, and field coverage as separate measures. Do not combine them into an unsupported quality score.
- Review explicit locale coverage and returned-icon relevance before claiming multilingual parity. The proposed review trigger remains 100 top-level attempts per locale plus relevance judgments.
- The local MCP telemetry disable and controlled-run fixes are source-complete and verified. They will reach public package users only in a separately authorized npm release. This release does not change npm tags.

Machine-readable rollout evidence is recorded in `references/verification/admin-search-quality-post-migration-2026-07-22.json`.
