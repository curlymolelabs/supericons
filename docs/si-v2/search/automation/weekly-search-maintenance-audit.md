# Weekly search maintenance audit

Status: Active after the Search v2 beta launch.

Schedule: Monday at 09:00, Asia/Singapore.

## Purpose

Run a weekly read-only review of deterministic search quality and prepare a short owner decision list. This routine is outside the live search path and cannot change user results by itself.

## Instructions

1. Read `AGENTS.md`, the Search v2 specification, decisions, and implementation status before reviewing evidence.
2. Run the 225-case fingerprint, ranking-policy, library-mode, recommendation-clarification, Material capability, package, and usage-dedupe checks.
3. Compare the fingerprint with the latest accepted value. Explain every changed case. Do not accept or reject a moved fingerprint as one undivided change.
4. Review sanitized zero-result and low-result clusters. Group repeated failures by the maintained gap types.
5. Run the admin event scorecard from a complete seven-day Events JSON export as described in `../admin-search-quality-scorecard.md`. Keep top-level MCP tool metrics separate from lower-level hosted search audits. Report field coverage and claim limits with every rate.
6. Review icons added since the previous run. Draft meaning-strength and collision advice where a new icon could displace a more conventional symbol or brand identity.
7. Review dependency findings, stale approvals, unresolved questions, and beta guardrails when a beta is active.
8. Return a concise digest with: passed checks, new risks, suggested data or fixture changes, and owner decisions phrased for a short answer.
9. Report charter compliance in two sections. For the evergreen layer, report VC-2, VC-3, VC-5, VC-6, VC-7, VC-8, and VC-9. For the adaptable layer, report VC-1 plus the current VC-3 protected classes, VC-4 license and canary controls, VC-7 payment rails, and other active enforcement methods. Mark each item green, finding, not applicable, or evidence unavailable.
10. Recheck the public npm and web surfaces for the VC-3 protected classes and confirm the VC-4 license and private canaries through the approved private verification path. Never print canary identities in the report.

## Boundaries

- Read-only access to hosted systems.
- No deployment, publication, migration, database write, dependency update, fixture approval, or ranking-policy approval.
- Never include credentials, raw session identifiers, IP fragments, or private operational details.
- Automation proposes. The owner decides taste and release actions.
- If required access is unavailable, report the missing evidence plainly and continue with local checks.
