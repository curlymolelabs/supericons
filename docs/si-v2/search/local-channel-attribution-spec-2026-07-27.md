# Local npm channel attribution specification

Date: 2026-07-27 (revision 3, implementation blockers resolved)

Status: Proposed for implementation, owner handover ready

Scope: local npm MCP telemetry only. No change to search behavior, results, ranking, tool schemas, hosted MCP, web, or the ChatGPT app.

Purpose: answer three questions the local npm channel cannot currently answer: how many observed installations exist, where they are at country resolution, and which MCP clients they run. Individual user identity is explicitly out of scope and remains the job of the account and free-key path.

## 1. Verified current state

| Fact | Evidence | Status |
| --- | --- | --- |
| Stable search outcomes were previously dropped when no beta cohort was present | Early-return branch in `supabase/migrations/20260718100000_local_mcp_telemetry_attribution.sql` | **Already fixed.** Migration `20260724100000_enable_stable_local_mcp_final_outcomes.sql` removes the branch and is deployed: production shows stable `0.4.22` local `search_icons` events with no cohort recorded on 2026-07-27 |
| Local telemetry records no country and no network identifier | 30-day production read: local rows carry zero `ip_hash`, zero `anonymous_client_hash`, zero `country_code` | Open |
| Local telemetry cannot count installations | `session_hash` is a per-process, per-day random value; identity resets on every spawn | Open |
| Client family is a constant | All local rows report `mcp_stdio`; the real client name arrives in the MCP `initialize` handshake and is discarded. The SDK exposes it through `getClientVersion()` | Open |
| Four opt-out controls exist, not three | `mcp/telemetry.js`: `SUPERICONS_DISABLE_TELEMETRY`, `SUPERICONS_TELEMETRY`, `DO_NOT_TRACK`, and `SUPERICONS_MCP_TELEMETRY_ENABLED` | Must all be preserved and disclosed |
| External adoption exists and is growing | npm reports 2,514 downloads in 30 days across 27 of 30 days | Context |
| Hosted already derives country | Hosted rows carry `country_code` with `geo_source = railway_geoip`; shared code reads `cf-ipcountry` in `supabase/functions/_shared/search-engine/rate-limit.ts` | Precedent |

Because the suppression fix is already live, the first task is to **verify its behavior in production over 24 hours**, not to reimplement it.

## 2. Hard privacy boundaries

Requirements, not preferences. A change violating any of these is a release defect.

1. The installation identifier is a random value generated on first run. It must never be derived from hostname, username, MAC address, machine ID, hardware serial, directory path, or any other machine or person attribute.
2. **The raw installation UUID is never stored server-side.** The server converts it to a keyed hash at ingestion and stores only `install_hash`.
3. Geography is stored at country resolution only. Raw IP addresses, forwarded-address headers, city, region, and coordinates are never stored for the local channel.
4. No query text beyond the already-recorded normalized query, and no file path, project name, repository name, or environment value, may be added.
5. All **four** opt-out controls continue to disable the entire telemetry path.
6. Telemetry remains best-effort and non-blocking. A telemetry failure never fails or delays a search.
7. The public notice ships in the same release as the change that adds a field.
8. Reports and exports outside the protected admin surface use aggregate counts only, with small cells suppressed. `install_hash` never appears in logs, error messages, or shareable exports.
9. The raw installation UUID never appears in application logs, proxy logs, request traces, error messages, stored request bodies, or database rows.

## 3. Identity definitions

- **Observed installation**: one persistent Supericons configuration directory. Two MCP clients sharing an operating-system account share one installation. Two independent configuration directories are two installations.
- **Installation hash**: `HMAC(server_key_v<n>, install_uuid)`, computed at ingestion, stored with its key version. The raw UUID is discarded after hashing.
- **Key lifecycle**: the keying secret lives server-side only, never in the package. It is stable by default and versioned. If it is ever rotated, retention continuity breaks by design, and reports must show a marked discontinuity rather than a phantom drop in returning installations.
- Installation counts are never described as user counts.

## 4. Phase A: verify the deployed suppression fix

1. Confirm migration `20260724100000` is the live function definition in production.
2. Observe 24 hours of stable local `search_icons` events and check volume, outcome distribution, and version mix against expectation.
3. Add a regression fixture proving one stable local search produces exactly one local outcome.
4. Do not claim exact linked final-and-diagnostic outcomes at this stage. Published packages do not yet send episode or attempt identities, so linkage remains approximate until Phase C ships. Record that limitation beside any report built from this window.

Exit gate: 24 hours of observed stable local events with a written note stating what linkage is and is not available.

## 5. Phase B: country, preflight before promise

Treat this as an experiment, not a committed deliverable.

1. **Preflight.** Inspect what `current_setting('request.headers', true)` actually exposes to the RPC in this project, and determine whether any country value is set by trusted infrastructure rather than by the caller.
2. If a trusted infrastructure-set country header is proven: derive and store a validated two-letter code and a `geo_source` value distinguishing it from Railway geo. Store nothing else derived from the network.
3. If it is not proven: do not store a client-supplied value. Defer country to a geo-aware ingestion endpoint used by the next package release, keeping the existing RPC working for older installations.
4. Country is nullable. Absent country records as unknown and is never inferred.
5. Country is analytics-grade only. It must never gate access, allowances, pricing, or features.

Exit gate: either a trusted country lands in new rows with no raw address stored anywhere, or the preflight is recorded as failed and country moves to Phase C.

## 6. Phase C: installation and client identity, next package cut

1. **Installation UUID.** Random UUID version 4, generated on first run, stored at `<config>/supericons/install.json`. Creation must be atomic. Concurrent processes attempt exclusive creation, then read back and use the value that won. If the file is missing, unreadable, or cannot be persisted, search continues but no installation UUID is sent. Telemetry uses `v2` without installation identity, and a later run may try creation again. Deleting the file is a supported reset.
2. **MCP client identity.** Capture `clientInfo.name` and `clientInfo.version` from the `initialize` handshake through the SDK accessor; normalize to bounded tokens. Missing values record as `unknown`, never as a guess.
3. **Runtime context.** Operating-system platform token only.
4. **Episode identity.** Send `episode_id`, `attempt_id`, and `recovery_chain_id` as required by `FR-54`, closing the Phase A limitation.

## 7. Transport compatibility

Adding parameters to the existing RPC is **not** backward compatible: PostgREST resolves functions by signature, so a new package calling the old function with new parameters fails.

Required design:

1. Keep `si_log_mcp_search_outcome_v2` unchanged for published packages.
2. Add a `v3` RPC or ingestion endpoint accepting the new fields.
3. New packages attempt `v3` and fall back to `v2` only after a definitive function-not-found or incompatible-signature response. The fallback path drops only the new fields.
4. A timeout, lost response, connection failure, rate limit, or `5xx` response must not trigger a `v2` retry because `v3` may already have committed the event. These failures are swallowed.
5. The `v3` final-outcome write is idempotent by `episode_id`. Retrying the same final outcome returns the existing result instead of creating a second row. This uniqueness applies to the final-outcome record only. Diagnostic events may share an episode and remain distinguished by `attempt_id` and event type.
6. Every failure mode remains non-blocking: telemetry never affects search.

## 8. Field specification

| Field | Source | Storage | Nullable | Notes |
| --- | --- | --- | --- | --- |
| `install_hash` | Server-side keyed hash of the package UUID | Stored | Yes | Raw UUID never stored; key version stored alongside |
| `install_key_version` | Server | Stored | Yes | Present only when `install_hash` is present; enables honest discontinuity reporting on rotation |
| `client_family` | `initialize` clientInfo.name | Stored, max 64 | Yes | Replaces the constant `mcp_stdio`; unknown stays `unknown` |
| `client_version` | `initialize` clientInfo.version | Stored, max 40 | Yes | Truncated |
| `os_platform` | `process.platform` | Stored enum | Yes | `win32`, `darwin`, `linux`, `other` |
| `country_code` | Trusted infrastructure header | Stored, ISO two-letter | Yes | Only if Phase B preflight succeeds |
| `geo_source` | Ingestion path | Stored token | Yes | Distinguishes from `railway_geoip` |
| `episode_id`, `attempt_id`, `recovery_chain_id` | Package | Stored | Yes | Phase C; implements `FR-54` and enables exact linkage |

No other new fields are authorized by this specification. Additions require a new decision entry.

Database constraint: `install_hash` and `install_key_version` must either both be present or both be absent.

## 9. Retention and linkage

1. Raw local events carrying `install_hash` are retained for 90 days, then deleted or reduced to aggregates without installation identity.
2. Aggregate counts may be retained indefinitely because they carry no installation identity.
3. `install_hash` is never automatically linked to an account, API key, or any future identity. Any such linkage requires a separate owner decision and its own notice.
4. A user deleting `install.json` receives a new identity; the specification does not support retroactive deletion of prior pseudonymous rows, and the notice says so plainly.
5. This 90-day rule is specific to local-channel installation attribution. It does not establish or change the retention policy for other telemetry classes.

## 10. Notice, not promise

Owner decision of 2026-07-27: **trust posture and public commitments remain parked; a factual notice of what is collected and how to disable it ships.** A notice states what the code does and is therefore always provable; a promise is a claim and stays parked.

Conflict to resolve before Phase C publishes: `docs/supericons-agent-briefing-2026-07-25.md` currently states the telemetry opt-out is not to be announced. That line must be synchronized with this decision, or Phase C does not ship.

### Draft notice copy

> **What the Supericons MCP package records**
>
> The package records pseudonymous usage so we can improve icon search. Each event includes the search term, the number of results, the tool used, your package version, the MCP client you are using, your operating system platform, a pseudonymous installation identifier, and a country code derived from your network connection when available. Supericons telemetry records do not store your raw IP address, your name, your files, your project, or anything about your code.
>
> The installation identifier is a random value stored on your machine. It is not derived from your computer, your account, or your network, and the raw value is not stored by Supericons. Deleting `<config>/supericons/install.json` changes the identifier used for future events. Earlier pseudonymous records remain for up to 90 days.
>
> Icon search keeps working when telemetry is disabled. Telemetry is sent separately, on a best-effort basis, and never blocks or changes your search results.
>
> To turn it off, set any one of: `SUPERICONS_DISABLE_TELEMETRY=1`, `SUPERICONS_TELEMETRY=off`, `SUPERICONS_MCP_TELEMETRY_ENABLED=off`, or `DO_NOT_TRACK=1`.

Reports describe local measurement as best-effort with opt-out gaps, never as complete.

## 11. Acceptance tests

1. A stable install performs one search: exactly one local outcome recorded with the expected fields.
2. Restarting one installation ten times yields one stable `install_hash`.
3. Two independent configuration directories yield two distinct hashes.
4. Deleting `install.json` yields a new hash and no error.
5. An unwritable configuration directory produces no crash and no failed search.
6. Two processes starting against one empty configuration directory use the same winning persisted UUID. If persistence fails, neither process sends an installation UUID.
7. Each of the **four** opt-out controls independently suppresses every event.
8. No raw IP, forwarded-address header, or raw installation UUID appears in stored rows, function source, application logs, proxy logs, request traces, or error messages.
9. A client sending no `clientInfo` records `unknown`.
10. Old packages continue writing successfully against `v2` after `v3` exists.
11. New packages fall back to `v2` only when `v3` is definitively missing or incompatible, dropping only new fields.
12. A lost `v3` response, timeout, connection failure, rate limit, or `5xx` response produces no `v2` retry and no duplicate final outcome.
13. Repeating one `v3` final-outcome write with the same `episode_id` leaves exactly one final outcome.
14. Telemetry endpoint failure or timeout leaves search results and latency unchanged.
15. Shareable exports contain no `install_hash` and suppress small country and client cells.
16. Rows older than the retention window are removed or aggregated on schedule.
17. Legacy rows and `v2` writes store both `install_hash` and `install_key_version` as null. Attributed `v3` writes store both as non-null.

## 12. Migration and rollback

1. The Supabase change is an exact, named migration with a preflight for the expected current function and schema definitions.
2. Apply only the named migration. A general `supabase db push` is forbidden for this release because linked migration history is not the release boundary.
3. The migration includes an exact rollback that restores the prior RPC definition and removes only objects created by this migration.
4. Apply and rollback are tested on a disposable database before production.
5. The release evidence records the migration hash, expected prior definition, applied definition, and rollback verification.
6. The npm package has its own rollback target and does not depend on rolling back Supabase first.

## 13. Reporting

Local channel view: observed installations, new and returning installations, countries, client families, package versions. npm downloads may be displayed **beside** observed installations as context only. Their difference must never be presented as an opt-out rate, because npm downloads include CI runs, caches, mirrors, and repeated installs.

## 14. Out of scope

Individual identity, account linkage, project or repository names, file paths, IP storage, city-level geography, hardware fingerprints, and any change to search behavior, ranking, tool schemas, hosted surfaces, or web.
