# Supericon Schema Review — Stakeholder Analysis & Schema Recommendations

> Independent multi-stakeholder review of the Supericon profile/DNA schema concept.
> Prepared May 20, 2026. Reviews the working proposal against the existing SI Registry (`lib/si-registry/`), AIPS spec, controlled vocabularies, and production record shapes.

---

## Executive Summary

The Supericon concept — an icon packaged with machine-readable meaning, usage rules, state context, risk awareness, and accessibility metadata — addresses a real gap. The existing SI Registry already proves the value of `use_when`, `avoid_when`, `purpose`, `category`, and `semantic_tags` across 15K+ records. The question is not whether metadata helps; it is **which metadata earns its place in a lean, practical profile**.

The working proposal (8 sections: Identity, Meaning, Usage Rules, State/Tone/Risk, Visual DNA, Motion Rules, Accessibility, Files) is directionally sound but needs pruning, reordering, and a clear core-vs-extension boundary before it can ship.

---

## 1. What Should a Supericon Be?

A Supericon should be **an icon + its operating manual, expressed in machine-readable form**.

The ceiling: an SVG named `warning.svg` becomes a profile that says *"this warns, it is high-risk, it should pulse slowly, its accessible label is 'Action required: verify permissions,' do not use it for informational notices, its visual language is a shield not a triangle."*

The floor: it must not try to be a self-living entity, an NFT identity, or a replacement for the agent itself. Those are research tracks, not v1 schema fields.

**Key distinction the existing registry already gets right:** the profile describes *intent and rules*, not the SVG path data. The SVG is the asset; the profile is the contract.

---

## 2. Does "The Visual Meaning Layer for Agentic Software" Make Sense?

**As a north star: yes. As a v1 positioning: no.**

The phrase is evocative but too abstract for any buyer to act on. "Agentic software" is a narrow, fast-moving market. Betting the entire positioning on it risks obsolescence.

**Better v1 positioning by audience:**

| Audience | What to say |
|---|---|
| Developer | "Icons with enough metadata that your renderer knows what to do without guesswork." |
| Designer | "Your icon intent travels with the asset after handoff — meaning, use rules, accessibility, motion." |
| AI agent | "A structured profile that tells me which icon to pick, how to style it, and what it means." |
| Product manager | "Icons that enforce correct usage and state across the product without design review on every placement." |

Keep the north star internally. Lead with the specific problem solved externally.

---

## 3. Minimum Useful Supericon Profile Schema

Based on what the SI Registry already proves works in production (15K+ records with `use_when`, `avoid_when`, `purpose`, `category`, `semantic_tags`), the minimum v1 should be:

| Field | Type | Source | Why |
|---|---|---|---|
| `id` | string | SI Registry `icon_id` | Unique identifier (namespace prefixed, e.g. `si:ai-thinking`) |
| `name` | string | SI Registry `label` | Human-readable label |
| `purpose` | string | SI Registry `purpose` | One-sentence description of what this icon communicates |
| `category` | enum | SI Registry controlled vocab | Domain bucket for search, grouping, routing |
| `semantic_tags` | string[] | SI Registry `semantic_tags` | Searchable keywords beyond the name |
| `use_when` | string | SI Registry `use_when` | Positive guidance — when is this the right icon? |
| `avoid_when` | string | SI Registry `avoid_when` | Negative guidance — when should this not be used? |
| `state` | enum | SI Registry (sparse) | What agentic/user state this icon represents |
| `risk` | enum | New | `safe` / `caution` / `danger` |
| `accessibility.label` | string | New | ARIA/assistive technology label |
| `accessibility.role` | string | New | `img` / `status` / `alert` |
| `files.svg` | string (path) | New | Primary SVG asset reference |
| `version` | string | SI Registry `version` | Profile schema version for migration |

**13 fields. 5 sections. Zero prose poetry.** Every field is either validated against a controlled vocabulary or is a short string a human can parse at a glance.

---

## 4. Core vs Optional Extensions

### Core (every Supericon must have)

- `id`
- `name`
- `purpose`
- `category`
- `semantic_tags`
- `use_when`
- `avoid_when`
- `state`
- `risk`
- `accessibility.label`
- `accessibility.role`
- `files.svg`
- `version`

### Strongly Recommended (not required, but high value)

- `accessibility.live` — for icons that update dynamically (`polite` / `assertive`)
- `motion.meaning` — what the animation communicates
- `motion.reduced_motion` — fallback for `prefers-reduced-motion`
- `files.static_svg` — non-animated variant
- `synonyms[]` — multilingual and colloquial names (already in SI Registry)
- `related_icons[]` — alternatives, substitutes, compositions

### Optional Extensions (add when they solve a real problem)

- `visual.metaphor`
- `visual.silhouette`
- `visual.must_avoid[]`
- `visual.style`
- `tone`
- `depicts` (already in SI Registry but often duplicates `purpose`)
- `license`
- `provenance` (author, source library, content hash)
- `domain`
- `substitutes[]`

### Defer to v2+

- Emotional valence scores (0-1 floats for trust, calm, urgency, etc.)
- Confidence / trust gradient mappings
- Event binding maps (AG-UI event → state)
- Generation prompts
- Design token references
- On-chain anchors
- Marketplace / pricing metadata
- `delegation_depth`, `stream_anchor`, `tool_affiliations`

---

## 5. Should the Schema Include Visual Design DNA?

**Yes, as an optional extension — with a sharp caveat.**

Visual DNA is the most interesting and most dangerous part of the proposed schema.

**Why it's valuable:**
- Helps AI generation systems produce style-consistent icons.
- Helps designers maintain visual consistency for the same semantic concept.
- Helps automated review systems flag icons that violate visual rules.
- Gives a "brief" to a rendering system that wants to generate or adapt an icon.

**Why it's dangerous:**
- Visual rules are subjective. "Must include: central focus" can be interpreted 100 ways.
- Style descriptors like "dark-native luminous technical signal" are not machine-enforceable. They are vibes.
- If visual DNA is in the profile but not validated, it becomes dead metadata — worse than no metadata, because it creates false confidence.
- Designers will not maintain visual DNA for 15,000 icons. It only scales for a curated subset (50–200 high-value agentic state icons).

**Recommendation:** Make visual DNA an **optional extension** applied only to curated, reviewed icons (premium packs, agent state kits). Do not include it in the core schema. When included, require at minimum:
- `visual.metaphor` — a 1-sentence intent description
- `visual.must_avoid[]` — concrete anti-patterns

Skip `visual.must_include[]` in v1. It creates more arguments than value. Move it to v2 after testing whether AI generation systems actually produce better results with it.

**Replace prose style with structured tokens when possible:**

```json
"visual": {
  "metaphor": "A live thought field forming around a center.",
  "must_avoid": ["robot face", "brain", "generic sparkle", "spinner"],
  "style_tokens": {
    "stroke_width": 2,
    "corner_radius": 2,
    "palette": "neutral_cool"
  }
}
```

---

## 6. Should `risk` Be a Core Field?

**Yes, with a very narrow, practical definition.**

The proposed 3-level scale (`safe` / `caution` / `danger`) is correct:
- Simple enough to be applied consistently.
- Maps to real product needs: safe icons can be placed anywhere; caution icons should draw attention; danger icons should require confirmation.
- Gives AI agents a clear signal about whether an icon choice could cause user harm if misused.

**Critical distinction:** The risk is NOT about the icon itself — it's about what the icon represents. An icon for "delete production data" is dangerous because the action is dangerous, not because the icon design is aggressive.

**What risk should NOT become:**
- A 10-point scale (too granular for reliable human assignment)
- A probability estimate (not the icon's job)
- A liability claim ("this icon is safe to use")
- A replacement for actual confirmation dialogs

**Important:** An icon marked `risk: danger` should trigger renderer behavior: higher contrast, more prominent placement, optional confirmation-required treatment. But the profile itself is metadata, not enforcement. The renderer decides the behavior.

---

## 7. Should Accessibility Metadata Be a Core Field?

**Yes. The minimum useful set:**

```json
{
  "accessibility": {
    "role": "img",
    "label": "AI thinking",
    "live": "polite"
  }
}
```

| Field | Required? | Rationale |
|---|---|---|
| `role` | Required | Tells assistive technology what the element is. `img`, `status`, or `alert`. |
| `label` | Required | The text equivalent. Without this, screen reader users get nothing. |
| `live` | Recommended | Only for icons that change state dynamically. `polite` or `assertive`. |

**What should NOT be in accessibility core:**
- Detailed WCAG compliance scores (too context-dependent)
- Color contrast ratios (belongs in a visual audit tool)
- Font size / touch target recommendations (app-level concern)
- Full ARIA property suites (the renderer applies standard ARIA)

**Location note:** The proposed examples put `reduced_motion` inside both `accessibility` and `motion`. Pick one. `motion.reduced_motion` makes more semantic sense. The accessibility section should contain only what assistive technology needs.

---

## 8. Fields Likely to Become Unnecessary, Vague, or Burdensome

| Field | Risk | Why |
|---|---|---|
| `tone` | High | "calm" / "urgent" / "playful" — design vibes, not enforceable rules. Without a controlled vocabulary and calibration data, tone will be applied inconsistently and ignored. |
| `visual.style` (prose) | High | "dark-native luminous technical signal" is poetry, not data. Use structured design tokens instead. |
| `visual.must_include[]` | Medium | Valuable in theory, unenforceable in practice without a visual review AI. |
| `visual.silhouette` | Medium | "compact circular signal field" — useful as a design brief, but not machine-actionable. |
| Emotional valence scores | Very High | Without user testing, these are made-up numbers. They will decay, be ignored, or mislead. |
| `internalSignals` (existing registry) | Low | Useful for internal routing/scoring, but should never be exposed in public profiles. |
| `routing_score` (existing registry) | Medium | Internal relevance score. Should remain internal. |
| `evidence[]` (existing registry) | Medium | Useful for internal quality tracking, noise for public consumers. |

**Fields that will be burdensome to maintain at scale:**
- `visual.must_include[]` / `visual.must_avoid[]` — hard to author for 15K icons
- Per-icon `motion.meaning` — only justified for icons that actually animate
- `depicts` — often duplicates `purpose`, hard to keep distinct

---

## 9. Real-World Use Cases That Benefit

**Immediate (v1 buyers):**

1. **AI product teams building agentic UIs** — Need a consistent set of icons for agent states (thinking, executing, blocked, confirmed, failed). Currently hand-rolled per product.

2. **Design system teams** — Already maintain icon libraries. The `use_when` / `avoid_when` / `state` / `accessibility` metadata would reduce wrong-icon-usage tickets and accessibility bugs.

3. **AI coding agents (Copilot, Cursor, Claude Code) generating UIs** — Currently pick icons by guessing from names. A searchable profile with `semantic_tags`, `use_when`, `avoid_when`, and `state` would dramatically improve icon selection quality.

4. **Accessibility auditors** — Would benefit from structured `label`, `role`, and `live` data attached to every icon.

**Near-future (v2 buyers):**

5. **Icon marketplace / distribution platforms** — Need structured metadata for search, filtering, licensing.

6. **Automated visual regression testing** — Could use `visual` rules and `motion` definitions to verify implementations match profiles.

7. **Multilingual product teams** — `synonyms` in multiple languages enable localized icon search.

8. **Figma / design tool plugins** — Could auto-suggest icons, validate usage, and export with metadata.

---

## 10. What Makes This Schema Useful to AI Agents?

For an AI agent to benefit, the schema must enable three operations:

**Operation 1: Find the right icon by intent.**
The agent says: "I need an icon for when the system is thinking."
The schema must support search across: `semantic_tags` (["thinking", "planning", "processing"]), `state` ("thinking"), `category` ("agent_lifecycle"), and `use_when` free text.

**Operation 2: Know when NOT to use an icon.**
The agent should check `avoid_when` before placing an icon. This prevents the #1 failure mode of icon libraries — wrong icon in wrong context.

**Operation 3: Render the icon correctly.**
The agent reads `files.svg`, applies `accessibility.role` and `accessibility.label`, and if the icon represents a changing state, reads `motion.reduced_motion` for the `prefers-reduced-motion` fallback.

**What makes this harder for AI agents:**
- Prose-heavy fields (`meaning`, `use_when`, `visual.metaphor`) are good for search but require semantic understanding. Keep them concise (1–3 sentences max).
- Controlled vocabularies for `category`, `state`, `risk` are essential. Free text won't help agents disambiguate. The existing registry already uses controlled vocabularies — extend that pattern.
- An `examples[]` field showing correct/incorrect usage pairs would be higher value than `visual.must_include[]` for AI agents.

---

## 11. What Makes This Schema Useful to Designers?

Designers will not fill out a JSON schema. They will use a tool.

**Must-haves for designer adoption:**
- **Presets, not blank forms.** A designer selects "this is a status icon" → the schema pre-fills `category: "status_feedback"`, suggests `state` values, prompts for `risk`, and asks for an accessibility label.
- **Validation that catches mistakes, not enforces busywork.** Flag a missing `avoid_when` for a `risk: danger` icon. Do not flag a missing `visual.metaphor`.
- **The schema must survive Figma → code handoff.** `use_when` / `avoid_when` are the highest-value fields for this.

**What designers will find burdensome:**
- `visual.silhouette` — they designed the icon; describing its silhouette in words is redundant.
- `visual.must_include[]` / `visual.must_avoid[]` — only useful if the icon will be regenerated by AI later.
- Emotional valence fields — filling out a "trust score: 0.7" feels fake and unactionable.

**Recommendation:** Position visual DNA as a **generation brief**, not a description of the finished icon. If a designer is creating the final SVG, skip visual DNA. If a designer is defining rules for AI to later generate variants, include visual DNA. These are two different workflows.

---

## 12. What Makes This Schema Useful to Developers?

Developers consume icons through a renderer or component. The profile must answer integration-time questions:

| Developer question | Profile field |
|---|---|
| What is this icon called? | `name` |
| What does it mean? | `purpose` |
| Where's the SVG? | `files.svg` |
| Is there a non-animated version? | `files.static_svg` |
| What's the accessible label? | `accessibility.label` |
| Does it need an ARIA live region? | `accessibility.live` |
| Is this safe to use without confirmation? | `risk` |
| What state does this represent? | `state` |
| Should I ever NOT use this? | `avoid_when` |

**What developers need that the proposed schema doesn't address well:**
- **Size / viewBox guarantee.** Every SVG should conform to a standard viewBox (e.g., `0 0 24 24`). Violations should be caught at profile validation time.
- **CSS customizability.** Can the icon be re-colored with `currentColor`? A `styling.currentColor` boolean would be useful.
- **TypeScript types.** The schema should ship with TypeScript type definitions. JSON Schema alone is not enough for developer adoption.

**What developers will find burdensome:**
- `visual.*` fields — irrelevant to rendering.
- `motion.*` fields beyond `reduced_motion` — most developers use the animation defined in the component.
- `tone` — not actionable in code without a design system that maps tones to styles.

---

## 13. Biggest Risks and Failure Modes

**Risk 1: Schema obesity (the #1 killer).**
If the v1 schema has 40+ fields, nobody will adopt it. The existing registry already works with ~13 required fields. Each new field must earn its place.

**Risk 2: Dead metadata.**
Fields like `tone`, `visual.style`, and emotional scores will be filled once and never maintained. Dead metadata erodes trust in the entire profile.

**Risk 3: Premature standardization.**
Declaring AIPS as "the standard" before one team has adopted it in production invites the "not invented here" reaction. Standards emerge from usage, not from specification documents.

**Risk 4: Designer resistance.**
If the profile feels like a tax on the design workflow, designers will bypass it (export SVG only, skip the JSON).

**Risk 5: Agent over-promising.**
If profiles claim to enable agents to "understand" icons, but agents lack the reasoning to actually use `use_when` / `avoid_when` / `risk` correctly, the profiles become a solution looking for a capable consumer.

**Risk 6: The "everything bagel" profile.**
The proposed schema tries to serve designers, developers, AI agents, accessibility tools, enterprise compliance, motion designers, and marketplace buyers simultaneously. Each audience needs a subset. Consider profile layers or separate views.

**Risk 7: Versioning chaos.**
If the schema evolves, profiles created under v1 must be identifiable as v1. The `version` field addresses this, but consumer code must be taught to handle multiple versions.

**Risk 8: The gap between "profile says" and "icon does."**
An icon profile says `state: thinking`, `motion.meaning: shows exploration and planning`. But if the actual SVG is a static gear, the profile is lying. Profile validation must include at least a basic asset existence check.

**Risk 9: Convergence with SI Registry.**
The Supericon profile and the SI Registry record are converging concepts but currently have different shapes. Decide whether the Supericon profile *is* the registry record (plus extensions) or a separate consumer-facing layer. Do not maintain two parallel schemas for the same icons.

---

## 14. Lean v1 Schema Proposal

```jsonc
{
  // ── Identity ──
  "id": "si:ai-thinking",           // namespaced unique ID
  "name": "AI Thinking",            // human-readable label
  "version": "1.0.0",               // profile schema version

  // ── Meaning ──
  "purpose": "An AI agent is thinking, planning, or deciding what to do next.",
  "category": "agent_lifecycle",    // controlled vocabulary
  "semantic_tags": ["thinking", "planning", "ai", "processing"],
  "use_when": "Use when an AI agent is preparing an answer or choosing a next step.",
  "avoid_when": "Do not use when the agent is actively changing something, waiting for approval, blocked, or failed.",

  // ── State & Risk ──
  "state": "thinking",              // controlled: idle | thinking | executing | blocked | needs_approval | confirmed | error | completed
  "risk": "safe",                   // safe | caution | danger

  // ── Accessibility ──
  "accessibility": {
    "role": "img",                  // img | status | alert
    "label": "AI thinking"          // screen reader text
  },

  // ── Files ──
  "files": {
    "svg": "icons/ai-thinking.svg"
  }
}
```

**13 fields, 5 sections. Zero prose poetry. Every field is either validated against a controlled vocabulary or is a short string a human can parse at a glance.**

**What this v1 deliberately omits:**
- `tone` — not machine-actionable
- `visual.*` — move to v2 generation brief extension
- `motion.*` — move to v2
- `accessibility.live` — only needed for dynamic icons; add when the renderer supports it
- `files.static_svg` — add when you have animated SVGs that need a static fallback
- `synonyms[]` — valuable but secondary; add in v1.1
- `related_icons[]` — valuable but secondary
- `provenance` — important for enterprise; add in v1.1

---

## 15. Richer Future Schema (v2+)

**When v1 is proven useful, add these extensions as separate, opt-in profile layers:**

### Extension: Motion (for animated icons only)
```jsonc
"motion": {
  "meaning": "Shows exploration and planning, not waiting or completion.",
  "pace": "calm_continuous",
  "reduced_motion": "Show the active thought field statically."
}
```

### Extension: Visual Generation Brief (for icons that AI may generate or adapt)
```jsonc
"visual": {
  "metaphor": "A live thought field forming around a center.",
  "must_avoid": ["robot face", "brain", "generic sparkle", "spinner"],
  "style_tokens": {
    "stroke_width": 2,
    "corner_radius": 2,
    "palette": "neutral_cool"
  }
}
```

### Extension: Accessibility Enhanced (for dynamic state icons)
```jsonc
"accessibility": {
  "role": "status",
  "label": "AI thinking",
  "live": "polite"
}
```

### Extension: Context & Relationships
```jsonc
"synonyms": ["AI processing", "agent thinking", "model planning"],
"related_icons": ["si:ai-executing", "si:ai-blocked", "si:ai-confirmed"],
"substitutes": ["si:loading-generic"]
```

### Extension: Provenance & Compliance
```jsonc
"provenance": {
  "author": "Supericons",
  "source_library": "lucide",
  "license": "MIT",
  "content_hash": "sha256:abc123..."
}
```

### Extension: Dynamic State Binding (v3+)
```jsonc
"state_bindings": {
  "ag_ui": {
    "text_message_start": "thinking",
    "tool_call_start": "executing",
    "tool_call_end": "completed",
    "run_failed": "error"
  }
}
```

This enables a renderer to map protocol events → visual states without hardcoding per-icon logic.

---

## 16. What to Avoid Deciding Too Early

1. **The emotional/trust model.** Do not define confidence gradients, trust scores, or emotional valence until you have user research data showing that (a) users can perceive these differences in icon design and (b) the differences map to measurable outcomes. This is a thesis, not a feature.

2. **The generation prompt format.** Do not embed LLM prompts in the profile until you have tested whether they produce better icons than a designer creating the SVG directly.

3. **On-chain anchors / NFT integration.** This will alienate enterprise buyers and distract from the practical value. If a customer explicitly asks for it, add it as a private extension.

4. **The monetization model.** Decide that a Supericon profile is useful first. Decide who pays for what second. The existing registry's `access_tier` (`public_open_record`, `protected_premium_record`) is already a clean monetization-ready layer.

5. **Cross-protocol event binding maps.** AG-UI events will change. MCP events will change. Define stable visual states (`state` enum) first. Map protocol events into those states later, as protocol-specific adapters.

6. **The governance model.** Controlled vocabularies need an RFC/change process, but defining a full governance body, extension registry, and compliance badge program before anyone is using the profiles is premature bureaucracy.

7. **The relationship between "Supericon profile" and "SI Registry record."** These are converging concepts but currently have different shapes. Decide whether the Supericon profile *is* the registry record (plus extensions) or a separate consumer-facing layer. Do not maintain two parallel schemas for the same icons.

8. **Multi-profile composition.** The proposal hints at icons being composable (an "AI thinking" icon composed of base "thinking" + "AI" overlay). The schema doesn't need to solve this yet. Get single-icon profiles right first.

---

## Stakeholder Perspective Summary

| Stakeholder | What they care about | What they ignore |
|---|---|---|
| Developer | `files.svg`, `accessibility.label`, `risk`, `state`, `avoid_when` | `visual.*`, `tone`, `motion.*` (beyond reduced_motion) |
| Designer | `use_when`, `avoid_when`, `purpose`, `accessibility.label` | `visual.silhouette`, emotional scores, `state_bindings` |
| Product manager | `risk`, `state`, `category`, `use_when` | `visual.*`, `motion.*`, `provenance` |
| End user | Correct icon for context, accessible label, appropriate risk signaling | Entire schema (invisible to them) |
| Accessibility user | `accessibility.role`, `accessibility.label`, `accessibility.live`, `motion.reduced_motion` | Everything else |
| AI agent | `semantic_tags`, `state`, `use_when`, `avoid_when`, `risk`, `files.svg` | `visual.style` (prose), `tone`, emotional scores |
| Design system maintainer | `category`, `state`, `use_when`, `avoid_when`, `related_icons`, `synonyms` | `visual.metaphor`, `motion.*`, `provenance` |
| Icon library maintainer | `id`, `version`, `category`, `semantic_tags`, `status`, `access_tier` | `visual.*`, `motion.*`, `state_bindings` |
| Business / monetization | `access_tier`, `is_premium`, `license`, `provenance`, `category` | `motion.*`, `visual.*`, `state_bindings` |

---

## Recommended Next Steps

1. **Ship a lean v1 profile inside the existing Supericons product.** Start with the 13-field core schema above.

2. **Build one renderer that consumes it** (React component). Map `state` → visual treatment, `risk` → styling intensity, `accessibility` → ARIA attributes.

3. **Get one design team or AI product team using it in production.** Measure what they actually use vs. what they ignore.

4. **Add extensions based on real demand, not speculative value.** If nobody asks for `visual.metaphor`, don't ship it. If everyone asks for `motion.reduced_motion`, promote it to core.

5. **Decide the SI Registry convergence question.** Either the Supericon profile becomes the canonical registry record shape, or it becomes a consumer-facing projection of the registry record. Do not maintain both.

**Do not** try to standardize, evangelize, or monetize the schema before step 3 is complete.

---

## Final Judgment

The Supericon profile concept is **valuable and timely**. The core insight — that icons in agentic software need machine-readable meaning, usage rules, state context, risk awareness, and accessibility metadata — addresses a real and growing problem.

The proposed schema is **directionally correct but overspec'd for v1**. The example profile has ~30 fields across 8 sections. A successful v1 should have ~13 fields across 5 sections. Everything else should be opt-in extensions added only when a consumer demands it.

The **highest-ROI fields** are `use_when`, `avoid_when`, `state`, `risk`, and `accessibility.label`. These fields prevent the most common and most costly icon mistakes: wrong icon for context, missing accessibility, and dangerous icons placed without appropriate friction.

The **most dangerous fields** are `tone`, `visual.style` (prose version), and emotional scores. They create non-actionable metadata that erodes trust in the entire profile.

The right sequence: **ship lean, measure usage, extend based on demand.** The name "Supericon" is strong. The concept it names should stay equally sharp.
