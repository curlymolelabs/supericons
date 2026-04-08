# Pro Tools, Credits, and Premium Collection Access: Strategy Discussion

Date: 2026-04-06

## Background

Supericons is at MVP launch stage. All sections are complete. The remaining question: how should Pro subscribers access premium collections? Do we need a credit system?

This document captures the full strategy discussion, feature audit, pricing analysis, and final decision.

---

## Part 1: The Inconsistency

### Two competing models coexist in the codebase

| Surface | Model | Evidence |
|---|---|---|
| **Web App** | Credit-claim: earn credits, choose a pack, redeem | `auth.js` L13/221-233 (`creditBalance`, `si_credits`), `store.js` L469 (`canClaim`), `redeem-credit` edge function |
| **MCP** | All-access: `isPro = true` unlocks everything | `validate-mcp-key` L92, `serve-premium-asset` L94-102 |

The `serve-premium-asset` edge function already treats active subs as equivalent to purchasers (L102: `if (sub) isPurchased = true`). The credit system introduces state, friction, and confusion that the MCP surface completely bypasses.

### Current credit system surface area

- `si_credits` table (earned, bonus, redeemed rows)
- `auth.js`: `creditBalance`, `getCreditBalance()`, `fetchCreditBalance()`
- `store.js`: sidebar badge, claim CTA ("Claim (X left)"), `handleCreditRedeem()`
- `redeem-credit` edge function: balance check, purchase insert
- `stripe-webhook`: subscription handling and permanent ownership grants for the approved annual offer
- Pricing copy: Monthly uses "1 collection per billing cycle"; Annual uses "all 8 current launch collections now"

---

## Part 2: Feature Audit and Pro Value Assessment

### What Supericons actually offers

| Feature | Free | Pro | Single Pack | Launch Bundle |
|---|:---:|:---:|:---:|:---:|
| Icon Explorer (20k+ icons, 10 libraries) | Yes | Yes | Yes | Yes |
| AI semantic search | Yes | Yes | Yes | Yes |
| SVG/PNG/CSS export (free icons) | Yes | Yes | Yes | Yes |
| MCP server (free icons) | Yes | Yes | Yes | Yes |
| **Motion Lab** (preview/experiment) | Yes | Yes | Yes | Yes |
| Motion Lab export (CSS + SVG download) | No | **Yes** | No | No |
| **Converter** (preview/experiment) | Yes | Yes | Yes | Yes |
| Converter download/copy | No | **Yes** | No | No |
| Premium animated collections (preview) | Yes | Yes | Purchased only | All 8 |
| Premium animated collections (export/use) | No | **All** | Purchased | All 8 |
| Premium icons via MCP | No | **All** | Purchased | All 8 |
| Commercial license (unlimited projects) | No | **Yes** | 1 project | Unlimited |

### Motion Lab: 80 animations

Full-fledged animation studio for icons. 4-quadrant workspace:

- **Motion** (25): bounce, float, shake, spin, pulse, pop, heartbeat, rubber band, jelly, ring, wobble, magnetic, recoil, pendulum, whiplash, tremor, neon glow, breathe, metronome, orbit, flicker, squish, glide, radar, beacon
- **Special** (25): sparkle, swing, jitter, chase, stream, trace, flow, converge, cube, typing, reason, sweep, scatter, crest, tap, shuffle, infinity, spatial, page flip, book open, domino, supernova, black hole, fingerprint, badge tap
- **Entrances** (15): magnetic in, fade in, scale up, slide up, spring land, slingshot, glitch on, unfold, warp in, slide right, slide down, flip in, telegram, bloom, shockwave
- **Exits** (15): fade out, scale down, slide out, vortex, glitch off, dissolve, pop out, slide left, sink down, flip out, implode, puff out, launch out, shrink spin, blink out

Properties panel: Fill palette, Stroke palette, Scale slider, Rotate slider, Opacity (Fade) slider, Playback controls (Intensity, Speed), size presets (24-128px + custom), 3 playback modes (Loop, Hover, Click).

Export (Pro-gated): Download animated SVG, Copy CSS animation code.

**Verdict**: High standalone Pro value. No direct competitor. Saves 15-30 min per animation.

### Converter: General-purpose SVG/PNG/Logo converter

Accepts user-uploaded files (not just library icons). Two modes:

- **SVG-to-PNG**: Upload or paste SVG code. Controls: size presets (32-512px + custom), fill/stroke recolor palettes (10+ colors + custom), background (transparent/white/custom), padding slider, quality (1x-4x), compare (overlay/split).
- **PNG-to-SVG**: Upload PNG logo or icon. Controls: Mode (Icon vs Logo), Preset (Auto/Compact/Exact), Output Size (Auto/Original/Custom), Background (Transparent/White/Black/Custom), Compare (Default/Split), Helpers (Auto Crop).

Export (Pro-gated): Download converted file, copy to clipboard.

**Verdict**: Moderate-to-high standalone value. Logo mode elevates it beyond a simple format converter.

### MCP Server: AI agent icon access

3 tools: `search_icons` (AI-powered with synonym expansion), `get_icon` (full SVG + metadata), `list_libraries`. Pro unlocks premium animated icons (SVG + CSS). Free tier gives 20k+ free icons.

**Verdict**: High future value, growing present value. Early-mover in AI-agent tooling space.

### Value assessment summary

| Pro Feature | Standalone Value | Subscription Justification |
|---|---|---|
| Motion Lab (80 animations + export) | High | Yes, alone worth $10-15/mo |
| MCP (premium access) | High (growing) | Yes, especially for AI-agent workflows |
| Converter (SVG/PNG + Logo mode) | Moderate-High | Strong complement |
| Premium collections | Moderate | Bonus, not driver |
| Commercial license | Table stakes | Expected at this price point |

**Key insight**: Pro subscription is justifiable on **Motion Lab + MCP alone**, without premium collections. The tools are the primary value. Collections are bonus content.

---

## Part 3: Three Strategies Considered

### Strategy A: Drop credits entirely, Pro = all-access while active

Pro unlocks all released premium collections. No credits, no claiming. Cancel = lose access.

**Fatal flaw identified**: A user can subscribe for $15, download all 8 packs, cancel, and walk away with 400 icons permanently. This undercuts Single Pack ($5) and Launch Bundle ($29).

### Strategy B: Simplified credit (1 pack/month, keep forever)

Pro Monthly gives tools + 1 pack per billing cycle to keep permanently + live access to all collections while active. Pro Annual is intentionally sweeter: it grants all 8 current launch collections immediately, plus future premium drops while the annual term is active.

**Why this works**:

| Duration | Packs Owned | Total Paid |
|---|---|---|
| 1 month (monthly) | 1 | $15 |
| 3 months (monthly) | 3 | $45 |
| 6 months (monthly) | 6 | $90 |
| 8 months (monthly) | 8 (all) | $120 |
| 1 year (annual) | 8 current launch collections immediately | $99 |

The math now protects each tier:
- Want 1 pack cheap, no tools? Single Pack $5.
- Want all 8 cheap, no tools? Launch Bundle $29.
- Want tools + gradual collection building? Pro monthly.
- Want upfront ownership + tools + retention-friendly yearly billing? Pro Annual.

### Strategy C: Accept the leak

Accept that some users subscribe and cancel. Bet on tools for retention.

**Rejected for launch**: Only works when catalog is large enough that 1 month cannot cover everything. With 8 collections, the exploit is too easy.

---

## Part 4: Decision

**Option B: Simplified credit** is the right answer for launch.

The original credit system was solving the correct problem (preventing the subscribe-download-cancel exploit). What should be retired is the **UI complexity** (balance badge, visible counter, claim CTA with "X left"), not the concept.

### What "simplified" means

- Pro gives live access (preview, MCP, Motion Lab) to ALL collections while active
- Pro Monthly gives 1 collection per month to permanently own
- Pro Annual grants all 8 current launch collections immediately and keeps future premium drops gated to the active annual term
- Annual plan still carries the 45% discount ($99/yr vs $180/yr), but it is now also a distinct ownership offer
- No visible credit balance. No sidebar badge. No "X credits remaining"
- Pack card shows "Add to My Collection" for eligible Pro users
- After monthly claim, button shows "Next available [date]"
- Eligibility is determined server-side (new `claim-status` endpoint), not by frontend date math
- Previous credit-claimed packs (`si_purchases` with `source: 'credit'`) remain valid

### Product framing (final)

| Offer | Core Value | Collections | Duration |
|---|---|---|---|
| **Pro Monthly ($15/mo)** | Motion Lab, Converter, MCP, commercial license | 1 collection/month (keep forever) + access all while active | While active |
| **Pro Annual ($99/yr)** | Same, save 45% | Own all 8 current launch collections now + future premium drops while active | Included collections are permanent; future drops while active |
| **Single Pack ($5)** | None (tools not included) | 1 collection, permanent | Forever |
| **Launch Bundle ($29)** | None (tools not included) | All 8 launch collections, permanent | Forever |

---

## Part 5: Converter Naming Discussion

**Question**: Should "Icon Converter" be renamed to "Icon/Logo Converter"?

**Decision**: Keep "Icon Converter."

- The slash reads like indecision, not a product name.
- "Icons" includes logos in developer mental models (Simple Icons = 3,400+ brand logos called "icons").
- The PNG-to-SVG mode already has a Mode toggle (Icon vs Logo) that adapts behavior.
- SEO: "icon converter" is a cleaner search term. Logo support is communicated through page content and meta description.
- If logo support needs signaling, use a subtitle: "Icon Converter" with "Convert SVGs, PNGs, and logos" as description.

---

## Appendix: Audit Findings and Resolutions (2026-04-06)

Five structural issues were identified in the initial implementation plan. All have been resolved:

| Finding | Resolution |
|---|---|
| Annual policy inconsistent (auto-grant all packs contradicts 1/month model) | Annual = 1/month, same as monthly. The 45% discount IS the perk. |
| `current_period_end - 1 month` is fragile for eligibility | New `claim-status` server-side endpoint. No frontend date math. |
| `annual_bonus` source not wired through `download-pack` | Eliminated. No auto-grant, no new source value. |
| Existing annual subscribers not backfilled | Not needed. Uniform 1/month for all plan types. |
| Frontend claim status fetched per card render | Fetch once per premium view, cache result, invalidate after claim. |
