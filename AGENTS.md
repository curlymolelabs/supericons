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

- Each concurrent workstream (session) must use its own branch and its own git worktree. Do not do feature work directly in the main worktree.
- The main worktree stays clean. It is used only for reviewed integration of completed branches.
- Never leave uncommitted changes in the main worktree between sessions. If you find them, they belong to another workstream: do not commit, stash, or move them; ask the owner to have the owning session secure them.
- Never commit temporary, private, credential, or local platform files (for example `.tmp/`, `.netlify/`, `data/*/private/`, local logs). Review untracked files before any broad commit.
- Integration into main happens by reviewed merge or fast-forward of a verified branch, never by committing loose changes on main.

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

## Public-safe outputs

- Write every file as if it may become public, unless it is explicitly marked private or internal-only.
- Never include internal AI, model, or process metadata in deliverables: no model names, reasoning settings, prompt strategy, review workflow details, or fields such as reviewer_model, internal_review_status, prompt_notes, workflow_trace, agent_notes.
- Deliverables describe the product or business object itself, not how it was generated or reviewed.
- If internal process tracking is needed, keep it in a clearly private, local-only artifact separate from the deliverable. When in doubt, omit.
