# Icon Lab PRD and Implementation Plan (record-first)

Version 1.1 · 2026-07-14 · Status: active

**v1.1 amendment (owner decision, 2026-07-14): the tool is a UNIVERSAL icon creator, not a pack-shape tool.** The orb was Agent Pulse pack grammar leaking into the product. Rebuilt on the six-source research (docs/si-v2/research-icon-fundamentals-2026-07-14.md): universal core `lib/si-lab/icon-core.mjs` (7 geometric primitives: circle, rect, line, polyline, arc, dot, path; set-profile spec sheet: stroke, caps, radius, angle vocabulary; Material keyline system with optical parity: circle 20, square 18, rect 20x16/16x20; research-grounded lints incl. live area, snap hygiene, keyline fit, single stroke weight, angle vocabulary, metaphor and 16px manual gates). Creator page `mockups/si-icon-creator.html` (built by `scripts/build-icon-creator.mjs`): keyline/anatomy starters (10, zero orbs), guides-overlaid canvas, add/remove/reorder parts, live set profile, metaphor field, visual preview gate, outline+solid exports, save to `data/si-registry/source/design/sets/`. Server: creator is the front door (/), the Agent Pulse record lab remains at /pack for pack 2 gating. Pack-specific renderers (the elegance layered style) become style plugins on top of the universal core, not the core.
Amends the SI v2 blueprint: Icon Lab is the production instrument for Ring 1 (Agent Pulse) and the foundation of Ring 5 (Creator Studio). Supersedes the June 2026 Icons Lab direction; the 14 June docs and the uncommitted `icons-lab/` app are historical inputs, not the plan.

## 1. Problem

Two proven failures define this product:

1. **Hand-drawn SVG fails without a feedback loop.** Agent Pulse batch 1 shapes were geometrically correct and visually wrong, because the author (an agent) drew coordinates blind and taste lives in the render, not the math.
2. **A freehand vector editor fails at this job.** The June 2026 Icons Lab (React/Paper.js, 17 tools, ~541KB source) stalled after its own audits concluded it exposed "too much vector-editor structure" and that neither human nor agent could reliably produce outstanding icons with it.

The root insight: icons in this system originate from **SI design records**, not from drawing. The tool's job is to render records deterministically, put human taste at cheap, explicit gates, and write every judgment back into the record.

## 2. Product definition

Icon Lab is a record-first icon production tool: a deterministic **composer** that renders an icon from structured construction parameters, wrapped in a **staged pipeline with visual preview gates** where a human locks each layer before automation proceeds.

Pipeline (owner-specified, implemented in v0.5):

```
Start            Shape                 Motion                Production
templates or  →  tune params        →  review animation   →  select formats
agent brief      GATE 1: taste?        GATE 2: meaning?      finalize + export
                 iterate <-> lock      iterate <-> lock      static | dynamic | interactive
```

Gate contract: everything before a gate can be automated; nothing passes a gate without human eyes. Locking freezes that layer (geometry, then motion) and advances `design_state` (shape_drawn → shape_approved → render_approved). Unlocking is always possible; iteration loops inside the current stage.

## 3. Principles

1. **Records are the single source of truth.** The Lab is a view plus a tuning dial; every edit lands in `construction.params`, and pages regenerate from records.
2. **Constraint by construction.** The output vocabulary is the primitive set governed by the pack law (grammar, territory, style tokens). Off-grid, wrong-weight, or territory-colliding output is impossible, not discouraged.
3. **Selection over construction.** Taste is applied by choosing (a template, a variant, a lock) rather than by constructing. Choosing is cheap; constructing is expensive.
4. **Taste amortizes into primitives.** Roughly a dozen primitives are polished once under owner eyes; every composition inherits them.
5. **Agent parity.** Every human action has an MCP equivalent (`si_lab.compose/tune/set_motion/export`); agent proposals are cards with diffs, approved or rejected, never silent edits.
6. **Never rebuild the vector editor.** Hard non-goal, learned the expensive way.

## 4. Users

| user | when | uses it for |
|---|---|---|
| Owner | now | polishing primitives, gating batches, finalizing Agent Pulse |
| Agent composer | now (chat) → v1 (in-tool) | drafting souls, proposing params and variants into the gates |
| Creators | Ring 5 | authoring sellable schema-native icons through the same gates |

## 5. What exists (v0 + v0.5, shipped 2026-07-13/14)

| artifact | role |
|---|---|
| `lib/si-lab/composer.mjs` | 7 primitives (orb, halo, arc+head, dot, pill, bars, path escape hatch), roles, per-render visibility, motion specs; emits stroke/solid/elegance; runs in Node and browser |
| `construction.params` on all 14 agent-pulse records | prose recipes now machine-readable; validator passes 15/15 |
| `scripts/build-icon-lab.mjs` → `mockups/si-icon-lab.html` | the generated Lab: stepper, queue, template gallery (8 templates, winning-badged), live sliders, gates 1 and 2, lock/freeze, production formats, exports, copy/download persistence, MCP parity strip |
| `scripts/migrate-construction-params.mjs` | rerunnable recipe→params migration |

Known v0.5 limits: persistence is copy/download-and-merge; no in-tool agent; interactive states are a disabled placeholder; primitives still carry untuned defaults.

## 6. Implementation plan

### Phase A · v0.6 "Taste foundation" (in progress)

- A1 **Primitive polishing session** · PENDING OWNER: owner tunes orb, halo, weights, glass, and per-template proportions in the Lab; tuned values become pack constants (style_tokens update) and template seeds. Acceptance: owner declares the 8 templates visually approved; constants merged into the pack record.
- A2 **Save-back server** · DONE 2026-07-14: `scripts/icon-lab-serve.mjs` serves the Lab at 127.0.0.1:5199, rebuilds the page per request, and writes tuned records straight into the design JSON files with schema validation plus a full verify run per save; Lab drafts land in `design/drafts/` (unverified by design). Round-trip tested: tune → save → verified on disk → revert.
- A3 **QA lints in the Lab** · DONE 2026-07-14: `lintRecord` in the composer (bounds vs 1.5 margin, ring-gap vs stroke rule, weight hierarchy, accent discipline, reduced-motion fallback, distinct_from presence, anti-association manual checklist) rendered as pass/warn/info/manual chips beside gate 1. First run flagged 4 real tight-gap findings (sound-blast, idle, working, retrying) for the A1 session.
- A4 **Batch 1 re-gate** · PENDING (after A1): regenerate batch 1 through tuned primitives; owner runs gates in the Lab. Acceptance: 10/10 orb states shape_approved via gate 1.

### Phase B · v1 "Agent composer"

- B1 **Brief box** (Start stage): type intent → agent drafts the soul (purpose, must_communicate, mind map with 3 scored metaphor candidates, anti-associations, distinct_from checked against the territory map) → owner picks a metaphor. Mechanism: MCP call to the model with pack record + schema as context; output validated JSON.
- B2 **Variant generator**: for a chosen metaphor, agent proposes 3 construction-param variants; Lab renders them side by side with the approved reference icons; owner clicks one. This is where taste becomes selection.
- B3 **Proposal cards**: conversational tuning ("halo tighter") produces param diffs rendered as before/after cards with approve/reject; accepted diffs write to the record with provenance.
- B4 **Interactive states**: per-state parameter deltas (`hover`, `active`, `loading`, `error`) bound to `--si-state`, edited in the Motion stage, previewed as a state playground; the Production stage's third format card goes live.
- B5 **Export projections**: React/TSX snippet and sprite entry from the same record; Lottie evaluated (render parity with CSS motion is the gate).

Acceptance for Phase B: one brand-new icon travels brief → metaphor pick → variant pick → tune → gates → production with under 15 minutes of owner attention, and its record validates with a complete soul.

### Phase C · v1.5 "Compounding taste"

- C1 **Taste corpus**: every approve/reject/tune delta recorded (`revision_history` + comments) and fed into composer prompts.
- C2 **Critic pass**: agent scores its own variants against craft rules, anti-associations, and past rejections before the owner sees them; weakest are filtered.
- C3 **Search-gap feed**: unresolved site queries populate the Start stage queue (the June factsheet's core loop, finally wired).
- C4 **Metric instrumentation**: rounds-to-approval per icon, template usage share, escape-hatch usage share.

### Phase D · Ring 5 alignment

Creator Studio reuses the Lab as-is behind certification: creator briefs, same gates, owner (or certified reviewer) holds ship. Details live in the SI v2 blueprint Ring 5.

## 7. How taste is ensured (the system, condensed)

1. Bad is structurally impossible (primitives + law + lints).
2. Good judgment is cheap: two visual gates, variants as multiple choice, references and squint strip always on screen.
3. Judgment compounds: every verdict is record data; the critic pass replays accumulated taste before human review; the corpus is also the gated product sold as design intelligence.

## 8. Non-goals

- No freehand drawing tools, node editing, boolean ops, or arbitrary SVG import. Ever, in this tool.
- No new primitive without a taste-gated proposal (vocabulary grows deliberately; the `path` escape hatch covers the interim and its usage share is the signal a new primitive is needed).
- The June `icons-lab/` app is retired: cherry-pick QA and publishing patterns, archive the directory, no incremental salvage.

## 9. Risks

| risk | mitigation |
|---|---|
| Template sameness (everything looks like the same 8 skeletons) | variants + vocabulary growth per category; escape-hatch share tracked as coverage metric |
| Primitive vocabulary too limited | path escape hatch now; >20 percent escape-hatch usage triggers a vocabulary proposal |
| Save-back friction stalls tuning | Phase A2 server is deliberately tiny and early |
| Agent proposals regress to blind drawing | agents emit params only, never raw SVG; lints run before render |
| Scope creep back toward an editor | non-goals section + the June postmortem cited in this doc |

## 10. Metrics

- Review rounds per approved icon (pilot baseline 6; target under 2 by icon 20).
- Owner minutes per finalized icon (Phase B target: under 15).
- Template usage share vs blank/escape starts; escape-hatch part share (vocabulary coverage).
- Gate pass rates (gate 1 first-pass approval trend is the taste-system health metric).

## 11. Open questions

1. Where does the Lab ultimately ship: stays an internal local tool, or becomes a site section (it is the Ring 5 creator surface, so eventually site, but when)?
2. Archive location for the retired `icons-lab/` directory (it is untracked; suggest moving to `_archive/icons-lab-2026-06/` or deleting after cherry-pick).
3. Brief-box model access in Phase B: through the existing MCP server, or owner-run chat sessions writing records (current mode) until Ring 2 auth exists?
