## Entitlement Clarity First Pass Implementation Plan

### Goal

Apply the first entitlement clarity pass to the pages that are most visible and most likely to mislead users today.

This pass makes one distinction explicit:

- users can open Motion Lab and Converter in the browser
- users can use the controls and preview the result
- users need Pro or eligible collection access to export, download, or copy the final output

MCP pages keep their existing binary premium wording, because MCP access is already documented correctly.

### Scope for this pass

This pass updates only the approved browser-facing copy changes:

1. **Docs home**
   - Refine the Motion Lab card body so it signals preview first, then export

2. **What Is Supericons**
   - Refine the product explanation so Motion Lab and Converter are not framed as fully Pro-gated
   - Replace the misleading browser rows in the Free vs. Pro table with clearer capability rows

3. **Motion Lab**
   - Refine the page summary
   - Rewrite the browser access bullet
   - Split browser entitlement from MCP entitlement

4. **Motion Lab Exports**
   - Refine the page summary
   - Add entitlement cues to the export steps so users know which step is free and which step needs premium access

5. **Converter placeholders**
   - Replace the internal-looking placeholder summaries with user-facing interim copy
   - Make the preview-versus-download distinction clear until the full Converter section is written

### Copy rules

- Use the browser entitlement model consistently:
  - open, use controls, and preview
  - export, download, or copy the final output
- Use `without Pro` or `with Pro or eligible collection access`
- Do not introduce unverified claims like `no account required`
- Keep MCP wording unchanged in this pass

### Not included in this pass

These stay for the next entitlement pass:

- `Pro and Collections`
- `API Keys`
- `Troubleshooting`

### Verification

Run:

- `node --check docs-pages.js`
- `node --check store.js`
- `npm run build`

Browser-check:

- `/?view=docs`
- `/?view=docs-what-is-supericons`
- `/?view=docs-motion-lab`
- `/?view=docs-motion-lab-exports`
- `/?view=docs-converter-guide`
- `/?view=docs-converter-png-to-svg`
- `/?view=docs-converter-svg-to-png`
- `/?view=docs-converter-settings`

### Outcome

After this pass, the main browser-facing docs will no longer imply that Motion Lab and Converter are entirely locked behind Pro. Users will understand that exploration is open, while output is the gated premium action.
