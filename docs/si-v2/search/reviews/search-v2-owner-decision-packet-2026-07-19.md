# Search v2 owner decision packet

Date: 2026-07-19

Purpose: one document consolidating the session's completed work, the decisions only the owner can make, and the review instructions for the independent reviewing agent. The owner records decisions by quoting the decision IDs below with accept, reject, or modify.

## Part 1: Decisions for the owner

### DP-1: Ratify the hosted allowance thresholds as recorded policy

Proposed policy, supported by three independent measurements (two in-session, one by the reviewing agent, all producing the same values):

- Anonymous keyless: 300 hosted logical searches per client per UTC day.
- Registered free, including pack-only purchasers: 1,500 per account per UTC day.
- Pro (active subscription): 5,000 per account per UTC day under fair use.
- All tiers: 120 requests per minute burst, unchanged.
- Local npm search: unlimited and keyless, permanently.
- Enforcement stays OFF until every recorded precondition passes: free-key issuance, account-level aggregation, atomic or race-safe counting, trusted forwarded identity, both ingresses, route coverage, unit alignment, fresh-window revalidation, and rollback controls.

Basis: measured p99 198 (194 on the reviewer's later snapshot), p99.9 879, maximum 1,078; 8 of 1,382 client-days exceeded 300; none exceeded 1,500. Evidence: `docs/si-v2/search/experiments/hosted-allowance-measurement-2026-07-19.md`, reproducible via `scripts/measure-hosted-allowance-distribution.mjs`.

Recommendation: accept.

### DP-2: Replace the organic beta gate with the controlled-evidence gate

The recorded gate requires 200 organic eligible attempts across 3 green days. Actual organic beta adoption is one client (the owner), because the public docs still discourage adoption and the current public version is weak. Proposed replacement:

- 200 correctly labeled controlled attempts across three days (labeling requires the 0.4.19-beta.2 publish).
- At least 50 manually reviewed distinct query and mode combinations.
- The full 225-case deterministic suite green.
- Error rate at or below 1 percent; local p95 below 500 ms; no canary violations; verified venue rollback.
- Organic adoption becomes a reported post-release metric, not a promotion prerequisite.
- Interim rule: quality-only passes with `--allow-unlabeled` are permitted for defect hunting; their events are never counted as evidence.

Recommendation: accept. The Railway local-first release then supplies real organic user evidence automatically for later venue promotions, since roughly 416 distinct clients per week already use the hosted URL.

### DP-3: Public fair-use copy timing

The drafted 12-locale fair-use docs section (with the numeric limits) was removed from the maintained sources per reviewer recommendation and is preserved at commit `eb5d6878c`. Two defensible options:

- Option A, hold: publish the numbers only when enforcement and free keys are live. Lowest risk of overpromising; currently implemented.
- Option B, publish early: restore the section with explicit "fair-use policy, not yet enforced" framing. More transparent; sets expectations before metering exists; honest under `D-028` because the copy promises nothing unavailable.

Recommendation: Option A, with Option B acknowledged as legitimate if the owner prefers early transparency. Either way the keyless-truth release ships without the numbers.

### DP-4: Freeze the docs packet content

The keyless docs packet content has been reopened three times by successive copy refinements while the harmful false key claim stayed live on production. Proposed standing rule: the packet is content-frozen at branch commit `4933f4bc3`. Any future wording preference that is not a false statement rides the next web release; only a demonstrated falsehood may reopen a sealed packet.

Recommendation: accept, and apply the same rule to future releases.

### DP-5: Approve the release execution chain

1. Executor rebuilds and rebinds the packet from branch `codex/mcp-docs-accuracy-20260718` at `4933f4bc3` (four content commits past the retired manifest).
2. Independent reviewer GO on the rebuilt manifest.
3. Owner manual smoke on the exact rebuilt bytes (changed spots: OpenCode tab location, Claude CLI scope commands).
4. Owner runs the single guarded Netlify deploy.
5. Separately: build 0.4.19-beta.2 from an exact tarball (contents: controlled-run labeling, 429 details pass-through in the MCP layer and hosted client), verify labeling and error propagation against that tarball including an end-to-end allowance-exhaustion case, publish with owner approval.
6. Run the controlled validation window with labeled events.
7. Railway local-first canary for `search_icons`; `recommend_icons`, web, and npm `latest` remain separate promotion decisions with rollback retained.

Recommendation: accept. Steps 1 and 2 can start immediately after DP-4.

### DP-6: The two swept-in review files

An overly broad staging command committed two previously untracked July 18 review documents (`mcp-free-access-api-key-decision-brief-2026-07-18.md`, `mcp-free-access-independent-critique-2026-07-18.md`). They read as legitimate project records.

Recommendation: keep them in history. Say the word to revert them instead.

### DP-7: Country visibility for hosted traffic (optional, low priority)

Country is recorded only on the Railway path. Direct npm-to-gateway traffic (448 distinct clients in the last 7 days) has no country. Adding coarse server-side country at the Supabase gateway is cheap; it extends the already-disclosed hosted geo behavior. Truly local searches stay location-free by design.

Recommendation: accept for the hosted gateway leg only, in a future gateway release, with the telemetry disclosure updated in the same release. Decline if any new geo capture feels off-brand.

## Part 2: Work inventory for the reviewing agent

All work is on main (through `8123896ab`) and branch `codex/mcp-docs-accuracy-20260718` (through `4933f4bc3`). Audit trail documents: `search-v2-session-work-audit-request-2026-07-19.md` (first round) plus this packet.

### Commits in review scope

| commit | where | content |
| --- | --- | --- |
| `60d191805` | main | Merge of the audited docs-accuracy branch |
| `eb5d6878c` | main | Measurement artifact, dormant tier enforcement, drafted 12-locale fair-use docs |
| `f34ef91f9` | main | Grain definitions, exceedance counts, tool segmentation |
| `dd0098a51` | main | Founder validation runner |
| `d46dc7110`, `737cb4aa6`, `12f17fb55`, `4933f4bc3` | branch, merged | OpenCode location (three iterations, final form), scope-explicit Claude CLI commands |
| `8202809be` | main | First audit-request document |
| `e0575d04a` | main | Round-2 corrections: recommendation-pipeline allowance, 429 details and Retry-After, docs gate repair, artifact grain fixes, reproducible measurement script, runner honesty |
| `4f5f68bc1` | main | Round-2 residuals: defensive flag read, request-cost fanout, MCP details pass-through, unclamped daily retry, cohort labeling support, public numbers removed, behavioral test |
| `8123896ab` | main | Round-3 gaps: superseded gate-a, injectable allowance enforcer with route-level test, HTTP-level 429 test, fail-closed runner |

### Current verification state (all reproduced in-session on 2026-07-19)

- `verify:search-v2-shared-recommendation-pipeline`: green, including 4-unit fanout reservation and HTTP-level 429 assertions.
- `verify:search-v2-daily-allowance`: green (default-off, tiers, request cost, 429 shape, fail-open, reset math).
- `verify:search-v2-beta-gate-a`: reports superseded and exits cleanly.
- `verify:localized-docs-bodies`, `verify:i18n-catalogs`: green on main and branch.
- `deno check` and `node --check` clean on every touched file.
- Enforcement flag confirmed off by default; no deployment, registry, database, or live-site change occurred in any of this work.

### Review asks

1. Independently reproduce the verification battery above.
2. Rebuild and rebind the docs packet at `4933f4bc3`; provide the independent GO (the in-session verification runs do not count as the second reviewer).
3. Confirm the beta.2 content list is complete before the tarball build: labeling (`mcp/release-channel.js`), 429 details (`mcp/index.js`, `mcp/hosted-search-client.js`), version bump, changelog.
4. Linguistic review of the 12-locale corrected docs remains outstanding from the first audit request.
5. Flag any disagreement with the recommendations in Part 1 directly to the owner; the owner decides.

## Part 3: Standing context

- Live production still carries the false "API key required" claim until DP-5 step 4 executes. This remains the highest-priority user-facing fix.
- Beta window standing: 30 unlabeled events exist; under DP-2 they are excluded from controlled evidence and the window restarts with beta.2.
- Known quality backlog seeds: fuzzy brand queries return zero ("ai browser company", "agent startup", "code editor with ai"); "user profile" ranks account-balance icons first; hosted `recommend_icons` latency (p50 42 s) is the worst measured number in the system and is not addressed by Railway local-first.
