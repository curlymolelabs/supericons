## Entitlement Clarity Audit Plan

### Goal

Clarify the user-facing access model for Motion Lab and Converter so the docs reflect the real product experience:

- Users can open the tools in the browser
- Users can use the controls
- Users can preview the result
- Users cannot export, download, or copy the final output unless they have Pro or eligible collection access

This pass should remove any wording that wrongly suggests the tools are entirely unavailable without Pro.

### Core messaging to standardize

Use one clear entitlement model everywhere:

- **Open, use controls, and preview:** available in the browser
- **Export, download, or copy the final result:** requires Pro or eligible collection access
- **MCP workflow tools:** require authenticated premium access where applicable

This distinction should be explicit whenever a page discusses Motion Lab, Converter, Pro, or collection access.

### Audit focus

Review every page and table that currently collapses exploration and export into one broad “access” statement.

### Highest-priority pages

Audit and refine these first:

1. **What Is Supericons**
   - Top-level product explanation
   - Free vs. Pro table

2. **Motion Lab**
   - Browser-access explanation
   - Export entitlement wording

3. **Converter Guide**
   - Browser-access explanation
   - Export entitlement wording

4. **Pro and Collections**
   - What Pro unlocks
   - What purchased collections unlock

5. **API Keys**
   - What a key enables
   - What a key does not enable by itself

6. **Troubleshooting**
   - Access-error explanations
   - Export-failure guidance

### Table audit

Any binary Free/Pro table rows that currently imply “no browser access” should be broken into clearer capability rows.

Examples of the current problem:

- `Motion Lab: animation presets, browser`
- `Converter: PNG to SVG, browser`
- `Converter: SVG to PNG, browser`

Recommended direction:

- `Open and use Motion Lab in browser`
- `Export Motion Lab CSS or animated SVG`
- `Open and use Converter in browser`
- `Export converted file`

This makes the entitlement boundary obvious.

### Wording audit

Find and review phrases such as:

- `requires Pro`
- `available with Pro`
- `Both paths require`
- `Pro subscribers also get access`
- `requires a Pro account`

Each instance should be rewritten to specify whether it refers to:

- browser exploration and preview
- export and download
- premium MCP tool access

If the sentence does not make that distinction, it needs refinement.

### Browser vs MCP audit

Do not treat browser access and MCP access as the same entitlement story.

Browser language should explain:

- users can open the tool
- users can use the controls
- users can preview the result
- export is gated

MCP language should explain:

- which tools are premium
- what the API key unlocks
- when premium access is required for output

### CTA and summary audit

Review short-form copy as well:

- docs home cards
- Quickstart guidance
- Motion Lab overview cards
- Converter overview cards
- pricing-adjacent descriptions

Short summaries should not imply that all Motion Lab or Converter usage is premium if only export is gated.

### Recommended rewrite order

1. **What Is Supericons**
2. **Motion Lab**
3. **Converter Guide**
4. **Comparison tables**
5. **Pro and Collections**
6. **API Keys**
7. **Troubleshooting**
8. **CTA and summary cleanup**

This order fixes the user’s mental model first, then the supporting details.

### Acceptance check

The pass is complete when the affected pages clearly answer:

- Can I open the tool?
- Can I use the controls?
- Can I preview the result?
- What exactly requires Pro or collection access?
- Does the browser experience differ from MCP access?

If any page leaves those questions ambiguous, it still needs refinement.
