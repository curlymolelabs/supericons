# Search pipeline fingerprint review

Date: 2026-07-27

## Scope

This record reviews the deterministic search changes made after the failing surface-equivalence baseline at commit `dab25b1e21`.

The repair changes the packaged local search decision policy in two bounded ways:

1. A multiword fallback may proceed when at least half of the meaningful query words are recognized.
2. A reviewed intent rule may supply fallback variants only when the rule covers the same minimum share of the query.

The second rule prevents a generic recognized word from creating results for an otherwise unsupported phrase. The phrase `zxqv nonsense token` remains an honest no-result.

The maintained intent dictionary also adds `go up` as a reviewed phrase with upward-arrow variants. Generated phrase rules are matched on complete word boundaries.

## Reproduced gap cases

The following local false zeros from the frozen surface-equivalence corpus now return relevant results:

| Case | Reviewed leading result |
|---|---|
| `torrent magnet` | `lucide:magnet` |
| `view categories` | `lucide:view` |
| `go up` | `lucide:arrow-up` |
| `browser cookies` | `material:cookie` |
| `ip blocked` | `tabler:ban` |

The same corpus also retained the required decisions for compound agent queries, strict library behavior, exact icon identity, English and maintained localized sports terms, typo recovery, and honest nonsense.

## Fixed-suite fingerprint movement

The pre-change and post-change 225-case observations were generated from separate clean worktrees and compared by case ID.

- Pre-change revision: `dab25b1e21`
- Post-change fixed-suite fingerprint: `84a5e8b3c1b4e31e25cc865b37f397effb6c6c4c820b98706995012b8b80e3ff`
- Changed cases: 3 of 225
- Existing non-empty result sets changed: 0

| Case ID | Query | Before | After |
|---|---|---|---|
| `legacy-long-license-plate` | `license plate` | no results | camera, scan, car, and plate-recognition candidates |
| `multi-zh-hans-openai-logo` | `OpenAI 标志` | no results | `bootstrap:openai`, `mingcute:openai_line` |
| `multi-mixed-ja-bolt-lightning` | `Bolt 稲妻アイコン` | no results | bolt and lightning candidates led by `tabler:bolt` |

All three movements are false-zero recoveries. None introduces a forbidden or misleading leading family.

## Executable checks

The following checks passed against the changed worktree:

- 21-case surface-equivalence decision corpus
- 244 English semantic coverage cases
- 612 localized semantic coverage cases across 11 maintained non-English locales
- 3 honest no-result semantic cases
- Query fixtures
- Intent expansion
- Intent dictionary validation
- Intent graph validation
- MCP multilingual support
- Generated CJK search fixtures
- Private CJK quality review
- Web CJK search checks
- Hosted-primary routing behavior
- Valid hosted-zero local recovery
- Hosted dependency error propagation
- Controlled test-traffic forwarding

The clean-installed package check uses the reviewed fixed-suite fingerprint above. Its all-locale stdio route fingerprint is `c447744c04d2d7628959f685090b95159f912c5ca74ce3ec950d0c3175f89f44`.

## Release boundary

This review covers search behavior only. It does not authorize or include local-channel identity or attribution changes. Telemetry remains a separate implementation and release.
