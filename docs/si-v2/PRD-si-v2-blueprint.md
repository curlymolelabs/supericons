# SI v2 Blueprint: Product Requirements Document

Version 1.0 · 2026-07-06 · Status: draft for owner approval
Scope: everything between today's library (v1) and the Living Map vision. v1 continues shipping in parallel; nothing in this document modifies the existing production site until its ring is explicitly approved for integration.

Companion documents in this folder:
- [v2-living-map-vision.md](v2-living-map-vision.md) · the north star
- [supericon-schema-v1.md](supericon-schema-v1.md) · the universal record structure with tier annotations
- [design-record-schema-v1-proposal.md](design-record-schema-v1-proposal.md) · rationale and lessons behind the schema

Companion mockups (design sources of truth, in /mockups):
- `si-pack-2-shape-study.html` · the record-driven icon workflow, live
- `si-pack-2-agent-pulse.html` · pack 2 asset directions
- `si-schema-orb-listening.html` · the SI record surface: edit, tiers, community
- `v2-d-living-map.html` · the living map canvas concept
- `zorb-blast-icons.html` · first external icon commission (zorb)

---

## 1. One-paragraph summary

SI v2 turns every icon into a supericon: an asset with a schema soul (free core plus paid design intelligence), a pulse (semantic states and motion), hands (actions, MCP), and a wallet (x402 for agents, Stripe for humans), governed by a human taste gate and improved by a community contribution pipeline. It is built as seven independently shippable rings. Each ring is useful and revenue-relevant alone; together they compound into the Living Map.

## 2. Goals and non-goals

Goals (v2 program):
1. Make good icons dramatically faster and cheaper to create through the record-driven workflow.
2. Ship pack 2 (Agent Pulse) as the first schema-native product.
3. Sell design intelligence: free core records, paid gated extensions, agent-payable.
4. Build the contribution pipeline that turns usage and feedback into better records.
5. Establish the artifact-social graph (follow, remix, credit) and the creator path.
6. Keep v1 fully operational and improving throughout.

Non-goals (explicitly out of scope for v2.0):
- Tradeable tokens, DMs, chat feeds, or any social surface not bound to an artifact.
- Open (uninvited) creator marketplace.
- 3D/XR asset pipeline.
- Living Map as the default browse surface (it ships as a lens first).

## 3. Users

| persona | need | pays via |
|---|---|---|
| Vibe coder / indie dev | drop-in expressive assets that make the app not look templated | Stripe (pack, Pro) |
| AI coding agent (MCP) | machine-readable records to pick, place, and adapt icons correctly | x402 per call |
| Agent-product builder | orb/state/motion vocabulary for voice and agent UIs | pack + gated records |
| Design-conscious founder | port a coherent visual language to their brand | gated pack record, Pro |
| Creator (later ring) | publish and earn from schema-native icons | revenue share |

## 4. Principles (carried from v1 and this program's reviews)

1. Human taste gates agent throughput. Nothing becomes canonical without owner approval.
2. Records stay honest: draft until reviewed, provenance on every claim, rejections preserved.
3. Shape before style: symbolism gates (metaphor approval) precede geometry; geometry precedes rendering.
4. Motion has a job and carries rest beats; static first frames read complete.
5. Free tier = find and use correctly. Paid tier = adapt and rebuild. Internal = staging.
6. Agents are first-class: everything reachable by MCP, payable by x402, and every agent interaction doubles as data.

## 5. The rings: deliverables and acceptance criteria

### Ring 0 · Design-record foundation (in progress, near complete)

Deliverables:
- D0.1 Design-record validator v0 · DONE · `lib/si-registry/design-record-shape.js`
- D0.2 Pilot records for 4 icons with mind maps, anti-associations, revision comments · DONE · `data/si-registry/source/design/agent-pulse-pilot.json`
- D0.3 Verify script wired into the repo verify family · DONE · `scripts/verify-design-records.mjs`
- D0.4 Final pilot approval: orb-listening split-wave render owner-approved, all 4 records at shape_approved · PENDING OWNER
- D0.5 Validator v1 upgrade to the universal schema (pack record entity, render_overrides, revision_history, tier path constants per supericon-schema-v1) 
- D0.6 The agent-pulse pack record: grammar, territory map, style tokens, motion language, craft rules, each rule citing its review origin

Acceptance: `verify-design-records` passes with pack record + 4 icon records; a new icon record can be authored from the pack record alone without re-deriving any rule.

### Ring 1 · Pack 2: Agent Pulse (revenue)

Deliverables:
- D1.1 Batch mind maps for remaining 46 icons (10 orb states first), owner-approved at the paper stage before any drawing
- D1.2 All 50 shapes drawn per construction recipes, through the shape gate
- D1.3 Three renders per icon (stroke, solid, elegance) with render_overrides honored; motion per pack motion language
- D1.4 Pack mockup regenerated from records (records are the single source of truth; the mockup becomes a build artifact)
- D1.5 Launch through the existing v1 pipeline (manifest, registry, merge, product facts, verify suite), records draft until human_reviewed, price point decided (default: same $9.99 tier as agentic-motion)
- D1.6 Pack name finalized: **Agent Pulse** (owner decision, 2026-07-06; registry slug `agent-pulse`)

Acceptance: 50/50 records at render_approved; the standard verify suite passes; pack purchasable end to end on the existing commerce path.

### Ring 2 · Record commerce: free core, paid intelligence

Deliverables:
- D2.1 Tier projection implementation: computed public/gated projections from the tier path constants (extends `lib/si-registry/projections.js` patterns); internal never leaves source
- D2.2 Gated delivery endpoint: authenticated API/MCP only, per-buyer watermarking of gated responses
- D2.3 MCP tools: `get_record` (free), `get_design_intel` (402 flow), priced per call via the existing x402 endpoint; Pro subscription includes gated records for humans
- D2.4 Record surface on the site: the SI Schema panel from the `si-schema-orb-listening` mockup (preview + renders, edit section, tier sections, unlock CTA), integrated behind a feature flag
- D2.5 Pricing v1 (decided): $0.90 per gated record call (x402); full-pack intel bundle $19.99; Design Language license (the pack record) $29 one-time; all gated content included in Pro

Acceptance: an agent can fetch a free record, hit 402 on the gated call, pay, and receive the watermarked full record; a Pro user sees gated sections unlocked in the panel.

### Ring 3 · Community contribution pipeline

Deliverables:
- D3.1 Intake: schema-shaped contribution form on the record panel + `submit_feedback` MCP tool; everything lands in the internal staging pool with provenance (author, human/agent, context)
- D3.2 Distillation job: agent batch process that dedupes, clusters, and proposes record changes with evidence counts
- D3.3 Promotion UI/flow: owner one-click approve; promoted changes write to the record with a `community_signal` evidence type and a public credit
- D3.4 Incentives v1: accepted contribution earns gated-record credits and a named changelog credit; agent feedback earns an x402 discount on the next call
- D3.5 Passive signals: search-miss logging and pick-context logging from MCP flow into the same pool
- D3.6 Contribution license terms shipped with the intake form (submissions licensed for incorporation, including the paid tier)

Acceptance: the round-trip works on real data: a submitted observation is distilled, promoted, appears in the record with credit, and the contributor receives credits.

### Ring 4 · Artifact-social graph

Deliverables:
- D4.1 Follow: subscribe to a record; notify on version, state, or motion-spec changes (email + MCP webhook)
- D4.2 Votes on records (already mocked); counters render only above an activity floor so surfaces never look dead
- D4.3 Remix: fork a record with provenance; remix graph on the record page; free remixing of free-tier assets under the remix license
- D4.4 Public activity on the record: watchers, remixes, projects-using, agent installs
- D4.5 Publisher profiles (first party only at this ring)

Acceptance: following an icon produces a real notification on its next record change; a remix shows bidirectional provenance.

### Ring 5 · Creator Studio (invite-only marketplace)

Deliverables:
- D5.1 Creator authoring flow: schema-guided record creation (mind map prompts, grammar checks against the pack record, validator in the loop) inside the Icons Lab v2 direction
- D5.2 Certification: taste-gate review queue; "si certified" tier vs community pool
- D5.3 Commerce: creator pricing on gated records and assets, revenue share 85/15 for the founding cohort (locked 2 years) then 80/20 standard, Stripe Connect payouts (x402 split later)
- D5.4 Invite program: first cohort hand-picked; zorb-style commissions as the template for external work
- D5.5 IP and publishing terms: verified publishers for commercial/branded content; category order gated safest-first

Acceptance: one external creator publishes a certified, purchasable icon with a complete record, and receives a payout.

### Ring 6 · Living Map lens

Deliverables:
- D6.1 Map lens: the streaming-lane canvas (from `v2-d-living-map.html`) as an alternate browse view over the real registry, virtualized, motion within the rest-beat law
- D6.2 Peek/full cards backed by real records; size/position driven by a relevance score
- D6.3 Curator agent v1: proposes lane ordering and relevance changes into the taste-gate queue
- D6.4 First live-kind supericons (first party only): an alert, a scheduled reveal, an MCP tool card

Acceptance: the lens renders 150+ real supericons at 60fps on a mid laptop; a curated reorg proposal is reviewed and applied through the gate.

## 6. Concern register (everything raised, with its answer)

| # | concern | mitigation | ring |
|---|---|---|---|
| 1 | Symbolism failures survive to SVG stage (sun, steering wheel) | metaphor gate + must_communicate contract before drawing | 0 |
| 2 | Taste drift toward thin generic strokes | pack style tokens + craft rules with review citations | 0 |
| 3 | In-pack collisions (blast vs listening) | territory map + distinct_from constraints | 0 |
| 4 | Icon creation effort does not scale | records + pack law make icon N cheaper than icon N-1; measure rounds-to-approval | 0-1 |
| 5 | Gated content leaks once sold | auth-only delivery, per-buyer watermarking, value concentrated in the living/updated record | 2 |
| 6 | AI scraping of the paid layer | gated tier never in public repos or pages; API-only | 2 |
| 7 | Contribution spam if rewards attach to submission | rewards attach to promotion only; schema-shaped prompts manufacture quality | 3 |
| 8 | Community cold start | seed with owner review history and agent passive signals before human contributors | 3 |
| 9 | Dead social surfaces harming trust | activity floors on counters; agent activity populates first | 4 |
| 10 | Social becomes feed noise | artifact-bound interactions only (follow, remix, contribute); no feeds, no DMs | 4 |
| 11 | Marketplace cold start (two-sided) | first-party packs prove demand first; invite-only creators; commissions as bridge | 5 |
| 12 | Quality dilution from creator supply | certified tier through the taste gate vs community pool | 5 |
| 13 | IP and licensing exposure | verified publishers for branded content; safe categories first; contribution and remix licenses from day one | 3-5 |
| 14 | Map performance with hundreds of live icons | virtualization, rest-beat motion law, reduced-motion compliance | 6 |
| 15 | Losing focus: v2 starving v1 | v1 roadmap continues; each ring gated on the previous ring's acceptance; revenue checkpoints (pack 2 funds ring 2+) | all |
| 16 | Stripe webhook fragility (July incident) | commerce rings reuse hardened v1 paths; kill switches and smoke tests already in place | 2, 5 |

## 7. Metrics

- Creation efficiency: review rounds per approved icon (pilot baseline: 6 for the first, target under 2 by icon 20).
- Free layer: record page views, MCP `get_record` calls, search-miss rate trend.
- Commerce: pack 2 revenue, gated-record conversion (free record view to unlock), x402 call volume, Pro attach rate.
- Community: contributions per week, promotion rate, time-to-promotion, repeat contributor share.
- Social: follows per record, remix count, notification click-through.
- Creator (ring 5): certified creators, creator GMV, platform take.

## 8. Sequencing and gates

Phase A (now): Ring 0 close-out, Ring 1 batches. Gate: pack 2 launched.
Phase B: Rings 2 and 3 (commerce + community), built while pack 2 sells. Gate: first 100 paid gated calls or Pro unlock usage signal.
Phase C: Ring 4, then Ring 5 invite cohort. Gate: one external creator payout completed.
Phase D: Ring 6 lens, curator agents, first live-kind supericons.

Standing rule: any ring can be paused without stranding value, and no ring modifies the production site without explicit owner approval at integration time.

## 9. Decisions (resolved 2026-07-06)

1. **Pack 2 name: Agent Pulse** (owner decision). Registry slug `agent-pulse`; pilot records renamed accordingly.
2. **Pack-record pricing: both paths.** A one-time Design Language license per pack ($29 launch price) and inclusion in Pro. Reasoning: the buyer's need peaks once per brand (porting the system), and a subscription-only gate turns a one-time need into subscribe-and-churn; a la carte plus Pro also mirrors the per-record pattern, so the whole catalog prices one way.
3. **Gated record price: $0.90 confirmed**, with a full-pack intel bundle at $19.99 as the graduation path for heavy adapters. Anchor: the alternative to paying is an agent re-deriving the record blind, which demonstrably costs far more than $0.90 (the pilot took six review rounds to produce this knowledge).
4. **Ring 2 surface: feature flag on the live site, default off.** Staged rollout owner → Pro → all, kill switch mirroring the x402 endpoint pattern. A subdomain protects production but tests nothing: no traffic, no auth, no buyers. MCP endpoints ship first regardless, since agents need no UI.
5. **Creator share: 85/15 founding invite cohort (locked 2 years), 80/20 standard.** Creators are the scarce side at cold start and compare against ~90/10 self-serve platforms; SI wins on net value (distribution, schema tooling, agent payments), so the rake must never read as an App Store tax.
