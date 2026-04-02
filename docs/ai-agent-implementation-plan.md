# Motion Lab AI Agent: Implementation Plan (v2)

## Overview

An AI-powered animation assistant inside Motion Lab. Users describe animations in natural language, the AI generates CSS keyframes, the result is previewed live, and accepted animations are saved to "My Animations" in Supabase for reuse.

## LLM Provider Architecture

**Principle: No hardcoded providers.** All provider configuration lives in environment variables.

### Supported Providers

| Provider | Model | Context | API Format | Input (1M tok) | Output (1M tok) |
|---|---|---|---|---|---|
| xAI | grok-4.20 | 2M | OpenAI-compat | ~$3.00 | ~$15.00 |
| OpenAI | gpt-5.4-mini | 128K | Native | ~$0.40 | ~$1.60 |
| DeepSeek | deepseek-chat (V3.2) | 128K | OpenAI-compat | ~$0.27 | ~$1.10 |
| MiniMax | M2.7 | 128K | OpenAI-compat | ~$0.50 | ~$2.00 |

### Provider Adapter

```
LLM_PROVIDER=deepseek        # xai | openai | deepseek | minimax
LLM_MODEL=deepseek-chat      # provider-specific model ID
LLM_API_KEY=sk-xxx
LLM_BASE_URL=                # optional override

Default Base URLs:
  xai      -> https://api.x.ai/v1
  openai   -> https://api.openai.com/v1
  deepseek -> https://api.deepseek.com/v1
  minimax  -> https://api.minimax.chat/v1
```

---

## User Flow

```
Click AI Agent button
  |
  [Credit check] --No--> Show upgrade prompt
  |
  Yes: Open guided prompt panel
  |
  Optional: Select guide chips [Trigger] [Style] [Speed] [Mood]
  |
  Type natural language prompt
  |
  POST /functions/v1/ai-animate
  { prompt, svgMarkup, currentState, guideChips }
  |
  Edge Function: validate JWT, check credits, build system prompt
  |
  LLM Provider (env-configured)
  |
  Parse + validate JSON response
  Deduct 1 credit
  |
  Return animation JSON to frontend
  |
  Apply animation to live preview
  |
  +--[Accept]-----> Name modal -> Save to Supabase -> "My Animations" button
  +--[Regenerate]--> Re-send with context (costs 1 credit)
  +--[Dismiss]-----> Discard, no refund
```

---

## Guided Input (Prompt Builder)

Optional structured chips above the free-text input.

```
+-------------------------------------------------------+
| Guides:  [Trigger v]  [Style v]  [Speed v]  [Mood v]  |
|                                                        |
| +----------------------------------------------------+ |
| | Make the icon bounce with elastic feel...     [->]  | |
| +----------------------------------------------------+ |
+--------------------------------------------------------+
```

| Chip | Options |
|---|---|
| Trigger | On hover, On click, Loop, On scroll |
| Style | Smooth, Bouncy, Sharp, Organic, Glitchy, Playful, Dramatic |
| Speed | Slow (1.5s+), Medium (0.5-1s), Fast (0.2-0.5s) |
| Mood | Subtle, Energetic, Elegant, Chaotic, Minimal |

Selected chips auto-append to the prompt as structured metadata.

---

## "My Animations" Save Flow

### Accept -> Name -> Save -> Reuse

1. User clicks "Accept" on AI result
2. Name modal: "Name your animation" (auto-suggest from AI's `suggestedPresetName`)
3. Saved to `user_animations` table in Supabase
4. Appears as new button under "My Animations" quadrant (replaces "Saved")
5. Usable on any icon going forward

### Database Schema

```sql
CREATE TABLE public.user_animations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  name          TEXT NOT NULL,
  icon_name     TEXT,  -- icon used when created (for context)
  keyframes     JSONB NOT NULL,
  duration      TEXT DEFAULT '500ms',
  easing        TEXT DEFAULT 'ease-in-out',
  iteration     TEXT DEFAULT 'infinite',
  fill_mode     TEXT DEFAULT 'both',
  trigger       TEXT DEFAULT 'loop',
  target        TEXT DEFAULT 'svg',
  category      TEXT,  -- auto-tagged: motion, transform, effect, compound
  is_public     BOOLEAN DEFAULT false,  -- Phase 2: community gallery
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_animations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own animations"
  ON public.user_animations FOR ALL
  USING (auth.uid() = user_id);
```

---

## System Prompt (v2 - Optimized)

```
You are an SVG icon animation specialist for SuperIcons Motion Lab.
You generate CSS keyframe animations for SVG icons based on natural language.

## SVG Icon Context
- Icons use `currentColor` for stroke and fill (color set via CSS `color`)
- Most have viewBox="0 0 24 24", some are 512x512 (Ionicons)
- May contain multiple <path>, <circle>, <rect>, <line>, <polyline> elements
- Each element can be animated independently by index

## Animation Techniques

### Transform-based (GPU-accelerated, preferred)
- Bounce: translateY with overshoot (cubic-bezier(.68,-.55,.27,1.55))
- Shake: translateX oscillation (left-right-left damping)
- Spin: rotate(360deg) linear
- Pulse: scale(1) -> scale(1.15) -> scale(1) ease-in-out
- Wobble: alternating small rotate angles (-5deg to 5deg)
- Float: translateY gentle oscillation (0 -> -4px -> 0)
- 3D Flip: rotateY(360deg) with perspective on parent
- Swing: rotate from transform-origin top-center, damped
- Pop-in: scale(0) -> scale(1.1) -> scale(1) spring easing
- Slide: translateX/Y from off-stage

### SVG-specific
- Stroke Draw: stroke-dasharray set to path length, animate stroke-dashoffset to 0
- Typewriter Reveal: clip-path inset(0 100% 0 0) to inset(0)
- Neon Glow: animated filter drop-shadow with color cycling

### Physics-based
- Elastic Squish: offset scaleX+scaleY with spring curves (rubber object feel)
- Jelly Wobble: alternating skewX + scaleY at high frequency (6-8 steps)
- Rubber Band Snap: translateY overshoot with decreasing amplitude
- Pendulum: rotate from top-center origin with damped oscillation
- Magnetic Pull: translate toward interaction point + scale increase

### Cinematic
- Glitch Flicker: rapid opacity toggle + translateX jitter + clip-path slice
- Dissolve Scatter: each path translates outward + fades (explosion effect)
- Ink Bleed: scale(0) + filter blur(4px) to blur(0) (ink spreading)
- Origami Fold: rotateX on segments with edge transform-origin
- Stagger Cascade: nth-child delay + translateY + opacity (sequential reveal)
- Breathe: very slow (3-4s) scale(1.03) ease-in-out infinite (zen ambient)

### Compound (combine 2-3 techniques)
- Draw + Breathe: draws then gently pulses
- Pop + Jelly: scales up with elastic squish on landing
- Stagger + 3D Flip: each element flips in sequence
- Glitch + Neon: flicker + glow for cyberpunk aesthetic
- Slide + Fade: slides in with opacity transition
- Bounce + Spin: bounces while rotating

## Composition Rules
1. Combine up to 3 techniques per animation
2. Primary motion (transform) fastest, secondary (opacity, filter) 1.5-2x slower
3. Final keyframe must match initial for loops
4. For hover: include smooth reverse (same duration for natural feel)
5. Durations: 0.2s-2s for interactions, up to 4s for ambient loops

## Performance Rules
1. Prefer transform and opacity (GPU-composited)
2. Avoid: width, height, margin, padding, top, left (layout thrash)
3. Use will-change: transform on animated elements

## Output Format (JSON only, no markdown fences)
{
  "animation": {
    "name": "elasticBounce",
    "keyframes": [
      { "offset": 0, "props": { "transform": "translateY(0)" } },
      { "offset": 0.5, "props": { "transform": "translateY(-8px)" } },
      { "offset": 1, "props": { "transform": "translateY(0)" } }
    ],
    "duration": "0.6s",
    "timingFunction": "cubic-bezier(.68,-.55,.27,1.55)",
    "iterationCount": "1",
    "fillMode": "both",
    "trigger": "hover",
    "target": "svg"
  },
  "additionalAnimations": [],
  "explanation": "Bounces upward with elastic overshoot on hover",
  "suggestedPresetName": "Elastic Bounce"
}

### Field Reference
- name: camelCase, unique and descriptive
- keyframes: array of { offset (0-1), props: { css-property: value } }
- duration: CSS time (e.g., "0.6s", "300ms")
- timingFunction: named or cubic-bezier
- iterationCount: "1", "2", "infinite"
- fillMode: "none", "forwards", "backwards", "both"
- trigger: "hover" | "click" | "loop"
- target: "svg" (whole icon) or "path:nth-child(2)" (specific element)
- additionalAnimations: for multi-element stagger (optional)
- suggestedPresetName: short label for UI button

### Multi-element stagger example:
"additionalAnimations": [
  { "target": "path:nth-child(1)", "delay": "0s", ... },
  { "target": "path:nth-child(2)", "delay": "0.1s", ... }
]
```

---

## Component Breakdown

### 1. Frontend: AI Agent Panel (store.js)

**Location:** Bottom bar, below action buttons (existing placeholder at lines 2503-2517).

**Elements:**
- Guide chip row (Trigger, Style, Speed, Mood dropdowns)
- Textarea with placeholder
- Generate button (sparkle icon)
- Loading state with progress animation
- Result card: live preview + explanation + Accept/Regenerate/Dismiss
- Accept modal: name input + save button
- "My Animations" quadrant (replaces current "Saved") populated from Supabase

### 2. Edge Function: ai-animate

**File:** `supabase/functions/ai-animate/index.ts`

**Flow:**
1. Verify JWT
2. Check credit balance (free uses or AI_CREDIT)
3. Build system prompt (v2) + user prompt + guide chip metadata
4. Route to LLM provider (env-configured)
5. Parse keyframes array from response
6. Validate schema (check required fields)
7. Deduct 1 credit
8. Return animation JSON

### 3. Edge Function: save-animation

**File:** `supabase/functions/save-animation/index.ts`

**Flow:**
1. Verify JWT
2. Validate animation payload
3. Insert into `user_animations`
4. Return saved animation ID

### 4. Database Tables

- `credit_ledger` (existing plan)
- `user_animations` (new, see schema above)

---

## Verification Plan

| Test | Type | Description |
|---|---|---|
| JSON parsing | Unit | Mock LLM response, verify keyframe extraction |
| Credit deduction | Unit | Balance decreases, respects expiry |
| Provider adapter | Unit | Correct base URL for all 4 providers |
| RLS policy | Unit | User A cannot read user B's credits/animations |
| Guided chips | Manual | Chips append structured data to prompt |
| E2E generation | Manual | Type prompt, verify animation on preview |
| Save flow | Manual | Accept -> name -> appears in My Animations |
| Reload persistence | Manual | Refresh page, My Animations still populated |
| Free user gate | Manual | Upgrade prompt after 3 free uses |
| Provider switch | Manual | Change env, verify routing |
| Cost benchmark | Perf | 50 prompts per provider, measure tokens + cost |
