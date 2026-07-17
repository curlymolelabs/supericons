# Design Record Schema v1 (proposal)

Drafted 2026-07-06 from the Agent Pulse pilot (4 icons, 6 review rounds). Status: proposal awaiting owner approval; the v0 validator at `lib/si-registry/design-record-shape.js` implements a subset and will be upgraded to this once approved.

## Design goals

The schema captures everything learned while making an icon good, so the next icon (or a customer's adaptation of this one) starts from accumulated knowledge instead of zero. Two entities: the **pack record** holds the shared law (grammar, style, motion, craft rules); the **icon record** holds one icon's reasoning, geometry, and history.

Tier legend used below:

- **[public]** free core: everything needed to FIND the icon and USE it correctly.
- **[gated]** paid design intelligence: everything needed to ADAPT, REMIX, or REBUILD it well, and the system-level design language. Delivered via authenticated API/MCP only (x402 for agents, subscription for humans). Never in a public repo.
- **[internal]** never projected: raw staging data and process notes.

The tier principle: free tier drives adoption and search; paid tier sells the reasoning. Generous free `use_when`/`avoid_when` is deliberate: correct usage grows the ecosystem, and the money is in adaptation, not usage.

---

## Entity 1: Pack design record (one per pack)

```
pack_id                                  [public]
name, tagline, version                   [public]
status (draft | active | retired)        [public]

design_language:
  grammar:                               [gated]
    # semantic law, e.g. for agent-pulse:
    # - orb present = the agent is involved; no orb = the sound/signal itself
    # - wave direction = who acts (outbound = emitting, inbound = receiving)
    # - element count = intensity (1-2 quiet, 3+ loud)
    tokens: [ { rule, meaning, examples } ]
  territory_map:                         [gated]
    # which icon owns which visual zone, so new icons cannot collide
    # e.g. listening = inbound side waves; speaking = outbound side ripples;
    #      blast = corner arc pairs; echo = concentric full rings
    claims: [ { zone, owner_icon_id, notes } ]
  style_tokens:                          [gated]
    grid (24), safety_margin (1.5)
    stroke: { primary: 2, secondary: 1.8, caps: round, joins: round }
    # secondary elements always lighter than the subject (learned rule)
    solid: { primary_weight: 2.4, detail_min_gap: ">= stroke width" }
    palette: { ink, dim, accent, accent_rule: "accent only ever means active/hot" }
    layered: { tile_spec, orb_spec (gradients, specular cap), glass_rules }
  motion_language:                       [gated]
    patterns: [ { name (seq, eq, beat, ripple, flow...), keyframes, defaults } ]
    timing_rules: { click_max_ms: 500, hover_ms: [1500, 3000],
                    ambient_rest: "2-5s rest inside every loop",
                    reduced_motion: "static first frame must read complete" }
  craft_rules:                           [gated]
    # accumulated, machine-checkable where possible:
    # - one idea per icon, at most one secondary element
    # - optical center over mathematical center
    # - detail scales down with size and DOWN with static renders,
    #   because motion carries meaning the geometry then need not
    # - gap between strokes never thinner than the stroke
    rules: [ { id, rule, origin (which review taught it) } ]
  render_styles:                         [public names, gated recipes]
    # public: the list (stroke, solid, elegance)
    # gated: the full recipe for reproducing each style

provenance: { created, updated, review_rounds_total }   [public summary]
```

## Entity 2: Icon design record (one per icon)

```
icon_id, label, pack_id, version         [public]
design_state                             [public]
  # metaphor_proposed -> metaphor_approved -> shape_drawn ->
  # shape_approved -> render_approved
  # gate rule: past the metaphor gate requires exactly one chosen metaphor

face:
  depicts                                [public]
  style_renders (names)                  [public]
  render_overrides                       [gated]
    # per-render detail scaling, e.g. listening: stroke/solid carry the
    # split side waves; elegance carries one animated wave per side
  preview_assets (static SVG per render) [public at pack price policy]

soul:
  purpose                                [public]
  semantic_tags, synonyms                [public]   # search and MCP recommend
  use_when, avoid_when                   [public]   # correct-usage guidance
  must_communicate:                      [gated]
    actor, action, direction, intensity
  mindmap:
    associations                         [gated]
    metaphor_candidates:                 [gated]
      [ { kind: human_convention | device_convention | agent_native,
          idea, verdict: chosen | candidate | rejected | reserved, reason } ]
      # rejected entries with reasons are kept forever; they are the
      # anti-pattern library that prevents repeat failures
    anti_associations                    [gated]
      # "must never read as": sun, steering wheel, wifi, drone...
  distinct_from:                         [gated]
    [ { icon_id, differentiator } ]      # pack-collision constraints

construction:                            [gated]
  grid, recipe (exact geometry: coordinates, radii, sweep flags, clearances,
  weight hierarchy), so the shape is reproducible from text alone

pulse:
  motion.has_motion, motion.behavior     [public]
  motion.spec                            [gated]
    { pattern, cycle_ms, stagger_ms, rest, reduced_motion }

hands:                                   [action list public, wiring gated]
  actions: [ { label, kind } ]           # future: what this supericon can do
  implementation                         [gated]

wallet:                                  [public]
  access_tier, gated_price, license_terms

revision_history:                        [gated]
  [ { round, change, verdict, taught_us } ]
  # the compressed 6-rounds-to-good path; the single highest-leverage
  # field for a buyer who wants to adapt the icon

external_comments:                       [internal]
  [ { author, date, body, status: raw | distilled | promoted | discarded } ]
  # promoted items surface as anonymized provenance credits [public]

evidence, editorial_notes               [internal]
```

## Promotion mapping (design record -> registry record)

On promotion: purpose -> purpose; depicts -> depicts; semantic_tags/synonyms -> same;
use_when/avoid_when -> same; pulse.motion.has_motion -> motion; design_state
render_approved is a precondition for registry status leaving draft.

## Why these tier lines

Public answers: what is this, when do I use it, how do I find it. That grows
search, MCP adoption, and correct usage, which feed the flywheel.

Gated answers: why does this shape work, how do I redraw or re-style it in my
brand, what must it never look like, how does it move, and how did it get good.
That is the product: it is exactly the knowledge that took six review rounds to
produce for two icons, and it lets a frontier agent reach a correct adaptation
in one round instead.

Internal stays internal: raw community input until distilled and promoted, and
process notes that are nobody's business.
```
