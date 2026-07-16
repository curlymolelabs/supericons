# Icons Lab Human And Agent QA Audit

Date: 2026-06-24

## Scope

This audit tested whether Icons Lab feels useful as an icon creation tool for a human creator and as an agent-assisted creation environment. The test focused on creating and refining an icon, not on code architecture.

Evidence captured in this folder:

- `contact-sheet.png`
- `run-observations.json`
- `01-blank-editor.png` through `17-node-drag-result.png`

## Verified Behavior

- Icons Lab opened successfully at the local preview server.
- A blank 24x24 canvas was visible on load.
- Shape Magic inserted an editable blob into the canvas.
- A route shape and dots were added to the icon.
- Structure search found the `soft-blob` object.
- Points mode exposed editable nodes on path geometry.
- Dragging a node changed the selected path.
- Sketch mode created geometry, and the workspace did not move during the automated sketch-drag test.
- The agent composer accepted `Create agent icon`, produced a review-before-apply proposal, and applied a three-object agent icon template.
- The agent composer accepted a craft review request and proposed opening craft review for readability, spacing, metaphor, and export readiness.

## Human Creator Lens

The core mechanics are now real enough to test: a human can start with a blank canvas, add icon parts, use generated shapes, sketch, inspect previews, and edit path points. That is a meaningful step forward.

The experience still does not yet feel like an effortless icon creator. It feels like a small vector editor with many visible controls. The user can make an icon, but the product does not yet strongly guide them toward a beautiful icon.

The strongest human expectation is:

1. Start with a clear icon intent.
2. Block out a simple silhouette quickly.
3. Preview it at 16px, 24px, and 48px constantly.
4. Refine balance, stroke, corners, spacing, and metaphor.
5. Export only when it reads clearly.

Icons Lab supports pieces of that flow, but the screen does not yet make that journey obvious.

## Agent Lens

The agent flow works at a basic level: it can interpret some commands, create proposals, wait for approval, and apply changes. That is the right interaction pattern.

The agent does not yet feel like a creative partner. It behaves more like a command interpreter. It can add templates or open review, but it does not yet show visual alternatives, explain tradeoffs, or propose concrete craft improvements on the canvas.

For agents, the best interface is not the same as the human interface. The agent needs a structured control plane:

- Current document summary.
- Selected object summary.
- Available actions.
- Style recipe and constraints.
- Current quality issues.
- Proposed visual diffs before applying changes.
- Clear failure reasons when an action cannot run.

The human should see a calm composer and visual proposal cards. The agent should receive a machine-readable state and action contract behind the scenes.

## Main Findings

### 1. The Canvas Is Not Dominant Enough

The canvas is the reason the app exists, but it competes with left navigation, tool groups, top controls, inspector controls, preview, review notes, and the agent composer.

The current layout meets the minimum expectation of an editor, but it does not exceed expectations as an icon lab. The canvas should feel like the center of gravity. Most controls should appear only when relevant.

Recommended direction:

- Keep canvas and live preview visible.
- Collapse tool families by default.
- Show only primary tools first: Select, Points, Shape, Line, Sketch, Pen.
- Move secondary actions into contextual menus near the selected object.
- Let the right panel focus on the current selection, not every possible property.

### 2. Tools Still Feel Like Implementation Parts

The tools are functional, but they do not yet feel like icon-making moves. A user sees Box, Soft box, Circle, Oval, Dot, Line, Arc, Corner, Chevron, Arrow, Spark, Badge, Route, Sketch, and Pen. That is a lot to process.

For icon creation, tools should map to creator intent:

- Body
- Cutout
- Modifier
- Connector
- Accent
- Badge
- State mark
- Motion mark

The raw geometry can still exist, but the first layer should speak in icon design language.

### 3. Shape Magic Is Promising But Needs Guardrails

Shape Magic quickly creates expressive geometry. The downside is that the result can become chunky or visually crude unless the user already has taste and editing skill.

The test-created icon is valid editable geometry, but not yet beautiful. That is the honest gap.

Recommended direction:

- Add shape presets with icon-safe bounds.
- Add one-click cleanup: simplify, center, balance, normalize stroke, check 16px readability.
- Show before and after previews before applying cleanup.
- Keep raw point editing available, but make it the advanced path.

### 4. Points Mode Works, But It Is Too Expert-Heavy

Node editing changed the path during the test, so the tool works. The experience is still intimidating because many anchors and handles appear at once.

For an icon creator, raw nodes should not be the first refinement experience. The first refinement controls should be:

- Smooth
- Sharpen
- Simplify
- Round corners
- Balance
- Symmetrize
- Snap to grid
- Make readable at 16px

Then raw nodes can open when the user wants exact control.

### 5. Sketch Mode No Longer Moved The Workspace In The Test

The automated sketch probe recorded no change to scroll position, canvas pan, zoom, or canvas position. Sketch mode also created geometry.

That is a good fix signal. The visual output, however, is still rough. Sketch needs an icon-focused cleanup pass immediately after drawing.

Recommended direction:

- After sketching, show a small cleanup prompt: Keep rough, Smooth, Simplify, Turn into filled mark, Turn into stroke.
- Preview cleanup at 16px before the user accepts.

### 6. The Agent Composer Works But Is Too Passive

The agent composer accepted commands and produced proposals. The pattern of review before apply is good.

The problem is usefulness. The agent should do more than open review or add a template. It should behave like a design partner:

- "This reads as a robot, but the antenna is too dominant at 16px."
- "I can simplify the inner shape and thicken the outer stroke."
- "Here are three alternatives: friendly, technical, compact."

The agent should also show proposal thumbnails on the canvas, not only text.

### 7. QA Should Be Mostly Invisible Until Needed

Visible checks can be useful, but they should not become another panel the user has to manage. If Icons Lab is opinionated, many rules should be baked into tool behavior.

The better model is:

- Prevent obvious bad states by default.
- Show lightweight hints only when something matters.
- Keep full QA in export or review mode.

## Can A Human Create Outstanding Icons Today?

Partially, but not reliably.

A skilled designer could use the current tools to create a solid icon. A beginner or founder-user would still need too much taste, patience, and vector-editing knowledge.

The product is closer to "editable icon construction kit" than "effortless icon lab."

## Can An Agent Create Outstanding Icons Today?

Not yet.

The agent can create templates and trigger actions. It does not yet generate strong design alternatives, critique composition visually, or operate from a full icon-quality model.

The foundation is good, but the agent needs deeper design primitives and a better proposal surface.

## Recommended Next Milestone

Build the "Icon Craft Loop" before adding more tools.

The loop:

1. Intent: choose or describe what the icon should mean.
2. Start: pick blank, template, imported SVG, or agent-generated draft.
3. Compose: use a small set of icon parts, not a large raw tool list.
4. Refine: simplify, balance, snap, smooth, and preview at real sizes.
5. Review: show only the issues that affect readability or export.
6. Export: clean SVG and optional pack metadata.

## Priority Fixes

### P0

- Make the canvas visually dominant.
- Collapse tool families and inspector sections by default.
- Add an icon-focused cleanup flow after Sketch and Shape Magic.
- Make preview sizes more prominent and always readable.

### P1

- Rename and regroup tools around icon-making intent.
- Move raw node editing behind "Advanced points."
- Add proposal thumbnails to agent actions.
- Add agent actions for alternatives, simplify, balance, normalize, and 16px readability.

### P2

- Turn structure into an object map that opens only when needed.
- Add first-run guided tasks for common icon types.
- Add a repeatable QA harness with task-based screenshots and design review notes.

## Current Verdict

Icons Lab is now functional enough to audit. It is not yet polished enough to be the production-grade icon creation experience we want.

The next step should not be more feature breadth. The next step should be making fewer, better actions feel excellent.
