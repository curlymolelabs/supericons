# Supericons MCP Direct Preview Image URL Plan

Date: 2026-07-03

Status: Approved for implementation

## Problem Statement

Supericons MCP `preview_icons` can return an MCP image content block, and current hosted smoke tests confirm the image renders as a valid PNG. However, some agent clients show MCP images only inside the tool result panel instead of the main chat answer. That creates a visual gap: users can technically inspect the image, but the final response may still look like text-only icon IDs.

This matters because icon choice is visual. Users need to see candidate glyphs quickly, not only trust an agent's text summary.

## Target User

- Designers, builders, and indie developers using Supericons through Claude Desktop, Codex, Cursor, and other MCP-capable clients.
- AI agents that need a simple way to present visual icon candidates in final answers.
- Terminal users who cannot render inline MCP images and need a direct browser URL.

## Goals

- Give agents a direct PNG URL they can include in final chat responses.
- Give agents a ready-made Markdown image snippet for clients that render remote Markdown images.
- Keep the existing `preview_url` web page fallback.
- Keep the route public, read-only, low-risk, and bounded by small request limits.
- Avoid Netlify changes unless the web preview page itself changes.

## Non-Goals

- Do not guarantee that every MCP client will render the image in the final answer. Final rendering is controlled by the client.
- Do not replace the existing MCP image content block.
- Do not add MCP Apps UI in this patch.
- Do not change search ranking, icon metadata, pricing, auth, or Supabase schemas.
- Do not expose private registry data or service credentials.

## Functional Requirements

1. Add a hosted PNG endpoint:
   - `GET /preview-icons.png`
   - Supports `q` or `query` for search previews.
   - Supports `icons` or `icon_refs` for fixed icon refs in `library:id` format.
   - Supports `library`, `style`, `locale`, and `limit`.
   - Returns `image/png` when icons are found.
   - Returns a clear non-image error for missing or empty inputs.

2. Update `preview_icons` structured output:
   - Add `image_url`.
   - Add `markdown_image`.
   - Keep `preview_url`.
   - Keep MCP image content when `include_image=true`.

3. Keep request bounds:
   - Maximum 12 icons per preview.
   - Reasonable query and icon-ref length limits.
   - Only supported locales and styles are accepted.

4. Update local stdio MCP output:
   - Return the same `image_url` and `markdown_image` fields so local MCP users and IDE agents get the same guidance.

5. Add regression checks:
   - Verify `preview_icons` payload includes `image_url` and `markdown_image`.
   - Verify the hosted route returns a PNG for `q=ai slop&limit=3`.

## API Contract

### Name

Direct icon preview PNG

### Caller

MCP clients, browser clients, and agent final-answer Markdown.

### Method And Path

`GET /preview-icons.png`

### Auth And Permissions

Public read-only endpoint. No user account or API key required.

### Request Shape

- `q` or `query`: optional search query.
- `icons` or `icon_refs`: optional comma-separated list of `library:id` refs.
- `library`: optional library key.
- `style`: optional, one of `any`, `outline`, `solid`.
- `locale`: optional supported locale.
- `limit`: optional integer from 1 to 12.

At least one of `q`, `query`, `icons`, or `icon_refs` is required.

### Response Shape

- Success: `200 image/png`.
- Missing input: `400 application/json`.
- No matching icons: `404 application/json`.
- Internal failure: `500 application/json`.

### Side Effects

None. The endpoint only reads hosted search results and renders a contact-sheet PNG.

## Success Metrics

- `preview_icons` returns `preview_url`, `image_url`, and `markdown_image`.
- Direct PNG route returns a non-empty PNG for `ai slop`.
- Claude Desktop users can at least open or copy a direct PNG link from the main answer.
- Clients that support remote Markdown images can render the preview in the final response.

## Risks And Dependencies

- Some clients may sanitize or avoid rendering remote Markdown images.
- Railway runtime may not render text in the PNG if no system fonts are available; the icon glyphs must remain visible.
- Public image generation can be abused if unbounded, so inputs and limits must stay small.
- Hosted search availability still affects query-based preview generation.

## Open Questions

- Should Supericons later add MCP Apps UI for a richer in-chat gallery?
- Should direct PNG URLs be cached more aggressively at the edge if usage grows?
- Should `search_icons` and `recommend_icons` also return `markdown_image` when a preview URL exists?
