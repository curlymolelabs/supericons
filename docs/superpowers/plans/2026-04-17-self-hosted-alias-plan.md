# Self-Hosted Search Alias Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand `self-hosted` search so it returns a small, credible set of infrastructure icons instead of only `heroicons:server-stack`.

**Architecture:** Keep this as an alias-first fix. `self-hosted` already has one curated alias hit in `lib/icon-semantic-aliases.js`, so the narrow result set is a curation coverage problem, not a schema or admin problem. Add a focused search fixture that proves the result set, then broaden the shared curated alias map so both the web app and MCP search pick up the same behavior without touching ranking logic or DB code.

**Tech Stack:** Vanilla JS, Vite, shared browser + MCP search logic, Node verification script

---

## File Map

- Modify: `D:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/lib/icon-semantic-aliases.js`
  Purpose: shared curated phrase-to-icon map used by both browser search and MCP search.
- Create: `D:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/scripts/verify-search-query-fixtures.mjs`
  Purpose: deterministic search fixture check for `self-hosted`, `on-prem`, and `self managed`.
- Modify: `D:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/package.json`
  Purpose: add an easy verification command.

**Do not change in the first pass:**

- `D:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/main.js`
- `D:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/mcp/search.js`
- `D:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/public/synonyms.json`
- `D:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/mcp/public/synonyms.json`

Those files are only fallback work if alias-only coverage still feels weak after manual QA.

---

### Task 1: Add A Failing Search Fixture For `self-hosted`

**Files:**
- Create: `D:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/scripts/verify-search-query-fixtures.mjs`
- Modify: `D:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/package.json`

- [ ] **Step 1: Write the failing fixture script**

```js
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { searchIcons } from '../mcp/search.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function readJson(relativePath) {
  const absolutePath = path.join(__dirname, '..', relativePath);
  return JSON.parse(await fs.readFile(absolutePath, 'utf8'));
}

const { icons } = await readJson('public/icon-index.json');
const synonyms = await readJson('public/synonyms.json');

const fixtures = [
  {
    query: 'self-hosted',
    topN: 8,
    requiredFirst: 'heroicons:server-stack',
    requiredIncluded: [
      'lucide:server',
      'tabler:server',
      'material:home_storage',
    ],
  },
  {
    query: 'on-prem',
    topN: 8,
    requiredFirst: 'heroicons:server-stack',
    requiredIncluded: [
      'lucide:server',
      'tabler:server',
    ],
  },
  {
    query: 'self managed',
    topN: 8,
    requiredFirst: 'heroicons:server-stack',
    requiredIncluded: [
      'lucide:server',
    ],
  },
];

let failed = false;

for (const fixture of fixtures) {
  const results = searchIcons(fixture.query, icons, synonyms, { limit: fixture.topN });
  const ids = results.map((icon) => `${icon.lib}:${icon.id}`);

  if (ids[0] !== fixture.requiredFirst) {
    failed = true;
    console.error(`[FAIL] ${fixture.query}: expected first result ${fixture.requiredFirst}, got ${ids[0] || '(none)'}`);
  }

  const missing = fixture.requiredIncluded.filter((id) => !ids.includes(id));
  if (missing.length > 0) {
    failed = true;
    console.error(`[FAIL] ${fixture.query}: missing ${missing.join(', ')} in top ${fixture.topN}`);
    console.error(`       got: ${ids.join(', ')}`);
  } else {
    console.log(`[PASS] ${fixture.query}: ${ids.join(', ')}`);
  }
}

if (failed) process.exit(1);
```

- [ ] **Step 2: Add the npm shortcut**

```json
{
  "scripts": {
    "verify:search-query-fixtures": "node scripts/verify-search-query-fixtures.mjs"
  }
}
```

- [ ] **Step 3: Run the fixture to verify it fails before alias changes**

Run:

```bash
npm run verify:search-query-fixtures
```

Expected:

```text
FAIL for self-hosted because only heroicons:server-stack appears and lucide:server / tabler:server / material:home_storage are missing.
```

- [ ] **Step 4: Commit the test harness**

```bash
git add package.json scripts/verify-search-query-fixtures.mjs
git commit -m "test: add search fixtures for self-hosted alias coverage"
```

---

### Task 2: Broaden Shared Curated Alias Coverage

**Files:**
- Modify: `D:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/lib/icon-semantic-aliases.js`
- Test: `D:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/scripts/verify-search-query-fixtures.mjs`

- [ ] **Step 1: Expand the primary `server-stack` alias cluster without removing the current exact hit**

Replace the existing `heroicons:server-stack` entry with:

```js
'heroicons:server-stack': [
  'self hosted',
  'self-hosted',
  'self hosting',
  'self-hosting',
  'self host',
  'on prem',
  'on-prem',
  'on premise',
  'on-premise',
  'private deployment',
  'local deployment',
  'private infra',
  'private infrastructure',
  'model server',
  'model-server',
  'inference server',
  'self managed',
  'self managed infrastructure',
],
```

- [ ] **Step 2: Add secondary icons that should surface for the same concept**

Add these new entries near the other infrastructure aliases:

```js
'lucide:server': [
  'self hosted server',
  'self-hosted server',
  'private server',
  'local server',
  'self managed server',
  'on prem server',
  'on-prem server',
],
'tabler:server': [
  'self hosted service',
  'self-hosted service',
  'private service',
  'self managed service',
  'on prem service',
  'on-prem service',
],
'material:home_storage': [
  'home lab',
  'homelab',
  'nas',
  'self hosted storage',
  'self-hosted storage',
  'local storage server',
  'private storage',
],
```

Why this shape:

- `heroicons:server-stack` keeps the strongest exact conceptual match and should remain the first result.
- `lucide:server` and `tabler:server` add generic infrastructure choices without needing ranking changes.
- `material:home_storage` gives a credible self-managed hardware / NAS option instead of only server glyphs.

- [ ] **Step 3: Re-run the fixture and verify it now passes**

Run:

```bash
npm run verify:search-query-fixtures
```

Expected:

```text
[PASS] self-hosted: heroicons:server-stack ... lucide:server ... tabler:server ... material:home_storage ...
[PASS] on-prem: heroicons:server-stack ... lucide:server ... tabler:server ...
[PASS] self managed: heroicons:server-stack ... lucide:server ...
```

- [ ] **Step 4: Run lightweight syntax checks**

Run:

```bash
node --check lib/icon-semantic-aliases.js
node --check mcp/search.js
```

Expected:

```text
No output; both commands exit successfully.
```

- [ ] **Step 5: Commit the alias expansion**

```bash
git add lib/icon-semantic-aliases.js package.json scripts/verify-search-query-fixtures.mjs
git commit -m "feat: broaden self-hosted search alias coverage"
```

---

### Task 3: Browser Smoke Test And Query Review Close-Out

**Files:**
- Verify: `D:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/main.js`
- Verify: `D:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/admin.html`
- Verify: `D:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/public/admin-app.js`

- [ ] **Step 1: Run the production build**

Run:

```bash
npm run build
```

Expected:

```text
Build succeeds with the existing bundle-size warning only.
```

- [ ] **Step 2: Manually smoke-test the live search behavior locally**

Run:

```bash
npm run dev
```

Then verify in the browser:

1. Search `self-hosted`
2. Search `on-prem`
3. Search `self managed`

Expected:

- `heroicons:server-stack` remains the first result for all three queries.
- The result set is no longer a single-card dead end.
- `lucide:server`, `tabler:server`, and `material:home_storage` appear in the first screenful for `self-hosted`.

- [ ] **Step 3: Update the admin review after the fix is verified**

In the admin panel:

1. Open the saved `self-hosted` review row.
2. Change status from `needs_alias` to `resolved`.
3. Save note:

```text
resolved: broadened self-hosted alias coverage for server-stack/server/home-storage
```

- [ ] **Step 4: Commit the verification-complete state**

```bash
git status --short
```

Expected:

```text
Only the planned alias-fixture files are modified or staged for this slice.
```

---

## Fallback Rule

If Task 2 passes the fixture but the browser result set still feels too thin, do a second slice rather than bloating this one:

1. add one more curated alias target such as `tabler:database`
2. rerun `npm run verify:search-query-fixtures`
3. keep `main.js`, `mcp/search.js`, and both `synonyms.json` files unchanged unless the alias-first approach clearly fails

That keeps this fix true to the `needs_alias` diagnosis instead of quietly turning it into a search-engine rewrite.

---

## Self-Review

- Spec coverage: the plan covers the exact query gap, the shared alias data path, deterministic verification, browser QA, and admin review closure.
- Placeholder scan: no `TODO`, no “test later,” and no unspecified files.
- Consistency: the plan keeps the change surface narrow and intentionally avoids unrelated ranking or schema work.

Plan complete and saved to `docs/superpowers/plans/2026-04-17-self-hosted-alias-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
