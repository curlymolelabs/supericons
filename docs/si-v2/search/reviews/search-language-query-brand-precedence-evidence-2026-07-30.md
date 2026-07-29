# Search Language Repair: Brand Precedence Evidence

Date: 2026-07-30

## Scope

This record covers one focused correction after the language and query repair candidate exposed a collision between a general concept alias and an exact brand identity.

The correction does not change the hosted-primary routing contract, add aliases, reorder general search lanes, deploy code, or publish a package.

## Pinned source

- Baseline revision: `0007d22c6ec634de00f982f4d5ff735f81ca78a7`
- Working branch: `codex/search-language-query-repair-20260729`
- Published npm version during verification: `0.4.24`
- Final intended release version after catalog integration: `0.4.25`

## Reproduced defect

The exact pre-fix source returned:

| Query | Library mode | Pre-fix result |
| --- | --- | --- |
| `airflow` | Lucide strict | Wind icons |
| `apache airflow` | Simple Icons strict | Honest zero |
| `apache airflow logo` | All libraries | Wind icons |
| `apache airflow logo` | Simple Icons strict | Honest zero |

The global `airflow` concept alias ran before exact brand identity. This replaced an Apache Airflow request with wind concepts.

## Correction

The shared local and browser pipeline now performs a bounded exact-brand check before an expanded concept alias only when:

1. a non-logo query has a reviewed expansion that could intercept it, or
2. an explicit brand or logo query has no result through the existing direct brand path.

The check removes logo-intent words, requires an exact normalized or compact primary identity, requires a likely brand icon, and preserves brand-policy penalties. If those conditions do not hold, the existing search flow runs unchanged.

## Focused behavior

| Query | Required outcome | Verified outcome |
| --- | --- | --- |
| `airflow`, Lucide strict | Wind concept | `lucide:wind` first |
| `apache airflow`, Simple Icons strict | Apache Airflow identity | `simpleicons:apacheairflow` |
| `apache airflow logo`, all libraries | Apache Airflow identity | `simpleicons:apacheairflow` |
| `apache airflow logo`, Simple Icons strict | Apache Airflow identity | `simpleicons:apacheairflow` |
| `alibaba cloud logo`, Simple Icons strict | Alibaba Cloud identity | `simpleicons:alibabacloud` |

## Verification

| Check | Result |
| --- | --- |
| Focused language and query corpus | 26 of 26 passed |
| Shared decision corpus | 34 of 34 passed |
| Built browser artifact | 34 of 34 passed |
| Established direct fingerprint | 225 cases unchanged |
| Established locale-aware fingerprint | 225 cases unchanged |
| Clean-installed package verification | Passed, 71 files |
| Clean-installed stdio contract | 225 of 225 passed |
| MCP multilingual support | Passed |
| CJK search quality | Passed |
| Vocabulary gaps | 31 of 31 passed |
| Hosted-primary route behavior | Passed |
| Hosted error visibility | Passed |
| Recommendation grouped search | Passed |
| Ranking policy | Passed |
| Official local latency gate | Passed, p95 452.5 ms |

Fingerprint comparison:

- Direct before and after: `df8a55dafa58e32ba1b7ea9e1933387c9bb1c7f5ef587a758567cd36e86b2357`
- Locale-aware before and after: `c924440e54573024cf8570769d9f46e2e360adb3b3f90f857f3507b5f6d69874`
- Changed established cases: `0`

## Build boundary

The focused Vite browser build passed. The full repository build stopped earlier in registry projection because the separate in-progress icon catalog contains a record with no `avoid_when` value. This search branch did not change or repair that catalog record.

The final `0.4.25` archive, Railway artifact, and website artifact must be rebuilt after the intended catalog changes are secured and integrated. The current source pack remains version `0.4.24` and is not a release artifact.

## Commands

```text
node scripts/verify-search-language-query-repair.mjs
node scripts/verify-search-v2-surface-equivalence-baseline.mjs
node scripts/verify-search-v2-browser-equivalence.mjs
node scripts/compare-search-v2-fingerprint-cases.mjs --baseline-root=<baseline> --current-root=<candidate>
node scripts/verify-search-v2-tool-scoped-package.mjs
node scripts/verify-mcp-multilingual-support.mjs
node scripts/verify-cjk-search-quality.mjs
node scripts/verify-search-v2-vocabulary-gaps.mjs
node scripts/verify-search-v2-hosted-route-repair.mjs
node scripts/verify-search-v2-hosted-route-integrity.mjs
node scripts/verify-recommend-icons-grouped-search.mjs
node scripts/verify-search-ranking-policy.mjs
node scripts/verify-search-v2-semantic-latency.mjs
```

## Audit request

The independent audit should remain focused:

1. reproduce the four Airflow cases and the Alibaba Cloud control;
2. verify the exact-brand check cannot replace generic `airflow` in strict Lucide mode;
3. rerun the 26-case and 34-case corpora;
4. confirm both 225-case fingerprints remain unchanged; and
5. confirm no release or deployment happened.

Final artifact identity and rollback targets belong to the later `0.4.25` integration audit.
