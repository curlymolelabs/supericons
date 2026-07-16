# Supericon Profile Schema Review

> Candid multi-stakeholder review of the proposed Supericon profile/DNA schema.  
> Prepared May 2026. Source: direct review of the proposed schema, the existing SI Registry (`lib/si-registry/`), AIPS spec, and related vision docs.

---

## 1. What should a Supericon be?

A **Supericon should be an icon packaged with enough structured meaning metadata that software — not just humans — can select, render, animate, describe, and govern it correctly.**

It is the difference between:

- An SVG file named `warning.svg` (traditional icon)
- A structured profile that says: *"This icon warns. It is high-risk. It should pulse slowly, never rotate. Its accessible label is 'Action required: verify permissions.' It should not be used for informational notices. Its visual language is a shield, not a triangle."*

That is the useful ceiling. The Supericon is an **icon + its operating manual**, expressed in machine-readable form.

What it should **not** try to be (yet): a self-living entity that designs its own face, an on-chain NFT identity, or a replacement for the agent itself. Those are visionary concepts that belong in a separate research track, not in the v1 profile schema.

---

## 2. Does "the visual meaning layer for agentic software" make sense?

**Yes, as a north star. No, as a go-to-market positioning for v1.**

The phrase is evocative and directionally correct, but:
- "Visual meaning layer" is too abstract for any single buyer to act on.
- "Agentic software" is a narrow and fast-moving market — betting the entire positioning on it risks obsolescence if agentic UI takes a different shape.
- The phrase claims platform status before any one workflow is proven.

**Better v1 positioning (by audience):**

| Audience | Positioning |
|---|---|
| Developer | "Icons with enough metadata that your renderer knows what to do without guesswork." |
| Designer | "Your icon intent travels with the asset after handoff — meaning, use rules, accessibility, motion behavior." |
| AI agent | "A structured profile that tells me which icon to pick, how to style it, and what it means." |
| Product manager | "Icons that enforce correct usage and state across the product without design review on every placement." |

The north star can remain "visual meaning layer for agentic software" internally. Externally, lead with the specific problem solved.

---

## 3. What fields should be in the minimum useful Supericon profile?

Based on what the existing SI Registry already proves is useful (15K+ records in production), plus what agentic/accessibility use cases need, the **minimum v1 should be:**

| Field | Type | Why |
|---|---|---|
| `id` | string | Unique identifier (namespace prefixed, e.g. `si:ai-thinking`) |
| `name` | string | Human-readable label |
| `purpose` / `meaning` | string | One-sentence description of what this icon communicates |
| `category` | enum (controlled) | Domain bucket for search, grouping, routing |
| `semantic_tags` | string[] | Searchable keywords beyond the name |
| `use_when` | string | Positive guidance — when is this the right icon? |
| `avoid_when` | string | Negative guidance — when should this not be used? |
| `state` | enum (controlled) | What agentic/user state this icon represents (idle, thinking, blocked, confirmed, error, etc.) |
| `risk` | enum | `safe` / `caution` / `danger` |
| `accessibility.label` | string | ARIA/assistive technology label |
| `accessibility.role` | string | `img` / `status` / `alert` |
| `files.svg` | string (path) | Primary SVG asset |
| `version` | string | Schema/profile version for migration |

That's **13 fields** — enough to be useful, not enough to be a burden.

**Notable exclusions from "minimum":** tone, visual DNA/metaphor, motion rules, reduced_motion, style descriptors, file variants beyond SVG, provenance/license, and anything "internal signals" or routing scores. Those are extensions.

---

## 4. Which fields should be core, which optional?

**Core (every Supericon must have these):**

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

**Strongly recommended extensions (not required, but high value):**

- `accessibility.live` — for icons that update dynamically (`polite` / `assertive`)
- `motion.meaning` — what the animation communicates
- `motion.reduced_motion` — fallback for `prefers-reduced-motion`
- `files.static_svg` — non-animated variant
- `synonyms[]` — multilingual and colloquial names
- `related_icons[]` — alternatives, substitutes, compositions

**Optional extensions (add when they solve a real problem):**

- `visual.metaphor`
- `visual.silhouette`
- `visual.must_include[]` / `visual.must_avoid[]`
- `visual.style`
- `tone`
- `depicts`
- `license`
- `provenance` (author, source library, content hash)
- `domain`
- `substitutes[]` — direct replacements when this icon is unavailable

**Should be deferred to v2+:**

- Emotional valence scores
- Confidence / trust gradient mappings
- Event binding maps (e.g., AG-UI event → state)
- Generation prompts
- Design token references
- On-chain anchors
- Marketplace / pricing metadata

---

## 5. Should the schema include visual design DNA (metaphor, silhouette, geometry, color, motion, do/don't rules)?

**Yes, as an optional extension — but with a sharp caveat.**

Visual DNA is the most interesting and most dangerous part of the proposed schema.

**Why it's valuable:**
- Helps AI generation systems produce style-consistent icons ("must include: central focus + surrounding dots", "must avoid: robot face, brain, generic sparkle").
- Helps designers at different companies maintain visual consistency for the same semantic concept.
- Helps automated review systems flag icons that violate visual rules.
- Gives a "brief" to a rendering system that wants to generate or adapt an icon.

**Why it's dangerous:**
- Visual rules are subjective. "Must include: central focus" can be interpreted 100 ways.
- Style descriptors like "dark-native luminous technical signal" are not machine-enforceable. They are vibes.
- If visual DNA is in the profile but not validated, it becomes dead metadata — worse than no metadata, because it creates false confidence.
- Designers will not maintain visual DNA for 15,000 icons. It only scales for a curated subset (50–200 high-value agentic state icons).

**Recommendation:** Make visual DNA an **optional extension** that is only applied to curated, reviewed icons (premium packs, agent state kits). Do not include it in the core schema. When included, require at minimum:
- `visual.metaphor` — a 1-sentence intent description
- `visual.must_avoid[]` — concrete anti-patterns
- `visual.reduced_motion` fallback

Skip `visual.must_include[]` in v1. It creates more arguments than value. Move it to v2 after you've tested whether AI generation systems actually produce better results with it.

---

## 6. Should `risk` be a core field? Why or why not?

**Yes, `risk` should be core — but with a very narrow, practical definition.**

The proposed 3-level scale (`safe` / `caution` / `danger`) is correct:
- It's simple enough to be applied consistently.
- It maps to real product needs: safe icons can be placed anywhere; caution icons should draw attention; danger icons should require confirmation.
- It gives AI agents a clear signal about whether an icon choice could cause user harm if misused.

**The risk is NOT about the icon itself — it's about what the icon represents.** An icon for "delete production data" is dangerous because the action is dangerous, not because the icon design is aggressive. This distinction must be made clear in the schema documentation.

**What risk should NOT become:**
- A 10-point scale (too granular for reliable human assignment)
- A probability estimate (not the icon's job)
- A liability claim ("this icon is safe to use" — that invites legal problems)
- A replacement for actual confirmation dialogs

**Important:** An icon marked `risk: danger` should trigger renderer behavior: higher contrast, more prominent placement, optional confirmation-required treatment. But the profile itself is metadata, not enforcement. The renderer decides the behavior.

---

## 7. Should accessibility metadata be a core field? What is the minimum?

**Yes, accessibility metadata must be core. The minimum useful set:**

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
| `role` | **Required** | Tells assistive technology what the element is. For icons that represent state changes, `role: "status"` (polite) or `role: "alert"` (assertive) is more appropriate than `role: "img"`. The profile must distinguish. |
| `label` | **Required** | The text equivalent. Without this, screen reader users get nothing. |
| `live` | **Recommended** | Only for icons that change state dynamically. `polite` for background changes, `assertive` for urgent changes. |

**What should NOT be in accessibility core:**
- Detailed WCAG compliance scores (too context-dependent, too burdensome to maintain)
- Color contrast ratios (belongs in a visual audit tool, not in the icon profile)
- Font size / touch target recommendations (app-level concern, not icon-level)
- Full ARIA property suites (the renderer applies standard ARIA; the profile just needs `role`, `label`, `live`)

**The `reduced_motion` concern:** The proposed examples put `reduced_motion` inside `accessibility` and again inside `motion`. Pick one location. `motion.reduced_motion` makes more semantic sense. The accessibility section should contain only what assistive technology needs.

---

## 8. What fields are likely to become unnecessary, vague, or burdensome?

**High risk of becoming dead metadata:**

| Field | Risk | Why |
|---|---|---|
| `tone` | **High** | "calm" / "urgent" / "playful" / "authoritative" — these are design vibes, not enforceable rules. Without a controlled vocabulary and calibration data, tone will be applied inconsistently and ignored by consumers. |
| `visual.style` | **High** | "dark-native luminous technical signal" is poetry, not data. If you want style rules, use structured design tokens (stroke width, corner radius, color palette keys), not prose. |
| `visual.must_include[]` | **Medium** | Valuable in theory, unenforceable in practice without a visual review AI. Liable to conflict with different visual interpretations of the same concept. |
| `visual.silhouette` | **Medium** | "compact circular signal field" — useful as a design brief, but not machine-actionable. |
| Emotional valence scores | **Very High** | Without user testing, these are made-up numbers. They will decay, be ignored, or mislead. Defer until you have calibration data from real user studies. |
| `internalSignals` (existing registry) | **Low** | Useful for internal routing/scoring, but should never be exposed in public profiles. Keep it but gate it behind `access_tier`. |
| `routing_score` (existing registry) | **Medium** | Internal relevance score. Useful for search ranking. Should remain internal — not part of a public Supericon profile. |
| `evidence[]` (existing registry) | **Medium** | Lists why a record was created (e.g., "svg_payload", "approved_reference"). Useful for internal quality tracking, noise for public consumers. |

**Fields that will be burdensome to maintain at scale:**
- `visual.must_include[]` / `visual.must_avoid[]` — hard to author for 15K icons, impossible to validate automatically at that scale
- Per-icon `motion.meaning` — only justified for icons that actually animate; most icons don't
- `depicts` (from existing registry) — often duplicates `purpose`, hard to keep distinct

**Fields that are fine but should stay optional:**
- `synonyms[]` — already in use in the registry, proven useful, low burden
- `related_icons[]` — useful for discovery, low burden if curated
- `license` — important for enterprise, minimal burden (one string)

---

## 9. What real-world use cases would benefit from this schema?

**Immediate (v1 buyers):**

1. **AI product teams building agentic UIs** — Need a consistent set of icons for agent states (thinking, executing, blocked, confirmed, failed). Currently hand-rolled per product. A Supericon pack with profiles would save weeks of design + frontend work.

2. **Design system teams** — Already maintain icon libraries. The `use_when` / `avoid_when` / `state` / `accessibility` metadata would reduce wrong-icon-usage tickets and accessibility bugs. This is a documented pain point.

3. **AI coding agents (Copilot, Cursor, Claude Code) generating UIs** — Currently pick icons by guessing from names or using generic defaults. A searchable profile with `semantic_tags`, `use_when`, `avoid_when`, and `state` would dramatically improve icon selection quality in generated code.

4. **Accessibility auditors and teams** — Would benefit from structured `label`, `role`, and `live` data attached to every icon, rather than hunting through codebases for missing aria-labels.

**Near-future (v2 buyers):**

5. **Icon marketplace / distribution platforms** — Need structured metadata for search, filtering, licensing, and compatibility checks.

6. **Automated visual regression testing** — Could use `visual` rules and `motion` definitions to verify that icon implementations match their profiles.

7. **Multilingual product teams** — `synonyms` and semantic tags in multiple languages enable localized icon search.

8. **Figma / design tool plugins** — Could auto-suggest icons, validate usage, and export assets with metadata attached.

**Speculative (v3+):**

9. AI agents choosing their own icon representation from a profile catalog.
10. Runtime systems that adapt icon style, motion, and risk treatment based on user preferences or context.

---

## 10. What would make this schema useful to AI agents?

For an AI agent (coding agent, icon selector, UI generator) to benefit from a Supericon profile, the schema must enable three operations:

**Operation 1: Find the right icon by intent.**
The agent says: "I need an icon for when the system is thinking."
The schema must support search across: `semantic_tags` (["thinking", "planning", "processing"]), `state` ("thinking"), `category` ("agent_lifecycle"), and `use_when` free text.

**Operation 2: Know when NOT to use an icon.**
The agent should check `avoid_when` before placing an icon: "Do not use when the agent is actively changing something." This prevents the #1 failure mode of icon libraries — wrong icon in wrong context.

**Operation 3: Render the icon correctly.**
The agent reads `files.svg`, applies `accessibility.role` and `accessibility.label`, and if the icon represents a changing state, reads `motion.reduced_motion` for the `prefers-reduced-motion` fallback.

**What makes this harder for AI agents:**
- Prose-heavy fields (`meaning`, `use_when`, `visual.metaphor`) are good for search but require semantic understanding. Keep them concise (1–3 sentences max).
- Controlled vocabularies for `category`, `state`, `risk` are essential. Free text won't help agents disambiguate. The existing registry already uses controlled vocabularies — extend that pattern.
- An `examples[]` field showing correct/incorrect usage pairs would be higher value than `visual.must_include[]` for AI agents. Example: `[{context: "agent is planning", correct: true}, {context: "agent is deleting data", correct: false}]`.

---

## 11. What would make this schema useful to designers?

Designers will not fill out a JSON schema. They will use a tool. The schema must therefore support a tool-assisted workflow:

**Must-haves for designer adoption:**
- **Presets, not blank forms.** A designer selects "this is a status icon" → the schema pre-fills `category: "status_feedback"`, suggests `state` values, prompts for `risk`, and asks for an accessibility label.
- **Validation that catches mistakes, not enforces busywork.** Flag a missing `avoid_when` for a `risk: danger` icon. Do not flag a missing `visual.metaphor`.
- **The schema must survive Figma → code handoff.** Designers often describe intent in comments or meetings. The profile captures that intent in a format that survives export. `use_when` / `avoid_when` are the highest-value fields for this.

**What designers will find burdensome:**
- `visual.silhouette` — they designed the icon; describing its silhouette in words is redundant.
- `visual.must_include[]` / `visual.must_avoid[]` — only useful if the icon will be regenerated by AI later; for a final asset, this is make-work.
- Emotional valence fields — designers think about mood, but filling out a "trust score: 0.7" feels fake and unactionable.

**Recommendation:** The visual DNA extension should be positioned as a **generation brief**, not a description of the finished icon. If a designer is creating the final SVG, skip visual DNA. If a designer is defining rules for AI to later generate variants, include visual DNA. These are two different workflows.

---

## 12. What would make this schema useful to developers?

Developers consume icons through a renderer or component. The profile must answer the questions a developer has at integration time:

| Developer question | Profile field |
|---|---|
| What is this icon called? | `name` |
| What does it mean? | `purpose` / `meaning` |
| Where's the SVG? | `files.svg` |
| Is there a non-animated version? | `files.static_svg` |
| What's the accessible label? | `accessibility.label` |
| Does it need an ARIA live region? | `accessibility.live` |
| Is this safe to use without confirmation? | `risk` |
| What state does this represent? | `state` |
| Should I ever NOT use this? | `avoid_when` |

**What developers need that the proposed schema doesn't address well:**
- **Size / viewBox guarantee.** Every SVG in the profile should conform to a standard viewBox (e.g., `0 0 24 24`). Violations should be caught at profile validation time.
- **CSS customizability.** Can the icon be re-colored with `currentColor`? Does it rely on hardcoded fills? A `styling.currentColor` boolean would be useful.
- **Loading priority.** Is this a critical UI icon (inline SVG) or decorative (can lazy-load)? Indicated by `risk` + `state`, but could be explicit.
- **TypeScript types.** The schema should ship with TypeScript type definitions. JSON Schema alone is not enough for developer adoption.

**What developers will find burdensome:**
- `visual.*` fields — irrelevant to rendering.
- `motion.*` fields beyond `reduced_motion` — most developers use the animation defined in the component, not per-icon motion rules.
- `tone` — not actionable in code without a design system that maps tones to styles.

---

## 13. What are the biggest risks or failure modes?

**Risk 1: Schema obesity (the #1 killer).**
If the v1 schema has 40+ fields, nobody will adopt it. The existing registry already works with ~13 required fields. Each new field must earn its place by solving a problem that cannot be solved without it.

**Risk 2: Dead metadata.**
Fields like `tone`, `visual.style`, and emotional scores will be filled once and never maintained, validated, or consumed. Dead metadata is worse than no metadata because it erodes trust in the entire profile.

**Risk 3: Premature standardization.**
Declaring AIPS/Supericon profiles as "the standard" before one team has adopted it in production invites the "not invented here" reaction. Standards emerge from usage, not from specification documents. Ship a working system, let adoption prove the standard.

**Risk 4: Designer resistance.**
If the profile feels like a tax on the design workflow, designers will bypass it (export SVG only, skip the JSON). The profile must be generated with assistance, not filled out manually.

**Risk 5: Agent over-promising.**
If Supericon profiles claim to enable agents to "understand" icons, but agents lack the reasoning to actually use `use_when` / `avoid_when` / `risk` correctly, the profiles become a solution looking for a capable consumer.

**Risk 6: The "everything bagel" profile.**
The proposed schema tries to serve designers, developers, AI agents, accessibility tools, enterprise compliance, motion designers, and marketplace buyers simultaneously. Each audience needs a subset of the data. A single monolithic profile will satisfy nobody perfectly. Consider profile layers or separate views.

**Risk 7: Versioning chaos.**
If the schema evolves, profiles created under v1 must be identifiable as v1. The `version` field addresses this, but consumer code must be taught to handle multiple versions. This is non-trivial.

**Risk 8: The gap between "profile says" and "icon does."**
An icon profile says `state: thinking`, `motion.meaning: shows exploration and planning`. But if the actual SVG is a static gear, the profile is lying. Profile validation must include at least a basic asset existence check.

---

## 14. Lean v1 schema proposal

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

**That is 13 fields, 5 sections. Zero prose poetry. Every field is either validated against a controlled vocabulary or is a short string a human can parse at a glance.**

**What this v1 deliberately omits:**
- `tone` — not machine-actionable
- `visual.*` — move to v2 generation brief extension
- `motion.*` — move to v2
- `accessibility.live` — only needed for dynamic icons; add when the renderer supports it
- `files.static_svg` — add when you have animated SVGs that need a static fallback
- `synonyms[]` — valuable but secondary; add in v1.1
- `related_icons[]` — valuable but secondary
- `provenance` (license, author, hash) — important for enterprise; add in v1.1

---

## 15. Richer future schema proposal (v2+)

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
Note: `must_include[]` has been removed. `style_tokens` uses structured values, not prose.

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

## 16. What should we avoid deciding too early?

1. **The emotional/trust model.** Do not define confidence gradients, trust scores, or emotional valence until you have user research data showing that (a) users can perceive these differences in icon design and (b) the differences map to measurable outcomes. This is a thesis, not a feature.

2. **The generation prompt format.** Do not embed LLM prompts in the profile until you have tested whether they produce better icons than a designer creating the SVG directly. The generation prompt should be a tool output, not a schema field.

3. **On-chain anchors / NFT integration.** This will alienate enterprise buyers and distract from the practical value. If a customer explicitly asks for it, add it as a private extension. Do not lead with it.

4. **The monetization model.** Decide that a Supericon profile is useful first. Decide who pays for what second. The existing registry's `access_tier` (`public_open_record`, `protected_premium_record`) is already a clean monetization-ready layer without over-engineering.

5. **Cross-protocol event binding maps.** AG-UI events will change. MCP events will change. Define stable visual states (`state` enum) first. Map protocol events into those states later, as protocol-specific adapters.

6. **The governance model.** Controlled vocabularies need an RFC/change process, but defining a full governance body, extension registry, and compliance badge program before anyone is using the profiles is premature bureaucracy.

7. **The relationship between "Supericon profile" and "SI Registry record."** These are converging concepts but currently have different shapes. Decide whether the Supericon profile *is* the registry record (plus extensions) or a separate consumer-facing layer. Do not maintain two parallel schemas for the same icons.

8. **Multi-profile composition.** The proposal hints at icons being composable (an "AI thinking" icon composed of base "thinking" + "AI" overlay). The schema doesn't need to solve this yet. Get single-icon profiles right first.

---

## Summary Judgment

**The Supericon profile concept is valuable.** The core insight — that icons in agentic software need machine-readable meaning, usage rules, state context, risk awareness, and accessibility metadata — addresses a real and growing problem.

**The proposed schema is directionally correct but overspec'd for v1.** The example profile has ~30 fields across 8 sections. A successful v1 should have ~13 fields across 5 sections. Everything else should be opt-in extensions added only when a consumer demands it.

**The highest-ROI fields are `use_when`, `avoid_when`, `state`, `risk`, and `accessibility.label`.** These fields prevent the most common and most costly icon mistakes: wrong icon for context, missing accessibility, and dangerous icons placed without appropriate friction.

**The most dangerous fields are `tone`, `visual.style` (prose version), and emotional scores.** They create non-actionable metadata that erodes trust in the entire profile.

**The right sequence:**
1. Ship a lean v1 profile inside the existing Supericons product.
2. Build one renderer that consumes it (React component).
3. Get one design team or AI product team using it in production.
4. Measure what they actually use vs. what they ignore.
5. Add extensions based on real demand, not speculative value.

**Do not** try to standardize, evangelize, or monetize the schema before step 3 is complete.

**The name "Supericon" is strong.** It's short, memorable, and communicates "more than an icon." The concept it names should stay equally sharp.
