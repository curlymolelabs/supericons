# Product Facts Drift Inventory

Date: April 19, 2026  
Scope: P0 product-facts and packs-title implementation

## Purpose

This inventory records the P0-visible count, version, and tool-count strings that drift today.  
Each entry is classified before any replacement work so we do not accidentally turn deliberate marketing copy into brittle exact copy.

## Repo-wide signal

- `20,000+` currently appears in `134` audited repo locations
- `60K+` currently appears in `17` audited repo locations
- `3 tools` currently appears in `16` audited repo locations
- `12 tools` currently appears in `13` audited repo locations

P0 does not clean the entire repo.  
P0 fixes the shared facts source, the first high-surface consumers, and the most visible contradictions.

---

## Classification Rules

### Marketing copy

Rounded, intentionally simplified public copy.

Examples:

- `20,000+ free icons`
- `10 libraries`

Intended source:

- shared product facts display labels
- or deliberate static rounded copy when runtime replacement is not worth it yet

### Product truth

Exact values that should reflect the actual product state.

Examples:

- exact free icon count
- exact premium collection count
- exact premium icon count

Intended source:

- shared product facts exact values

### Technical metadata

Implementation or package metadata that should match code or package sources exactly.

Examples:

- MCP tool count
- MCP server/package version

Intended source:

- shared product facts where appropriate
- package-local metadata for package version

---

## P0 Inventory

| File | Current text | Class | Intended source | P0 action |
|---|---|---|---|---|
| `package.json:6` | `60K+ free icons` | marketing copy | shared product facts rounded label | replace now |
| `mcp/package.json:3` | `0.3.1` | technical metadata | package-local truth | keep as source |
| `mcp/index.js:493` | `0.3.0` | technical metadata | MCP package version | replace now |
| `mcp/index.js:4` | `Provides 3 tools` | technical metadata | computed MCP tool count | replace now |
| `mcp/index.js:11` | `20,000+` | marketing copy | shared product facts rounded free-icons label | replace now |
| `docs-pages.js:631` | `12 tools` | technical metadata | shared product facts exact MCP tool count | replace now |
| `docs-pages.js:646` | `Search 20,000+ free icons across 10 libraries` | marketing copy | shared product facts rounded free-icons-and-libraries label | replace now |
| `docs-pages.js:682` | `20,000+ icon library` | marketing copy | shared product facts rounded free-icons label | replace now |
| `docs-pages.js:686` | `Search 20,000+ free icons across 10 libraries` | marketing copy | shared product facts rounded free-icons-and-libraries label | replace now |
| `docs-pages.js:211` | `20,000+ open-source SVG icons from 10 libraries` | marketing copy | shared product facts rounded free-icons-and-libraries label | replace now |
| `docs-pages.js:226` | `20,000+ SVG icons from 10 libraries` | marketing copy | shared product facts rounded free-icons-and-libraries label | replace now |
| `store.js:4246` | `20,000+ icons, 10 libraries` | marketing copy | shared product facts rounded free-icons-and-libraries label | replace now |
| `store.js:4252` | `20,000+ icons across 10 libraries` | marketing copy | shared product facts rounded free-icons-and-libraries label | replace now |
| `store.js:4256` | `MCP server (20,000+ free icons)` | marketing copy | shared product facts rounded free-icons label | replace now |
| `store.js:4364` | `Free users can access 20,000+ icons` | marketing copy | shared product facts rounded free-icons label | replace now |
| `main.js:666` | `Search 20,000+ icons...` | marketing copy | shared product facts rounded placeholder label | replace now |
| `main.js:1059` | `20,000+ icons across 10 libraries...` | marketing copy | shared product facts rounded free-icons-and-libraries label | replace now |
| `index.html:8` | `20,000+ Free Icons` in title | marketing copy | deliberate static rounded copy | keep for now, verify manually |
| `index.html:10` | `20,000+ free SVG icons from 10 libraries` in meta description | marketing copy | deliberate static rounded copy | keep for now, verify manually |
| `index.html:14` | `20,000+ Free Icons` in OG title | marketing copy | deliberate static rounded copy | keep for now, verify manually |
| `index.html:22` | `20,000+ Free Icons` in Twitter title | marketing copy | deliberate static rounded copy | keep for now, verify manually |
| `index.html:36` | `20,000+ free SVG icons from 10 libraries` in JSON-LD | marketing copy | deliberate static rounded copy | keep for now, verify manually |
| `index.html:87` | `20,000+ free icons` in hero | marketing copy | deliberate static rounded copy or future runtime sync | keep for now |
| `index.html:98` | `20,000+` stat | marketing copy | deliberate static rounded copy or future runtime sync | keep for now |
| `index.html:180` | `Search 20,000+ icons...` | marketing copy | main.js runtime sync | runtime source wins |
| `index.html:366` | `20,000+ icons across 10 libraries` | marketing copy | main.js runtime sync or future direct binding | keep for now |

---

## P0 Decisions

### Replace now

- root package description
- MCP top comment / version / free-icon label
- high-surface runtime strings in `main.js`, `store.js`, and `docs-pages.js`

### Keep rounded and static for now

- `index.html` head metadata
- most visible landing marketing copy in HTML

Reason:

- these are deliberate marketing surfaces
- they are not the most dangerous drift today
- the shared product-facts system should land first before expanding into head/meta templating

### Keep as local source of truth

- `mcp/package.json` version

Reason:

- package version should still live in the package manifest
- other consumers should read from it, not duplicate it

---

## Follow-up After P0

- expand the inventory to the wider repo once the first shared facts layer is stable
- decide whether `index.html` head metadata should move into a generated build step
- decide whether landing hero stats should become runtime facts-driven or remain static marketing copy
