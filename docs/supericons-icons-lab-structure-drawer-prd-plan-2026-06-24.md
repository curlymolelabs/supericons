# Supericons Icons Lab Structure Drawer PRD And Plan

Date: 2026-06-24

Status: Refinement to the Icons Lab core editor plan. This document narrows the role of layers, objects, and assets in the editor. `[SOURCE: docs/supericons-icons-lab-research-applied-prd-and-plan-2026-06-23.md]`

## Problem

Icons Lab should help a human create a beautiful icon, not make them manage a raw SVG object tree. The current editor still gives the object list too much product weight by treating it like a permanent layer surface. `[SOURCE: docs/supericons-icons-lab-research-applied-prd-and-plan-2026-06-23.md]`

The app still needs an object graph so the agent can select, rename, reorder, group, hide, lock, and explain precise edits. `[ASSUMPTION]` The mistake is exposing that internal structure as a main tab for every user moment. `[ASSUMPTION]`

## Target User

Primary user: a human icon creator or Supericons owner who wants the canvas, tools, preview, and focused inspector to carry the main workflow. `[SOURCE: docs/supericons-icons-lab-research-applied-prd-and-plan-2026-06-23.md]`

Secondary user: an AI agent that needs stable object ids, names, groups, stacking order, visibility, and lock state to make reviewable edits. `[SOURCE: docs/supericons-icons-lab-research-applied-prd-and-plan-2026-06-23.md]`

## Scope

### In Scope

- Replace the permanent `Layers` tab with an on-demand `Structure` drawer. `[ASSUMPTION]`
- Keep `Tools` and `Assets` as the two persistent left-panel tabs. `[ASSUMPTION]`
- Rename user-facing object-tree language from "layers" to "structure", "groups", "objects", or "parts" depending on context. `[ASSUMPTION]`
- Remove the current icon object list from `Assets`. Assets should mean reusable insertable material, not the live icon anatomy. `[ASSUMPTION]`
- Keep object actions available in the `Structure` drawer: select, hide, lock, reorder, duplicate, group, ungroup, delete. `[ASSUMPTION]`
- Keep the object graph available for the agent and for advanced recovery. `[ASSUMPTION]`

### Non-Goals

- Do not remove the internal object model. `[ASSUMPTION]`
- Do not show raw nodes in Structure; nodes belong in Point Editor. `[ASSUMPTION]`
- Do not turn Assets into another view of the current icon. `[ASSUMPTION]`
- Do not force users to open Structure for normal drawing, selection, styling, preview, or export. `[ASSUMPTION]`

## Functional Requirements

| ID | Requirement | Maps To |
| --- | --- | --- |
| FR1 | The editor left panel has only `Tools` and `Assets` as persistent tabs. `[ASSUMPTION]` | Human creation focus; reduces visual load |
| FR2 | A `Show structure` command opens a temporary drawer over the editor without replacing the canvas. `[ASSUMPTION]` | Recovery, advanced selection, agent explanation |
| FR3 | The Structure drawer lists semantic groups first and objects beneath them. `[ASSUMPTION]` | Object management without raw SVG-first thinking |
| FR4 | Structure rows support visibility, lock, selection, drag reorder, grouping, duplicate, delete, and stack order. `[ASSUMPTION]` | Advanced control and recovery |
| FR5 | Assets contains reusable insertable parts and style tokens only. `[ASSUMPTION]` | Clear mental model |
| FR6 | Labels and counters say `objects`, `groups`, `parts`, or `structure`, not `layers`, unless referring to legacy test hooks or internal class names. `[ASSUMPTION]` | Plain language and reduced confusion |
| FR7 | Agent messages may refer to object names, but the full object tree stays hidden until the user opens Structure. `[ASSUMPTION]` | Human/agent collaboration without UI clutter |

## UX Flow

1. User opens Icons Lab and sees the canvas, tools, preview, inspector, and compact agent composer. `[SOURCE: docs/supericons-icons-lab-research-applied-prd-and-plan-2026-06-23.md]`
2. User creates or edits the icon directly on canvas. `[SOURCE: docs/supericons-icons-lab-research-applied-prd-and-plan-2026-06-23.md]`
3. If the user needs to select a hidden or overlapping object, reorder stack position, group parts, or debug an import, they click `Show structure`. `[ASSUMPTION]`
4. Structure opens as a temporary drawer. The canvas remains visible and remains the main workspace. `[ASSUMPTION]`
5. User closes Structure and returns to normal canvas-first editing. `[ASSUMPTION]`

## Success Metrics

- A user can start drawing without seeing a live object tree. `[ASSUMPTION]`
- A user can still recover from overlapping, hidden, locked, or imported objects through Structure. `[ASSUMPTION]`
- Assets no longer duplicates the current icon structure. `[ASSUMPTION]`
- The editor reads as an icon creator, not a generic vector file manager. `[ASSUMPTION]`

## Risks

| ID | Risk | Mitigation |
| --- | --- | --- |
| R1 | Hiding Structure makes recovery harder. `[ASSUMPTION]` | Keep a visible `Show structure` command and keyboard-searchable command label. |
| R2 | Agents need object precision that humans do not want to see. `[ASSUMPTION]` | Keep object names in the model and summarize agent actions in plain language. |
| R3 | Imported SVGs may contain many objects. `[ASSUMPTION]` | Auto-open or suggest Structure after complex imports in a later slice. |
| R4 | Existing tests expect `Layers`. `[ASSUMPTION]` | Update browser verification helpers to open Structure instead of the old tab. |

## Open Questions

1. Should complex SVG import automatically open Structure once after import? `[ASSUMPTION]`
2. Should Structure live on the left as a drawer, right as an inspector drawer, or command palette modal? `[ASSUMPTION]`
3. Should the agent have a visible `Explain structure` command that opens the drawer and highlights relevant objects? `[ASSUMPTION]`

## Implementation Plan

1. Update editor navigation from `Tools | Layers | Assets` to `Tools | Assets`.
2. Add a `Show structure` button in the Build header.
3. Render the existing object tree inside a temporary Structure drawer.
4. Rename visible labels from `Layers` to `Structure`, `objects`, and `parts`.
5. Remove the live icon object list from Assets.
6. Update browser verification to use the new Structure drawer helper.
7. Run build, model tests, and browser verification.

## Execution Update

Implemented in the current Icons Lab slice. `[SOURCE: icons-lab/src/App.tsx]`

- The persistent left panel now shows only `Tools` and `Assets`. `[SOURCE: icons-lab/src/App.tsx]`
- `Show structure` opens a temporary Structure drawer for advanced selection, visibility, locking, grouping, and stack order. `[SOURCE: icons-lab/src/App.tsx]`
- Structure includes search so users can find imported, hidden, or overlapping objects without scanning a long raw tree. `[SOURCE: icons-lab/src/App.tsx]`
- Assets now contains template starts, reusable starter parts, style recipes, and color tokens instead of the live current-icon object tree. `[SOURCE: icons-lab/src/App.tsx]`
- Visible product copy now uses object/structure language instead of layer language. `[SOURCE: icons-lab/src/App.tsx]` `[SOURCE: icons-lab/src/domain/qa.ts]`
- Browser verification now opens Structure through the drawer flow instead of using the old permanent tab. `[SOURCE: icons-lab/scripts/verify-icons-lab-browser.py]`
