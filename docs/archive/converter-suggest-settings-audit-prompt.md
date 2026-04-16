# Converter MCP Audit Prompt: Is `suggest_converter_settings` Worth Adding?

## Goal

Determine whether Supericons should add a new MCP tool such as:

- `suggest_converter_settings`
- `recommend_converter_settings`

The question is not whether such a tool is possible.

The question is whether it would add meaningful product value beyond the current converter MCP surface.

## Current State

The converter MCP surface already includes:

- `inspect_converter_options`
- `inspect_converter_input`
- `convert_svg_to_png`
- `convert_png_to_svg`

Current capabilities already cover:

- option discovery
- workflow order guidance
- starter combinations
- PNG input inspection
- recommended settings and rationale after inspecting a real PNG
- structured conversion outputs with warnings, metrics, and resolved request settings

## Important Context

`inspect_converter_input` already returns:

- input metadata
- structural assessment
- likely risks
- `recommendedSettings`
- `nextStep.recommendedSettings`

So a new `suggest_converter_settings` tool should only be recommended if it solves a workflow gap that the current surface does **not** already solve well.

## Files To Review

Implementation:

- [index.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/mcp/index.js)
- [converter.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/mcp/converter.js)
- [converter-workflow.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/mcp/runtime/converter-workflow.js)
- [verify-converter-mcp-clean-install.mjs](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/scripts/verify-converter-mcp-clean-install.mjs)

Docs and planning:

- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js)
- [converter-mcp-agent-library-enhancement-plan.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/plans/converter-mcp-agent-library-enhancement-plan.md)
- [converter-mcp-agent-decision-support-audit.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/converter-mcp-agent-decision-support-audit.md)

## Questions To Answer

1. Is there a real agent workflow where settings guidance is needed **before** the PNG input exists?
2. If yes, how common and important is that workflow compared with the existing inspect-then-convert flow?
3. Would `suggest_converter_settings` produce meaningfully different output from `inspect_converter_input`, or mostly duplicate it?
4. Would adding the tool improve agent success, or mostly increase MCP surface area and maintenance cost?
5. If a new tool is justified, what is the smallest correct input contract for it?

## Desired Verdict

Please return one of these:

- **Add the tool now**
- **Do not add the tool**
- **Defer the tool until a clearer use case appears**

## Output Format

Please respond with:

1. Verdict
2. Why
3. Evidence from the current implementation
4. What would break or remain awkward if we do **not** add the tool
5. What the next best step should be instead if the tool is not justified
