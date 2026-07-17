# Supericons Vision Charter

Status: RATIFIED by the owner on 2026-07-17. Canonical home: `docs/si-v2/vision-charter.md`. Every release gate, audit routine, and agent session treats this as the highest-authority document in the project. Agents may propose amendments through the bridge; only the owner amends it.

## Why this document exists

Core intent has drifted before: protection measures the owner asked for were never encoded as checkable rules, so later sessions shipped past them without noticing. The lesson, now a rule: a commitment without an enforcer is a defect by default. This charter separates the vision, which inspires, from commitments, which are short, testable sentences, and names the enforcer for each.

## Part 1: The vision

Supericons evolves from an icon library into a living map of programmatic icons, where every icon is an interactive, schema-backed, payment-capable portal to the thing it represents, curated in real time by agents and governed by human taste. Icons are no longer tiny UI navigation symbols; they scale beyond that. Designers, developers, and agents curate and build their own supericons: they share, vote, contribute, earn, and sell. The moat is not secrecy; it is the living ecosystem and its compounding data, which no snapshot can copy.

The full picture, including the five layers (face, soul, hands, pulse, wallet), the canvas, the contribution pipeline, the economy flywheel, and the build rings, is recorded in `docs/si-v2/v2-living-map-vision.md`. That document describes where we are going. This charter locks in the rules of the road for getting there.

## Part 2: Commitments, in two layers

Amendment 1 (owner, 2026-07-17): the commitments are layered so the charter guides without narrowing creativity.

**The evergreen layer** holds identity, ethics, and governance: the spirit of VC-2, VC-3, VC-5, VC-6, VC-7, VC-8, and VC-9. These define what Supericons is and should survive any pivot. Amending one is a deliberate identity decision, made rarely.

**The adaptable layer** holds current-era strategy and mechanics: VC-1 (today's free-library distribution strategy), the specific protected-data class list under VC-3, the license and canary methods under VC-4, the payment rails under VC-7, and every specific enforcement mechanism. The owner amends these freely as the business evolves; the only constant is that some enforcer must exist for whatever the current rule is.

**Creative freedom clause:** this charter binds only what ships publicly or becomes canonical. Exploration is unbound: prototypes, experiments, mockups, drafts, new definitions of what an icon can be, and new surfaces need no charter clearance. Gates fire at the shipping boundary, never at the drawing board. The living map vision document remains direction, not law, so it can keep growing.

Each commitment below is one testable sentence, followed by why it exists and what enforces it.

**VC-1. The static icon library stays free and public.**
Why: free distribution is the growth engine of the moat, not a concession.
Enforced by: any release or pricing change that gates previously free static library content requires explicit owner sign-off recorded in `decisions.md`; the weekly audit checks for new gates on static content.

**VC-2. Icons remain open; upstream library licenses are honored; si originals are owned by Supericons and free to use.**
Why: the icons were never the protected asset; goodwill and legality are.
Enforced by: release gates verify upstream license files ship where required; si originals carry an ownership notice in the package license.

**VC-3. The engine's living intelligence never ships in a public client bundle.**
Covers: usage-derived ranking weights, query-behavior signals, community curation data, contributor reputation data, and paid design intelligence, on npm and web alike.
Why: this is the asset that compounds; a copier must never get it by downloading a file.
Enforced by: a spec requirement in `search-engine-v2.md`; every package and site release gate includes a bundle-content check against a named list of protected data classes; the weekly audit re-verifies both public surfaces.

**VC-4. Whatever ships publicly ships licensed and canaried.**
Why: shipped bytes cannot be protected from copying, so they must carry legal terms and detection markers instead.
Enforced by: a missing LICENSE or license field in any public artifact is a release defect that blocks the gate; canary entries exist in the public engine data on both surfaces, documented in a private record that never enters the repo; the weekly audit confirms the canaries are present.

**VC-5. Human taste gates agent throughput.**
Why: agents propose, humans approve; scale must not outrun judgment. Carried from v1 and the icons lab.
Enforced by: no agent-generated icon, record change, or community contribution becomes canonical without passing the promotion step a human controls; release gates reject pipelines that write directly to canonical records.

**VC-6. Records stay honest.**
Why: provenance and draft-until-reviewed status are what make the soul layer trustworthy enough to sell.
Enforced by: schema validation requires provenance fields; anything unreviewed renders as draft; the weekly audit samples records for unreviewed content presented as canonical.

**VC-7. Agents are first-class citizens; humans keep human rails.**
Why: everything reachable by MCP and payable by x402 for agents; card rails for humans. The ecosystem serves both without forcing either into the other's flow.
Enforced by: new user-facing capabilities state their MCP surface in the spec before shipping; payment features route agents and humans separately per the recorded x402 decision.

**VC-8. Contribution is rewarded on acceptance, with credit.**
Why: the flywheel depends on contributors earning something real: credits, named credit, discounts. Incentives reward acceptance, not submission volume.
Enforced by: contribution pipeline designs must include the credit and reward path before implementation is approved; designs that foreclose sharing, voting, earning, or selling are rejected at review.

**VC-9. The owner decides money, brand, default experience, and promotion.**
Why: agents own technical judgment; the owner owns the business.
Enforced by: the bridge protocol and D-026; moving npm latest, changing prices, publishing outward-facing content, or altering what default users see requires the owner's explicit yes.

## Part 3: How this stays alive across sessions and agents

1. The ratified charter lives in the repo at `docs/si-v2/vision-charter.md` and is listed in `AGENTS.md` as required reading for every agent session.
2. `search-engine-v2.md` and future specs cite the commitment IDs (VC-1 through VC-9) wherever a requirement descends from one.
3. Release packet verifiers carry the VC-3 and VC-4 checks as named probes, so a violating bundle fails before publication, regardless of which agent built it or what any session remembers.
4. The weekly maintenance audit includes a charter-compliance section reporting on every VC with a current status.
5. Both auditors treat a charter violation as a material blocker, above any technical convenience.
6. Amendments: owner-only, appended with date and rationale, never silently edited.

## Ratification record

Ratified by the owner on 2026-07-17 after review ("the wordings look ok"). Implementation: the executor commits this to `docs/si-v2/vision-charter.md`, wires the spec cross-references and gate probes (gate changes under dual audit per the audit tiers), lists it in `AGENTS.md` as required reading, and the weekly audit prompt gains the charter-compliance section.
