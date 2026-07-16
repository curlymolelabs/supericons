# Search v2 Gate C strict evidence binding correction

Date: 2026-07-16
Starting revision: `e314d8751adc7a4760853e9cf01e853e2a31bccf`
Scope: local evidence validation only

Status: strict value and run-window validation passed independent review. The first artifact-completeness rules were superseded by `search-v2-gate-c-workload-completeness-correction-2026-07-16.md` after independent probes showed missing sample arrays and null worker summaries could still pass.

## Verified defect

Independent malformed-evidence probes showed that the first complete-evidence evaluator could return success for null numeric values and artifacts outside the claimed live evidence window. JavaScript converted some null values to zero during comparisons, and the evaluator checked only that window values were strings.

This was a material fail-open defect in release finalization. It did not affect search results or the already rolled-back hosted beta.

## Correction

- Required numeric values now use strict number types and must be finite.
- Percentages must be between 0 and 100.
- Counts must be nonnegative integers.
- Platform errors cannot exceed platform requests.
- Audit errors cannot exceed captured audit rows.
- Production function versions must be positive integers and remain unchanged.
- Live start and end times and every artifact measurement time must be parseable.
- The live window must be ordered, and every search, localized, and smoke artifact must fall inside it.
- Live evidence must match the approved manifest hash, endpoint, beta cohort, client family, measurement variant, and derived hosted-request count.
- Each measurement artifact must match the approved manifest, endpoint, mode, and variant.

## Behavioral verification

`npm run verify:search-v2-search-only-beta-gate-c-evidence` passed a complete PowerShell finalization fixture and rejected all saved malformed cases, including:

- null, empty, negative, and impossible numeric evidence;
- platform or audit errors above their denominators;
- null production function versions;
- invalid or reversed live windows;
- artifacts outside the live window;
- mismatched manifest or workload identity;
- breached release limits and missing evidence.

The focused verifier preserved the ten earlier failure cases and covered 23 fail-closed cases at this revision.

No live request, deployment, publication, hosted mutation, database mutation, monitoring activation, or model-provider call occurred during this correction.

## Next gate

Independently audit this narrow correction and rerun the full local release-gate set. Do not deploy or publish. Any later live attempt still requires a fresh implementation expected to pass with margin, a fresh manifest, audit, and owner approval.
