# Search Tips Bank

Seed material for pillar 2 (search mastery). Each row becomes one or more posts. Status meanings:

- `draft`: idea captured, claim not yet verified against the live product
- `verified YYYY-MM-DD`: probed against npm latest or the hosted MCP on that date
- `posted YYYY-MM-DD`: went out; see post-log.md

Rule: a tip moves to the queue only after same-day verification. Numbers in copy must come from the verification probe, not from this file.

## A. Getting started

| ID | Tip | Status |
|----|-----|--------|
| A1 | One-line setup: `npx -y @supericons/mcp` in your MCP config gives your agent 20,000+ icons from 11 libraries. No API key. | draft |
| A2 | You do not need to know icon names. Search by meaning: "login", "download", "heart" all resolve through synonym and meaning matching. | draft |
| A3 | Ask `list_libraries` first when you care about style: it returns all 11 libraries with counts and descriptions, so you can pick a visual family before searching. | draft |

## B. Query craft

| ID | Tip | Status |
|----|-----|--------|
| B1 | Describe the concept, not the picture. "license plate recognition camera scan car" beats "rectangle with letters". Stack the nouns that define the scene. | draft |
| B2 | Searching in your own language works: phrase mappings cover 11 locales. Show one non-English query returning the same icons as its English twin. Verified good examples: "下载" (download) and "设置" (settings), both zh-Hans, clean results across 5 libraries. Do NOT use "工作流" until its compound-mapping gap is fixed; it currently returns stream icons. | verified 2026-07-31 |
| B3 | Got zero results? Rephrase toward the general concept, then narrow. Compare an over-specific failing query with its working generalization. | draft |
| B4 | Filter by library when brand consistency matters: `library: "lucide"` keeps every result in one stroke style. | draft |
| B5 | `si` vs `simpleicons` confusion: use `si` for Supericons originals (AI and developer tool concepts), `simpleicons` for brand logos. | draft |
| B6 | Raise `limit` (up to 50) when exploring, keep the default 10 when you already know roughly what you want. | draft |

## C. Agent workflows

| ID | Tip | Status |
|----|-----|--------|
| C1 | For a whole UI at once, use `recommend_icons` with `task` and `slots` instead of N separate searches. It keeps the set coherent and disambiguates slot words from context. | draft |
| C2 | When a slot word is ambiguous, `recommend_icons` returns labeled interpretation options with `needs_clarification` instead of guessing. Show a real ambiguous slot. | draft |
| C3 | See before you choose: `preview_icons` builds a visual contact sheet from a query or known refs. Paste-ready prompt: "Use Supericons to visually compare the top 3 icons for [concept]." | draft |
| C4 | Pin exact icons in scripts and repeat runs with `get_icon` (id plus library). Search discovers, `get_icon` reproduces. | draft |
| C5 | Prompt recipe: "Add appropriate icons to this dashboard using Supericons" and let the agent run the whole search, preview, and insert loop. Record it as a demo. | draft |

## D. Humans on supericons.dev

| ID | Tip | Status |
|----|-----|--------|
| D1 | The same meaning-based search engine powers the website, npm package, and hosted MCP, so a phrasing that works in one place works everywhere. | draft |
| D2 | Web search dropdown tips: pick the suggestion rather than finishing the word when your term is uncommon. Verify current web UX before drafting. | draft |

## E. Behind the search (build-in-public crossovers)

| ID | Tip | Status |
|----|-----|--------|
| E1 | Why keyless: friction kills agent adoption. We measured real usage (p99) before deciding limits instead of guessing. Story only, no raw telemetry. | draft |
| E2 | Queries that returned zero last release and return results now. Pull concrete pairs from release notes (e.g. the 0.4.23 unification fixed "torrent magnet", "browser cookies"). Re-verify on latest before posting. | draft |

## Refill process

Weekly (see x-daily-routine.md): the material miner agent sweeps `mcp/CHANGELOG.md`, release notes, and search docs for new tip candidates and appends rows here with status `draft`. Owner prunes anything off-voice.
