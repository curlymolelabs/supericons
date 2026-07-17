# MCP inline preview and keyless access correction plan

Date: 2026-07-18
Status: investigation and implementation plan only
Scope: local MCP, hosted MCP, public web setup, documentation, and localized documentation

## Purpose

This plan addresses two user-facing gaps:

1. A visual icon preview appeared inside OpenCode chat when the hosted endpoint was called manually, but did not appear after OpenCode switched to the local `@supericons/mcp@0.4.19-beta.1` tool.
2. The API Keys documentation incorrectly says that every MCP user needs `SUPERICONS_API_KEY`, while the product and other setup guides support free keyless MCP use.

No product code, documentation copy, package, or deployment is changed by this plan.

## Confirmed product rules

### Free MCP access

Free icon search and other public read-only icon tools work without a Supericons account or API key.

The local package confirms this in code:

- No configured key returns the anonymous access tier.
- The anonymous tier can use the free icon set.
- Pro workflow tools check account access separately.

The hosted server also supports keyless use and records privacy-safe anonymous identifiers for aggregate service measurement.

### Account-bound access

`SUPERICONS_API_KEY` is optional for the free icon tools. It is used when the local MCP package needs to connect a request to a Supericons account for account-bound access.

Current account-bound examples include:

- Pro Motion Lab workflows
- Pro Converter workflows
- Any future paid icon access that is explicitly exposed through MCP

An API key does not buy or unlock access by itself. It identifies an account, and the account's purchases or subscription determine what is available.

### ChatGPT and future hosted app access

Do not make a custom API key a universal MCP requirement. ChatGPT can use anonymous read-only tools, but account-specific or write operations should use a standard OAuth flow. ChatGPT does not present a user's custom API key as the general authentication method for an MCP app.

Reference: [OpenAI Apps SDK authentication](https://developers.openai.com/apps-sdk/build/auth)

## Finding A: OpenCode inline preview

### What was reported

The same OpenCode client and model showed an icon contact sheet inside chat when the hosted service was used. After switching the OpenCode configuration to local beta.1, the preview tool returned links but the final answer did not show the contact sheet.

### What was directly verified

The current OpenCode configuration launches:

```json
{
  "mcp": {
    "supericons": {
      "type": "local",
      "command": ["npx", "-y", "@supericons/mcp@0.4.19-beta.1"]
    }
  }
}
```

The exact published `@supericons/mcp@0.4.19-beta.1` package was installed into a temporary audit directory and called through a real stdio MCP client. A five-icon Material preview returned:

- one text content item
- one `image/png` content item
- `image_included: true`
- a populated `markdown_image`
- five preview results

The PNG payload was present and non-empty.

OpenCode's own stored session record for the local beta call also contains:

- a completed `supericons_preview_icons` tool call
- `image_included: true`
- one stored `image/png` data attachment
- the direct PNG URL
- the ready-made Markdown image line

This disproves two initial theories:

- beta.1 is not missing preview image generation
- OpenCode did not discard the local MCP image attachment at ingestion

### Why the hosted examples looked different

The successful hosted examples did not use OpenCode's registered remote MCP tool. In those sessions, OpenCode reported that the Supericons MCP tools were unavailable. The agent then called `https://mcp.supericons.dev/mcp` manually through PowerShell.

That raw HTTP response included the base64 PNG and the `markdown_image` text. The agent copied the Markdown image line into its final answer, so OpenCode rendered the remote PNG inside chat.

For the local beta call, OpenCode used the real `supericons_preview_icons` tool. The tool returned the image and Markdown line, but the agent's final answer omitted the Markdown image syntax and incorrectly said the model could not render the image.

The same client and model were used, but the tool response reached the model through a different path.

### Current root-cause statement

The failure is at the final-answer presentation boundary, not in beta.1 image generation.

The current preview contract gives the agent several choices:

- embedded MCP image
- Markdown image
- direct PNG URL
- browser preview URL

The agent chose the least useful fallback even though OpenCode had already proved it could render the supplied Markdown image URL.

### Remaining uncertainty

An MCP server cannot force every model or client to include an image in the final answer. The product can make the correct action much harder to miss, but the final rendering still depends partly on client behavior.

Before changing code, run a fair transport comparison:

1. Use the same OpenCode version, model, prompt, icon refs, and session settings.
2. Register hosted MCP as a real remote MCP tool and local beta as a real local MCP tool.
3. Do not use PowerShell, Bash, or manual JSON-RPC as a substitute.
4. Capture the tool result content types, stored attachment, final answer text, and rendered chat output for both paths.
5. Repeat each path three times to separate a response-contract problem from one model-choice outlier.

### Proposed correction, only after the comparison

If the fair comparison reproduces the local-only failure:

1. Make local and hosted `preview_icons` response ordering and wording identical.
2. Put the ready-to-render Markdown image line in a short, dedicated text content item instead of burying it inside a JSON object.
3. Keep the MCP `image/png` content item.
4. Keep structured content for clients that consume fields directly.
5. Change the instruction from optional guidance to a clear rule:
   - When the user asks to see the preview in chat, include `markdown_image` exactly in the final answer.
   - Do not claim inline preview is unsupported until the Markdown image was attempted.
6. Preserve the direct PNG and browser preview links as fallbacks.

If both real MCP transports fail equally, treat this as an OpenCode presentation limitation and document the Markdown fallback instead of changing search behavior.

### Required preview verification

| Check | Expected result |
| --- | --- |
| Exact published package stdio call | Returns text plus `image/png` |
| Local and hosted preview contract | Same field meanings and content order |
| `include_image: true` | Non-empty PNG and `image_included: true` |
| `include_image: false` | No embedded image, links remain available |
| OpenCode local MCP, repeated three times | Final answer renders the contact sheet or includes the exact Markdown image |
| OpenCode remote MCP, repeated three times | Same presentation behavior as local |
| Client without inline image support | Receives direct PNG and browser preview links |
| Invalid or unknown icon refs | Returns zero results, never an unrelated full grid |

## Finding B: API-key documentation

### Confirmed contradiction

The setup documentation already says:

- free icons work without an account or API key
- free MCP environment variables may be left empty
- the free MCP tools do not require an API key

The API Keys page says the opposite:

- an API key is required for MCP
- Claude Code, Codex, Cursor, and other MCP users need `SUPERICONS_API_KEY`
- any call outside the browser needs an API key

The second set of claims is incorrect and creates unnecessary setup friction.

### Source and generated copies

The English source is in `docs-pages.js`, under `docs-access-api-keys`.

The same page is stored in all 12 source locale catalogs:

```text
data/i18n/messages/*.json
```

Those files are copied byte-for-byte into both public output trees:

```text
public/i18n/messages/*.json
mcp/public/i18n/messages/*.json
```

All three catalog trees currently contain 12 locale files, and every corresponding source and output file is byte-identical.

Changing only the visible English sentence would therefore leave translated copies and generated public copies inconsistent.

## Documentation correction design

### One access matrix

Use one short access matrix everywhere:

| Use | Account or key |
| --- | --- |
| Search free icons through local MCP | No key |
| Search free icons through hosted MCP | No key |
| Preview free icons | No key |
| Get a free icon by ID | No key |
| List free libraries | No key |
| Use purchased or account-bound icon access when offered | Account key required |
| Use Motion Lab through MCP | Pro account key required |
| Use Converter through MCP | Pro account key required |
| Use account-specific features in a future ChatGPT app | OAuth sign-in, not a pasted custom API key |

### API Keys page

Rewrite the page around three questions:

1. What works without a key?
2. When does a key connect my account?
3. What does my account need to own?

Required plain-language message:

> You do not need an API key to search, preview, or retrieve free icons through MCP. Add a key only when you want Supericons to use access connected to your account, such as Pro Motion Lab or Converter tools.

Remove or replace every universal claim that MCP or all programmatic use requires a key.

### Quickstart and client guides

Keep free setup first and complete. The user should be able to copy a working config without seeing an API key placeholder.

Put account-bound setup in a clearly optional second section:

> Optional for Pro and account-bound tools

For each client guide:

- show the keyless config first
- show the optional private environment value second
- say which tools need it
- never imply that free search is broken without it

### Landing page setup block

The client names on the landing page currently sit above one generic JSON block. They should become working tabs.

Each tab must show:

- the client's actual config format
- the actual config-file location or setup surface
- the keyless `@supericons/mcp@latest` setup
- an optional link to account-bound setup

The public landing page must keep `@latest`. It must not advertise a beta package.

The OpenCode tab must use its current local MCP shape:

```json
{
  "mcp": {
    "supericons": {
      "type": "local",
      "command": ["npx", "-y", "@supericons/mcp@latest"],
      "enabled": true
    }
  }
}
```

Reference: [OpenCode MCP servers](https://opencode.ai/docs/mcp-servers)

Codex must use TOML rather than the generic `mcpServers` JSON form. Other advertised clients must be checked against their official current documentation immediately before implementation.

### Troubleshooting

Split troubleshooting into two paths:

- Server or free search is unavailable
- Paid or account-bound tools are unavailable

The free-search path must not tell users to add an API key. The paid-access path should check the key, the owning account, and the relevant purchase or subscription.

### Search index and navigation copy

Update docs search terms and summaries so users searching for "API key" see:

- free MCP is keyless
- the key connects account access
- Motion Lab and Converter require Pro account access

Do not remove API-key help from premium setup pages.

## Files expected to change during implementation

This is an inventory, not authorization to edit them now.

Primary sources:

- `docs-pages.js`
- `lib/docs-guide-config.js`
- `lib/docs-search-index.js`
- `index.html`
- the landing MCP interaction code and styles
- `data/i18n/messages/*.json`

Generated public catalogs:

- `public/i18n/messages/*.json`
- `mcp/public/i18n/messages/*.json`

Verification:

- `scripts/verify-mcp-docs-setup.mjs`
- `scripts/verify-docs-site-render.mjs`
- `scripts/verify-localized-docs-bodies.mjs`
- a new access-claims consistency verifier
- a new landing client-tab behavior verifier

The MCP runtime auth logic is not expected to change for the docs correction.

## Required documentation verification

### Access behavior

1. Start the exact packed MCP package with no `SUPERICONS_API_KEY`.
2. Verify free `search_icons`, `preview_icons`, `get_icon`, and `list_libraries` calls succeed.
3. Verify Motion Lab and Converter return a clear account-access message without a Pro key.
4. Verify a controlled valid Pro-key test reaches the paid workflow boundary.
5. Verify no test or public artifact contains a real key.

### Claim consistency

Add a fail-closed verifier with stable rules:

- forbidden: "required for MCP"
- forbidden: "you need SUPERICONS_API_KEY" without a paid or account-bound qualifier
- forbidden: "all programmatic requests require a key"
- required: free MCP search works without a key
- required: API keys connect account access
- required: Motion Lab and Converter need Pro account access

Run the rules against:

- English source pages
- all 12 source locale catalogs
- both generated public catalog trees
- landing setup copy
- MCP package help and public metadata

Localized checks should validate meaning, not only HTML structure. Each locale's API-key page must contain reviewed equivalents of:

- free MCP access
- optional account connection
- paid workflow requirement

### Client setup tabs

For every advertised client:

- selecting the tab changes both the file location and snippet
- the copy button copies only the active snippet
- JSON snippets parse
- JSONC snippets parse under the documented client rules
- TOML snippets parse
- all package references use `@supericons/mcp@latest`
- none of the free snippets contains an API key placeholder
- keyboard navigation and selected-tab state work
- mobile layout remains readable

### Public release checks

- docs route render verification
- localization structure and catalog-copy verification
- VC-3 bundle-content check
- VC-4 license-and-canary check
- exact Netlify artifact inventory
- remote smoke of the API Keys page and every landing setup tab
- pinned rollback deployment and one-use release receipt

## Recommended sequence

1. Complete the fair OpenCode local-versus-remote MCP preview comparison.
2. Decide whether the preview correction belongs in MCP response wording, OpenCode-specific documentation, or both.
3. Update the English access rule and all related source copy in one change.
4. Update the landing client tabs from current official client documentation.
5. Translate only the affected documentation page and changed shared labels across all supported locales.
6. Rebuild both public catalog trees.
7. Run the access, client-tab, localization, VC-3, and VC-4 gates.
8. Release the web/docs correction through the guarded Netlify flow.
9. If the MCP preview response changes, publish it only through a separately versioned, packed-package release with its own client comparison.

## Release boundaries

The web/docs correction and an MCP preview response correction are separate release surfaces.

- The docs correction may deploy without changing the MCP package.
- An MCP preview correction needs a new prerelease and exact package verification.
- Neither change should alter search ranking.
- Neither change should require free users to create an account or API key.
- No invitation should point users to setup copy that still says free MCP requires a key.

