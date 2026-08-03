# Supericons X Content Playbook (@supericonsdev)

Status: working draft, owner-controlled. Per VC-9, nothing publishes without the owner's explicit yes. Agents draft, verify, and queue; the owner posts.

## Positioning

Supericons is not another icon library. It is the icon layer for the agent era: multilingual icon search, recommendations, previews, and exports that AI agents can use directly over MCP, no API key required, heading toward a living map of schema-backed, interactive, payment-capable icons.

## Content pillars

| # | Pillar | Share | What it is |
|---|--------|-------|------------|
| 1 | Agent demos | 25% | Screen recordings and GIFs of real agents (Claude Desktop, Cursor, VS Code) finding and using icons through Supericons MCP. Every demo doubles as an install prompt. |
| 2 | Search mastery: guides, tips, tricks | 20% | How to search better with Supericons, for humans and for agents. Sourced from `search-tips-bank.md`. Every tip is verified against the live product before posting. |
| 3 | Build in public | 20% | Honest engineering stories: coverage jumps, zero-result fixes, measured rate limits, incidents and their repairs. Story only, never the underlying usage data (VC-3). |
| 4 | Icon craft and showcases | 20% | New original icons, redraws, themed sets, style comparisons. The visual layer that earns follows. |
| 5 | Vision slices | 10% | The living map, one provocative idea at a time. Icons with a face, soul, hands, pulse, and wallet. |
| 6 | Utility and community | 5% | Polls, replies to MCP and agent builders, quick answers. |

## Pillar 2 in detail: search mastery

Format patterns that work on X:

- **One-tip posts**: single screenshot or code block, one clear takeaway, under 280 chars of copy.
- **Query clinics**: "You searched X and got nothing. Here is the phrasing that works, and why." Before/after result screenshots.
- **Tool spotlights**: one MCP tool per post (`search_icons`, `recommend_icons`, `preview_icons`, `get_icon`, `list_libraries`) with a real prompt and real output.
- **Agent prompt recipes**: exact prompts users can paste into their agent, e.g. "Use Supericons to visually compare the top 3 icons for [concept]."
- **Mini-threads** (3 to 5 posts): a workflow end to end, e.g. picking a coherent sidebar icon set with `recommend_icons`.

Source of truth: [search-tips-bank.md](search-tips-bank.md). Rules:

1. Every tip must be re-verified against the live surface (npm latest or mcp.supericons.dev) on the day it is drafted. No stale claims.
2. Numbers (library counts, icon counts, locale counts) come from a same-day probe, not memory.
3. Never expose ranking weights, query-behavior data, or curation signals (VC-3). Teach the interface, not the internals.

## Voice

Builder to builder. Specific numbers, real terminal and UI output, no marketing gloss. Short sentences. Show, then tell. Credit upstream libraries when their icons appear.

## Cadence

4 to 6 posts per week. Weekly rotation (adjust freely):

- Mon: agent demo
- Tue: search tip
- Wed: build in public
- Thu: icon showcase
- Fri: search tip or utility
- Sat: vision slice (optional)
- Sun: rest, replies only

## Operating rules (from the charter and house style)

- VC-9: owner approves and posts everything outward-facing.
- VC-3: no living-intelligence data in any post, screenshot, or file.
- Evidence first: any factual claim in a post carries a same-day verification note in the queue file.
- No em dashes in any copy.
- Public-safe: no internal model, prompt, or workflow metadata in posted content.

## Files

- Daily driver: `.claude/skills/x-daily/SKILL.md` (run `/x-daily`)
- Routine spec: [x-daily-routine.md](x-daily-routine.md)
- Tips bank: [search-tips-bank.md](search-tips-bank.md)
- Draft queue: `docs/marketing/queue/YYYY-MM-DD.md` (one file per day)
- Post log: [post-log.md](post-log.md) (what went out, when, and how it performed)
