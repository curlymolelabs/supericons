# SuperIcons: Master Implementation Plan

## Overview

SuperIcons is a free, open-source icon aggregator that outclasses IconStack in every dimension. It serves both human designers/developers and AI agents with 60K+ icons, AI semantic search, true variable font axes, component code export, and container preview.

**Tech stack:** Vite (vanilla JS), vanilla CSS, no backend for MVP
**Location:** `supericons/`

---

## Build 1: Foundation & Layout Shell

### Goal
Ship the empty shell: responsive 3-column layout, design system, header, footer. No icons yet.

### Files

#### [NEW] `supericons/index.html`
- SEO meta tags (title, description, OG tags)
- Google Fonts: Space Grotesk, Manrope, Inter, Material Symbols Outlined
- Root `<div id="app">` for Vite

#### [NEW] `supericons/style.css`
- CSS custom properties: full Kinetic Architect color palette, type scale, spacing, radii
- Reset/normalize
- `.layout` 3-column grid (sidebar 240px | main 1fr | panel 320px)
- Header bar (logo, search input, nav)
- Sidebar (library list with counts)
- Icon grid (CSS grid, responsive columns)
- Customization panel (sticky right)
- Footer
- Dark theme default, smooth transitions

#### [NEW] `supericons/main.js`
- Sidebar toggle (mobile collapse)
- Panel toggle (show/hide customize)
- Placeholder text in grid ("Icons will appear here")

#### [NEW] `supericons/package.json` + `vite.config.js`
- Vite dev server config

---

## Build 2: Icon Data Pipeline & Rendering

### Goal
Load real icons: Material Symbols via variable font, Lucide + Tabler via SVG data. Render in a performant virtual grid.

### Files

#### [NEW] `supericons/scripts/build-icons.js`
- Node script that:
  1. Reads Lucide SVGs from `node_modules/lucide-static/icons/`
  2. Reads Tabler SVGs from `node_modules/@tabler/icons/icons/outline/`
  3. Outputs `supericons/public/icon-index.json` with structure:
     ```json
     [{ "name": "home", "lib": "lucide", "tags": ["house","building"], "svg": "<svg>...</svg>" }]
     ```
- Material Symbols handled separately (font-based, not SVG)

#### [NEW] `supericons/public/icon-index.json`
- Generated file, ~5-15MB compressed

#### [MODIFY] `supericons/main.js`
- Fetch and parse `icon-index.json`
- Render Material Symbols as `<span>` with variable font
- Render SVG icons as inline SVG in grid cells
- Virtual scrolling: only render visible rows (IntersectionObserver)
- Library sidebar populated with real counts

#### [NEW] `supericons/public/material-symbols.json`
- List of all Material Symbol icon names (~3,400 entries)

---

## Build 3: Search & Filtering

### Goal
Real-time search across all libraries with synonym matching.

#### [MODIFY] `supericons/main.js`
- Search input: debounced keyup (150ms)
- Filter icons by name substring match
- Filter by library (sidebar click)
- Result count display ("Showing 342 of 15,847 icons")

#### [NEW] `supericons/data/synonyms.json`
- Hand-curated synonym map: `{"home": ["house","residence","dwelling"], "lock": ["security","key","auth"], ...}`
- ~200 entries covering common concepts

---

## Build 4: Customization Panel

### Goal
Full customization: color, gradient, stroke, and Material Symbols 4-axis control.

#### [MODIFY] `supericons/main.js`
- Color picker: hex input + 16 preset swatches + HSL gradient canvas
- Gradient builder: linear angle picker + 2-stop gradient
- Stroke width slider (0.5-3.0px, for SVG icons)
- Material Symbols axes: 4 sliders (wght 100-700, FILL 0-1, GRAD -25-200, opsz 20-48)
- Apply styles to selected icon preview in real-time
- Apply styles globally to grid (optional toggle)

#### [MODIFY] `supericons/style.css`
- Customize panel component styles
- Slider styles, color swatch grid, preview area

---

## Build 5: Export System

### Goal
Copy/download icons in all formats, including framework component code.

#### [MODIFY] `supericons/main.js`
- **Copy SVG:** clipboard API, with customizations baked in (color, stroke)
- **Download SVG:** Blob + anchor download
- **Download PNG:** render SVG to canvas, export as PNG at 1x/2x/4x
- **Copy as component:** Template strings for React, Vue, Svelte, HTML, Flutter
- Export format selector in panel
- Toast notification on copy ("Copied to clipboard!")

---

## Build 6: Container Previewer & Micro-Animations

### Goal
Preview icons inside real UI containers with animation presets.

#### [MODIFY] `supericons/main.js`
- Container shape selector: none, circle, squircle, rounded-rect, pill, glass
- Container background color (independent of icon color)
- Badge/notification dot toggle (red dot, top-right)
- Dark/light preview background toggle
- Animation preset selector: none, spin, pulse, bounce, shake
- CSS classes for each animation

#### [MODIFY] `supericons/style.css`
- Container shape classes
- Glassmorphism styles (backdrop-blur, semi-transparent bg)
- Squircle via CSS clip-path
- `@keyframes` for spin, pulse, bounce, shake

---

## Build 7: Collections & Batch Operations

### Goal
Save, organize, and batch-export icons.

#### [MODIFY] `supericons/main.js`
- Favorites: heart toggle per icon, stored in localStorage
- Recents: track last 50 viewed icons
- Collections view: "Favorites" and "Recent" pseudo-libraries in sidebar
- Side-by-side comparison: select 2-4 icons, show in comparison overlay
- Multi-select mode: checkbox overlay on grid, select multiple icons
- Batch ZIP download: JSZip library, download selected icons as ZIP

---

## Build 8: Polish, Responsive, SEO

### Goal
Production-ready quality.

#### [MODIFY] All files
- Responsive: sidebar collapses to hamburger on mobile, panel becomes bottom sheet
- Keyboard shortcuts: `/` focus search, `Esc` clear, arrow keys navigate grid
- Smooth page transitions, loading skeletons
- SEO: structured data (JSON-LD), canonical URL, sitemap stub
- Performance: lazy-load icon grid, compressed assets

---

## Verification Plan

### After each build: Browser audit
1. Run `npm run dev` in `supericons/`
2. Open in browser via browser tool
3. Visual inspection: layout, colors, typography, interactions
4. Functional check: all features from that build work as specified
5. Gap identification: any missing behavior, broken styles, or UX friction
6. Fix all gaps before proceeding to next build

### Final verification (after Build 8)
- Full walkthrough recording of all features
- Performance check (Lighthouse or manual)
- Responsive check (resize browser window)
