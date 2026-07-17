# Agent instructions for this repository

These rules apply to every AI agent and automated tool that generates or edits content in this repository. This file is the controlling discoverable source for these policies; do not assume an agent has access to any private preference store.

## Writing style

- Never use em dashes (U+2014) or en dashes (U+2013) in any prose, code comments, commit messages, documentation, or generated content. Restructure the sentence with commas, colons, periods, or parentheses instead.
- Regular hyphens (-) in compound words are fine: 30-year-old, pre-existing, real-time.
- This applies to all generated output: docs, JSON string values, UI copy, changelogs, PR descriptions, and verification records.

Scope:

- Apply this rule to new or revised agent-authored content.
- Do not perform repository-wide cleanup unless explicitly requested.
- Do not alter verbatim user input, quoted external source material, vendor files, or fidelity-sensitive fixtures solely to satisfy this style rule.
- When delegating to subagents, pass this rule into every subagent prompt that produces text.

## Branch and worktree discipline

- Prefer a dedicated branch and a separate git worktree for any substantial workstream (as the Material and integration efforts did). This is the safest mode.
- Sessions working in the shared main worktree must stage with scoped `git add <own paths>` only, never `git add -A` or `git add .`, and must leave the tree clean (work committed) before the session ends.
- Uncommitted changes you did not make belong to another workstream: do not commit, stash, or move them; ask the owner to have the owning session secure them.
- Never commit temporary, private, credential, or local platform files (for example `.tmp/`, `.netlify/`, `data/*/private/`, local logs, personal scratchpads). Review every untracked file before any broad commit.
- Reviewed integration branches merge into main via merge commit or fast-forward after verification; do not bypass an in-flight reviewed integration by committing to main files that the integration also changes.

## Plain language

- Use simple, easy-to-understand language in user-facing content: HTML pages, UI copy, help text, marketing copy, and public documentation.
- Avoid jargon and insider terms (for example "canonical", "projection", "idempotent") in user-facing content unless the term is genuinely suitable for that audience and project.
- When a simpler word says the same thing, use the simpler word.
- Internal engineering documents may use precise technical terms where they add clarity, but the same preference for the simpler equivalent applies.

## Evidence-first claims

- Do not state a factual claim about code, files, outputs, tests, builds, or tool behavior unless it was directly verified in the current session against the exact artifact that proves it (open the exact file, run the exact command).
- Distinguish plainly between verified fact, inference, and assumption. Do not present expected or intended behavior as confirmed reality.
- Completion claims ("fixed", "done", "verified", "passed") must state their proof basis in the same deliverable. No proof, no claim.
- For public-facing outputs, verify the final exported artifacts, not only the source that should generate them.

## Owner involvement and delegated judgment

- The agent owns the judgment about when to involve the owner. Do not make owner approval a routine workflow step.
- Involve the owner only when work physically requires the owner's access, credentials, or money, or when a decision genuinely changes the default user experience or carries material risk the owner would clearly want to weigh.
- A regenerated fingerprint, refreshed evidence file, or equivalent safety correction to an already-reviewed release does not automatically require renewed owner approval. Decide whether the underlying product and risk decision changed.
- Keep independent audits, evidence records, bounded mutation plans, and rollback controls. These safeguards support autonomous action and do not create approval ceremonies.
- If unsure whether an issue is important enough to involve the owner, reason through the impact and decide. A concise heads-up is acceptable, but do not block by default.

## Public-safe outputs

- Write every file as if it may become public, unless it is explicitly marked private or internal-only.
- Never include internal AI, model, or process metadata in deliverables: no model names, reasoning settings, prompt strategy, review workflow details, or fields such as reviewer_model, internal_review_status, prompt_notes, workflow_trace, agent_notes.
- Deliverables describe the product or business object itself, not how it was generated or reviewed.
- If internal process tracking is needed, keep it in a clearly private, local-only artifact separate from the deliverable. When in doubt, omit.
