# Purpose Menu Taxonomy Plan

## Goal

Build a better purpose menu for Supericons so designers and developers can browse icons by real work intent, not only by library or exact search word.

This menu should help a user answer: "What kind of icon do I need for this part of my product?"

## Why This Matters

Exact search is not enough. Users often think in product jobs:

- I need a sidebar icon.
- I need an empty-state icon.
- I need something for billing.
- I need a security icon.
- I need a chart or report icon.
- I need something for AI, prompt, dataset, or model.

The current Supericons purpose filter is a good start, but verified source code shows it only has three job categories today:

- AI & Agents
- Navigation & Wayfinding
- Status & Feedback

That is too narrow for launch-grade browse UX.

## Research Notes

Icon category systems commonly include both broad product-use buckets and visual/style buckets.

Useful external references:

- Iconfinder lists categories such as computer security, data analysis and databases, electronic devices, files and folders, maps and navigation, shopping and e-commerce, social media, user interface, and web development/design: https://www.iconfinder.com/categories
- Material Symbols groups icons by categories such as Action, Alert, Communication, Device, Editor, File, Hardware, Image, Navigation, Notification, Social, and Toggle: https://material-symbols-svg.vercel.app/
- Composables shows a broad icon category set including Accessibility, Accounts and access, Action, Arrows, Charts, Commerce, Communication, Data, Design, Coding and development, Devices, Files and folders, Finance, Media, Navigation, Security, Shopping, Text formatting, Time and calendar, Tools, and Weather: https://composables.com/icons/categories
- Pikaicons uses practical buckets such as Arrows & Navigation, Devices & Gadgets, Files & Folders, Media & Multimedia, and Security & Protection: https://pikaicons.com/categories

The attached Iconstack screenshots show a category dropdown that mixes style-like entries, such as Light, Line Duotone, Linear, Outline, and Thin, with purpose entries, such as AI, Analytics, Animals, and Application.

Supericons should do better by separating:

- Style filters: outline, solid, filled, duotone, thin, bold, brand.
- Purpose filters: what the user is trying to represent.

## Recommended Menu Model

Use a two-layer model:

1. Primary purpose menu for browsing.
2. Optional style controls elsewhere, not inside the purpose menu.

The purpose menu should contain human-friendly categories with counts.

Recommended launch categories:

1. AI & Automation
   - model, prompt, dataset, evaluation, workflow, agent, bot, token, memory, retrieval

2. Navigation & Layout
   - home, menu, arrows, chevrons, sidebar, dashboard, grid, tabs, fullscreen, wayfinding

3. Actions & Controls
   - add, edit, delete, upload, download, refresh, filter, sort, settings, play, pause

4. Status & Feedback
   - success, warning, error, info, loading, progress, notification, favorite, rating

5. People & Accounts
   - user, profile, team, group, contact, identity, role, permission

6. Communication
   - message, mail, chat, comment, phone, announcement, language

7. Files & Content
   - file, folder, document, image, text, attachment, archive, clipboard

8. Data & Analytics
   - database, table, chart, report, metrics, dashboard, graph, trend

9. Commerce & Finance
   - cart, shop, payment, credit card, receipt, invoice, wallet, currency, discount

10. Security & Access
    - lock, key, shield, verified, access, privacy, scan, fingerprint, blocked

11. Media & Playback
    - play, pause, video, audio, camera, image, gallery, music, volume

12. Devices & Hardware
    - phone, desktop, laptop, monitor, printer, chip, server, plug, battery

13. Code & Development
    - code, terminal, API, package, branch, git, bug, deploy, webhook

14. Design & Editing
    - palette, brush, pen, crop, align, typography, layer, swatch

15. Maps, Places & Travel
    - map, pin, location, compass, route, building, transport, globe

16. Time & Calendar
    - clock, calendar, schedule, timer, history, alarm

17. Brands & Social
    - logos, companies, social networks, platforms, products

18. Nature, Weather & Lifestyle
    - sun, moon, cloud, snow, leaf, food, animal, health, sport

## UX Recommendations

The menu should not be a long flat list only.

Recommended behavior:

- Show top 8-12 popular purpose categories first.
- Include "All purposes" at the top.
- Include search inside the purpose menu.
- Show counts beside each purpose.
- Allow one purpose filter at launch; design the data model so multi-select can come later.
- Keep style filters separate from purpose filters.
- Add short helper text under each purpose in docs or tooltip, not inside every menu row.
- When a user searches text and selects a purpose, combine both filters.
- When no results are found, suggest clearing either the text search or the purpose filter.

## Data Model Recommendation

Do not hard-code this as only a small manual list forever.

Use a maintained taxonomy file that maps each purpose to:

- id
- label
- short description
- synonyms
- icon concepts
- preferred libraries or examples
- display rank

Then generate icon membership from semantic registry fields where possible:

- label
- source_name
- semantic_tags
- synonyms
- use_when
- category
- purpose

Allow manual overrides for high-value icons, but keep overrides small and reviewable.

## Suggested Files

Likely affected files:

- `lib/icon-taxonomy-seed.js`
- `lib/icon-grid-behavior.js`
- `main.js`
- `index.html`
- `styles.css`
- `scripts/verify-icon-grid-behavior.mjs`
- new taxonomy source, for example `data/icon-purpose-taxonomy/icon-purpose-taxonomy.json`
- generated browser/MCP artifact if needed, for example `lib/generated-icon-purpose-taxonomy.js`

## Implementation Plan

1. Audit the current purpose filter.
   - Confirm where it appears.
   - Confirm whether it is hidden outside All Icons.
   - Confirm current category counts.

2. Create the purpose taxonomy source.
   - Add the launch categories above.
   - Add synonyms and icon concepts for each category.
   - Keep style terms out of purpose categories.

3. Build or update taxonomy generation.
   - Map icons to purpose categories from semantic registry fields.
   - Preserve manual curated seed entries for high-confidence icons.
   - Generate counts per category.

4. Redesign the menu UI.
   - Replace or complement the current chip bar with a dropdown when category count grows.
   - Keep it keyboard accessible.
   - Show counts.
   - Include purpose search if the list becomes long.

5. Add quality checks.
   - Verify every purpose category has at least one mapped icon.
   - Verify important launch queries have expected category results.
   - Verify style terms are not mixed into purpose taxonomy.

6. Add manual spot checks.
   - AI & Automation
   - Data & Analytics
   - Commerce & Finance
   - Security & Access
   - People & Accounts
   - Code & Development

7. Verify.
   - `npm run verify:icon-grid-behavior`
   - `npm run verify:docs-site-render`
   - `npm run build`
   - Browser smoke test All Icons with several purpose filters.

## Acceptance Criteria

- Purpose menu has useful categories beyond the current three.
- Style filters are separate from purpose categories.
- Designers can browse by product job, such as dashboard, billing, files, media, security, or AI.
- Developers can browse by implementation job, such as API, code, deploy, database, or settings.
- Counts are visible.
- Search and purpose filter work together.
- Empty states explain what to change.
- The taxonomy is maintainable without manually editing thousands of icon records.

## Recommended Next Step

Do not build the full UI immediately in one jump.

First implement the taxonomy source and generation checks. Then wire the menu UI once the category mapping is trustworthy.
