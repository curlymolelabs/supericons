# Animated SVG XML Parse Fix Plan

## Problem

- User-visible failure:
  - Downloaded animated SVG fails to open in browser with:
    - `xmlParseEntityRef: no name`
    - line 1, column 128
- Affected artifact:
  - `docs/certificate-seal-animated.svg`

## Audit Findings

### Finding 1 (Critical): Exported animated SVG contains raw `&` inside inline `<style>` content

- Evidence:
  - `docs/certificate-seal-animated.svg` has one unescaped ampersand at index `126`
  - first line contains:
    - `/* Security & Auth Collection: ... */`
  - XML parser fails exactly at that position
- Why this breaks:
  - SVG is parsed as XML; raw `&` in element text is treated as entity start and must be escaped unless valid entity syntax follows

### Finding 2 (Critical): Animated export path injects CSS directly into `<style>` without XML-safe escaping

- Source:
  - `buildAnimatedSvg()` injects `const styleTag = \`<style>${css}</style>\`` in [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1592)
- Impact:
  - Any raw XML-reserved character in CSS text (`&`, potentially `<`) can produce invalid exported SVG

### Finding 3 (High): CSS extraction currently keeps prose comments, including `&`

- Source:
  - `extractIconCSS()` preserves matched CSS blocks and comments in [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1533)
- Impact:
  - Human-readable comments from bundle CSS are carried into exported SVG style text and can introduce invalid XML characters

### Finding 4 (High): Both copy and download animated paths share the same broken builder

- Source:
  - `Copy Animated SVG` and `Download Animated SVG` both call `buildAnimatedSvg()` in [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2450) and [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2483)
- Impact:
  - Bug affects both copied and downloaded animated SVG output, not just one button

## Root Cause

- The animated exporter writes raw CSS text directly into XML `<style>` without XML-safe encoding/packaging.
- Extracted CSS can include prose comments containing `&` (for example collection names like `Security & Auth`), which makes SVG XML invalid.

## Fix Strategy

### Phase 1: Make inline SVG style content XML-safe at the final emit point

- Add a dedicated helper for animated SVG style serialization, for example:
  - `serializeSvgStyleText(cssText)`
- Apply it only when injecting `<style>` in `buildAnimatedSvg()`.
- Required behavior:
  - ensure raw `&` and other XML-sensitive tokens cannot break output
  - preserve CSS semantics for preview and export

Recommended implementation:

1. normalize style text
2. escape XML-sensitive chars in style text (minimum `&`, and guard `<`)
3. inject sanitized text into `<style>...</style>`

Note:
- Keep selector and animation rewriting logic unchanged.
- Do not alter entitlement checks, pack access, or export button wiring.

### Phase 2: Strip or sanitize CSS comments during extraction

- In `extractIconCSS()`, remove comment blocks before final join, or sanitize them before emit.
- Goal:
  - eliminate prose comment payload from exported SVG styles
  - reduce chance of future invalid XML from comment text

### Phase 3: Optional dev-time export validity guard

- In DEV only, add a lightweight XML validity check before download/copy toast success.
- If invalid, fail safely with warning and user-facing toast.
- This is a guardrail, not runtime production blocking.

## Verification Plan

### File-level validation

- Re-export `certificate-seal` animated SVG.
- Confirm no unescaped `&` remain in style text:
  - regex check for raw `&(?![A-Za-z#][A-Za-z0-9]*;)`
- Parse with XML parser successfully.

### Product behavior validation

- `Download Animated SVG` outputs valid XML for:
  - `security-auth / certificate-seal`
  - at least one other pack with comments in CSS header
- `Copy Animated SVG` text pastes and opens as valid SVG in browser.
- Premium preview animation still works in customize panel.

### Regression checks

- `Copy SVG (static)` unchanged.
- `Download PNG` unchanged.
- Locked premium behavior unchanged.
- Build passes:
  - `npm run build`

## Risks And Mitigations

- Risk:
  - Over-sanitizing style text could alter CSS behavior.
- Mitigation:
  - keep sanitization narrowly scoped to XML safety and validate animation playback on at least two premium icons.

- Risk:
  - Comments stripping may remove useful debugging context.
- Mitigation:
  - keep comments in source bundles; only strip in emitted standalone export payload.

## Implementation Scope

- Primary file:
  - `store.js`
- No layout or UI structure changes required.
- No auth/entitlement logic changes required.
