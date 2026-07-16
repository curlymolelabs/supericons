# Supericons State Kit v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Phase 1 wedge from the Supericons Manifesto: a paid State Kit v1 with animated state icons, semantic profiles, accessible delivery formats, a demo page, and one grounded MCP search tool.

**Architecture:** Keep State Kit v1 as an isolated premium product under `premium/state-kit-v1/` while adding small adapters into existing registry and MCP systems. The State Kit profile is the source of truth; generated indexes, registry previews, React exports, Web Component exports, and MCP search data are derived from it.

**Tech Stack:** Static HTML/CSS/JS, SVG with embedded CSS animation, Node.js ESM verification scripts, TypeScript React component source, vanilla Web Component source, existing Supericons MCP server patterns.

---

## Verified Source Basis

- `docs/supericons-manifesto.html`: Phase 1 requires 50 animated state icons, semantic profiles, one MCP search tool, a 30-second demo page, and the first paid offer.
- `docs/supericons-state-kit-v1-prd.html`: v1 scope requires animated/static/reduced SVGs, structured JSON profiles, raw SVG, React, Web Component delivery, demo page, and one paid purchase path.
- `data/si-registry/README.md`: existing SI Registry is a meaning layer and generated outputs must not be edited by hand.
- `lib/si-registry/record-shape.js`: current registry records are flat and require fields such as `icon_id`, `source_library`, `source_name`, `label`, `purpose`, `category`, `semantic_tags`, `use_when`, `avoid_when`, `version`, `status`, `access_tier`, and `projection_policy`.
- `mcp/index.js`: current MCP server is a single stdio server with existing free search, recommendations, premium workflow access, and semantic registry loading.

## Product Scope

Build Phase 1 only.

In scope:

- 50 State Kit profiles.
- Animated SVG, static SVG, and reduced-motion SVG for each icon.
- React component exports.
- Web Component bundle.
- Demo page with search, state toggles, profile viewer, copy snippets, reduced-motion toggle, and purchase CTA.
- `search_state_icons` MCP tool that searches only actual State Kit profiles.
- Verification scripts for profile quality, asset completeness, and MCP determinism.
- Registry projection preview, not a registry cutover.

Out of scope:

- Parametric customization props beyond `size`, `color`, `label`, and `className`.
- AI generation or Forge.
- Public registry replacement.
- Studio or visual editor.
- Marketplace.
- Native mobile packages.

## File Structure

Create:

- `premium/state-kit-v1/README.md`: buyer-facing product usage and known SVG animation limitations.
- `premium/state-kit-v1/CHANGELOG.md`: State Kit release notes.
- `premium/state-kit-v1/profiles/schema.json`: JSON Schema for State Kit profiles.
- `premium/state-kit-v1/profiles/index.json`: full profile index for all 50 icons.
- `premium/state-kit-v1/icons/<icon-id>/<icon-id>.svg`: animated SVG.
- `premium/state-kit-v1/icons/<icon-id>/<icon-id>-static.svg`: static fallback.
- `premium/state-kit-v1/icons/<icon-id>/<icon-id>-reduced.svg`: reduced-motion fallback.
- `premium/state-kit-v1/react/useReducedMotion.ts`: React hook for reduced-motion detection.
- `premium/state-kit-v1/react/index.ts`: React barrel exports.
- `premium/state-kit-v1/react/icons/<PascalIconName>.tsx`: one React wrapper per icon.
- `premium/state-kit-v1/web-components/si-icons.js`: custom element bundle for `<si-icon>`.
- `premium/state-kit-v1/demo/index.html`: standalone product demo.
- `premium/state-kit-v1/demo/state-kit.css`: demo styling.
- `premium/state-kit-v1/demo/state-kit.js`: demo interactions.
- `premium/state-kit-v1/generated/state-kit-registry-preview.json`: generated internal registry preview.
- `premium/state-kit-v1/generated/state-kit-mcp-index.json`: generated MCP search index.
- `scripts/verify-state-kit-profiles.mjs`: profile schema and quality verifier.
- `scripts/verify-state-kit-assets.mjs`: asset completeness verifier.
- `scripts/build-state-kit-indexes.mjs`: builds derived registry preview and MCP index.
- `scripts/verify-state-kit-mcp-fixtures.mjs`: verifies deterministic MCP matching fixtures.
- `mcp/state-kit-search.js`: State Kit profile loader and deterministic search helper.

Modify:

- `package.json`: add scripts for State Kit build and verification.
- `mcp/index.js`: register `search_state_icons`.
- `mcp/package.json`: include State Kit MCP index/helper files only if the MCP package will ship this tool.
- `docs/supericons-state-kit-v1-prd.html`: update only if implementation decisions change the spec.

Do not modify:

- Existing generated registry outputs by hand.
- Existing free icon index files by hand.
- Existing public registry projections by hand.
- `.env.local`, `node_modules/`, `dist/`, or private registry folders.

---

## Task 1: Lock The State Kit Vocabulary

**Files:**

- Create: `premium/state-kit-v1/profiles/index.json`
- Create: `premium/state-kit-v1/profiles/schema.json`
- Create: `premium/state-kit-v1/README.md`

- [ ] **Step 1: Create the 50-icon inventory**

Use the PRD icon list as the first inventory. Group icons by purpose:

```text
Loading / Progress:
loading-ring, loading-dots, loading-bar, progress-partial, uploading, downloading, syncing, processing

Success / Completion:
success, success-subtle, saved, sent, deployed

Error / Failure:
error, error-critical, failed, connection-lost

Warning / Caution:
warning, warning-pulse, caution, expiring-soon

Blocked / Waiting:
blocked, paused, queued, pending-approval, scheduled, rate-limited

Recovery:
retrying, reconnecting, recovering

AI Agent:
ai-thinking, ai-working, ai-reviewing, ai-waiting-input, ai-low-confidence

Risk / Trust:
risk-low, risk-medium, risk-high, verified, unverified

System Health:
healthy, degraded, outage, maintenance

Security / Account:
encrypting, authenticated

General State:
idle, archived
```

- [ ] **Step 2: Define required profile fields**

Every profile in `premium/state-kit-v1/profiles/index.json` must include:

```json
{
  "id": "loading-ring",
  "name": "Loading Ring",
  "version": "1.0.0",
  "priority": "P0",
  "category": "loading_progress",
  "semantic": {
    "base_object": "process",
    "state": "loading",
    "risk_level": "none",
    "confidence": "high",
    "urgency": "neutral",
    "reversible": true
  },
  "accessibility": {
    "aria_label": "Loading",
    "aria_live": "polite",
    "role": "status",
    "reduced_motion": "loading-ring-reduced"
  },
  "motion": {
    "type": "loop",
    "duration_ms": 1200,
    "easing": "ease-in-out",
    "communicates": "continuous progress with unknown completion time"
  },
  "guidance": {
    "use_when": [
      "A process has started and completion time is unknown",
      "The system is working and the user should wait",
      "No user action is required"
    ],
    "avoid_when": [
      "Use loading-bar when completion percentage is known",
      "Use pending-approval when the wait is for a human action",
      "Use retrying when the process failed and is trying again"
    ],
    "example_contexts": [
      "Form submission processing",
      "API request pending",
      "Dashboard data loading"
    ],
    "not_for": [
      "AI agent activity",
      "Dangerous or irreversible operations"
    ]
  },
  "files": {
    "animated_svg": "icons/loading-ring/loading-ring.svg",
    "static_svg": "icons/loading-ring/loading-ring-static.svg",
    "reduced_motion_svg": "icons/loading-ring/loading-ring-reduced.svg",
    "react": "react/icons/LoadingRing.tsx",
    "web_component": "web-components/si-icons.js"
  }
}
```

- [ ] **Step 3: Create profile schema**

Add `premium/state-kit-v1/profiles/schema.json` with required fields and enums for:

```text
priority: P0, P1, P2
risk_level: none, low, medium, high, critical
confidence: high, medium, low, uncertain
urgency: quiet, neutral, attention, urgent
aria_live: off, polite, assertive
motion.type: none, loop, pulse, draw, sweep, shake, breathe, repair, transition
```

- [ ] **Step 4: Add README positioning**

In `premium/state-kit-v1/README.md`, explain:

```text
Supericons State Kit v1 is a paid icon product for software states.
Each icon ships as animated SVG, static SVG, reduced-motion SVG, React component, Web Component, and semantic profile.
The profile is part of the product: it tells developers and agents when the icon is correct, when it is wrong, and what to use instead.
```

- [ ] **Step 5: Commit**

```powershell
git add premium/state-kit-v1/profiles/schema.json premium/state-kit-v1/profiles/index.json premium/state-kit-v1/README.md
git commit -m "feat: define state kit v1 profile vocabulary"
```

---

## Task 2: Add Profile Verification

**Files:**

- Create: `scripts/verify-state-kit-profiles.mjs`
- Modify: `package.json`

- [ ] **Step 1: Implement verifier**

`scripts/verify-state-kit-profiles.mjs` must:

- load `premium/state-kit-v1/profiles/index.json`
- require exactly 50 profiles
- reject duplicate IDs
- reject missing required fields
- reject empty `use_when`, `avoid_when`, and `example_contexts`
- reject `avoid_when` items that do not name another State Kit icon ID
- reject ARIA labels longer than 80 characters
- reject motion descriptions that only describe geometry instead of meaning

- [ ] **Step 2: Add npm script**

Add:

```json
"verify:state-kit-profiles": "node scripts/verify-state-kit-profiles.mjs"
```

- [ ] **Step 3: Run verifier**

```powershell
npm run verify:state-kit-profiles
```

Expected result:

```text
State Kit profile verification passed: 50 profiles checked.
```

- [ ] **Step 4: Commit**

```powershell
git add scripts/verify-state-kit-profiles.mjs package.json package-lock.json
git commit -m "test: verify state kit profiles"
```

---

## Task 3: Build The First Five P0 Icons

**Files:**

- Create: `premium/state-kit-v1/icons/loading-ring/`
- Create: `premium/state-kit-v1/icons/loading-dots/`
- Create: `premium/state-kit-v1/icons/loading-bar/`
- Create: `premium/state-kit-v1/icons/uploading/`
- Create: `premium/state-kit-v1/icons/downloading/`

- [ ] **Step 1: Define visual rules**

Document these rules in `premium/state-kit-v1/README.md`:

```text
Canvas: 24 by 24
Stroke: 1.8px default
Linecap: round
Linejoin: round
Default color: currentColor
Animation duration range: 900ms to 1800ms
Reduced motion: no spatial movement; use static state or one subtle opacity change
```

- [ ] **Step 2: Create three SVG variants for each icon**

For each of the five icons, create:

```text
<icon-id>.svg
<icon-id>-static.svg
<icon-id>-reduced.svg
```

- [ ] **Step 3: Test inline animation manually**

Open the SVG files in a browser and verify:

```text
animated variant moves when inline or opened directly
static variant does not move
reduced variant communicates the state without strong movement
color inherits from currentColor when embedded inline
```

- [ ] **Step 4: Commit**

```powershell
git add premium/state-kit-v1/icons premium/state-kit-v1/README.md
git commit -m "feat: add first state kit loading icons"
```

---

## Task 4: Add Asset Completeness Verification

**Files:**

- Create: `scripts/verify-state-kit-assets.mjs`
- Modify: `package.json`

- [ ] **Step 1: Implement asset verifier**

The script must:

- read every profile from `profiles/index.json`
- verify every path in `files` exists
- verify animated/static/reduced SVG files contain an `<svg` root
- verify animated SVGs include either `<style>` with `@keyframes` or an explicit no-motion reason in the profile
- verify static SVGs do not include `@keyframes`
- verify reduced SVGs either do not include `@keyframes` or include `prefers-reduced-motion`

- [ ] **Step 2: Add npm script**

Add:

```json
"verify:state-kit-assets": "node scripts/verify-state-kit-assets.mjs"
```

- [ ] **Step 3: Run verifier**

```powershell
npm run verify:state-kit-assets
```

Expected early result while only five icons exist:

```text
State Kit asset verification failed: missing assets for remaining profiles.
```

Expected result after all icons exist:

```text
State Kit asset verification passed: 50 profiles checked.
```

- [ ] **Step 4: Commit**

```powershell
git add scripts/verify-state-kit-assets.mjs package.json package-lock.json
git commit -m "test: verify state kit assets"
```

---

## Task 5: Complete P0 Icons And Quality Gate

**Files:**

- Create/modify: `premium/state-kit-v1/icons/*`
- Modify: `premium/state-kit-v1/profiles/index.json`

- [ ] **Step 1: Complete remaining P0 icons**

Create animated, static, and reduced variants for:

```text
syncing, success, error, error-critical, warning, blocked, paused, pending-approval, retrying, ai-thinking, ai-working
```

- [ ] **Step 2: Review profile specificity**

For every P0 profile, confirm each `guidance.avoid_when` item names a better alternative icon from the kit.

- [ ] **Step 3: Run verification**

```powershell
npm run verify:state-kit-profiles
npm run verify:state-kit-assets
```

Expected profile result:

```text
State Kit profile verification passed: 50 profiles checked.
```

Expected asset result at this point:

```text
State Kit asset verification failed: missing assets for P1 and P2 profiles.
```

- [ ] **Step 4: Commit**

```powershell
git add premium/state-kit-v1/icons premium/state-kit-v1/profiles/index.json
git commit -m "feat: complete state kit p0 icons"
```

---

## Task 6: Build React Delivery Format

**Files:**

- Create: `premium/state-kit-v1/react/useReducedMotion.ts`
- Create: `premium/state-kit-v1/react/icons/*.tsx`
- Create: `premium/state-kit-v1/react/index.ts`

- [ ] **Step 1: Add reduced-motion hook**

Create a hook that returns `true` when `window.matchMedia('(prefers-reduced-motion: reduce)')` matches. It must return `false` during server rendering.

- [ ] **Step 2: Create component pattern**

Every component must accept:

```ts
export interface StateIconProps {
  size?: number;
  color?: string;
  label?: string;
  className?: string;
}
```

Every component must render inline SVG with:

```text
width and height from size
color defaulting to currentColor
role from profile.accessibility.role
aria-label from label prop or profile.accessibility.aria_label
aria-live from profile.accessibility.aria_live
```

- [ ] **Step 3: Export first P0 components**

Create components for all P0 icons first. Keep generated or repeated SVG code local to each component.

- [ ] **Step 4: Commit**

```powershell
git add premium/state-kit-v1/react
git commit -m "feat: add state kit react components"
```

---

## Task 7: Complete P1 And P2 Assets

**Files:**

- Create/modify: `premium/state-kit-v1/icons/*`
- Create/modify: `premium/state-kit-v1/react/icons/*.tsx`
- Modify: `premium/state-kit-v1/react/index.ts`

- [ ] **Step 1: Complete P1 icons**

Create assets and React components for all P1 icons.

- [ ] **Step 2: Complete P2 icons**

Create assets and React components for all P2 icons.

- [ ] **Step 3: Run verification**

```powershell
npm run verify:state-kit-profiles
npm run verify:state-kit-assets
```

Expected:

```text
State Kit profile verification passed: 50 profiles checked.
State Kit asset verification passed: 50 profiles checked.
```

- [ ] **Step 4: Commit**

```powershell
git add premium/state-kit-v1/icons premium/state-kit-v1/react
git commit -m "feat: complete state kit v1 icons"
```

---

## Task 8: Build Web Component Bundle

**Files:**

- Create: `premium/state-kit-v1/web-components/si-icons.js`

- [ ] **Step 1: Register custom element**

Implement `<si-icon>` with attributes:

```text
name
size
color
label
variant: animated, static, reduced
```

- [ ] **Step 2: Render from profile index**

The component must:

- reject unknown `name` values with a clear console warning
- default to the animated SVG
- switch to reduced variant when `prefers-reduced-motion: reduce` is active
- use profile accessibility values by default

- [ ] **Step 3: Commit**

```powershell
git add premium/state-kit-v1/web-components/si-icons.js
git commit -m "feat: add state kit web component"
```

---

## Task 9: Build Derived Indexes

**Files:**

- Create: `scripts/build-state-kit-indexes.mjs`
- Create: `premium/state-kit-v1/generated/state-kit-registry-preview.json`
- Create: `premium/state-kit-v1/generated/state-kit-mcp-index.json`
- Modify: `package.json`

- [ ] **Step 1: Implement registry preview builder**

Map each State Kit profile to an existing SI Registry-compatible preview record:

```json
{
  "icon_id": "si:state-loading-ring",
  "source_group": "premium",
  "source_library": "si",
  "source_name": "state-loading-ring",
  "label": "Loading Ring",
  "purpose": "Show a process that is running with unknown completion time.",
  "category": "status_feedback",
  "semantic_tags": ["loading", "progress", "waiting", "status"],
  "use_when": "Use when a process has started and completion time is unknown.",
  "avoid_when": "Do not use when progress percentage is known; use loading-bar instead.",
  "version": "1.0.0",
  "status": "approved",
  "access_tier": "protected_premium_record",
  "projection_policy": "internal_only",
  "collection_id": "state-kit-v1",
  "is_premium": true,
  "depicts": "Animated circular loading ring.",
  "state": "loading",
  "review_state": "editor_approved",
  "evidence": ["state_kit_profile", "visual_review"]
}
```

- [ ] **Step 2: Implement MCP index builder**

The MCP index should include only fields needed for matching and output:

```text
id, name, priority, category, semantic, accessibility, motion, guidance, files
```

- [ ] **Step 3: Add npm script**

Add:

```json
"build:state-kit-indexes": "node scripts/build-state-kit-indexes.mjs"
```

- [ ] **Step 4: Run build**

```powershell
npm run build:state-kit-indexes
```

Expected:

```text
Built State Kit registry preview: 50 records.
Built State Kit MCP index: 50 records.
```

- [ ] **Step 5: Commit**

```powershell
git add scripts/build-state-kit-indexes.mjs premium/state-kit-v1/generated package.json package-lock.json
git commit -m "build: add state kit derived indexes"
```

---

## Task 10: Add MCP Search Helper

**Files:**

- Create: `mcp/state-kit-search.js`
- Create: `scripts/verify-state-kit-mcp-fixtures.mjs`
- Modify: `mcp/index.js`
- Modify: `package.json`

- [ ] **Step 1: Implement deterministic search helper**

`mcp/state-kit-search.js` must export:

```js
export function searchStateIcons({ query, context = '', format = 'react' }) {}
```

The helper must:

- load `premium/state-kit-v1/generated/state-kit-mcp-index.json` or packaged equivalent
- score matches from icon ID, name, category, semantic fields, use_when, avoid_when, and example_contexts
- never invent icon IDs
- return one best match plus up to two alternatives
- provide `match_reason`
- provide a paste-ready snippet for `svg`, `react`, or `web-component`

- [ ] **Step 2: Register MCP tool**

Add `search_state_icons` to `mcp/index.js` with input:

```json
{
  "query": "The payment is processing and the user should wait",
  "context": "fintech app, high-value transaction",
  "format": "react"
}
```

Return:

```json
{
  "icon_id": "loading-ring",
  "icon_name": "Loading Ring",
  "match_reason": "Indeterminate wait with no user action needed matches payment processing; loading-bar would imply known progress.",
  "aria_label": "Processing payment",
  "usage_snippet": "<LoadingRing label=\"Processing payment\" size={24} />",
  "profile": {},
  "alternatives": []
}
```

- [ ] **Step 3: Add fixture verifier**

Fixtures must cover:

```text
payment is processing -> loading-ring
agent is thinking -> ai-thinking
human approval needed -> pending-approval
operation failed and retrying -> retrying
high risk action requires review -> risk-high
network dropped -> connection-lost
```

- [ ] **Step 4: Run verification**

```powershell
npm run build:state-kit-indexes
npm run verify:state-kit-mcp-fixtures
```

Expected:

```text
State Kit MCP fixtures passed: 6 queries checked.
```

- [ ] **Step 5: Commit**

```powershell
git add mcp/state-kit-search.js mcp/index.js scripts/verify-state-kit-mcp-fixtures.mjs package.json package-lock.json
git commit -m "feat: add state kit mcp search"
```

---

## Task 11: Build Demo Page

**Files:**

- Create: `premium/state-kit-v1/demo/index.html`
- Create: `premium/state-kit-v1/demo/state-kit.css`
- Create: `premium/state-kit-v1/demo/state-kit.js`

- [ ] **Step 1: Build demo layout**

The demo page must show:

```text
sticky purchase CTA
search input
icon grid
selected icon preview
profile panel
copy snippets for SVG, React, and Web Component
animated/static/reduced toggle
global reduced-motion simulation toggle
```

- [ ] **Step 2: Connect profile data**

Search must use profile fields, not only icon names:

```text
id, name, semantic.state, semantic.risk_level, semantic.confidence, guidance.use_when, guidance.avoid_when, guidance.example_contexts
```

- [ ] **Step 3: Add copy snippets**

For each selected icon, provide:

```html
<si-icon name="loading-ring" label="Loading"></si-icon>
```

```tsx
<LoadingRing label="Loading" size={24} />
```

```html
<!-- Inline the SVG from icons/loading-ring/loading-ring.svg for animation support. -->
```

- [ ] **Step 4: Commit**

```powershell
git add premium/state-kit-v1/demo
git commit -m "feat: add state kit demo page"
```

---

## Task 12: Add Launch Packaging

**Files:**

- Modify: `premium/state-kit-v1/README.md`
- Create: `premium/state-kit-v1/CHANGELOG.md`

- [ ] **Step 1: Document delivery formats**

README must explain:

```text
Raw SVG: best when inlined for animation.
React: recommended for React and Next.js apps.
Web Component: recommended for plain HTML and framework-agnostic use.
Reduced motion: included by default.
Profiles: machine-readable guidance for humans and agents.
```

- [ ] **Step 2: Document known limitations**

README must clearly state:

```text
Animated SVGs do not reliably animate when used through img tags or CSS background-image. Inline SVG, React, or Web Component usage is recommended for animation.
```

- [ ] **Step 3: Add license and purchase notes**

Add plain purchase-tier notes matching the PRD:

```text
Solo: one commercial project.
Team: team use across multiple projects.
Extended: product, template, or tool redistribution.
```

- [ ] **Step 4: Commit**

```powershell
git add premium/state-kit-v1/README.md premium/state-kit-v1/CHANGELOG.md
git commit -m "docs: add state kit launch packaging"
```

---

## Task 13: Final Verification Gate

**Files:**

- Modify only files needed to fix failed checks.

- [ ] **Step 1: Run State Kit checks**

```powershell
npm run verify:state-kit-profiles
npm run verify:state-kit-assets
npm run build:state-kit-indexes
npm run verify:state-kit-mcp-fixtures
```

Expected:

```text
State Kit profile verification passed: 50 profiles checked.
State Kit asset verification passed: 50 profiles checked.
Built State Kit registry preview: 50 records.
Built State Kit MCP index: 50 records.
State Kit MCP fixtures passed: 6 queries checked.
```

- [ ] **Step 2: Run existing registry verification**

```powershell
npm run build:si-registry
npm run verify:si-registry
```

Expected:

```text
Existing SI Registry projections still pass.
```

- [ ] **Step 3: Run public safety verification**

```powershell
npm run verify:public-safety
```

Expected:

```text
No private operational metadata or unsafe public output is reported.
```

- [ ] **Step 4: Browser-check the demo**

Open:

```text
premium/state-kit-v1/demo/index.html
```

Verify:

```text
search filters icons
profile panel updates
copy buttons copy correct snippets
reduced-motion toggle changes the preview
mobile layout remains readable
CTA is visible without blocking icon inspection
```

- [ ] **Step 5: Commit final fixes**

```powershell
git add premium/state-kit-v1 scripts package.json package-lock.json mcp
git commit -m "chore: verify state kit v1 launch candidate"
```

---

## Follow-On Plans

Write separate plans only after State Kit v1 has a working launch candidate:

1. **Phase 2: Parameters + Packs**
   Add small customization props, niche packs, and a recommendation MCP tool.

2. **Phase 3: Forge + Pro**
   Add AI-assisted schema generation, Motion Lab integration, and subscription packaging.

3. **Phase 4: Registry + Protocol**
   Promote the State Kit profile lessons into a registry v2 design with versioned semantic tokens and private registry support.

## Self-Review

Spec coverage:

- Manifesto Phase 1 is covered by Tasks 1-13.
- State Kit PRD profile, delivery, demo, MCP, and paid packaging requirements are covered.
- Existing registry integration is treated as preview projection only, matching the current registry boundary.

Known gaps:

- The plan does not design the actual 50 SVGs visually. That remains human judgment work inside Tasks 3, 5, and 7.
- Payment processor setup is documented as launch packaging, but checkout integration is not included because this plan keeps the product build separate from commerce integration.
- React package publishing is not included. v1 ships as product files first; npm packaging should be a later decision after the demo and zip package are validated.
