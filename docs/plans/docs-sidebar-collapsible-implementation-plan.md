# Supericons Docs Sidebar Collapsible Implementation Plan

**Date:** 11 April 2026  
**Status:** Ready for implementation

---

## Goal

Turn the docs sidebar into a cleaner, collapsible navigation so it is easier to scan, easier to use on smaller screens, and less visually dense.

The sidebar should feel like a mature documentation navigation:
- grouped clearly
- easy to collapse and expand
- stable during page navigation
- spaced with a calmer reading rhythm

---

## What Will Change

### 1. Add collapsible docs groups

Each major docs group should be collapsible:
- Overview
- MCP Setup
- MCP Tools Reference
- Motion Lab
- Converter
- Access and API Keys
- Troubleshooting

### 2. Keep the active group open

When a page is active, its parent group should open automatically so the user always sees where they are.

### 3. Allow multiple groups to stay open

This should not behave like a strict accordion.

Users should be able to keep more than one section open at the same time, which is more useful for documentation navigation.

### 4. Keep the sidebar persistent

The docs shell should continue to keep the sidebar mounted while only the main content area changes.

### 5. Improve spacing and distribution

The sidebar should use a cleaner spacing system:
- more separation between groups
- clearer spacing between group label and links
- compact but readable link rows
- lighter indentation

---

## Interaction Rules

### Group behavior

- clicking a group label toggles that group open or closed
- clicking a page link changes only the main docs content
- the active page remains highlighted
- the active group opens automatically on route change

### State behavior

- the sidebar should remember open groups during the session
- open state may be persisted locally so the docs feel stable between page changes

---

## Layout and Spacing Direction

### Group spacing

Increase vertical spacing between groups so sections read as distinct navigation blocks.

### Group trigger

Use the group label as a trigger row with:
- a comfortable click target
- a subtle chevron
- a stronger label treatment than the links below

### Link spacing

Keep links compact, but reduce the cramped feel by:
- slightly improving vertical rhythm
- keeping consistent left inset
- keeping active-state styling clean and restrained

---

## Build Sequence

1. Add group keys and collapsible state handling.
2. Update the docs sidebar renderer to output group triggers and collapsible lists.
3. Add active-group auto-open behavior on route change.
4. Persist open-group state locally.
5. Refine sidebar spacing and trigger styling.
6. Verify repeated docs navigation, active states, and mobile behavior.

---

## Success Standard

This work is complete when:
- docs groups can collapse and expand
- the active group stays open automatically
- multiple groups can remain open
- sidebar navigation still updates only the main content panel
- the spacing feels calmer and easier to scan
- desktop and mobile both behave cleanly
