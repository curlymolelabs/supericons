# P0.02 Phase 4 First Slice Audit

**Date:** April 17, 2026
**Auditor:** Antigravity
**Scope:** Phase 4 admin search intelligence first slice -- backend aggregation, frontend rendering, live verification, and terminology audit

---

## 1. What Was Built

Three components were added:

1. **Backend:** New `/intelligence/search` route in `supabase/functions/admin-api/index.ts` (lines 527-699) -- aggregates search queries from `icon_evidence` without any schema migration
2. **Frontend JS:** `renderSearchIntelligence()` in `public/admin-app.js` (lines 344-397) -- renders four stat cards, three ranked lists, and a notes panel
3. **Frontend HTML:** A second stats grid plus three `stats-recent` sections added to `panel-intelligence` in `admin.html` (lines 1187-1253)

---

## 2. What is Correct and Working

### No-migration approach is the right call

The backend query reads directly from `icon_evidence` with a date filter and a `NOT NULL` guard on `search_query`. Phase 4 is operational immediately using data that already exists. No schema PR, no migration risk, no deployment blocking.

### Aggregation logic is solid

The backend (lines 570-636) does a single in-memory pass over up to 3,000 rows, building three independent maps in one loop:

- `topQueryMap` -- copy/favorite events by query
- `topMcpMap` -- MCP batch convergence by query
- `topReplaceMap` -- replacement events by query

Each map tracks `unique_icons` as a `Set` (deduplicating icon variants per query). Sort logic is correct: `total_signals` DESC, then `favorite_count` DESC as tiebreaker, then alphabetical. Top 8 per list is a sensible cap for the current traffic level.

### `zero_result_tracking_available: false` is correctly documented

Line 692 of `index.ts` includes `zero_result_tracking_available: false` in the summary payload. The admin UI surfaces this as:

> Zero-result tracking -- Requires explicit search-attempt logging

This is honest engineering. The system knows what it cannot see and says so explicitly.

### Live verification confirmed by screenshots

The user's test session confirmed the full loop:

| Query | Expected icon | Observed in admin |
|---|---|---|
| `tool call` | `tabler:api` | 2 signals (1 copy, 1 save) |
| `latency` | `lucide:timer` | 1 signal (1 copy) |
| `llm` | `lucide:brain` | 1 signal (1 copy) |

The loop from "user searches -> curated alias returns right icon -> user copies -> evidence logged -> admin shows it" is closed and operational.

### Replacement tracking design is correct

`topReplaceMap` only counts `signal_type = 'replace'` events and tracks `replaced_with` as a set of alternate icon IDs. If a user copies Icon A after searching "tool call", then later copies Icon B instead, that query gets a replacement signal. This is the correct signal for identifying unhappy searches. No false positives from unrelated behavior.

---

## 3. Issues Found

### Issue 1: "Top Icons" polluted by legacy data (expected, not a code bug)

Observed in screenshot: `mingcute:chat_2_line` at 19 copies, `simpleicons:discord` at 18 copies. These are pre-Phase 4 development copies with no `search_query` field attached. They appear in "Top Icons" (copy-count ranking) but will never appear in "Top Successful Queries" because there is no search context.

**This is expected behavior.** The fix is not to clean the data. It is to add a date filter selector to the "Top Icons" panel UI. The `/intelligence/search` endpoint already supports `?days=N` but "Top Icons" does not expose this in the UI. Low priority now, will matter as real traffic grows.

### Issue 2: "Top Job Categories" label is wrong -- confirmed

`admin.html` line 1164: `Top Job Categories`. This is the internal `job_category` field exposed with the wrong vocabulary. The `job_category` name came from a product-thinking / jobs-to-be-done framing and was never intended to be user-facing.

**Fix:** Rename to `Top Use Cases` in admin.

### Issue 3: Category values displayed as raw slugs

`admin-app.js` line 430 uses `entry.job_category` as the displayed label directly. The stored value is an internal slug like `ai-agent-workflows`, not a human label. The admin panel currently shows `ai-agent-workflows` as a raw string.

**Fix:** Add a label lookup map in `admin-app.js`:

```js
const JOB_CATEGORY_LABELS = {
  'ai-agent-workflows': 'AI and Agents',
  'navigation-wayfinding': 'Navigation and Wayfinding',
  'status-feedback': 'Status and Feedback',
};
```

Apply this map when rendering both the "Top Use Cases" panel and the "Category" column in the evidence table.

### Issue 4: "Category" column in evidence table -- two problems

`admin.html` line 1264: column header is `Category`, rendered from `entry.job_category`.

Two fixes needed:
1. Rename column header from `Category` to `Use Case`
2. Apply the label map from Issue 3 to display human-readable values

### Issue 5: Category shows `-` for non-seeded icons -- undocumented

Visible in screenshots: `tool call -> tabler:api` shows `Category: -`. The `tabler:api` icon is in the curated alias map (Phase 3) but is NOT in the 150-icon taxonomy seed. So `getTelemetryJobCategory()` returns `null` when the user is in "All Icons" view with no use-case chip active.

This is correct behavior but appears as missing data to anyone reading the admin panel.

**Fix:** Add one sentence to the "Search Intelligence Notes" panel:

> Category is blank when the copied icon is outside the seeded taxonomy and no Use Case filter was active during the search.

### Issue 6: `normalizeSearchQuery` not verified in this audit

Line 571 of `index.ts` calls `normalizeSearchQuery(row.search_query)`. This function is defined earlier in the file but was not in the slice reviewed. The SQL query already guards `NOT NULL`, and the code guards `if (!normalizedQuery) continue`, so the risk is low. Confirm it handles empty strings and whitespace-only values safely.

### Issue 7: 3,000-row limit could truncate at scale

Line 529: `limit = Math.min(5000, Math.max(250, ...3000))`. At 30 days with current traffic this is fine. At meaningful scale (thousands of daily active users), 3,000 rows over 30 days could drop older high-signal queries from the aggregation. Not a bug now. Flag before any significant traffic milestone and raise to a configurable limit or a SQL-side aggregation.

---

## 4. Terminology Audit: "Job Categories" vs "Use Case" vs "Purpose"

| Term | Verdict | Reason |
|---|---|---|
| `Job Categories` | REMOVE | Internal product-thinking jargon, never user-facing |
| `job_category` (DB/code) | KEEP | Internal field name -- no user ever sees it |
| `Use Case` | ACCEPTABLE | Already used on site chip row. Consistent. |
| `Purpose` | RECOMMENDED | Shorter, more natural, fits "what is this icon for?" |
| `By Function` | ACCEPTABLE | Clear but slightly engineering-y |
| `Tasks` | AVOID | Implies user actions, not icon meaning |

### Recommended final vocabulary

| Surface | Label |
|---|---|
| Site chip row | `Use Case` (keep for now -- working, users understand it) |
| Admin intelligence panel | `Top Use Cases` |
| Evidence table column | `Use Case` |
| DB field | `job_category` (never change, never expose) |
| Future copy refresh | Consider `Purpose` as a premium upgrade |

---

## 5. Answers to the User's Three Questions

### Q1: What do "Top Icons" and "Top Job Categories" mean?

**Top Icons** = icons most copied in the last 30 days, ranked by `copy_count_30d`. The "100%" shown is `retention_rate` -- the percentage of copies that were NOT later replaced. 100% retention on all current icons means no copied icon was subsequently replaced in the same session. This metric becomes meaningful once replace-signal data accumulates.

**Top Use Cases** (currently mislabeled "Top Job Categories") = which taxonomy buckets appear most frequently in evidence events in the last 30 days. `ai-agent-workflows = 3` means 3 evidence events (copy or favorite) had that category attached -- either because the use-case chip was active, or because the icon itself is tagged to that category in the taxonomy seed. It does NOT count how many icons exist in that category.

### Q2: Better name than "Job Categories"

Rename to `Top Use Cases` in admin now. Consider `Purpose` in a future site copy pass. Keep `job_category` in the database and code permanently.

### Q3: What does the search-and-copy test confirm?

Three things are now confirmed live:

1. The alias precision layer (Phase 3) correctly routes curated concept queries to the right icons
2. The evidence pipeline correctly captures the search query alongside the copy/favorite signal
3. The admin search intelligence view correctly aggregates and surfaces query-linked signals

The `Category: -` values for `tool call` and `latency` are expected. Those icons (`tabler:api`, `lucide:timer`) are in the alias map but not in the taxonomy seed. No fix needed -- the design intent is that aliases and taxonomy are two overlapping but separate lists.

---

## 6. Phase 4 Verification Scorecard

| Check | Status | Notes |
|---|---|---|
| No-migration approach works | PASS | Live data confirmed in screenshots |
| Search query aggregation correct | PASS | Three maps, correct signal-type discrimination |
| Zero-result limitation documented in API | PASS | `zero_result_tracking_available: false` explicit |
| Zero-result documented in UI | PASS | Notes panel explains limitation |
| Live evidence loop closed | PASS | 3 queries, 4 signals, correct icon routing |
| Top Icons ranking accurate | PASS | Polluted by legacy data, not a code bug |
| "Top Job Categories" naming | FAIL | Must rename to "Top Use Cases" |
| Category values shown as human labels | FAIL | Raw slugs displayed, needs label map |
| Evidence table column name | FAIL | "Category" must become "Use Case" |
| Blank category explained in UI | MISSING | Needs one note added to intelligence panel |
| `normalizeSearchQuery` verified | UNVERIFIED | Could not confirm from slice reviewed |

---

## 7. Next Actions (Priority Order)

### Immediate fixes (30 minutes, admin UI copy and label pass)

1. Rename `Top Job Categories` -> `Top Use Cases` in `admin.html` line 1164
2. Rename `Category` column -> `Use Case` in evidence table, `admin.html` line 1264
3. Add `JOB_CATEGORY_LABELS` map in `admin-app.js` to convert slugs to human labels in both locations
4. Add one-line note to Search Intelligence Notes panel explaining blank category values

### Pre-Phase 5 (the single highest-value next build)

5. **Add explicit search-attempt logging.** Every debounced search that results in 0 displayed icons should log a `signal_type: 'search_attempt'` event with the query and result count. This is the only way to see true zero-result queries in the admin panel. Once this lands, the `zero_result_tracking_available` flag can be set to `true` and the admin can show the actual zero-result query list -- which is the most actionable signal for synonym and alias expansion.

### Ongoing evidence accumulation

6. Generate real search, copy, and favorite events from actual usage. The current 414 evidence rows are mostly legacy. 30 days of real traffic will make the Top Successful Queries and Replacement-Heavy Queries panels genuinely informative.

7. Use those panels to drive the next synonym and alias additions (instead of guessing). This is the Phase 4 intended operating mode.

---

## 8. Strategic Assessment

The builder's framing is correct: **the moat is not the synonym file, it is the evidence loop.**

The current state:
- Taxonomy is live
- Browse IA is corrected
- Synonym recall is improved (Phase 2)
- Alias precision works on site and MCP (Phase 3)
- Evidence loop is closed and admin-visible (Phase 4 slice 1)

What turns this into a compounding advantage:
- Zero-result logging (search-attempt events)
- Weekly evidence-driven synonym/alias review
- Agent-proposed semantic candidates with human approval
- The gap between "what users search" and "what the engine knows" narrows over time with real data

Code can be copied. A living judgment system with months of accumulated evidence cannot be replicated overnight.

---

*Audit completed April 17, 2026. All findings based on direct source code inspection of `admin.html`, `public/admin-app.js`, and `supabase/functions/admin-api/index.ts`, plus live screenshot verification of the deployed admin panel.*
