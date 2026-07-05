# Supericons v2 concept mockups

Three standalone HTML mockups exploring directions for supericons v2. Each file is fully self-contained (inline CSS, JS, and SVG, no network requests). Open any file directly in a browser to explore it. Nothing here touches or depends on the production codebase.

## A. Command Deck (`v2-a-command-deck.html`)

The minimal, human-first evolution. One search-first canvas: a large semantic command bar with intent chips instead of tag dropdowns, a clean results grid with a squint-test size strip on hover, and an inline row editor that replaces the 320px customize panel. The signature idea is the agent-parity strip pinned to the bottom: every human interaction shows the exact MCP call an agent would make for the same action, with a copy button. Humans learn the agent vocabulary just by using the UI.

## B. Dual Surface (`v2-b-dual-surface.html`)

The human-AI shared workspace. Three columns: a human surface (visual grid plus taste controls for color, stroke, and motion), a machine surface (the same selection rendered as semantic metadata: intent, tags, composable parts, recommended contexts, a11y label, and a ready-to-paste component spec), and a live agent session spine in between. The spine mocks an MCP-connected agent calling search and recommend tools, with the human approving or swapping the agent's picks. Approvals feed taste back to the recommender.

## C. Living Icons (`v2-c-living-icons.html`)

The boldest direction: supericons as the standard state language of agentic software. The hero is a state machine playground where one icon expresses nine agent lifecycle states (idle through error) driven by a single `--si-state` CSS variable. Below it: an icon grammar composer (base glyph + state ring + confidence badge + authority marker), the four governance collections from the 2027 blueprint, a `get_stateful_icon` MCP response card, and an ambient surfaces section showing the same signal in an IDE status line, a terminal spinner, and a notification.

## Icons Lab v2 (`icons-lab-v2.html`)

A ground-up redesign of the Icons Lab workbench (currently `icons-lab/` in this repo). Instead of one editor-centric app, the UI is organized around the icon production pipeline: Brief, Draft, Refine, States, Package, Ship. A production queue on the left tracks icons in flight (fed by real search gaps), the center swaps per stage, and a persistent agent lane on the right carries proposals with approve/reject plus an MCP parity strip showing every action as a tool call. Ship sits behind an explicit human taste gate. Keeps v1's proven pieces: 24x24 grid and keylines, recipes, QA checks, craft scores, state variants, public-safe exports.

## Shared design DNA

All three keep the v1 identity so they read as evolutions, not reboots: dark `#0e0e0e`/`#131313` surfaces, Ignition Orange `#FF4F00` accent, Space Grotesk headlines with Manrope body (system-font fallbacks since files are self-contained), and the existing radius and spacing feel.
