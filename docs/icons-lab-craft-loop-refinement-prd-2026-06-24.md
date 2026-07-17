# Icons Lab Craft Loop Refinement PRD

Date: 2026-06-24

## Problem

Icons Lab can now create and edit icon geometry, but the latest QA audit found that the editor still feels closer to a compact vector editor than an effortless icon-making workspace. [SOURCE: docs/audits/icons-lab-human-agent-qa-2026-06-24/report.md]

The main product gap is not missing drawing primitives. The gap is that the current screen does not strongly guide a human or agent through the craft loop that produces clear, beautiful icons. [SOURCE: docs/audits/icons-lab-human-agent-qa-2026-06-24/report.md]

## Target User

- Founder-builder creating Supericons icon sets without wanting a full vector editor learning curve. [ASSUMPTION]
- Designer or developer who wants quick 24x24 SVG icon construction with live small-size preview. [SOURCE: docs/audits/icons-lab-human-agent-qa-2026-06-24/report.md]
- AI agent operating with human approval, able to propose icon edits before applying them. [SOURCE: docs/audits/icons-lab-human-agent-qa-2026-06-24/report.md]

## Jobs To Be Done

- When I open Icons Lab, I want a calm 24x24 canvas with only the tools I need now, so I can start composing instead of sorting through controls. [SOURCE: docs/audits/icons-lab-human-agent-qa-2026-06-24/report.md]
- When I sketch or insert a generated shape, I want immediate refinement actions, so rough geometry becomes icon-safe quickly. [SOURCE: docs/audits/icons-lab-human-agent-qa-2026-06-24/report.md]
- When I ask the agent to help, I want a visual proposal before approval, so I can judge the change by sight instead of text alone. [SOURCE: docs/audits/icons-lab-human-agent-qa-2026-06-24/report.md]
- When I refine an icon, I want the 16px, 24px, and 48px previews to stay prominent, so I can decide whether the icon reads at real use sizes. [SOURCE: docs/audits/icons-lab-human-agent-qa-2026-06-24/report.md]

## Goals

- Make the canvas and live preview feel like the center of the editor. [SOURCE: docs/audits/icons-lab-human-agent-qa-2026-06-24/report.md]
- Reduce visible control clutter without removing existing power features. [SOURCE: docs/audits/icons-lab-human-agent-qa-2026-06-24/report.md]
- Add a contextual refine strip for the selected icon geometry. [SOURCE: docs/audits/icons-lab-human-agent-qa-2026-06-24/report.md]
- Make agent proposals more visual and reviewable. [SOURCE: docs/audits/icons-lab-human-agent-qa-2026-06-24/report.md]

## Non-Goals

- Rebuild the drawing engine. [ASSUMPTION]
- Add more primitive tools. [SOURCE: docs/audits/icons-lab-human-agent-qa-2026-06-24/report.md]
- Replace the existing Vite and React app shell. [ASSUMPTION]
- Build full agent autonomy or external model integration in this pass. [ASSUMPTION]

## Scope

### Functional Requirements

1. The editor shall show preview before detailed inspector controls in the right dock. Maps to JTBD: keep real-size previews prominent. [SOURCE: docs/audits/icons-lab-human-agent-qa-2026-06-24/report.md]
2. The left tool panel shall group tools by icon-making intent rather than implementation type. Maps to JTBD: reduce tool sorting. [SOURCE: docs/audits/icons-lab-human-agent-qa-2026-06-24/report.md]
3. Tool groups shall be collapsed unless they are primary or currently active. Maps to risk: visible control clutter. [SOURCE: docs/audits/icons-lab-human-agent-qa-2026-06-24/report.md]
4. The canvas shall provide a contextual refine strip when geometry is selected. Maps to JTBD: turn rough geometry into icon-safe geometry. [SOURCE: docs/audits/icons-lab-human-agent-qa-2026-06-24/report.md]
5. The refine strip shall expose center, recipe, smooth, balance, corners, reduce, and point-edit actions only when those actions apply. Maps to risk: irrelevant controls. [SOURCE: docs/audits/icons-lab-human-agent-qa-2026-06-24/report.md]
6. Canvas view controls shall be visually secondary to drawing and refinement actions. Maps to goal: canvas focus. [SOURCE: docs/audits/icons-lab-human-agent-qa-2026-06-24/report.md]
7. Agent proposals shall include a compact visual preview related to the pending action. Maps to JTBD: judge by sight before approval. [SOURCE: docs/audits/icons-lab-human-agent-qa-2026-06-24/report.md]
8. Inspector sections shall default to fewer open controls, with raw point editing treated as an advanced or contextual task. Maps to risk: expert-heavy point mode. [SOURCE: docs/audits/icons-lab-human-agent-qa-2026-06-24/report.md]

### Success Metrics

- Human can identify the primary canvas and preview within the first screen without scanning every panel. [ASSUMPTION]
- A selected path exposes refinement actions near the canvas. [ASSUMPTION]
- Agent proposal card includes a visible icon preview. [ASSUMPTION]
- Existing model tests and production build pass after the refinement. [ASSUMPTION]
- Browser verification produces screenshots showing the refined hierarchy. [ASSUMPTION]

## Risks

- Hiding tools too aggressively may make existing functions feel missing. Mitigation: keep search and expandable sections. [ASSUMPTION]
- Moving inspector below preview may slow precision edits. Mitigation: keep inspector in the same right dock. [ASSUMPTION]
- Visual proposal previews may be approximate for complex actions. Mitigation: label them as preview context, not final output. [ASSUMPTION]

## Open Questions

- Should Icons Lab eventually have a dedicated "Craft" panel separate from "Tools" and "Assets"? [ASSUMPTION]
- Should the agent receive a separate machine-readable action/state API in the UI runtime? [SOURCE: docs/audits/icons-lab-human-agent-qa-2026-06-24/report.md]
- Should raw point editing be fully hidden behind an "Advanced points" mode in a later pass? [SOURCE: docs/audits/icons-lab-human-agent-qa-2026-06-24/report.md]

## Acceptance Criteria

- The PRD is saved in `docs/`. [ASSUMPTION]
- The editor right dock renders preview before inspector. [ASSUMPTION]
- The left tool panel shows calmer intent-led groups. [ASSUMPTION]
- The canvas shows contextual refine actions when geometry is selected. [ASSUMPTION]
- Agent proposal cards include a visual preview area. [ASSUMPTION]
- `npm run build` passes in `icons-lab`. [ASSUMPTION]
- Relevant model tests pass in `icons-lab`. [ASSUMPTION]
- Browser QA captures the refined editor screen. [ASSUMPTION]
