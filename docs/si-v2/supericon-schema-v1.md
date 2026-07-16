# The Supericon Schema v1 (universal record structure)

Drafted 2026-07-06. This is the complete universal structure for a supericon: one record shape that covers a pack icon today and every living-map archetype later (brand logo, agent tool, token, alert, scheduled message, game, persona, storefront). It merges the registry record, the design record piloted on Agent Pulse (pack 2), and the living-map primitive (face, soul, hands, pulse, wallet).

## Conventions

- Tier tags on every field:
  - **[P]** public, free core. Purpose: discovery and correct use. Served openly (site, MCP, search).
  - **[G]** gated, paid extension. Purpose: adaptation, remixing, rebuilding, servicing. Served only through authenticated API/MCP (x402 per call for agents, subscription for humans). Never in a public repo.
  - **[I]** internal. Never projected. Staging and process data.
- All records are JSON. Field names snake_case. Dates ISO 8601. Every record is versioned and append-only in history.
- `kind` decides which sections are required (matrix at the end). Unused sections are omitted, not nulled.

---

## 1. Root: the supericon record

### 1.1 identity

| field | tier | type | notes |
|---|---|---|---|
| si_id | P | string | `si:` prefixed, immutable, e.g. `si:orb-listening` |
| kind | P | enum | `concept_icon, brand_logo, agent_tool, token, alert, message, game, persona, storefront, map_lens, custom` |
| label | P | string | display name |
| tagline | P | string | one-line hover text (the peek card line) |
| version | P | semver | record version |
| pack_id | P | string? | owning pack/collection, if any |
| publisher | P | object | `{ name, type: first_party/verified/creator/event_agent/anonymous, verified: bool }` |
| status | P | enum | `draft, review, active, paused, retired` |
| created, updated | P | date | |
| aliases | P | string[] | alternate ids/slugs |

### 1.2 face (the visual)

| field | tier | type | notes |
|---|---|---|---|
| depicts | P | string | what the visual literally shows, in words |
| style_renders | P | string[] | available render names, e.g. `stroke, solid, elegance` |
| preview_assets | P | object[] | `{ render, format: svg/lottie/rive/png, url }` static or watermarked previews |
| production_assets | G | object[] | full-quality, all renders, all sizes, animation sources |
| render_overrides | G | object[] | per-render detail scaling rules, e.g. `{ render: elegance, override: "one wave per side, animated, replaces the split pair" }` |
| brand_constraints | P/G | object | for brand_logo kind: clearspace, min size [P]; full usage rules [G] |

### 1.3 soul (meaning and intelligence)

| field | tier | type | notes |
|---|---|---|---|
| purpose | P | string | what it represents or does, one sentence |
| semantic_tags | P | string[] | controlled vocabulary tags |
| synonyms | P | string[] | search expansion; fed by mind map and usage signals |
| category, secondary_categories | P | string | controlled vocabulary |
| use_when | P | string | correct-usage guidance |
| avoid_when | P | string | misuse guidance |
| must_communicate | G | object | `{ actor, action, direction, intensity }` the communication contract |
| mindmap.associations | G | string[] | concept neighborhood (ear, microphone, dish antenna...) |
| mindmap.metaphor_candidates | G | object[] | `{ kind: human_convention/device_convention/agent_native, idea, verdict: chosen/candidate/rejected/reserved, reason }`; rejected entries kept forever as the anti-pattern library |
| mindmap.anti_associations | G | string[] | must-never-read-as list (sun, steering wheel, wifi...) |
| distinct_from | G | object[] | `{ si_id, differentiator }` collision constraints inside the pack/map |
| knowledge | P/G | object | kind-specific info payload (a logo's company facts [P summary, G depth]; a token's contract data; a tool's capability summary) |

### 1.4 construction (reproducible geometry)

| field | tier | type | notes |
|---|---|---|---|
| grid | G | number | design grid (e.g. 24 or 96) |
| recipe | G | string | exact geometry: coordinates, radii, sweep flags, clearances, weight hierarchy; sufficient to redraw from text alone |
| weight_hierarchy | G | object | primary vs secondary stroke weights and why |
| size_ladder | G | object[] | per-size simplification rules (what drops at 16px) |

### 1.5 pulse (state, motion, lifecycle)

| field | tier | type | notes |
|---|---|---|---|
| motion.has_motion | P | bool | |
| motion.behavior | P | string | plain-language description of the animation |
| motion.spec | G | object | `{ pattern, cycle_ms, stagger_ms, rest, easing, reduced_motion }` |
| states | P names / G specs | object[] | named visual states (`idle, working, attention, done...`) with gated per-state specs |
| lifecycle | P | object | `{ appears_on (schedule/event), swells_on (event triggers), retires_on }` for living-map behavior |
| relevance | P | object | `{ score, trend }` curated attention weight (computed, read-only) |

### 1.6 hands (actions and services)

| field | tier | type | notes |
|---|---|---|---|
| actions | P | object[] | `{ id, label, kind: link/play/launch/swap/send/reveal/call_mcp/buy, price?, currency? }` what the supericon can do |
| mcp | P | object | `{ server, tool, connect_string }` how agents invoke it |
| service_endpoints | G | object[] | authenticated endpoints, request/response contracts, rate limits |
| integration_recipes | G | object[] | per-platform embed/wire-up guides |

### 1.7 wallet (economics and access)

| field | tier | type | notes |
|---|---|---|---|
| access_tier | P | enum | `free, freemium, premium, private` |
| gated_price | P | object | `{ amount, currency, per: call/record/month }` shown openly so buyers see the offer |
| payment_rails | P | string[] | `x402, stripe, mpp` |
| license | P | string | usage license for free assets |
| license_gated | G | string | remix/derivative license terms for the paid layer |
| revenue_splits | I | object | publisher/platform splits, payout wiring |

### 1.8 community (participation)

| field | tier | type | notes |
|---|---|---|---|
| votes | P | number | aggregate |
| contribution_stats | P | object | `{ total, promoted }` counts only |
| promoted_credits | P | object[] | `{ contributor, field_improved, date }` anonymized-or-named provenance credits |
| external_comments | I | object[] | `{ author, author_type: human/agent, date, body, context, status: raw/distilled/promoted/discarded }` the staging pool; promotion moves the insight into the target field with a credit |
| feedback_prompts | P | string[] | the schema-shaped questions shown to contributors (what did it look like at first glance, what did you search first, what did you almost confuse it with) |

### 1.9 design process (the how-it-got-good layer)

| field | tier | type | notes |
|---|---|---|---|
| design_state | P | enum | `metaphor_proposed, metaphor_approved, shape_drawn, shape_approved, render_approved`; gate rule: past the metaphor gate requires exactly one chosen metaphor |
| revision_history | G | object[] | `{ round, change, verdict, taught_us }` the compressed path from first draft to approved; the highest-leverage field for a buyer adapting the icon |
| evidence | I | string[] | provenance of claims (owner_review dates, research ids) |
| editorial_notes | I | string | free-form process notes |

---

## 2. Pack record (one per pack or collection)

The shared law that individual records inherit. This is the system-level product ("port this design language to your brand").

| field | tier | notes |
|---|---|---|
| pack_id, name, tagline, version, status | P | |
| member_ids | P | the supericons in the pack |
| design_language.grammar | G | semantic tokens: `{ rule, meaning, examples }` (orb = agent; wave direction = who acts; element count = intensity) |
| design_language.territory_map | G | `{ zone, owner_si_id, notes }` visual zones claimed per icon so new members cannot collide |
| design_language.style_tokens | G | grid, safety margin, stroke weights (primary/secondary), caps/joins, palette with accent semantics, layered-render specs (tile, orb gradients, glass) |
| design_language.motion_language | G | pattern library with keyframes and defaults; timing law (click under 500ms, hover 1.5-3s, ambient rest 2-5s, static first frame must read complete) |
| design_language.craft_rules | G | `{ id, rule, origin }` accumulated rules, each citing the review that taught it |
| design_language.render_styles | P names / G recipes | |
| commerce | P | pack pricing, bundle contents |
| provenance | P summary / I detail | review round totals, research citations |

---

## 3. Projection rules

- The public projection is computed, never hand-maintained: a whitelist walk of [P] paths (the mechanism already exists in `lib/si-registry/projections.js`; the design validator's PUBLIC/GATED/INTERNAL path constants extend it).
- The gated projection = public + [G], served only through authenticated MCP/API with metering. Every gated response is watermarked with the buyer id (soft leak deterrence).
- [I] fields never leave the source store. Promotion is the only path by which internal content surfaces, and it surfaces as a transformed field value plus a public credit, not as the raw comment.
- Registry promotion: a supericon record with `design_state: render_approved` projects its [P] soul/face fields into the existing registry record shape (purpose, depicts, semantic_tags, synonyms, use_when, avoid_when, motion) for the live library.

## 4. Kind matrix (which sections are required)

| kind | required sections | typical extras |
|---|---|---|
| concept_icon | identity, face, soul, construction, pulse, design | wallet if premium |
| brand_logo | identity, face, soul, wallet | knowledge (company facts), brand_constraints |
| agent_tool | identity, face, soul, hands (mcp) | pulse.states |
| token | identity, face, soul, hands (swap/send), live | wallet |
| alert | identity, face, pulse (lifecycle, swells_on), live | retires_on required |
| message | identity, face, pulse (appears_on), wallet | hands (reveal) |
| game / persona / storefront | identity, face, soul, hands | wallet, live |
| map_lens | identity, face, hands (enter) | member query |

## 5. Worked example (abridged): si:orb-listening

Public projection:

```json
{
  "si_id": "si:orb-listening",
  "kind": "concept_icon",
  "label": "Orb Listening",
  "pack_id": "agent-pulse",
  "version": "0.6.0",
  "design_state": "shape_drawn",
  "face": {
    "depicts": "The orb wearing headphones, one sound wave per side split into top and bottom segments entering from outside each pad.",
    "style_renders": ["stroke", "solid", "elegance"]
  },
  "soul": {
    "purpose": "Show the agent is actively receiving audio input.",
    "semantic_tags": ["listening", "voice input", "receiving", "agent", "orb"],
    "synonyms": ["hearing", "capturing", "sound input", "attentive"],
    "use_when": "Voice or audio capture states in agent UIs.",
    "avoid_when": "Do not use for muted or device-level microphone toggles."
  },
  "pulse": { "motion": { "has_motion": true, "behavior": "side waves pulse inward toward the orb" } },
  "wallet": { "access_tier": "freemium", "gated_price": { "amount": 0.9, "currency": "USD", "per": "record" } }
}
```

Gated extension adds: must_communicate (agent, receiving audio, inbound, quiet), the full metaphor candidate list including the rejected ear/mic/steering-wheel history with reasons, anti_associations, distinct_from (speaking, blast, wave-idle), the exact construction recipe with arc math and clearances, motion.spec with timings, render_overrides (split waves in stroke/solid, single animated wave in elegance), and revision_history rounds 1 through 6 with owner verdicts.

Internal holds: the raw owner comments those rounds produced, evidence ids, editorial notes.
