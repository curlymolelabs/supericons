# Local npm channel attribution specification

Date: 2026-07-27

Status: Proposed for implementation, owner handover ready

Scope: local npm MCP telemetry only. No change to search behavior, results, ranking, tool schemas, hosted MCP, web, or the ChatGPT app.

Purpose: answer three questions about the local npm channel that the product currently cannot answer: how many real installations exist, where they are in the world at country resolution, and which MCP clients they run. Identity of individual people is explicitly out of scope and remains the job of the account and free-key path.

## 1. Verified current state

| Fact | Evidence |
| --- | --- |
| Local telemetry records no country and no network identifier | Read-only production query, 30 days: local rows carry zero `ip_hash` and zero `anonymous_client_hash` |
| Local telemetry cannot count installations | `session_hash` is a per-process, per-day random value; 3,627 events produced 2,024 session hashes with no stable identity |
| Client family is a constant, not a client | All local rows report `mcp_stdio`; the real client name arrives in the MCP `initialize` handshake and is discarded |
| Stable-version search outcomes are silently dropped | `si_log_mcp_search_outcome_v2` in `supabase/migrations/20260718100000_local_mcp_telemetry_attribution.sql` returns null when `tool_name = 'search_icons'` and `beta_cohort` is null |
| Consequence of that drop | 30-day local events by version: `0.4.19-beta.2` 3,153, `0.4.19-beta.1` 319, `0.4.22` 119, `0.4.20` 25, `0.4.19` 11. Stable-version presence is an artifact of the suppression, not of adoption |
| External adoption exists and is growing | npm reports 2,514 downloads in 30 days across 27 of 30 days, trending upward |
| Hosted already derives country | Hosted MCP rows carry `country_code` with `geo_source = railway_geoip`; the shared search-engine code already reads `cf-ipcountry`, `x-vercel-ip-country`, and `x-country-code` in `supabase/functions/_shared/search-engine/rate-limit.ts` |

## 2. Hard privacy boundaries

These are requirements, not preferences. A change that violates any of them is a release defect.

1. The installation identifier is a random value generated on first run. It must never be derived from hostname, username, MAC address, machine ID, hardware serial, directory path, or any other machine or person attribute.
2. Geography is stored at country resolution only. Raw IP addresses, city, region, and coordinates are never stored for the local channel.
3. No query text, file path, project name, repository name, or environment variable value beyond the fields listed in section 6 may be added.
4. All three existing opt-outs continue to disable the entire telemetry path: `SUPERICONS_DISABLE_TELEMETRY`, `SUPERICONS_TELEMETRY` set to an off value, and `DO_NOT_TRACK`.
5. Telemetry remains best-effort and non-blocking. A telemetry failure never fails a search.
6. The public disclosure ships in the same release as the change that adds a field, never afterwards.
7. Reports and exports outside the protected admin surface use aggregate counts only. Per-installation rows never leave the protected server side under `VC-3`.

## 3. Phase 0: stop dropping stable local outcomes

This is a prerequisite. Every later phase measures nothing useful until it lands.

1. Remove the suppression branch so a stable local `search_icons` outcome is recorded with the same fields as a beta outcome.
2. Preserve the original intent of the branch: a local search that falls back to hosted search must not produce a duplicate top-level count. Record the tool-level local outcome and mark the hosted fallback leg as a diagnostic child, consistent with the final-outcome telemetry contract.
3. Add a regression fixture proving one stable local `search_icons` call produces exactly one local final outcome, and that a fallback case produces one final outcome plus one linked diagnostic.

Exit gate: a clean install of the current stable package performs one search and one recommendation, and both appear in the local channel with correct classification.

## 4. Phase 1: country, with no package change

Deliver geography for every existing installation, including old versions, without an npm release.

1. Confirm whether request headers reach the RPC. The telemetry call is a PostgREST RPC, so the executor must verify whether `current_setting('request.headers', true)` exposes `cf-ipcountry` or `x-forwarded-for` in this project.
2. If a trusted country header is available: derive a two-letter country code inside the function, validate it against the same normalization rules the shared search-engine code already uses, store it in `country_code`, and set `geo_source` to a value that distinguishes it from Railway geo, for example `edge_header`. Store nothing else derived from the network.
3. If no trusted header is available: add a minimal geo-aware ingestion endpoint, keep the current RPC working unchanged, and point only the next package cut at the new endpoint. Do not break older installations.
4. Country is nullable by design. Absent country is recorded as unknown and never guessed.

Exit gate: new local rows carry a country code, no raw IP is stored anywhere in the local path, and rows from clients behind privacy networks are recorded as unknown rather than dropped.

## 5. Phase 2: installation identity and client identity, next package cut

Three additive fields, all pseudonymous.

1. **Installation identifier.** On first run the package generates a random UUID version 4 and stores it in the user configuration directory, for example `<config>/supericons/install.json`. If the file is missing or unreadable, generate a new one and continue. The value is sent with every telemetry event. Deleting the file is a supported reset, and the disclosure says so.
2. **MCP client identity.** Capture `clientInfo.name` and `clientInfo.version` from the MCP `initialize` request, normalize to a bounded token, and send them as the client family and client version. Unknown or missing values record as `unknown`, never as a guess.
3. **Runtime context.** Send the operating system platform token (`win32`, `darwin`, `linux`) and the already-present package version.

Rules: fields are optional and additive so older server code accepts new clients and new server code accepts old clients. Nothing in this phase changes tool schemas, search results, or response shapes.

Exit gate: two clean installs on the same machine produce two distinct installation identifiers; the same install across restarts produces one stable identifier; a supported client reports its real name; and every opt-out suppresses all of it.

## 6. Field specification

| Field | Source | Type and bound | Nullable | Notes |
| --- | --- | --- | --- | --- |
| `install_id` | Package, random UUID v4 | 36-character UUID | Yes | Random only; never machine-derived; user-resettable by deleting the file |
| `client_family` | MCP `initialize` clientInfo.name | Lowercase token, max 64 | Yes | Replaces the current constant `mcp_stdio`; unknown values record as `unknown` |
| `client_version` | MCP `initialize` clientInfo.version | Max 40 characters | Yes | Free-form version string, truncated |
| `os_platform` | Node `process.platform` | Enum: `win32`, `darwin`, `linux`, `other` | Yes | Coarse platform only |
| `country_code` | Trusted edge header at ingestion | Two-letter ISO code | Yes | Country only; never city, region, or coordinates |
| `geo_source` | Ingestion path | Token, for example `edge_header` | Yes | Distinguishes local geo from `railway_geoip` |
| `mcp_server_version` | Package version | Existing field | No | Already present |

No other new fields are authorized by this specification.

## 7. Phase 3: disclosure and governance, shipped with each phase

1. Update the public telemetry disclosure on the docs site, the package README, and the privacy page. English copy is drafted in section 10; the eleven maintained locales follow the normal catalog process.
2. Record a decision entry amending the telemetry contract in `FR-44` and `D-028`, stating exactly which fields the local package now sends and why.
3. Add an opt-out verification test to the release gates covering all three environment flags on the exact candidate bytes.
4. Update the implementation status ledger only after released surfaces prove the behavior.

## 8. Phase 4: reporting

1. Add a local channel view: installations seen, new installations, returning installations, countries, client families, and package versions.
2. Report a coverage estimate that compares npm downloads to observed installations. The gap is the combined effect of opt-outs, blocked networks, and mirrors. Publish it as a floor, never as a census.
3. Keep per-installation rows inside the protected admin surface. Public or shared material uses aggregates only.

## 9. Acceptance tests

1. A clean stable install performs one search: exactly one local final outcome is recorded with install identifier, client family, platform, and country when available.
2. A stable local search that falls back to hosted search records one final outcome plus one linked diagnostic, never two countable searches.
3. Restarting the same installation ten times produces one stable install identifier.
4. Two installations on the same machine produce two identifiers.
5. Deleting the identifier file produces a new identifier and no error.
6. A read-only or unwritable configuration directory produces no crash and no failed search.
7. Each of the three opt-out flags independently suppresses every telemetry event, including the new fields.
8. Raw IP addresses appear nowhere in the local telemetry path, verified by inspecting stored rows and function source.
9. A client that sends no `clientInfo` records `unknown`, not a fabricated family.
10. Old package versions continue to write successfully against the updated server code.
11. New package versions continue to write successfully if the server rejects unknown fields, degrading to the previous field set.
12. Admin export of local channel data contains no install identifier when the export is marked shareable.

## 10. Draft public disclosure copy

> **What the Supericons MCP package records**
>
> The package records anonymous usage so we can improve icon search. Each event includes the search term, the number of results, the tool used, your package version, the MCP client you are using, your operating system platform, a random installation identifier, and a country code derived from your network connection. We do not record your IP address, your name, your files, your project, or anything about your code.
>
> The installation identifier is a random value stored on your machine. It is not derived from your computer, your account, or your network. Deleting `<config>/supericons/install.json` resets it.
>
> To turn all of this off, set any one of these environment variables: `SUPERICONS_DISABLE_TELEMETRY=1`, `SUPERICONS_TELEMETRY=off`, or `DO_NOT_TRACK=1`. Search works exactly the same with telemetry disabled, and it is never sent for searches that run entirely on your machine without a network call.

Public wording must not overstate completeness. Reports describe local measurement as best-effort with opt-out gaps.

## 11. Risks

| Risk | Response |
| --- | --- |
| A future change derives the installation identifier from machine attributes | Section 2 rule 1 is a release gate item; the acceptance test asserts randomness across installs on one machine |
| Country header is spoofable by a hostile client | Country is analytics-grade only; it must never gate access, allowances, or pricing |
| Disclosure lags the code | Phase 3 requires disclosure in the same release; a missing disclosure blocks the gate |
| Install counts are mistaken for user counts | Reporting labels installations, not users, and publishes the npm-versus-observed coverage gap |
| Scope creep into fingerprinting | Section 6 is exhaustive; new fields require a new decision entry |
| Local telemetry becomes a dependency of search | Telemetry stays best-effort, non-blocking, and failure-isolated |

## 12. Out of scope

Individual user identity, account linkage, project or repository names, file paths, IP storage, city-level geography, hardware fingerprints, and any change to search behavior, ranking, tool schemas, or hosted and web surfaces.
