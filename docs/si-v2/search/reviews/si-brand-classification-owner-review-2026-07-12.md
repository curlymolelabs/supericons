# SI brand classification owner review

Date: 2026-07-12

Status: approved with one correction

Authority: approved classification record. The maintained implementation lives in `data/search-intent-graph/ranking-policy.json` and its stable fixtures.

Decision recorded: all proposed classifications were approved except Supericons. Exact single-token `supericons` is `distinctive_exact`; the two-word phrase `super icons` remains descriptive and is not an identity alias.

Implementation record: all 50 approved SI records are active in the maintained ranking policy. The policy contains 34 distinctive and 16 ambiguous SI record classifications, qualified identity terms where needed, and shared rejected-alias handling. Stable fixtures cover all 50 explicit logo queries, useful concept sharing, and rejected aliases.

## Decision requested

Review the proposed exact-match class and alias boundaries for all 50 SI brand-logo records. Reply with:

> Approve all proposed SI brand classifications except [brand]: [change]

`distinctive_exact` means an exact maintained brand term can keep identity priority. `ambiguous_exact` means the brand shares results with normal word meanings unless the query includes clear brand intent. A qualified multiword brand may be distinctive while a shorter alias remains ambiguous or unapproved.

Registry aliases shown in source metadata are evidence inputs only. This packet deliberately rejects broad aliases such as `factory`, `kilo`, or `eve` when they would turn a normal concept into a brand query.

## Proposed classifications

| # | SI brand | proposed exact class | alias and collision guidance |
| ---: | --- | --- | --- |
| 1 | Artificial Analysis | `ambiguous_exact` | The phrase can describe analysis performed by AI. Require concept coverage when bare; explicit logo or company context selects the brand. |
| 2 | Base44 | `distinctive_exact` | Approve `base44` and `base 44`; app-builder phrases are context, not identity aliases. |
| 3 | Bolt | `ambiguous_exact` | Bare `bolt` shares with lightning, hardware bolt, speed, and power. `bolt.new` or logo context selects the brand. |
| 4 | BridgeMind.ai | `distinctive_exact` | Approve `bridgemind`, `bridge mind`, and `bridgemind ai`. |
| 5 | Browserbase | `distinctive_exact` | Approve `browserbase`; treat `browser base` cautiously as an alias because it can be descriptive. |
| 6 | CapCut | `distinctive_exact` | Approve `capcut` and `cap cut`. |
| 7 | Cartesia | `distinctive_exact` | Approve `cartesia`; voice and Sonic terms are context, not exact aliases. |
| 8 | Cohere | `ambiguous_exact` | Bare `cohere` shares with join, unite, or stick-together meanings. `cohere ai` selects the brand. |
| 9 | Context7 | `distinctive_exact` | Approve `context7` and `context 7`. |
| 10 | Devin | `ambiguous_exact` | Bare `devin` can be a person's name. `devin ai` or Cognition context selects the brand. |
| 11 | Exa | `ambiguous_exact` | Bare `exa` can refer to the metric prefix. `exa ai`, search, or API context selects the brand. |
| 12 | Factory AI | `distinctive_exact` | Approve the full `factory ai` identity. Do not approve bare `factory` as a brand alias. |
| 13 | fal.ai | `distinctive_exact` | Approve `fal.ai` and `fal ai`; review bare `fal` only if identity evidence requires it. |
| 14 | Firecrawl | `distinctive_exact` | Approve `firecrawl` and `fire crawl`. |
| 15 | Glama | `distinctive_exact` | Approve `glama` and `glama ai`. |
| 16 | Google AI Studio | `distinctive_exact` | Approve the qualified Google identity. `ai studio` alone remains unapproved because it is descriptive. |
| 17 | Google Antigravity | `distinctive_exact` | Approve the qualified Google identity. Bare `antigravity` remains a concept unless separately approved as ambiguous. |
| 18 | Goose | `ambiguous_exact` | Bare `goose` shares with the animal. `goose ai` or Block context selects the brand. |
| 19 | Hermes Agent | `distinctive_exact` | Approve `hermes agent`. Bare `hermes` remains unapproved because it has several identities and meanings. |
| 20 | HeyGen | `distinctive_exact` | Approve `heygen` and `hey gen`. |
| 21 | Higgsfield | `distinctive_exact` | Approve `higgsfield` and `higgsfield ai`. |
| 22 | Inngest | `distinctive_exact` | Approve `inngest`. Workflow terms remain context only. |
| 23 | Kickbacks.ai | `distinctive_exact` | Approve `kickbacks.ai` and `kickbacks ai`. Bare `kickbacks` remains unapproved because it has a normal and potentially sensitive meaning. |
| 24 | Kilo Code | `distinctive_exact` | Approve `kilo code` and `kilocode`. Bare `kilo` remains a unit concept. |
| 25 | Kimi | `ambiguous_exact` | Bare `kimi` can be a person's name. `kimi ai` or Moonshot context selects the brand. |
| 26 | Kling AI | `distinctive_exact` | Approve `kling ai` and `klingai`; bare `kling` remains unapproved. |
| 27 | Lovable | `ambiguous_exact` | Already approved in this batch. Bare `lovable` shares with love and affection; `lovable logo` selects the brand. |
| 28 | Luma AI | `distinctive_exact` | Approve `luma ai`. Bare `luma` remains unapproved because luma is a visual-brightness term. |
| 29 | Manus AI | `distinctive_exact` | Approve `manus ai`. Bare `manus` remains unapproved because it has non-brand meanings. |
| 30 | Mobbin | `distinctive_exact` | Approve `mobbin` and `mobbin design`. |
| 31 | OpenAI Codex | `distinctive_exact` | Approve `openai codex`; classify bare `codex` separately as ambiguous with book or manuscript meaning. |
| 32 | OpenClaw | `distinctive_exact` | Approve `openclaw`; `open claw` may remain an identity alias only with approved evidence. |
| 33 | OpenCode | `ambiguous_exact` | Bare `open code` can describe visible or open-source code. Explicit logo or product context selects the brand. |
| 34 | Pika | `ambiguous_exact` | Bare `pika` shares with the animal. `pika ai` or Pika Labs context selects the brand. |
| 35 | Pinecone | `ambiguous_exact` | Bare `pinecone` shares with the natural object. Database or logo context selects the brand. |
| 36 | PixVerse | `distinctive_exact` | Approve `pixverse` and `pixverse ai`. |
| 37 | Portkey | `ambiguous_exact` | Bare `portkey` has a non-brand object meaning. AI gateway or logo context selects the brand. |
| 38 | Runway | `ambiguous_exact` | Bare `runway` shares with airport and fashion meanings. `runway ai` or logo context selects the brand. |
| 39 | shadcn/ui | `distinctive_exact` | Approve `shadcn`, `shadcn ui`, and `shadcn/ui`. Do not treat generic `components` as an identity alias. |
| 40 | Smithery | `ambiguous_exact` | Bare `smithery` can mean a workshop or smith's work. MCP or logo context selects the brand. |
| 41 | Stagehand | `ambiguous_exact` | Bare `stagehand` shares with the occupation. Browserbase or automation context selects the brand. |
| 42 | StepFun | `distinctive_exact` | Approve `stepfun` and `step fun`. |
| 43 | Suno | `distinctive_exact` | Approve `suno` and `suno ai`; music terms remain context. |
| 44 | Supericons | `distinctive_exact` | Approve exact single-token `supericons`. The two-word phrase `super icons` remains descriptive and is not an identity alias. |
| 45 | Temporal | `ambiguous_exact` | Bare `temporal` shares with time-related meaning. `temporal io` or workflow context selects the brand. |
| 46 | Trae | `distinctive_exact` | Approve `trae` and `trae ai`. |
| 47 | Vercel Eve | `distinctive_exact` | Approve `vercel eve`. Bare `eve` remains unapproved because it is a common name. |
| 48 | xAI | `distinctive_exact` | Approve `xai`, `x ai`, and `x.ai`; classify bare `grok` separately as ambiguous with understand or comprehend meaning. |
| 49 | Xiaomi MiMo | `distinctive_exact` | Approve `xiaomi mimo`; bare `mimo` remains unapproved because it is a technical communications term. |
| 50 | Z.ai | `distinctive_exact` | Approve `z.ai`, `z ai`, and `zai`; GLM remains product context rather than a general identity alias. |

## Required follow-up fixtures after approval

Every approved ambiguous term needs:

- one bare query where brand rank 1 is permitted but not required;
- required non-brand interpretation families in the top eight;
- one explicit brand or logo query with identity rank 1; and
- an avoid rule when substring leakage creates irrelevant results.

Qualified multiword brands need a fixture proving that the unapproved bare word does not become a brand query, for example `factory` versus `factory ai`.

## External brands

The external catalog remains evidence-driven. Cursor is a current example for later reactive review: bare `cursor` should share brand and pointer meanings, while `Cursor logo` should prioritize identity. It is not part of the 50-record SI batch.
