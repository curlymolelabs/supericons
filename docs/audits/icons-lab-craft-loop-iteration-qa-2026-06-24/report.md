# Icons Lab Craft Loop QA Audit

Date: 2026-06-24

## Scope

This audit checked the current Icons Lab editor from two lenses:

- Human creator lens: can a person start from a blank canvas, add geometry, refine points, see the icon at real sizes, and understand what the agent is proposing?
- Agent partner lens: can the assistant propose an edit, show enough visual context, wait for approval, apply the edit, and keep the user in control?

The audit used the running app, browser screenshots, model tests, and production build output.

## Evidence Captured

Screenshots were captured under:

`docs/audits/icons-lab-craft-loop-iteration-qa-2026-06-24/`

Key artifacts:

- `01-empty-editor-preview-state.png`
- `02-soft-box-selected-refine-strip.png`
- `03-converted-to-points.png`
- `04-spark-added-preview.png`
- `05-agent-proposal-visual-context.png`
- `06-agent-connector-applied.png`
- `07-agent-review-proposal.png`
- `contact-sheet.png`
- `run-observations.json`

The automated browser verification also refreshed screenshots under:

`icons-lab/verification/`

## Issues Found And Addressed

1. Blank preview looked like a broken transparent preview.

   Fix: the preview panel now says `Create or import geometry to see real-size previews.` and each empty preview cell shows `No mark`. This makes the empty state feel intentional instead of unfinished.

2. `Edit points` converted a shape but did not clearly place the user into point editing.

   Fix: the refine action now converts selected primitive geometry to a path and switches the active tool to node editing. The rerun recorded `active_tool_after_edit_points` as `icon-canvas tool-node` with `node_handles_visible` equal to `8`.

3. Agent proposal state was too vague.

   Fix: the agent composer now uses clearer status text: `Waiting for approval`, `History visible`, and `Suggestions hidden`. Proposal cards also show a `Visual context` label before the preview.

4. The flow spec still had broad state placeholders.

   Fix: the flow spec now includes explicit states for the structure drawer, agent proposal card, and export flow rather than generic placeholders.

5. The production build previously had a large chunk warning.

   Fix: Vite now splits vendor output into smaller chunks. The verified build output did not show the earlier chunk-size warning.

## Current Human UX Read

The editor is moving in the right direction for a focused icon tool:

- The canvas is still the center of attention.
- The refine strip appears only when a selection exists, which keeps the main surface calmer.
- Preview is useful earlier in the workflow because it shows real icon sizes before deep inspector work.
- Point editing is now discoverable from the contextual action instead of hiding behind a mental model from larger vector editors.

Remaining UX risk:

- The right panel is useful but still dense. It is acceptable on desktop, but it should keep trending toward progressive disclosure.
- The generated icon examples can feel heavy or crowded. This is not a control failure, but it affects whether Icons Lab feels "beautiful by default."
- Some agent proposal previews are contextual, not exact final visual diffs.

## Current Agent UX Read

The agent flow now behaves more like a partner and less like a black box:

- The assistant proposes before applying.
- The proposal includes a visual cue.
- The user can reject or apply.
- Applied edits are visible on the canvas.

Remaining agent risk:

- Proposals should eventually include sharper before and after previews for path operations.
- The agent should score icon craft quality with simple user-facing language: readable at 16px, balanced, not crowded, clear metaphor, and export ready.

## Verification

Commands run from `icons-lab/`:

```powershell
npm run build
npm run test:model
npm run verify:browser
```

Verified results:

- `npm run build`: passed. Production chunks were generated without the earlier Vite chunk-size warning.
- `npm run test:model`: passed. 1 test file passed, 50 tests passed.
- `npm run verify:browser`: passed. The browser script refreshed editor, export, drawing, path, state, agent, import, node, and persistence screenshots.

## Next Iteration Recommendation

The next pass should focus on icon craft quality rather than adding more tools:

- Add a "beautiful by default" recipe that simplifies bulky marks and normalizes stroke weight for 16px and 24px use.
- Add before and after visual diffs for agent proposals.
- Keep collapsing inspector sections until only the current task is visually dominant.
- Add one guided icon-building path: choose intent, pick primitive, refine points, preview sizes, export.
