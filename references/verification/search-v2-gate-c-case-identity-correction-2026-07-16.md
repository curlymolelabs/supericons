# Search v2 Gate C case identity correction

Date: 2026-07-16
Starting revision: `dad1c0605fa21890e82eed5335954e3cb0e7e152`
Scope: local measurement-artifact validation only

## Verified defect

Independent probes confirmed that finalization could accept 25 warm search samples with missing case identities or with every sample assigned to `settings-all`. The total count was correct, but the other four fixed cases could be omitted.

This was a material release-signoff gap. It did not affect search results or any hosted system.

## Shared workload contract

The measurement runner and evidence evaluator now import one fixed search workload definition. It contains these five case identities:

- `settings-all`
- `hello-all`
- `cog-bootstrap-strict`
- `combobox-bootstrap-prefer`
- `settings-zh-hans-expanded`

The first request must use `settings-all`. The 25 warm samples must contain exactly five samples for each fixed case. Missing, empty, unexpected, wrong-first, or duplicate-only identities fail finalization.

## Verification

`npm run verify:search-v2-search-only-beta-gate-c-evidence` passed a complete PowerShell finalization fixture and 36 fail-closed cases. Four new cases reject missing search identities, a 25-sample single-case workload, an unexpected identity, and the wrong first case.

The complete local release-gate set passed after the change. The 225-case result fingerprint remained `ef2934097555867d1695e9861f35c346132f6c33ec9899c602635ce12aba76c8` with clean fingerprint inputs.

No live request, deployment, publication, hosted mutation, database mutation, monitoring activation, or model-provider call occurred.

## Next gate

Independently rerun the case-identity probes and the full local release gates. Do not deploy or publish. Any later live attempt still requires a faster implementation, a fresh manifest, an independent audit, and owner approval.
