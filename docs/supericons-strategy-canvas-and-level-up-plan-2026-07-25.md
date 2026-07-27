# Supericons: Strategy Canvas and Level-Up Plan

Date: 2026-07-25
Status: Proposal for owner review. Not ratified. Charter amendments proposed here require owner approval per VC-9.
Revised 2026-07-25 after an independent production audit. Withdrawn in that revision: the roughly 4% registration rate. Added: the ChatGPT concentration finding, which now outranks the funnel argument on evidence.
Relates to: `docs/si-v2/vision-charter.md`, `docs/si-v2/v2-living-map-vision.md`, `docs/supericons-roadmap-2026-07-22.html`, `docs/supericons-admin-user-intelligence-dashboard-prd-2026-07-04.md`

## 1. Where we actually are

Figures below are read from the admin dashboard 30-day window on 2026-07-25. Telemetry is considered reliable from 2026-07-15 onward; a database IO outage on 2026-07-16 is labeled in the quality trend.

| Measure | Value |
| --- | --- |
| Real searches (30d) | 1,747 |
| Unique queries (30d) | 1,523 |
| Estimated clients (30d, audited) | 644 · clients or networks, **not people** |
| ChatGPT share of hosted identities | **607 of 629, 96.5%** |
| Distinct user agents behind all 629 hosted identities | 12 |
| Searches per searcher | 2.8 |
| Successful | 89% |
| True zero rate | 10% (165 events) |
| Low-result rate | 7% (84 of 1,147 eligible, 66% coverage) |
| Venue split (30d) | Hosted MCP 1,667 / Web 60 / Local 20 |
| Registered accounts (all time) | 27 |
| Pro accounts (all time) | 2 |
| Countries represented | 12+ named, 81% of searches carry a country |

Three facts about this data deserve emphasis because they change decisions:

**The venue split is not yet balanced over any meaningful window.** The balanced web/hosted/local distribution appears on 2026-07-24 only. It reflects the attribution repair (web searches previously stamped as hosted), not a change in traffic mix. Because history is era-marked rather than rewritten, the true historical web share is permanently unknowable. Any cross-surface claim currently rests on roughly one day of clean data.

**Query repetition is very low.** 1,523 unique queries produced 1,747 searches, so 87% of searches are unique. Query-frequency popularity is close to noise at this volume. Icon-level popularity (what was returned, fetched, copied) aggregates the same traffic into a signal roughly an order of magnitude denser.

**The people who register are not the people who search.** Search volume is 95% hosted MCP, anonymous agent traffic by construction, and the production audit confirmed only **2 search identities are linked to an account**. This is not a funnel-quality failure; it is structural, and the audit supplied the mechanism: 96.5% of hosted identities arrive through ChatGPT, where a user has no browser session and no reason to leave the conversation to sign up. Registration will stay flat until a key can be obtained and used from inside an agent conversation. That is a hard design constraint on rung 1, not a marketing problem.

**Concentration is the largest single risk, and it is measured.** One directory supplies 96.5% of hosted identities. Only 12 distinct user agents produced all 629, which is why the identity is closer to an IP count than a person count, and why "estimated clients or networks" is the honest label. Unlike anything involving conversion, this finding does not depend on identity precision at all. A ranking or policy change inside that one catalog would remove most of the current business. Channel diversification therefore outranks funnel work on the evidence available today.

**No conversion rate is claimed.** An earlier draft divided 27 all-time accounts by 632 recent identities and reported roughly 4%. That compares two populations over two different spans and is withdrawn. Conversion becomes measurable only once accounts link to searches, which is rung 1 itself.

## 2. Vision refinement

The charter and the living-map document remain sound. Nothing here contradicts the five layers, the rings, or the nine commitments. What follows sharpens one under-specified area: what the usage data is *for*.

Today VC-3 treats living intelligence defensively, as an asset to protect from copying. That is correct and should stay. But it frames the query stream as an input to search quality only. The refinement is that the same asset is also an output, and the vision should say so.

### R1. The query stream is a product line, not only an internal asset

One asset, three distinct products, each with a different audience and a different rule:

1. **Internal.** Usage-derived ranking that makes search better. Protected, never bundled. This is the current VC-3 scope and does not change.
2. **Personal.** A searcher's own history: what their agents looked for, what they failed to find, what they nearly used. Belongs to that searcher. Free at the basic tier, deeper at the paid tier.
3. **Aggregate.** What the market is building, expressed as anonymized patterns across all searchers. A content and eventually data product. Never attributable to an individual.

The defensibility argument is worth stating precisely, because it is stronger than the usual "we have data" claim. Design tools see the finished design. Repositories see the finished code. The moment of *"I need something that means X"*, expressed in natural language, at build time, before anything exists, is recorded in Supericons and essentially nowhere else. That intent record is the scarce thing. Its value scales with volume and with attribution cleanliness, which is exactly why dashboard accuracy is strategic work rather than maintenance.

Honest caveat: at 1,747 searches per month this is a seed, not a goldmine. It becomes one by compounding. The correct posture is to build the instrument now and let volume arrive.

### R2. Zero results are demand signals, not only quality defects

165 true zeros in 30 days are currently treated as a number to drive down. Every one of them is also a moment where a real person needed something that did not exist. That single event is simultaneously:

- a gap in the library (content roadmap input),
- a live unmet need for that user (product moment),
- a candidate for creation in Icons Lab (tooling moment),
- a contribution opportunity (ecosystem moment, VC-8).

The July 4 dashboard PRD already specified a Demand Inbox that turns failed searches into add-icon, add-alias, improve-ranking, or improve-docs actions. It is not present in the current three-tab dashboard. Restoring it is not new scope; it is the operational form of this refinement.

Reframed commitment: **drive down zeros that are our fault, and harvest zeros that are the world telling us what to build.**

### R3. Personal analytics is the contribution funnel

The owner's proposal is that registered free users get basic analytics and can pay for deeper analysis that helps them search better and build their own custom icons. Taking the second half seriously changes the product from a dashboard into a loop.

The job to be done is not "show me charts." It is **"close my gaps."** So the product should be gap-centric:

- here is what your agents searched for and did not find,
- here is what they found but did not use,
- for each gap: retry with a better query (guided), create it in Icons Lab, or contribute it back.

A user closing their own gap in Icons Lab has already produced a contribution candidate. The human taste gate (VC-5) decides whether it becomes canonical, and acceptance earns credit (VC-8). The personal analytics product and the ring 2 contribution pipeline are therefore the same mechanism viewed from two ends. Building them as one thing is cheaper than building them twice.

The flywheel then closes concretely: search produces gaps, gaps produce creations, creations pass taste and enter the library, the next search finds them, the contributor is credited and returns.

### R4. Proposed new commitment: VC-10, query data belongs to the searcher

If the query stream becomes a product line, the charter needs a rule about it, or the commitment-without-an-enforcer failure mode returns. Proposed text:

> **VC-10. Individual query data belongs to the searcher; only aggregates leave.**
> Why: attribution is voluntary, and users will only accept keys that identify them if identification is never turned against them. The trust that makes attribution possible is itself the precondition for the data asset.
> Enforced by: any external-facing analytics artifact passes an aggregation floor check (no cohort below a named minimum count, no individually attributable query text) before publication; personal analytics render only to the account that generated them; resale or disclosure of identifiable query data to third parties requires owner sign-off recorded in `decisions.md` and is presumptively refused.

This is the differentiation, not just the ethics. Large platforms hold this kind of data and monetize it against the people who produced it. A visible, enforced commitment not to is a reason to trust a small provider with your build-time intent.

## 3. Lean canvas

**Problem** (each backed by current data)
1. Agents cannot see. They search by guessed name or by whole sentences of intent, and name-matching fails them. Evidence: 87% of queries are unique, many are full natural-language requests.
2. Sets lack coherence. Agents explicitly ask for consistency across a UI. Evidence: live queries request "a visually consistent outline icon set... use one library for all icons."
3. A gap has no exit. When the icon does not exist, the flow simply ends. Evidence: 165 true zeros with no recovery path beyond retry.

**Customer segments**
- Primary: AI coding agents as the calling user, and the builder behind them.
- Beachhead: solo and small-team builders shipping fast without a designer, reached through the ChatGPT and Codex app directory.
- Later: dev-tool brands seeking presence at the integration moment; third-party icon publishers.

**Unique value proposition**
The icon layer built for the moment a machine chooses the icon: one call from meaning to a coherent, usable set, and a library that grows from what the world failed to find.

**High-level concept**
Search Console for icon demand, attached to the library that can close the gaps it finds.

**Solution**
Meaning-first deterministic retrieval, one-call set recommendations, inline previews, honest structured zeros, local-first speed, and the demand loop that turns failures into content and contributions.

**Channels** (currently absent from the roadmap despite producing all traffic to date)
- ChatGPT and Codex app directory: approved on the second attempt, currently the only icon-related entry. Scarce and temporary.
- Google organic, worked repeatedly through Search Console.
- MCP directories: Smithery, Cursor directory, and others, including several that listed the project from its public repository without submission.
- npm distribution.
- Content: aggregate demand reporting, not yet built.

**Revenue streams**
Live: Pro subscription, premium packs. Designed and unbuilt: advanced personal analytics, x402 per-use agent payment, sponsored and affiliate placement at the logo-selection moment. Deferred: marketplace take, aggregate data licensing.

**Cost structure**
Hosting and database, domain and distribution, and the dominant cost, owner time. Every plan below is scoped to that constraint.

**Key metrics**
See section 4; the current dashboard measures the wrong things for this stage.

**Unfair advantage**
The directory position (temporary, and now measured at 96.5% of identities, so it is simultaneously the advantage and the single point of failure), the intent corpus (durable and compounding), the evaluation and charter discipline (culturally hard to copy), and honest zero handling in a category where competitors fabricate relevance.

## 4. The metrics that matter now

Volume and reach are the wrong headline for a tool at this stage. They answer "did people arrive," not "did the tool work and did they come back." Proposed additions:

| Metric | Definition | Why it matters |
| --- | --- | --- |
| Return rate | Distinct client identities searching on two or more distinct days, within one calendar month | Already exists as `returning_clients_within_month` and measured 153 of 629 hosted identities in the audit, but the V2 Overview API does not expose it. Backend plus display, not display alone. Counts clients or networks, never people. |
| Episode success | Share of search episodes reaching a fetched or copied icon | Already planned as the recovery scorecard. It is the real quality metric; the zero rate is a proxy. |
| Fetch rate | Searches leading to an icon fetch | Separates intent to use from browsing. |
| Set adoption | Recommendation calls where a majority of returned slots are subsequently fetched | Measures the differentiated capability directly. |
| Unserved concepts | Distinct clustered concepts with zero results per week | The content roadmap input and the raw material of the analytics product. |
| Attribution coverage | Share of searches carrying an account key | The leading indicator for whether a personal analytics product is possible at all. Currently near zero on the agent path. |

Before any of these are trusted, the probe-traffic question needs an answer. One unusual four-word phrase shows seven searches from six distinct client IDs at a 29% hit rate, which is not organic behavior for a rare phrase. It may be internal testing across sessions or automated directory probes. Popularity ranking and demand harvesting both read from this stream, so classification must come first.

## 5. The level-up milestone

The vision has six rings. Levelling up does not mean starting more of them. It means making the loop complete one full revolution at small scale, with a real external user:

> A search fails. The gap surfaces to the person whose agent searched. They create the icon in Icons Lab. It passes the human taste gate. It enters the library. A later search by someone else finds it. The contributor is credited.

Once that runs end to end even once, the living map stops being a document and becomes a system with evidence behind it. Everything in ring 2 through ring 5 is a scaling problem after that. Nothing in them is worth starting before it.

## 6. Sequenced plan

Ordered by dependency, consistent with the standing directive that entry criteria, not dates, gate each step.

**Phase A. Make the instrument trustworthy.** In motion. Dashboard accuracy, tri-surface attribution, probe and test traffic classification, plus the metric definitions in section 4. Everything downstream reads from this.
*Exit: dashboard figures reconcile against direct source queries on all three surfaces; probe traffic is classified; return rate and attribution coverage have baselines.*

**Phase B. Popularity ranking on All Icons.** Icon-level, not query-level. Scope the first release to what the data supports: either hosted-only with that stated plainly, or wait for two weeks of clean tri-surface attribution.
*Entry: Phase A exit. Exit: ranking live with an honest scope statement.*

**Phase C. Rung 1, the identity primitive.** Self-service free keys, synced collections, and agent access to them through an MCP retrieval tool. This is the prerequisite for everything personal, because attribution coverage on the agent path is currently near zero.
*Entry: already met. Exit: keys issued, attribution coverage measurably rising.*

**Phase D. Gap Report v1, free tier.** The personal analytics product in its gap-centric form: your searches, your zeros, your near-misses, with guided retry. Ships with an MCP surface from day one, not only a web page, because the user whose agents are searching has no reason to visit a website (VC-7 requires the MCP surface to be stated before shipping anyway).
*Entry: Phase C live with non-trivial attribution coverage. Exit: users return to it unprompted.*

**Phase E. Close the loop once.** Wire the Gap Report to Icons Lab and the taste gate. Run one real external gap all the way to a credited, live icon. Document it as the reference case.
*Entry: Phase D showing repeat use. Exit: one complete revolution, evidenced.*

**Phase F. Advanced analytics, paid.** Only after the free version proves people look at it and act on it. Pricing follows demonstrated use, not projection.
*Entry: Phase E complete and free-tier engagement established.*

**Always on, in parallel.** Distribution, repeating the playbook that produced every user to date: directory listings, Search Console work, MCP registry presence. And content: expressive originals seeded by real observed zeros rather than intuition.

**Deferred deliberately.** The canvas (ring 3), publishers and marketplace (ring 5), and aggregate data as a paid product. Also the public demand report: at current volume, publishing patterns without denominators would flatter the numbers, and publishing with them would reveal thin traffic. Hold until volume makes an honest version presentable.

## 7. Open questions for the owner

1. Adopt VC-10 as drafted, amend it, or reject it? It should be settled before any analytics product ships, not after.
2. Should distribution become a named, tracked track in the roadmap, given that it produced all traffic to date and currently appears nowhere in the plan?
3. The MCP directories that listed the project from the public repository without submission: free distribution, or a governance concern worth acting on?
4. Is the Demand Inbox from the July 4 PRD being restored to the dashboard, or superseded by the Gap Report in Phase D? They overlap substantially and should not be built twice.
