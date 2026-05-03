# Search Intent Mind Map

## Purpose

The icon registry should describe icons, not every possible word a person might type.

The search intent mind map is a separate meaning layer. It helps search translate natural words into icon concepts before looking up icons.

Example:

`smelly` -> `odor` -> `bad smell`, `trash`, `alert`, `nose`, `cloud`

This keeps the registry clean while making browser search and MCP search more forgiving.

## Source Files

- `data/search-intent-dictionary/search-intent-dictionary.json` stores direct curated intent rules.
- `data/search-intent-dictionary/search-intent-mind-map.json` stores reusable meaning nodes and aliases.
- `lib/generated-search-intent-rules.js` is generated from both sources.
- `lib/search-intent-core.js` is the shared runtime used by browser search and hosted search functions.

## Maintenance Rule

When a vague word fails, do not add that word to icon records.

Use this order:

1. Check whether an existing mind-map node already covers the meaning.
2. If yes, add the word as an alias to that node.
3. If no, add one new meaning node with related terms, icon concepts, and avoid concepts.
4. Rebuild generated rules with `npm run build:search-intent-dictionary`.
5. Verify with `npm run verify:search-intent-dictionary` and `npm run verify:search-intent-expansion`.

## Why This Is Cleaner

The registry answers: what is this icon?

The mind map answers: what might the user mean?

Keeping those jobs separate reduces registry bloat, avoids noisy tags, and makes search easier to improve across browser and MCP.

## Current Example

The `odor` node supports:

- `smell`
- `smelly`

Those terms map to concepts like:

- `nose`
- `air`
- `cloud`
- `wind`
- `trash`
- `alert`

They avoid concepts like:

- `check`
- `badge-check`
- `sparkles`
