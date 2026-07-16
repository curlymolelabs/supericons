# Search v2 monitoring activation

Status: ready for read-only activation

## Purpose

Activate two scheduled maintenance routines outside the live search path:

1. A daily beta monitor while the opt-in beta is active.
2. A weekly deterministic search maintenance audit.

These routines inspect evidence and prepare recommendations. They do not change search results or run inside an MCP request.

## Schedules

| routine | schedule | active period |
| --- | --- | --- |
| Daily beta monitor | 09:00 Asia/Singapore every day | From publication until beta closeout, reporting `inactive` until the first eligible request starts the evidence window |
| Weekly maintenance audit | Monday at 09:00 Asia/Singapore | Ongoing until deliberately paused |

The daily routine must be disabled after beta closeout. The weekly routine continues as the reviewed learning loop.

If a code, package, or safety correction requires a new beta version, the daily routine closes the old version's window and starts a separate window for the new version. A resolved finding remains visible in the old interval.

## Daily scope

- Confirm the public beta package and stable `latest` tag.
- Detect the first verified eligible request and record the window start once.
- Report attempts, session groups, outcomes, error rate, telemetry completeness, library modes, locales, traffic concentration, and adoption when evidence is available.
- Keep first-process evidence separate from reused-process evidence when the telemetry supports it.
- Check Material capability truth and the zero-model-provider rule.
- Flag a rollback review if a published guardrail is breached.
- Do not send invitations or mutate any system.

If required private access is unavailable, the routine records the missing evidence and continues every public and local check. It must never request or store credentials automatically.

## Weekly scope

- Run the 225-case fingerprint and all maintained deterministic quality gates.
- Explain every changed case rather than accepting a moved fingerprint as one block.
- Review sanitized repeated zeros and weak-result clusters when available.
- Review new icons for meaning-strength collisions and prepare owner taste questions only for genuine edge cases.
- Review dependency findings and stale release controls.
- Produce a concise maintenance digest with no automatic data, ranking, publication, or deployment change.

## Boundaries

- Read-only hosted access.
- No database writes, deployment, publication, dependency update, fixture approval, ranking-policy approval, warm ping, public message, or model-provider call.
- No raw queries tied to sessions, session hashes, IP fragments, access tokens, or private operational details in the output.
- The routines may use scheduled task capacity, but must not create variable per-search cost.
- Any default-user release or broad rollout remains a separate business decision.

## Stop conditions

Pause the daily monitor and request rollback review if the beta is deprecated, the `beta` tag no longer points to the approved version, `latest` changes unexpectedly, or a safety guardrail is breached.

Delete or disable the daily routine after the closeout record is complete. Keep the weekly routine only while it continues to produce useful maintenance evidence.
