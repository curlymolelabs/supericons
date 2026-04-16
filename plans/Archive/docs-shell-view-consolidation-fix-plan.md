# Docs Shell View Consolidation Fix Plan

## Problem

The previous consolidation removed the duplicate in-app MCP hub, but it kept the consolidated docs hub as a standalone page at `/docs/index.html`. That conflicts with the established secondary-page UX in Supericons, where pages like `Terms`, `Privacy`, `Pricing`, `API Keys`, `Motion Lab`, and `Converter` are rendered inside the app shell.

In practice, this causes two issues:

1. The docs experience feels visually detached from the product.
2. Local/dev routing to `/docs/` or `/docs/index.html` creates mismatch and confusion versus shell-native views.

## Correct UX Direction

Use the app shell as the canonical docs surface.

- Canonical in-product destination: `/?view=docs`
- Legacy MCP hub routes: redirect into `/?view=docs`
- Standalone `/docs/index.html`: compatibility entry that redirects into `/?view=docs`

This keeps one source of truth while matching the site’s actual secondary-page interaction model.

## Implementation Steps

### 1. Add a real shell-native docs view

Update `store.js` to:

- add `docs` to the supported shell views and direct routes
- render a new `renderDocsPage()` view inside `gridArea`
- treat docs like `privacy` / `terms` for sidebar neutrality and shell suppression behavior
- clean up `docsView` when leaving the page

### 2. Move the consolidated docs content into the shell

Use the already consolidated docs copy as the content source, but render it inside the app shell:

- keep hero, quickstart, premium setup, tools, guides, workflow tools, recipes, troubleshooting
- keep copy buttons for the config snippets
- keep anchor links for in-page navigation
- remove the standalone top nav because the site shell already provides navigation

### 3. Add scoped shell-native docs styling

Add a dedicated style block in `style.css` for the new shell docs view:

- use existing site design tokens (`--si-*`)
- keep the docs layout structured and readable
- do not import the standalone `body` / `:root` styling from `public/mcp/docs.css`
- ensure mobile collapse for the two-column layout

### 4. Convert standalone docs into compatibility redirects

Update `public/docs/index.html` so it redirects into `/?view=docs` while preserving hash navigation.

Update remaining MCP compatibility routes so they also land in the shell docs view:

- `public/mcp/index.html`
- any in-app redirect helper that still points to `/docs/index.html`

### 5. Repoint in-app links to the shell docs view

Update app-owned links to use `/?view=docs`:

- landing docs CTA
- footer docs link
- API Keys docs helper link
- any MCP compatibility redirect helper in `store.js`

Keep external client-guide pages alive, but have their “Docs” nav items point into `/?view=docs`.

## Verification

Run:

- `node --check main.js`
- `node --check store.js`
- `npm run build`

Browser checks:

1. `/?view=docs` renders inside the site shell.
2. `/?view=mcp` redirects to the shell docs view.
3. `/docs/index.html` redirects to the shell docs view.
4. Docs copy buttons work.
5. Hash links such as `/?view=docs#docs-quickstart` land on the right section.
6. Returning from docs to icons keeps the shell intact.

## Guardrails

- Do not reintroduce a second docs/MCP content source.
- Do not keep the standalone page as the primary destination.
- Do not import standalone `body` styles into the app shell.
- Preserve the consolidated copy already approved unless a shell-specific adjustment is necessary.
