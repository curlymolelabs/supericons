# Docs Page UI/UX Implementation Plan

Based on the [UI/UX audit findings](../docs_ui_ux_audit.md) for the consolidated `/public/docs/index.html` page. This plan contains production-ready code for all 12 findings across 2 files: `index.html` and `docs.css`.

**Scope:** All changes are within Pass 1 of the consolidation rollout. No changes to `store.js` or other repo files.

**Files modified:**
- `public/docs/index.html` (complete replacement)
- `public/mcp/docs.css` (additions only, no existing rules changed)

---

## Table of Contents

1. [CSS Additions (docs.css)](#css-additions-docscss)
2. [Complete HTML (index.html)](#complete-html-indexhtml)
3. [Change Log vs Previous Exact Copy](#change-log-vs-previous-exact-copy)

---

## CSS Additions (docs.css)

Append all of the following to the end of the existing `docs.css`. No existing rules are modified.

```css
/* ──────────────────────────────────────────────────────────
   UI/UX AUDIT ADDITIONS
   Applied to consolidated docs page, April 2026
   ────────────────────────────────────────────────────────── */

/* ── Finding 1A: Sticky sidebar on desktop ─────────────── */
@media (min-width: 961px) {
  .docs-main > .docs-column:last-child {
    position: sticky;
    top: 24px;
    align-self: start;
  }
}

/* ── Finding 1B: Active TOC link highlighting ──────────── */
.docs-link-list a {
  transition: color 0.15s;
}

.docs-link-list a.is-active {
  color: var(--mcp-primary);
  font-weight: 700;
}

/* ── Finding 1C: Floating back-to-top button ───────────── */
.docs-scroll-top {
  position: fixed;
  bottom: 28px;
  right: 28px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid var(--mcp-border);
  background: var(--mcp-surface);
  color: var(--mcp-text);
  cursor: pointer;
  box-shadow: var(--mcp-shadow);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: translateY(12px);
  transition: opacity 0.25s, transform 0.25s;
  z-index: 100;
}

.docs-scroll-top[hidden] {
  display: none;
}

.docs-scroll-top.is-visible {
  opacity: 1;
  transform: translateY(0);
}

.docs-scroll-top:hover {
  background: var(--mcp-primary);
  color: #fff;
  border-color: transparent;
}

/* ── Finding 2A: Pro badge on tool cards ────────────────── */
.docs-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  vertical-align: middle;
  margin-left: 6px;
}

.docs-badge--pro {
  background: rgba(226, 109, 47, 0.14);
  color: var(--mcp-primary-deep);
}

/* ── Finding 2B: Muted meta cards ──────────────────────── */
.docs-card--muted {
  background: rgba(255, 255, 255, 0.5);
  border-style: dashed;
}

/* ── Finding 3: Card hover states ──────────────────────── */
.docs-card {
  transition: border-color 0.2s, box-shadow 0.2s;
}

.docs-card:hover {
  border-color: rgba(226, 109, 47, 0.28);
  box-shadow: 0 4px 16px rgba(226, 109, 47, 0.08);
}

/* ── Finding 6: Clickable pill badges ──────────────────── */
a.docs-pill {
  text-decoration: none;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}

a.docs-pill:hover {
  background: rgba(226, 109, 47, 0.12);
  border-color: var(--mcp-primary);
  color: var(--mcp-primary-deep);
}

/* ── Finding 7: External link indicator ────────────────── */
.docs-card a[target="_blank"]::after {
  content: ' \2197';
  font-size: 0.8em;
  opacity: 0.5;
}

/* ── Finding 8: Active nav link ────────────────────────── */
.docs-nav__link--active,
.docs-nav__link[aria-current="page"] {
  color: var(--mcp-primary-deep);
  font-weight: 700;
}

/* ── Finding 9: Compact code blocks for recipes ────────── */
.docs-code--compact pre {
  padding: 14px 16px;
}

.docs-code--compact code {
  font-size: 0.84rem;
  white-space: pre-wrap;
}

/* ── Finding 10: Footer link strip ─────────────────────── */
.docs-footer__links {
  display: flex;
  gap: 16px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.docs-footer__links a {
  color: var(--mcp-text-dim);
  text-decoration: none;
  font-size: 0.85rem;
}

.docs-footer__links a:hover {
  color: var(--mcp-primary-deep);
  text-decoration: underline;
}

/* ── Finding 11A: Sidebar above content on mobile ──────── */
@media (max-width: 960px) {
  .docs-main > .docs-column:last-child {
    order: -1;
  }
}

/* ── Finding 11B: Collapsible grids on mobile ──────────── */
@media (max-width: 720px) {
  .docs-grid--collapse > .docs-card:nth-child(n+5) {
    display: none;
  }

  .docs-grid--collapse.is-expanded > .docs-card:nth-child(n+5) {
    display: block;
  }

  .docs-expand-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    padding: 10px;
    margin-top: 8px;
    border: 1px solid var(--mcp-border);
    border-radius: var(--mcp-radius-md);
    background: rgba(255, 255, 255, 0.6);
    color: var(--mcp-text-dim);
    font-size: 0.88rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }

  .docs-expand-btn:hover {
    background: rgba(255, 255, 255, 0.9);
  }

  .docs-grid--collapse.is-expanded + .docs-expand-btn {
    display: none;
  }
}

@media (min-width: 721px) {
  .docs-expand-btn {
    display: none;
  }
}
```

---

## Complete HTML (index.html)

This is the full production-ready replacement for `public/docs/index.html`. All 12 audit findings are applied.

Remove the `<!-- NEW -->`, `<!-- REVISED -->`, and `<!-- Finding N -->` comments before shipping.

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Supericons Docs</title>
  <meta name="description" content="Supericons documentation: quickstart, MCP setup, premium access, client guides, current MCP tools, recipes, and workflow tools for Motion Lab and Converter.">
  <link rel="canonical" href="https://supericons.dev/docs/">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/mcp/docs.css">
</head>
<body>
  <div class="docs-shell">

    <!-- Finding 8: Added "Docs" active link with aria-current -->
    <nav class="docs-nav" aria-label="Primary">
      <a class="docs-nav__brand" href="/">
        <img src="/favicon.svg" alt="">
        <span>Supericons</span>
      </a>
      <div class="docs-nav__links">
        <a class="docs-nav__link docs-nav__link--active" href="/docs/" aria-current="page">Docs</a>
        <a class="docs-nav__link" href="#docs-guides">Client guides</a>
      </div>
    </nav>

    <!-- Finding 5: Hero rewritten as value proposition -->
    <section class="docs-hero">
      <span class="docs-eyebrow">Docs</span>
      <h1>Supericons docs and MCP setup</h1>
      <p>
        Everything you need to connect Supericons to your coding agent.
        Base setup takes under a minute. Add a Supericons API key to your MCP config to access any premium collections or Pro workflow tools tied to your account.
      </p>
      <div class="docs-hero__actions">
        <a class="docs-btn docs-btn--primary" href="#docs-quickstart">Quickstart</a>
        <a class="docs-btn docs-btn--secondary" href="/?view=api-keys">API Keys</a>
      </div>
      <div class="docs-pill-list" style="margin-top: 18px;">
        <span class="docs-pill">20,000+ free icons</span>
        <span class="docs-pill">8 MCP tools</span>
        <span class="docs-pill">Premium collection access</span>
        <span class="docs-pill">Motion Lab MCP for Pro</span>
        <span class="docs-pill">Converter MCP for Pro</span>
      </div>
    </section>

    <div class="docs-main">
      <div class="docs-column">

        <!-- ── Quickstart ──────────────────────────────── -->
        <!-- Finding 12: "collection (pack)" parenthetical on first use -->
        <section class="docs-section" id="docs-quickstart">
          <h2>Quickstart</h2>
          <p>Start with the base MCP server config. Free icons work immediately. Premium icons require a Pro subscription or collection (pack) purchase, plus a Supericons API key.</p>
          <p style="margin-top: 0;">Paste the snippet below into your client's MCP config file. If you are not sure where to find it, pick your client from the guides below.</p>
          <div class="docs-code">
            <button class="docs-copy" type="button" data-copy-target="docs-base-config">Copy</button>
            <pre><code id="docs-base-config">{
  "mcpServers": {
    "supericons": {
      "command": "npx",
      "args": ["-y", "supericons-mcp"]
    }
  }
}</code></pre>
          </div>
          <div class="docs-grid" style="margin-top: 18px;">
            <article class="docs-card">
              <h3>Free path</h3>
              <ul>
                <li>Add the base MCP config to your client.</li>
                <li>Restart or reload your MCP client.</li>
                <li>Use <code>search_icons</code> or <code>get_icon</code> right away.</li>
              </ul>
            </article>
            <article class="docs-card" id="docs-premium">
              <h3>Premium path</h3>
              <ul>
                <li>Subscribe to Pro or buy the collection you need.</li>
                <li>Open <a href="/?view=api-keys">API Keys</a> and generate an API key.</li>
                <li>Add <code>SUPERICONS_API_KEY</code> in the env or secrets field your client supports.</li>
              </ul>
            </article>
          </div>
        </section>

        <!-- ── Premium MCP setup ───────────────────────── -->
        <section class="docs-section">
          <h2>Premium MCP setup</h2>
          <p>An API key securely links your coding agent to your Supericons account. It unlocks whatever premium collections or Pro workflow tools you already own.</p>
          <div class="docs-code">
            <button class="docs-copy" type="button" data-copy-target="docs-premium-config">Copy premium example</button>
            <pre><code id="docs-premium-config">{
  "mcpServers": {
    "supericons": {
      "command": "npx",
      "args": ["-y", "supericons-mcp"],
      "env": {
        "SUPERICONS_API_KEY": "your_key_here"
      }
    }
  }
}</code></pre>
          </div>
          <p style="margin-top: 14px;">This JSON-style example fits clients that support an <code>env</code> object in their MCP config. Use the client-specific guide for the exact syntax your editor expects.</p>
          <p style="margin-top: 14px;">Today MCP supports icon search, icon retrieval, library discovery, Motion Lab preset exports, and Converter workflows for Pro users.</p>
        </section>

        <!-- ── Current MCP tools ───────────────────────── -->
        <!-- Finding 2A: Pro badges. Finding 2B: meta cards separated. Finding 11B: collapse on mobile. -->
        <section class="docs-section" id="docs-tools">
          <h2>MCP tools</h2>
          <div class="docs-grid docs-grid--collapse" id="toolsGrid">
            <article class="docs-card">
              <h3><code>search_icons</code></h3>
              <p>Find the closest icon match across the free libraries and any premium collections your account can access.</p>
            </article>
            <article class="docs-card">
              <h3><code>get_icon</code></h3>
              <p>Retrieve a specific icon payload with ready-to-use SVG output that can be inserted directly into code.</p>
            </article>
            <article class="docs-card">
              <h3><code>list_libraries</code></h3>
              <p>List the libraries and premium collection sources your MCP session can currently access.</p>
            </article>
            <article class="docs-card">
              <h3><code>list_motion_presets</code> <span class="docs-badge docs-badge--pro">Pro</span></h3>
              <p>Browse available Motion Lab presets before generating CSS or animated SVGs.</p>
            </article>
            <article class="docs-card">
              <h3><code>export_motion_css</code> <span class="docs-badge docs-badge--pro">Pro</span></h3>
              <p>Generate Motion Lab CSS for a chosen icon, preset, trigger, duration, and intensity without leaving your coding agent.</p>
            </article>
            <article class="docs-card">
              <h3><code>export_animated_svg</code> <span class="docs-badge docs-badge--pro">Pro</span></h3>
              <p>Generate a self-contained animated SVG for the selected icon and preset as a single MCP response.</p>
            </article>
            <article class="docs-card">
              <h3><code>convert_svg_to_png</code> <span class="docs-badge docs-badge--pro">Pro</span></h3>
              <p>Render SVG input to PNG with a controlled output width and optional background through the Pro converter workflow.</p>
            </article>
            <article class="docs-card">
              <h3><code>convert_png_to_svg</code> <span class="docs-badge docs-badge--pro">Pro</span></h3>
              <p>Trace PNG input to SVG with the same converter-quality controls used by the browser workflow.</p>
            </article>
          </div>
          <button class="docs-expand-btn" type="button" data-expand="toolsGrid">Show all 8 tools</button>
          <!-- Finding 2B: meta cards in muted, dashed-border style -->
          <div class="docs-grid" style="margin-top: 14px;">
            <article class="docs-card docs-card--muted">
              <h3>Access by plan</h3>
              <p>Free users can search and retrieve from all free libraries. Pro subscribers and collection owners can access their premium assets by connecting an API key.</p>
            </article>
            <article class="docs-card docs-card--muted">
              <h3>Workflow tools require Pro</h3>
              <p>Motion Lab MCP and Converter MCP are Pro-only. Collection ownership unlocks premium icon assets, but workflow tool access requires a Pro subscription.</p>
            </article>
          </div>
        </section>

        <!-- ── Client guides ───────────────────────────── -->
        <!-- Finding 6: Pills made clickable. Finding 7: external links get arrow via CSS. Finding 11B: collapse. -->
        <section class="docs-section" id="docs-guides">
          <h2>Client guides</h2>
          <p>The Supericons stdio server can be used with any MCP-capable client. The core configuration is the same, but every client has its own setup process and settings file.</p>
          <div class="docs-pill-list" style="margin-top: 14px; margin-bottom: 18px;">
            <a class="docs-pill" href="/mcp/claude-code/">Claude Code</a>
            <a class="docs-pill" href="/mcp/codex/">Codex</a>
            <a class="docs-pill" href="/mcp/cursor/">Cursor</a>
            <a class="docs-pill" href="https://opencode.ai/docs/mcp-servers" target="_blank" rel="noopener noreferrer">OpenCode</a>
            <a class="docs-pill" href="https://docs.cline.bot/mcp/adding-and-configuring-servers" target="_blank" rel="noopener noreferrer">Cline</a>
            <a class="docs-pill" href="https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/extend-coding-agent-with-mcp" target="_blank" rel="noopener noreferrer">Copilot agent</a>
            <a class="docs-pill" href="https://docs.windsurf.com/windsurf/cascade/mcp" target="_blank" rel="noopener noreferrer">Windsurf</a>
          </div>
          <div class="docs-grid docs-grid--collapse" id="guidesGrid">
            <article class="docs-card">
              <h3><a href="/mcp/claude-code/">Claude Code</a></h3>
              <p>Supericons setup guide plus Anthropic's official MCP docs for CLI setup, Windows notes, and troubleshooting.</p>
            </article>
            <article class="docs-card">
              <h3><a href="/mcp/codex/">Codex</a></h3>
              <p>Supericons setup guide plus OpenAI's official MCP docs for CLI and <code>config.toml</code> setup.</p>
            </article>
            <article class="docs-card">
              <h3><a href="/mcp/cursor/">Cursor</a></h3>
              <p>Supericons setup guide plus Cursor's official MCP docs for JSON config and in-app MCP settings.</p>
            </article>
            <article class="docs-card">
              <h3><a href="https://opencode.ai/docs/mcp-servers" target="_blank" rel="noopener noreferrer">OpenCode</a></h3>
              <p>Official OpenCode MCP docs for server config and CLI flow.</p>
            </article>
            <article class="docs-card">
              <h3><a href="https://docs.cline.bot/mcp/adding-and-configuring-servers" target="_blank" rel="noopener noreferrer">Cline</a></h3>
              <p>Official Cline docs for the Servers UI and <code>cline_mcp_settings.json</code> config.</p>
            </article>
            <article class="docs-card">
              <h3><a href="https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/extend-coding-agent-with-mcp" target="_blank" rel="noopener noreferrer">Copilot agent</a></h3>
              <p>Official GitHub docs for repository MCP config and Copilot environment secrets.</p>
            </article>
            <article class="docs-card">
              <h3><a href="https://docs.windsurf.com/windsurf/cascade/mcp" target="_blank" rel="noopener noreferrer">Windsurf</a></h3>
              <p>Official Windsurf docs for settings UI and <code>mcp_config.json</code> setup.</p>
            </article>
          </div>
          <button class="docs-expand-btn" type="button" data-expand="guidesGrid">Show all 7 guides</button>
        </section>

        <!-- ── Workflow Tools ──────────────────────────── -->
        <!-- Finding 4: "Using Supericons today" merged into this section as an inline callout -->
        <section class="docs-section" id="docs-workflow-tools">
          <h2>Workflow Tools</h2>
          <p>Motion Lab and Converter are free to browse in the browser. Exports (animation CSS, animated SVG, PNG, and SVG tracing) require a Pro subscription, both in the browser and through MCP.</p>
          <p style="margin-top: 14px;">Pro subscribers can also run both tools through MCP, triggering the same exports directly from their coding agent.</p>
          <p style="margin-top: 0;">
            <a href="/?view=motion-lab">Open Motion Lab in browser</a> ·
            <a href="/?view=converter">Open Converter in browser</a>
          </p>
          <div class="docs-grid">
            <article class="docs-card">
              <h3>Motion Lab MCP <span class="docs-badge docs-badge--pro">Pro</span></h3>
              <ul>
                <li>Preset discovery</li>
                <li>Trigger control</li>
                <li>Motion CSS export</li>
                <li>Standalone animated SVG export</li>
              </ul>
            </article>
            <article class="docs-card">
              <h3>Converter MCP <span class="docs-badge docs-badge--pro">Pro</span></h3>
              <ul>
                <li>SVG to PNG conversion</li>
                <li>PNG to SVG tracing</li>
                <li>Input inspection and warnings</li>
                <li>Suggested conversion settings</li>
              </ul>
            </article>
            <article class="docs-card docs-card--muted">
              <h3>Why this matters</h3>
              <p>Search-only MCP is useful, but workflow-tool access is the stronger Pro value proposition for design systems, prototyping, and coding-agent automation.</p>
            </article>
            <article class="docs-card docs-card--muted">
              <h3>Current status</h3>
              <p>Motion Lab MCP and Converter MCP are Pro-only workflow tools. Collection ownership still works for icon access, but workflow tooling requires Pro.</p>
            </article>
          </div>
        </section>

        <!-- ── Recipes and prompts ─────────────────────── -->
        <!-- Finding 9: Recipes as copy-pasteable prompt templates -->
        <section class="docs-section" id="docs-recipes">
          <h2>Starter prompts</h2>
          <p>Copy any of these prompts and paste them into your coding agent to get started.</p>
          <div class="docs-grid">
            <article class="docs-card">
              <h3>UI build</h3>
              <div class="docs-code docs-code--compact">
                <button class="docs-copy" type="button" data-copy-target="recipe-ui-build">Copy prompt</button>
                <pre><code id="recipe-ui-build">Find a tab icon for analytics.
Show the Lucide and Tabler options side by side.
Insert the chosen SVG into my React component.</code></pre>
              </div>
            </article>
            <article class="docs-card">
              <h3>Brand logos</h3>
              <div class="docs-code docs-code--compact">
                <button class="docs-copy" type="button" data-copy-target="recipe-brand-logos">Copy prompt</button>
                <pre><code id="recipe-brand-logos">Search Simple Icons for Stripe, Vercel, and Supabase.
Return the SVGs in monochrome.
Place them in a footer component.</code></pre>
              </div>
            </article>
            <article class="docs-card">
              <h3>Premium assets</h3>
              <div class="docs-code docs-code--compact">
                <button class="docs-copy" type="button" data-copy-target="recipe-premium">Copy prompt</button>
                <pre><code id="recipe-premium">Fetch icons from a premium collection tied to my Pro or collection access.
Drop them into a prototype component.
Keep access tied to my Supericons API key.</code></pre>
              </div>
            </article>
            <article class="docs-card">
              <h3>Explore what's available</h3>
              <div class="docs-code docs-code--compact">
                <button class="docs-copy" type="button" data-copy-target="recipe-discovery">Copy prompt</button>
                <pre><code id="recipe-discovery">List all Supericons MCP tools available to me.
Show which are free and which need Pro.
Then search for a secure login icon.</code></pre>
              </div>
            </article>
          </div>
        </section>

        <!-- ── Troubleshooting ─────────────────────────── -->
        <section class="docs-section" id="docs-troubleshooting">
          <h2>Troubleshooting</h2>
          <div class="docs-grid">
            <article class="docs-card">
              <h3>Server installed but no tools appear</h3>
              <p>Restart or reload the MCP client after saving your config. Most missing-tool issues are simply caused by the client needing a refresh.</p>
            </article>
            <article class="docs-card">
              <h3>Premium icons do not appear</h3>
              <p>Verify your account has an active Pro subscription or collection purchase, then generate a new API key and update your client's config.</p>
            </article>
            <article class="docs-card">
              <h3>Invalid or revoked key</h3>
              <p>Open API Keys, revoke the old key if needed, generate a new one, and update the MCP env or secrets field.</p>
            </article>
            <article class="docs-card">
              <h3>Need exact client syntax</h3>
              <p>Use the client guides above when your editor uses a different MCP config format than the JSON-style example on this page.</p>
            </article>
          </div>
        </section>
      </div>

      <!-- ── Sidebar ─────────────────────────────────── -->
      <!-- Finding 1A: sticky via CSS. Finding 4: removed "Current workflows" from TOC. Finding 11A: reordered on mobile via CSS. -->
      <aside class="docs-column">
        <section class="docs-sidebar">
          <h3>On this page</h3>
          <div class="docs-link-list">
            <a href="#docs-quickstart">Quickstart</a>
            <a href="#docs-premium">Premium setup</a>
            <a href="#docs-tools">MCP tools</a>
            <a href="#docs-guides">Client guides</a>
            <a href="#docs-workflow-tools">Workflow tools</a>
            <a href="#docs-recipes">Starter prompts</a>
            <a href="#docs-troubleshooting">Troubleshooting</a>
          </div>
        </section>

        <section class="docs-callout">
          <h3>What's live</h3>
          <p>Supericons MCP includes 8 tools: icon search, icon retrieval, library listing, Motion Lab preset browsing, motion CSS export, animated SVG export, SVG-to-PNG, and PNG-to-SVG tracing. Motion Lab and Converter exports are Pro-only.</p>
        </section>

        <section class="docs-sidebar">
          <h3>Useful links</h3>
          <div class="docs-link-list">
            <a href="/?view=pricing">Pricing</a>
            <a href="/?view=api-keys">API Keys</a>
            <a href="/">Open Supericons</a>
          </div>
        </section>
      </aside>
    </div>

    <!-- Finding 10: Footer with link strip -->
    <footer class="docs-footer">
      <p>Supericons docs. Official setup guidance for free and premium MCP workflows.</p>
      <div class="docs-footer__links">
        <a href="/">App</a>
        <a href="/?view=pricing">Pricing</a>
        <a href="/?view=api-keys">API Keys</a>
        <a href="/?view=terms">Terms</a>
        <a href="/?view=privacy">Privacy</a>
      </div>
    </footer>

    <!-- Finding 1C: Back-to-top button -->
    <button class="docs-scroll-top" id="docsScrollTop" aria-label="Back to top" hidden>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="18 15 12 9 6 15"/>
      </svg>
    </button>
  </div>

  <script>
    // ── Copy buttons (existing) ────────────────────────
    document.querySelectorAll('[data-copy-target]').forEach((button) => {
      button.addEventListener('click', async () => {
        const target = document.getElementById(button.getAttribute('data-copy-target'));
        if (!target) return;
        await navigator.clipboard.writeText(target.textContent || '');
        const original = button.textContent;
        button.textContent = 'Copied';
        window.setTimeout(() => {
          button.textContent = original;
        }, 1800);
      });
    });

    // ── Finding 1B: TOC active-section highlighting ────
    const tocLinks = document.querySelectorAll('.docs-sidebar .docs-link-list a[href^="#"]');
    const tocSections = [...tocLinks].map(a =>
      document.querySelector(a.getAttribute('href'))
    ).filter(Boolean);

    if (tocSections.length) {
      const tocObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            tocLinks.forEach(a => a.classList.remove('is-active'));
            const match = [...tocLinks].find(
              a => a.getAttribute('href') === '#' + entry.target.id
            );
            if (match) match.classList.add('is-active');
          }
        });
      }, { rootMargin: '-20% 0px -60% 0px' });

      tocSections.forEach(s => tocObserver.observe(s));
    }

    // ── Finding 1C: Back-to-top visibility ─────────────
    const scrollBtn = document.getElementById('docsScrollTop');
    if (scrollBtn) {
      scrollBtn.hidden = false;
      window.addEventListener('scroll', () => {
        scrollBtn.classList.toggle('is-visible', window.scrollY > 600);
      }, { passive: true });
      scrollBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // ── Finding 11B: Mobile expand buttons ─────────────
    document.querySelectorAll('[data-expand]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const grid = document.getElementById(btn.getAttribute('data-expand'));
        if (grid) {
          grid.classList.add('is-expanded');
          btn.style.display = 'none';
        }
      });
    });
  </script>
</body>
</html>
```

---

## Change Log vs Previous Exact Copy

This table summarizes every change made to the HTML relative to the "Exact Copy: Consolidated Docs Page HTML" section in the consolidation plan.

| Finding | What changed | Section affected |
|---------|-------------|-----------------|
| F1A | Sidebar sticky via CSS (no HTML change) | Sidebar |
| F1B | Added `IntersectionObserver` JS for TOC active state | `<script>` |
| F1C | Added `<button class="docs-scroll-top">` before closing `docs-shell` | New element |
| F2A | Added `<span class="docs-badge docs-badge--pro">Pro</span>` to 5 tool card `<h3>` elements. Removed "Pro only." suffix from descriptions. | MCP tools |
| F2B | Split meta cards (Entitlements, Workflow-tool gating) into separate `docs-grid` with `docs-card--muted` class | MCP tools |
| F3 | CSS-only (no HTML change) | All cards |
| F4 | Removed "Using Supericons today" section (4 cards). Merged browser-tool links into Workflow Tools section intro. Removed "Current workflows" from sidebar TOC. | Workflow Tools, sidebar |
| F5 | Rewrote hero `<p>` from feature list to value proposition | Hero |
| F6 | Changed 7 `<span class="docs-pill">` to `<a class="docs-pill" href="...">` in Client Guides | Client guides |
| F7 | CSS-only (no HTML change, uses `target="_blank"` selector) | Client guide cards |
| F8 | Added `<a class="docs-nav__link docs-nav__link--active" href="/docs/" aria-current="page">Docs</a>` to nav | Nav |
| F9 | Replaced `<ul>` lists with `<div class="docs-code docs-code--compact">` copy-pasteable prompts in 4 recipe cards | Recipes |
| F10 | Added `<div class="docs-footer__links">` with 5 links | Footer |
| F11A | CSS-only: sidebar `order: -1` on mobile (no HTML change) | Sidebar |
| F11B | Added `docs-grid--collapse` class and `<button class="docs-expand-btn">` to tools and guides grids. Added expand JS. | MCP tools, Client guides |
| F12 | Changed "collection purchase" to "collection (pack) purchase" in Quickstart | Quickstart |

### Section count change

| Metric | Before audit | After audit |
|--------|-------------|-------------|
| Main sections | 8 | 7 (merged "Using Supericons today" into "Workflow Tools") |
| Total cards | 33 | 29 (removed 4 from deleted section) |
| Sidebar TOC entries | 8 | 7 (removed "Current workflows") |
| Interactive elements | 2 copy buttons | 6 copy buttons + 1 back-to-top + 2 mobile expand buttons |
