# Recommend Icons Broad Quality Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve `recommend_icons` broadly so the new broad-quality evaluator passes while preserving compact plan responses, the existing 40-slot benchmark, and public-safety checks.

**Architecture:** Keep the fix inside the recommender scoring layer rather than hard-coding one test scenario. Add reusable slot intent rules, make noisy variant handling respect explicit user intent, and prevent rejected alternatives from being re-added during fallback fill.

**Tech Stack:** Node.js ES modules, existing `mcp/recommend-icons.js` recommender, existing local verification scripts.

---

## File Map

- Modify: `mcp/recommend-icons.js`
  - Add broad intent rules for security state, notifications state, AI search, automation, ecommerce, permissions, editor clean alternatives, and right navigation.
  - Make variant penalties and negative preference rules conditional on explicit slot intent.
  - Keep noisy alternatives out unless explicitly requested.
- Keep: `scripts/evaluate-recommend-icons-broad-quality.mjs`
  - Use as the broad red/green test.
- Verify: `scripts/verify-recommend-icons-response-modes.mjs`
  - Ensure response mode payloads and compact plan output still pass.
- Verify: `scripts/evaluate-agent-first-mcp-ux.mjs`
  - Ensure existing 40/40 benchmark remains passing.
- Verify: `scripts/verify-public-safety.mjs`
  - Ensure generated public package scan remains clean.

## Task 1: Establish Red Baseline

- [ ] **Step 1: Run broad evaluator**

Run:

```powershell
node scripts\evaluate-recommend-icons-broad-quality.mjs
```

Expected before implementation: exit `1`, with failures in security state, navigation alternatives, MingCute AI search/automation, Phosphor editor alternatives, Tabler permissions, and ecommerce.

## Task 2: Add Broad Intent Rules

- [ ] **Step 1: Update `mcp/recommend-icons.js` slot preference rules**

Add common rules for these intents:

- Unlock/open account: prefer `lock-open`, `lock-keyhole-open`, `unlock`.
- Blocked user: prefer `user-x`, `user-minus`, `ban`.
- Disabled notifications: prefer `bell-off`, `notification_off_line`.
- AI search and smart search: prefer search icons containing `ai` when AI is explicit.
- Automation: prefer robot, spark, workflow, refresh, settings-style icons.
- Ecommerce: prefer store, shopping cart, receipt, package, tag, users/customer icons by slot.
- Permissions: prefer key, lock, shield, user-check, settings/adjustments.
- Editor clean alternatives: penalize `break`, `broken`, and `slash` when not requested.
- Read-more/next: prefer plain right arrow and exclude up/down/left/shaped variants unless requested.

- [ ] **Step 2: Keep rules broad**

Do not special-case the test fixture names. Rules must be reusable for any similar app prompt.

## Task 3: Make Negative Rules Intent-Aware

- [ ] **Step 1: Add helper for explicit requested tokens**

Use normalized slot/task intent terms to decide whether a negative variant like `off`, `open`, `unlock`, `slash`, `broken`, `circle`, or `square` was explicitly requested.

- [ ] **Step 2: Apply helper in preference scoring**

When a preference has a negative bonus and its pattern matches an explicitly requested variant, skip the negative bonus.

## Task 4: Strengthen Alternative Filtering

- [ ] **Step 1: Stop fallback from re-adding noisy alternatives**

When clean alternatives are insufficient, add only non-noisy candidates unless there is no recommendation at all. This prevents normal `Link`, `Image`, `Comments`, `Read more`, and `Notifications` slots from reintroducing break/broken/slash/off variants.

- [ ] **Step 2: Track the actual prepared recommendation**

Add duplicate tracking and confidence from the actual selected candidate that produced the payload, not just `sorted[0]`, so skipped candidates do not confuse later slots.

## Task 5: Verify

- [ ] **Step 1: Run broad evaluator**

Run:

```powershell
node scripts\evaluate-recommend-icons-broad-quality.mjs
```

Expected after implementation: exit `0`, `passed_assertions` equals `assertion_count`.

- [ ] **Step 2: Run response mode check**

Run:

```powershell
node scripts\verify-recommend-icons-response-modes.mjs
```

Expected: exit `0`, plan output remains below the compact target in the script.

- [ ] **Step 3: Run existing benchmark**

Run:

```powershell
npm run evaluate:agent-first-mcp-ux
```

Expected: exit `0`, `total_hits` remains `40`.

- [ ] **Step 4: Run public safety check**

Run:

```powershell
npm run verify:public-safety
```

Expected: exit `0`.

## Self-Review

- Spec coverage: covers all failure groups from the broad evaluator and all regression checks requested by the user.
- Placeholder scan: no placeholders or deferred steps.
- Type consistency: all changes stay in the existing `recommendIconsForTask` API and existing verification scripts.
