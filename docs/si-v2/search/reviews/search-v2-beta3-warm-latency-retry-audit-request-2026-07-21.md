# Search v2 beta.3 warm latency retry audit request

Date: 2026-07-21
State: first grouped-endpoint attempt rolled back; corrected second-attempt packet locally verified; no second deployment, npm version, stage, or publication

## First attempt outcome

The guarded release ran with manifest:

`7285952737376b538ab751f7ba03f025b128ba7c643f2547481b259488ca2a24`

The deployment created `mcp-search-grouped` with function id `2aeaf77c-10c0-479e-9351-762f50914831`.

The live routing gate passed:

- direct grouped HTTP returned two responses;
- the MCP grouped client returned three results with stable fallback disabled;
- the explicit missing-grouped test used the stable individual fallback.

The FR-47 gate stopped on:

`one_slot p95 4858 ms exceeds 3000 ms`

The runner matched the deployed function id exactly, deleted only `mcp-search-grouped`, and recorded `stable_function_mutated: false`. A fresh function listing confirms that `mcp-search-grouped` is absent and stable `mcp-search` remains active at version 40.

The retained first-attempt evidence is:

- `references/verification/search-v2-beta3-grouped-live-2026-07-20.json`
- `references/verification/search-v2-beta3-fr47-live-2026-07-20.json`
- `references/verification/search-v2-beta3-grouped-release-rollback-2026-07-20.json`

The completion evidence is absent because the latency gate did not pass.

## Root cause

The endpoint behavior passed. The measurement schedule was wrong for a warm gate.

The first packet waited 22 seconds between recommendation calls. A read-only query of `public.search_request_audit` for the failed measurement window showed that every supposed warm batch started a new edge worker:

- first request ordinal: 1;
- module age at handler entry: about 172 to 185 ms;
- later parallel logical searches in the same grouped call used ordinals 2 through 4.

The 22-second interval was intended to keep grouped logical queries below the 120-per-minute burst allowance. In practice, it let the edge worker retire, so the gate repeatedly measured cold starts while calling the result warm.

The failed artifact also stored only the aggregate assertion message. It did not retain the three individual latency samples that produced the failed p95.

## Correction

Commit:

`cc474d85a57afb5cc7c23ef3ac9d704dcd32ba1f`

The corrected measurement:

1. Clears the rolling rate window for 65 seconds before each scenario warmup.
2. Sends an `OPTIONS` keepalive every 5 seconds during that reset. `OPTIONS` returns before search rate-limit accounting.
3. Runs one full scenario warmup.
4. Clears the warmup's rate window with the same keepalive schedule.
5. Runs the measured samples back to back.
6. Keeps the accepted FR-47 limits unchanged: 3,000 ms for 1 slot, 10,000 ms for 10 slots, 15,000 ms for 20 slots, a 20,000 ms hard timeout, and zero timeouts.
7. Adds the scenario evidence before applying the p95 assertion, so failures retain the warmup latency, every completed sample, p95, maximum, reset details, and timeout count.

No deployable source changed. The source revision remains:

`ff5698272072409caeefaf29998a80cf753fbe11`

The diff from that source revision contains zero files under `supabase/functions`, `mcp`, `lib`, or `data`.

## Regression protection

New harness:

`scripts/verify-search-v2-beta3-fr47-measurement-schedule.mjs`

It runs the real MCP process and measurement script against a local grouped endpoint fixture. It verifies:

- four scenario warmups and ten measured calls, for 14 grouped calls total;
- keepalives occur during each rate-window reset;
- measured samples run back to back;
- no request reaches the real or sentinel stable route on the successful path;
- the 20-slot requests stay inside the 40-logical-query bound;
- a forced 3.1-second one-slot failure retains all three measured samples and the failed p95 in the output.

Local result:

```json
{
  "status": "ok",
  "warm_schedule": {
    "grouped_requests": 14,
    "keepalive_requests": 22,
    "scenario_samples": [3, 3, 3, 1]
  },
  "failure_evidence": {
    "failed_scenario": "one_slot",
    "retained_samples": 3,
    "retained_p95_ms": 3127
  }
}
```

The existing no-fallback and rollback harnesses remain bound. The rollback harness now uses fresh 2026-07-21 evidence paths, so it cannot replace the real first-attempt records.

## Fresh second-attempt packet

Manifest:

`docs/si-v2/search/reviews/search-v2-beta3-grouped-release-manifest-2026-07-21.json`

Normalized SHA-256:

`8906a313b44e9880779904d1226373bd385724ebb23b387c274ec577dbab06f6`

Mutation budget:

- one `mcp-search-grouped` deployment;
- one conditional exact-id grouped deletion;
- zero stable-function deployments;
- zero npm publications.

The manifest records the first attempt as rolled back and supersedes its manifest hash. The second attempt writes only the fresh 2026-07-21 live, latency, completion, and rollback evidence paths.

The full packet passed on committed bytes:

```powershell
node scripts/verify-search-v2-beta3-grouped-packet.mjs --manifest-hash 8906a313b44e9880779904d1226373bd385724ebb23b387c274ec577dbab06f6
```

Result: seven packet files matched, 30 source files matched, both tar implementations passed rollback simulation, both stable-fallback negative paths passed, the measurement-schedule harness passed, and the stable route blob remained byte-identical to main.

## Independent audit requests

Treat every statement above as a claim until reproduced.

1. Inspect the first-attempt live, latency, and rollback evidence. Confirm the exact deployed id was removed and the stable function was not mutated.
2. Reproduce the failed-window read-only audit query if access is available. Confirm the 22-second samples used new workers rather than a warm reused worker.
3. Review the corrected rate-window and keepalive schedule. Confirm it respects the 120-logical-query rolling limit without spacing measured samples far enough apart to age out the worker.
4. Confirm failed scenario samples enter the artifact before the p95 assertion.
5. Rerun:

```powershell
node scripts/verify-search-v2-beta3-fr47-measurement-schedule.mjs
node scripts/verify-search-v2-beta3-grouped-negative-paths.mjs
node scripts/verify-search-v2-beta3-grouped-rollback-simulation.mjs
node scripts/verify-search-v2-beta3-grouped-packet.mjs --manifest-hash 8906a313b44e9880779904d1226373bd385724ebb23b387c274ec577dbab06f6
```

6. Confirm the manifest pins source `ff5698272`, and that no deployable source changed after that pin.
7. Confirm production contains no `mcp-search-grouped`, npm remains unchanged, and the new evidence paths are absent.
8. Issue GO or findings for the second guarded endpoint attempt only. Do not deploy, version, stage, or publish.

## Residual risk

An `OPTIONS` keepalive does not guarantee that the platform will route the next request to the same worker. The measured samples still run back to back, so a cold first measured call can cause a conservative false failure. The corrected artifact retains each sample, which makes that outcome diagnosable instead of ambiguous.

No second-attempt GO is claimed by this record.
