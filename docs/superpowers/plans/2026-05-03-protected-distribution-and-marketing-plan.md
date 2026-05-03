# Protected Distribution And Marketing Plan

Date: 2026-05-03

## Current Verified State

- The root Supericons web app package is private and is not meant to be published to npm.
- The public website build is produced by `npm run build` and published from `dist` through Netlify.
- The MCP package is `supericons-mcp`.
- The npm registry already has `supericons-mcp@0.3.1`.
- The current MCP npm package candidate includes large public data files:
  - `public/icon-index.json`
  - `public/icon-index-solid.json`
  - `public/registry-records.json`
  - `public/registry-summary.json`
  - `public/synonyms.json`
- The current MCP package therefore works well as a local/offline-capable package, but it also exposes much of the searchable corpus to anyone who installs it.

## Distribution Protection Decision

Do not publish the current full-data MCP package as the next npm release if the goal is to reduce cloning and reverse-engineering risk.

Instead, ship a protected MCP package that acts mainly as a hosted gateway client:

- Keep the MCP package small.
- Route search and recommendation requests to the hosted Supericons/Supabase search gateway.
- Return ready-to-use icon results from the hosted service.
- Keep the full registry, ranking logic, private search features, and maintenance workflow server-side.
- Keep only minimal public metadata in npm when needed for docs, tool descriptions, and graceful error messages.

This will not make copying impossible, because public SVG output can always be copied after it is returned. It does, however, stop npm from distributing the full registry and search corpus as a convenient bulk file.

## Protected MCP Package Plan

### 1. Split MCP Package Modes

Create two distribution modes:

- `hosted` mode for npm release.
- `local-dev` mode for internal development and emergency fallback.

The public npm package should default to hosted mode.

### 2. Move Public Search Payload Server-Side

Update the hosted MCP search response so the package does not need to map hosted IDs back to a local full icon index.

The hosted gateway should return enough public-safe data for the MCP tools:

- icon id
- library
- library display name
- label
- style
- SVG payload or safe asset response
- short semantic reason
- public semantic payload

### 3. Trim npm `files`

For the protected npm release, remove bulk registry and icon-index files from `mcp/package.json` `files`.

Candidate removals:

- `public/icon-index.json`
- `public/icon-index-solid.json`
- `public/registry-records.json`
- `public/registry-summary.json`
- `public/synonyms.json`

Candidate retained files:

- `index.js`
- `auth.js`
- `hosted-search-client.js`
- `recommend-icons.js` if it no longer requires full local data
- hosted Motion Lab and Converter clients
- small package metadata
- changelog

### 4. Keep Premium Logic Hosted

Premium access checks should stay server-side where possible.

The package can send `SUPERICONS_API_KEY`, but it should not contain premium manifests or private ranking logic.

### 5. Verification Gates

Before publishing npm:

- `npm run build`
- `npm run verify:mcp-docs-setup`
- `npm run verify:motion-lab-mcp-package`
- `npm run verify:mcp-variant-access`
- `npm run evaluate:agent-first-mcp-ux`
- `npm pack --dry-run --json` from `mcp`
- inspect package file list and size
- verify `npx -y supericons-mcp@next` or a local tarball smoke test

### 6. Versioning

Because `supericons-mcp@0.3.1` is already published, the next publish must use a new version.

Recommended next version:

- `0.4.0` if the npm package becomes hosted/thin by default.
- `0.3.2` only if it is a small patch that keeps the same full-data distribution model.

Given the protection goal, use `0.4.0`.

## Website Distribution Plan

### Netlify

Netlify already builds with:

```text
npm run build
```

and publishes:

```text
dist
```

Before launch:

- deploy latest committed branch
- verify homepage loads
- verify icon search loads quickly
- verify Tags menu works in light and dark mode
- verify MCP docs page loads
- verify no admin artifacts are present in production `dist`

### Supabase

Supabase is now the correct place for protected registry/search logic.

Before launch:

- deploy hosted search functions
- verify `mcp-search`
- verify `search-icons`
- verify API-key validation
- verify search rate limiting still works
- verify no service key is exposed in public files or npm package

## Marketing Recap From Strategy Folder

### Positioning

Supericons should be positioned as:

> Intent-based icon search and delivery for humans and AI coding agents.

This is sharper than only saying "20,000+ icons." The strategy docs repeatedly point to the same wedge: agents and builders do not want to browse forever; they want the right visual by intent.

### Core Product Hook

The strongest hook is semantic retrieval:

- humans search in normal words
- agents ask for concepts
- MCP returns useful choices with reasons
- tags and semantic metadata improve discovery

### Audience

Primary:

- solo builders
- SaaS and dashboard makers
- AI app builders
- developers using Cursor, Claude, Codex, or other coding agents

Secondary:

- designers who want faster icon selection
- no-code builders
- teams creating launch pages and product screenshots

### Main Distribution Channels

Use the following order:

1. Supericons website
2. MCP/npm package
3. GitHub-ready free kits
4. Docs pages with agent prompt examples
5. Product Hunt launch
6. Reddit and developer communities
7. X posts and short demo clips
8. AI agent directories and MCP directories
9. VS Code / Open VSX later, after MCP adoption is proven

### Launch Message

Recommended simple launch message:

> Search icons by what you mean, not what the icon is named. Supericons helps builders and AI agents find the right icon faster across 20,000+ curated icons.

### Launch Assets

Prepare these before broad promotion:

- short demo of human browser search
- short demo of MCP prompt-to-icon recommendation
- before/after comparison against generic icon search
- AI dashboard sidebar prompt example
- "Find me icons for..." prompt examples
- GitHub README for free UI kits
- docs page for MCP search prompts

### Marketing Sequence

#### Phase 1: Quiet Launch

- Deploy website.
- Publish protected MCP npm package.
- Test with real agents.
- Fix onboarding friction.

#### Phase 2: Proof Posts

- Show specific prompts and results.
- Use concrete examples:
  - AI dashboard sidebar
  - admin dashboard
  - SaaS billing/settings
  - status and feedback states

#### Phase 3: Directory And Community Distribution

- Submit to MCP directories.
- Publish GitHub kits.
- Share in developer communities only with practical examples.

#### Phase 4: Bigger Launch

- Product Hunt.
- Launch article.
- Demo video.
- X and LinkedIn thread.

## Recommended Immediate Next Step

Do not publish npm yet.

First build the protected `supericons-mcp@0.4.0` package:

1. Make hosted search return complete public-safe MCP result payloads.
2. Remove bulk corpus files from npm package contents.
3. Keep internal/full-data package behavior only for local development.
4. Verify `npm pack --dry-run` package size drops substantially.
5. Smoke test the package from a tarball.
6. Then publish `supericons-mcp@0.4.0`.

After that, execute the quiet launch checklist and start the marketing sequence.
