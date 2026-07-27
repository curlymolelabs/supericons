# Supericons: Trust Posture and Tactical Plan

Date: 2026-07-25
Status: Sections 2 to 4 PARKED by owner decision on 2026-07-25. Section 5 is the live work queue; the visual version at `docs/supericons-tactical-plan-2026-07-25.html` is the primary artifact and supersedes the numbering here.

**Owner decision, 2026-07-25.** The trust posture, the never list, and the VC-10 proposal are parked. Rationale, recorded because it is sound and should survive: a public commitment that a user has no way to verify is a liability rather than an asset, and backtracking on a published promise costs more than never publishing one. Trust is earned by shipping things that work. This is consistent with the charter's own opening principle that a commitment without an enforcer is a defect by default. Revisit when there is something concrete to point at, or when accounts link searches to identities.

The material below in sections 2 to 4 is retained as thinking to return to, not as a plan of record. Nothing in it ships without a fresh owner decision.
Relates to: `docs/supericons-strategy-canvas-and-level-up-plan-2026-07-25.md`, `docs/supericons-cross-channel-icon-popularity-prd-2026-07-25.md`, `docs/si-v2/vision-charter.md`

## 1. What already exists

Verified in source on 2026-07-25 before writing this plan:

- `mcp/telemetry.js` already short-circuits all telemetry when any of `DO_NOT_TRACK`, `SUPERICONS_DISABLE_TELEMETRY`, `SUPERICONS_TELEMETRY=off`, or `SUPERICONS_MCP_TELEMETRY_ENABLED=off` is set.
- The local session identifier is a SHA-256 of a per-process random UUID combined with the current date. It carries no account, no device ID, and no IP, and it rotates daily.
- The cross-channel popularity PRD already forbids storing raw IPs, authorization headers, API keys, or personal search histories in the public score, and already requires excluding controlled tests and high-volume clients.

The conclusion that matters: **the mechanism is built and the minimization is good. What is missing is disclosure.** An environment variable that users do not know about is a hidden flag, not consent. The cheapest trust work available is telling people what already happens to be true.

## 2. Standard practice in the agentic space

Stated with appropriate uncertainty, since this area is moving quickly and norms may have shifted:

- The MCP specification has no telemetry-consent primitive. There is no established opt-in standard for MCP servers.
- The prevailing pattern is that server operators log their own service's requests as ordinary server operation and disclose it in a privacy policy, if at all. A third-party MCP server is structurally closer to any hosted API than to a client application.
- Client-side data controls in major agent harnesses govern that harness, not third-party servers reached through it. They neither cover Supericons nor create an expectation that Supericons must mirror them.
- The genuine convention for developer tooling distributed as a package is the `DO_NOT_TRACK` environment variable. Supericons already honors it.

So the honest position is that Supericons is at or slightly above current norm on mechanism, and below its own potential on disclosure.

## 3. Trust posture

The goal is not compliance theater. It is that a developer who looks closely finds something better than they expected, because that is what converts a stranger into an advocate.

### Level 0: now, hours of work

**A "What we log" page**, linked from the MCP docs and the footer. Short, specific, checkable. Names the environment variables. Contents:

- what is recorded: the search text, the library filter, result counts, outcome, coarse country, and a daily-rotating session hash;
- what is never recorded: your code, file paths, project names, IP addresses in the local client, or any persistent identifier;
- how to turn it off: the exact variable names, copy-pasteable;
- what it is used for: making search find the thing you were actually looking for.

**A public "never" list.** This is the trust asset and it costs one page:

1. We never sell individual query data, and we never share it with third parties.
2. We never publish anything attributable to one user or one account.
3. We never gate search on telemetry. Turning it off costs you nothing today.
4. We never log your code, your files, or your project contents.
5. Anything we publish about demand is aggregate only, above a minimum cohort size.

Point 3 is the one that makes the rest believable, because it is the one that costs the business something.

### Level 1: at rung 1, when keys ship

The consent decision belongs at key issuance, where it is nearly free to build, and it is expensive to retrofit afterward. Two layered choices, never one:

- **Attribution** (link my agent searches to my account). Opting out means personal analytics cannot be shown, because the data genuinely cannot be assembled without it. That is a technical consequence, not a penalty, and it should be worded that way.
- **Telemetry entirely.** Opting out leaves search fully working, fully free, unchanged. This is the existing environment-variable behavior, surfaced in account settings.

Keeping these separate is what makes the first one feel fair rather than coercive.

### Level 2: deferred until volume or revenue justifies it

Formal privacy policy review, data processing terms, regional handling, retention schedules.

### One timing note on staging this

Roughly 11% of current traffic is EU-based (Italy 5%, Poland 5%, Germany 1%) with Switzerland adding 3%. Today that traffic is anonymous, carries no persistent identifier, and stores no client IP, which keeps exposure genuinely low. The thing that changes the picture is not logging queries; it is **linking queries to email accounts, which is exactly what rung 1 does.** So the practical consequence of staging is not "do it later," it is "build the consent checkbox into rung 1's issuance flow rather than bolting it on after." That costs an afternoon inside the work already planned, and it is the only item here where deferral is more expensive than doing it.

Everything else on this page can wait as long as the owner judges necessary.

## 4. Proposed VC-10, restated for this posture

> **VC-10. Individual query data belongs to the searcher; only aggregates leave.**
> Enforced by: external-facing analytics artifacts pass an aggregation floor check before publication; personal analytics render only to the account that generated them; disclosure or resale of identifiable query data requires owner sign-off in `decisions.md` and is presumptively refused; the published "never" list is treated as a commitment, and any release that would contradict it is a blocking defect.

The enforcer is what makes this different from a marketing promise.

## 5. Tactical work queue

Live as of 2026-07-25. Sequenced by dependency. Effort figures are rough estimates for a solo builder, not commitments. The trust-disclosure item that previously sat in this list is parked; see the status note at the top.

### Now, in this order

**T1. Classify probe and test traffic.** Half a day to a day. This is a prerequisite for T2, not a parallel task: popularity PRD goal 6 requires excluding controlled tests and high-volume clients, so the stream must be classifiable before anything ranks from it. The open case: one rare four-word phrase shows seven searches from six distinct client IDs at a 29% hit rate, which is not organic for a phrase that unusual.
*Done when: every search row is classifiable as organic, internal test, or probe, and popularity reads the filtered stream.*

**T2. Cross-channel popularity, per the existing PRD.** Days. The PRD is written and sound. This is the user-visible ship: it fixes a live defect (`icon_scores` holds 162 rows all stamped 2026-04-18, so the public All Icons order is a stale April snapshot), improves the default browse experience, adds indexable content, and is the first public proof of the living-data thesis.
*Done when: All Icons orders by recent multi-channel evidence, the active sort and data freshness are visible in the interface, and the scope is labeled honestly if any channel is not yet included.*

**T3. Resolve whether return rate is measurable at all.** Hours, investigative, fits any gap. The local session hash rotates per process per day by design, so a user who restarts their agent looks like a new searcher. If hosted identity behaves similarly, then estimated reach overcounts people and return rate cannot be computed from current data.
*Done when: it is documented what "632 estimated reach" actually counts, and whether a retention metric is possible before accounts exist.*

### Next

**T4. Rung 1: free keys, synced collections, agent retrieval tool.** The identity primitive everything personal depends on. Build note rather than a commitment: put the attribution choice inside the issuance flow, where it costs an afternoon, rather than retrofitting it onto keys already issued.
*Done when: keys are self-service, collections sync, an MCP tool retrieves them, and attribution coverage is rising measurably.*

**T5. Gap Report v1, free tier, with an MCP surface from day one.** Not a chart page: your searches, your zeros, your near-misses, with guided retry. The person whose agents are searching has no reason to open a website, and VC-7 requires the MCP surface to be stated before shipping.
*Done when: users return to it without being prompted.*

**T6. Close the loop once.** Wire the Gap Report to Icons Lab and the taste gate, and run one real external gap through to a credited, live icon. Document it as the reference case.
*Done when: one complete revolution has happened with a real user, evidenced.*

### Always on, in parallel

**Distribution.** Directory listings, Search Console work, MCP registry presence. This produced every user to date, needs no engineering, and should not compete for the same hours as T1 through T6.

### Deliberately deferred

Trust posture and public commitments (parked by owner decision, see the status note at the top), the canvas, publishers and marketplace, paid advanced analytics (T5 must prove engagement first), and public demand reporting (hold until volume makes an honest version presentable, since publishing patterns without denominators would flatter the numbers).

## 6. Decisions needed from the owner

Trimmed to what gates the next few weeks.

1. Is the Demand Inbox from the 2026-07-04 dashboard PRD restored, or superseded by T5? It overlaps substantially and should not be built twice.
2. Does distribution become a tracked track on the roadmap? It produced all traffic to date and appears in no plan.

Deferred until T4 is actually being built, and not needed now: the attribution default at key issuance, and whether query-data handling ever becomes a charter commitment.
