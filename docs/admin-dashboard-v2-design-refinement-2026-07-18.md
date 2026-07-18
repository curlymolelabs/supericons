# Admin dashboard v2: design refinement audit

- Date: 2026-07-18
- Source: auditor layout review of the live round-2 dashboard (owner screenshots) plus owner naming decisions.
- Scope: presentation and information design only. No data semantics change here; the search-ids-and-page-sync fix plan runs first or alongside, and its naming contract absorbs the renames below.

## Owner-decided renames (binding)

- Page names: Overview / **Searches** (was Search Intelligence) / **Users** (was Audience).
- Within the Users page, keep the two-group split from the sync fix plan with precise section titles: "Searchers" (activity-linked, filtered) and "Accounts" (all-time registry). The page name is broad; the section labels carry the precision.
- The distinct-source term is "searchers" per the earlier decision; "accounts" for registered and Pro.

## Refinements, ordered by impact

### R1. Merge the two header rows into one band
The global text search sits in its own top row while period chips, venue, and the test toggle sit in a second row below the page title. Combine into a single sticky header band: search field, period chips, venue select, toggle, Refresh. One glance shows the whole active scope; vertical space returns to data.

### R2. Freshness line loses the milliseconds
"Up to date, loaded in 3,031 ms" is engineering trivia in prime space. Display "Up to date" or "Updated 4:47 PM" with the load-time figure moved into the tooltip or diagnostics drawer. When any panel is stale or failed, this line names the panel (the sync fix plan already requires per-panel truth).

### R3. Exceptions-only pills in tables
When nearly every row carries the same pill, the pill is noise. Rules: show a venue chip only when the venue differs from Hosted MCP (the dominant venue); show plan pills only for Registered and Pro, never a Free pill on anonymous rows; show country only when known (no Unknown pills, per the sync plan). Rows become quieter and the exceptions become visible at a glance.

### R4. Clamp long query text
Agent task descriptions wrap to four or five lines in Latest Activity and the explorer. Clamp query text to two lines with an expand affordance on the row. Full text in the row's detail view and on export.

### R5. Charts must earn their height
The funnel trend currently renders a large chart of a flat zero line. Rule: a chart whose series contains no signal for the window collapses to a compact sparkline row with its current value ("Registered: 0 in this window"), expanding automatically once variation exists. Prime vertical space goes to panels with information.

### R6. Users page ordering while pre-revenue
Lead with the lists that have data today: Accounts and Searchers tables first, the funnel strip compact above them (numbers only, sparkline inline), the full funnel chart in expanded form only when nonzero. Revisit ordering when registration volume grows.

### R7. Sidebar to icon-plus-label rail or top tabs
Three pages do not need a 210px column. Either compress the sidebar to a slim rail (icon plus short label) or move the three page names to tabs beside the logo in the header band from R1. Reclaimed width goes to the explorer and tables, which are column-hungry.

### R8. Density from padding, not font size
The round-2 fix already raises chart and small-label fonts. Pair it with slightly tighter row padding in tables so the net effect is more readable AND more rows per screen. Target: comfortable 13px body in tables, row height reduced roughly 15 percent from current.

### R9. Relative time with absolute on hover
First seen and Last seen columns show full date-time pairs that mostly read "today". Use relative display ("2h ago", "Jul 16") with the precise timestamp on hover and in exports.

### R10. Collapse duplicated timestamps in Activity
Latest Activity rows on the same day repeat the date; show the date once as a group separator and per-row times only, as commonly done in feeds.

## Keep as is (verified good)

Dark theme and orange accent consistency; outcome pill color language (green/red/blue); CSV and JSON exports on every list; skeleton loaders and stale-while-revalidate; scope labels arriving in the sync fix; the diagnostics drawer pattern; the single global filter contract.

## Sequencing

The search-ids-and-page-sync fix plan (correctness) completes first or in the same branch; these refinements are UI-only and must not alter any data semantics defined there. One combined round-3 walkthrough covers both.

## Acceptance

Round-3 owner walkthrough: pages named Overview, Searches, Users; one header band; no noise pills; no flat-line hero charts; tables denser yet more readable; long queries clamped; freshness honest and human. Every previous done-criterion from the sync fix plan still holds.
