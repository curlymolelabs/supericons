---
name: supericons-icon-search
description: Use Supericons MCP when the user needs to find, preview, compare, retrieve, or recommend SVG icons for software UI.
---

# Supericons Icon Search

Use Supericons when the user asks for icons by meaning, feature, UI slot, product area, or visual style.

## Best tool choices

- Use `search_icons` when the user gives one concept, such as "database", "profile", "settings", "chill", or "AI model".
- Use `recommend_icons` when the user lists several UI slots, such as app tabs, sidebar items, dashboard panels, or feature names.
- Use `get_icon` when the user already knows the exact icon id and library.
- Use `preview_icons` to refine a result set or visually compare known icon references. Use `search_icons` first for a normal icon request.
- Use `list_libraries` when the user asks what icon libraries are available.

## Response style

Show the icon id, library, and a short reason. Include SVG only when the user asks for it or needs code to paste into a project. When the tool returns a preview image or Markdown image, show it so the user can compare the choices. If no icons are found, say so and follow the tool's suggested next step. Never invent an icon.

## Example prompts

```text
Use Supericons to find a Lucide database icon. Show the icon id, library, and SVG.
```

```text
Use Supericons to recommend icons for an AI dashboard sidebar: model, prompt, dataset, evaluation, deployment, and monitoring.
```

```text
Use Supericons to preview the strongest camera scan icons so I can compare them visually.
```
