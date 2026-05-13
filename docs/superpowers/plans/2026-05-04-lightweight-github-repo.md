# Lightweight GitHub Repo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a small public GitHub repository that helps users and MCP directories install Supericons without exposing the private Supericons product code, registry source, internal workflows, or protected assets.

**Architecture:** Keep the private Supericons product repo private. Publish a separate public wrapper repo containing only install instructions, MCP config examples, a small plugin manifest, support/security docs, and a lightweight brand mark. The public repo points users to the npm package and hosted MCP endpoint instead of containing the full product.

**Tech Stack:** GitHub public repository, Markdown docs, JSON MCP config, TOML Codex config, SVG logo asset, npm package `supericons-mcp`, hosted MCP endpoint `https://mcp.supericons.dev/mcp`.

---

## Scope

This plan creates a public distribution wrapper only.

It must not include:

- private website source
- full registry JSON
- Supabase schema dumps or service role keys
- `.env` files
- private workflow docs
- internal audit files
- generated full icon payloads
- premium icon assets
- `node_modules`
- old worktrees or archive folders

## Current Local Source

The wrapper files have already been prepared locally at:

```text
output/supericons
```

This folder is intentionally inside `output/`, which is ignored by the private repo. That keeps the wrapper reviewable locally without mixing it into the private product repo history.

## Target Public Repo

Recommended GitHub repo:

```text
curlymolelabs/supericons
```

Public repo title:

```text
Supericons Agent Plugin
```

Short GitHub description:

```text
MCP setup wrapper for Supericons semantic SVG icon search.
```

Website field:

```text
https://supericons.dev
```

Topics:

```text
mcp, icons, svg, ai-coding-agents, cursor, claude-code, codex, semantic-search, lucide, tabler
```

---

## File Structure

The public repo should contain exactly this first version:

```text
supericons/
├── .plugin/
│   └── plugin.json
├── .mcp.json
├── assets/
│   └── supericons-mark.svg
├── examples/
│   ├── claude-code.mcp.json
│   ├── codex-config.toml
│   ├── cursor-mcp.json
│   └── generic-mcp.json
├── CHANGELOG.md
├── LICENSE
├── README.md
├── SECURITY.md
└── SUPPORT.md
```

## Task 1: Create The Public GitHub Repo

**Files:**
- No local file changes.

- [ ] **Step 1: Create the repository**

In GitHub, create a new public repository:

```text
Repository name: supericons
Owner: Curly Mole Labs / curlymolelabs
Visibility: Public
Initialize with README: No
Add .gitignore: No
Choose license: No
```

- [ ] **Step 2: Add the repo metadata**

Set:

```text
Description: MCP setup wrapper for Supericons semantic SVG icon search.
Website: https://supericons.dev
Topics: mcp, icons, svg, ai-coding-agents, cursor, claude-code, codex, semantic-search, lucide, tabler
```

- [ ] **Step 3: Keep the repo empty until files are copied**

Do not add GitHub-generated files. The local wrapper already includes the planned `README.md`, `LICENSE`, and docs.

## Task 2: Copy The Wrapper Into A Clean Local Public Repo Folder

**Files:**
- Source: `output/supericons/**`
- Create outside private repo: a clean folder for the public repo checkout.

- [ ] **Step 1: Choose a clean public repo folder**

Recommended local folder:

```powershell
D:\Personal\Business\Curly Mole Labs\Public Repos\supericons
```

- [ ] **Step 2: Clone the empty GitHub repo**

Run:

```powershell
New-Item -ItemType Directory -Force "D:\Personal\Business\Curly Mole Labs\Public Repos" | Out-Null
Set-Location "D:\Personal\Business\Curly Mole Labs\Public Repos"
git clone https://github.com/curlymolelabs/supericons.git
Set-Location "D:\Personal\Business\Curly Mole Labs\Public Repos\supericons"
```

Expected:

```text
warning: You appear to have cloned an empty repository.
```

- [ ] **Step 3: Copy only the wrapper files**

Run from the private Supericons repo root:

```powershell
$source = "D:\Personal\Business\Curly Mole Labs\Experiments\Apps\DailySprint\supericons\output\supericons"
$target = "D:\Personal\Business\Curly Mole Labs\Public Repos\supericons"
Copy-Item -Path "$source\*" -Destination $target -Recurse -Force
Copy-Item -Path "$source\.plugin" -Destination $target -Recurse -Force
Copy-Item -Path "$source\.mcp.json" -Destination $target -Force
```

Expected:

```text
No output means the copy succeeded.
```

## Task 3: Verify The Public Repo Is Safe

**Files:**
- Inspect: all files in the public repo folder.

- [ ] **Step 1: Confirm the expected file list**

Run:

```powershell
Set-Location "D:\Personal\Business\Curly Mole Labs\Public Repos\supericons"
Get-ChildItem -Recurse -Force | Select-Object FullName,Length
```

Expected:

```text
.plugin/plugin.json
.mcp.json
assets/supericons-mark.svg
examples/claude-code.mcp.json
examples/codex-config.toml
examples/cursor-mcp.json
examples/generic-mcp.json
CHANGELOG.md
LICENSE
README.md
SECURITY.md
SUPPORT.md
```

- [ ] **Step 2: Search for secret-shaped and private-project strings**

Run:

```powershell
Get-ChildItem -Recurse -File -Force |
  Select-String -Pattern "SUPABASE|SERVICE_ROLE|sb_secret|registry-records|records\.json|node_modules|reviewer_model|reasoning_effort|workflow_trace|agent_notes|\.env|premium-record-preview|public/registry"
```

Expected:

```text
No matches.
```

One allowed exception:

```text
SUPERICONS_API_KEY
```

This is allowed because it is a public setup variable name, not a real key.

- [ ] **Step 3: Validate JSON files**

Run:

```powershell
node -e "const fs=require('fs'); for (const f of ['.plugin/plugin.json','.mcp.json','examples/generic-mcp.json','examples/cursor-mcp.json','examples/claude-code.mcp.json']) JSON.parse(fs.readFileSync(f,'utf8')); console.log('json ok')"
```

Expected:

```text
json ok
```

## Task 4: Commit And Push The Public Repo

**Files:**
- Commit all files in the public repo folder.

- [ ] **Step 1: Check git status**

Run:

```powershell
git status --short
```

Expected:

```text
?? .mcp.json
?? .plugin/
?? CHANGELOG.md
?? LICENSE
?? README.md
?? SECURITY.md
?? SUPPORT.md
?? assets/
?? examples/
```

- [ ] **Step 2: Commit**

Run:

```powershell
git add .
git commit -m "Add Supericons MCP setup wrapper"
```

Expected:

```text
[main ...] Add Supericons MCP setup wrapper
```

- [ ] **Step 3: Push**

Run:

```powershell
git push origin main
```

Expected:

```text
main -> main
```

## Task 5: Update Directory Listings With The Public GitHub Link

**Files:**
- No code changes.

- [ ] **Step 1: Update Glama if editable**

Use:

```text
GitHub URL:
https://github.com/curlymolelabs/supericons
```

Keep Connector URL:

```text
https://mcp.supericons.dev/mcp
```

- [ ] **Step 2: Update MCP.so if editable**

Use:

```text
Homepage:
https://supericons.dev

GitHub:
https://github.com/curlymolelabs/supericons

npm:
https://www.npmjs.com/package/supericons-mcp
```

- [ ] **Step 3: Use the public repo for GitHub-required submissions**

Use the public repo for:

```text
Open Plugins
Cursor community lists
Awesome MCP lists
GitHub-based MCP directories
```

Do not use the private Supericons repo.

## Task 6: Add The Repo To Launch Posts And Docs

**Files:**
- Modify later if needed: Supericons website docs and marketing docs.

- [ ] **Step 1: Add repo link to launch copy**

Use:

```text
GitHub setup wrapper:
https://github.com/curlymolelabs/supericons
```

- [ ] **Step 2: Use this short social line**

```text
The Supericons MCP setup wrapper is public on GitHub, while the product and semantic registry remain protected.
```

- [ ] **Step 3: Use this support line**

```text
For setup issues, open an issue on the public setup wrapper repo. Do not include API keys or private screenshots.
```

---

## Verification Checklist

- [ ] Public repo exists.
- [ ] Public repo has only wrapper/docs/config files.
- [ ] Public repo contains no full registry JSON.
- [ ] Public repo contains no `.env` files.
- [ ] Public repo contains no Supabase keys.
- [ ] Public repo contains no private source folders.
- [ ] Public repo README shows local MCP setup.
- [ ] Public repo README shows hosted MCP endpoint.
- [ ] Public repo README explains Pro setup with `SUPERICONS_API_KEY`.
- [ ] JSON config files parse.
- [ ] GitHub repo link is ready for directory submissions.

## Rollback Plan

If the public repo accidentally includes private or sensitive material:

1. Immediately make the GitHub repo private.
2. Remove the sensitive files locally.
3. Rotate any exposed keys if secrets were included.
4. Force-push cleaned history only if needed.
5. Reopen the repo publicly after verifying the safety sweep again.

## Recommendation

Create this repo before the next wave of directory submissions and social posts.

This gives Supericons a trusted public install surface without giving competitors the product source or registry internals.
