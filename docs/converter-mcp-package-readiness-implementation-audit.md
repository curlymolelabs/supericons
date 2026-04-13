# Implementation Audit: Converter MCP Package Readiness

Date: 2026-04-13
Auditor: Antigravity
Scope: Post-implementation verification of the converter MCP package-readiness slice
Reference plan: `docs/plans/converter-mcp-package-readiness-implementation-plan.md`
Prior audit: `docs/converter-mcp-package-readiness-audit.md`

---

## 1. Checklist: Plan Requirements vs. Implementation

| Requirement | Status | Evidence |
|---|---|---|
| `converter.js` no longer imports outside `mcp/` | PASS | Line 6: imports from `./runtime/converter-workflow.js` |
| `mcp/runtime/converter-workflow.js` created | PASS | File exists, 579 lines |
| `mcp/runtime/public-metadata-sanitizer.js` created | PASS | File exists, 172 lines, byte-for-byte matches `lib/` original |
| `@neplex/vectorizer` added to `mcp/package.json` | PASS | Line 29: `"@neplex/vectorizer": "^0.0.5"` |
| Version pin matches root `package.json` | PASS | Root pins `^0.0.5`; MCP pins `^0.0.5` |
| `mcp/package.json` files allowlist updated | PASS | Lines 18-19: `runtime/converter-workflow.js` and `runtime/public-metadata-sanitizer.js` |
| `verify-motion-lab-mcp-package.mjs` updated | PASS | Lines 17-18 now include the two runtime files in `expectedFiles` |
| `verify-converter-mcp-clean-install.mjs` created | PASS | File exists, 135 lines |
| Root `package.json` wired with `verify:converter-mcp-clean-install` | PASS | Line 13 of root `package.json` |
| `lib/` originals not deleted (Amendment A) | PASS | `lib/converter-workflow.js` still exists; proof-service still imports it |

---

## 2. Scope Expansion: Unplanned Additions

The implementation delivered more than the plan required. These additions were not in scope for
the readiness slice but were added proactively.

### 2a. `inspectConverterInput` function (out of plan scope)

`mcp/runtime/converter-workflow.js` adds `inspectConverterInput` (lines 478-509) including a
full PNG header parser (`readPngHeader`, lines 295-337) and a settings recommendation engine
(`buildConverterInspection`, lines 339-415).

This maps to **Workstream B** (agent decision support) of the enhancement plan,
specifically the `inspect_converter_input` tool that the plan deferred to Phase 2.

### 2b. `inspect_converter_input` registered as a live MCP tool

`mcp/index.js` lines 764-785 register `inspect_converter_input` as a full Pro-gated MCP tool
with a proper schema, description, and error handling.

### 2c. Enriched `getConverterMcpOptions`

The options function was upgraded with:
- Per-setting `guidance` objects for `qualityModes`, `colorModes`, `uiModes`, and `traceClasses`
- `starterCombinations` with three labeled presets and rationale
- A `workflow.recommendedOrder` field that places `inspect_converter_input` first

This maps to the "improve `inspect_converter_options`" item from Workstream B.

### 2d. Smoke test verifies `inspectConverterInput` export and shape

`verify-converter-mcp-clean-install.mjs` (lines 64-87) verifies the new function is exported
and returns the expected response shape from a clean install.

---

## 3. Prior Audit Findings: Resolution Check

| Finding | Severity | Resolution |
|---|---|---|
| F-1: "move or copy" ambiguity | HIGH | RESOLVED. `lib/` originals are intact; `tools/converter-proof-service/service.mjs` still imports from `lib/converter-workflow.js` and continues to work. |
| F-2: Divergence risk not documented | MEDIUM | OPEN. The residual-risk section of the plan was not updated. The two files will now diverge independently. |
| F-3: `@neplex/vectorizer` version unspecified | MEDIUM | RESOLVED. Pin `^0.0.5` matches root. |
| F-4: PNG fixture unspecified | LOW | RESOLVED. `verify-converter-mcp-clean-install.mjs` line 13 inlines `PNG_BASE64_FIXTURE` as a base64 literal. |
| F-5: No invalid-input rejection check | MEDIUM | RESOLVED. Lines 115-123 verify that `convertPngToSvg('')` throws the expected error message. |
| F-6: `npm run build` gate misleadingly named | LOW | OPEN. The build script still has no converter steps. The plan was not amended to clarify this. Low severity; no functional impact. |

---

## 4. Quality Findings on the Implementation

### QF-1: `converter.js` shim now exports `inspectConverterInput` -- is this intentional?

`mcp/converter.js` line 5 re-exports `inspectConverterInput` alongside the three original
tools. This is correct given that `index.js` imports it.

However, `mcp/converter.js` was originally a thin pass-through shim for three exports. It now
re-exports four. This is internally consistent, but the "thin shim" description in the plan is
no longer accurate. No functional issue.

### QF-2: `inspect_converter_input` is registered without `mimeType` in the schema description

`index.js` line 770: the `mimeType` parameter description says "Optional MIME type override.
Defaults to PNG."

The underlying function only accepts `image/png`. An agent passing `image/jpeg` will receive a
runtime error. The description does not warn about this constraint. Consider tightening to:
"Optional MIME type. Only `image/png` is currently supported."

This is a documentation-quality issue, not a functional blocker.

### QF-3: `readPngHeader` throws on buffers shorter than 33 bytes -- could this conflict with `validateInputBuffer`?

`validateInputBuffer` only checks for empty buffers and max-size limit:
```js
if (!buffer?.length) throw new Error('PNG input is empty.');
if (buffer.length > MAX_CONVERTER_INPUT_BYTES) throw ...;
```

`readPngHeader` then throws `'PNG input is too small to inspect.'` if `buffer.length < 33`.

So a 1-32 byte buffer passes `validateInputBuffer` but fails inside `readPngHeader`. The error
message is clear, but the validation is split across two functions. Low severity. Could be
unified in `validateInputBuffer` in a future pass.

### QF-4: `buildConverterInspection` hardcodes `confidence: 'medium'`

Line 397: `confidence: 'medium'` is always returned regardless of how much the header tells us.
A monochrome 16x16 PNG is a high-confidence classification. A large RGBA PNG is a lower-confidence
case. This is a static placeholder until deeper analysis is added.

Agents consuming this field today will always see `'medium'`, so the field is informational but
not yet adaptive. The enhancement plan does not require adaptive confidence at this stage.
Acceptable for Phase 2 but worth noting for Phase 3.

### QF-5: `PRESERVE_COMMENT_PATTERNS` in the sanitizer copy preserves "supericons motion lab"

The runtime copy of `public-metadata-sanitizer.js` is byte-for-byte identical to `lib/`.
That means the line:
```js
/^\s*supericons motion lab\s*$/i,
```
is preserved in both. This is correct because the converter also strips Motion Lab provenance
comments from vectorized SVG output. No issue.

---

## 5. Verification Claim Audit

The agent reported three passing gates:

1. `npm --prefix mcp run verify:package` -- **Accepted.** The updated `expectedFiles` list
   now includes `runtime/converter-workflow.js` and `runtime/public-metadata-sanitizer.js`.
   The script would have failed if either was missing from the tarball.

2. `npm run verify:converter-mcp-clean-install` -- **Accepted.** The smoke test covers:
   - options export shape including `workflow.recommendedOrder`
   - `inspectConverterInput` shape with a real PNG fixture
   - `convertSvgToPng` output and request shape
   - `convertPngToSvg` output, SVG text, and request shape
   - invalid input rejection (empty string)

3. `npm run build` -- **Accepted as a regression fence only.** This confirms no build-time
   breakage was introduced. It does not prove converter correctness (acknowledged in prior audit
   finding F-6).

---

## 6. Summary

**The package-readiness objective is fully achieved.**

All four original structural blockers are closed:
- The package boundary violation is fixed.
- `@neplex/vectorizer` is now declared and pinned correctly.
- The runtime files are in the tarball allowlist.
- Clean-install verification is in place and includes all required smoke checks.

**Bonus deliveries (Phase 2 Workstream B, partial):**
- `inspect_converter_input` is live and registered as a Pro-gated MCP tool.
- `inspect_converter_options` is significantly enriched with guidance and starter combinations.
- The clean-install smoke test validates both against a real clean-install environment.

**Two prior findings remain open at low/medium severity:**
- F-2: Plan residual-risk section should note that `mcp/runtime/` and `lib/` copies will diverge.
- F-6: Plan should clarify that `npm run build` is a regression fence, not a converter proof.

**Four quality findings are noted (QF-1 through QF-4) -- all low severity, none blocking.**

**Phase 2 (agent decision support) is now partially delivered. The logical next step is to
confirm whether `suggest_converter_settings` is still needed given that `inspectConverterInput`
already returns `recommendedSettings`, or whether Phase 3 (docs) should proceed next.**
