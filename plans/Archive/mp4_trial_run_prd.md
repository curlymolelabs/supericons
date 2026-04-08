# Trial Run PRD: MP4 Preview vs. Live CSS Animation

## Goal

Validate that an MP4 recorded from the CSS hover animation is
visually indistinguishable from the live animation, at identical
pixel size, before generating all 400 icons.

---

## What We Are Building

A standalone **trial comparison page** added to the Supericons
app at `/trial-preview` (static HTML, no routing required). It
shows one pair side by side:

| Left cell | Right cell |
|---|---|
| Live SVG + CSS hover animation (original) | `<video>` MP4, plays on hover |
| Identical `.collection-detail__icon-cell` markup | Same cell CSS, same dimensions |
| `agent-workflow` icon | `agent-workflow.mp4` |

The page inherits all existing CSS from `style.css` and the
`ai-agentic.css` animation pack so the live cell is a perfect
reproduction of the real collection page.

---

## Success Criteria

1. Both cells occupy exactly the same pixel footprint (same card size, icon container size)
2. MP4 plays on hover, pauses on mouse leave, resets to frame 0
3. MP4 file size is under 50KB
4. Visual quality is subjectively indistinguishable at normal viewing distance
5. No SVG source code is exposed in the MP4 cell's DOM

---

## Technical Spec

### Step 1: Install prerequisites

```powershell
winget install ffmpeg
npm install -D playwright
npx playwright install chromium
```

### Step 2: Playwright capture script

**File:** `supericons/scripts/capture-icon.js`

What it does:
1. Launches Chromium headless
2. Loads a minimal HTML harness (`scripts/capture-harness.html`) that contains:
   - The `agent-workflow.svg` inline
   - The `ai-agentic.css` animation styles
   - A `.si-icon-cell` wrapper sized to match the real page
3. Programmatically triggers `:hover` via `page.hover()`
4. Uses `page.screenshot()` in a 60fps loop for 1500ms to capture frames
5. Saves frames as PNGs to `scripts/tmp-frames/`

**Capture settings:**
- Element size: match real icon preview (`64px x 64px` inner SVG area)
- Viewport: `120x120px` (card slightly larger than SVG to include padding)
- Background: `#0f0f10` (matches `--si-surface-container` dark theme)
- Total frames: `~90` (60fps x 1.5s)

### Step 3: ffmpeg encode

```bash
ffmpeg -framerate 60 -i scripts/tmp-frames/frame-%03d.png \
  -vf "scale=120:120" \
  -c:v libx264 -crf 18 -pix_fmt yuv420p \
  -movflags +faststart \
  public/packs/ai-agentic/previews/agent-workflow.mp4
```

Target output: `agent-workflow.mp4` under 50KB, ~120x120px.

### Step 4: Trial comparison page

**File:** `supericons/trial-preview.html`

Layout: two `.collection-detail__icon-cell` cards side by side in
a centered flex container, using all existing CSS from the app.

Left cell (live):
```html
<div class="collection-detail__icon-cell si-icon-cell">
  <div class="collection-detail__icon-preview si-anim si-anim--agent-workflow">
    <!-- inline SVG from agent-workflow.svg -->
  </div>
  <span class="collection-detail__icon-name">agent-workflow</span>
  <span class="collection-detail__icon-purpose">Live CSS hover</span>
</div>
```

Right cell (MP4):
```html
<div class="collection-detail__icon-cell" id="mp4Cell">
  <div class="collection-detail__icon-preview">
    <video src="/packs/ai-agentic/previews/agent-workflow.mp4"
           muted playsinline preload="none"
           style="width:100%;height:100%;object-fit:contain;"></video>
  </div>
  <span class="collection-detail__icon-name">agent-workflow</span>
  <span class="collection-detail__icon-purpose">MP4 hover-play</span>
</div>
```

Hover-to-play JS (inline, ~10 lines):
```js
const mp4Cell = document.getElementById('mp4Cell');
const video = mp4Cell.querySelector('video');
mp4Cell.addEventListener('mouseenter', () => {
  video.currentTime = 0;
  video.play();
});
mp4Cell.addEventListener('mouseleave', () => {
  video.pause();
  video.currentTime = 0;
});
```

### Step 5: Verify

Access `http://localhost:5173/trial-preview.html` in browser.

| Check | Pass condition |
|---|---|
| Both cells same size | Ruler overlay or devtools box confirms equal width/height |
| MP4 plays on hover | Video animates when mouse enters right cell |
| MP4 pauses on leave | Video stops, resets to frame 0 on mouse leave |
| File size logged | Check `agent-workflow.mp4` size in Explorer |
| Visual match | Side-by-side look indistinguishable at normal zoom |

---

## Files Changed / Created

| File | Status |
|---|---|
| `supericons/scripts/capture-icon.js` | NEW |
| `supericons/scripts/capture-harness.html` | NEW |
| `supericons/public/packs/ai-agentic/previews/agent-workflow.mp4` | NEW (generated) |
| `supericons/trial-preview.html` | NEW |

No existing files are modified.

---

## Out of Scope for Trial

- Full 400-icon generation
- Routing integration into the main app
- IntersectionObserver lazy loading
- Phase 2 (server-side gating)

---

## Decision Point After Trial

If the trial passes all 5 success criteria, proceed to:
1. A runner script that generates all 400 MP4s in batch
2. Integration of the `<video>` cell into the real `renderCollectionDetail` function for non-purchasers
