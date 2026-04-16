# Converter MCP Package Readiness Implementation Plan

Date: April 13, 2026
Status: Ready for implementation
Scope: Converter MCP runtime/package readiness only

Depends on:
- [converter-mcp-agent-library-enhancement-plan.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/plans/converter-mcp-agent-library-enhancement-plan.md)
- [index.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/mcp/index.js)
- [converter.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/mcp/converter.js)
- [package.json](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/mcp/package.json)
- [converter-workflow.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/lib/converter-workflow.js)
- [public-metadata-sanitizer.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/lib/public-metadata-sanitizer.js)
- [verify-motion-lab-mcp-package.mjs](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/scripts/verify-motion-lab-mcp-package.mjs)
- [verify-motion-lab-mcp-clean-install.mjs](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/scripts/verify-motion-lab-mcp-clean-install.mjs)
- [motion-lab-mcp-implementation-audit.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/motion-lab-mcp-implementation-audit.md)

## Objective

Make the converter MCP surface load and run cleanly from a fresh package install.

This slice does **not** add new converter tools yet.

It makes the existing converter tools trustworthy as a distributed MCP surface:

- `inspect_converter_options`
- `convert_svg_to_png`
- `convert_png_to_svg`

## Why This Must Come First

Today the converter MCP surface works in the monorepo, but it is not yet a safe foundation for broader agent-surface work.

The current blockers are structural:

1. [converter.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/mcp/converter.js) imports `../lib/converter-workflow.js`, which is outside the `mcp/` package boundary.
2. [converter-workflow.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/lib/converter-workflow.js) imports `@neplex/vectorizer`.
3. [package.json](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/mcp/package.json) does not currently declare `@neplex/vectorizer`.
4. Existing MCP package verification is Motion Lab-biased and does not prove converter imports and converter execution in a fresh install.

If we skip this and jump to richer docs or new agent tools, we risk improving a surface that still breaks outside the repo.

## Decision

Use a **self-contained package-local converter runtime** inside `mcp/`.

Do **not** keep converter package execution dependent on files living outside the package root.

That means this phase should:

- copy the converter runtime logic into the `mcp/` package boundary without deleting the `lib/` originals
- copy the SVG sanitizer helper that the converter runtime depends on without deleting the `lib/` original
- explicitly declare the converter runtime dependencies in `mcp/package.json`
- verify converter imports and simple conversion behavior in a clean-install smoke test

## Chosen Approach

### 1. Internalize the converter runtime into `mcp/`

Create a package-local converter runtime module under `mcp/`.

Important rule:

- **copy, do not delete**

Do not delete:

- [converter-workflow.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/lib/converter-workflow.js)
- [public-metadata-sanitizer.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/lib/public-metadata-sanitizer.js)

The `lib/` originals still support non-MCP/browser-side converter paths and should remain in place unless a separate boundary-unification pass is approved later.

Recommended shape:

- `mcp/runtime/converter-workflow.js`
- `mcp/runtime/public-metadata-sanitizer.js`

Then update:

- [converter.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/mcp/converter.js)

to import from the new local runtime path instead of `../lib/...`.

Why this approach:

- keeps package semantics simple
- avoids tarball-boundary ambiguity
- avoids runtime imports that silently work only inside the monorepo
- makes verification much easier

### 2. Declare runtime dependencies explicitly

Add the missing converter dependency to:

- [package.json](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/mcp/package.json)

Expected addition:

- `@neplex/vectorizer` at the same version pin used by the root package: `^0.0.5`

Keep:

- `@resvg/resvg-js`
- `zod`
- `@modelcontextprotocol/sdk`

The goal is that a fresh `npm install supericons-mcp` includes what the converter tools actually need.

### 3. Expand package allowlist

Update the `files` allowlist in:

- [package.json](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/mcp/package.json)

to include the new package-local runtime files.

This ensures `npm pack` includes the converter runtime instead of only the thin shim.

### 4. Expand package verification

Update:

- [verify-motion-lab-mcp-package.mjs](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/scripts/verify-motion-lab-mcp-package.mjs)

so it checks the new converter runtime files in the tarball.

This script should probably be renamed in a later cleanup pass, but renaming is optional for this phase.

What matters now is that package verification no longer ignores converter runtime packaging.

### 5. Add clean-install converter smoke verification

Create a new clean-install smoke script parallel to the Motion Lab one.

Recommended file:

- `scripts/verify-converter-mcp-clean-install.mjs`

This script should:

1. create a temp install directory
2. `npm pack` the local `mcp/` package
3. install the tarball into a fresh temp project
4. import the installed converter module
5. verify:
   - `getConverterMcpOptions()` works
   - `convertSvgToPng()` works on a tiny inline SVG fixture
   - `convertPngToSvg()` can be imported and executed against a small PNG fixture
   - invalid input rejection works and throws clearly instead of failing silently

The PNG fixture should be tiny and local so the test stays fast and deterministic.

Preferred shape:

- use a tiny inline base64 PNG literal directly in the script
- keep it self-contained instead of introducing a larger fixture file unless there is a strong need

### 6. Add package-level script wiring

Add a root script to:

- [package.json](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/package.json)

Recommended script:

- `verify:converter-mcp-clean-install`

Optionally extend the `mcp/` package verify script so it covers converter readiness too.

## Files Likely To Change

Core runtime/package files:

- [converter.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/mcp/converter.js)
- [package.json](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/mcp/package.json)
- [package.json](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/package.json)

New package-local runtime files:

- `mcp/runtime/converter-workflow.js`
- `mcp/runtime/public-metadata-sanitizer.js`

Verification:

- [verify-motion-lab-mcp-package.mjs](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/scripts/verify-motion-lab-mcp-package.mjs)
- `scripts/verify-converter-mcp-clean-install.mjs`

Possibly touched if we want cleaner naming:

- `mcp/package.json` verify script name

## What This Phase Deliberately Does Not Do

This phase does **not**:

- add `inspect_converter_input`
- add `suggest_converter_settings`
- rewrite converter docs
- solve browser-converter quality limitations
- connect the browser proof-service to production

Important clarification:

The `converter:proof-service` command in the root [package.json](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/package.json) is part of the browser-side converter experimentation/proof path.

It is not required to make the existing converter MCP surface package-safe.

So this implementation slice should stay focused and not drift into proof-service rollout.

## Verification Requirements

This phase is only complete if all of the following pass:

1. `npm --prefix mcp run verify:package`
2. `npm run verify:converter-mcp-clean-install`
3. `npm run build`

And the clean-install converter smoke must prove:

- package import works outside the monorepo
- SVG-to-PNG works
- PNG-to-SVG works
- invalid input rejection works
- no missing dependency/import failure occurs

Important clarification:

- `npm run build` is a regression fence, not a converter correctness proof
- it proves the refactor did not break the main application build pipeline
- the converter-specific correctness proof comes from the package and clean-install verification steps above

## Residual Risks After This Phase

Even after package readiness is fixed, converter will still have open product-quality questions:

- setting selection is still hard for agents
- docs are still weaker than Motion Lab
- browser converter quality claims still need separate treatment
- `mcp/runtime/converter-workflow.js` can drift from [converter-workflow.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/lib/converter-workflow.js) over time if both evolve independently

That is acceptable.

This phase is explicitly about making the current converter MCP surface a valid foundation for those next improvements.

## Recommended Next Slice After This Phase

Once package readiness is proven, the next implementation plan should focus on **agent decision support**, likely in this order:

1. enrich `inspect_converter_options`
2. add `inspect_converter_input`
3. add `suggest_converter_settings`

That would make converter feel much closer to a real agent library instead of a raw transformation endpoint.

## Bottom Line

This phase should make one promise true:

"The converter MCP tools that exist today can be installed, imported, and executed cleanly outside the repo."

Once that is true, the richer converter-agent work becomes worth doing.
