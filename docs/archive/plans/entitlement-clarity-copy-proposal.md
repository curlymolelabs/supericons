# Entitlement Clarity: Motion Lab and Converter Copy Proposal

**Date:** 11 April 2026
**Source plan:** `docs/plans/entitlement-clarity-audit-plan.md`
**Source live:** `docs-pages.js` (read in full, April 11 2026)
**Scope:** All Motion Lab and Converter pages, plus related entitlement copy in adjacent sections
**Method:** Audit each element against the plan's three-tier entitlement model, then propose the exact replacement copy.

---

## The entitlement model being enforced

The audit plan defines one authoritative model. Every page and sentence in this proposal is measured against it:

| Capability | Available to |
|---|---|
| Open the tool in the browser | Anyone (no account required) |
| Use the controls and preview the result | Anyone (no account required) |
| Export, download, or copy the final output | Pro or eligible purchased collection |
| Call MCP tools for Motion Lab or Converter output | Pro or eligible purchased collection |

**The core problem in the live copy:** several sections collapse exploration and export into one broad "access" statement, implying the tool itself is gated. That is inaccurate and loses potential Pro conversions from users who do not realize they can try before they buy.

---

## How to read this document

Each finding shows:
- **Live:** the current text in `docs-pages.js`
- **Issue:** which part of the entitlement model is violated or obscured
- **Proposed:** the exact replacement copy
- **Verdict:** change label

---

---

# SECTION 1: Motion Lab Introduction (`docs-motion-lab`)

---

## 1.1 "How to access Motion Lab" - browser bullet (line 971)

**Live:**
> Open the Supericons Motion Lab with a Pro account. Select any icon and use the Motion Lab panel to preview and export animations.

**Issue:** "With a Pro account" is the first clause. This implies you need Pro to open the tool at all. The correct model: anyone can open Motion Lab and use the controls. Pro is required only to export.

**Proposed:**
> Open the Supericons Motion Lab - no account required. Select any icon to browse the preset panel and preview animations in real time. Exporting your animation as CSS or SVG requires Pro or an eligible collection.

---

## 1.2 "How to access Motion Lab" - entitlement paragraph (line 974)

**Live:**
> **Both paths require a Pro subscription or a purchased animated icon collection.**

**Issue:** This sentence applies the Pro requirement to both the browser UI and the MCP path without distinction. The browser path only gate-keeps export, not exploration. The MCP path gate-keeps all output. These are different entitlements.

**Proposed:**
> **Browser:** Open and preview with any account. Exporting CSS or SVG output requires Pro or an eligible collection.
> **MCP:** All Motion Lab tools require Pro or an eligible collection and a valid API key.

---

## 1.3 `summary` field (line 962)

**Live:**
> CSS animation presets for Supericons icons.

**Issue:** Accurate but passive. Does not address what the user can do or how access works. For a section that has an entitlement story, the summary is a good place to prime the reader.

**Proposed:**
> Preview animation presets for free. Export as CSS or animated SVG with Pro or a collection.

**Verdict: Minor refinement.** Sets the explore-free / export-Pro expectation in one line.

---

## 1.4 Routing cards (lines 990, 997, 1004)

| Card | Live body | Issue | Proposed |
|---|---|---|---|
| Presets | `Full list of available presets with descriptions and categories.` | No issue. | No change. |
| Trigger Types | `Understand loop, hover, and click behavior before exporting.` | "Before exporting" implies the reader is already Pro-gated. | `Understand loop, hover, and click behavior before you export.` - actually no change needed; this is fine. |
| Exports | `How to use CSS and animated SVG output in your project.` | No issue; correctly scoped to output use. | No change. |

**Verdict: No changes needed to routing cards.**

---

---

# SECTION 2: Motion Lab Presets (`docs-motion-lab-presets`)

---

## 2.1 `summary` (line 1014)

**Live:**
> Supericons Motion Lab ships 12 presets across 5 categories. All presets support three trigger types (loop, hover, click) and accept duration (100ms to 4000ms) and intensity (25% to 200%) adjustments.

**Issue:** None. Accurate, complete, entitlement-neutral. The preset page is a reference for all users regardless of access level.

**Verdict: No change.**

---

## 2.2 "Preset categories explained" section (lines 1064-1078)

**Issue:** None. Each category description is functional and context-appropriate. No entitlement language is present, which is correct - categories apply regardless of whether you are previewing or exporting.

**Verdict: No change.**

---

---

# SECTION 3: Trigger Types (`docs-motion-lab-triggers`)

---

## 3.1 `summary` (line 1086)

**Live:**
> Every Motion Lab preset supports three trigger types. The trigger controls when the animation starts and how many times it plays. Choose based on the context where the icon appears.

**Issue:** None. Accurately scoped to everyone; trigger choice is relevant at preview and at export.

**Verdict: No change.**

---

## 3.2 Body content (lines 1090-1122)

**Issue:** None. No entitlement language present. The trigger documentation is reference material that serves all users.

**Verdict: No change.**

---

---

# SECTION 4: Motion Lab Exports (`docs-motion-lab-exports`)

---

## 4.1 `summary` (line 1132)

**Live:**
> Motion Lab produces two output formats: Motion Lab CSS and animated SVG. Both are production-ready. Choose based on how you want to manage the SVG and animation in your project.

**Issue:** The summary does not mention that export requires Pro. A user who reads this and does not have Pro will reach the export step and hit a gate that was never signaled. Stripe's principle: gate surprises are bad UX. Signal the gate at the top.

**Proposed:**
> Motion Lab produces two export formats: Motion Lab CSS and animated SVG. Both are production-ready. Exporting requires Pro or an eligible collection. Choose the format based on how you manage your SVG and animation files.

**Verdict: Minor refinement.** One sentence added. Gate is signaled upfront.

---

## 4.2 "Motion Lab CSS - How to use it" steps (lines 1140-1141)

**Live:**
> 1. Get the SVG from Supericons using `search_icons` or `get_icon`.
> 2. Get the CSS from `export_motion_css` using your chosen preset and trigger.

**Issue:** Step 1 is free (search_icons and get_icon are free tools). Step 2 requires Pro. The list does not distinguish these. A free user will follow step 1 successfully, then fail at step 2 without knowing why.

**Proposed:**
> 1. Get the SVG from Supericons using `search_icons` or `get_icon`. (Free)
> 2. Call `export_motion_css` with your chosen preset and trigger to get the CSS. (Requires Pro or eligible collection)
> 3. Place the SVG inside a container with `id="icon-container"`:

**Verdict: Change needed.** The access distinction at the step level prevents a confusing failure at step 2.

---

## 4.3 "Which format should I use?" table (lines 1188-1194)

**Issue:** None. The table is functional and entitlement-neutral. It answers a usage question, not an access question.

**Verdict: No change.**

---

---

# SECTION 5: Converter Guide (`docs-converter-guide`) - Placeholder

---

## 5.1 `summary` (line 1204)

**Live:**
> This section will become the main guide to SVG and PNG conversion workflows in Supericons.

**Issue:** Internal note visible as a page subtitle. Does not reflect the entitlement model.

**Proposed interim summary:**
> Convert PNG to SVG and SVG to PNG. Preview your result in the browser for free. Downloading the output requires Pro or an eligible collection.

**Verdict: Change needed.** The summary is user-facing now. It must prime the explorer-free / export-Pro model.

---

## 5.2 Placeholder body title and summary

**Live title:** `This page will explain Converter as a workflow`
**Live placeholder body:** `It will cover what Converter is good at, what input works best, and how to choose the right path for each source file.`

**Issue:** Both are internal notes visible to all users. Until the full body is written, an interim placeholder should at minimum reflect the correct access model.

**Proposed interim placeholder title:** `Converter: what you can do`
**Proposed interim placeholder body:** `Upload a PNG or SVG to see your result in real time. Downloading the converted file requires Pro or an eligible collection. Choose your conversion path below.`

**Verdict: Change needed.** Sets the right expectation in the placeholder state.

---

---

# SECTION 6: PNG to SVG (`docs-converter-png-to-svg`) - Placeholder

---

## 6.1 `summary` (line 1218)

**Live:**
> This page will explain how to get cleaner vector output from raster artwork.

**Issue:** Internal note visible as subtitle.

**Proposed interim summary:**
> Trace a PNG into an SVG. Preview the result in the browser. Download the SVG file with Pro or an eligible collection.

**Verdict: Change needed.**

---

## 6.2 Placeholder body

**Live placeholder title:** `This page will cover PNG to SVG tracing`
**Live placeholder body:** `It will explain how source image complexity, trace class, and output settings affect the final SVG.`

**Proposed interim title:** `PNG to SVG: how it works`
**Proposed interim body:** `Upload your PNG to preview the traced SVG result. Simple, flat-color images trace best. Complex photos and gradients do not trace cleanly. Downloading your SVG requires Pro or an eligible collection.`

**Verdict: Change needed.**

---

---

# SECTION 7: SVG to PNG (`docs-converter-svg-to-png`) - Placeholder

---

## 7.1 `summary` (line 1231)

**Live:**
> This page will explain how to export SVG artwork to PNG cleanly at the right size.

**Issue:** Internal note visible as subtitle.

**Proposed interim summary:**
> Render an SVG as a PNG at any size. Preview in the browser. Download the PNG with Pro or an eligible collection.

**Verdict: Change needed.**

---

## 7.2 Placeholder body

**Live placeholder title:** `This page will cover SVG to PNG export`
**Live placeholder body:** `It will explain target width, background choices, and when this export path makes the most sense.`

**Proposed interim title:** `SVG to PNG: how it works`
**Proposed interim body:** `Paste or upload your SVG and choose an output width and background color to preview the PNG. Output sizes range from 16 to 2048 pixels wide. Downloading the PNG requires Pro or an eligible collection.`

**Verdict: Change needed.**

---

---

# SECTION 8: Converter Settings (`docs-converter-settings`) - Placeholder

---

## 8.1 `summary` (line 1244)

**Live:**
> This page will become the detailed reference for traceClass, qualityMode, and uiMode.

**Issue:** Internal note visible as subtitle.

**Proposed interim summary:**
> Reference for traceClass, qualityMode, and uiMode settings in the PNG to SVG converter.

**Verdict: Change needed.** Short, descriptive, entitlement-neutral. (Settings are chosen at the preview stage, so no gate language needed here.)

---

---

# SECTION 9: MCP Tools Overview (`docs-mcp-tools`)

---

## 9.1 Intro paragraph (lines 585-586)

**Live:**
> The Supericons MCP server exposes 11 tools your coding agent can call directly. Three tools are free and work without an account. Eight tools are Pro-only and require a valid `SUPERICONS_API_KEY` linked to an account with Pro or a purchased collection.

**Issue:** Accurate for MCP. No entitlement violation here - in the MCP context, all Motion Lab and Converter outputs are fully unlocked or fully gated (there is no "preview" state in an MCP call). The binary "free / Pro-only" framing is correct for MCP.

**Verdict: No change.**

---

## 9.2 All tools table (lines 600-611)

**Issue:** All Motion Lab and Converter tools are correctly marked "Pro." The MCP reference is accurately binary.

**Verdict: No change.**

---

---

# SECTION 10: MCP Motion Lab Tools (`docs-mcp-motion`)

---

## 10.1 Intro paragraph (line 702)

**Live:**
> These five tools expose Motion Lab capabilities to your coding agent. All five are Pro-only and require a valid `SUPERICONS_API_KEY` linked to a Pro account or a purchased animated collection.

**Issue:** Accurate in the MCP context. No browser/MCP conflation. Correct.

**Verdict: No change.**

---

## 10.2 Individual tool Access lines

All five tools (list_motion_presets, get_motion_recipe, animate_icon, export_motion_css, export_animated_svg) correctly display `Access: Pro.`

**Issue:** None. MCP access is correctly binary.

**Verdict: No change.**

---

---

# SECTION 11: MCP Converter Tools (`docs-mcp-converter`)

---

## 11.1 Intro paragraph (line 817)

**Live:**
> These three tools expose Converter capabilities to your coding agent. All three are Pro-only. The `traceClass` parameter in `convert_png_to_svg` has six values with meaningfully different output results. Read the reference below before choosing.

**Issue:** Accurate. No entitlement violation. Correct.

**Verdict: No change.**

---

## 11.2 Individual tool Access lines

All three tools (inspect_converter_options, convert_svg_to_png, convert_png_to_svg) correctly display `Access: Pro.`

**Verdict: No change.**

---

---

# SECTION 12: Cross-section - What Is Supericons Free vs. Pro table

The entitlement audit plan specifically calls out the binary table rows as problematic. The current rows in `docs-copy-bible.md` (and proposed for `docs-what-is-supericons`) include:

**Current rows (binary, misleading):**

| Feature | Free | Pro |
|---|---|---|
| Motion Lab: animation presets, browser | No | Yes |
| Converter: PNG to SVG, browser | No | Yes |
| Converter: SVG to PNG, browser | No | Yes |

**Issue:** "Motion Lab: animation presets, browser - Free: No" implies you cannot use Motion Lab without Pro. The correct model: you can open and preview. You cannot export without Pro.

**Proposed replacement rows:**

| Feature | Free | Pro |
|---|---|---|
| Open Motion Lab and preview animation presets in browser | Yes | Yes |
| Export Motion Lab CSS or animated SVG | No | Yes |
| Open Converter and preview conversion result in browser | Yes | Yes |
| Download converted file (PNG or SVG) | No | Yes |
| Motion Lab tools via MCP | No | Yes |
| Converter tools via MCP | No | Yes |

**Verdict: Change needed.** The old rows actively misinform users. The new rows convert a "No" to a "Yes" on the exploration capability and add a clear separate row for the gated export. This is both more accurate and better for conversion - users who see "open and preview: free" are more likely to try the tool.

---

---

# SECTION 13: Docs Home (`docs`) - Card 3

---

## 13.1 "Learn Motion Lab" card body (line 87)

**Live:**
> Presets, trigger types, and how to export animations as CSS or standalone SVG.

**Issue:** "Export animations" as the lead value proposition implies the card is for Pro users only. But the Presets and Trigger Types pages are fully usable without Pro.

**Proposed:**
> Browse presets, preview animations, and export as CSS or animated SVG.

**Verdict: Minor refinement.** "Browse presets, preview animations" signals free access first. "Export" is retained as the Pro-gated payoff.

---

---

# SECTION 14: Quickstart (`docs-quickstart`) - Premium setup section

---

## 14.1 Premium setup intro (line 139)

**Live:**
> To access premium animated collections, Motion Lab, and Converter through MCP, you need three things in place before your agent can use them.

**Issue:** "To access Motion Lab... through MCP" is correct and accurate. This is about MCP access, not browser access. But MCP and browser entitlements are different - this paragraph does not address them as such.

However - this is the Quickstart, scoped to MCP setup. The browser entitlement story does not belong here.

**Verdict: No change.** In this context (MCP Quickstart), the binary Pro gate is correct.

---

---

# Summary of all findings

| # | Page | Element | Verdict |
|---|---|---|---|
| 1.1 | `docs-motion-lab` | "How to access" browser bullet | **Change needed** |
| 1.2 | `docs-motion-lab` | "Both paths require" paragraph | **Change needed** |
| 1.3 | `docs-motion-lab` | `summary` | Minor refinement |
| 1.4 | `docs-motion-lab` | Routing cards | No change |
| 2.1 | `docs-motion-lab-presets` | `summary` | No change |
| 2.2 | `docs-motion-lab-presets` | Category descriptions | No change |
| 3.1 | `docs-motion-lab-triggers` | `summary` | No change |
| 3.2 | `docs-motion-lab-triggers` | Body content | No change |
| 4.1 | `docs-motion-lab-exports` | `summary` | Minor refinement |
| 4.2 | `docs-motion-lab-exports` | "How to use it" steps | **Change needed** |
| 4.3 | `docs-motion-lab-exports` | "Which format" table | No change |
| 5.1 | `docs-converter-guide` | `summary` | **Change needed** |
| 5.2 | `docs-converter-guide` | Placeholder body | **Change needed** |
| 6.1 | `docs-converter-png-to-svg` | `summary` | **Change needed** |
| 6.2 | `docs-converter-png-to-svg` | Placeholder body | **Change needed** |
| 7.1 | `docs-converter-svg-to-png` | `summary` | **Change needed** |
| 7.2 | `docs-converter-svg-to-png` | Placeholder body | **Change needed** |
| 8.1 | `docs-converter-settings` | `summary` | **Change needed** |
| 9.1 | `docs-mcp-tools` | Intro paragraph | No change |
| 9.2 | `docs-mcp-tools` | Tools table | No change |
| 10.1 | `docs-mcp-motion` | Intro paragraph | No change |
| 10.2 | `docs-mcp-motion` | Access lines | No change |
| 11.1 | `docs-mcp-converter` | Intro paragraph | No change |
| 11.2 | `docs-mcp-converter` | Access lines | No change |
| 12 | `docs-what-is-supericons` | Free vs. Pro table rows | **Change needed** |
| 13.1 | `docs` (Home) | "Learn Motion Lab" card body | Minor refinement |
| 14.1 | `docs-quickstart` | Premium setup intro | No change |

**Total: 27 elements reviewed.**

| Verdict | Count |
|---|---|
| Change needed | 11 |
| Minor refinement | 3 |
| No change | 13 |

---

## Key pattern: MCP pages are clean, browser pages need work

The MCP-specific pages (`docs-mcp-motion`, `docs-mcp-converter`, `docs-mcp-tools`) all use the correct binary model because MCP access is genuinely binary. These pages require no changes.

The browser-facing Motion Lab introduction and Converter placeholders conflate exploration with export. These pages need the three-tier model applied explicitly:

1. Open and preview (free, browser)
2. Export and download (Pro gate, browser)
3. MCP tool output (Pro gate, MCP)

---

## Implementation priority

**Do first (visible now, misleading now):**
1. `docs-motion-lab` browser access bullet and entitlement paragraph (1.1 and 1.2)
2. All four Converter `summary` fields (5.1, 6.1, 7.1, 8.1)
3. Free vs. Pro table rows in `docs-what-is-supericons` (12)

**Do second (UX completeness):**
4. `docs-motion-lab-exports` summary and export steps (4.1 and 4.2)
5. All four Converter placeholder body titles and bodies (5.2, 6.2, 7.2)

**Do last (polish):**
6. `docs-motion-lab` summary (1.3)
7. `docs` home card 3 body (13.1)
