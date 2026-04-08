# Secondary Pages Shell And Docs Alignment Plan

## Goal

Bring non-icon pages into a more consistent Supericons product shell so they feel like part of the same site instead of a mix of app views and standalone docs.

This plan covers three concrete issues:

1. Terms of Service body text is visually too bright relative to the page heading treatment.
2. The MCP docs currently live as a standalone microsite and do not share the main site shell, typography, or color system.
3. Non-icon pages should suppress the customize side panel by default, matching the behavior already used on Pricing, Motion Lab, and Converter.

## Current Repo Findings

### 1. Terms already lives inside the app shell

The Terms page is already rendered as an in-app view from [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js), not as a separate static page.

- `switchView('terms')` exists in [main.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js)
- `renderTermsPage()` builds the view in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)
- Terms styling is in [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css)

### 2. MCP is still a separate docs system

The MCP hub is currently served from [public/mcp/index.html](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/public/mcp/index.html) and styled by [public/mcp/docs.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/public/mcp/docs.css).

That docs surface currently has its own:

- page shell
- font stack (`Inter`)
- color tokens (`--mcp-*`)
- card system
- navigation

This is why it feels visually detached from the main Supericons app.

### 3. Panel suppression is already a real pattern, but not applied consistently

The customize panel is already suppressed through a shared mechanism in [main.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js):

- `setPanelSuppressed(isSuppressed)`
- `syncPanelLayout()`

And some non-icon views already opt into it from [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js):

- Pricing
- Motion Lab
- Converter

But Terms currently does not suppress the panel, even though it is also a non-icon reading page.

## Desired Outcome

After this cleanup:

- Terms reads with calmer, more site-consistent typography
- MCP content feels embedded within Supericons rather than like a detached docs microsite
- all reading / utility / legal views hide the customize panel by default unless icon selection is actually relevant

## Scope

### In Scope

- Terms text color refinement
- MCP visual and shell integration planning
- consistent customize-panel suppression rules for non-icon views

### Out Of Scope

- rewriting MCP content itself
- changing SEO copy structure unless required by the shell migration
- changing converter, pricing, or motion-lab feature logic
- redesigning the whole main shell

## Phase 1. Terms Typography Fix

### Problem

The Terms body content uses a brighter text treatment than desired for a long-form legal reading surface.

Relevant styles in [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css):

- `.terms-section__title`
- `.terms-section p`
- `.terms-section ul li`
- `.terms-tier p`

### Plan

- keep headings strong and readable
- reduce paragraph / list / supporting copy brightness to match the calmer tone used elsewhere in the site
- align link color with the main Supericons accent system instead of a detached docs-style accent

### Recommended change direction

- titles stay on the stronger heading token
- body text moves to a dimmer, app-native content token
- legal/supporting metadata also stays on the quieter token family

### Verification

- Terms heading still reads as the strongest text
- body paragraphs no longer compete with the heading
- links remain visible and accessible

## Phase 2. MCP Integration Into The Main Site

### Problem

The MCP page currently lives as a visually separate docs product.

That gives the user a context switch:

- different font language
- different shell
- different spacing rhythm
- different component vocabulary

This is at odds with the goal that MCP should feel like part of Supericons.

### Architecture decision

The recommended direction is:

- move the MCP hub into the main app shell as an in-app view
- keep the existing MCP URL structure as needed for SEO and shareability
- reuse the main site typography, color tokens, and shell chrome

### Recommended implementation approach

#### Option A. Preferred

Render the MCP hub through the main app view system, similar to Terms.

This means:

- add an `mcp` view to the app shell
- render the hub content inside the existing `gridArea` / site shell
- use existing site fonts and tokens from [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css)

Benefits:

- strongest visual consistency
- easiest shell-state consistency
- avoids maintaining two design systems

#### Option B. Transitional fallback

Keep the static MCP files under `public/mcp`, but restyle them to mimic the main site.

This is weaker because it still leaves two shells to maintain.

### Plan for MCP content

- first integrate the hub page
- then decide whether tool-specific setup guides also migrate into the app shell or remain static pages temporarily

### Styling direction

- replace `Inter`-first typography with the site’s established typography system
- replace `--mcp-*` docs tokens with app-native tokens or mapped equivalents
- reuse existing button, pill, code-block, and card styling patterns where possible
- preserve the MCP content structure and CTA clarity

## Phase 3. Standardize Panel Suppression For Non-Icon Views

### Problem

Panel hiding currently works, but it is handled view by view instead of by a consistent page-type rule.

That creates drift:

- Pricing suppresses the panel
- Motion Lab suppresses the panel
- Converter suppresses the panel
- Terms does not
- MCP is outside the shell, so it bypasses the rule entirely

### Plan

Introduce a centralized rule for whether a view is:

- icon-interactive
- tool-interactive
- reading/docs/legal

Then apply panel suppression based on view type, not ad hoc special cases.

### Recommended implementation pattern

Create a small view-policy map in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js) or a shared shell helper that defines for each view:

- whether the customize panel should be shown
- whether grid actions should be shown
- whether the page uses full-width content

This avoids repeating one-off panel logic in each branch of `switchView`.

### Immediate targets

- `terms`
- future `mcp` in-app view
- any similar legal / docs / reading views added later

## Phase 4. Navigation And Shell Consistency

Once MCP is brought into the main shell:

- make sure it can be reached through normal app/site navigation
- ensure page title, header styling, and content width follow the same system as Terms / Pricing
- confirm that legal/docs pages do not expose icon-customize affordances when they are irrelevant

## Recommended Execution Order

1. Fix Terms typography first
2. Standardize panel suppression for Terms and other existing non-icon app views
3. Integrate MCP hub into the main shell
4. Restyle MCP content to use the main site tokens and typography
5. Decide whether the deeper `/mcp/...` guide pages also migrate now or in a follow-up pass

## Risks

### Low Risk

- Terms text-color refinement
- Terms panel suppression

### Medium Risk

- MCP visual restyling while it remains static

### Higher Risk

- migrating MCP into the main shell while preserving shareable URLs and existing guide discoverability

Mitigation:

- migrate the MCP hub first
- keep content structure stable
- avoid changing all agent-specific guide pages in the same pass unless necessary

## Verification Checklist

### Terms

- heading remains the dominant text element
- body text is calmer and easier to read
- links still meet contrast expectations
- customize panel is hidden by default

### MCP

- page visually matches the main site
- typography matches the main site
- colors match the main site
- page feels embedded in the product shell
- customize panel is hidden by default

### Shell behavior

- Pricing still hides the panel correctly
- Motion Lab still hides the panel correctly
- Converter still hides the panel correctly
- icon browsing still restores the customize panel behavior as expected

## Success Criteria

This work is complete when:

- Terms no longer feels visually harsher than the rest of the site
- MCP no longer feels like a separate product
- non-icon pages consistently suppress the customize panel by default

while preserving the existing icon-browsing and tool flows.
