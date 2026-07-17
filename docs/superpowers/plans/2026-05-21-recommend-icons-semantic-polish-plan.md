# Recommend Icons Semantic Polish Plan

**Goal:** Improve `recommend_icons` semantic quality for security/admin slots and alternatives without increasing response size or regressing broad benchmark coverage.

**Architecture:** Keep the existing slot-based scoring pipeline in `mcp/recommend-icons.js`. Add benchmark coverage for admin `Security` and `Monitoring`, strengthen generic security preferences, penalize opposite-state and overly specific variants when not requested, and add direct checks that compact `plan` output remains small.

**Tech Stack:** Node.js ESM, existing MCP recommender implementation, local fixtures in `data/si-registry/benchmarks`, verification scripts under `scripts`.

---

## Scope

This is not a rewrite. It is a semantic polish pass after compact output was fixed.

Primary issues to address:

- `Security` should prefer conventional secure symbols like `shield`, `shield-check`, `lock`, or `lock-keyhole`.
- Plain security should not pick `lock-keyhole-open`, because open/unlocked reads as the opposite of secure.
- Alternatives should avoid opposite or overly specific variants unless requested.
- Billing alternatives should avoid currency-specific receipts unless the prompt asks for a specific currency.
- News-app alternatives should avoid negative/action variants such as `notification_off_line` and `bookmark_edit_line` when plain alternatives exist.

## Files

- Modify `data/si-registry/benchmarks/agent-first-mcp-ux-fixtures.json`
  - Add `Security` and `Monitoring` slots to the Lucide admin fixture.

- Modify `scripts/verify-recommend-icons-response-modes.mjs`
  - Add direct assertions for security top pick and noisy alternatives.

- Modify `mcp/recommend-icons.js`
  - Strengthen generic security preference rules.
  - Penalize opposite-state modifiers such as `open`, `ban`, `unlock`, and currency-specific terms when not requested.
  - Improve alternative filtering so noisy alternatives are skipped when clean alternatives are available.

- Regenerate `data/si-registry/generated/agent-first-mcp-ux-report.json`.

- Regenerate `docs/superpowers/plans/2026-04-21-agent-first-mcp-ux-report.html`.

## Task 1: Add Failing Coverage

- [ ] Add `Security` to the `lucide-admin-sidebar` fixture with expected IDs:

```json
["lucide:shield", "lucide:shield-check", "lucide:lock", "lucide:lock-keyhole"]
```

- [ ] Add `Monitoring` to the same fixture with expected IDs:

```json
["lucide:line-chart", "lucide:chart-line", "lucide:activity", "lucide:gauge"]
```

- [ ] Run:

```powershell
npm run evaluate:agent-first-mcp-ux
```

- [ ] Expected before implementation: the benchmark should fail if `Security` returns `lock-keyhole-open`.

## Task 2: Add Direct Quality Assertions

- [ ] Extend `scripts/verify-recommend-icons-response-modes.mjs` with a Lucide admin response-mode call.
- [ ] Assert `Security` top pick is not `lock-keyhole-open`.
- [ ] Assert `Security` top pick is one of `shield`, `shield-check`, `lock`, or `lock-keyhole`.
- [ ] Assert `Billing` alternatives do not include `receipt-indian-rupee` or `receipt-cent` for a generic billing prompt.
- [ ] Assert MingCute news alternatives avoid `notification_off_line` and `bookmark_edit_line` when clean alternatives exist.
- [ ] Run:

```powershell
node scripts/verify-recommend-icons-response-modes.mjs
```

- [ ] Expected before implementation: the script should fail on at least the security top-pick assertion.

## Task 3: Implement Semantic Scoring

- [ ] In `mcp/recommend-icons.js`, add context-aware penalties for:

```text
open
unlock
unlocked
ban
blocked
cent
rupee
yen
euro
pound
```

- [ ] Strengthen the generic security slot rule:

```text
shield/check shield first, then lock/keyhole, then user-lock.
```

- [ ] Add Lucide security tie-breakers only if the generic rule is not enough.

- [ ] Make alternative filtering skip noisy variants more aggressively for alternatives than for top picks.

## Task 4: Verify

- [ ] Run:

```powershell
node scripts/verify-recommend-icons-response-modes.mjs
npm run evaluate:agent-first-mcp-ux
npm run verify:public-safety
```

- [ ] Expected:

```text
response-mode verification exits 0
agent-first benchmark exits 0
public-safety exits 0
```

## Success Criteria

- Compact `plan` response remains under 15k characters for the news-app scenario.
- Admin `Security` returns a conventional secure icon, not an open/unlocked icon.
- Generic billing alternatives avoid currency-specific variants.
- News-app alternatives avoid obvious opposite/action variants when clean alternatives exist.
- Broad benchmark remains passing across MingCute, Lucide, Tabler, and Phosphor.
