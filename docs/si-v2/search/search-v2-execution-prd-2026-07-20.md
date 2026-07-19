# Search v2 execution PRD

Date: 2026-07-20

Status: controlling execution plan, subordinate to [`search-engine-v2.md`](search-engine-v2.md) and the decision record in [`decisions.md`](decisions.md). Supersedes the open items of [`search-v2-completion-prd-2026-07-18.md`](search-v2-completion-prd-2026-07-18.md) where they conflict; that document remains authoritative for requirement IDs (`CP-01` through `CP-10`).

Roles: the executor implements and self-verifies; the deep auditor independently reproduces claims, traces every claimed probe to its call site, and issues GO or NO-GO on release packets; a separate high-level advisor reviews direction and counters where warranted. The owner decides. Evidence rules apply throughout: no completion claim without the proof basis in the same report, and no unexplained fingerprint change.

## 1. Adopted decisions

Owner direction of 2026-07-20 adopts the recommended positions from the decision packet (`search-v2-owner-decision-packet-2026-07-19.md`). Record each as a decision entry when work touches it:

| id | decision |
| --- | --- |
| A-1 | Hosted allowance thresholds ratified as policy and recorded as `D-030`: anonymous 300 hosted logical searches per client per UTC day; registered free including pack-only purchasers 1,500 per account per UTC day; Pro 5,000 per account per UTC day; 120 per minute burst unchanged; local npm search unlimited and keyless. Registered and Pro allowances aggregate per account so multiple clients or keys cannot multiply them. Enforcement stays OFF until every precondition in the measurement artifact passes. |
| A-2 | The 200-organic beta gate is replaced by the controlled-evidence gate (section 6). Organic adoption becomes a reported post-release metric, never a promotion prerequisite. |
| A-3 | Public numeric limits stay out of the maintained docs sources until enforcement and free-key issuance are live. The drafted 12-locale copy is preserved at commit `eb5d6878c`. |
| A-4 | Release packet content freeze rule: once a packet has no open falsehood findings, wording preferences ride the next release. The keyless docs packet is frozen at branch commit `4933f4bc3`. |
| A-5 | The two July 18 review files committed by the earlier broad staging remain in history. |
| A-6 | Coarse server-side country for the hosted gateway leg is approved as a low-priority future gateway release with its telemetry disclosure updated in the same release. Local telemetry stays location-free. |
| A-7 | `recommend_icons` is removed from the completion critical path. Rationale: agent orchestration over plain search already delivers the recommendation outcome (observed in real sessions), and its expansion quality is strong. Two known defects remain: hosted latency (p50 42 s) and the clarification contract violation found in the 14-case verification (ambiguous low-confidence slots resolve without asking, contrary to the tool contract). The clarification alignment ships in beta.2; latency and full promotion are revisited after Railway local-first ships. |
| A-8 | Beta.2 is the agent-experience release: it carries the one-call contract package shell (section 5) in addition to controlled-run labeling and 429 details propagation. |

## 2. Verified current state (as of 2026-07-20)

- Repository: `C:\backup\Personal\...\DailySprint\supericons`, main at `hosted-zero-cluster-mining` commit series; release branch `codex/mcp-docs-accuracy-20260718` frozen at `4933f4bc3`; worktree `..\supericons-mcp-docs-accuracy` repaired and clean.
- Live defect: supericons.dev still serves the false claim that an API key is required for MCP. Highest-priority user-facing fix; ships via workstream 1.
- npm: `latest` 0.4.17, `beta` 0.4.19-beta.1. Railway serves 0.4.18. The local beta is verified deterministic (identical 72-query outcomes across independent environments) with local search latency 30 to 76 ms after a one-time cold start near 500 ms.
- Dormant enforcement wiring, behavioral tests, and the reproducible measurement script are on main (`e0575d04a`, `4f5f68bc1`, `8123896ab`). All verification gates green; `verify:search-v2-beta-gate-a` is intentionally superseded.
- Quality evidence: `founder-quality-pass-2026-07-19.md` (three addenda), `hosted-zero-cluster-mining-2026-07-20.md`, and the independent 14-case beta.1 verification of 2026-07-20 (7 pass, 2 partial, 5 fail; local-only evidence at `references/verification/search-v2-local-npm-beta-manual-2026-07-20.md`, which is git-ignored by convention). Its no-go verdict for replacing default surfaces with beta.1 is consistent with this plan: beta.1 was never the promotion candidate. Design basis for the package shell: `one-call-contract-2026-07-19.md`.
- Beta window: 30 unlabeled events exist; under A-2 they are quality evidence only. Labeled counting starts with beta.2.

## 3. Workstream 1: ship the keyless docs correction (first, nothing blocks it)

1. Rebuild the web artifact from branch commit `4933f4bc3` exactly; rebind the manifest (source commit, file hashes, probe inventory); run the full packet verifier including the updated OpenCode assertion ("Project: opencode.json or opencode.jsonc. Global: ~/.config/opencode/opencode.json or ~/.config/opencode/opencode.jsonc") and the scope-explicit Claude CLI block.
2. Deep auditor: independent GO on the rebuilt manifest, tracing every claimed probe to its call site. In-session verifications by the advisor do not count as the second reviewer.
3. Owner manual smoke on the exact rebuilt bytes (changed spots only: OpenCode tab, Claude CLI commands; everything else was previously smoke-passed).
4. Owner runs the single guarded Netlify deploy (one production deployment, at most one exact restore triggered only if the deployment or live verification fails, one-use receipt). Post-deploy: confirm the live `en.json` no longer contains "required for MCP and other programmatic workflows".

Acceptance: live site keyless truth verified on deployed bytes; rollback target recorded; no other venue changed.

## 4. Workstream 2: quality fix batches (parallel with everything; engine data serves all venues)

Authority: `CP-01`. Every batch: smallest maintained-data or general-policy change, stable regression cases drawn from the named evidence, full 225-case fingerprint review, changed cases explained one by one.

Batch 1, vocabulary synonyms (highest measured demand, data only):

- Map the mined zero clusters to existing corpus icons: dropdown and combobox (chevron-down, select, menu, list), respond (reply, message), chooser and choose (select, pointer), orchestrator (workflow, network, git-merge, robot), slides, keynote and deck (presentation, projector), repair and fix (wrench, tool), firewall (shield, brick-wall), category (tags, folder-tree), pagination (chevrons, dots), certificate with ssl, tls, cert aliases, flight, aviation, airline and travel (plane, luggage, map), attachment (paperclip), mention (at-sign), notify (bell), customers (users), pricing (tag, receipt), health and doctor (heart-pulse, stethoscope), plugin (puzzle), community (users, handshake).
- Acceptance: every listed cluster returns relevant top-3 results in the local engine; regression case per cluster; fingerprint reviewed.

Batch 2, general engine policies:

- Prerequisite investigation, RESOLVED 2026-07-20: the packaged query-frame and intent data loads correctly and always did. The query-frame and intent loader blobs are byte-identical before and after the beta.2 shell commit, and the new package fixture proves positive concepts for queries the maintained graph covers. The `unclassified` results in the 14-case verification reflect graph sparsity for those specific queries, not a packaging failure. Batch 2 therefore focuses on enriching the maintained intent graph alongside the variant wiring, with the fixture guarding against future packaging regressions.
- Wire the existing recommendation variant generator into direct search when a phrase scores below a threshold, merging labeled variant results (engine-generated variants measured at 4% zero versus 29% for agent phrasing; this is the implementation basis, not a new invention). The 14-case report independently reproduced the same asymmetry: recommendation expansion found strong icons for "deployment" while direct search returned zero for "cloud deployment" three times.
- Plural and inflection stemming in query normalization (databases, customers, screenshots, slides).
- Confidence floor: candidates matched only by weak substring overlap (mode to add_moderator class) are suppressed rather than promoted to fill the limit; fewer honest results beat filler.
- Acceptance: founder-pass phrase zeros (deploy to production, package deliver send class) return labeled results; user profile, unit test, docker container, dark mode top-3 are clean; zero-rate on the mined weak clusters (trash, info) drops; fingerprint reviewed.

Batch 3, remaining classes: k8s alias, constraint-token stripping ("18px", "visually distinct"), style-token parsing fix ("settings solid"), edit-distance recovery for misspellings, then the expressive tier data (ship it, burnout, chill, doomscrolling, ai slop, touch grass, brainstorm, lightbulb moment) with personality-bearing mappings.

## 5. Workstream 3: beta.2, the agent-experience release

Contents (all package-side, one exact tarball, verified against that tarball):

1. Controlled-run cohort labeling (`SUPERICONS_CONTROLLED_RUN_LABEL`, already on main).
2. 429 details propagation through the MCP layer and hosted client, with the end-to-end allowance-exhaustion case exercised against the packaged bytes (already on main; the e2e case is the packet's job).
3. One-call contract shell per `one-call-contract-2026-07-19.md`: `image_url`, `markdown_image`, and `suggested_response_markdown` in every `search_icons` response; tool-description steering; server `instructions` at initialize stating the display rule; `preview_icons` graceful truncation (accept long lists, truncate to 12, report `truncated_from`); forgiving input coercion instead of bare protocol errors.
4. The dummy-agent gate: a behavioral test that makes exactly one `search_icons` call per scenario, with two passing paths and no others. Match path for meaningful queries: results or labeled alternates, a resolvable `markdown_image`, an accurate `suggested_response_markdown`. Honest no-result path for unsupported or nonsensical queries: a structured no-result code, a useful hint and suggested next step, no image fields, no fabricated icons. The suite includes both classes; fabricated relevance fails either path. Runs in the packet verifier; trace its invocation.
5. Additions from the 14-case beta.1 verification: refresh the packaged local index and pin its generation timestamp in the release evidence (the beta.1 index was over three weeks old at test time); add a package fixture proving the query-frame and intent data load and produce non-empty concepts for known semantic queries; implement the clarification behavior required by `D-016` and `FR-27`: ambiguous low-confidence slots such as bare "run" must produce labeled clarification options instead of a silent single-sense resolution (softening the tool description is not an acceptable substitute for the accepted decision); add integration fixtures for every failed query in that report; and rerun the exact 14-case matrix against the beta.2 tarball as an acceptance gate.

Release mechanics and sequencing: the shell, labeling, and 429 work may be implemented immediately and in parallel, but the exact beta.2 tarball is built only after the quality fixes required by the five failed beta.1 cases merge (the query-frame packaging resolution and relevance floor from batch 2, typo recovery from batch 3, clarification alignment from this workstream). The 14-case matrix then runs against that exact tarball and publication requires it to pass. Version 0.4.19-beta.2 ships under the npm `beta` tag only; `latest` unchanged; staged archive, hashes, license and public-boundary checks (VC-3, VC-4), dual GO, owner approval to publish; rollback is repointing the beta tag. After publish, the owner updates any pinned client configs and the validation runner refuses unlabeled runs by default from then on.

## 6. Workstream 4: controlled validation window (the A-2 gate)

Requirements to close the window, all against beta.2 or later:

- 200 labeled controlled eligible `search_icons` attempts across at least three qualifying days, where a qualifying day has at least 30 labeled attempts (so the spread is real, not 198 plus one plus one). The labeled gate covers eligible `search_icons` calls because cohort labeling attaches to the beta search cohort, not to every tool. Primary source: the owner's natural agent usage with the label set in the client environment; the fixed runner is for regression passes and may contribute.
- At least 50 manually reviewed distinct query and mode combinations, rerun against the exact beta.2 bytes. Earlier founder-pass reviews identify the combinations and expected judgments but count only after their rerun on the promotion candidate.
- Full 225-case deterministic suite green; error rate at or below 1 percent; local p95 below 500 ms; no canary violations; venue rollback verified.
- Scripted or labeled traffic is never reported as organic. Organic adoption is reported separately, post-release.

## 7. Workstream 5: Railway local-first search

Contract (unchanged from prior ratification): eligible English `search_icons` served from the packaged in-process index inside the Railway server; successful eligible search makes zero Supabase search calls; a controlled local failure makes at most one stable hosted fallback call; ineligible, localized, non-ASCII, and recommendation requests keep their approved routes; response shape preserved.

Gates: 150-case ordered route parity on the exact deployment candidate, failure-injection proving one fallback maximum, public-boundary checks, pinned rollback deploy, dual GO. Post-deploy: live hosted eligible p95 under 500 ms sustained across a monitoring day, error rate not regressed, parity spot checks against the live endpoint.

Sequencing note: deploy after quality batches 1 and 2 land in the packaged data so the hosted upgrade ships speed and answer-rate together. Railway live traffic then supplies real-user evidence for later venue promotions.

## 8. Workstream 6: access enforcement build (build now, enable later)

Build order after the measurement artifact preconditions: free-key issuance for free-only registered users reusing the existing key lifecycle; the two-layer entitlement safety gate (integration fixture plus one guarded live smoke on the dedicated `internal_test` account, asserting registered allowance received, `isPro` false, no purchased entitlements, both ingresses); account-level allowance aggregation; atomic or race-safe counting; trusted forwarded identity; route-coverage test; unit-alignment behavioral test; fresh-window threshold revalidation. Enforcement flag stays off until every item passes and the limit-response copy promises only live benefits. Public numeric docs (A-3) ship in the same release that enables enforcement, restoring the preserved 12-locale draft after linguistic review.

## 9. Workstream 7: venue promotion (strictly separate decisions)

Order: 1) Railway hosted MCP promotes to v2 by default after the workstream 5 gates and the A-2 window close. 2) Web follows, inheriting shared engine data, with its own performance and interaction checks. 3) npm `latest` promotes last with the owner's explicit yes. `recommend_icons` promotion is out of scope per A-7. Each venue retains its own quality, compatibility, latency, error, public-boundary, and rollback gate on the exact promoted bytes.

## 10. Sequencing summary

Immediately and in parallel: workstream 1 (docs release chain), workstream 2 batch 1 plus the query-frame packaging investigation, and workstream 3 shell implementation. Then: batches 2 and 3 land the fixes the failed beta.1 cases require; the beta.2 tarball is built, passes the 14-case matrix, and publishes; the window opens (workstream 4). Then: workstream 5 deploy and canary. Then: workstream 7 promotions, with workstream 6 building in the background throughout. Nothing waits on a calendar; everything starts when its dependency clears.

## 11. Reporting and audit protocol

- Executor reports carry: artifact, lifecycle state changed, exact verification evidence, date and environment, residual limitation, rollback evidence for deployments.
- Deep auditor reproduces independently, traces claimed probes to call sites, and treats reported results as claims until reproduced. Findings distinguish integrity defects (must fix) from taste preferences (owner decides; under A-4 they ride the next release).
- The high-level advisor reviews direction, counters where evidence warrants, and escalates only genuine owner decisions.
- The status ledger (`implementation-status.md`) is updated per its own rules after each verified state change.

## 12. Success metrics

| metric | signal |
| --- | --- |
| Live docs truth | Deployed bytes contain the keyless statements and no false key requirement |
| Quality | Mined top-20 zero clusters return relevant top-3 locally; founder rerun judged acceptable by the owner; zero unexplained fingerprint changes |
| Agent experience | Dummy-agent gate green on beta.2 bytes; a weak-model client renders icons in chat from a single search call |
| Window | A-2 gate closed with labeled evidence only |
| Hosted speed | Railway eligible p95 under 500 ms sustained; no error regression |
| Access | Enforcement preconditions all green before any flag flip; thresholds revalidated on a fresh window |

## 13. Risks

| risk | response |
| --- | --- |
| Packet reopening resumes | A-4 freeze rule: only falsehoods reopen a sealed packet |
| Synonym batches drift into query-specific patches | CP-01 discipline; the deep auditor rejects per-query hacks without a recorded exception |
| Variant wiring changes ranking broadly | Fingerprint suite plus labeled-variant separation; batch 2 is reviewed and fingerprinted as an isolated change set before its resulting engine data is included in beta.2 or any other release |
| Beta.2 scope creep | Contents fixed by A-8; anything else queues for beta.3 |
| Window counted dishonestly | Labeling is technically enforced; the runner fails closed; unlabeled events excluded by construction |
| Railway deploy regresses quality | Route parity on exact candidate bytes; pinned rollback; canary day before promotion |
