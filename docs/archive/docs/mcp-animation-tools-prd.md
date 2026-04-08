# MCP Motion Lab: Animation Tools PRD

## 1. Design Intent

### The Core Question (Socratic)

> "Why should we build an AI agent when the user already has one?"

Every developer using SuperIcons via MCP already has an AI coding agent (Claude, Cursor, Windsurf). That agent has full project context, unlimited creative reasoning, and zero marginal cost to us. Building our own AI agent means:

- Paying per-generation LLM API costs
- Maintaining Edge Functions, credit systems, billing logic
- Competing with the user's own agent (which has better context)

**The pivot:** Instead of building an AI agent, expose Motion Lab's animation engine as MCP tools. The user's own agent becomes the creative brain. We just provide the animation data and CSS composition.

### Design Thinking: Who Benefits?

| Persona | Need | MCP Solution |
|---------|------|-------------|
| **Dev using Cursor/Claude** | "Animate this icon in my codebase" | Agent calls `compose_animated_icon`, pastes result directly |
| **Dev building a component library** | "Generate hover animations for 20 icons" | Agent loops `compose_animated_icon` with different presets |
| **Designer prototyping** | "Show me all available entrance animations" | Agent calls `list_animation_presets` with category filter |

### What Gets Retired

The [AI Agent Implementation Plan](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/ai-agent-implementation-plan.md) is replaced by this approach. Specifically:

| AI Agent Component | Disposition |
|---|---|
| Edge Function `ai-animate` | **Not needed.** User's agent handles creative logic. |
| Edge Function `save-animation` | **Deferred.** No server-side save (user saves in their codebase). |
| `credit_ledger` table | **Not needed.** No per-generation cost. |
| `user_animations` table | **Deferred.** Future enhancement for cloud sync. |
| LLM provider adapter | **Not needed.** |
| Guide chips (Trigger/Style/Speed/Mood) | **Replaced.** Becomes tool parameters. |

> [!IMPORTANT]
> The browser-side AI Agent textarea and Generate button remain as-is (keyword matching). This PRD only covers the MCP server extension.

---

## 2. New MCP Tools

### Tool 1: `list_animation_presets`

**Purpose:** Let the agent discover available animations by category.

```
Parameters:
  category (optional): "motion" | "entrance" | "exit" | "all"
                        Default: "all"

Returns:
  Array of { name, category, description, easing }
```

**Example response:**
```json
{
  "presets": [
    { "name": "heartbeat", "category": "motion", "description": "Double-thump cardiac rhythm", "easing": "ease-in-out" },
    { "name": "springLand", "category": "entrance", "description": "Spring bounce landing", "easing": "cubic-bezier(0.68, -0.55, 0.27, 1.55)" },
    { "name": "vortex", "category": "exit", "description": "Spiral drain exit", "easing": "ease-in" }
  ],
  "total": 56,
  "source": "SuperIcons Motion Lab (https://supericons.dev)"
}
```

**No auth required.** Preset discovery is free.

---

### Tool 2: `get_animation_css`

**Purpose:** Get the raw CSS keyframes for a specific preset.

```
Parameters:
  preset (required): string  -- preset name (e.g. "heartbeat")
  trigger (optional): "loop" | "hover" | "click"  -- Default: "loop"
  duration (optional): string  -- CSS duration (e.g. "500ms", "1.2s"). Default: "500ms"
  intensity (optional): number  -- 0.1 to 3.0, scales amplitude. Default: 1.0

Returns:
  { name, css, keyframesJson, usage }
```

**Example response:**
```json
{
  "name": "heartbeat",
  "trigger": "hover",
  "duration": "600ms",
  "css": ".si-motion {\n  animation: si-heartbeat 600ms ease-in-out;\n}\n.si-motion:hover {\n  animation: si-heartbeat 600ms ease-in-out;\n}\n@keyframes si-heartbeat {\n  0% { transform: scale(1); }\n  14% { transform: scale(1.18); }\n  28% { transform: scale(1); }\n  42% { transform: scale(1.12); }\n  56% { transform: scale(1); }\n  100% { transform: scale(1); }\n}",
  "keyframesJson": [
    { "offset": 0, "transform": "scale(1)" },
    { "offset": 0.14, "transform": "scale(1.18)" }
  ],
  "usage": "Add class 'si-motion' to your SVG wrapper element, then include the CSS above."
}
```

**No auth required.** Presets are open data.

---

### Tool 3: `compose_animated_icon`

**Purpose:** One-call combo: get an icon + animation CSS, ready to paste.

```
Parameters:
  icon (required): string  -- icon ID (e.g. "heart")
  library (required): string  -- library name (e.g. "lucide")
  preset (required): string  -- animation preset name
  trigger (optional): "loop" | "hover" | "click"  -- Default: "hover"
  duration (optional): string  -- Default: "500ms"
  intensity (optional): number  -- Default: 1.0
  color (optional): string  -- CSS color for the icon. Default: "currentColor"

Returns:
  { icon, animation, html, css }
```

**Example response:**
```json
{
  "icon": { "id": "heart", "library": "lucide", "svg": "<svg ...>" },
  "animation": { "preset": "heartbeat", "trigger": "hover", "duration": "600ms" },
  "html": "<div class=\"si-motion\" style=\"color: #ef4444; display: inline-block;\">\n  <svg ...>...</svg>\n</div>",
  "css": ".si-motion:hover {\n  animation: si-heartbeat 600ms ease-in-out;\n}\n@keyframes si-heartbeat { ... }",
  "usage": "Paste the HTML and CSS into your project. The animation triggers on hover."
}
```

**Auth:** Same rules as `get_icon` (premium icons require API key).

---

## 3. Socratic Audit

### Dimension 1: Data Model Integrity

> "Does the PRESETS object in store.js match what the MCP server needs?"

**Gap identified:** The PRESETS object lives in `store.js` (browser code). The MCP server (`mcp/index.js`) runs server-side on Node.js. It cannot `import` from `store.js`.

**Resolution:** Extract the PRESETS object + `scaleKeyframesByIntensity()` + `composePreset()` into a shared module:

| Option | Pros | Cons |
|--------|------|------|
| **A: `mcp/presets.js`** (copy) | Simple, no build step | Duplicate data, sync risk |
| **B: `shared/presets.json`** (shared JSON) | Single source of truth | Requires refactor of store.js to import from JSON |
| **C: Build script** (extract at build time) | No manual sync | Adds build complexity |

**Recommendation:** Option A (copy) for MVP. The preset list changes infrequently (we just finalized 56). Add a comment linking the two files. Migrate to Option B if presets change often.

### Dimension 2: Performance / Concurrency

> "What happens if an agent calls compose_animated_icon 100 times in a loop?"

- **All data is in-memory** (loaded at startup). No I/O per call.
- **CSS generation is string concatenation.** O(1) per call.
- **Intensity scaling is arithmetic.** O(n) where n = keyframe count (max ~11).
- **Risk: None.** Even 1000 calls would complete in milliseconds.

### Dimension 3: Error Handling

> "What does the agent see when things go wrong?"

| Failure | Response |
|---------|----------|
| Unknown preset name | `{ error: "Unknown preset", available: [...] }` with top 5 similar names |
| Unknown icon ID | Existing `get_icon` error (already handled) |
| Invalid intensity (< 0.1 or > 3.0) | Clamp to bounds, warn in response |
| Invalid trigger value | Default to "loop", note in response |
| Premium icon without API key | Existing auth gate (already handled) |

### Dimension 4: UX / Agent Lifecycle

> "How does the AI agent discover what's available?"

**Discovery flow:**
1. Agent calls `list_animation_presets()` to see all options
2. Agent calls `search_icons("heart")` to find the icon
3. Agent calls `compose_animated_icon({ icon: "heart", library: "lucide", preset: "heartbeat", trigger: "hover" })`
4. Agent pastes the result into the user's file

**Self-documenting:** Each tool response includes a `usage` field with plain-English instructions.

### Dimension 5: Task Completeness

> "Does this cover 100% of the user's workflow?"

| Workflow Step | Covered? |
|---|---|
| Discover available animations | Yes (`list_animation_presets`) |
| Get animation CSS standalone | Yes (`get_animation_css`) |
| Get icon + animation combo | Yes (`compose_animated_icon`) |
| Adjust speed/intensity | Yes (parameters on tools 2 and 3) |
| Choose trigger mode | Yes (loop/hover/click parameter) |
| Save custom animation | No (deferred, user saves in codebase) |
| Create custom keyframes | No (out of scope, user writes CSS) |
| Combine multiple presets | No (deferred, future `compose_multi`) |

---

## 4. Implementation Scope

### Files to Modify

| File | Change | Effort |
|------|--------|--------|
| `mcp/presets.js` [NEW] | Copy of PRESETS object + intensity scaler + CSS composer | Medium |
| `mcp/index.js` | Add 3 new tool registrations | Medium |
| `mcp/package.json` | Version bump to 0.3.0 | Trivial |

### Files NOT Changed

- `store.js` (browser code, untouched)
- `style.css` (browser code, untouched)
- `mcp/auth.js` (no auth changes needed)
- `mcp/search.js` (no search changes needed)
- No Edge Functions, no Supabase schema, no database changes

### Total Estimate

**~2-3 hours.** One file creation (`presets.js`), one file extension (`index.js`), testing.

---

## 5. Verification Plan

### Automated (via MCP client)

| Test | Command | Expected |
|------|---------|----------|
| List all presets | `list_animation_presets()` | 56 presets returned |
| Filter by category | `list_animation_presets({ category: "entrance" })` | 15 presets |
| Get CSS for preset | `get_animation_css({ preset: "heartbeat" })` | Valid CSS with @keyframes |
| Invalid preset | `get_animation_css({ preset: "nonexistent" })` | Error + suggestions |
| Compose icon+animation | `compose_animated_icon({ icon: "heart", library: "lucide", preset: "heartbeat" })` | SVG + CSS + HTML |
| Intensity scaling | `get_animation_css({ preset: "bounce", intensity: 2.0 })` | Doubled translateY values |
| Trigger modes | Loop, hover, click for same preset | Different CSS selectors |

### Manual

1. Run MCP server locally
2. Connect via Claude Desktop or Cursor
3. Ask: "Get me the heart icon from lucide with a heartbeat animation on hover"
4. Paste result into test HTML, verify animation works
