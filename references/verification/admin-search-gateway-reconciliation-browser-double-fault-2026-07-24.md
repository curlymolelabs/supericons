# Admin search gateway gate browser stop

Date: 2026-07-24

## Status

The five-probe production gate has not run. The website probe stopped before entering a query. Hosted MCP, Local MCP, and both direct gateway probes were not started. No telemetry implementation, schema, configuration, or deployment change was made.

## Exact failure evidence

Attempt 1 opened `https://supericons.dev` at a 1440 by 1000 viewport. The production page contained `#searchInput`, but Playwright observed it as hidden for 60 seconds.

The first correction followed the production source contract: if the search input is hidden, click `#searchToggle`.

A focused, query-free browser check then found both elements in the page:

- `#searchInput` existed but was hidden.
- `#searchToggle` existed but was also hidden.

The toggle remained hidden for the full 30-second click timeout. This repeated the same browser-state boundary after one correction, so the gate stopped under the double-fault rule.

## Most likely explanations

1. The production root URL opens the landing view, while the searchable icon application requires the established icon view route such as `?view=icons`.
2. The landing page requires a visible Browse action before the application header and its search controls become available.
3. The production deployment has a different initial view or responsive-state rule from the local source snapshot, so a source-only selector assumption is insufficient.

## Next safe experiment

Run one query-free browser inspection that compares:

- `https://supericons.dev`
- `https://supericons.dev/?view=icons`

For each page, record:

- final URL;
- `body` view state;
- visibility of `#searchInput`;
- visibility of `#searchToggle`; and
- the visible Browse or All Icons control, if present.

If the icon view exposes the real search input, update the gate to reach that view through the visible production flow, then rerun the five probes once. Do not bypass the page by calling `/search-icons` for case 1.

## Preserved evidence

The failed write-once artifact is:

`references/verification/admin-search-gateway-reconciliation-before-20260724T134810Z.json`

Its verdict is `gate_execution_failed`, and its failure is limited to the hidden production website search input. It contains no credentials or marker signatures.
