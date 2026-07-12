# Search v2 sample executor verification

Date: 2026-07-12

## Scope

This check covers multilingual meaning approval, the exact paid-sample authorization, and the local executor for the approved four-candidate embedding smoke test.

## Contract

- Fingerprint: `a95e424c435893b9009d898dcd386c79cacd382c49238c69c5729645ade8f287`
- Maximum inputs: 12 per candidate
- Maximum requests: 8 total
- Retries: 0
- Vector storage: not allowed
- Spend cap: $1
- Credentials: environment variables only

## Checks run

| check | result | evidence |
| --- | --- | --- |
| Evaluation suite | Passed | `node scripts/verify-semantic-search-v2.mjs` reported 225 stable cases, 219 owner-reviewed cases, and 6 contract fixtures. |
| Sample fingerprint | Passed | `node scripts/verify-search-v2-embedding-sample.mjs` reproduced the approved fingerprint and four candidates. |
| Allowed execution path | Passed with mock transport | `node scripts/verify-search-v2-embedding-executor.mjs` made exactly 8 requests and stored no vectors. |
| Denied execution paths | Passed | Wrong fingerprint, wrong cap, and missing credential tests each made zero provider requests. |
| Provider failure behavior | Passed | A simulated status 503 produced one request attempt and no retry. |
| Runner regression | Passed | `node scripts/verify-search-v2-embedding-runner.mjs` preserved the five-candidate corpus plan and dry-run behavior. |
| Punctuation | Passed | No U+2013 or U+2014 character was found in this batch. |
| Live provider sample | Blocked before any provider call | The exact approved command failed closed because `VOYAGE_API_KEY`, `GEMINI_API_KEY`, and `OPENAI_API_KEY` were absent from the current process environment. |
| General backend helper | Did not run its discovered build | The helper failed to start `npm` on Windows with `FileNotFoundError: [WinError 2]`. Focused Node checks above ran directly. |

## Hardening follow-up

The executor was tightened after the first audit:

- The planner now reports `provider_execution_in_plan: false` and `separate_executor_available: true`. The misleading `provider_execution_implemented` field was removed without changing the authorization fingerprint.
- Each provider request reserves one approved request before network activity begins. The executor refuses a call when the approved count is exhausted.
- A provider failure now carries a public-safe summary with attempted-request count, failed candidate, failed input stage, zero retries, and no stored vectors.
- The command-line runner emits structured JSON without a stack trace. A missing-key check reported zero attempted requests.

## Security and misuse review

- The executor checks the recorded fingerprint, supplied fingerprint, exact $1 cap, input limit, request limit, zero-retry rule, storage rule, and all required credentials before its first provider call.
- Credential values enter request headers only. They are not included in plans, results, errors, or files.
- Provider response bodies and vectors remain in memory. Only counts, latency, usage, estimated cost, and retrieval ranks enter the result summary.
- Provider errors expose the provider name and HTTP status only. Response bodies are not logged.
- A successful authorization is intended for one run. The authorization file must be marked consumed immediately after a successful live sample. Concurrent execution remains an operator-controlled residual risk because the command has no durable replay lock.

## Residual risk

No real provider response has been validated yet. The exact sample remains authorized but cannot run until all three environment variables are available. The Google request uses the already-approved payload fields, which current official documentation still lists but marks as deprecated. Changing those fields would require a new fingerprint and approval.
