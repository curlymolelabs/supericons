# Material Railway recovery preflight attempt

Date: 2026-07-15

Approval fingerprint: `ecc2692bb00a119f9750e27a6f7dd18423ca354fca7a1b49caac32734acc334f`

## Outcome

The guarded recovery runner stopped during the pre-upload stability check. No Railway upload or deployment occurred.

The legacy production preflight passed on Railway deployment `e789c810-ad5d-4808-9bdc-396a799372c5` and MCP version `0.4.17`. The direct search-engine stability check then completed two of its planned six probes:

1. Probe 1 returned HTTP 200 with three Lucide results in 1,771.6 ms.
2. Probe 2 returned HTTP 200 with three Lucide results in 3,508.5 ms.

Probe 2 exceeded the approved 3,000 ms ceiling by 508.5 ms. The probe classified the search engine as degraded, wrote its evidence, and stopped the runner before any upload.

## Production state after the stop

A read-only Railway deployment check after the stop showed that deployment `e789c810-ad5d-4808-9bdc-396a799372c5` remained the active `SUCCESS` deployment with image digest `sha256:043f4d748963bcd3e6198880472066a02690351569c601db0ef289b52cef9392`.

The public health endpoint returned version `0.4.17`. No candidate deployment, rollback deployment, Supabase change, database change, storage change, npm publication, beta change, or Railway configuration change occurred.

## Evidence

- Legacy preflight: `references/verification/material-railway-recovery-legacy-preflight-2026-07-15.json`
  - Raw SHA-256: `3df92231ad0291bae4345f29ffbb9f024b1eec96a2c3fbb97b46821f2c1190b5`
- Stability preflight: `references/verification/material-railway-recovery-stability-preflight-2026-07-15.json`
  - Raw SHA-256: `1bc22897fad67e96a2728c9478859cbf11c43cfa987c14b264cfdbf194c31616`

## Next boundary

The packet is write-once and its two preflight evidence paths now exist. It cannot be rerun. A later attempt requires a new packet, fresh evidence paths, a new fingerprint, and explicit owner approval.
