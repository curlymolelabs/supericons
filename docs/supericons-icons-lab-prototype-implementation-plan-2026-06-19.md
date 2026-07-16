# Supericons Icons Lab Prototype Implementation Plan

Date: 2026-06-19

## Objective

Build an isolated, standalone Icons Lab prototype that explores the SI 2.0 direction without touching the existing `supericons.dev` app.

The prototype should turn the strongest mockup directions into a working browser experience:

- Mockup 6: Main Studio shell.
- Mockup 4: Focus Editor mode.
- Mockup 5: Pack Review dashboard.

The first prototype uses mocked data for `agentic-ai-core-kit-001`. It should feel like a real product surface for a human owner working with AI agents to create, review, QA, and export programmatic icons.

## Hard Isolation Rule

Do not edit these existing app files for the prototype:

```text
index.html
main.js
style.css
auth.js
store.js
sidebar-icons.js
lib/
public/
data/si-registry/
```

Create the prototype in a new standalone folder:

```text
icons-lab-prototype/
```

The prototype may read or duplicate small local data samples, but it should not write to the existing Supericons registry, public icon indexes, or production app assets.

## Recommended Folder Structure

```text
icons-lab-prototype/
  package.json
  index.html
  src/
    App.jsx
    main.jsx
    styles.css
    data/
      mockPack.js
    components/
      AppShell.jsx
      CommandRail.jsx
      MainStudio.jsx
      FocusEditor.jsx
      PackReview.jsx
      AgentPanel.jsx
      QAPanel.jsx
      PreviewStrip.jsx
      IconCanvas.jsx
      VariantFilmstrip.jsx
      StyleInspector.jsx
```

Use this as an isolated Vite React prototype. If React is not installed locally in the prototype, add it only to `icons-lab-prototype/package.json`, not the root app.

## Screen Mapping

### 1. Main Studio

Source direction:

- Use mockup 6 as the default experience.

Purpose:

- Human + agent workspace for one selected icon concept.

Layout:

- Left panel: concept brief, metaphor controls, icon list.
- Center: editable SVG canvas with grid and layer controls.
- Right panel: agent suggestions, QA results, approval controls.
- Bottom: preview environments.

Required visible content:

- Project: `Agentic AI Core Kit`.
- Selected concept: `agent-handoff`.
- Layers: `agent node`, `context capsule`, `destination node`.
- Style controls: stroke `1.5`, cap `round`, join `round`, color `currentColor`.
- Agent suggestions: metaphor, cleanup, QA, human review.
- QA chips: pass and warn states.
- Preview environments: toolbar, empty state, bento tile, documentation diagram.

Primary action:

- `Approve variant`.

Secondary actions:

- `Request changes`.
- `Run QA`.
- `Export draft`.

### 2. Focus Editor

Source direction:

- Use mockup 4 for a focused icon editing mode.

Purpose:

- Detailed canvas and variant work for one icon.

Layout:

- Left vertical command rail.
- Central 24x24 SVG grid canvas.
- Bottom variant filmstrip.
- Right agent + QA timeline.

Required visible content:

- Safe-area guides.
- Optical center marker.
- Live previews at `16`, `24`, `32`, `48`, and `128`.
- Variant thumbnails.
- Agent timeline entries: `Metaphor proposed`, `SVG cleaned`, `QA run`, `Human review requested`.

Primary action:

- `Save refined variant`.

### 3. Pack Review

Source direction:

- Use mockup 5 for pack-level production readiness.

Purpose:

- Compare all 12 concepts and decide whether the pack is coherent enough to export.

Layout:

- Top project ribbon with status and export readiness.
- Left concept map.
- Center variant comparison wall.
- Right style recipe inspector.

Required visible content:

- 12 concepts from `agentic-ai-core-kit-001`.
- Columns: `outline`, `filled`, `mono`, `animated`.
- Pack consistency heatmap.
- Visual density meter.
- Stroke consistency meter.
- Small-size legibility score.
- Export readiness summary.

Primary action:

- `Prepare export`.

## Mock Data

Use the first 12 concepts from the blueprint:

```text
agent-core
tool-call
tool-result
context-window
context-compaction
memory-checkpoint
agent-handoff
approval-gate
policy-guardrail
trace-span
eval-run
token-meter
```

Each concept should include:

- ID.
- Name.
- Asset type.
- Status.
- QA score.
- Variant count.
- Search terms.
- Brief.
- Metaphor.
- Avoided metaphors.

Use inline SVG placeholders that are visually plausible but clearly prototype-grade. Do not import third-party brand assets.

## Visual Direction

The prototype should be SI 2.0, not the existing Supericons v1 app.

Design qualities:

- Dark graphite base.
- Precision design-tool feel.
- Dense but breathable interface.
- Thin luminous dividers.
- Orange accent from Supericons.
- Secondary cyan accent for agent activity and QA.
- Elegant compact typography.
- Strong central canvas.
- No marketing hero.
- No stock imagery.
- No decorative blobs.
- No nested cards inside cards.
- Controls should feel like a real tool, not a presentation slide.

## Interaction Requirements

Minimum interactions:

- Switch between `Main Studio`, `Focus Editor`, and `Pack Review`.
- Select a concept from the concept list.
- Select a variant from the filmstrip.
- Toggle preview environment.
- Trigger `Run QA`, which updates a timestamp or status.
- Trigger `Approve variant`, which changes the selected concept state.
- Trigger `Prepare export`, which shows an export-ready confirmation state.

These can be local state only. No backend is required for the prototype.

## Accessibility And Responsiveness

Desktop is primary.

Minimum viewport target:

```text
1440 x 900
```

Also verify:

```text
1280 x 720
```

Required:

- Text must not overlap controls.
- Toolbars must not shift when status changes.
- Buttons must have clear labels.
- Contrast must be acceptable on the dark theme.
- Keyboard focus should be visible for main controls.

## Implementation Steps

1. Create `icons-lab-prototype/` with its own Vite React setup.
2. Add mock data for `agentic-ai-core-kit-001`.
3. Build the app shell and view switcher.
4. Build Main Studio first.
5. Build Focus Editor second.
6. Build Pack Review third.
7. Add local state interactions.
8. Polish responsive layout and typography.
9. Run build checks inside `icons-lab-prototype`.
10. Start a local dev server for the prototype only.
11. Use browser screenshots to verify 1440 x 900 and 1280 x 720.

## Verification Plan

Run from:

```text
icons-lab-prototype/
```

Expected checks:

```text
npm install
npm run build
npm run dev
```

Browser validation:

- Open the local Vite URL.
- Capture or inspect Main Studio.
- Switch to Focus Editor.
- Switch to Pack Review.
- Test concept selection.
- Test QA and approve actions.
- Test 1440 x 900.
- Test 1280 x 720.

Completion proof should include:

- Files created.
- Commands run.
- Local URL.
- Verification result.
- Any known rough edges.

## Non-Goals For Prototype

- No production registry writes.
- No auth.
- No payment or premium gating.
- No real AI generation provider.
- No external API calls.
- No real MCP server.
- No editing of existing Supericons v1 app files.

## Follow-Up After Prototype

If the UI direction works, next steps are:

1. Add real `.sipack` and `.siicon` source package generation.
2. Add SVG QA scripts.
3. Add preview rendering scripts.
4. Add export staging.
5. Add agent tool API.
6. Add MCP wrapper for agents.
7. Connect the first 12 approved icons to the Supericons library pipeline.
