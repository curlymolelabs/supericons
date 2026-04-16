## Motion Lab Progressive Refinement Plan

### Goal

Replace the four Motion Lab placeholder pages with real documentation that matches the approved docs voice and reflects the current product accurately.

### Source of truth

- Use [overview-mcp-setup-master.md](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/plans/overview-mcp-setup-master.md) for section order and progressive rollout.
- Use [docs-copy-bible.md](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/docs-copy-bible.md) as the page-copy source of truth for Motion Lab.
- Sanity-check preset names, categories, trigger support, and parameter ranges against the live Motion Lab source before publishing.

### Progressive order

1. **Motion Lab**
   - Replace the placeholder with the real introduction page.
   - Explain what Motion Lab is, how to access it, what it produces, and where to go next.

2. **Motion Lab Presets**
   - Publish the full preset reference.
   - Include the 12-preset table, parameter ranges, and category guidance.

3. **Trigger Types**
   - Publish the loop, hover, and click behavior guide.
   - Add the summary table so behavior differences are easy to scan.

4. **Motion Lab Exports**
   - Publish the CSS-versus-animated-SVG guide.
   - Include usage steps, code examples, compatibility guidance, and the decision table.

### Writing rules for this pass

- Keep the approved copy language and tone from the copy bible.
- Use the current docs shell patterns already established in the Overview, MCP Setup, and MCP Reference sections.
- Keep the layout minimal: open reading flow, surfaced code blocks, compact callouts, and small cards only where they help navigation.
- Add internal links where they improve navigation, especially between Motion Lab pages and the Motion Lab MCP tools reference.

### Verification

- Confirm the 12 preset names and categories match the live Motion Lab source.
- Confirm all presets support `loop`, `hover`, and `click`.
- Confirm duration and intensity ranges match the live workflow limits.
- Run:
  - `node --check docs-pages.js`
  - `node --check store.js`
  - `npm run build`
- Browser-check:
  - `/?view=docs-motion-lab`
  - `/?view=docs-motion-lab-presets`
  - `/?view=docs-motion-lab-triggers`
  - `/?view=docs-motion-lab-exports`

### Outcome

After this pass, the Motion Lab section will be fully real and no longer rely on placeholders. The next progressive section after that is Converter.
