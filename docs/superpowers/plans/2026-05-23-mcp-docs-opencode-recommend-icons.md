# MCP Docs OpenCode and recommend_icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the public Supericons MCP docs so OpenCode users are pointed to the working local npx setup and `recommend_icons` is documented as a first-class free icon planning tool.

**Architecture:** `docs-pages.js` is the English source used by the app docs renderer. Locale JSON catalogs mirror docs bodies and may need mechanical updates when English HTML tag structure changes. Verification should assert the public docs mention the working OpenCode setup, Smithery authentication caveat, and `recommend_icons` parameters.

**Tech Stack:** Vite static app, JavaScript docs source, JSON i18n catalogs, Node verification scripts.

---

### Task 1: Update Docs Source

**Files:**
- Modify: `docs-pages.js`

- [ ] **Step 1: Make OpenCode guidance concrete**

Update the Other MCP Clients page so OpenCode has copy-paste local config using `type: "local"`, `command: ["npx", "-y", "@supericons/mcp@latest"]`, and `enabled: true`.

- [ ] **Step 2: Clarify hosted and Smithery paths**

State that local `npx` is the recommended OpenCode path. Mention that Smithery listings may require Smithery authentication depending on the client, and that direct hosted HTTP MCP is not the recommended OpenCode setup right now.

- [ ] **Step 3: Document `recommend_icons`**

Add `recommend_icons` to the MCP tools overview table and the Icon Tools reference. Include `task`, `slots`, `library`, `style`, `locale`, `limit_per_slot`, and `response_mode`.

### Task 2: Add Verification

**Files:**
- Modify: `scripts/verify-mcp-docs-setup.mjs`

- [ ] **Step 1: Assert OpenCode setup exists**

Read `docs-pages.js` and assert it contains `@supericons/mcp@latest`, `"type": "local"`, and the OpenCode config heading.

- [ ] **Step 2: Assert hosted caveats exist**

Assert the docs mention Smithery authentication and that OpenCode should use local npx rather than direct hosted HTTP MCP.

- [ ] **Step 3: Assert `recommend_icons` docs exist**

Assert the docs mention `recommend_icons`, `response_mode`, `limit_per_slot`, and the compact `plan` response mode.

### Task 3: Keep Localized Catalogs Valid

**Files:**
- Possibly modify: `data/i18n/messages/*.json`
- Possibly modify: `public/i18n/messages/*.json`
- Possibly modify: `mcp/public/i18n/messages/*.json`

- [ ] **Step 1: Run localized docs verifier**

Run `npm run verify:localized-docs-bodies`.

- [ ] **Step 2: If it fails, mirror the changed HTML structure**

Mechanically update only the changed docs body entries so the tag sequence remains aligned. Keep code snippets and tool names literal.

### Task 4: Verify

**Files:**
- No source edits expected.

- [ ] **Step 1: Run docs setup verifier**

Run `npm run verify:mcp-docs-setup`. Expected: `verify-mcp-docs-setup: ok`.

- [ ] **Step 2: Run localized docs verifier**

Run `npm run verify:localized-docs-bodies`. Expected: `verify-localized-docs-bodies: ok`.

- [ ] **Step 3: Run public safety verifier**

Run `npm run verify:public-safety`. Expected: public-safety scan passes.

- [ ] **Step 4: Run build if earlier checks pass**

Run `npm run build`. Expected: Vite build completes.

