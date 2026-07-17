# Search v2 local-first beta invitation

Status: draft for manual sharing

## Short version

Supericons has a faster MCP icon-search beta. It searches eligible English queries from the icon index inside the package, so it avoids the slow hosted search round trip.

Try it with:

```text
@supericons/mcp@beta
```

This beta changes `search_icons` only. Recommendations, localized searches, non-English text, the website, and the stable package keep their current behavior.

If you try it, please share whether the results were useful and any query that felt wrong or returned nothing. You can return to the stable package at any time with:

```text
@supericons/mcp@latest
```

## Longer version

We are testing a faster version of Supericons MCP search. For eligible English searches, the beta uses the deterministic icon index included in the package instead of waiting for the hosted search service.

What stays the same:

- no AI model is called during search;
- icon results follow the same reviewed ranking rules;
- `recommend_icons` keeps the stable route;
- localized and non-English text searches keep the stable route;
- the website and stable npm package are unchanged.

Install or configure `@supericons/mcp@beta` to try it. Please send us the search text and what you expected when a result is unhelpful. Do not send private project information.

To leave the beta, switch back to `@supericons/mcp@latest`.
