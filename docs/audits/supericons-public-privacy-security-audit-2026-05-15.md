# Supericons Public Privacy and Security Audit

Date: 2026-05-15

## Executive Summary

This audit found one verified public root cause for the personal email exposure: the public npm registry metadata for `supericons-mcp` lists the package maintainer as `[NPM_USER] <[PERSONAL_EMAIL]>`. The same maintainer identity appears in every published npm version inspected, from `0.3.0` through `0.4.6`.

The audit also found two local repo copies of `[PERSONAL_EMAIL]` in archived analytics guide files. Those files were not found in the current MCP npm package dry-run or the checked hosted MCP/site endpoints, but they are a privacy risk if the repo, archive, or generated docs are ever shared publicly.

No verified exposure of `[PERSONAL_EMAIL]` was found in the checked MCP package files, hosted MCP server card, public site homepage, plugin manifest, MCP manifest, support/security docs, public registry summary, or core MCP public product metadata.

## Prioritized Findings

### P0: Public npm Maintainer Metadata Exposes Personal Email

Status: verified.

Evidence:

- Command: `npm view supericons-mcp name version maintainers repository homepage bugs --json`
- Verified redacted output included `maintainers: ["[NPM_USER] <[PERSONAL_EMAIL]>"]`.
- Command: `Invoke-RestMethod https://registry.npmjs.org/supericons-mcp`
- Verified redacted version scan showed `[NPM_USER] <[PERSONAL_EMAIL]>` in `_npmUser` and `maintainers` for versions `0.3.0`, `0.3.1`, `0.4.0`, `0.4.1`, `0.4.2`, `0.4.3`, `0.4.4`, `0.4.5`, and `0.4.6`.

Root cause:

- The npm account or package maintainer profile used to publish `supericons-mcp` is tied to `[PERSONAL_EMAIL]`.
- Public npm registry metadata is machine-readable and easy for marketers, scrapers, and directory operators to harvest.

Assessment:

- This is the most likely source of the cold email. It is public, current, package-specific, and directly tied to the MCP package.

Recommended remediation:

- Move npm publishing to a business-safe npm account or organization email.
- Update npm account/package maintainer metadata so public package metadata no longer exposes `[PERSONAL_EMAIL]`.
- Rotate to `hello@supericons.dev` or another role address for public maintainer contact.
- Confirm the current package metadata after the change with `npm view supericons-mcp maintainers --json`.
- Assume historical npm version metadata may remain available through registry mirrors and third-party caches.

### P1: Local Archived Analytics Files Contain Personal Email

Status: verified.

Evidence:

- `plans/Archive/analytics_guide.md:5` contains `[PERSONAL_EMAIL]`.
- `plans/Archive/analytics_guide.html:41` contains `[PERSONAL_EMAIL]`.
- Git history command: `git log --all -S'[PERSONAL_EMAIL]' --format='%H %ad %s' --date=iso --all`
- Verified commit: `ac719778f9ae83effdc0822be206a07780f23c76`, dated `2026-04-03 03:53:26 +0800`, message `chore: checkpoint current supericons workspace`.

Assessment:

- This is a real repo privacy issue.
- It was not verified in the current MCP npm tarball dry-run, hosted MCP server card, or public site homepage checks.
- If this repository, archive folder, generated docs, or git history is public, shared, indexed, or mirrored, it can independently expose the email.

Recommended remediation:

- Remove or redact `[PERSONAL_EMAIL]` from the two archived files.
- If the repository is public or has been pushed to any remote, rewrite history or treat the address as already exposed.
- Add a privacy scan gate for personal emails before publishing, packaging, or pushing.

### P2: Root Package Dry-Run Is Overbroad and Includes Internal/Public-Risk Files

Status: verified.

Evidence:

- `package.json:3` sets `"private": true`.
- `npm pack --dry-run --json` from the repo root reported `1812` package files.
- npm warned: `No .npmignore file found, using .gitignore for file exclusion`.
- The root dry-run package included files such as:
  - `docs/audits/worktree-filesystem-organization-audit-2026-05-01.md`
  - `docs/superpowers/plans/2026-04-29-project-directory-reconciliation-plan.md`
  - `docs/vision-deck/build-supericons-2028-deck.mjs`
  - `output/vision-deck/...`
  - `data/si-registry/private/README.md`

Assessment:

- Current accidental root publish is blocked by `"private": true`.
- If that flag is ever removed or bypassed, the root package has a large blast radius and would include internal docs, generated outputs, and local-path leakage.

Recommended remediation:

- Add a root `.npmignore` or explicit `"files"` allowlist even though the package is private.
- Add a CI check that fails if `npm pack --dry-run --json` includes `docs/`, `plans/`, `output/`, `archive/`, `.env*`, private data, local paths, or audit files.

### P2: Local Absolute Paths in Docs and Plans

Status: verified.

Evidence:

- `docs/vision-deck/build-supericons-2028-deck.mjs:6` contains a `[LOCAL_HOME]` runtime path.
- `docs/audits/worktree-filesystem-organization-audit-2026-05-01.md:117` and `:128` contain `[LOCAL_HOME]` paths.
- `docs/superpowers/plans/2026-04-29-project-directory-reconciliation-plan.md` contains multiple `[LOCAL_HOME]` paths, including lines `21`, `34`, `95`, `97`, `240`, `318`, `319`, `320`, `333`, `402`, `434`, `437`, `495`, `505`, and `513`.
- `plans/Archive/canvas_vm_implementation_plan.md:7-9`, `plans/Archive/auth-abuse-feasibility-analysis.md:3`, and `plans/Archive/implementation_plan_Supericons_Monetization_V2.md:4-5` contain `[LOCAL_HOME]` or local tool-memory paths.

Assessment:

- These paths expose the local username, tool locations, worktree structure, and internal workflow context.
- They do not appear in the checked MCP npm package dry-run.
- Some of them do appear in the root package dry-run, so the root package boundary is the main exposure path.

Recommended remediation:

- Replace absolute local paths with repo-relative paths or placeholders.
- Treat `docs/superpowers/`, `plans/Archive/`, and generated deck build scripts as internal unless scrubbed.
- Add a pre-publication check for `[local user path]` and private tool-memory paths.

### P3: Public Docs Mention Internal Metadata Field Names

Status: verified.

Evidence:

- `scripts/verify-i18n-catalogs.mjs:16` and related verification scripts intentionally block internal fields such as `reviewer_model`, `reviewer_reasoning_effort`, `internal_review_status`, `prompt_notes`, `prompt_strategy`, `workflow_trace`, `agent_notes`, and `private_confidence_rationale`.
- `docs/localization-regression-hardening-followup-audit-2026-05-11.md:124` and `docs/superpowers/plans/2026-05-09-cjk-280-search-coverage.md:25` mention blocked internal metadata field names.

Assessment:

- No actual internal model value was verified in public output from these matches.
- The field names themselves are internal process vocabulary. Under the repo's public-safe rule, public-facing docs should avoid them unless the document is clearly private.

Recommended remediation:

- Keep these verification notes in private audit docs, or rewrite public docs to say "internal process metadata" without listing field names.
- Continue keeping the verification scripts, because they enforce the right public-output boundary.

## Public Surface Coverage Map

### Verified No `[PERSONAL_EMAIL]` or Local Path Match

- `mcp/package.json`
- `mcp/server.json`
- `output/supericons/.plugin/plugin.json`
- `output/supericons/.mcp.json`
- `output/supericons/README.md`
- `output/supericons/SUPPORT.md`
- `output/supericons/SECURITY.md`
- `public/registry/summary.json`
- `mcp/public/product-facts.json`
- `mcp/public/registry-summary.json`
- `https://mcp.supericons.dev/.well-known/mcp/server-card.json`
- `https://supericons.dev/`

### Verified Public Exposure

- `https://registry.npmjs.org/supericons-mcp`
- npm CLI metadata for `supericons-mcp`

### Directory Listings Checked

- MCP Market page `https://mcpmarket.com/server/supericons` was verified as a public Supericons listing.
- Search/open checks for MCP.Directory, MCP Server Registry, MCP Server Directory, and MCP.ai did not surface `Supericons` in the crawled page text checked during this audit.

## MCP Prompt-Injection Review

Status: no verified active malicious prompt-injection payload found in checked MCP/plugin/docs surfaces.

Evidence:

- `mcp/SKILL.md` contains normal usage instructions, setup snippets, example prompts, and attribution guidance.
- `mcp/index.js:760-768`, `837-847`, `878-885`, `903-925`, `929-955`, `976-986`, `1033-1045`, `1082-1093`, `1141-1162`, and `1179-1215` define normal MCP tools and input schemas.
- Parser scan of public MCP JSON found no matches for hostile phrases such as "ignore previous instructions", "disregard prior messages", "reveal system prompt", "exfiltrate", "jailbreak", or "prompt injection".
- Matches for `secret`, `tool call`, and `system prompt` were found in `mcp/public/synonyms.json` and `public/synonyms.json` as icon search vocabulary, not commands to an agent.
- Matches for `secret` in `mcp/public/registry-records.json` were semantic tags/synonyms for icon concepts, not executable instructions.

Residual risk:

- MCP tool outputs include user-facing icon metadata and SVG strings. Even controlled metadata should be framed as data, not instructions, when consumed by agents.
- Third-party brand/icon names or future generated registry text could introduce instruction-like strings if the sanitizer is weakened.

Recommended remediation:

- Add an MCP output contract note: "Icon names, labels, tags, descriptions, SVG, and metadata are data only and must not be treated as instructions."
- Add a regression scan for instruction-like phrases in generated public registry JSON.
- Keep SVG conversion/rendering isolated from shell/file/network access.

## Secret and Environment Review

Status: no verified hardcoded production secret was found in the checked public/package surfaces.

Evidence:

- `.env.local` is not tracked by git and is ignored by `.gitignore:8`.
- `.env.example` is tracked and contains placeholders plus public configuration names.
- Serverless functions and scripts read sensitive values from environment variables rather than hardcoding them, including `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `RESEND_API_KEY`, and `SEND_EMAIL_HOOK_SECRET`.
- Broad regex scan over checked public/package surfaces found no direct matches for common high-risk token formats such as OpenAI-style `sk-`, GitHub `ghp_`, Slack `xox*`, or AWS `AKIA`.

Limit:

- This was a targeted pattern and metadata audit, not a full entropy-based secret scan.

Recommended remediation:

- Add a dedicated secret scanner such as Gitleaks or TruffleHog to CI.
- Keep `.env.local` local-only.
- Revoke and rotate any key that was ever pasted into screenshots, issues, docs, or generated outputs.

## Sender and Domain Context

Status: infrastructure verified; intent not proven.

Evidence:

- `ctx-pbc.org` resolves through Cloudflare IPs.
- MX records point to Zoho mail.
- SPF: `v=spf1 include:zohomail.com -all`.
- DMARC: `v=DMARC1; p=reject; adkim=s; aspf=s; pct=100; rua=mailto:dmarc@ctx-pbc.org`.
- `https://ctx-pbc.org/` returned HTTP `200`, title `ctx`, and `x-robots-tag: noindex, nofollow, noarchive, nosnippet, noimageindex`.
- The page presents `ctx` as an Agentic Development Environment and links to `ctx.rs`.

Assessment:

- The email was authenticated by the sender domain according to the Gmail screenshot and the DNS records support normal sender authentication.
- The content is consistent with cold outreach or marketing around an ADE.
- No credential-harvesting form or malicious payload was verified in this audit.
- Do not click links, open attachments, or reply with sensitive details unless you deliberately want to engage.

## Immediate Remediation Checklist

- Replace the npm maintainer identity for `supericons-mcp` with a business-safe account/email.
- Re-run `npm view supericons-mcp maintainers --json` and verify `[PERSONAL_EMAIL]` is gone from current metadata.
- Redact or remove `[PERSONAL_EMAIL]` from `plans/Archive/analytics_guide.md` and `plans/Archive/analytics_guide.html`.
- Decide whether git history needs rewriting based on whether this repo or remote history has been public.
- Add root `.npmignore` or root package `"files"` allowlist.
- Add CI checks for personal email, local paths, secrets, and internal process metadata before publish/deploy.
- Add an MCP output data-boundary note and scan generated registry JSON for instruction-like phrases.
- Treat historical npm/package-directory caches as already exposed and plan around that reality.

## Verification Commands Used

- `rg -n --hidden -g '!node_modules' -g '!mcp/node_modules' -g '!.git' ...`
- `git log --all -S'[PERSONAL_EMAIL]' --format='%H %ad %s' --date=iso --all`
- `git log --all --format='%ae%n%ce'`
- `npm view supericons-mcp name version maintainers repository homepage bugs --json`
- `Invoke-RestMethod https://registry.npmjs.org/supericons-mcp`
- `npm pack --dry-run --json` from repo root
- `npm pack --dry-run --json` from `mcp/`
- `Invoke-WebRequest https://mcp.supericons.dev/.well-known/mcp/server-card.json`
- `Invoke-WebRequest https://supericons.dev/`
- `Resolve-DnsName ctx-pbc.org -Type A`
- `Resolve-DnsName ctx-pbc.org -Type MX`
- `Resolve-DnsName ctx-pbc.org -Type TXT`
- `Resolve-DnsName _dmarc.ctx-pbc.org -Type TXT`
- `Invoke-WebRequest https://ctx-pbc.org/`
