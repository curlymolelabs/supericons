# MCP Icon Search Guide and Recommendation Quality Plan

## Purpose

Add a public-safe docs section that teaches humans how to ask their AI agent to search Supericons through MCP, while also tightening the `recommend_icons` quality gate because the latest smoke test still shows weak recommendations.

This plan must not reveal private registry internals, scoring weights, service keys, review workflows, or operational details. The public docs should explain what users can do, not how the private system is built.

## Current Verified State

- `docs-pages.js` contains the public docs page definitions and navigation groups.
- MCP docs already include setup and tool reference pages.
- The MCP reference currently lists `search_icons`, `get_icon`, `recommend_icons`, and related tools.
- `mcp/recommend-icons.js` imports and uses the newer search intent helpers:
  - `buildIntentQueryVariants`
  - `buildSearchIntentProfile`
  - `getIntentCandidateAdjustment`
- `mcp/recommend-icons.js` also uses semantic registry scoring through:
  - `getSemanticRecordForIcon`
  - `scoreSemanticAlignment`
  - `buildPublicSemanticPayload`
- `npm run evaluate:agent-first-mcp-ux` ran successfully on 2026-05-03, but the benchmark result was only `2 / 4` expected slot hits. That means the recommend function is wired to the latest semantic layer, but the current quality gate still exposes recommendation weakness.

## Public Docs Section

Add a new docs page under MCP Reference:

- Page id: `docs-mcp-search-guide`
- Nav label: `Search Guide`
- Page title: `How to Search Icons with MCP`
- Placement: before `docs-mcp-tools` in the MCP Reference group, because users should learn how to ask before reading raw tool parameters.

## Public-Safe Content Scope

The page should explain:

- What MCP icon search does in simple language.
- How to ask an AI agent to search Supericons.
- When to use `search_icons`.
- When to use `recommend_icons`.
- When to use `get_icon`.
- How to search by exact icon name.
- How to search by library, such as Lucide, Tabler, Phosphor, MingCute, Iconoir, Bootstrap, Ionicons, Heroicons, Material, or Simple Icons.
- How to search by meaning or use case, such as:
  - database
  - user profile
  - upload to cloud
  - AI dashboard
  - beautiful
  - smelly
  - blocked user
  - warning
- How to ask for output format, such as SVG, icon id, library name, or implementation-ready markup.
- How to ask for alternatives when the first result is not right.

The page should not explain:

- Private Supabase table names.
- Service role keys.
- Internal scoring weights.
- Internal review queues.
- Agent-generated workflow details.
- Hidden prompt strategy.
- Registry maintenance operations.

## Suggested Prompt Examples

Use plain examples like these:

```text
Find me a database icon.
```

```text
Search Lucide for user profile icons.
```

```text
Recommend icons for an AI dashboard: model, prompt, dataset, evaluation, deployment, and monitoring.
```

```text
Find a friendly icon for something beautiful.
```

```text
Find an icon that could represent a bad smell or something smelly.
```

```text
Find three Tabler icons for account security.
```

```text
Get the SVG for the best result and tell me the icon id and library.
```

## Tool Guidance

Explain the three common choices:

- `search_icons`: best for finding icons from a word, phrase, object, action, feeling, or use case.
- `recommend_icons`: best for choosing a set of icons for UI slots, such as a sidebar, toolbar, or dashboard.
- `get_icon`: best when the user already knows the icon id and library.

## Recommendation Quality Work

The latest code includes the improved semantic intent layer, but the recommendation benchmark still found weak picks. The next implementation should not only document `recommend_icons`; it should improve and test it.

Recommended work:

1. Add benchmark fixtures for real user prompts.
   - AI dashboard: model, prompt, dataset, evaluation, deployment, monitoring.
   - Bottom navigation: home, create, alerts, profile.
   - Admin sidebar: users, billing, database, settings, reports.
   - Content editor toolbar: bold, italic, upload, image, preview.

2. Add expected icon candidates, not only one strict expected icon.
   - Some slots have multiple acceptable icons.
   - The evaluator should pass when the top result is within an approved candidate set.

3. Improve `recommend_icons` slot ranking.
   - Strongly prefer exact action and UI-slot meanings.
   - Penalize unrelated object matches when the slot phrase has common UI intent, such as create, alerts, profile, dataset, deployment, or monitoring.
   - Give common UI concepts a curated public-safe intent map.

4. Add a regression command.
   - Keep `npm run evaluate:agent-first-mcp-ux`.
   - Expand it to fail when benchmark quality drops below an agreed threshold.

5. Re-test MCP prompts manually after the benchmark improves.
   - Search prompt: "Find me a database icon."
   - Search prompt: "Search Lucide for user profile icons."
   - Recommend prompt: "Recommend icons for an AI dashboard: model, prompt, dataset, evaluation, deployment, and monitoring."
   - Recommend prompt: "Choose icons for a mobile bottom nav: home, create, alerts, and profile."

## Implementation Steps

1. Update docs navigation in `docs-pages.js`.
   - Add `docs-mcp-search-guide` to the MCP Reference group before `docs-mcp-tools`.

2. Add the new docs page content in `docs-pages.js`.
   - Use plain, non-secret, user-facing language.
   - Include prompt examples instead of raw internal implementation details.

3. Add links from related pages.
   - Link from Docs home.
   - Link from MCP Tools Overview.
   - Link from Icon Tools Reference.

4. Expand recommendation benchmark fixtures.
   - Update `data/si-registry/benchmarks/agent-first-mcp-ux-fixtures.json`.
   - Support multiple acceptable icon ids for each slot if the evaluator does not already support that.

5. Improve recommendation ranking.
   - Update `mcp/recommend-icons.js` only after benchmark fixtures describe the desired behavior.
   - Keep changes narrow and measurable.

6. Verify.
   - `npm run evaluate:agent-first-mcp-ux`
   - `npm run verify:search-intent-dictionary`
   - `npm run verify:docs-site-render`
   - `npm run build`
   - Browser smoke test the new docs page.

## Acceptance Criteria

- A new MCP search guide exists in the public docs.
- The guide teaches non-technical prompt usage without exposing private operations.
- `search_icons`, `recommend_icons`, and `get_icon` are explained clearly.
- The recommend benchmark includes realistic multi-slot prompts.
- The AI dashboard recommendation test returns sensible icons for all requested slots.
- The bottom navigation test no longer recommends unrelated icons such as thermometer for create or alerts.
- Public docs render successfully.
- Production build passes.

## Recommended Order

Do the docs guide and the recommendation quality work together, but treat them as two separate gates:

1. Publish the docs guide only after it is public-safe and render-verified.
2. Claim `recommend_icons` is improved only after the expanded benchmark passes.
