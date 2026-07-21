# Search v2 broad coverage release

Date: 2026-07-22
Status: local candidate verified, production release pending
Version: 0.4.20
Base revision: `acb9f09d6fd6057823d45d6083cf019f9d884a0f`

## Product boundary

This release expands common meaning searches without claiming that every possible word has an icon. Broad words use reviewed, deterministic meaning groups. Exact identities and technical terms keep priority. Unsupported text returns no result instead of unrelated filler.

The same generated graph is packaged for npm, Railway hosted MCP, and public web search. The release follows the synchronized-surface rule in `D-033` and the broad coverage rule in `D-034`.

## Verified candidate behavior

- Generated graph: 49 groups and 1,058 phrases.
- English meaning gate: 244 of 244 passed.
- Localized meaning gate: 612 of 612 passed across 11 maintained locales.
- Established multilingual gate: 638 of 638 passed, with 58 fixtures per locale.
- Honest no-result gate: 3 of 3 passed.
- Fixed suite: 225 of 225 executed, fingerprint `17ed68b34768e1432fe176d44a994e3da6bac4566c607e229116f85001a7002c`.
- Clean-installed stdio route: 225 of 225 matched the direct helper, fingerprint `9627b1054af4feab30787d9341093b897fbd4352f4317a6e5dde977d5611f68c`.
- Local latency: first `amazing` search 475.3 ms; 30-sample p95 344.5 ms on the 21,427-icon public package index.
- Representative results: `amazing` starts with `tabler:sparkles`; `sports` starts with `material:sports`; Japanese `スポーツ` and Spanish `deportes` return reviewed sports symbols; nonsense `florblequux` returns no result.

## Fixed-suite change review

The 0.4.20 fingerprint changes 34 of the 225 maintained cases compared with the base revision. Each change was inspected against its query, result order, and existing acceptable families.

| disposition | case IDs | review |
| --- | --- | --- |
| Exact brand request narrowed to the requested identity | `legacy-brand-xai-logo`, `legacy-brand-grok-ai-logo`, `si-brand-logo-bolt`, `si-brand-logo-exa`, `si-brand-logo-factory-ai`, `si-brand-logo-fal-ai`, `si-brand-logo-goose`, `si-brand-logo-shadcn-ui`, `si-brand-logo-suno`, `si-brand-logo-temporal`, `si-brand-logo-trae`, `si-brand-logo-z-ai` | The requested Supericons identity remains first. Generic icons and unrelated brand logos are removed. |
| Clear relevance improvement | `legacy-brand-lovable`, `legacy-long-license-plate-recognition`, `legacy-locale-zh-hans-license-plate-recognition`, `ambiguity-hello-mouth`, `multi-mixed-zh-hans-lovable-heart` | Love queries gain additional heart or love symbols. License-plate recognition gains scan results, including a prior localized zero result. The mouth query replaces invoice filler with voice icons. |
| Unsafe substring result removed or narrowed | `si-brand-blocked-browser-base`, `si-brand-blocked-fal`, `si-brand-blocked-super-icons`, `si-brand-blocked-eve`, `si-brand-blocked-ai-studio` | The former results came from text fragments such as `fal` in `fall`, `eve` in `event`, or `super` in unrelated names. Exact word boundaries now block them. The broad AI-studio query keeps only its supported top interpretations. |
| Stable top intent with lower-rank cleanup or equivalent tie change | `j11-cog`, `library-cog-bootstrap-prefer`, `library-cog-all`, `parity-cog`, `si-brand-concept-artificial-analysis`, `si-brand-concept-cohere`, `si-brand-concept-goose`, `si-brand-concept-opencode`, `si-brand-concept-open-code`, `si-brand-concept-runway`, `si-brand-blocked-factory`, `si-brand-blocked-components` | The leading accepted family is unchanged. Tail changes replace an accidental substring, remove a duplicate concept, add a relevant public concept, or reorder equivalent family members. No reviewed unacceptable family entered the leading results. |

The first comparison exposed unrelated brand logos entering generic `motion`, `avatar`, and `voice` lanes. The candidate was corrected so non-brand interpretation and semantic fallback lanes exclude brand-logo records. The table and fingerprint above describe the corrected bytes.

## Multilingual data repair

The established public multilingual data had 281 English concepts but only 280 localized concepts. Kubernetes was the missing record in every maintained locale. This release adds the 11 public-safe Kubernetes records and regenerates the fixture set. The three distributed locale files are byte-identical, contain 3,091 terms, and have SHA-256 `92128ff971ad3e76875ec59ccfd4c2017f68a80ddcfce848012c77a4852fea19`.

## Dependency audit

The package lock refresh removes the reported high-severity `fast-uri` advisory and low-severity `body-parser` advisory. npm still reports one moderate advisory through `@modelcontextprotocol/sdk` because the current SDK line depends on `@hono/node-server` 1.x while the advisory is fixed in 2.x. Supericons does not use the affected Hono static-file server. Downgrading the protocol SDK or forcing an incompatible transitive major is rejected for this release. Exact package and HTTP tests remain mandatory.

## Release gates and rollback

Before release, the committed source must reproduce every result above from a clean tree. The exact npm archive must pass package inspection, clean installation, stdio MCP tests, public-safety checks, and VC-3 and VC-4 boundaries. Railway must pass health, English and localized search, honest no-result, browser-safe payload, hosted MCP search, and 20-slot recommendation checks. The public website must render the same English and localized results without console errors.

Railway rollback restores deployment `94e801e0-abeb-4738-9897-00da2471e245`. npm rollback restores `latest` to 0.4.19. Netlify rollback restores deploy `6a5fa79b7d04082d57641c1f`. A failed surface gate stops later release changes.
