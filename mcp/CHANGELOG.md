# Changelog

## 0.4.19-beta.2 - 2026-07-20

### Added

- added labeled semantic fallback results for clear multi-word search requests
- added conservative typo and inflection recovery for common search terms
- added query parsing for style words and display constraints
- added structured one-call search guidance, preview links, and honest no-result responses
- added clarification options for ambiguous recommendation slots
- added controlled validation labels and complete 429 retry details

### Improved

- improved top results for deployment, restore, profiles, testing, containers, dashboards, and expressive concepts
- suppressed weak substring matches instead of filling result limits with unrelated icons
- refreshed the packaged icon index timestamp with its content hashes pinned in release evidence

## 0.4.19-beta.1 - 2026-07-17

### Added

- added clear package terms and third-party icon notices
- added private-record-bound copying-detection markers to staged public engine data
- added release checks that keep learned usage and community intelligence out of public bundles

### Changed

- minified generated engine modules only in staged public artifacts while keeping repository sources readable
- updated the beta evidence window to count organic owner, agent, and external usage

## 0.4.19-beta.0 - 2026-07-16

### Added

- added complete Material Symbols discovery and fixed-preset SVG delivery for MCP search
- added an opt-in local deterministic route for English-like `search_icons` requests, while localized search and `recommend_icons` stay on the stable hosted route
- added the public synonym map needed for clean-installed local search to match the reviewed search suite
- added the packaged search-index date to local beta responses and tool-level beta outcome measurements

### Fixed

- fixed usage-event deduplication across separate MCP sessions
- fixed overly broad speed-family matching that allowed a breakfast icon into speed results
- updated transitive Hono and `qs` packages to versions with no known npm audit findings

## 0.4.17 - 2026-07-03

### Added

- added hosted direct PNG preview URLs through `/preview-icons.png`
- added `image_url` and `markdown_image` fields to `preview_icons` responses

## 0.4.16 - 2026-07-03

### Fixed

- fixed `preview_icons` PNG contact sheets so inline MCP image previews render the actual icon glyphs instead of blank placeholder cards
- added a prepublish verification check for MCP preview image output

## 0.4.15 - 2026-07-02

### Added

- added public library labels and browser preview URLs to icon search, recommendation, and exact icon responses
- added `preview_icons` for browser preview links and optional MCP image contact sheets
- clarified that `si` means Supericons and `simpleicons` means Simple Icons in MCP tool descriptions

## 0.4.14 - 2026-07-02

### Fixed

- updated packaged MCP registry metadata so `server.json` matches the published npm package version

## 0.4.13 - 2026-07-01

### Added

- added opt-in query-frame diagnostics for MCP search and recommendation calls through `include_query_frame`

### Fixed

- improved localized settings-page recommendations so account/profile slots prefer user/profile icons instead of nearby permissions/security icons
- improved `smart` searches so generic intelligence queries prefer brain, sparkles, and lightbulb icons instead of AI-tool logos
- added fallback search behavior for `ai slop` so low-quality AI-output queries can return warning, bug, and bot-off style icons
- kept public hosted MCP search gateway requests from sending a fallback Supabase key unless explicitly configured

## 0.4.12 - 2026-06-30

### Fixed

- improved MCP local fallback search for long natural-language icon requests such as license plate recognition, AI app builders, code editors, neck pain, and dream interpretation
- applied the same long-query fallback behavior to the hosted MCP server fallback path
- updated packaged MCP server metadata to `0.4.12`

## 0.4.11 - 2026-06-28

### Fixed

- improved `recommend_icons` for Supericons (`si`) brand and logo slots so exact AI tool logos such as OpenAI Codex, Lovable, Kickbacks.ai, and xAI rank correctly

## 0.4.10 - 2026-06-27

### Added

- added Supericons (`si`) library discovery for hosted and stdio MCP clients
- added hosted search support for Supericons AI and developer tool logo queries

### Changed

- updated packaged product facts to reflect 21,367 free icons across 11 libraries
- sends the public Supabase key header when calling the public MCP search gateway

## 0.4.5 - 2026-05-14

### Fixed

- fixed hosted MCP runtime dependency packaging for Railway deployments
- fixed hosted MCP fallback search for localized Chinese queries and solid icon styles
- improved settings-page recommendations across English and supported localized slot labels

## 0.4.4 - 2026-05-14

### Fixed

- improved `recommend_icons` for natural localized slot labels, including Chinese compound labels such as account/profile, notifications/settings, privacy/security, appearance/theme, and language/settings
- made slot recommendations ignore individual hosted search failures instead of failing the whole recommendation response

## 0.4.3 - 2026-05-14

### Fixed

- fixed npm/stdio multilingual search fallback so localized Chinese settings queries retry with the approved English concept when the hosted gateway returns no localized result

## 0.4.2 - 2026-05-14

### Fixed

- added hosted MCP fallback support for multilingual search when the public search gateway returns no localized result
- expanded Arabic category aliases so shorter queries such as `الأمان` match the same concepts as the full category label

## 0.4.1 - 2026-05-05

### Added

- added official MCP Registry metadata through `mcpName` and `server.json`
- documented both the hosted Streamable HTTP endpoint and the npm stdio package for registry discovery

## 0.4.0 - 2026-05-03

### Changed

- switched the free icon search tools to hosted semantic search by default
- removed bulk registry and icon-index JSON files from the npm package
- kept a local fallback path for internal development when `SUPERICONS_ALLOW_LOCAL_SEARCH_FALLBACK=1`
- packaged only the small runtime helpers needed for MCP startup and slot recommendations

## 0.3.1 - 2026-04-14

### Fixed

- packaged the MCP runtime dependencies needed for clean npm installs:
  - `material-export.js`
  - `public/icon-index.json`
  - `public/synonyms.json`
- fixed the MCP server's package-local paths so installed copies no longer depend on repo-level `../public` or `../material-export.js`

## 0.3.0 - 2026-04-11

### Breaking changes

- Motion Lab MCP input parameters now use `snake_case`:
  - `duration_ms`
  - `intensity_percent`
- Motion Lab animated SVG responses now use `animated_svg` instead of `animatedSvg`

### Added

- `list_motion_presets` now returns the enriched Motion Lab preset metadata used by the agent library
- `get_motion_recipe` now returns enriched preset guidance fields such as:
  - `technical_output_notes`
  - `visual_character`
  - `emotional_tone`
  - `recommended_contexts`
  - `avoid_for`

### Upgrade note

If you have an existing MCP client config or wrapper using the old Motion Lab parameter names, update those callers before using `0.3.0`.
