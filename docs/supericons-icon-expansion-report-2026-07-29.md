# Supericons icon expansion: research, schema, and 40 new originals

Original work date: 2026-07-29
Corrective audit date: 2026-07-30
Expansion commits: `8342b9d12` through `d57626570`
Library change: 106 to 146 SI icons in the web and MCP catalogs
Release state: records remain draft, nothing pushed

## 1. Executive summary

The work added 40 original Supericons across three connected efforts:

1. Six icons recovered or adapted from prototype concepts.
2. A 34-icon proposal based on open-library coverage gaps and failed user searches.
3. The taxonomy, localization, registry, search, and migration work needed to make the icons usable.

The highest-value research finding remains outside the drawing work. Most failed demand themes
were caused by search language, stacked phrases, or missing synonyms rather than missing artwork.
That broader search repair should continue as a separate workstream.

All 40 records remain `draft`. They are prepared in local public build artifacts, but owner-controlled
promotion and outward release remain separate decisions.

## 2. What was added

| Category | Count | Icons |
|---|---:|---|
| Agent identity | 3 | `agent-scout`, `agent-wink`, `agent-pod` |
| Game assets | 2 | `game-pad`, `game-ghost` |
| Everyday objects | 3 | `toothpaste`, `house-key`, `screw` |
| Health and body | 2 | `bacteria`, `stomach` |
| Physical automation | 1 | `lawn-mower` |
| Agentic payments | 2 | `cashback`, `lottery-ticket` |
| Food and dining | 1 | `noodle-bowl` |
| Nature and animals | 2 | `dinosaur`, `fossil` |
| Personal care | 12 | `comb`, `hairbrush`, `hair-clipper`, `mascara`, `nail-polish`, `toothbrush`, `dental-floss`, `shampoo`, `lotion`, `sunscreen`, `cotton-swab`, `tweezers` |
| Kitchen | 12 | `plate`, `cutting-board`, `wok`, `toaster`, `mixer`, `grater`, `peeler`, `rolling-pin`, `tongs`, `colander`, `corkscrew`, `can-opener` |

The 34-icon proposal is complete. Its source file is now an empty array because every proposed
record has been moved into the main SI concept registry.

### Prototype origins

Five icons were recovered from inline prototype artwork in `supericons-v2-mvp/index.html`:
`agent-scout`, `agent-wink`, `game-pad`, `game-ghost`, and `toothpaste`.

`agent-pod` preserved the first capsule-shaped bacteria concept and recatalogued it as an agent
face after the bacteria artwork was redrawn.

## 3. Research findings

### 3.1 Open-library coverage

The coverage review examined Material, Lucide, Tabler, Phosphor, Heroicons, Bootstrap,
Ionicons, Iconoir, and MingCute.

Personal care was the widest gap. Oral care, grooming, cosmetics, and common toiletries were
poorly covered across the bundled libraries.

Kitchen dining basics were already covered, but preparation tools were not. The strongest gaps
were rolling pins, graters, peelers, tongs, colanders, corkscrews, can openers, cutting boards,
woks, mixers, toasters, and a plain dinner plate.

### 3.2 Search-log analysis

The 30-day failed-search review found 19 demand themes. Fifteen were mainly search problems:

- Non-English queries failed even when the English concept existed.
- Stacked phrases tried to match several nouns at once.
- Common synonyms such as `magnify`, `profit`, `cargo`, `noodle`, `parcel`, and `animal`
  were not mapped consistently.

The analysis also identified separate library-filter issues involving missing brand coverage
and the accepted but unbundled `sf_symbols` filter. Those remain search-platform work, not
reasons to draw more icons.

## 4. Record and schema decisions

### 4.1 Three-layer semantic coverage

Each record covers:

1. Appearance, meaning what a person sees and may type.
2. Role, meaning the job the icon performs.
3. Domain, meaning the product or activity area where it belongs.

This prevents role-heavy records from hiding obvious visual searches such as `wink`, `comb`,
or `bowl`.

### 4.2 Optional `avoid_when`

`avoid_when` is optional. It is present only when the drawing has a plausible visual misread.
Records without a genuine ambiguity omit the field. Public projections also omit the field
when it is absent.

This avoids invented restrictions written only to protect territory between similar icons.

### 4.3 Literal visual descriptions

`depicts` states only what is visible. Persona, use case, and product interpretation remain in
`purpose`, `semantic_tags`, and `synonyms`.

The corrective audit also aligned two records with their drawings:

- `dinosaur` now uses long-necked dinosaur and sauropod language rather than T-rex language.
- `fossil` no longer refers to a stone block that is not drawn.

## 5. Taxonomy and localization

Eight categories were added:

- `agent-identity`
- `game-assets`
- `everyday-objects`
- `health-body`
- `personal-care`
- `food-dining`
- `nature-animals`
- `kitchen`

The categories are registered in the browser and MCP taxonomy copies. Labels exist across all
12 supported locales in the data, public, and MCP catalog directories.

The tag menu reads the taxonomy seed rather than the record files. The tracked grid verifier
therefore checks every SI icon for a registered category, preventing icons from entering the
catalog while remaining unreachable from the tag menu.

## 6. Search delivery

Thirty-eight new icons are outline icons. `comb` and `dinosaur` are solid because their fine
repeated detail did not remain legible as outline artwork at 24px.

Default MCP search now treats `style: any` as all supported styles. It no longer removes solid
icons from the candidate set.

Exact ID, label, name, alias, and synonym matches are prioritized before broader semantic
results. The release verifier tests the exact name of every new icon through the real MCP tool.

## 7. Database delivery

The original April taxonomy migration remains historical and unchanged.

The expansion uses a new forward migration:
`supabase/migrations/20260730003000_supericons_icon_expansion_taxonomy.sql`.

It inserts or updates all 40 taxonomy rows, so both existing environments and fresh installs
receive the same mapping. The taxonomy snapshot exporter writes the public snapshot only and
no longer rewrites an already-applied migration.

## 8. Drawing and review workflow

Artwork was reviewed at large size and 24px. The reusable workflow is:

1. Gather real visual references.
2. Identify the one or two features that make the object recognizable.
3. Draw the SVG.
4. Render it at large and small sizes.
5. Update the literal description after any visual change.
6. Wire the icon only after the render reads correctly.

The local render harness respects each SVG's own fill and stroke settings. It rewrites only
the root SVG width and height, which preserves child rectangles and filled artwork.

## 9. Release verification

The corrective release gate covers:

- Full production build.
- Product-facts parity.
- SI registry build and public projection parity.
- Web and MCP catalog parity.
- Category and locale coverage.
- Zero orphaned SI icons.
- Default-style access to solid icons.
- Exact-name MCP discovery for all 40 icons.
- Forward migration coverage.
- Source and public handling of optional `avoid_when`.
- Visual rendering at large and 24px sizes.

Verified on 2026-07-30:

- `npm run build`
- `npm run verify:supericons-icon-expansion-release`
- `npm run verify:si-registry-source-boundaries`
- `npm run verify:icon-grid-behavior`
- `npm run verify:i18n-catalogs`
- `npm run verify:search-catalog-sync`
- `npm run verify:search-query-fixtures`
- `npm run verify:view-route-policy`
- `npm run verify:mcp-variant-access`
- Fresh render sheet for all 40 icons at large and 24px sizes

The release verifier checks all 40 rows in the forward migration and confirms that none were
added to the historical April migration. A live local migration run was not available because
the local Docker engine was not running.

## 10. Remaining decisions

### Promotion

All 40 records remain draft. Promotion is an owner-controlled release decision and is not
implied by completing the technical package.

### Broader search repair

The expansion fixes discovery for the 40 added icons. It does not close the wider multilingual,
stacked-query, brand-filter, or phantom-library findings from the search-log analysis.

## 11. Repository hygiene

`tmp/` is ignored and contains local reference images, render sheets, and scratch scripts.
`.claude/` is also ignored as local tool configuration.

Unrelated changes to the SI v2 charter pointer and the foundation audit briefing were not part
of this work and remain outside the corrective commit.
