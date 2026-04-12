# Motion Lab MCP: Full Audit Report

Date: April 12, 2026
Auditor: Antigravity (independent code and UX review)
Sources reviewed:
- `docs/motion-lab-mcp-post-implementation-report.md`
- `mcp/index.js`, `mcp/motion-lab.js`, `mcp/motion-lab-client.js`, `mcp/auth.js`, `mcp/workflow-access.js`
- `supabase/functions/_shared/motion-lab/auth.ts`, `runtime.ts`, `generated.ts`
- `supabase/functions/motion-lab-session/index.ts`
- `supabase/functions/motion-lab-recipe/index.ts`
- `docs/motion-lab-agent-guidance.md`
- `docs/motion-lab-agent-library-prd.md`
- `mcp/generated/motion-lab-baseline.json`

---

## Section 1: What Motion Lab MCP Does

### The five Motion Lab tools

| Tool | What it does | Auth required |
|---|---|---|
| `list_motion_presets` | Browse 70+ named presets grouped by category (Motion, Entrances, Exits, Special) | Pro |
| `get_motion_recipe` | Get semantic guidance for a preset: timing ranges, intensity, emotional tone, when to use/avoid | Pro |
| `export_motion_css` | Get production CSS animation code ready for a stylesheet | Pro |
| `export_animated_svg` | Get a fully self-contained animated SVG file | Pro |
| `animate_icon` | Give it an SVG + preset name, get back recipe + CSS + animated SVG in one call | Pro |

### What an AI agent can do with these tools

An agent building a UI can call `animate_icon(svg=cartIcon, preset="bounce", trigger="hover", duration_ms=300)` and receive a finished, production-ready animated icon without needing to understand CSS keyframes, timing functions, transform-origin, or browser quirks. Motion Lab handles everything server-side.

### What you as the owner see

Every premium call requires a valid Pro API key verified against `si_api_keys` and `si_subscriptions` in Supabase. If either check fails, the call is blocked. Key usage is logged via `last_used` timestamp. The proprietary animation logic never leaves your servers.

---

## Section 2: Cloning and Copying Protection Audit

### Your stated bar

"I understand we cannot have 100% protection from cloning or copying but we need to at least make it difficult to do so."

**Verdict: The core protection is real, working, and meaningfully raises the bar. Five distinct layers are verified in code.**

---

### Layer 1: Stripped local npm package

**Files verified:** `mcp/motion-lab.js` (21 lines), `mcp/generated/motion-lab-baseline.json`

The published npm package contains only a stripped JSON listing. Each entry has: `preset`, `label`, `group`, `description`, `supported_triggers`. Nothing else. No keyframes. No easing values. No intensity math.

The full premium artifact lives only in `supabase/functions/_shared/motion-lab/generated.ts` (165KB). That file is deployed to your Supabase project. It is never shipped in the npm package.

**Analogy:** A restaurant menu that describes what each dish tastes like, but contains no ingredients or cooking instructions.

**Protection level: High.** The split is enforced by the build script.

---

### Layer 2: API key gating with Pro subscription check

**File verified:** `supabase/functions/_shared/motion-lab/auth.ts` lines 70-144

Every premium call must pass through `validateMotionLabApiKeyHash()`, which runs two checks in sequence:

1. Looks up the hashed key in `si_api_keys`. If not found or revoked: `401`.
2. Looks up an active row in `si_subscriptions`. If no active Pro: `403 motion_lab_pro_required`.

Both must pass. The API key is never stored in transit. The MCP client sends a SHA-256 hash. The raw key never leaves the user's machine.

**Analogy:** A bouncer checking your ID and then checking your name on the VIP list. Both checks must pass.

**Protection level: High.**

---

### Layer 3: Short-lived HMAC-signed session tokens

**File verified:** `supabase/functions/_shared/motion-lab/auth.ts` lines 147-233

After the key check passes, the server mints a session token in the format:

```
[base64url payload].[HMAC-SHA256 signature]
```

Payload contains: `scope: "motion_lab"`, `user_id`, `is_pro: true`, `iat`, `exp`.

The signature is computed with `MOTION_LAB_SESSION_SECRET`, stored only on your Supabase server. A tampered token fails signature verification and is rejected. Token TTL defaults to 900 seconds (15 minutes).

**Analogy:** A concert wristband with invisible UV ink stamp. Fakes fail the UV test. Real ones expire after the show.

**Protection level: High.**

---

### Layer 4: Outputs only, never source logic

**File verified:** `supabase/functions/_shared/motion-lab/runtime.ts` (365 lines)

What the hosted endpoints return:
- `get_motion_recipe`: metadata, timing guidance, emotional tone, notes. No raw keyframes.
- `export_motion_css`: a compiled CSS string. The keyframe math and `scaleKeyframesByIntensity()` logic that produced it stay on the server.
- `export_animated_svg`: rendered SVG with embedded CSS. Outputs only.

**Analogy:** A bakery gives you a finished cake. You can eat it and try to reverse-engineer it. You do not get the recipe card.

**Protection level: Medium-High.** A determined attacker could collect many CSS outputs at different intensity/duration combinations and attempt to reconstruct keyframe geometry. The cost is significant but nonzero.

---

### Layer 5: API keys transmitted as hashes only

**File verified:** `mcp/motion-lab-client.js` line 92

```javascript
const api_key_hash = await hashApiKey(apiKey);
```

Your server only ever sees a SHA-256 hash. Even if network traffic or server logs were intercepted, no raw credential is exposed.

**Protection level: High.**

---

### What is not yet fully hardened

| Gap | Risk | Severity |
|---|---|---|
| Exposed test API key in verification workflow | Key should be rotated immediately | **High (operational)** |
| No rate limiting on hosted endpoints | A Pro user can loop through all presets + intensities to reconstruct keyframe geometry | Medium |
| Negative auth paths not verified (invalid key, expired token) | A corner-case auth bug could exist undetected | Medium |
| Outage hard-fail behavior not tested | Unclear if local fallback exposes premium logic in true outage | Medium |

### Overall protection scorecard

| Dimension | Status |
|---|---|
| Package contains no premium logic | Confirmed |
| Premium calls require valid Pro subscription | Confirmed |
| Session tokens are signed and time-limited | Confirmed |
| Raw API keys are never transmitted | Confirmed |
| Keyframe geometry never exposed in API responses | Confirmed |
| Automated output scraping is rate-limited | Not confirmed |
| Negative auth paths are tested | Not yet verified |

---

## Section 3: UX and Journey Gap Audit

### The two journeys

**AI agent journey (current happy path):**
```
Task received
  -> call list_motion_presets (70+ names, short descriptions only)
  -> pick preset by name matching (often imprecise)
  -> call get_motion_recipe
  -> call animate_icon or export_motion_css
  -> return output
```

**Human developer journey (first-time setup):**
```
Read about supericons-mcp
  -> install via npm or npx
  -> configure SUPERICONS_API_KEY in IDE MCP settings
  -> ask agent to animate an icon
  -> see: success, Pro access error, session error, or silence
```

---

### Scenario 1: First-time setup, no API key

**Who:** Developer who just installed the MCP package.

**What breaks:** Error says "Visit supericons.dev/pricing." Does not explain:
- That `search_icons` is intentionally free.
- That the key goes in the MCP config file, not a `.env` file.
- The exact config block for their IDE.

**Improvement to error message:**
```
Before: "Visit https://supericons.dev/pricing and connect a Pro-linked SUPERICONS_API_KEY."

After:  "Motion Lab MCP requires a Supericons Pro subscription.
         1. Subscribe at https://supericons.dev/pricing
         2. Generate your API key at https://supericons.dev/dashboard/api-keys
         3. Add SUPERICONS_API_KEY to your MCP config (see: https://supericons.dev/docs/mcp-setup)"
```

**Guide needed:** "Getting started with Motion Lab MCP" with IDE-specific config examples.

---

### Scenario 2: API key set but not Pro

**Who:** Developer with a valid key but no active Pro subscription.

**What breaks:** `authState.authenticated = true` but `authState.isPro = false`. The error message is identical to the "no key" case. A developer with a lapsed Pro subscription cannot tell if their key is wrong, revoked, or expired.

**Improvement:** Differentiate using the available `authenticated` flag:
```
If authenticated but not Pro:
"Your API key is valid but your account does not have an active Pro subscription.
 Renew or upgrade at https://supericons.dev/pricing."

If not authenticated:
"No valid API key found. Set SUPERICONS_API_KEY in your MCP config to access Motion Lab."
```

**Guide needed:** "Why is Motion Lab blocked when my API key works for icon search?"

---

### Scenario 3: Agent picks the wrong preset

**Who:** AI agent asked to "animate the settings icon."

**What breaks:** Agent calls `list_motion_presets`, sees 70+ names with short descriptions, picks `spin` because "settings icons usually spin," exports at 100% intensity on loop. Result is a settings icon spinning infinitely at full speed - almost always wrong.

The data for better choices exists in `get_motion_recipe` and `motion-lab-agent-guidance.md`. But:
- `list_motion_presets` does not surface enough context for filtering.
- Agents are not prompted to call `get_motion_recipe` before exporting.
- The guidance doc is not injected into agent context.

**Improvements:**
1. Add `visual_character` and top 2 `recommended_contexts` tags to the `list_motion_presets` baseline response.
2. Add to `animate_icon` and `export_motion_css` descriptions: "Call `get_motion_recipe` first to confirm the preset suits the interface context."
3. Provide a system prompt template operators can inject alongside the MCP server.

**Guide needed:** "Motion Lab agent system prompt template."

---

### Scenario 4: Agent receives `{{ICON_SELECTOR}}` and does not know what to do

**Who:** AI agent that called `export_motion_css`.

**What breaks:** Agent embeds CSS with `{{ICON_SELECTOR}}` literally into the codebase, or stalls asking the developer what selector to use.

**Improvement to tool response:**
```json
{
  "selector_token": "{{ICON_SELECTOR}}",
  "selector_instructions": "Replace {{ICON_SELECTOR}} with the CSS selector targeting your SVG element, e.g. '#my-icon svg', '.sidebar-icon svg'. If the correct selector is unknown, use export_animated_svg for a self-contained file instead."
}
```

**Guide needed:** "CSS export vs animated SVG: which should I use?" (1-page decision guide).

---

### Scenario 5: Session token expires mid-workflow

**Who:** AI agent running a long workflow when the 15-minute session expires.

**What breaks:** The 2-attempt token refresh succeeds normally. But if the refresh fails (network issue, revoked key, lapsed Pro), the error that surfaces is `"Motion Lab session exchange failed."` The developer cannot distinguish between network timeout (retry), revoked key (new key), or expired Pro (renew subscription).

**Improvement:** Surface the error code in the tool `catch` block, not just `error.message`:
```json
{
  "error": "Motion Lab session exchange failed",
  "code": "motion_lab_auth_required",
  "hint": "Check SUPERICONS_API_KEY and retry. If the error persists, verify your Pro subscription at https://supericons.dev/dashboard."
}
```

**Guide needed:** "Motion Lab session errors: what they mean and what to do."

---

### Scenario 6: Developer asks "what can this MCP do?"

**Who:** Developer who just connected the server.

**What breaks:** Agent lists 11 terse tool descriptions. No workflow summary. No explanation of which tools are free vs Pro. No indication whether Motion Lab and Converter are the same product. Developer does not know where to start.

**Improvement:** Add a `get_mcp_status` tool (no auth required) returning:
- Server version
- Auth status (anonymous / authenticated / Pro)
- Available tools at current auth level
- One-sentence description of each tool family
- Link to quickstart guide

**Guide needed:** "Supericons MCP overview: what's available and how to use it."

---

### Scenario 7: Agent tries to animate a locked premium icon

**Who:** Agent asked to animate `fingerprint-scan` from a premium collection by a user without access.

**What breaks:** Returns `"Icon 'fingerprint-scan' not found in library 'animated-icons'. Use search_icons to find available icons."` The icon exists. The user just lacks access. The message implies it does not exist, causing the agent to search for alternatives when the correct action is upgrading.

**Improvement:**
```
If icon exists but requires purchase:
"Icon 'fingerprint-scan' in 'animated-icons' requires a Pro subscription or purchase of this pack. Visit https://supericons.dev to upgrade."

If icon truly does not exist:
"Icon 'fingerprint-scan' was not found in 'animated-icons'. Use search_icons with related terms to find alternatives."
```

**Guide needed:** "Premium icons vs free icons: access tiers in MCP."

---

### Scenario 8: Operator deploying in a production pipeline

**Who:** Developer building an agent pipeline that uses Motion Lab MCP programmatically.

**What is missing:**
1. A way to pre-validate key + Pro status without generating output (health check).
2. Rate limit documentation (none exists or is enforced).
3. Session caching guidance for multiple MCP instances.
4. Documented outage behavior when `SUPERICONS_MOTION_LAB_LOCAL_FALLBACK=0`.
5. Version field in API responses for pipeline change detection.

**Guides needed:**
- "Running Motion Lab MCP in a production pipeline"
- "Motion Lab MCP health check and monitoring"
- "Understanding local fallback vs hosted-only mode"

---

## Section 4: Documentation Gap Map

| Topic | Status | Priority |
|---|---|---|
| IDE-specific MCP setup (Cursor, Claude Desktop, VS Code) | Missing | P0 |
| Tools reference and when to use each | Partial (tool descriptions only) | P0 |
| `{{ICON_SELECTOR}}` explained for agents and humans | Missing | P0 |
| Auth tiers explained (free / authenticated / Pro / pack buyer) | Missing | P1 |
| Troubleshooting: key works for icons but not Motion Lab | Missing | P1 |
| System prompt template for operators | Missing | P1 |
| Rate limits | Missing entirely | P1 |
| Agent preset selection guide | Exists (`motion-lab-agent-guidance.md`) | Done - needs linking |
| Production pipeline deployment | Missing | P2 |
| Session lifecycle and caching | Missing | P2 |
| Changelog and version tracking | Missing | P2 |
| Outage and fallback behavior | Missing | P2 |

---

## Section 5: Error Message Quality Audit

| Error situation | Current message | Quality | Recommended improvement |
|---|---|---|---|
| No API key set | Generic Pro access error | Poor | Separate from "key not Pro"; add 3-step setup instructions |
| Key valid, not Pro | Same as no key case | Poor | "Your key is valid but Pro subscription is required" |
| Session exchange fails | "Motion Lab session exchange failed." | Medium | Surface error code and targeted hint |
| Hosted endpoint 503 | "Retry when available." | Medium | Add status page link |
| Invalid preset name | Lists valid presets | Good | No change needed |
| Icon not found (access denied) | "Not found. Use search_icons." | Poor | Distinguish access-denied from truly absent |
| `{{ICON_SELECTOR}}` in output | No explanation in response | Missing | Add `selector_instructions` field |
| Pro-gated tool, no hint on where to get key | Points to pricing only | Medium | Add direct link to API key dashboard |

---

## Section 6: Prioritized Improvement Roadmap

### Immediate (guides and wording only, no code required)

| Item | Effort | Impact |
|---|---|---|
| Write MCP setup guide with per-IDE config examples | Low | High |
| Write MCP troubleshooting FAQ | Low | High |
| Publish system prompt template for operators | Low | High |
| Write "CSS vs Animated SVG" decision guide | Low | Medium |
| Write "Access Tiers in MCP" explainer | Low | Medium |

### Short-term (small code changes)

| Item | Effort | Impact |
|---|---|---|
| Differentiate "no key" vs "key not Pro" error messages | Low | High |
| Add `selector_instructions` to CSS export response | Low | High |
| Surface error codes in tool `catch` blocks | Low | Medium |
| Add `visual_character` + top contexts to `list_motion_presets` | Low | High |
| Differentiate "icon not found" from "icon access denied" | Low | Medium |
| **Rotate the exposed test API key** | Immediate | Critical |

### Medium-term (structural)

| Item | Effort | Impact |
|---|---|---|
| Add `get_mcp_status` tool | Medium | High |
| Implement rate limiting on hosted Motion Lab endpoints | Medium | High (closes the largest remaining cloning gap) |
| Run negative-path verification batch | Medium | Medium |
| Add version field to API responses | Low | Medium |

---

## Section 7: The Single Highest-Value Action

**Write and publish the MCP Setup Guide.**

Every other gap either requires setup to be complete first, or depends on a developer who already got through setup successfully. The setup guide removes the single biggest drop-off point in the entire user journey for both humans and agents.

Format:
1. What you need before you start (subscription, API key location).
2. How to add the MCP config for Cursor, Claude Desktop, and VS Code.
3. How to verify setup with a test command.
4. Where to get help if it does not work.

Everything else builds on top of this.
