# Material Railway release attempt

Date: 2026-07-15

Status: Candidate rolled back automatically. Production is healthy on the verified pre-Material source.

## Approved packet

- Approval fingerprint: `0830bf06faeeb14cf8fee1b050a8783d0fe6cbebdd17f7ce2a10a95b73fbaea7`
- Implementation revision: `13f28d7e72484538b0a2be14f680ef8a4c4e3c52`
- Railway project: `b53f5f48-607f-49ae-a71e-37cc766f6973`
- Railway environment: `6345c75b-5ac2-40d6-b176-a4a783ce3eb3`
- Railway service: `352420e5-6a02-43a4-99f2-f6dbde522acb`

## Preflight

The packet verifier, 8,524-asset bundle check, 11-check hydration suite, server contract, usage dedupe regression, exact Railway identity checks, and legacy live gate passed before deployment.

The legacy preflight was successful but slow:

- Strict Material request: 12,992.7 ms, with the expected zero results.
- Strict Lucide request: 8,665.3 ms, with three valid SVG results.

These requests use the pre-Material Railway source and the unchanged stable hosted search service.

## Candidate deployment

- Candidate deployment: `f542a597-04b5-4a60-987b-9d3737c2fcbc`
- Candidate image digest: `sha256:214bfc72669d65a3d00d0e03272e245df9b45039570eda6bf468522bec550489`
- Railway status before verification: `SUCCESS`
- Candidate MCP version: `0.4.18`

The production gate passed its first nine checks:

1. Health reported the complete local Material bundle.
2. `list_libraries` reported 4,262 Material icons.
3. Material search and exact lookup returned valid outline SVG.
4. Material search and exact lookup returned valid solid SVG.
5. Outline and solid payloads were distinct.
6. Recommendations returned valid Material SVG.
7. Preview returned Material rows and a real PNG image.
8. The outline relevance fixture passed 20 of 20 in the first five results.
9. The solid relevance fixture passed 20 of 20 in the first five results.

The next MCP request exceeded the client's 60-second timeout. Based on the fixed gate order and the nine retained completed checks, this was the first all-mode `settings` request. That identification is an inference from the retained gate sequence because the failed artifact stores the exception but not the active check name.

Candidate container logs show normal startup followed by the expected stop signal after rollback. They do not contain an application exception for the timed-out request.

## Independent search-engine controls

Direct production search-engine probes ran from a separate network path during the candidate gate. The retained notes are in `references/verification/material-railway-incident-engine-probes-2026-07-15.json`.

The controls recorded one HTTP 500 after 27,326 ms during the gate window, followed by slow successful responses of 14,556 ms, 20,470 ms, and 14,870 ms. A later response completed in 950 ms at `2026-07-15T12:20:42Z`.

These controls support a dependency congestion explanation for the timed-out all-mode request. They do not identify the underlying database cause. The original response bodies and client log file were not retained, so the artifact records the contemporaneous measurements and their limitation rather than presenting them as independently reproducible raw logs.

## Automatic rollback

The runner detected that the candidate had reached `SUCCESS`, so the approved conditional rollback ran immediately.

- Rollback source revision: `02b2c22ea8a76decee92d83c853ca6cf33899e6c`
- Rollback deployment: `e789c810-ad5d-4808-9bdc-396a799372c5`
- Rollback image digest: `sha256:043f4d748963bcd3e6198880472066a02690351569c601db0ef289b52cef9392`
- Rollback status: `SUCCESS`
- Restored MCP version: `0.4.17`

The rollback verification passed:

- Health returned HTTP 200 and version `0.4.17`.
- Strict Material returned the expected zero results in 2,381.6 ms.
- Strict Lucide returned three valid SVG results in 1,767.9 ms.

No Supabase function, database, storage object, npm package, beta endpoint, Railway configuration, or other Railway service changed.

## Follow-up probe

One low-volume all-mode `settings` probe ran through the restored MCP after rollback. It succeeded in 8,331.4 ms with nine deliverable SVG results. The short count is the known pre-Material slot-pollution behavior.

This proves the dependency was responsive after rollback. It does not prove why the candidate request timed out. The candidate's all-mode path calls the unchanged stable hosted search service before hydrating any returned Material rows, so the timeout may be transient or dependency-related, but the retained evidence is not sufficient to assign a root cause.

## Next boundary

The approved packet is consumed and must not be rerun. A new attempt requires a new diagnosis, independently checked packet, and owner approval. Production remains on the verified rollback deployment while that review happens.
