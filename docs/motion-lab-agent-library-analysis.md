# Motion Lab Agent Library: Audit, Analysis, and Agent Journey Map

**Date:** April 11, 2026  
**Status:** Strategy document. Pre-implementation.  
**Input documents:** `motion-lab-single-source-of-truth-audit.md`, `agent-library-plan.md`, `agent-library-feasibility.md`

---

## Part 1: Architecture Audit Summary

### The Problem We Confirmed

The Motion Lab product currently has two separate preset systems:

| Interface | File | Preset count | Origin |
|---|---|---|---|
| Browser UI | `store.js` | 80 presets | Built first, human-tested |
| MCP tools | `lib/motion-lab-workflow.js` | 12 presets | Added later, separately authored |

The 12-preset MCP registry was not derived from the 80-preset browser system. It was written as a new file in a single commit (`0c8f3e0`), never reconciled with the source. It is not a curated subset. It is an architectural accident.

### The Two Decisions

**Decision 1 (cleanup): Remove the 12 orphaned MCP presets. Expose the authoritative 80.**

The 12 are not a deliberate MVP. They are an artifact of implementation timing. Keeping them means agents operate on fiction. Removing them and replacing with the 80 browser-proven presets is a pure upgrade with no regression.

**Decision 2 (build): After consolidation, build a semantic layer on top of the 80, making them genuinely useful to agents - not just queryable.**

This is the agent library plan, now properly scoped to 80 presets across 4 categories (Motion, Entrances, Exits, Special) rather than the previously assumed 12.

### The Correct Sequence

1. Fix the registry split: one canonical preset source, both browser and MCP import from it
2. Expose all 80 presets via `list_motion_presets()` MCP tool
3. Build the agent metadata layer (emotional tone, context guidance, intensity guidance)
4. Enrich MCP tool output to return structured metadata, not bare names

---

## Part 2: Can an Agent Use Motion Lab as Well as a Human?

### The Human Advantage in the Browser

When a human opens Motion Lab they have:

- **Visual preview**: see the animation playing on an icon in real time
- **Emotional intuition**: immediate gut-feel about whether the motion fits
- **Side-by-side exploration**: try `bounce` then `pop` and compare in seconds
- **Serendipitous discovery**: stumble onto a preset that is better than what they came looking for
- **Adjustment loops**: nudge intensity one step up, see how it changes, nudge back
- **Taste-based calibration**: "this technically fits the criteria but it looks wrong on this specific icon shape"

These are genuine advantages. A human in the browser is not just selecting from a list. They are experiencing motion and making aesthetic judgments.

### Where the Agent is Currently Blind

An agent receiving `list_motion_presets()` today gets a list of strings: `pulse`, `bounce`, `magneticIn`. It has no:

- Visual experience of what each preset looks like
- Emotional mapping of what each preset signals
- Context guidance on where each preset belongs or should never be used
- Intensity guidance for specific use cases
- Understanding of how two presets differ if their names are similar

The agent falls back on training priors. That produces average output: usable but not excellent, not product-aware, not contextually grounded.

### Where an Agent with the Library Can Match the Human

A well-built agent library compensates for visual blindness with structured knowledge. The key insight is that **most of what a human does visually can be encoded as semantic metadata**:

| Human does this visually | Library encodes this as |
|---|---|
| "This feels energetic" | `emotional_tone: ["energetic", "playful"]` |
| "This fits a success state" | `recommended_contexts: ["success-confirmation", "attention-cue"]` |
| "This would be wrong on a delete button" | `avoid_for: ["destructive-actions", "error-states"]` |
| "50% intensity is right here" | `context_intensity_guidance: { success: 65, cta: 85, loading: 50 }` |
| "This is a quick snap, not a slow drift" | `timing_character: "fast-snap"`, `duration_range_ms: [200, 400]` |
| "This looks like something moving in from offscreen" | `visual_character: "Icon translates in from below with a slight spring, landing on baseline position"` |

### Where an Agent with the Library Can Exceed the Human

This is the strategic insight. Agents are better than humans at:

**1. Consistency at scale**  
A human building a dashboard with 30 icons will make 30 individual aesthetic judgments. Fatigue sets in. By icon 20 they have drifted. An agent applies the same calibrated rules to all 30. Motion semantics are consistent across the entire UI.

**2. Constraint enforcement**  
Tell an agent "no high-intensity animations on destructive actions" and it will apply this rule perfectly across the whole product. A human might forget. The agent never forgets a constraint it has been given.

**3. Context-aware pairing**  
Humans browse presets then think about icons. An agent can reason in both directions simultaneously: "given this icon (settings, enterprise fintech context), what is the correct preset, intensity, and trigger?" The agent library gives it the vocabulary to reason this way rather than searching linearly.

**4. Speed and repeatability**  
Export 30 animated icons: a human clicks through 30 exports. An agent does it in one tool call loop. The library makes the decisions; the MCP tools do the exports.

**5. Documented rationale**  
A human's choice of `spin` at 80% intensity is implicit. An agent can return: "Selected `sweep` at 65% intensity, trigger: hover, for the settings icon. Rationale: enterprise fintech context requires restrained horizontal motion rather than rotation. Sweep signals precision and control. bounce and pop were excluded due to high playfulness rating."

### The Honest Remaining Gap

The one thing the library cannot fully replace is **taste-based discovery**. Some of the best animation choices are found by accident - by trying something unexpected and discovering it works. The library encodes known-good patterns. It is excellent at avoiding bad choices and making correct choices. It is less good at making surprising, inspired choices that break the pattern in a way that feels right.

This gap closes over time as the library accumulates `pairing_notes` and `unexpected_use_cases` from real usage.

**Verdict: With a well-built agent library, agents can match human quality for systematic, context-driven use cases and exceed human quality for consistency, constraint enforcement, and scale. The gap that remains is aesthetic serendipity, which is acceptable because it is the smallest part of the job.**

---

## Part 3: Full Agent User Journey Map

**Scenario framing:** A developer has prompted an AI coding agent:

> "Add hover animations to the icons in our premium fintech dashboard. The brand tone is professional, restrained, and refined. Not playful, not aggressive. These icons are in the primary navigation sidebar."

The agent has access to the Supericons MCP server with the full 80-preset agent library.

---

### Phase 1: Context Capture and Constraint Formation

The agent reads the task and extracts constraints:

```
Product type: fintech dashboard
Use location: primary navigation sidebar
Interaction trigger: hover (specified)
Tone constraint: professional, restrained, refined
Tone exclusions: playful, aggressive, high-energy
Icon function: navigation affordance (not status, not loading)
```

The agent does not yet know which presets exist. It is building a decision model before it queries.

---

### Phase 2: Library Consultation

The agent calls:

```
list_motion_presets()
```

The library returns 80 presets, each with structured metadata. The agent does not read all 80 linearly. It filters by:

1. `emotional_tone` does not include "playful" or "energetic"
2. `recommended_contexts` includes "hover-affordance" or "navigation"
3. `intensity_level` is 1, 2, or 3 (out of 5) - restrained
4. `interaction_type` is compatible with hover trigger

This narrows the field from 80 to approximately 8-12 candidate presets.

The agent may also call:

```
get_motion_recipe(preset: "sweep", trigger: "hover", duration_ms: 400)
```

to get a prose description: "Icon strokes trace from left to right on hover, creating a scanning or precision-scanning motion. Reads as controlled and deliberate."

---

### Phase 3: Icon-to-Preset Mapping

The agent maps each navigation icon to the most appropriate preset. The agent library provides `best_for` and `ui_contexts` per preset to support this mapping:

| Icon | Context | Selected preset | Intensity | Rationale |
|---|---|---|---|---|
| Home | Primary nav anchor | `glow-soft` | 55% | Subtle illumination, premium signal, low movement |
| Analytics | Data/precision context | `trace` | 70% | Stroke trace signal reads as scanning/analytical |
| Wallet / Portfolio | Commerce, trust context | `scale-soft` | 60% | Gentle scale, warmth without aggression |
| Settings | Config, control | `sweep` | 65% | Horizontal precision sweep, deliberate feel |
| Notifications | Alert, attention | `pulse` | 50% | Low-intensity pulse, present but not alarming |
| Team / Users | Human, relational | `drift-up` | 55% | Gentle upward drift, human warmth signal |
| Reports / Docs | Static, reference | `shimmer` | 45% | Subtle light pass, premium surface quality |
| Logout | Destructive-adjacent | `fade-soft` | 40% | Quiet exit, avoids energetic presets per avoid_for guidance |

The agent checks `avoid_for` for each preset it is considering and rejects any with `avoid_for: navigation` or `avoid_for: professional-contexts`.

---

### Phase 4: Parameter Setting

For each selected preset, the agent sets parameters using metadata guidance:

**Trigger:** `hover` (specified in task, confirmed compatible with all selected presets)

**Intensity:** The agent uses `context_intensity_guidance` from the metadata:
- Navigation icons: 45-70% range (metadata guidance for sidebar professional contexts)
- The agent applies the lower half of the range because `restrained` was specified

**Duration:** The agent uses `timing_character` and `duration_range_ms`:
- Default to `standard` timing range (350-500ms) for professional contexts
- Metadata flags `float` and `drift` presets as needing longer durations (500-700ms) for naturalism - the agent respects this

The agent does not need to guess. The metadata has resolved these parameters with enough specificity for high-quality output.

---

### Phase 5: Export

The agent calls `export_motion_css()` for each icon/preset combination:

```
export_motion_css(
  id: "home",
  library: "lucide",
  preset: "glow-soft",
  trigger: "hover",
  intensity: 55,
  duration_ms: 400
)
```

Returns: production-ready CSS class with the animation applied to the specific icon.

The agent repeats for all 8 icons. Total: 8 tool calls. A human would have clicked through 8 separate exports in the browser UI.

---

### Phase 6: Output Report to Developer

The agent delivers:

1. **The animated CSS** for each icon, ready to paste
2. **A brief rationale document:**

> "Applied hover animations to 8 navigation icons. All presets selected from Motion Lab's professional/subtle tier (intensity 40-70%). Trace was applied to the Analytics icon to signal precision. Pulse was applied to Notifications at 50% intensity - above this threshold the library flags it as attention-seeking for sidebar contexts. Logout received fade-soft, as sweep and bounce were excluded by the library's avoid_for guidance on destructive-adjacent actions. Total duration range: 350-500ms standard across all icons for consistency."

The human developer receives not just the output, but the reasoning. They can review the rationale, push back ("make the pulse stronger on notifications"), and the agent has the vocabulary to respond precisely.

---

### Phase 7: Developer Follow-Up (Optional)

The developer responds: "Increase the settings icon intensity. It feels too quiet."

The agent knows:
- Current: sweep at 65%
- Library guidance for settings in professional contexts: ceiling is 80% before it reads as aggressive
- Agent updates: sweep at 75%

No re-export from scratch. Targeted adjustment. The library gave the agent a ceiling to work within and the agent can communicate exactly where in that range it has moved.

---

## Part 4: What the Library Must Contain

For the above journey to work, the motion preset metadata schema must include these fields per preset:

```json
{
  "preset": "sweep",
  "category": "Motion",
  "label": "Sweep",
  "aliases": ["scan", "trace-horizontal", "wipe"],
  "visual_character": "Icon strokes animate from left to right as a precision scan, creating a deliberate, controlled motion impression.",
  "emotional_tone": ["precise", "subtle", "professional", "premium"],
  "interaction_type": ["hover-response", "general"],
  "intensity_level": 2,
  "recommended_contexts": ["navigation", "settings", "analytics", "hover-affordance"],
  "avoid_for": ["playful-contexts", "onboarding-celebration", "success-confirmation"],
  "best_for": ["fintech", "enterprise", "SaaS-professional", "sidebar-navigation"],
  "context_intensity_guidance": {
    "navigation-professional": { "min": 55, "max": 80, "default": 65 },
    "cta": { "min": 70, "max": 95, "default": 80 },
    "subtle-affordance": { "min": 40, "max": 65, "default": 55 }
  },
  "timing_character": "medium-precision",
  "duration_range_ms": [300, 500],
  "pairing_notes": "Works well on icons with horizontal lines (settings sliders, filters, analytics). Less effective on circular or radial icons.",
  "output_notes": "CSS output uses stroke-dashoffset animation. Ensure icon has visible stroke paths."
}
```

---

## Part 5: Build Priorities

| Priority | What to build | Why |
|---|---|---|
| 1 (now) | Remove 12-preset MCP registry. Import from browser preset source. | Prerequisite. Without this the metadata layer is built on a split foundation. |
| 2 (next) | Canonical preset registry file. Browser and MCP both import from it. | Single source of truth. Architecture fix. |
| 3 (next) | `list_motion_presets()` returns all 80 with category grouping | Agents get the real product surface |
| 4 (build) | Motion preset metadata: 80 records with all schema fields above | The decision layer. This is the library. |
| 5 (enrich) | Enrich `list_motion_presets()` to return metadata, not bare names | Agents can filter and reason without a separate lookup |
| 6 (optional) | `recommend_preset(context, tone, trigger)` MCP tool | Higher-level decision tool. Build only after metadata proves useful. |

---

## Conclusion

The agent library is not a documentation project. It is a knowledge encoding project. The goal is to transfer the implicit visual knowledge a human has when browsing the Motion Lab browser UI into structured, machine-readable metadata that an agent can use to make equivalent decisions.

When built correctly:

- Agents will make **correct** choices as reliably as careful human designers
- Agents will make **consistent** choices better than humans at scale
- Agents will **explain** their choices, which humans cannot easily do
- Agents will **enforce constraints** perfectly, which humans forget to do

The browser UI remains the discovery and exploration surface for humans. The agent library becomes the decision surface for agents. These are not competing products. They are two interfaces to the same Motion Lab system, each optimized for a different kind of user.

The prerequisite is a single canonical preset registry. Build that first.
