# Recommend Icons Broad Improvement Plan

**Goal:** Improve `recommend_icons` as a broad, cross-library icon-set recommender for app screens, sidebars, toolbars, navigation, dashboards, and content flows.

**Architecture:** Treat the observed MingCute news-app failure as one reference fixture, not the product scope. The implementation should first improve generic slot understanding, candidate scoring, confidence, duplicate handling, and benchmark coverage across libraries, then add narrow library-specific tuning only where generic behavior cannot express a library naming pattern.

**Tech Stack:** Node.js ESM, existing MCP server code, local icon indexes in `mcp/public`, existing recommender code in `mcp/recommend-icons.js`, existing benchmark command `npm run evaluate:agent-first-mcp-ux`.

---

## Scope Statement

This is a broad-based improvement to `recommend_icons`.

The news-app scenario is only a reference case because it exposed real agent friction: the agent tried `recommend_icons`, found poor results, then fell back to manual `search_icons` and `get_icon` calls. The fix should make the tool more reliable for many product contexts, not simply hardcode the news app.

## Verified Starting Point

These facts were checked in the repo on 2026-05-21:

- `recommend_icons` is registered in `mcp/index.js`.
- The shared recommender implementation is `mcp/recommend-icons.js`.
- The remote MCP server also calls `recommendIconsForTask` through `mcp/remote-server.js`.
- Existing benchmark fixtures live in `data/si-registry/benchmarks/agent-first-mcp-ux-fixtures.json`.
- Running `npm run evaluate:agent-first-mcp-ux` reported `14 / 15` hits and failed the `lucide-admin-sidebar` `Users` slot by recommending `lucide:user-2`.
- A local reproduction of the news-app request showed weak MingCute recommendations for `Trending tab`, `Bookmarks tab`, `Search bar`, `Read more`, and `Category chips`.

## Product Principles

1. Improve the generic recommender first.
2. Use library-specific rules only as small tie-breakers.
3. Do not hardcode one app or one library as the main behavior.
4. Prefer obvious, plain icons for plain UI slots.
5. Penalize specialized variants only when the user did not ask for that specialization.
6. Return enough confidence and alternatives that an agent can decide whether to use the result directly.
7. Benchmark across several libraries and app types before calling the tool better.

## Main Risks

- **Overfitting:** If most changes are MingCute-specific, the news-app demo improves but the tool stays weak.
- **Regression:** A broad scoring change can make existing Lucide, admin, or dashboard fixtures worse.
- **Modifier mistakes:** Penalizing `ai`, `add`, `edit`, `off`, or direction words is useful for plain slots, but wrong when those modifiers are explicitly requested.
- **Duplicate suppression mistakes:** Repeated icons are usually bad in multi-slot sets, but some interfaces may intentionally reuse an icon. Duplicate suppression should be a soft penalty.
- **Schema impact:** Adding confidence or diagnostic fields may require an output schema update in `mcp/remote-server.js`.
- **Latency:** More query variants can slow the tool. Variant counts must stay bounded.

## Intended Code Impact

This implementation will affect runtime behavior for `recommend_icons`.

Expected changed files:

- `mcp/recommend-icons.js`
- `data/si-registry/benchmarks/agent-first-mcp-ux-fixtures.json`
- `scripts/evaluate-agent-first-mcp-ux.mjs`
- `data/si-registry/generated/agent-first-mcp-ux-report.json`
- `docs/superpowers/plans/2026-04-21-agent-first-mcp-ux-report.html`

Possible changed file:

- `mcp/remote-server.js`, only if the structured output schema needs to include new fields such as `confidence`.

This should not change `search_icons` or `get_icon` behavior unless a later verification step proves shared search code must change.

---

## Desired Broad Behavior

### Common UI Slots

The recommender should understand these slot families across libraries:

- Navigation: `Home`, `Back`, `Forward`, `Read more`, `Open`, `Close`, `Menu`
- User/account: `Profile`, `Account`, `Users`, `Team`, `Admin`
- Content: `News`, `Article`, `Document`, `Report`, `Message`, `Inbox`
- Discovery: `Search`, `Filter`, `Category`, `Tags`, `Sort`
- Engagement: `Bookmark`, `Favorite`, `Share`, `Like`, `Comment`
- Status: `Notifications`, `Alerts`, `Warning`, `Success`, `Error`
- Analytics: `Trending`, `Metrics`, `Chart`, `Dashboard`, `Monitoring`
- Commerce/admin: `Billing`, `Payment`, `Database`, `Settings`, `Security`
- AI/productivity: `Model`, `Prompt`, `Dataset`, `Evaluation`, `Deployment`

### Cross-Library Expectation

For a slot like `Search bar`, each library should prefer its plain search icon over specialized variants:

- `lucide:search`
- `tabler:search`
- `mingcute:search_line`
- `phosphor:magnifying-glass` or equivalent
- `material:search` or equivalent

The exact IDs vary by library, but the generic intent should be stable.

### Reference News-App Fixture

The news-app prompt should be one acceptance test:

```text
Build a simple news app using Supericons. Use MingCute icons. Show me the MVP UI.
```

It should catch failures in common content-app slots:

- `App logo/title`
- `Notifications`
- `Home tab`
- `Trending tab`
- `Bookmarks tab`
- `Profile tab`
- `Search bar`
- `Share article`
- `Settings`
- `Read more`
- `Category chips`

This fixture should fail if the recommender returns repeated unrelated icons such as `building_4_line`, or highly specialized icons such as AI search icons for a normal search bar.

---

## Task 1: Broaden The Benchmark Fixtures Before Changing Scoring

**Files:**

- Modify: `data/si-registry/benchmarks/agent-first-mcp-ux-fixtures.json`
- Verify with: `npm run evaluate:agent-first-mcp-ux`

### Steps

- [ ] Add a `mingcute-news-app` fixture for the observed reference case.

- [ ] Add a `tabler-project-management-sidebar` fixture with slots:

```json
[
  {
    "slot": "Dashboard",
    "expected_icon_ids": ["tabler:dashboard", "tabler:layout-dashboard"]
  },
  {
    "slot": "Projects",
    "expected_icon_ids": ["tabler:folder", "tabler:folders"]
  },
  {
    "slot": "Tasks",
    "expected_icon_ids": ["tabler:checkbox", "tabler:list-check"]
  },
  {
    "slot": "Team",
    "expected_icon_ids": ["tabler:users", "tabler:user-circle"]
  },
  {
    "slot": "Calendar",
    "expected_icon_ids": ["tabler:calendar", "tabler:calendar-event"]
  },
  {
    "slot": "Settings",
    "expected_icon_ids": ["tabler:settings", "tabler:adjustments"]
  }
]
```

- [ ] Add a `phosphor-content-editor-toolbar` fixture with slots:

```json
[
  {
    "slot": "Bold",
    "expected_icon_ids": ["phosphor:text-b", "phosphor:text-bold"]
  },
  {
    "slot": "Italic",
    "expected_icon_ids": ["phosphor:text-italic"]
  },
  {
    "slot": "Link",
    "expected_icon_ids": ["phosphor:link", "phosphor:link-simple"]
  },
  {
    "slot": "Image",
    "expected_icon_ids": ["phosphor:image", "phosphor:image-square"]
  },
  {
    "slot": "Undo",
    "expected_icon_ids": ["phosphor:arrow-counter-clockwise"]
  },
  {
    "slot": "Redo",
    "expected_icon_ids": ["phosphor:arrow-clockwise"]
  }
]
```

- [ ] Keep the existing `mingcute-bottom-nav`, `lucide-ai-dashboard`, and `lucide-admin-sidebar` fixtures.

- [ ] Run:

```powershell
npm run evaluate:agent-first-mcp-ux
```

- [ ] Expected result before scoring changes: the benchmark may fail. The failures are useful because they define the broad improvement surface.

- [ ] If any proposed expected ID does not exist in `mcp/public/icon-index.json`, replace it with the closest verified ID before changing recommender logic.

---

## Task 2: Add Library-Agnostic Slot Taxonomy

**Files:**

- Modify: `mcp/recommend-icons.js`
- Verify with: `npm run evaluate:agent-first-mcp-ux`

### Steps

- [ ] Add a `SLOT_INTENT_RULES` structure near `COMMON_SLOT_PREFERENCE_RULES`.

- [ ] Each rule should describe a user-facing slot concept, not a specific library:

```js
{
  intent: 'search',
  slotPatterns: [/search/i, /find/i, /lookup/i],
  queryVariants: ['search', 'find', 'magnifier', 'magnifying glass'],
  iconPreferences: [
    { pattern: /^search(?:_|-|$)|(?:_|-)search(?:_|-|$)/i, bonus: 64 },
    { pattern: /magnifier|magnifying/i, bonus: 36 },
  ],
}
```

- [ ] Add rules for these intents:

```text
home
search
settings
profile
users
notifications
bookmark
share
read_more
filter_category
trending
news_article
dashboard
database
billing
reports
security
calendar
tasks
projects
team
bold
italic
link
image
undo
redo
model
prompt
dataset
evaluation
deployment
monitoring
```

- [ ] Update `getMatchingSlotRules(slotLabel, intentTerms)` so it checks the slot label, raw slot text, and joined intent text:

```js
function getMatchingSlotRules(slotLabel, intentTerms = []) {
  const rawSlotText = String(slotLabel || '');
  const slotText = normalizeText(slotLabel);
  const combinedText = normalizeText(`${slotLabel} ${intentTerms.join(' ')}`);

  return COMMON_SLOT_PREFERENCE_RULES.filter((rule) => rule.slotPatterns.some((pattern) => (
    pattern.test(slotText) ||
    pattern.test(rawSlotText) ||
    pattern.test(combinedText)
  )));
}
```

- [ ] Run:

```powershell
npm run evaluate:agent-first-mcp-ux
```

- [ ] Expected result: multiple fixtures should improve, not only `mingcute-news-app`.

---

## Task 3: Add Lightweight Text Normalization

**Files:**

- Modify: `mcp/recommend-icons.js`
- Verify with: `npm run evaluate:agent-first-mcp-ux`

### Steps

- [ ] Add a token normalizer near `tokenizeText`:

```js
function normalizeToken(token) {
  const value = String(token || '').toLowerCase();
  if (value.length > 4 && value.endsWith('ies')) return `${value.slice(0, -3)}y`;
  if (value.length > 3 && value.endsWith('es')) return value.slice(0, -2);
  if (value.length > 3 && value.endsWith('s')) return value.slice(0, -1);
  return value;
}
```

- [ ] Update `tokenizeText` so both raw and normalized tokens are available:

```js
function tokenizeText(value) {
  const normalized = normalizeText(value);
  if (!normalized) return [];
  const tokens = normalized.split(' ');
  return dedupe([...tokens, ...tokens.map(normalizeToken)]);
}
```

- [ ] Confirm plural labels improve:

```text
Users -> user/users icons
Bookmarks -> bookmark/bookmarks icons
Categories -> category/filter/tag icons
Projects -> project/folder icons
Tasks -> task/checklist icons
```

- [ ] Run:

```powershell
npm run evaluate:agent-first-mcp-ux
```

---

## Task 4: Improve Generic Candidate Scoring

**Files:**

- Modify: `mcp/recommend-icons.js`
- Verify with: `npm run evaluate:agent-first-mcp-ux`

### Steps

- [ ] Make slot-specific matches stronger than broad task matches.

- [ ] In `buildSlotIntentTerms`, keep useful task words, but weight slot-label terms higher during scoring.

- [ ] Add separate term sets:

```js
const slotTerms = tokenizeText(slotLabel);
const taskTerms = tokenizeText(task);
```

- [ ] Update lexical scoring so exact slot-label matches outrank task-only matches:

```js
function scoreLexicalFit(icon, intentTerms, slotLabel, taskLabel = '') {
  const tokens = new Set([
    ...tokenizeText(icon.id),
    ...tokenizeText(icon.name),
    ...tokenizeText(`${icon.lib}:${icon.id}`),
  ]);
  const normalizedId = normalizeText(icon.id);
  const normalizedName = normalizeText(icon.name);
  const slotTerms = tokenizeText(slotLabel);
  const taskTerms = tokenizeText(taskLabel);

  let score = 0;

  for (const term of slotTerms) {
    if (tokens.has(term)) score += 22;
    else if (normalizedId.includes(term) || normalizedName.includes(term)) score += 14;
  }

  for (const term of intentTerms) {
    if (tokens.has(term)) score += 12;
    else if (normalizedId.includes(term) || normalizedName.includes(term)) score += 7;
  }

  for (const term of taskTerms) {
    if (tokens.has(term)) score += 3;
  }

  return score;
}
```

- [ ] Update the call site:

```js
const lexicalScore = scoreLexicalFit(icon, intentTerms, slotLabel, task);
```

- [ ] Run:

```powershell
npm run evaluate:agent-first-mcp-ux
```

- [ ] Expected result: generic task words such as `app`, `dashboard`, `MVP`, and `UI` should no longer swamp the slot meaning.

---

## Task 5: Add Context-Aware Modifier Penalties

**Files:**

- Modify: `mcp/recommend-icons.js`
- Verify with: `npm run evaluate:agent-first-mcp-ux`

### Steps

- [ ] Extend `VARIANT_PENALTIES` with modifiers that should not win plain slots by default:

```js
const VARIANT_PENALTIES = Object.freeze([
  { token: 'circle', pattern: /circle/i, penalty: 5 },
  { token: 'square', pattern: /square/i, penalty: 4 },
  { token: 'badge', pattern: /badge/i, penalty: 4 },
  { token: 'off', pattern: /(?:_|-)?off(?:_|-|$)/i, penalty: 8 },
  { token: 'slash', pattern: /slash/i, penalty: 8 },
  { token: 'warning', pattern: /warning/i, penalty: 5 },
  { token: 'ai', pattern: /(?:_|-)ai(?:_|-|$)/i, penalty: 18 },
  { token: 'add', pattern: /(?:_|-)add(?:_|-|$)/i, penalty: 12 },
  { token: 'edit', pattern: /(?:_|-)edit(?:_|-|$)/i, penalty: 12 },
  { token: 'remove', pattern: /(?:_|-)remove(?:_|-|$)/i, penalty: 12 },
  { token: 'down', pattern: /(?:_|-)down(?:_|-|$)/i, penalty: 8 },
  { token: 'left', pattern: /(?:_|-)left(?:_|-|$)/i, penalty: 8 },
]);
```

- [ ] Update `getVariantPenalty` so requested modifiers are not penalized:

```js
function getVariantPenalty(icon, intentTerms = []) {
  const normalizedId = normalizeText(icon.id);
  const requestedTerms = new Set(intentTerms.map(normalizeToken));
  let penalty = 0;

  for (const rule of VARIANT_PENALTIES) {
    if (!rule.pattern.test(normalizedId)) continue;
    if (requestedTerms.has(rule.token)) continue;
    penalty += rule.penalty;
  }

  return penalty;
}
```

- [ ] Update the call site:

```js
const variantPenalty = getVariantPenalty(icon, intentTerms);
```

- [ ] Run:

```powershell
npm run evaluate:agent-first-mcp-ux
```

---

## Task 6: Add Cross-Slot Duplicate Suppression

**Files:**

- Modify: `mcp/recommend-icons.js`
- Verify with: `npm run evaluate:agent-first-mcp-ux`

### Steps

- [ ] Score all slots first, then pick final recommendations while tracking already-selected IDs.

- [ ] Use a soft duplicate penalty:

```js
const DUPLICATE_TOP_PICK_PENALTY = 80;
```

- [ ] During final selection, subtract the penalty from candidates already chosen for another slot.

- [ ] Do not remove duplicate candidates from alternatives. Alternatives can still show repeated icons when useful.

- [ ] Run:

```powershell
npm run evaluate:agent-first-mcp-ux
```

- [ ] Expected result: no fixture should have unrelated repeated top picks across different slots.

---

## Task 7: Add Library-Specific Tie-Breakers Carefully

**Files:**

- Modify: `mcp/recommend-icons.js`
- Verify with: `npm run evaluate:agent-first-mcp-ux`

### Steps

- [ ] Keep library-specific rules in `SLOT_PREFERENCE_RULES`.

- [ ] Add or adjust rules only after the generic rules and modifier penalties have been tested.

- [ ] Add MingCute tie-breakers for known plain UI choices:

```js
mingcute: [
  {
    slotPatterns: [/search/i],
    iconPreferences: [
      { pattern: /^search_line$/i, bonus: 34 },
      { pattern: /^search_[23]_line$/i, bonus: 18 },
      { pattern: /^search_.*_ai_line$/i, bonus: -24 },
    ],
  },
  {
    slotPatterns: [/bookmark/i, /saved?/i],
    iconPreferences: [
      { pattern: /^bookmark_line$/i, bonus: 34 },
      { pattern: /^bookmarks_line$/i, bonus: 28 },
      { pattern: /^bookmark_(add|edit|remove)_line$/i, bonus: -20 },
    ],
  },
  {
    slotPatterns: [/trending/i, /popular/i, /top stories/i],
    iconPreferences: [
      { pattern: /^trending_up_line$/i, bonus: 34 },
      { pattern: /^trending_down_line$/i, bonus: -30 },
    ],
  },
  {
    slotPatterns: [/read more/i, /continue/i, /open article/i],
    iconPreferences: [
      { pattern: /^arrow_right_line$/i, bonus: 36 },
      { pattern: /^arrow_to_right_line$/i, bonus: 24 },
    ],
  },
  {
    slotPatterns: [/categor(?:y|ies)/i, /chips?/i, /filter/i, /topics?/i],
    iconPreferences: [
      { pattern: /^filter_line$/i, bonus: 34 },
      { pattern: /^filter_[23]_line$/i, bonus: 22 },
      { pattern: /^tag_line$/i, bonus: 16 },
    ],
  },
  {
    slotPatterns: [/news/i, /article/i, /headline/i, /logo/i, /title/i],
    iconPreferences: [
      { pattern: /^news_line$/i, bonus: 34 },
      { pattern: /^news_2_line$/i, bonus: 26 },
      { pattern: /^appstore_line$/i, bonus: -22 },
    ],
  },
]
```

- [ ] Add Lucide tie-breakers only if the broad benchmark still misses obvious choices after generic scoring:

```js
lucide: [
  {
    slotPatterns: [/users/i, /team/i],
    iconPreferences: [
      { pattern: /^users$/i, bonus: 28 },
      { pattern: /^users-2$/i, bonus: 20 },
      { pattern: /^user-2$/i, bonus: -12 },
    ],
  },
]
```

- [ ] Do not add library-specific rules for Tabler or Phosphor unless benchmark failures prove they are needed.

- [ ] Run:

```powershell
npm run evaluate:agent-first-mcp-ux
```

---

## Task 8: Add Confidence And Better Agent Guidance

**Files:**

- Modify: `mcp/recommend-icons.js`
- Optional modify: `mcp/remote-server.js`
- Verify with: `npm run evaluate:agent-first-mcp-ux`

### Steps

- [ ] Add confidence metadata to each slot result:

```js
function getConfidence(topScore, nextScore = 0) {
  if (topScore >= 90 && topScore - nextScore >= 20) return { level: 'high', score: topScore };
  if (topScore >= 45) return { level: 'medium', score: topScore };
  return { level: 'low', score: topScore };
}
```

- [ ] Add a low-confidence hint:

```js
function buildLowConfidenceHint(slotLabel, queriesUsed) {
  return `Low confidence for ${slotLabel}. Try search_icons with: ${queriesUsed.slice(0, 3).join(', ')}.`;
}
```

- [ ] Return `confidence` and `guidance`:

```js
{
  slot: slotLabel,
  queries_used: queryVariants,
  confidence,
  guidance: confidence.level === 'low' ? buildLowConfidenceHint(slotLabel, queryVariants) : null,
  recommended: preparedCandidates[0] || null,
  alternatives: preparedCandidates.slice(1),
}
```

- [ ] If `mcp/remote-server.js` has strict schemas that omit `confidence` or `guidance`, update the schema.

- [ ] Run:

```powershell
npm run evaluate:agent-first-mcp-ux
```

---

## Task 9: Improve Benchmark Reporting

**Files:**

- Modify: `scripts/evaluate-agent-first-mcp-ux.mjs`
- Verify with: `npm run evaluate:agent-first-mcp-ux`

### Steps

- [ ] Include confidence in JSON and HTML report rows.

- [ ] Detect duplicate top-pick IDs per fixture.

- [ ] Fail the benchmark if any fixture has duplicate top picks for unrelated slots.

- [ ] Include a summary by library:

```json
{
  "library": "mingcute",
  "slot_count": 15,
  "hit_count": 15
}
```

- [ ] Run:

```powershell
npm run evaluate:agent-first-mcp-ux
```

- [ ] Expected result: the report makes it clear whether improvements are broad or isolated to one library.

---

## Task 10: Verify Direct Scenarios Across Libraries

**Files:**

- No source changes unless verification exposes failures.

### Steps

- [ ] Run the benchmark:

```powershell
npm run evaluate:agent-first-mcp-ux
```

- [ ] Run one direct local script for the MingCute news-app scenario.

- [ ] Run one direct local script for a Lucide admin sidebar:

```json
["Users", "Billing", "Database", "Settings", "Reports"]
```

- [ ] Run one direct local script for a Tabler project sidebar:

```json
["Dashboard", "Projects", "Tasks", "Team", "Calendar", "Settings"]
```

- [ ] Run one direct local script for a Phosphor editor toolbar:

```json
["Bold", "Italic", "Link", "Image", "Undo", "Redo"]
```

- [ ] Confirm each direct script returns obvious top picks, alternatives, and confidence.

---

## Task 11: Final Verification

**Files:**

- No source changes unless verification exposes failures.

### Steps

- [ ] Run:

```powershell
npm run evaluate:agent-first-mcp-ux
```

- [ ] Expected: all benchmark slots pass.

- [ ] Run:

```powershell
npm run verify:public-safety
```

- [ ] Expected: command exits with code `0`.

- [ ] Check status:

```powershell
git status --short
```

- [ ] Confirm only expected feature files changed.

---

## Success Criteria

- Improvements apply across at least MingCute, Lucide, Tabler, and Phosphor fixtures.
- The MingCute news-app scenario passes as a reference case, not as a one-off.
- The existing Lucide admin and AI dashboard scenarios keep passing.
- Plain slots prefer plain icons over specialized variants.
- Multi-slot recommendations avoid repeated unrelated top picks.
- Low-confidence results are labeled clearly with useful fallback search guidance.
- `npm run evaluate:agent-first-mcp-ux` exits with code `0`.
- `npm run verify:public-safety` exits with code `0`.
