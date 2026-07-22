# Admin search quality release, 2026-07-22

## Decision

GO for a bounded internal rollout.

The implementation meets the required acceptance criteria for accurate exact-lookup outcomes, useful event exports, privacy-safe identity grouping, complete-export enforcement, future telemetry, scorecard definitions, and local admin authentication. Browser, API, MCP integration, static, and production build checks pass.

## Release units

1. Supabase `admin-api`: adds the event-detail endpoint, correct lookup outcome aggregation, privacy-safe root request linking, complete-export metadata, and constant-time secret comparison.
2. Railway hosted MCP: records future returned icon references, build and execution metadata, traffic class, privacy-safe root request hash, and structured `icon_not_found` errors.
3. Local admin dashboard: adds summary and event CSV and JSON exports, clear metric definitions, stronger CSV safety, and an opaque local session cookie.

No database migration is required. Existing JSON metadata remains backward compatible.

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

## Residual risk

- Old rows remain incomplete where the original telemetry omitted a field.
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
- There is no data rollback because this release does not change the database schema or rewrite stored rows.

## Worst credible failure in the first 24 hours

An event-detail request could be slow for a broad period or return an incomplete selection. The API limits each source, the browser paginates, and exports fail closed when completeness cannot be proven. Operators can immediately choose a shorter period while the previous API source is redeployed if needed.

## Rollout result

- Supabase `admin-api` advanced from version 85 to version 86. Its status is active, JWT verification remains disabled by design, and an unauthenticated event request returns 403.
- Railway deployment `ee02bdca-96b6-46f2-9637-7636a2271f33` completed successfully with image digest `sha256:66359ee5f8d6be692d0a3fe9ae44df561e2cf4cb564c1425d157c45bd7084728`.
- The Railway live handshake passed with MCP version 0.4.20, 8,524 Material assets, all required tools, zero synthetic tool calls, and a healthy closed resilience circuit.
- Authenticated event export and the live seven-day scorecard remain pending because the Windows `ADMIN_SECRET` available to this process is stale after the owner's Supabase rotation. The dashboard's new prompt accepts the current value without saving it in browser storage or source code.
