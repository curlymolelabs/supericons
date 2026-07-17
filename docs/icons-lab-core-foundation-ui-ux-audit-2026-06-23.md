# Icons Lab Core Foundation UI/UX Audit

Date: 2026-06-23

## Position

Icons Lab should feel like an icon creator with an agent beside the user, not a general vector editor with an agent bolted on.

The core unit is a 24px icon board. The user should think in strokes, pixels, points, shape blocks, safe areas, balance, and readable states. Full vector-editor power can exist later, but it should stay behind focused icon workflows.

## Human UX Audit

### Main Problem

The current editor exposes too much vector-editor structure before the user has a clear icon-making path.

When a user opens the editor, the most important action should be obvious:

1. Pick a blank canvas or template.
2. Add a simple icon primitive.
3. Shape it on the 24px grid.
4. Preview it at small sizes.
5. Export or ask the agent to refine it.

The current UI leans toward object editing, node editing, history, checks, inspector details, and advanced operations before the icon has a strong foundation.

### Canvas

The canvas must be the source of truth. If a stroke looks thin on the canvas but thick in preview, the user cannot build taste. The canvas and preview must render the same stroke behavior.

Fix applied in this milestone:

- Actual icon elements no longer use non-scaling strokes on the canvas.
- Default stroke width is now 2px on the 24px icon recipe.
- Default snap step is now 1px.
- The editor preview now hides passing checks and only shows real warnings.

Why this matters:

- Icon work happens at small sizes.
- A 1.5px outline can look elegant while editing but become muddy, inconsistent, or overly delicate when used at 16px or 20px.
- A 2px default gives the user a better starting point for readable icon forms.

### Points Mode

The previous "Node" label was too vector-editor oriented and unclear for a new user. The user does not care about "nodes" first; they care about reshaping the icon.

Better mental model:

- Select moves the whole object.
- Points reshapes the object's structure.
- Shapes that are not point-editable must be converted first.

Fix applied in this milestone:

- "Node" is now shown as "Points".
- The canvas now shows a short Points-mode message:
  - No selection: select a shape or path.
  - Simple shape selected: convert to points first.
  - Editable path selected: drag blue points.

Remaining issue:

- The interaction still uses path-node editing under the hood. That is acceptable for now, but the UI should keep translating that into icon language.

### Sketch Tool

The previous freehand behavior caused page movement during drawing, which is a core input failure.

Fix applied in this milestone:

- Canvas pointer interactions now prevent page gestures while drawing or editing.
- Canvas and canvas children use `touch-action: none`.
- "Freehand" is now shown as "Sketch" because the expected use is quick rough icon drawing, not general illustration.

Remaining issue:

- Sketch is still a rough path tool. It should later simplify, snap, and clean the drawn path into icon-grade points.

### Inspector

The inspector is useful, but it currently mixes beginner and advanced controls.

What it should do:

- Show only controls that match the selected object.
- Prioritize icon-useful controls: position, size, stroke width, fill, corner radius, point editing, alignment.
- Hide or collapse advanced operations unless the user asks for them.

What should be reduced:

- Boolean operations, compound paths, and complex path controls should not dominate the first editing experience.
- Technical field names like X1, Y1, X2, Y2 should be translated when possible, such as Start X, Start Y, End X, End Y.

### Checks

Checks have low value if they are always visible. They are useful only when the user needs feedback, export readiness, or agent review.

Recommended direction:

- Move checks out of the main editor surface.
- Show a compact readiness indicator only when there is a real warning.
- Let the agent produce checks after a request such as "make this production ready".

## Agent UX Audit

### Main Problem

The agent needs a structured icon workspace, not a broad vector sandbox.

The agent should operate on a clear icon recipe:

- Canvas: 24px.
- Grid: 1px.
- Default stroke: 2px.
- Safe area: 2px.
- Color: currentColor by default.
- Shape grammar: lines, rounded rectangles, circles, arcs, simple paths, cutouts, and state variants.

### What The Agent Needs

The agent needs tools that map to icon-making tasks:

- Create primitive.
- Convert to points.
- Move point.
- Align to grid.
- Normalize stroke.
- Balance spacing.
- Compare at 16px, 20px, and 24px.
- Generate variants.
- Explain why a shape reads better.

The agent does not need a large exposed UI for every operation. It needs reliable commands and visible diffs the user can approve.

### Human-Agent Workflow

The best flow is:

1. User starts with a template, sketch, or blank icon.
2. User or agent creates the first readable form.
3. Agent suggests focused edits with before/after preview.
4. User accepts, rejects, or edits manually.
5. Agent checks small-size readability and style consistency.

The UI should show:

- The current icon.
- The active recipe.
- The next proposed agent action.
- A small preview strip.
- A short explanation only when useful.

## Product Direction

### Keep

- 24px canvas.
- Grid and keyline visibility.
- Select, Points, primitive shapes, Pen, Sketch.
- Stroke, fill, radius, size, position.
- Preview sizes.
- Agent chat/composer.

### Reduce

- Always-visible QA checks.
- Advanced path terminology.
- Large inspector surfaces for simple selections.
- General vector-editor affordances that do not improve icon quality.

### Add Later

- Icon-grade sketch cleanup.
- Point snapping and symmetry suggestions.
- Pixel-readability preview.
- Style recipe presets.
- Agent-generated bento icon sets.
- State variants after the static foundation feels right.

## Next Milestone Recommendation

Build a focused "Icon Creator Core" screen:

- Center: one honest 24px canvas.
- Left: Start, Shapes, Templates, Layers.
- Right: Context inspector that changes by selection.
- Bottom or right rail: preview sizes.
- Agent composer: small but always available.

Do not add more advanced vector-editor features until the user can create and reshape one polished static icon comfortably.
