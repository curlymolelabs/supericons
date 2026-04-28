# Screenshot Quality Workflow Orchestrator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build deterministic workflow tools that own screenshot capture, batch selection, artifact validation, quality gates, and promotion, while leaving only the visual `depicts` wording to the agent.

**Architecture:** Add a Node.js command-line orchestrator under `scripts/` that reuses the repo's existing registry, screenshot mapping, manual redo, and projection scripts. The orchestrator will produce machine-readable status files, recognized review artifacts, and strict validation reports so agents cannot silently skip icons, re-review pending work, mutate non-`depicts` fields, or promote unvetted batches.

**Tech Stack:** Node.js ESM, existing repo JSON catalogs, existing manual redo scripts, existing registry projection scripts, `@resvg/resvg-js` if screenshot rendering needs SVG-to-PNG rendering inside Node.

---

## Scope

This plan builds deterministic tooling for the screenshot-quality workflow. It does not automate subjective visual authoring. Agents still write or choose `depicts`, but only inside packets selected and validated by code.

The first implementation targets MingCute because the current workflow, screenshots, mapping files, and failure examples are all present there. The file boundaries should be library-agnostic enough to add Material, Tabler, Phosphor, and others later.

## File Structure

- Create: `lib/screenshot-quality/state.js`
  - Reads screenshot mapping, live registry, and recognized review artifacts.
  - Builds `completed_live`, `reviewed_pending`, `untouched`, and `qa_failed` state sets.

- Create: `lib/screenshot-quality/batch-selection.js`
  - Selects the next untouched batch.
  - Excludes already reviewed pending artifacts.
  - Reserves batch ids without overwriting existing files.

- Create: `lib/screenshot-quality/review-packet.js`
  - Writes deterministic agent input packets for visual authoring.
  - Includes screenshot paths, current live record, and non-`depicts` preservation rules.

- Create: `lib/screenshot-quality/quality-audit.js`
  - Runs deterministic quality checks on final records.
  - Flags duplicate `depicts`, banned phrases, missing visible modifiers, style-biased wording, and field drift.

- Create: `lib/screenshot-quality/promotion.js`
  - Promotes approved final records into the source record group while preserving structural fields.
  - Rebuilds registry projections and verifies live output.

- Create: `scripts/screenshot-quality-workflow.mjs`
  - CLI entry point with subcommands: `status`, `select`, `validate-review`, `audit-quality`, `promote`, and later `capture`.

- Create: `scripts/verify-screenshot-quality-workflow.mjs`
  - Repo-level verifier for state invariants.

- Create: `scripts/capture-icon-screenshots.mjs`
  - Deterministic screenshot renderer for line/outline and fill/solid asset variants.

- Modify: `package.json`
  - Add scripts for status, selection, audit, promotion, capture, and verification.

- Modify: `scripts/build-mingcute-screenshot-quality-checklist.mjs`
  - Prefer shared state helpers from `lib/screenshot-quality/state.js`.
  - Keep existing output paths and summary shape stable.

- Test: `tests/screenshot-quality/*.test.mjs`
  - Add Node test coverage for state classification, batch selection, quality audit, promotion safeguards, and screenshot filename checks.

## State Model

The orchestrator must compute these states deterministically:

```json
{
  "completed_live": "The live public record exactly matches a recognized screenshot final-records artifact.",
  "reviewed_pending": "A recognized screenshot final-records artifact exists, but live does not yet match it.",
  "untouched": "Screenshot-backed live record exists, but no recognized screenshot review artifact matches or awaits promotion.",
  "qa_failed": "A final-records artifact exists but deterministic quality audit blocks promotion.",
  "missing_screenshot": "The mapping expects screenshot files that are not present.",
  "unmapped": "A screenshot concept cannot be mapped to a live registry record."
}
```

Recognized screenshot artifacts must match:

```text
^mingcute-.*screenshot.*final-records\.json$
^mingcute-test-batch-.*final-records\.json$
```

The shared state module should later accept library-specific patterns, but MingCute is the first target.

## Task 1: Add State Classification Tests

**Files:**
- Create: `tests/screenshot-quality/state.test.mjs`
- Create: `tests/screenshot-quality/fixtures/state/`
- Create: `lib/screenshot-quality/state.js`

- [ ] **Step 1: Create fixture data**

Create small JSON fixtures in `tests/screenshot-quality/fixtures/state/`:

```json
[
  {
    "icon_id": "mingcute:alpha",
    "source_library": "mingcute",
    "source_name": "alpha",
    "label": "Alpha",
    "depicts": "old alpha wording",
    "semantic_tags": ["alpha"],
    "synonyms": ["alpha"],
    "use_when": "Use for alpha.",
    "avoid_when": "Do not use for beta."
  },
  {
    "icon_id": "mingcute:beta",
    "source_library": "mingcute",
    "source_name": "beta",
    "label": "Beta",
    "depicts": "beta wording",
    "semantic_tags": ["beta"],
    "synonyms": ["beta"],
    "use_when": "Use for beta.",
    "avoid_when": "Do not use for alpha."
  }
]
```

Add a recognized final-records fixture where `alpha` differs from live and `beta` matches live.

- [ ] **Step 2: Write failing state classification tests**

Add tests using `node:test`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { classifyScreenshotQualityState } from "../../lib/screenshot-quality/state.js";

test("classifies completed live and reviewed pending records", () => {
  const state = classifyScreenshotQualityState({
    library: "mingcute",
    liveRecords: [
      {
        icon_id: "mingcute:alpha",
        source_library: "mingcute",
        source_name: "alpha",
        label: "Alpha",
        depicts: "old alpha wording",
        semantic_tags: ["alpha"],
        synonyms: ["alpha"],
        use_when: "Use for alpha.",
        avoid_when: "Do not use for beta."
      },
      {
        icon_id: "mingcute:beta",
        source_library: "mingcute",
        source_name: "beta",
        label: "Beta",
        depicts: "beta wording",
        semantic_tags: ["beta"],
        synonyms: ["beta"],
        use_when: "Use for beta.",
        avoid_when: "Do not use for alpha."
      }
    ],
    screenshotConcepts: [
      { icon_id: "mingcute:alpha", source_name: "alpha", screenshot_files: ["mingcute_alpha_line.png"] },
      { icon_id: "mingcute:beta", source_name: "beta", screenshot_files: ["mingcute_beta_line.png"] },
      { icon_id: "mingcute:gamma", source_name: "gamma", screenshot_files: ["mingcute_gamma_line.png"] }
    ],
    recognizedArtifacts: [
      {
        fileName: "mingcute-screenshot-batch-001-final-records.json",
        records: [
          {
            icon_id: "mingcute:alpha",
            source_library: "mingcute",
            source_name: "alpha",
            label: "Alpha",
            depicts: "new alpha wording",
            semantic_tags: ["alpha"],
            synonyms: ["alpha"],
            use_when: "Use for alpha.",
            avoid_when: "Do not use for beta."
          },
          {
            icon_id: "mingcute:beta",
            source_library: "mingcute",
            source_name: "beta",
            label: "Beta",
            depicts: "beta wording",
            semantic_tags: ["beta"],
            synonyms: ["beta"],
            use_when: "Use for beta.",
            avoid_when: "Do not use for alpha."
          }
        ]
      }
    ]
  });

  assert.deepEqual(state.reviewed_pending.map((item) => item.icon_id), ["mingcute:alpha"]);
  assert.deepEqual(state.completed_live.map((item) => item.icon_id), ["mingcute:beta"]);
  assert.deepEqual(state.unmapped.map((item) => item.icon_id), ["mingcute:gamma"]);
});
```

- [ ] **Step 3: Run the failing test**

Run:

```bash
node --test tests/screenshot-quality/state.test.mjs
```

Expected: failure because `lib/screenshot-quality/state.js` does not exist yet.

- [ ] **Step 4: Implement state classification**

Implement `lib/screenshot-quality/state.js` with:

```js
export const PUBLIC_FIELDS = [
  "label",
  "depicts",
  "semantic_tags",
  "synonyms",
  "use_when",
  "avoid_when"
];

export function samePublicFields(left, right) {
  return PUBLIC_FIELDS.every((field) => JSON.stringify(left?.[field]) === JSON.stringify(right?.[field]));
}

export function isRecognizedScreenshotFinalRecordsFile(fileName, library) {
  return (
    new RegExp(`^${library}-.*screenshot.*final-records\\.json$`, "i").test(fileName) ||
    new RegExp(`^${library}-test-batch-.*final-records\\.json$`, "i").test(fileName)
  );
}

export function classifyScreenshotQualityState({ library, liveRecords, screenshotConcepts, recognizedArtifacts }) {
  const liveById = new Map(liveRecords.filter((record) => record.source_library === library).map((record) => [record.icon_id, record]));
  const artifactsByIcon = new Map();

  for (const artifact of recognizedArtifacts) {
    for (const record of artifact.records || []) {
      if (!artifactsByIcon.has(record.icon_id)) {
        artifactsByIcon.set(record.icon_id, []);
      }
      artifactsByIcon.get(record.icon_id).push({ fileName: artifact.fileName, record });
    }
  }

  const completed_live = [];
  const reviewed_pending = [];
  const untouched = [];
  const unmapped = [];

  for (const concept of screenshotConcepts) {
    const live = liveById.get(concept.icon_id);
    if (!live) {
      unmapped.push(concept);
      continue;
    }

    const artifacts = artifactsByIcon.get(concept.icon_id) || [];
    const matchingArtifacts = artifacts.filter((artifact) => samePublicFields(artifact.record, live));

    if (matchingArtifacts.length > 0) {
      completed_live.push({ ...concept, reviewed_files: matchingArtifacts.map((artifact) => artifact.fileName) });
      continue;
    }

    if (artifacts.length > 0) {
      reviewed_pending.push({ ...concept, reviewed_files: artifacts.map((artifact) => artifact.fileName) });
      continue;
    }

    untouched.push(concept);
  }

  return { completed_live, reviewed_pending, untouched, unmapped };
}
```

- [ ] **Step 5: Run the test**

Run:

```bash
node --test tests/screenshot-quality/state.test.mjs
```

Expected: pass.

## Task 2: Build Screenshot Quality Status CLI

**Files:**
- Create: `scripts/screenshot-quality-workflow.mjs`
- Modify: `package.json`
- Test: `tests/screenshot-quality/status.test.mjs`

- [ ] **Step 1: Add CLI status tests**

Test that `status --library mingcute --json` prints counts with `completed_live`, `reviewed_pending`, and `untouched`.

```js
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

test("status command prints screenshot quality state counts", () => {
  const output = execFileSync("node", [
    "scripts/screenshot-quality-workflow.mjs",
    "status",
    "--library",
    "mingcute",
    "--json"
  ], { encoding: "utf8" });

  const parsed = JSON.parse(output);
  assert.equal(parsed.library, "mingcute");
  assert.equal(typeof parsed.counts.completed_live, "number");
  assert.equal(typeof parsed.counts.reviewed_pending, "number");
  assert.equal(typeof parsed.counts.untouched, "number");
});
```

- [ ] **Step 2: Implement CLI argument parsing**

Use a small local parser instead of adding a dependency:

```js
function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {};
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = rest[index + 1];
    if (!next || next.startsWith("--")) {
      options[key] = true;
    } else {
      options[key] = next;
      index += 1;
    }
  }
  return { command, options };
}
```

- [ ] **Step 3: Implement `status`**

The command should:

1. Read `output/icon_screenshot/<library>/screenshot-mapping.json`.
2. Read `public/registry/records.json`.
3. Read recognized screenshot final-records artifacts.
4. Classify state with `classifyScreenshotQualityState`.
5. Print JSON when `--json` is present.

The status JSON shape:

```json
{
  "library": "mingcute",
  "counts": {
    "completed_live": 336,
    "reviewed_pending": 0,
    "untouched": 1326,
    "unmapped": 0
  },
  "next_untouched": ["mingcute:chrome"]
}
```

- [ ] **Step 4: Add package script**

Add:

```json
"screenshot-quality": "node scripts/screenshot-quality-workflow.mjs"
```

- [ ] **Step 5: Run tests and command**

Run:

```bash
node --test tests/screenshot-quality/status.test.mjs
npm run screenshot-quality -- status --library mingcute --json
```

Expected: both pass and status JSON prints without stack traces.

## Task 3: Deterministic Batch Selection

**Files:**
- Create: `lib/screenshot-quality/batch-selection.js`
- Modify: `scripts/screenshot-quality-workflow.mjs`
- Test: `tests/screenshot-quality/batch-selection.test.mjs`

- [ ] **Step 1: Write selection tests**

Test that selection uses `untouched`, excludes `reviewed_pending`, and refuses an existing batch id.

```js
import assert from "node:assert/strict";
import test from "node:test";
import { selectNextScreenshotBatch } from "../../lib/screenshot-quality/batch-selection.js";

test("selects only untouched records and excludes reviewed pending records", () => {
  const result = selectNextScreenshotBatch({
    untouched: [
      { icon_id: "mingcute:a", source_name: "a" },
      { icon_id: "mingcute:b", source_name: "b" },
      { icon_id: "mingcute:c", source_name: "c" }
    ],
    size: 2
  });

  assert.deepEqual(result.items.map((item) => item.icon_id), ["mingcute:a", "mingcute:b"]);
});
```

- [ ] **Step 2: Implement selector**

```js
export function selectNextScreenshotBatch({ untouched, size }) {
  if (!Number.isInteger(size) || size <= 0) {
    throw new Error(`Batch size must be a positive integer. Received: ${size}`);
  }
  return {
    items: untouched.slice(0, size),
    counts: {
      requested: size,
      selected: Math.min(size, untouched.length)
    }
  };
}

export function assertBatchIdUnused({ batchId, existingFileNames }) {
  const conflicts = existingFileNames.filter((fileName) => fileName.includes(batchId));
  if (conflicts.length > 0) {
    throw new Error(`Batch id ${batchId} conflicts with existing files: ${conflicts.join(", ")}`);
  }
}
```

- [ ] **Step 3: Add CLI `select`**

Command:

```bash
npm run screenshot-quality -- select --library mingcute --size 100 --batch-id mingcute-screenshot-batch-034
```

The command should write:

```text
data/si-registry/manual-redo/mingcute-screenshot-batch-034-packet.json
```

The packet is not a final-records file. It is agent input.

- [ ] **Step 4: Packet shape**

Each item:

```json
{
  "icon_id": "mingcute:chrome",
  "source_name": "chrome",
  "line_screenshot": "output/icon_screenshot/mingcute/mingcute_chrome_line.png",
  "fill_screenshot": "output/icon_screenshot/mingcute/mingcute_chrome_fill.png",
  "current_live_record": {
    "icon_id": "mingcute:chrome",
    "source_library": "mingcute",
    "source_name": "chrome",
    "label": "Chrome",
    "depicts": "Chrome logo mark centered as the official brand symbol",
    "semantic_tags": ["chrome"],
    "synonyms": ["chrome"],
    "use_when": "Use when...",
    "avoid_when": "Do not use when..."
  },
  "agent_allowed_fields": ["depicts"],
  "non_depicts_fields_must_match_live": true
}
```

- [ ] **Step 5: Verify command**

Run:

```bash
npm run screenshot-quality -- select --library mingcute --size 100 --batch-id mingcute-screenshot-batch-034
```

Expected:

```text
screenshot-quality select: wrote data/si-registry/manual-redo/mingcute-screenshot-batch-034-packet.json
selected: 100
overlap_with_reviewed_pending: 0
```

## Task 4: Agent Output Normalizer

**Files:**
- Create: `lib/screenshot-quality/review-packet.js`
- Modify: `scripts/screenshot-quality-workflow.mjs`
- Test: `tests/screenshot-quality/review-packet.test.mjs`

- [ ] **Step 1: Define expected agent output**

The agent should produce:

```json
[
  {
    "icon_id": "mingcute:chrome",
    "depicts": "circle divided into three curved sections around a small center circle"
  }
]
```

The program should merge those `depicts` values back into the live public schema and preserve all other fields from live.

- [ ] **Step 2: Write normalizer test**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { buildFinalRecordsFromDepictsOnly } from "../../lib/screenshot-quality/review-packet.js";

test("merges depicts-only agent output with live public records", () => {
  const records = buildFinalRecordsFromDepictsOnly({
    liveRecords: [
      {
        icon_id: "mingcute:chrome",
        source_library: "mingcute",
        source_name: "chrome",
        label: "Chrome",
        depicts: "old",
        semantic_tags: ["chrome"],
        synonyms: ["chrome"],
        use_when: "Use for Chrome.",
        avoid_when: "Do not use for other browsers."
      }
    ],
    agentDepicts: [
      {
        icon_id: "mingcute:chrome",
        depicts: "circle divided into three curved sections around a small center circle"
      }
    ]
  });

  assert.equal(records[0].depicts, "circle divided into three curved sections around a small center circle");
  assert.deepEqual(records[0].semantic_tags, ["chrome"]);
});
```

- [ ] **Step 3: Implement final record builder**

```js
export function buildFinalRecordsFromDepictsOnly({ liveRecords, agentDepicts }) {
  const liveById = new Map(liveRecords.map((record) => [record.icon_id, record]));
  return agentDepicts.map((item) => {
    const live = liveById.get(item.icon_id);
    if (!live) {
      throw new Error(`Agent output references unknown icon: ${item.icon_id}`);
    }
    if (!item.depicts || typeof item.depicts !== "string") {
      throw new Error(`Agent output missing depicts for ${item.icon_id}`);
    }
    return {
      icon_id: live.icon_id,
      source_library: live.source_library,
      source_name: live.source_name,
      label: live.label,
      depicts: item.depicts.trim(),
      semantic_tags: live.semantic_tags,
      synonyms: live.synonyms,
      use_when: live.use_when,
      avoid_when: live.avoid_when
    };
  });
}
```

- [ ] **Step 4: Add CLI `finalize-review`**

Command:

```bash
npm run screenshot-quality -- finalize-review --library mingcute --batch-id mingcute-screenshot-batch-034 --agent-output data/si-registry/manual-redo/mingcute-screenshot-batch-034-agent-depicts.json
```

Expected output file:

```text
data/si-registry/manual-redo/mingcute-screenshot-batch-034-final-records.json
```

## Task 5: Deterministic Quality Auditor

**Files:**
- Create: `lib/screenshot-quality/quality-audit.js`
- Modify: `scripts/screenshot-quality-workflow.mjs`
- Test: `tests/screenshot-quality/quality-audit.test.mjs`

- [ ] **Step 1: Write tests for known failure patterns**

Use batch 033 failures as examples:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { auditFinalRecords } from "../../lib/screenshot-quality/quality-audit.js";

test("flags repeated depicts across modifier variants", () => {
  const issues = auditFinalRecords({
    records: [
      { icon_id: "mingcute:calendar", source_name: "calendar", depicts: "Calendar frame with top binding tabs and a grid below" },
      { icon_id: "mingcute:calendar_add", source_name: "calendar_add", depicts: "Calendar frame with top binding tabs and a grid below" },
      { icon_id: "mingcute:calendar_x", source_name: "calendar_x", depicts: "Calendar frame with top binding tabs and a grid below" }
    ]
  });

  assert.equal(issues.some((issue) => issue.code === "duplicate_depicts_modifier_family"), true);
});

test("flags missing visible modifier words", () => {
  const issues = auditFinalRecords({
    records: [
      { icon_id: "mingcute:camera_2_off", source_name: "camera_2_off", depicts: "Camera body with circular lens" },
      { icon_id: "mingcute:camera_rotate", source_name: "camera_rotate", depicts: "Camera body with circular lens" },
      { icon_id: "mingcute:camera_2_ai", source_name: "camera_2_ai", depicts: "Camera body with circular lens" }
    ]
  });

  assert.deepEqual(issues.map((issue) => issue.code), [
    "missing_off_visual",
    "missing_rotate_visual",
    "missing_ai_visual",
    "duplicate_depicts_modifier_family"
  ]);
});
```

- [ ] **Step 2: Implement audit rules**

Rules:

```js
const BANNED_PHRASES = [
  "outline centered as the main",
  "main icon form",
  "official brand symbol",
  "logo mark centered as the official brand symbol"
];

const MODIFIER_REQUIREMENTS = [
  { pattern: /(^|_)off($|_)/, required: /(slash|off|diagonal|crossed|disabled)/i, code: "missing_off_visual" },
  { pattern: /(^|_)add($|_)/, required: /(plus|add)/i, code: "missing_add_visual" },
  { pattern: /(^|_)x($|_)/, required: /(x|cross|close)/i, code: "missing_x_visual" },
  { pattern: /(^|_)ai($|_)/, required: /(spark|star|ai)/i, code: "missing_ai_visual" },
  { pattern: /(^|_)rotate($|_)/, required: /(rotate|circular arrow|arrow)/i, code: "missing_rotate_visual" },
  { pattern: /(^|_)time($|_)/, required: /(clock|time|plus)/i, code: "missing_time_visual" },
  { pattern: /(^|_)month($|_)/, required: /(dot|grid|month|row)/i, code: "missing_month_visual" },
  { pattern: /(^|_)day($|_)/, required: /(day|card|panel|line|box)/i, code: "missing_day_visual" },
  { pattern: /(^|_)week($|_)/, required: /(week|row|bar|line)/i, code: "missing_week_visual" }
];
```

Return issues:

```json
{
  "severity": "blocker",
  "code": "missing_off_visual",
  "icon_id": "mingcute:camera_2_off",
  "message": "source_name contains off but depicts does not mention a visible off/slash/disabled mark"
}
```

- [ ] **Step 3: Add CLI `audit-quality`**

Command:

```bash
npm run screenshot-quality -- audit-quality --final-records data/si-registry/manual-redo/mingcute-screenshot-batch-034-final-records.json
```

Expected:

```text
screenshot-quality audit-quality: failed
blocker missing_off_visual mingcute:camera_2_off
```

Exit code should be `1` for blocker issues.

## Task 6: Deterministic Promotion

**Files:**
- Create: `lib/screenshot-quality/promotion.js`
- Modify: `scripts/screenshot-quality-workflow.mjs`
- Test: `tests/screenshot-quality/promotion.test.mjs`

- [ ] **Step 1: Write promotion test**

Test structural fields are preserved:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { mergeFinalRecordsIntoApprovedRecords } from "../../lib/screenshot-quality/promotion.js";

test("promotes public fields while preserving structural fields", () => {
  const approved = [
    {
      icon_id: "mingcute:chrome",
      source_group: "free",
      source_library: "mingcute",
      source_name: "chrome",
      label: "Chrome",
      purpose: "Show Chrome.",
      category: "brand_identity",
      semantic_tags: ["chrome"],
      use_when: "Use for Chrome.",
      avoid_when: "Do not use for other browsers.",
      version: "1.0.0",
      status: "reviewed",
      access_tier: "public_open_record",
      projection_policy: "future_public_record",
      is_premium: false,
      depicts: "old",
      review_state: "human_reviewed",
      evidence: ["source_name"],
      synonyms: ["chrome"]
    }
  ];

  const merged = mergeFinalRecordsIntoApprovedRecords({
    approvedRecords: approved,
    finalRecords: [
      {
        icon_id: "mingcute:chrome",
        source_library: "mingcute",
        source_name: "chrome",
        label: "Chrome",
        depicts: "circle divided into three curved sections around a small center circle",
        semantic_tags: ["chrome"],
        synonyms: ["chrome"],
        use_when: "Use for Chrome.",
        avoid_when: "Do not use for other browsers."
      }
    ]
  });

  assert.equal(merged[0].depicts, "circle divided into three curved sections around a small center circle");
  assert.equal(merged[0].access_tier, "public_open_record");
  assert.equal(merged[0].source_group, "free");
});
```

- [ ] **Step 2: Implement promotion merge**

```js
const PUBLIC_PROMOTION_FIELDS = [
  "label",
  "depicts",
  "semantic_tags",
  "synonyms",
  "use_when",
  "avoid_when"
];

export function mergeFinalRecordsIntoApprovedRecords({ approvedRecords, finalRecords }) {
  const finalBySourceName = new Map(finalRecords.map((record) => [record.source_name, record]));
  let replaced = 0;

  const merged = approvedRecords.map((record) => {
    const final = finalBySourceName.get(record.source_name);
    if (!final) {
      return record;
    }
    replaced += 1;
    const next = { ...record };
    for (const field of PUBLIC_PROMOTION_FIELDS) {
      next[field] = final[field];
    }
    return next;
  });

  if (replaced !== finalRecords.length) {
    throw new Error(`Expected to replace ${finalRecords.length} records, replaced ${replaced}`);
  }

  return merged;
}
```

- [ ] **Step 3: Add CLI `promote`**

Command:

```bash
npm run screenshot-quality -- promote --library mingcute --final-records data/si-registry/manual-redo/mingcute-screenshot-batch-034-final-records.json
```

The command must:

1. Run `audit-quality`.
2. Merge into `data/si-registry/automation/mingcute/approved-records.json`.
3. Run `npm run build:si-registry`.
4. Run `npm run verify:pruned-semantic-fields`.
5. Run `npm run build:mingcute-screenshot-quality-checklist`.
6. Verify the live registry matches the final-records file.
7. Verify tracker counts increased by the final-record count.

## Task 7: Screenshot Capture

**Files:**
- Create: `scripts/capture-icon-screenshots.mjs`
- Test: `tests/screenshot-quality/screenshot-capture.test.mjs`

- [ ] **Step 1: Start with dry-run capture test**

Test that the script can list capture targets without writing images:

```js
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

test("capture dry run lists MingCute targets", () => {
  const output = execFileSync("node", [
    "scripts/capture-icon-screenshots.mjs",
    "--library",
    "mingcute",
    "--dry-run",
    "--limit",
    "2"
  ], { encoding: "utf8" });

  const parsed = JSON.parse(output);
  assert.equal(parsed.library, "mingcute");
  assert.equal(parsed.targets.length, 2);
});
```

- [ ] **Step 2: Implement capture target loading**

Read:

```text
output/icon_screenshot/<library>/screenshot-mapping.json
```

For each entry, resolve:

```json
{
  "asset_id": "home_1_line",
  "asset_style": "outline",
  "source_catalog": "public/icon-index.json",
  "output": "output/icon_screenshot/mingcute/mingcute_home_1_line.png"
}
```

- [ ] **Step 3: Implement rendering**

Use `@resvg/resvg-js` for SVG-to-PNG rendering when the source catalog stores SVG payloads. If the catalog stores SVG under a different property, inspect one catalog entry and use that property directly.

Render defaults:

```json
{
  "width": 128,
  "height": 128,
  "background": "transparent",
  "color": "black"
}
```

- [ ] **Step 4: Add verification**

After rendering, verify:

1. PNG exists.
2. File size is greater than `0`.
3. Dimensions are `128x128` unless the existing capture process intentionally allows `129x128`.

If dimensions differ, write the issue to:

```text
data/si-registry/generated/screenshot-capture-issues.json
```

## Task 8: Integrate Checklist Builder With Shared State

**Files:**
- Modify: `scripts/build-mingcute-screenshot-quality-checklist.mjs`
- Test: `tests/screenshot-quality/checklist-state.test.mjs`

- [ ] **Step 1: Add regression test for pending artifacts**

The test should prove pending artifacts are visible in state output even when they are not live.

```js
import assert from "node:assert/strict";
import test from "node:test";
import { classifyScreenshotQualityState } from "../../lib/screenshot-quality/state.js";

test("reviewed pending artifacts are not treated as untouched", () => {
  const state = classifyScreenshotQualityState({
    library: "mingcute",
    liveRecords: [{
      icon_id: "mingcute:a",
      source_library: "mingcute",
      source_name: "a",
      label: "A",
      depicts: "old",
      semantic_tags: ["a"],
      synonyms: ["a"],
      use_when: "Use for a.",
      avoid_when: "Do not use for b."
    }],
    screenshotConcepts: [{ icon_id: "mingcute:a", source_name: "a", screenshot_files: ["a.png"] }],
    recognizedArtifacts: [{
      fileName: "mingcute-screenshot-batch-001-final-records.json",
      records: [{
        icon_id: "mingcute:a",
        source_library: "mingcute",
        source_name: "a",
        label: "A",
        depicts: "new",
        semantic_tags: ["a"],
        synonyms: ["a"],
        use_when: "Use for a.",
        avoid_when: "Do not use for b."
      }]
    }]
  });

  assert.equal(state.reviewed_pending.length, 1);
  assert.equal(state.untouched.length, 0);
});
```

- [ ] **Step 2: Reuse shared state in checklist builder**

Keep current summary keys stable, and add new counts:

```json
{
  "reviewed_pending": 0,
  "untouched": 1326,
  "qa_failed": 0
}
```

- [ ] **Step 3: Preserve existing markdown output**

Add a new section to the checklist:

```markdown
## Reviewed But Not Live

- [ ] `mingcute:chrome` - reviewed in mingcute-screenshot-batch-034-final-records.json, not promoted
```

## Task 9: End-to-End Verification Script

**Files:**
- Create: `scripts/verify-screenshot-quality-workflow.mjs`
- Modify: `package.json`

- [ ] **Step 1: Implement workflow verifier**

Verifier checks:

1. All recognized final-records files contain only public fields.
2. No final-records file has duplicate `icon_id`.
3. No two pending artifacts contain the same `icon_id` with different public fields.
4. Every completed live record matches at least one recognized final-records artifact.
5. No promoted record has missing structural fields in `approved-records.json`.
6. No `reviewed_pending` item appears in `untouched`.

- [ ] **Step 2: Add package script**

```json
"verify:screenshot-quality-workflow": "node scripts/verify-screenshot-quality-workflow.mjs"
```

- [ ] **Step 3: Run full verification**

Run:

```bash
npm run verify:screenshot-quality-workflow
npm run verify:pruned-semantic-fields
npm run build:mingcute-screenshot-quality-checklist
```

Expected: all pass.

## Task 10: Documentation And Agent Handoff

**Files:**
- Create: `docs/superpowers/workflows/screenshot-quality-workflow.md`
- Modify: `docs/superpowers/workflows/semantic-registry-redo.md`

- [ ] **Step 1: Write workflow doc**

Document the deterministic handoff:

```markdown
# Screenshot Quality Workflow

1. Run status.
2. Run select.
3. Give the packet to the agent.
4. Agent returns depicts-only JSON.
5. Run finalize-review.
6. Run audit-quality.
7. Review exact final-records JSON.
8. Promote only after approval.
9. Rebuild registry and checklist.
```

- [ ] **Step 2: Add agent rules**

Add:

```markdown
Agents do not choose batches manually. Agents do not calculate progress counts manually. Agents do not promote review-only batches. Agents only author `depicts` in the selected packet unless the deterministic workflow explicitly opens another field.
```

- [ ] **Step 3: Add recovery notes**

Document how to handle duplicate artifacts:

```markdown
If duplicate pending artifacts exist for the same icon, run reconciliation before selecting more icons. The reconciled output must be saved as a tracker-recognized `*-final-records.json` file before promotion.
```

## Final Verification

Run:

```bash
node --test tests/screenshot-quality/*.test.mjs
npm run verify:screenshot-quality-workflow
npm run verify:manual-redo-determinism
npm run verify:pruned-semantic-fields
npm run build:si-registry
npm run build:mingcute-screenshot-quality-checklist
```

Expected:

```text
All screenshot-quality tests pass.
verify:screenshot-quality-workflow: ok
verify-manual-redo-determinism: ok
verify-pruned-semantic-fields: ok
build-si-registry-projections: wrote public registry projections
build-mingcute-screenshot-quality-checklist: wrote checklist and summary
```

## Rollout Strategy

1. Implement status and state classification first.
2. Use status output to confirm current MingCute state.
3. Implement selection and packet creation.
4. Run one review-only batch through the new packet flow.
5. Implement quality audit before allowing orchestrated promotion.
6. Promote one approved batch through the new promotion command.
7. Generalize library configuration after MingCute proves stable.

## Known Risks

- Screenshot rendering may require inspecting exact SVG payload fields in `public/icon-index*.json`.
- Existing artifacts may contain old conflicts that need one-time reconciliation before the verifier can pass.
- Deterministic quality audit catches obvious problems but cannot prove visual truth. Human or agent review remains necessary for final `depicts` quality.
- The current repo has unrelated dirty files. Implementation should avoid touching unrelated files and should commit only the new workflow files and intentional script changes.

## Self-Review

- Spec coverage: screenshot capture, state classification, batch selection, agent handoff, quality audit, promotion, and documentation are each mapped to implementation tasks.
- Placeholder scan: no unresolved placeholder language remains.
- Type consistency: `icon_id`, `source_name`, `depicts`, `finalRecords`, `recognizedArtifacts`, and state names are used consistently across tasks.
- Scope check: the first implementation is intentionally MingCute-first with reusable modules for later libraries.
