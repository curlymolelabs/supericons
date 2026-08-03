# X Daily Marketing Routine

Target: 15 to 20 minutes of owner time per day. Agents do the mechanical work; the owner supplies taste and the final yes (VC-9).

## Daily flow

Run `/x-daily` in the supericons repo. It orchestrates the steps below and writes everything to `docs/marketing/queue/YYYY-MM-DD.md`.

1. **Mine** (agent: x-material-miner). Sweep recent commits, `mcp/CHANGELOG.md`, and release docs for post-worthy material. Check the tips bank for the next unposted verified tip.
2. **Scout** (agent: x-engagement-scout). Find 2 or 3 live X conversations or trends worth a reply (MCP, agent tooling, icon design). Output links plus a suggested angle each.
3. **Draft** (agents: x-post-drafter, x-search-tips-writer). Produce the day's 1 or 2 posts per the weekly rotation, including exact copy, alt text, and a description of the visual to capture. Search-tip posts must include the verification probe output.
4. **Review** (agent: x-content-reviewer). Gate every draft against the charter (VC-3, VC-9), evidence rules, and house style. Drafts failing review go back with reasons, not to the queue.
5. **Owner pass** (you, ~15 min). Open the queue file. Approve, edit, or kill each draft. Capture the visual (screenshot, GIF, screen recording). Post from @supericonsdev. Reply to the scouted conversations that feel right.
6. **Log**. Append what was posted to `docs/marketing/post-log.md` (date, pillar, link, and later: impressions, likes, follows). The next `/x-daily` run reads this to avoid repeats and learn what works.

## Weekly rotation (default, adjust freely)

| Day | Pillar | Agent lead |
|-----|--------|------------|
| Mon | Agent demo | x-post-drafter |
| Tue | Search tip | x-search-tips-writer |
| Wed | Build in public | x-material-miner + x-post-drafter |
| Thu | Icon showcase | x-post-drafter |
| Fri | Search tip or utility | x-search-tips-writer |
| Sat | Vision slice (optional) | x-post-drafter |
| Sun | Rest; replies only | x-engagement-scout |

## Weekly review (Fridays, ~20 min)

- Read post-log.md numbers for the week. Note the best and worst performer and why.
- Miner agent refills the tips bank with new `draft` rows from the week's shipping.
- Adjust next week's rotation toward what performed.

## Hard rules

- Owner posts everything. Agents never publish (VC-9).
- No living-intelligence data in any post or screenshot (VC-3).
- Every factual claim verified same day, probe output recorded in the queue file.
- No em dashes in copy. No internal model or workflow metadata in anything posted.
