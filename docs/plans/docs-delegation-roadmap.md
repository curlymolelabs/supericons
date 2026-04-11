# Supericons Docs Delegation Roadmap

**Date:** 10 April 2026  
**Status:** Working roadmap

---

## Purpose

This roadmap breaks the remaining docs work into clear tracks so the work can be delegated across multiple agents without overlap.

The docs shell, layout direction, MCP setup guides, and placeholder structure are already in place.

The remaining work is mainly:
- filling incomplete pages with real content
- tightening the docs architecture
- verifying accuracy
- preparing the docs section for launch

---

## Current State

Already in place:
- docs shell inside the Supericons site
- dedicated docs left sidebar
- minimalist docs layout direction
- real pages for Docs Home, Quickstart, Claude Code, Codex, and Cursor
- placeholder pages for the remaining docs sections

Still to be completed:
- product orientation pages
- MCP reference pages
- Motion Lab docs
- Converter docs
- route migration to canonical docs URLs
- final verification and QA

---

## Workstream 1: Orientation and Access

### Purpose

Explain the product clearly before users move into setup or deep reference pages.

### Pages

- What Is Supericons
- API Keys
- Pro and Collections
- Troubleshooting

### Deliverables

- a clear explanation of the product and what each part does
- a clear explanation of API keys and entitlement
- a clear explanation of Pro access versus collection ownership
- one strong troubleshooting page that brings the most common issues together

### Notes

This workstream reduces confusion across the rest of the docs set, so it should be prioritized early.

---

## Workstream 2: MCP Tools Reference

### Purpose

Document the MCP surface as it actually exists in the product today.

### Pages

- MCP Tools Overview
- Icon Tools
- Motion Lab Tools
- Converter Tools

### Deliverables

- what each tool does
- what inputs it expects
- what outputs it returns
- who can use it
- which tools are free and which require Pro

### Notes

This work should be grounded in the live MCP implementation so the docs match the real tool surface.

---

## Workstream 3: Motion Lab Docs

### Purpose

Explain Motion Lab as a user workflow, not just as a feature name.

### Pages

- Motion Lab Guide
- Motion Lab Presets
- Motion Lab Trigger Types
- Motion Lab Exports

### Deliverables

- what Motion Lab is for
- how presets differ
- when to use each trigger type
- when to export CSS versus animated SVG

### Notes

This workstream should focus on clarity, use cases, and output choices rather than repeating UI labels.

---

## Workstream 4: Converter Docs

### Purpose

Explain conversion workflows and settings in plain, practical language.

### Pages

- Converter Guide
- PNG to SVG
- SVG to PNG
- Settings Reference

### Deliverables

- when to use each conversion path
- how source quality affects the result
- what each setting changes
- practical guidance for getting better output

### Notes

This should help users make better conversion choices, not just list settings mechanically.

---

## Workstream 5: Route Migration and Docs Architecture

### Purpose

Finish the docs system architecture after the page set is mostly complete.

### Scope

- move canonical docs routes to clean `/docs/...` paths
- keep current `/?view=...` routes working as compatibility redirects
- redirect old `/mcp/...` guide routes to the canonical docs pages

### Deliverables

- one canonical docs URL structure
- preserved compatibility with existing entry points
- no duplicate docs destinations competing with each other

### Notes

This should happen after the content is mostly stable so route work does not need to be repeated.

---

## Workstream 6: Verification and QA

### Purpose

Make the full docs section launch-ready.

### Scope

- verify client setup guides against official documentation
- verify MCP tool references against the live MCP implementation
- verify page-to-page internal links
- verify mobile and desktop docs behavior
- verify consistency across docs, pricing, and API Keys

### Deliverables

- a fully checked docs section
- reduced factual risk
- fewer broken links or contradictory explanations

### Notes

This is the final gate before launch readiness.

---

## Recommended Order

1. Orientation and Access
2. MCP Tools Reference, Motion Lab Docs, and Converter Docs in parallel
3. Route Migration and Docs Architecture
4. Verification and QA

This order creates a strong foundation first, fills the deeper docs in parallel, then finishes with architecture cleanup and final validation.

---

## Recommended Agent Split

- Agent A: Orientation and Access
- Agent B: MCP Tools Reference
- Agent C: Motion Lab Docs
- Agent D: Converter Docs
- Agent E: Route Migration and Docs Architecture
- Agent F: Verification and QA

---

## Success Standard

The roadmap is complete when:
- every page in the docs sidebar has real content
- the docs URLs are clean and canonical
- the setup and tool references match the live product
- the docs read as one coherent documentation system
- the full docs section is ready for launch
