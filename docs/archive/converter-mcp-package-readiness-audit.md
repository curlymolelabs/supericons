# Audit: Converter MCP Package Readiness Implementation Plan

Date: 2026-04-13
Auditor: Antigravity
Primary document: `docs/plans/converter-mcp-package-readiness-implementation-plan.md`
Reference document: `docs/plans/converter-mcp-agent-library-enhancement-plan.md`
Evidence base: Live codebase inspection (citations per finding)

---

## 1. Scope and Intent Alignment

The package-readiness plan correctly scopes itself to **Workstream A** of the enhancement plan
(Phase 1: Converter package readiness).

The stated objective -- "make the converter MCP tools installable, importable, and executable
cleanly outside the repo" -- is exactly what the enhancement plan calls out as the
first-priority blocker before any downstream ergonomics work. No scope drift detected.

**Verdict: Scope is correct and tightly aligned.**

---

## 2. Bug Confirmation: Are the Stated Blockers Real?

The plan lists four structural blockers. Each is verified against live code.

### Blocker 1: `converter.js` imports outside the package boundary

Plan claim: `mcp/converter.js` imports `../lib/converter-workflow.js`.

**Verified.** `mcp/converter.js` line 1:

```js
import { convertPngToSvg, convertSvgToPng, getConverterMcpOptions } from '../lib/converter-workflow.js';
```

This path escapes the `mcp/` directory. A fresh npm install of the tarball will not include
`../lib/`, so this import fails at runtime outside the repo.

### Blocker 2: `converter-workflow.js` imports `@neplex/vectorizer`

Plan claim: `converter-workflow.js` imports `@neplex/vectorizer`.

**Verified.** `lib/converter-workflow.js` line 2:

```js
import { ColorMode, Hierarchical, PathSimplifyMode, vectorize } from '@neplex/vectorizer';
```

### Blocker 3: `@neplex/vectorizer` is not declared in `mcp/package.json`

Plan claim: `@neplex/vectorizer` missing from `mcp/package.json` dependencies.

**Verified.** `mcp/package.json` dependencies:

```json
"@modelcontextprotocol/sdk": "^1.12.0",
"@resvg/resvg-js": "^2.6.2",
"zod": "^3.24.0"
```

`@neplex/vectorizer` is declared only in the root `package.json` (line 41), which is not
distributed with the `mcp/` tarball.

**Socratic note:** Is `@neplex/vectorizer` the only missing dependency?
`converter-workflow.js` also imports `./public-metadata-sanitizer.js` (line 4). That module
lives at `lib/public-metadata-sanitizer.js`, which is also outside the package boundary. The
plan addresses this by creating `mcp/runtime/public-metadata-sanitizer.js`, which is correct
-- but the sanitizer is a second distinct out-of-boundary file. The plan does not call it out
as a separate blocker in the "Why This Must Come First" section. Minor documentation gap,
not a logical flaw.

### Blocker 4: Package verification is Motion Lab-biased

Plan claim: Existing verification does not prove converter imports in a fresh install.

**Verified.**

- `verify-motion-lab-mcp-package.mjs` checks for `converter.js` in the tarball but does not
  check for `runtime/converter-workflow.js` or `runtime/public-metadata-sanitizer.js`.
- `verify-motion-lab-mcp-clean-install.mjs` imports only `motion-lab.js` and
  `motion-lab-client.js`. It never exercises any converter exports.
- Root `package.json` has no `verify:converter-mcp-clean-install` script.

**All four blockers are real and verified against live code.**

---

## 3. Chosen Approach Analysis

### Step 1: Internalize the converter runtime into `mcp/`

Plan proposes creating:
- `mcp/runtime/converter-workflow.js`
- `mcp/runtime/public-metadata-sanitizer.js`

**Assessment: Correct.**

**Socratic challenge (F-1):** Should this be a copy or a move? The plan says "move or copy"
but does not commit.

- A **copy** leaves the `lib/` originals intact. `lib/converter-workflow.js` is consumed by
  the browser-side converter path (not just the MCP path). Deleting it would break non-MCP code.
- A **move** is dangerous without first auditing all consumers of `lib/converter-workflow.js`.

**Gap:** The plan does not specify copy vs. move, and does not include a step to verify whether
`lib/converter-workflow.js` has other consumers before removing it. The plan must state
"copy, do not delete" explicitly.

**Socratic challenge (F-2):** Will the copied `mcp/runtime/converter-workflow.js` diverge from
the `lib/` original over time? If both files exist independently, they can diverge. The plan
should acknowledge this as a known residual risk.

### Step 2: Declare runtime dependencies explicitly

Plan expects to add `@neplex/vectorizer` to `mcp/package.json`.

**Assessment: Correct. Precision gap noted (F-3).**

**Socratic challenge (F-3):** What version of `@neplex/vectorizer` should be declared?

The root `package.json` declares `"@neplex/vectorizer": "^0.0.5"`. At the `0.0.x` semver
range, npm's caret pins to the exact patch version only. The implementation must mirror this
pin precisely. The plan omits the version reference entirely.

### Step 3: Expand the `files` allowlist

**Assessment: Accurate and complete.** The `runtime/` directory is entirely absent from the
current `files` list. Without this step the tarball ships the thin shim but not the code it
imports.

### Step 4: Expand package verification

**Assessment: Correct but ambiguously worded.** The `expectedFiles` list in
`verify-motion-lab-mcp-package.mjs` is a strict allowlist -- adding new files while the script
is still named `verify-motion-lab-mcp-package` could cause confusion. A comment noting the
pending rename would reduce future friction.

### Step 5: Add `verify-converter-mcp-clean-install.mjs`

**Assessment: Correct. One gap (F-5).**

The plan requires verifying:
1. `getConverterMcpOptions()` works
2. `convertSvgToPng()` works on a tiny inline SVG fixture
3. `convertPngToSvg()` can execute against a small PNG fixture

**Socratic challenge (F-4):** The PNG fixture is unspecified. A 4x4 pixel PNG encoded as an
inline base64 literal in the script keeps the test self-contained and deterministic. Leaving
it unspecified risks a too-large fixture being committed later.

**Socratic challenge (F-5):** The enhancement plan's Workstream D explicitly requires
"invalid input rejection" as part of verification. The readiness plan smoke test does not
include this check. This is a gap between the two documents.

### Step 6: Add root-level script wiring

**Assessment: Correct.** `verify:converter-mcp-clean-install` does not exist in root
`package.json` today. The plan is right to require it.

---

## 4. Verification Requirements Analysis

The plan states three completion gates:

1. `npm --prefix mcp run verify:package`
2. `npm run verify:converter-mcp-clean-install`
3. `npm run build`

**Assessment: Gates 1 and 2 are correct. Gate 3 is misleading (F-6).**

**Socratic challenge (F-6):** Why does `npm run build` prove converter package readiness?

The current `build` script has no converter-specific steps:

```
build:material-export-manifest && build:sanitize-public-pack-metadata &&
build:motion-lab-mcp-artifacts && build:bundles &&
verify:motion-lab-presets && verify:motion-lab-agent-metadata && vite build
```

A successful `npm run build` would pass even if every converter fix were reverted. Gate 3 is
a **regression fence** (proves the refactor did not break the main pipeline), not a converter
correctness proof. The plan should clarify this distinction.

---

## 5. What This Phase Deliberately Does Not Do

The exclusions section is well-written and matches the enhancement plan phasing:

- Does not add `inspect_converter_input` (Workstream B)
- Does not add `suggest_converter_settings` (Workstream B)
- Does not rewrite docs (Workstream C)
- Correctly identifies `converter:proof-service` as a separate browser-converter concern

**No scope-creep or premature commitment detected.**

---

## 6. Summary of Findings

| ID | Severity | Finding |
|----|----------|---------|
| F-1 | HIGH | Plan says "move or copy" without committing. Must be "copy, do not delete." `lib/converter-workflow.js` likely has browser-side consumers. |
| F-2 | MEDIUM | No acknowledgment that `mcp/runtime/converter-workflow.js` will diverge from `lib/` over time. Should be added to residual risks. |
| F-3 | MEDIUM | `@neplex/vectorizer` version unspecified. Implementation must mirror the root pin: `"^0.0.5"`. |
| F-4 | LOW | PNG fixture for the smoke test is unspecified. Should be an inline base64 literal (4x4 or similar) in the script itself. |
| F-5 | MEDIUM | Smoke test does not include invalid-input rejection. Enhancement plan's Workstream D explicitly requires this. Gap between the two plans. |
| F-6 | LOW | `npm run build` as a completion gate proves regression safety only, not converter correctness. Current build pipeline has no converter steps. |

**No blocker-level inaccuracies found. All four stated structural blockers are verified real.
The plan is executable. Apply F-1 before implementation starts. Apply F-2, F-3, and F-5
during implementation. F-4 and F-6 are editorial.**

---

## 7. Recommended Amendments to the Plan

### Amendment A (F-1): Clarify copy vs. move

In Section "1. Internalize the converter runtime into `mcp/`", add:

> Do not delete `lib/converter-workflow.js` or `lib/public-metadata-sanitizer.js`.
> Copy them into the `mcp/runtime/` boundary. The `lib/` originals serve the browser-side
> converter path and must remain in place. Verify this by checking all imports of
> `lib/converter-workflow.js` before removing anything.

### Amendment B (F-2): Add divergence risk to residual risks

In Section "Residual Risks After This Phase", add:

> The `mcp/runtime/converter-workflow.js` copy will diverge from `lib/converter-workflow.js`
> as each path evolves independently. If the MCP and browser converter paths need to stay
> synchronized, a single source-of-truth module should be extracted in a future slice.

### Amendment C (F-3): Pin the dependency version

In Section "2. Declare runtime dependencies explicitly", add:

> `@neplex/vectorizer` version must match the root `package.json` pin: `"^0.0.5"`.
> Do not independently resolve the version range without checking the root first.

### Amendment D (F-5): Add invalid-input rejection to smoke test

In Section "5. Add clean-install converter smoke verification", add step 6:

> 6. verify that an invalid input (e.g. an empty string passed to `convertPngToSvg`)
>    returns a thrown error, not a silent failure.

### Amendment E (F-6): Clarify the build gate

In Section "Verification Requirements", clarify gate 3:

> `npm run build` is a regression fence: it proves the refactor did not break the main
> build pipeline. It is not a converter correctness proof and should not be read as one.

---

## 8. Overall Verdict

Plan is **approved for implementation** after Amendment A is incorporated.
Amendments B, C, and D are recommended before the implementation phase closes.
Amendments E is editorial and can be applied at any point.
