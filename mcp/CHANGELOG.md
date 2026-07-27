# Changelog

## 0.4.24 - 2026-07-28

### Added

- added best-effort Local MCP installation, client, operating system, and country attribution
- added exact episode identities so Local MCP outcomes can be linked without relying on query text
- added a clear package notice describing telemetry fields, retention, and all four opt-out controls

### Privacy

- stores only a server-keyed installation hash, never the raw installation identifier or IP address
- removes stored installation hashes after 90 days
- keeps telemetry separate from search so failures and timeouts do not change results

## 0.4.23 - 2026-07-27

### Fixed

- restored relevant local results for normal multiword requests such as `torrent magnet`, `view categories`, `go up`, `browser cookies`, and `ip blocked`
- made the browser and local npm package use one shared public search decision pipeline
- kept hosted search failures visible instead of hiding them behind local results
- preserved honest no-results for unsupported requests

### Improved

- added a real built-browser gate covering multiword, typo, multilingual, strict-library, exact-reference, no-result, and hosted-error cases
- loaded the shared browser search engine only when search is first used, keeping the initial app bundle smaller

## 0.4.22 - 2026-07-23

### Fixed

- restored natural multilingual phrases across all 11 maintained non-English locales
- accepted reviewed words inside longer localized phrases using real language word boundaries
- normalized regional locale tags such as `pt-BR` to their maintained language data
- kept exact reviewed phrases ahead of shorter partial matches

### Improved

- expanded the live HTTP and MCP gate with one realistic search phrase for every maintained locale
- raised the reviewed multilingual regression gate to 75 cases with at least 90 percent aggregate coverage and no more than one miss per locale
- improved connected-node ranking so graph and topology icons stay ahead of Wi-Fi results

## 0.4.21 - 2026-07-23

### Fixed

- repaired multiword search recovery for local npm and hosted MCP users
- restored relevant results for construction, network graphs, connected people, towing, celebration, and magnetic concepts
- kept unsupported brands and nonsense queries as honest no-results
- removed hidden hosted-error fallback and made route reporting truthful
- prevented controlled release checks from entering organic usage metrics

### Improved

- added positive relevance checks for recent English, Spanish, Japanese, Korean, and Portuguese production misses
- filtered disabled, slash, and off-state icons from positive searches unless the query asks for a negative state
- preserved exact maintained brand identity without unrelated generic filler

## 0.4.20 - 2026-07-22

### Improved

- expanded broad English meaning coverage for quality, emotion, status, people, communication, media, travel, nature, accessibility, and common app concepts
- expanded the same reviewed meaning groups across 11 maintained languages, with traffic and zero-result evidence guiding language priority
- made localized intent matches use the same deterministic ranking path as English queries
- removed accidental substring matches such as `win` inside `window`, while preserving reviewed aliases and safe word forms
- kept unsupported words honest instead of filling results with unrelated icons
- reduced repeated full-index scans with a bounded in-process candidate index

### Fixed

- fixed zero results for broad searches such as `amazing`, `sports`, Japanese `スポーツ`, and Spanish `deportes`
- restored Kubernetes search terms in every maintained locale
- narrowed explicit brand and logo searches to the requested identity instead of unrelated filler

## 0.4.19 - 2026-07-22

### Added

- added support for up to 20 recommendation slots in one call
- added plain-language recommendation input and service error responses with useful next steps

### Improved

- grouped distinct recommendation searches through an additive endpoint while keeping individual-request fallback
- isolated grouped failure protection from the stable individual endpoint
- kept existing custom individual endpoints in individual mode unless a grouped endpoint is explicitly configured
- reused local results when grouped or individual hosted search returns no matches
- rejected malformed or invalid-JSON grouped responses instead of treating them as normal empty results
- kept hosted 4xx responses visible when optional local fallback is enabled
- deduplicated repeated recommendation searches before hosted retrieval
- changed oversized preview requests into successful 12-icon inline previews with warnings and fuller browser links
- promoted local-first search and recommendations to the default npm release
- aligned local MCP, hosted MCP, and browser search on the same Railway engine

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
