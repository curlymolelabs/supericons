# MCP GitHub Publication Implementation Plan

Date: 2026-06-10

## Goal

Publish the current Supericons MCP config and package changes to GitHub so the public repository reflects the intended MCP release state.

The intended release state is:

- `mcp/server.json` uses version `0.4.9`.
- `mcp/server.json` points to npm package `@supericons/mcp` version `0.4.9`.
- `mcp/package.json` uses package name `@supericons/mcp` and version `0.4.9`.
- The local MCP tool changes for `response_mode` and hosted tool annotations are included.
- The public GitHub default branch shows the released MCP files, unless the project explicitly keeps MCP source on a release branch only.

## Current Audit Findings

The local audit found that GitHub is not updated yet.

Verified findings:

- GitHub default branch is `main` at commit `37be0a7f`.
- GitHub `main` does not contain `mcp/server.json` or `mcp/package.json`.
- GitHub branch `codex/reconcile-main-directory-20260429` is at commit `7f270ced`.
- Local branch `codex/reconcile-main-directory-20260429` is at commit `d4415a39a`.
- Local branch is one commit ahead of the GitHub branch with the same name.
- That local-only commit is `Add explicit Supabase Data API grants`.
- The recent MCP config and package changes are still uncommitted locally.
- The local checkout has no configured Git remote.
- The working tree contains many modified and untracked files, so the MCP publication change should be staged carefully.

Current GitHub MCP branch values:

- `mcp/server.json` version is `0.4.4`.
- `mcp/server.json` package identifier is `supericons-mcp`.
- `mcp/package.json` package name is `supericons-mcp`.
- `mcp/package.json` version is `0.4.6`.

Current local MCP values:

- `mcp/server.json` version is `0.4.9`.
- `mcp/server.json` package identifier is `@supericons/mcp`.
- `mcp/package.json` package name is `@supericons/mcp`.
- `mcp/package.json` version is `0.4.9`.

## Release Strategy

Use a focused release branch and pull request. Do not push the dirty working tree wholesale.

Recommended path:

1. Restore the GitHub remote in the local checkout.
2. Create or reuse a focused MCP publication branch.
3. Stage only the files needed for this MCP publication.
4. Run public-safety and package verification.
5. Push the branch to GitHub.
6. Open a pull request into `main` if the MCP source should be visible from the public default branch.
7. If `main` is intentionally a lighter public branch, update the release branch first and document which branch is the public MCP source of truth.

## Scope

In scope:

- Git remote repair for this checkout.
- MCP config update in `mcp/server.json`.
- MCP package metadata update in `mcp/package.json` and `mcp/package-lock.json`.
- MCP tool behavior changes for `response_mode`.
- Hosted MCP annotation changes.
- Verification script additions required by the MCP package scripts.
- Public-safety review for changed files.
- GitHub push and pull request preparation.

Out of scope:

- Publishing to npm, unless the release owner confirms that `@supericons/mcp@0.4.9` should be published in the same release.
- Changing hosted production infrastructure.
- Reworking the full branch divergence between local work and GitHub `main`, except where needed to publish the MCP files safely.
- Publishing unrelated docs, generated reports, videos, brand files, or private local artifacts.

## Files To Review And Stage

Minimum MCP publication set:

- `mcp/server.json`
- `mcp/package.json`
- `mcp/package-lock.json`
- `mcp/index.js`
- `mcp/remote-server.js`
- `mcp/recommend-icons.js`
- `mcp/hosted-search-client.js`
- `mcp/generated/motion-lab-baseline.json`
- `mcp/public/product-facts.json`

Required verification script referenced by `mcp/package.json`:

- `scripts/verify-public-safety.mjs`

Optional root verification scripts, only if the root `package.json` script additions are included:

- `scripts/verify-public-boundaries.mjs`
- `scripts/verify-motion-lab-stroke-safety.mjs`
- `scripts/verify-motion-lab-hosted-runtime.ts`
- `scripts/verify-recommend-icons-response-modes.mjs`
- `scripts/evaluate-recommend-icons-hosted-path.mjs`
- `scripts/evaluate-recommend-icons-broad-quality.mjs`

Stage optional scripts only if their script entries are included in the same commit and their supporting source changes are included too. If a script is not ready to publish, leave the matching root package script out of this MCP publication release.

## Implementation Tasks

### Task 1: Restore GitHub Remote

- [ ] Confirm the local checkout still has no remote with `git remote -v`.
- [ ] Add the GitHub remote:

```bash
git remote add origin https://github.com/curlymolelabs/supericons.git
```

- [ ] Fetch branch state:

```bash
git fetch origin --prune
```

- [ ] Confirm GitHub default branch:

```bash
git ls-remote --symref origin HEAD
```

### Task 2: Choose The Publication Target

- [ ] Decide whether the public default branch `main` should contain the MCP package files.
- [ ] If yes, prepare a pull request into `main`.
- [ ] If no, push and document the MCP release branch that users and directories should inspect.

Recommended decision: publish through `main` if the GitHub URL is intended to be the public reference for the MCP server.

### Task 3: Isolate The MCP Change Set

- [ ] Review `git status --short` and keep unrelated dirty files out of the release commit.
- [ ] Review each intended file with `git diff`.
- [ ] Confirm no public artifact includes private process notes, internal review fields, secrets, local paths, or unpublished operational details.
- [ ] Confirm package scripts do not reference untracked scripts unless those scripts will be committed.
- [ ] Keep root `package.json` script additions out of the focused MCP publication unless their related Motion Lab source changes are included and verified.
- [ ] Confirm `mcp/server.json`, `mcp/package.json`, and `mcp/package-lock.json` agree on the package name and version.

### Task 4: Verify The Local MCP Package

- [ ] Validate JSON:

```bash
node -e "const fs=require('fs'); for (const f of ['mcp/server.json','mcp/package.json','mcp/package-lock.json']) { JSON.parse(fs.readFileSync(f,'utf8')); console.log(f + ': valid JSON'); }"
```

- [ ] Check patch hygiene:

```bash
git diff --check -- mcp/server.json mcp/package.json mcp/package-lock.json mcp/index.js mcp/remote-server.js mcp/recommend-icons.js mcp/hosted-search-client.js mcp/generated/motion-lab-baseline.json mcp/public/product-facts.json scripts/verify-public-safety.mjs
```

- [ ] Run public-safety verification:

```bash
npm --prefix mcp run verify:public-safety
```

- [ ] Run MCP package verification:

```bash
npm --prefix mcp run verify:package
```

- [ ] Run response-mode verification if the script is committed:

```bash
node scripts/verify-recommend-icons-response-modes.mjs
```

- [ ] Run package dry run before any npm release decision:

```bash
npm --prefix mcp pack --dry-run
```

### Task 5: Confirm npm Package Status

- [ ] Check whether `@supericons/mcp@0.4.9` already exists:

```bash
npm view @supericons/mcp@0.4.9 version
```

- [ ] If the package is not published yet, decide whether this GitHub update should land before or after npm publication.
- [ ] Do not leave `mcp/server.json` pointing to a package version that users cannot install unless the release notes clearly say publication is pending.

### Task 6: Commit The Focused Release

- [ ] Stage only the approved release files:

```bash
git add mcp/server.json mcp/package.json mcp/package-lock.json mcp/index.js mcp/remote-server.js mcp/recommend-icons.js mcp/hosted-search-client.js mcp/generated/motion-lab-baseline.json mcp/public/product-facts.json
```

- [ ] Add the MCP public-safety script:

```bash
git add scripts/verify-public-safety.mjs
```

- [ ] Commit:

```bash
git commit -m "chore: publish Supericons MCP package config"
```

### Task 7: Push To GitHub

- [ ] Push the release branch:

```bash
git push -u origin codex/reconcile-main-directory-20260429
```

- [ ] Confirm GitHub branch now points to the pushed commit:

```bash
git ls-remote --heads origin codex/reconcile-main-directory-20260429
```

- [ ] Open a pull request into `main` if the default branch should expose the MCP release.

### Task 8: Verify GitHub After Push

- [ ] Fetch from GitHub after pushing:

```bash
git fetch origin --prune
```

- [ ] Verify the branch copy of `mcp/server.json`:

```bash
git show origin/codex/reconcile-main-directory-20260429:mcp/server.json
```

- [ ] Verify the branch copy of `mcp/package.json`:

```bash
git show origin/codex/reconcile-main-directory-20260429:mcp/package.json
```

- [ ] If the pull request is merged, verify `main`:

```bash
git show origin/main:mcp/server.json
git show origin/main:mcp/package.json
```

## Rollback Plan

If the GitHub update is wrong:

- Revert the release commit with `git revert`.
- Restore the previous `mcp/server.json` package identifier and version.
- Restore the previous MCP package metadata.
- Push the revert branch and merge the revert pull request.
- If npm was also published, mark the bad package version as deprecated and publish a corrected patch version.

## Success Criteria

The release is complete when all of these are true:

- GitHub contains `mcp/server.json` with version `0.4.9`.
- GitHub contains `mcp/server.json` package identifier `@supericons/mcp`.
- GitHub contains `mcp/package.json` name `@supericons/mcp` and version `0.4.9`.
- The branch or default branch used for MCP publication is clearly identified.
- Referenced verification scripts are committed or their package script entries are removed.
- Public-safety and MCP package checks pass.
- A post-push GitHub fetch confirms the published file contents.
