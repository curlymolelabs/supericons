# Premium Icon Protection: Research Findings

> Trial conclusion: MP4/video rasterization cannot match CSS animation
> smoothness at icon sizes. This document presents alternative strategies.

---

## The Hard Truth (From Research)

**Once digital content is rendered in a browser, it can be copied.**
Every icon marketplace (Lordicon, Flaticon, Noun Project, IconScout)
accepts this reality. None of them have uncrackable DRM. Their strategy
is **deterrence + friction + legal enforcement**, not prevention.

---

## Strategies Ranked by Effectiveness

### 1. Server-Side Gating (High Impact, Moderate Effort)

**What:** Move premium SVGs out of `public/`. Serve them through a
Supabase Edge Function that validates the API key or purchase record
before returning the file.

**How it works:**
- Free users see the icon grid but SVGs are fetched from
  `https://[project].supabase.co/functions/v1/serve-icon?slug=agent-workflow`
- Edge Function checks `Authorization` header against `si_purchases`
- Returns the SVG only if purchased; otherwise returns a 403

**What it stops:** Direct URL access, curl scraping, bot harvesting.
Cannot stop a paying customer from sharing their files after download.

**Effort:** ~4 hours. Edge Function + move files to Supabase Storage.

---

### 2. CSS/SVG Obfuscation (Medium Impact, Low Effort)

**What:** Rename all semantic CSS class names and SVG element IDs
to random tokens before serving. Strip comments. Minify.

**Before:** `.si-agwf-n1`, `.si-anim--agent-workflow`
**After:** `.x7k2`, `.q9m`

**What it stops:** Casual "Inspect Element, copy CSS" theft. The
animation code still works but is unreadable and hard to repurpose.

**What it doesn't stop:** A developer who really wants it can still
reconstruct the logic. But the effort goes from 2 minutes to 2 hours.

**Effort:** ~2 hours. Build a Node script that runs as a post-process step.

---

### 3. Canvas/WebGL Rendering (High Impact, High Effort)

**What:** Render the SVG+CSS animation inside a `<canvas>` element
instead of the DOM. The browser draws pixels directly; the SVG source
never appears in the DOM tree, DevTools, or network tab.

**How:** Use `CanvasRenderingContext2D.drawImage()` with an offscreen
SVG, or render the animation via a JS-driven `requestAnimationFrame`
loop that reads the SVG animation state and paints it onto canvas.

**What it stops:** DOM inspection, "View Source", DevTools copy. The
canvas only exposes pixels, never code.

**Tradeoff:** Complex to implement. Requires translating CSS animations
into JS-driven canvas paint calls. Hover interaction needs manual
event handling. ~2 weeks of work.

---

### 4. Invisible Watermarking (Low-Medium Impact, Medium Effort)

**What:** Embed unique per-customer identifiers in the SVG (invisible
sub-pixel elements, metadata, or path micro-offsets). If a stolen icon
surfaces, trace it back to the customer who leaked it.

**What it stops:** Nothing in real-time. It's forensic: useful for
enforcement after the fact.

**Effort:** ~1 day for the embedding script.

---

### 5. Legal + Licensing (Baseline, Already Partially Done)

**What:** Copyright notices in SVG comments, clear license terms,
DMCA takedown process.

**Industry standard:** Lordicon, Flaticon, Noun Project all rely
heavily on this as their primary enforcement mechanism.

---

## How The Industry Actually Does It

### Lordicon (Closest Competitor)
- **Previews:** Low-res GIF/WebP on the browse page, no source
- **Purchase:** Full Lottie JSON + After Effects project files
- **Protection:** Licensing enforcement, not technical DRM
- **Key insight:** They do NOT try to prevent copying. They make the
  premium version meaningfully better (editable source files, no
  attribution required) so paying is the obvious choice.

### Flaticon / Freepik
- **Previews:** PNG thumbnails, watermarked
- **Purchase:** Clean SVG/EPS files
- **Protection:** Watermarks on free, licensing on paid

---

## Recommended Strategy for Supericons

Given the trial run results and industry research, here is the
pragmatic path:

### Phase 1: Server-Side Gating (Do Now)
Move SVGs behind Supabase Edge Function auth.
Stops: bots, scrapers, casual theft.
Effort: 4 hours.

### Phase 2: CSS Obfuscation (Do Now)
Build-time script to rename classes and minify.
Stops: casual "copy CSS" theft.
Effort: 2 hours.

### Phase 3: Make Premium Worth Buying (Strategic)
Following Lordicon's model: the real protection is making the paid
version meaningfully better than anything someone could steal:
- Editable source files (After Effects, Figma components)
- No attribution requirement
- MCP/API access for agentic integration
- Priority support and updates

### Skip: Video Rasterization
Trial proved it cannot match CSS animation quality at icon sizes.
H.264 chroma subsampling destroys color and smoothness.

### Defer: Canvas Rendering
Too much effort for current scale. Revisit if/when theft becomes
a measurable business problem.
