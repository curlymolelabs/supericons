# Supericons Public Surfaces

This repository is the private working repo for Supericons. Do not make the full repo public.

Only the surfaces below are intended to leave the repo.

## Netlify Website

- Public artifact: `dist/`
- Build command: `npm run build`
- Config: `netlify.toml`
- Rule: deploy the built `dist/` folder only. Do not publish source folders, plans, audits, archives, or generated review files.

## npm MCP Package

- Public artifact: the npm tarball produced from `mcp/`
- Publish directory: `mcp/`
- Guardrail: `mcp/package.json` uses a `files` allowlist.
- Guardrail: `npm --prefix mcp run prepublishOnly` runs public-safety and package verification.
- Rule: never publish from the repository root.

## Hosted MCP Service

- Runtime source: `mcp/remote-server.js` plus the MCP runtime files it imports.
- Rule: deploy only the MCP service context. Do not deploy docs, plans, archives, strategy drafts, review HTML, screenshots, or local scratch output.
- Verification: run `npm --prefix mcp run prepublishOnly` before a hosted MCP redeploy because it checks the same publishable MCP boundary.

## Hosted Converter Service

- Runtime source today: converter service/runtime files only, such as `tools/converter-proof-service/` when that service is used.
- Rule: keep converter deployment context narrow. Do not deploy the full private repo unless the deploy system excludes private folders.
- Guardrail: `.dockerignore` excludes private and generated workspace folders for Docker-style build contexts.

## Lightweight Public GitHub MCP Repo

- Public artifact: generated lightweight MCP distribution, currently represented by `output/supericons/`.
- Rule: treat this as an export artifact. Review and publish only the generated export contents, not this private working repo.
- Required files should be public-facing only, such as README, SUPPORT, SECURITY, plugin/MCP manifests, and setup examples.

## Private By Default

These areas are private unless explicitly reviewed and exported:

- `archive/`
- `docs/archive/`
- `docs/audits/`
- `docs/superpowers/`
- `docs/vision-deck/`
- `plans/`
- `strategy/`
- `output/`
- `video/`
- local screenshots, scratch files, review HTML, and temporary npm test folders

## Required Checks Before Public Release

Run these before publishing or deploying:

```powershell
npm run verify:public-safety
npm --prefix mcp run prepublishOnly
npm pack --dry-run --json
npm --prefix mcp pack --dry-run --json
```

For a full website release, also run:

```powershell
npm run build
```

The checks must not report personal email addresses, local user paths, `.env.local`, hardcoded service secrets, private process metadata, or prompt-injection phrases in publishable files.
