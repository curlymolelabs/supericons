import {
  MOTION_LAB_PRESET_GROUPS,
  listMotionLabPresetMeta,
} from './lib/motion-lab-presets.js';

const docsHref = (view) => `/?view=${view}`;
const docsLink = (view, label) => `<a href="${docsHref(view)}" data-docs-view="${view}">${label}</a>`;
const appLink = (view, label) => `<a href="/?view=${view}" data-docs-view="${view}">${label}</a>`;

const MOTION_LAB_GROUP_GUIDE = Object.freeze({
  motion: {
    title: 'Motion',
    description: 'Everyday motion presets for attention, rhythm, pulse, and ambient movement. Use these when the icon should feel alive without reading like a full scene change.',
  },
  entrances: {
    title: 'Entrances',
    description: 'Arrival presets for icons that appear with a clear beginning. Use these when content enters the screen, opens, or becomes newly available.',
  },
  exits: {
    title: 'Exits',
    description: 'Departure presets for icons that need to leave cleanly. Use these when an icon dismisses, completes, closes, or hands off to the next state.',
  },
  saved: {
    title: 'Special',
    description: 'Showpiece presets with more character or visual effects. Use these sparingly for feature highlights, celebratory moments, or distinctive branded interactions.',
  },
});

const motionLabPresetMeta = listMotionLabPresetMeta();
const motionLabPresetCount = motionLabPresetMeta.length;
const motionLabGroupCount = MOTION_LAB_PRESET_GROUPS.length;
const motionLabPresetTableRows = motionLabPresetMeta
  .map((preset) => `<tr><td><code>${preset.id}</code></td><td>${preset.label}</td><td>${preset.group}</td><td>${preset.description}</td></tr>`)
  .join('');
const motionLabGroupRows = MOTION_LAB_PRESET_GROUPS
  .map((group) => {
    const guide = MOTION_LAB_GROUP_GUIDE[group.key] || { title: group.label, description: '' };
    return `<tr><td>${guide.title}</td><td>${group.items.length}</td><td>${guide.description}</td></tr>`;
  })
  .join('');

function renderPlaceholderBody({ title, summary, todayLinks = [] }) {
  const linksMarkup = todayLinks.length
    ? `<div class="docs-link-list docs-link-list--placeholder">${todayLinks
      .map((link) => link.external
        ? `<a href="${link.href}" target="_blank" rel="noopener noreferrer">${link.label}</a>`
        : docsLink(link.view, link.label))
      .join('')}</div>`
    : '';

  return `
    <section class="docs-section" id="page-intro">
      <h2 class="docs-section__title">${title}</h2>
      <p class="docs-section__copy">${summary}</p>
    </section>
    <section class="docs-callout" id="page-next">
      <h3>Use these pages right now</h3>
      <p>While this section is being filled out, the guides below are already live and ready to use.</p>
      ${linksMarkup}
    </section>
  `;
}

const docsPageGroups = [
  {
    label: 'Overview',
    pages: ['docs', 'docs-quickstart', 'docs-what-is-supericons'],
  },
  {
    label: 'MCP Setup',
    pages: ['docs-mcp-universal', 'docs-claude-code', 'docs-codex', 'docs-cursor', 'docs-mcp-others'],
  },
  {
    label: 'MCP Reference',
    pages: ['docs-mcp-tools', 'docs-mcp-icons', 'docs-mcp-motion', 'docs-mcp-converter'],
  },
  {
    label: 'Motion Lab',
    pages: ['docs-motion-lab', 'docs-motion-lab-presets', 'docs-motion-lab-triggers', 'docs-motion-lab-exports'],
  },
  {
    label: 'Converter',
    pages: ['docs-converter-guide', 'docs-converter-png-to-svg', 'docs-converter-svg-to-png', 'docs-converter-settings'],
  },
  {
    label: 'Access and API Keys',
    pages: ['docs-access-api-keys', 'docs-access-premium'],
  },
  {
    label: 'Troubleshooting',
    pages: ['docs-troubleshooting'],
  },
];

const docsPages = {
  docs: {
    navLabel: 'Introduction',
    kicker: 'Overview',
    pageTitle: 'Supericons Docs',
    summary: 'Set up MCP, learn Motion Lab, and use Converter.',
    bodyHtml: `
      <section class="docs-section" id="docs-start-here">
        <h2 class="docs-section__title">Start here</h2>
        <div class="docs-grid docs-grid--cards">
          <article class="docs-card">
            <div class="docs-card__head">
              <h3>Get started fast</h3>
              <a class="docs-btn docs-btn--ghost" href="${docsHref('docs-quickstart')}" data-docs-view="docs-quickstart">Read the quickstart</a>
            </div>
            <p>Set up the MCP server and run your first icon query in under 5 minutes.</p>
          </article>
          <article class="docs-card">
            <div class="docs-card__head">
              <h3>Set up MCP</h3>
              <a class="docs-btn docs-btn--ghost" href="${docsHref('docs-mcp-universal')}" data-docs-view="docs-mcp-universal">Choose your client</a>
            </div>
            <p>Step-by-step setup for Claude Code, Codex CLI, Cursor, and other coding agents.</p>
          </article>
          <article class="docs-card">
            <div class="docs-card__head">
              <h3>Learn Motion Lab</h3>
              <a class="docs-btn docs-btn--ghost" href="${docsHref('docs-motion-lab')}" data-docs-view="docs-motion-lab">Open the guide</a>
            </div>
            <p>Browse presets, preview animations, and export as CSS or animated SVG.</p>
          </article>
          <article class="docs-card">
            <div class="docs-card__head">
              <h3>Use the Converter</h3>
              <a class="docs-btn docs-btn--ghost" href="${docsHref('docs-converter-guide')}" data-docs-view="docs-converter-guide">Open the guide</a>
            </div>
            <p>PNG to SVG, SVG to PNG, and how to choose the right settings for your source image.</p>
          </article>
        </div>
        <p class="docs-section__copy">Free icon browsing and the customize panel are self-explanatory in the app. This docs section covers MCP integration, Motion Lab, and Converter, where setup or parameter choices are non-obvious.</p>
      </section>
    `,
  },
  'docs-quickstart': {
    navLabel: 'Quickstart',
    kicker: 'Overview',
    pageTitle: 'Quickstart',
    summary: 'Get Supericons running in your coding agent in under 5 minutes.',
    bodyHtml: `
      <section class="docs-section" id="quickstart-free">
        <h2 class="docs-section__title">Free setup</h2>
        <p class="docs-section__copy">Free icons work without an account or API key. Add the MCP server to your client and start searching.</p>
        <div class="docs-grid docs-grid--cards">
          <article class="docs-card">
            <h3>Add the server</h3>
            <p>Choose your client below, or open the universal setup guide for the base config values.</p>
            <div class="docs-link-list docs-link-list--inline">
              ${docsLink('docs-mcp-universal', 'Universal setup')}
              ${docsLink('docs-claude-code', 'Claude Code')}
              ${docsLink('docs-codex', 'Codex')}
              ${docsLink('docs-cursor', 'Cursor')}
              ${docsLink('docs-mcp-others', 'Others')}
            </div>
          </article>
          <article class="docs-card">
            <h3>Reload your session</h3>
            <p>Restart your coding agent session. In Claude Code and Codex, type <code>/mcp</code> to confirm Supericons appears in the list.</p>
          </article>
          <article class="docs-card">
            <h3>Run your first query</h3>
            <p>Ask your agent to find an icon. Try one of these prompts:</p>
            <ul>
              <li>"Find me a settings gear icon from Lucide."</li>
              <li>"Search for a loading spinner in Tabler."</li>
              <li>"Get the icon with ID heart from Phosphor."</li>
            </ul>
          </article>
        </div>
      </section>
      <section class="docs-section" id="quickstart-premium">
        <h2 class="docs-section__title">Premium setup</h2>
        <p class="docs-section__copy">To access premium animated collections, Motion Lab, and Converter through MCP, you need three things in place before your agent can use them.</p>
        <ol class="docs-list docs-list--numbered">
          <li>A Supericons account with a Pro account or a premium collection purchase.</li>
          <li>An API key generated from your Supericons dashboard under API Keys.</li>
          <li>Your <code>SUPERICONS_API_KEY</code> environment variable added to your MCP client config.</li>
        </ol>
        <p class="docs-section__copy">Then follow the universal setup guide or your client&apos;s setup guide to add the key:</p>
        <div class="docs-link-list docs-link-list--inline">
          ${docsLink('docs-mcp-universal', 'Universal setup with API key')}
          ${docsLink('docs-claude-code', 'Claude Code with API key')}
          ${docsLink('docs-codex', 'Codex with API key')}
          ${docsLink('docs-cursor', 'Cursor with API key')}
          ${docsLink('docs-mcp-others', 'Other clients')}
        </div>
      </section>
      <section class="docs-callout" id="quickstart-note">
        <h3>Your key carries your account entitlement, not access</h3>
        <p>Your API key carries your account entitlement. The key itself does not grant access. If your account does not have a Pro account or a premium collection purchase, adding a key will not unlock premium tools.</p>
      </section>
    `,
  },
  'docs-what-is-supericons': {
    navLabel: 'What Is Supericons',
    kicker: 'Overview',
    pageTitle: 'What Is Supericons',
    bodyHtml: `
      <section class="docs-section" id="what-is-intro">
        <p class="docs-section__copy">Supericons gives you 20,000+ open-source SVG icons from 10 libraries in one searchable interface. Search by name, concept, or style. Customize color, size, stroke, and fill in real time. Export as SVG, PNG, or React, Vue, or Svelte components with one click.</p>
        <p class="docs-section__copy">For AI-assisted development, Supericons ships a dedicated MCP server. Your coding agent can search and retrieve icons without switching to a browser. In the browser, you can open Motion Lab and Converter, use the controls, and preview the result without a Pro account. Exporting, downloading, or copying the final output requires a Pro account or a premium collection purchase. Through MCP, Motion Lab and Converter tools require a Pro account or a premium collection purchase.</p>
      </section>
      <section class="docs-section" id="what-is-free-pro">
        <h2 class="docs-section__title">Free vs. Pro</h2>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Free</th>
                <th>Pro</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>20,000+ SVG icons from 10 libraries</td><td>Yes</td><td>Yes</td></tr>
              <tr><td>AI semantic search</td><td>Yes</td><td>Yes</td></tr>
              <tr><td>Real-time customization (color, size, stroke, fill)</td><td>Yes</td><td>Yes</td></tr>
              <tr><td>Export as SVG, PNG, React, Vue, Svelte</td><td>Yes</td><td>Yes</td></tr>
              <tr><td>MCP: search and retrieve icons</td><td>Yes</td><td>Yes</td></tr>
              <tr><td>Premium animated icon collections</td><td>No</td><td>Yes</td></tr>
              <tr><td>Open Motion Lab and preview animation presets in browser</td><td>Yes</td><td>Yes</td></tr>
              <tr><td>Export Motion Lab CSS or animated SVG</td><td>No</td><td>Yes</td></tr>
              <tr><td>Open Converter and preview conversion result in browser</td><td>Yes</td><td>Yes</td></tr>
              <tr><td>Download converted file (PNG or SVG)</td><td>No</td><td>Yes</td></tr>
              <tr><td>Motion Lab tools via MCP</td><td>No</td><td>Yes</td></tr>
              <tr><td>Converter tools via MCP</td><td>No</td><td>Yes</td></tr>
              <tr><td>30-day rolling collection claim (1 per billing cycle)</td><td>No</td><td>Yes</td></tr>
            </tbody>
          </table>
        </div>
      </section>
      <section class="docs-section" id="what-is-libraries">
        <h2 class="docs-section__title">The 10 free icon libraries</h2>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead>
              <tr>
                <th>Library</th>
                <th>Style</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Lucide</td><td>Clean, consistent, open-source</td></tr>
              <tr><td>Tabler</td><td>5,000+ bold one-line icons</td></tr>
              <tr><td>Phosphor</td><td>Flexible, multi-weight</td></tr>
              <tr><td>Heroicons</td><td>Tailwind CSS companion, outline and solid</td></tr>
              <tr><td>Bootstrap Icons</td><td>Official Bootstrap companion</td></tr>
              <tr><td>Iconoir</td><td>High-quality clean outlines</td></tr>
              <tr><td>Ionicons</td><td>Web and mobile interface icons</td></tr>
              <tr><td>Material Symbols</td><td>Google variable font icons (weight, fill, grade, optical size)</td></tr>
              <tr><td>MingCute</td><td>Broad interface coverage, modern</td></tr>
              <tr><td>Simple Icons</td><td>3,400+ brand and company logos</td></tr>
            </tbody>
          </table>
        </div>
      </section>
      <section class="docs-section" id="what-is-next">
        <h2 class="docs-section__title">Where to go next</h2>
        <div class="docs-link-list docs-link-list--inline">
          ${docsLink('docs-mcp-universal', 'Set up MCP')}
          ${appLink('pricing', 'Get Pro')}
          ${appLink('api-keys', 'API Keys')}
        </div>
        <p class="docs-section__copy">${docsLink('docs-mcp-universal', 'Set up MCP')} - Get the MCP server running in your coding agent</p>
        <p class="docs-section__copy">${appLink('pricing', 'Get Pro')} - See what a Pro account includes</p>
        <p class="docs-section__copy">${appLink('api-keys', 'API Keys')} - Understand how authentication works</p>
      </section>
    `,
  },
  'docs-mcp-universal': {
    navLabel: 'Universal setup',
    kicker: 'MCP Setup',
    pageTitle: 'Universal MCP Setup',
    summary: 'The base server config for any MCP-capable coding agent. Adapt to your client&apos;s settings format.',
    bodyHtml: `
      <section class="docs-section" id="universal-free">
        <h2 class="docs-section__title">Free setup</h2>
        <p class="docs-section__copy">Free icons work without an account or API key. Any coding agent that can launch a local stdio MCP server can use Supericons.</p>
        <p class="docs-section__copy">Use this JSON config block when your client accepts <code>command</code>, <code>args</code>, and optional <code>env</code> fields:</p>
        <div class="docs-code docs-code--with-copy">
          <button class="docs-copy docs-copy--overlay" type="button" data-copy-target="docs-universal-free">Copy</button>
          <pre><code id="docs-universal-free">{
  "mcpServers": {
    "supericons": {
      "command": "npx",
      "args": ["-y", "supericons-mcp"]
    }
  }
}</code></pre>
        </div>
        <p class="docs-section__copy">If your client uses TOML or another wrapper format, keep the same <code>command</code> and <code>args</code> values and adapt only the surrounding syntax to your client&apos;s settings format.</p>
      </section>
      <section class="docs-section" id="universal-premium">
        <h2 class="docs-section__title">Premium setup</h2>
        <p class="docs-section__copy">To unlock premium collections, Motion Lab tools, and Converter tools, add your API key in the server&apos;s env or secrets field:</p>
        <div class="docs-code docs-code--with-copy">
          <button class="docs-copy docs-copy--overlay" type="button" data-copy-target="docs-universal-premium">Copy</button>
          <pre><code id="docs-universal-premium">{
  "mcpServers": {
    "supericons": {
      "command": "npx",
      "args": ["-y", "supericons-mcp"],
      "env": {
        "SUPERICONS_API_KEY": "your-key-here"
      }
    }
  }
}</code></pre>
        </div>
        <div class="docs-callout">
          <h3>Where to get your key</h3>
          <p>Generate your API key at supericons.dev under ${appLink('api-keys', 'API Keys')}. Your key must be linked to an account with a ${appLink('pricing', 'Pro account')} or a premium collection purchase. Access is determined by your account, not the key itself.</p>
        </div>
      </section>
      <section class="docs-section" id="universal-guides">
        <h2 class="docs-section__title">Choose the right guide</h2>
        <div class="docs-grid docs-grid--cards">
          <article class="docs-card">
            <h3>${docsLink('docs-claude-code', 'Claude Code')}</h3>
            <p>CLI command, config file scopes, and troubleshooting steps specific to Claude Code.</p>
          </article>
          <article class="docs-card">
            <h3>${docsLink('docs-codex', 'Codex')}</h3>
            <p>CLI command, TOML config shape, and trusted-project notes for Codex CLI and the IDE extension.</p>
          </article>
          <article class="docs-card">
            <h3>${docsLink('docs-cursor', 'Cursor')}</h3>
            <p>Global and project config file locations, plus in-app verification steps for Cursor.</p>
          </article>
          <article class="docs-card">
            <h3>${docsLink('docs-mcp-others', 'Others')}</h3>
            <p>Setup references for OpenCode, Cline, Copilot agent, and Windsurf, plus a fallback if your client is not listed.</p>
          </article>
        </div>
        <p class="docs-section__copy">If your client is not listed, use the <code>command</code> and <code>args</code> from the Free setup section and adapt them to whatever format your client expects.</p>
      </section>
    `,
  },
  'docs-claude-code': {
    navLabel: 'Claude Code',
    kicker: 'MCP Setup',
    pageTitle: 'Claude Code',
    summary: 'Two ways to add Supericons: a one-line CLI command, or a JSON config entry. Both support free and premium setup.',
    verifiedNote: 'Verified against official documentation as of 10 April 2026.',
    bodyHtml: `
      <section class="docs-section" id="claude-free">
        <h2 class="docs-section__title">Free setup</h2>
        <h3>Option 1: CLI command</h3>
        <p class="docs-section__copy">The fastest way to add Supericons. Run this command once:</p>
        <div class="docs-code docs-code--with-copy">
          <button class="docs-copy docs-copy--overlay" type="button" data-copy-target="docs-claude-cli">Copy</button>
          <pre><code id="docs-claude-cli"># macOS / Linux
claude mcp add supericons -- npx -y supericons-mcp

# Windows
claude mcp add supericons -- cmd /c npx -y supericons-mcp</code></pre>
        </div>
        <h3>Option 2: Config file</h3>
        <p class="docs-section__copy">Claude Code stores MCP servers in a JSON config file. Choose the scope that fits your workflow:</p>
        <ul>
          <li><strong>User scope</strong> (available in all your projects): <code>~/.claude.json</code></li>
          <li><strong>Project scope</strong> (checked into this project only): <code>.mcp.json</code> in your project root</li>
        </ul>
        <p class="docs-section__copy">Add this block to the <code>mcpServers</code> object in your chosen file:</p>
        <div class="docs-code docs-code--with-copy">
          <button class="docs-copy docs-copy--overlay" type="button" data-copy-target="docs-claude-config">Copy</button>
          <pre><code id="docs-claude-config">{
  "mcpServers": {
    "supericons": {
      "command": "npx",
      "args": ["-y", "supericons-mcp"]
    }
  }
}</code></pre>
        </div>
        <h3>Verify it is working</h3>
        <p class="docs-section__copy">After adding the server, type this command inside an active Claude Code session:</p>
        <div class="docs-code">
          <pre><code>/mcp</code></pre>
        </div>
        <p class="docs-section__copy">Supericons should appear in the list of active servers. If it does not, restart your Claude Code session.</p>
      </section>
      <section class="docs-section" id="claude-premium">
        <h2 class="docs-section__title">Premium setup</h2>
        <p class="docs-section__copy">To unlock premium collections, Motion Lab tools, and Converter tools, add your API key to the server config. Use the config file method with the <code>env</code> field:</p>
        <div class="docs-code docs-code--with-copy">
          <button class="docs-copy docs-copy--overlay" type="button" data-copy-target="docs-claude-premium">Copy</button>
          <pre><code id="docs-claude-premium">{
  "mcpServers": {
    "supericons": {
      "command": "npx",
      "args": ["-y", "supericons-mcp"],
      "env": {
        "SUPERICONS_API_KEY": "your-key-here"
      }
    }
  }
}</code></pre>
        </div>
        <div class="docs-callout">
          <h3>Where to get your key</h3>
          <p>Generate your API key at supericons.dev under ${appLink('api-keys', 'API Keys')}. Your key must be linked to an account with a Pro account or a premium collection purchase. Access is determined by your account, not the key itself.</p>
        </div>
      </section>
      <section class="docs-section" id="claude-troubleshooting">
        <h2 class="docs-section__title">Troubleshooting</h2>
        <div class="docs-grid docs-grid--cards">
          <article class="docs-card">
            <h3>Server does not appear after adding</h3>
            <p>Run <code>/mcp</code> to check. If Supericons is not listed, restart your Claude Code session. Confirm your config file is in the correct location for the scope you chose.</p>
          </article>
          <article class="docs-card">
            <h3>Premium tools are not available</h3>
            <p>Confirm three things. (1) Your account has a Pro account or a premium collection purchase. (2) You have generated an API key from the dashboard. (3) <code>SUPERICONS_API_KEY</code> is present in the config Claude Code reads at startup.</p>
          </article>
          <article class="docs-card">
            <h3>Which config file should I edit?</h3>
            <p>User scope: <code>~/.claude.json</code>. Project scope: <code>.mcp.json</code> in your project root. The user scope file applies to all your Claude Code sessions. The project scope file applies only when you open that project.</p>
          </article>
        </div>
      </section>
    `,
  },
  'docs-codex': {
    navLabel: 'Codex',
    kicker: 'MCP Setup',
    pageTitle: 'Codex',
    summary: 'Add Supericons via CLI command or TOML config. Works in Codex CLI and the IDE extension.',
    verifiedNote: 'Verified against official OpenAI Codex documentation as of 10 April 2026.',
    bodyHtml: `
      <section class="docs-callout" id="codex-scope">
        <h3>Scope</h3>
        <p>Codex MCP support is available in the Codex CLI and IDE extension. The CLI and IDE extension share the same configuration file. The Codex web app and cloud task runner do not support local MCP server configuration.</p>
      </section>
      <section class="docs-section" id="codex-free">
        <h2 class="docs-section__title">Free setup</h2>
        <h3>Option 1: CLI command</h3>
        <p class="docs-section__copy">The quickest way to add Supericons. Run this once:</p>
        <div class="docs-code docs-code--with-copy">
          <button class="docs-copy docs-copy--overlay" type="button" data-copy-target="docs-codex-cli">Copy</button>
          <pre><code id="docs-codex-cli">codex mcp add supericons -- npx -y supericons-mcp</code></pre>
        </div>
        <h3>Option 2: Config file</h3>
        <p class="docs-section__copy">Codex reads MCP server config from a TOML file. Choose the scope that fits your workflow:</p>
        <ul>
          <li><strong>User scope</strong> (available in all your projects): <code>~/.codex/config.toml</code></li>
          <li><strong>Project scope</strong> (trusted projects only): <code>.codex/config.toml</code> in your project root</li>
        </ul>
        <p class="docs-section__copy">Add this block to your chosen config file:</p>
        <div class="docs-code docs-code--with-copy">
          <button class="docs-copy docs-copy--overlay" type="button" data-copy-target="docs-codex-config">Copy</button>
          <pre><code id="docs-codex-config">[mcp_servers.supericons]
command = "npx"
args = ["-y", "supericons-mcp"]</code></pre>
        </div>
        <h3>Verify it is working</h3>
        <p class="docs-section__copy">In the Codex TUI, type:</p>
        <div class="docs-code">
          <pre><code>/mcp</code></pre>
        </div>
        <p class="docs-section__copy">Supericons should appear in the list of active MCP servers.</p>
      </section>
      <section class="docs-section" id="codex-premium">
        <h2 class="docs-section__title">Premium setup</h2>
        <p class="docs-section__copy">To use premium collections, Motion Lab, and Converter tools, add your API key to the server config:</p>
        <div class="docs-code docs-code--with-copy">
          <button class="docs-copy docs-copy--overlay" type="button" data-copy-target="docs-codex-premium">Copy</button>
          <pre><code id="docs-codex-premium">[mcp_servers.supericons]
command = "npx"
args = ["-y", "supericons-mcp"]
env = { SUPERICONS_API_KEY = "your-key-here" }</code></pre>
        </div>
        <div class="docs-callout">
          <h3>Where to get your key</h3>
          <p>Generate your API key at supericons.dev under ${appLink('api-keys', 'API Keys')}. Your key must be linked to an account with a Pro account or a premium collection purchase.</p>
        </div>
      </section>
      <section class="docs-section" id="codex-troubleshooting">
        <h2 class="docs-section__title">Troubleshooting</h2>
        <div class="docs-grid docs-grid--cards">
          <article class="docs-card">
            <h3>Server does not appear after adding</h3>
            <p>Type <code>/mcp</code> in the Codex TUI. The Codex CLI and IDE extension share the same config, so a change in one applies to both. Restart the session after editing the config file.</p>
          </article>
          <article class="docs-card">
            <h3>Premium tools are not available</h3>
            <p>Confirm <code>SUPERICONS_API_KEY</code> is in the <code>env</code> block of <code>[mcp_servers.supericons]</code>. Check that your account has a Pro account or a premium collection purchase. Restart after updating the config.</p>
          </article>
          <article class="docs-card">
            <h3>Project scope not working</h3>
            <p>Codex only reads project-scoped config from trusted projects. Run <code>codex trust</code> in the project directory to trust it, then restart Codex.</p>
          </article>
        </div>
      </section>
    `,
  },
  'docs-cursor': {
    navLabel: 'Cursor',
    kicker: 'MCP Setup',
    pageTitle: 'Cursor',
    summary: 'Add Supericons to Cursor via JSON config. Set it globally for all projects, or scoped to one project root.',
    verifiedNote: 'Verified against official Cursor documentation as of 10 April 2026.',
    bodyHtml: `
      <section class="docs-section" id="cursor-free">
        <h2 class="docs-section__title">Free setup</h2>
        <p class="docs-section__copy">Cursor uses a JSON config file. There is no CLI add command.</p>
        <p class="docs-section__copy">Add Supericons to <code>~/.cursor/mcp.json</code> for use across all your projects:</p>
        <div class="docs-code docs-code--with-copy">
          <button class="docs-copy docs-copy--overlay" type="button" data-copy-target="docs-cursor-config">Copy</button>
          <pre><code id="docs-cursor-config">{
  "mcpServers": {
    "supericons": {
      "command": "npx",
      "args": ["-y", "supericons-mcp"]
    }
  }
}</code></pre>
        </div>
        <p class="docs-section__copy">For project-only access, add the same block to <code>.cursor/mcp.json</code> in your project root instead.</p>
        <h3>Verify it is working</h3>
        <p class="docs-section__copy">Save the config and restart Cursor. Open Settings, navigate to MCP, and confirm the <code>supericons</code> server appears in the list.</p>
      </section>
      <section class="docs-section" id="cursor-premium">
        <h2 class="docs-section__title">Premium setup</h2>
        <p class="docs-section__copy">Add your API key to the server config using the <code>env</code> field:</p>
        <div class="docs-code docs-code--with-copy">
          <button class="docs-copy docs-copy--overlay" type="button" data-copy-target="docs-cursor-premium">Copy</button>
          <pre><code id="docs-cursor-premium">{
  "mcpServers": {
    "supericons": {
      "command": "npx",
      "args": ["-y", "supericons-mcp"],
      "env": {
        "SUPERICONS_API_KEY": "your-key-here"
      }
    }
  }
}</code></pre>
        </div>
        <div class="docs-callout">
          <h3>Where to get your key</h3>
          <p>Generate your API key at supericons.dev under ${appLink('api-keys', 'API Keys')}. Your key must be linked to an account with a Pro account or a premium collection purchase.</p>
        </div>
      </section>
      <section class="docs-section" id="cursor-troubleshooting">
        <h2 class="docs-section__title">Troubleshooting</h2>
        <div class="docs-grid docs-grid--cards">
          <article class="docs-card">
            <h3>Server does not appear after adding</h3>
            <p>Cursor requires a valid JSON config file. Check for syntax errors in the JSON. Save the file and restart Cursor.</p>
          </article>
          <article class="docs-card">
            <h3>Premium tools are not available</h3>
            <p>Confirm <code>SUPERICONS_API_KEY</code> is present in the <code>env</code> block. Confirm your account has a Pro account or a premium collection purchase.</p>
          </article>
          <article class="docs-card">
            <h3><code>npx</code> takes a long time on first run</h3>
            <p>The first run of <code>npx -y supericons-mcp</code> downloads the package from npm. This is a one-time delay. Subsequent starts are faster.</p>
          </article>
        </div>
      </section>
    `,
  },
  'docs-mcp-others': {
    navLabel: 'Others',
    kicker: 'MCP Setup',
    pageTitle: 'Other MCP Clients',
    summary: 'Setup references and links for OpenCode, Cline, Copilot agent, Windsurf, and any other MCP-capable client.',
    bodyHtml: `
      <section class="docs-section" id="others-start">
        <h2 class="docs-section__title">Start with the universal setup</h2>
        <p class="docs-section__copy">Supericons runs as a local stdio MCP server. Start with the ${docsLink('docs-mcp-universal', 'Universal setup')} guide for the base server config and premium API key pattern, then adapt the same values to your client&apos;s settings surface.</p>
        <p class="docs-section__copy">The server values stay the same. What changes by client is where the MCP settings live, how the client stores environment values, and whether setup happens in a config file or a settings UI.</p>
      </section>
      <section class="docs-section" id="others-clients">
        <h2 class="docs-section__title">Known clients</h2>
        <div class="docs-grid docs-grid--cards">
          <article class="docs-card">
            <div class="docs-card__head">
              <h3><a href="https://opencode.ai/docs/mcp-servers" target="_blank" rel="noopener noreferrer">OpenCode</a></h3>
              <a class="docs-btn docs-btn--ghost" href="https://opencode.ai/docs/mcp-servers" target="_blank" rel="noopener noreferrer">Open official guide</a>
            </div>
            <p>Official OpenCode MCP docs for server config and CLI flow.</p>
          </article>
          <article class="docs-card">
            <div class="docs-card__head">
              <h3><a href="https://docs.cline.bot/mcp/adding-and-configuring-servers" target="_blank" rel="noopener noreferrer">Cline</a></h3>
              <a class="docs-btn docs-btn--ghost" href="https://docs.cline.bot/mcp/adding-and-configuring-servers" target="_blank" rel="noopener noreferrer">Open official guide</a>
            </div>
            <p>Official Cline docs for the Servers UI and <code>cline_mcp_settings.json</code> config.</p>
          </article>
          <article class="docs-card">
            <div class="docs-card__head">
              <h3><a href="https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/extend-coding-agent-with-mcp" target="_blank" rel="noopener noreferrer">Copilot agent</a></h3>
              <a class="docs-btn docs-btn--ghost" href="https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/extend-coding-agent-with-mcp" target="_blank" rel="noopener noreferrer">Open official guide</a>
            </div>
            <p>Official GitHub docs for repository MCP config and Copilot environment secrets.</p>
          </article>
          <article class="docs-card">
            <div class="docs-card__head">
              <h3><a href="https://docs.windsurf.com/windsurf/cascade/mcp" target="_blank" rel="noopener noreferrer">Windsurf</a></h3>
              <a class="docs-btn docs-btn--ghost" href="https://docs.windsurf.com/windsurf/cascade/mcp" target="_blank" rel="noopener noreferrer">Open official guide</a>
            </div>
            <p>Official Windsurf docs for settings UI and <code>mcp_config.json</code> setup.</p>
          </article>
        </div>
      </section>
      <section class="docs-callout" id="others-not-listed">
        <h3>If your client is not listed</h3>
        <p>If your client supports local stdio MCP servers, use the server values from the universal setup guide and adapt the config location and syntax to your client&apos;s format.</p>
      </section>
    `,
  },
  'docs-mcp-tools': {
    navLabel: 'Overview',
    kicker: 'MCP Reference',
    pageTitle: 'MCP Tools Overview',
    bodyHtml: `
      <section class="docs-section" id="mcp-overview-intro">
        <p class="docs-section__copy">The Supericons MCP server exposes 11 tools your coding agent can call directly. Three tools are free and work without an account. Eight tools require a Pro account or a premium collection purchase, plus a valid <code>SUPERICONS_API_KEY</code>.</p>
        <p class="docs-section__copy">Your agent can discover what tools are available when it first connects to the server. You can also call tools explicitly by name.</p>
      </section>
      <section class="docs-section" id="mcp-overview-tools">
        <h2 class="docs-section__title">All tools</h2>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead>
              <tr>
                <th>Tool</th>
                <th>What it does</th>
                <th>Access</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><code>search_icons</code></td><td>Search 20,000+ free icons across 10 libraries</td><td>Free</td></tr>
              <tr><td><code>get_icon</code></td><td>Retrieve a specific icon by ID and library</td><td>Free</td></tr>
              <tr><td><code>list_libraries</code></td><td>List all available icon libraries</td><td>Free</td></tr>
              <tr><td><code>list_motion_presets</code></td><td>List all Motion Lab animation presets</td><td>Pro account or premium collection purchase</td></tr>
              <tr><td><code>get_motion_recipe</code></td><td>Get a plain-language description of any preset</td><td>Pro account or premium collection purchase</td></tr>
              <tr><td><code>animate_icon</code></td><td>Get Motion Lab CSS and animated SVG in one call</td><td>Pro account or premium collection purchase</td></tr>
              <tr><td><code>export_motion_css</code></td><td>Get only the Motion Lab CSS for an icon</td><td>Pro account or premium collection purchase</td></tr>
              <tr><td><code>export_animated_svg</code></td><td>Get only the standalone animated SVG</td><td>Pro account or premium collection purchase</td></tr>
              <tr><td><code>inspect_converter_options</code></td><td>List Converter settings and valid values</td><td>Pro account or premium collection purchase</td></tr>
              <tr><td><code>convert_svg_to_png</code></td><td>Render an SVG as a PNG at any resolution</td><td>Pro account or premium collection purchase</td></tr>
              <tr><td><code>convert_png_to_svg</code></td><td>Trace a PNG image into an SVG</td><td>Pro account or premium collection purchase</td></tr>
            </tbody>
          </table>
        </div>
      </section>
      <section class="docs-callout" id="mcp-overview-note">
        <h3>Premium collections also require access</h3>
        <p>Premium animated icon collections from <code>get_icon</code> and <code>search_icons</code> also require a Pro account or a premium collection purchase, plus a valid API key.</p>
      </section>
      <section class="docs-section" id="mcp-overview-links">
        <h2 class="docs-section__title">Detailed references</h2>
        <div class="docs-link-list docs-link-list--inline">
          ${docsLink('docs-mcp-icons', 'Icon tools')}
          ${docsLink('docs-mcp-motion', 'Motion Lab tools')}
          ${docsLink('docs-mcp-converter', 'Converter tools')}
        </div>
      </section>
    `,
  },
  'docs-mcp-icons': {
    navLabel: 'Icon Tools',
    kicker: 'MCP Reference',
    pageTitle: 'Icon Tools Reference',
    bodyHtml: `
      <section class="docs-section" id="icon-tools-intro">
        <p class="docs-section__copy">These three tools are free and do not require an API key for the standard 20,000+ icon library. Premium animated icon collections from these tools require a Pro account or a premium collection purchase.</p>
      </section>
      <section class="docs-section" id="icon-tools-search">
        <h2 class="docs-section__title"><code>search_icons</code></h2>
        <p class="docs-section__copy">Search 20,000+ free icons across 10 libraries using AI-powered synonym expansion. Returns matching icons with SVG code. Premium collections are available when your API key is linked to a Pro account or a premium collection purchase.</p>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Type</th>
                <th>Required</th>
                <th>Default</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><code>query</code></td><td>string</td><td>Yes</td><td>-</td><td>Natural language search term. Example: "heart", "login", "download arrow"</td></tr>
              <tr><td><code>library</code></td><td>string</td><td>No</td><td>-</td><td>Filter by library. Valid values: <code>lucide</code>, <code>tabler</code>, <code>phosphor</code>, <code>heroicons</code>, <code>bootstrap</code>, <code>iconoir</code>, <code>ionicons</code>, <code>material</code>, <code>simpleicons</code>, <code>mingcute</code>, or a premium pack name</td></tr>
              <tr><td><code>limit</code></td><td>integer</td><td>No</td><td>10</td><td>Max results returned. Range: 1 to 50</td></tr>
            </tbody>
          </table>
        </div>
        <h3>Returns</h3>
        <p class="docs-section__copy">Matching icons with SVG code, icon ID, library name, and metadata. When no results are found, returns a message indicating no match.</p>
        <p class="docs-section__copy"><strong>Access:</strong> Free.</p>
      </section>
      <section class="docs-section" id="icon-tools-get">
        <h2 class="docs-section__title"><code>get_icon</code></h2>
        <p class="docs-section__copy">Retrieve a specific icon by its ID and library. Returns the full SVG code and metadata. Premium icons require an API key linked to a Pro account or a premium collection purchase.</p>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Type</th>
                <th>Required</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><code>id</code></td><td>string</td><td>Yes</td><td>Icon ID. Example: "heart", "arrow-right", "settings"</td></tr>
              <tr><td><code>library</code></td><td>string</td><td>Yes</td><td>Library name. Example: "lucide", "tabler", "phosphor", or a premium pack name</td></tr>
            </tbody>
          </table>
        </div>
        <h3>Returns</h3>
        <p class="docs-section__copy">Full SVG code plus icon metadata (ID, name, library, premium status). For premium animated icons, also returns the CSS animation block and a usage HTML snippet.</p>
        <p class="docs-section__copy"><strong>Access:</strong> Free for standard icons. A Pro account or a premium collection purchase is required for premium animated icons.</p>
      </section>
      <section class="docs-section" id="icon-tools-libraries">
        <h2 class="docs-section__title"><code>list_libraries</code></h2>
        <p class="docs-section__copy">List all available icon libraries with their names, icon counts, and descriptions. Premium libraries are marked.</p>
        <h3>Parameters</h3>
        <p class="docs-section__copy">None.</p>
        <h3>Returns</h3>
        <p class="docs-section__copy">An array of library objects, each with: <code>id</code>, <code>name</code>, <code>count</code>, <code>description</code>, <code>premium</code> (boolean), and <code>accessible</code> (whether your current API key can access it).</p>
        <p class="docs-section__copy"><strong>Access:</strong> Free.</p>
      </section>
    `,
  },
  'docs-mcp-motion': {
    navLabel: 'Motion Lab',
    kicker: 'MCP Reference',
    pageTitle: 'Motion Lab MCP Tools',
    bodyHtml: `
      <section class="docs-section" id="motion-tools-intro">
        <p class="docs-section__copy">These five tools expose Motion Lab capabilities to your coding agent. All five require a Pro account or a premium collection purchase, plus a valid <code>SUPERICONS_API_KEY</code>.</p>
      </section>
      <section class="docs-callout" id="motion-tools-note">
        <h3>Not sure which preset to use?</h3>
        <p>Call <code>list_motion_presets</code> first to see the Motion Lab preset IDs, labels, groups, short descriptions, and supported triggers, then <code>get_motion_recipe</code> to understand what a specific preset does before committing.</p>
      </section>
      <section class="docs-section" id="motion-tools-list">
        <h2 class="docs-section__title"><code>list_motion_presets</code></h2>
        <p class="docs-section__copy">List the full Motion Lab preset set currently exposed through Supericons MCP. The list mirrors the same preset groups available in the browser Motion Lab experience.</p>
        <h3>Parameters</h3>
        <p class="docs-section__copy">None.</p>
        <h3>Returns</h3>
        <p class="docs-section__copy">An array of ${motionLabPresetCount} preset objects. Each object includes <code>preset</code>, <code>label</code>, <code>group</code>, <code>description</code>, and <code>supported_triggers</code>.</p>
        <p class="docs-section__copy"><strong>Access:</strong> Pro account or premium collection purchase.</p>
      </section>
      <section class="docs-section" id="motion-tools-recipe">
        <h2 class="docs-section__title"><code>get_motion_recipe</code></h2>
        <p class="docs-section__copy">Return a human-readable description of how a preset behaves, including trigger type, timing, easing, and intended use. Use this before calling <code>animate_icon</code> or the export tools to understand what output to expect.</p>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Type</th>
                <th>Required</th>
                <th>Default</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><code>preset</code></td><td>string</td><td>Yes</td><td>-</td><td>Preset ID. Example: "pulse", "bounce", "spin", "trace", "typing"</td></tr>
              <tr><td><code>trigger</code></td><td>string</td><td>No</td><td><code>loop</code></td><td>How the animation starts. Valid values: <code>loop</code>, <code>hover</code>, <code>click</code></td></tr>
              <tr><td><code>duration_ms</code></td><td>integer</td><td>No</td><td>500</td><td>Animation duration in milliseconds. Range: 100 to 4000</td></tr>
              <tr><td><code>intensity_percent</code></td><td>integer</td><td>No</td><td>100</td><td>Scales the intensity of the animation effect. Range: 25 to 200</td></tr>
            </tbody>
          </table>
        </div>
        <h3>Returns</h3>
        <p class="docs-section__copy">A recipe object with <code>preset_id</code>, <code>preset</code>, <code>group</code>, <code>description</code>, <code>trigger</code>, <code>duration_ms</code>, <code>intensity_percent</code>, <code>default_duration_ms</code>, <code>duration_range_ms</code>, <code>default_intensity_percent</code>, <code>intensity_range_percent</code>, <code>export_compatibility</code>, <code>technical_output_notes</code>, <code>visual_character</code>, <code>emotional_tone</code>, <code>recommended_contexts</code>, <code>avoid_for</code>, <code>behavior</code>, and usage <code>notes</code>.</p>
        <p class="docs-section__copy"><strong>Access:</strong> Pro account or premium collection purchase.</p>
      </section>
      <section class="docs-section" id="motion-tools-animate">
        <h2 class="docs-section__title"><code>animate_icon</code></h2>
        <p class="docs-section__copy">Generate both the Motion Lab CSS and a self-contained animated SVG for one icon in a single call. Use this when you want both outputs without making two separate calls.</p>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Type</th>
                <th>Required</th>
                <th>Default</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><code>id</code></td><td>string</td><td>Yes</td><td>-</td><td>Icon ID. Example: "heart", "scan-virus", "fingerprint-scan"</td></tr>
              <tr><td><code>library</code></td><td>string</td><td>Yes</td><td>-</td><td>Library or premium pack name</td></tr>
              <tr><td><code>preset</code></td><td>string</td><td>Yes</td><td>-</td><td>Motion preset ID</td></tr>
              <tr><td><code>trigger</code></td><td>string</td><td>No</td><td><code>loop</code></td><td><code>loop</code>, <code>hover</code>, or <code>click</code></td></tr>
              <tr><td><code>duration_ms</code></td><td>integer</td><td>No</td><td>500</td><td>100 to 4000</td></tr>
              <tr><td><code>intensity_percent</code></td><td>integer</td><td>No</td><td>100</td><td>25 to 200</td></tr>
              <tr><td><code>color</code></td><td>string</td><td>No</td><td>-</td><td>Optional CSS color override for icons that inherit <code>currentColor</code></td></tr>
            </tbody>
          </table>
        </div>
        <h3>Returns</h3>
        <p class="docs-section__copy">An object with: <code>id</code>, <code>library</code>, <code>recipe</code> (the motion recipe object), <code>css</code> (Motion Lab CSS), <code>animated_svg</code> (standalone SVG with embedded animation), and <code>selector_mode</code>. Placeholder CSS responses also include <code>selector_token</code>.</p>
        <p class="docs-section__copy"><strong>Access:</strong> Pro account or premium collection purchase.</p>
      </section>
      <section class="docs-section" id="motion-tools-css">
        <h2 class="docs-section__title"><code>export_motion_css</code></h2>
        <p class="docs-section__copy">Generate only the Motion Lab CSS for an icon. Use this when you have the SVG inline in your markup and want to manage the animation as a separate stylesheet.</p>
        <h3>Parameters</h3>
        <p class="docs-section__copy">Same as <code>animate_icon</code>.</p>
        <h3>Returns</h3>
        <p class="docs-section__copy">An object with: <code>id</code>, <code>library</code>, <code>preset</code> (the motion recipe), <code>css</code> (the Motion Lab CSS with <code>@keyframes</code> and animation rules), and <code>selector_mode</code>. Placeholder responses also include <code>selector_token</code>.</p>
        <h3>The CSS selector targets</h3>
        <p class="docs-section__copy">The hosted Motion Lab CSS path returns portable CSS by default using the token <code>{{ICON_SELECTOR}}</code>. Replace that token with the selector for your inline SVG before applying the stylesheet.</p>
        <p class="docs-section__copy"><strong>Access:</strong> Pro account or premium collection purchase.</p>
      </section>
      <section class="docs-section" id="motion-tools-svg">
        <h2 class="docs-section__title"><code>export_animated_svg</code></h2>
        <p class="docs-section__copy">Generate a self-contained animated SVG with the animation embedded directly in the file. Drop it into any HTML page without external CSS.</p>
        <h3>Parameters</h3>
        <p class="docs-section__copy">Same as <code>animate_icon</code>.</p>
        <h3>Returns</h3>
        <p class="docs-section__copy">An object with: <code>id</code>, <code>library</code>, <code>preset</code> (the motion recipe), and <code>animated_svg</code> (a complete SVG string with a <code>&lt;style&gt;</code> block embedded inside).</p>
        <h3>When to use this vs. <code>export_motion_css</code></h3>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead>
              <tr>
                <th>You want to...</th>
                <th>Use</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Use the SVG inline with your own CSS pipeline</td><td><code>export_motion_css</code></td></tr>
              <tr><td>Drop a portable self-contained animated file anywhere</td><td><code>export_animated_svg</code></td></tr>
              <tr><td>Get both outputs in one call</td><td><code>animate_icon</code></td></tr>
              <tr><td>Understand the preset before using it</td><td><code>get_motion_recipe</code></td></tr>
            </tbody>
          </table>
        </div>
        <p class="docs-section__copy"><strong>Access:</strong> Pro account or premium collection purchase.</p>
      </section>
    `,
  },
  'docs-mcp-converter': {
    navLabel: 'Converter',
    kicker: 'MCP Reference',
    pageTitle: 'Converter MCP Tools',
    bodyHtml: `
      <section class="docs-section" id="converter-tools-intro">
        <p class="docs-section__copy">These three tools expose Converter capabilities to your coding agent. All three require a Pro account or a premium collection purchase. The <code>traceClass</code> parameter in <code>convert_png_to_svg</code> has six values with meaningfully different output results. Read the reference below before choosing.</p>
      </section>
      <section class="docs-section" id="converter-tools-inspect">
        <h2 class="docs-section__title"><code>inspect_converter_options</code></h2>
        <p class="docs-section__copy">List the current Converter MCP options and their valid values. Call this first if you are unsure which settings to use for your source image.</p>
        <h3>Parameters</h3>
        <p class="docs-section__copy">None.</p>
        <h3>Returns</h3>
        <p class="docs-section__copy">An object describing all available converter settings, valid values, default values, and limits.</p>
        <p class="docs-section__copy"><strong>Access:</strong> Pro account or premium collection purchase.</p>
      </section>
      <section class="docs-section" id="converter-tools-svg-png">
        <h2 class="docs-section__title"><code>convert_svg_to_png</code></h2>
        <p class="docs-section__copy">Render an SVG string as a PNG at any output width.</p>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Type</th>
                <th>Required</th>
                <th>Default</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><code>svg</code></td><td>string</td><td>Yes</td><td>-</td><td>Raw SVG string to render</td></tr>
              <tr><td><code>targetWidth</code></td><td>integer</td><td>No</td><td>512</td><td>Output width in pixels. Range: 16 to 2048</td></tr>
              <tr><td><code>background</code></td><td>string</td><td>No</td><td><code>transparent</code></td><td>Background color. Use <code>transparent</code> or a hex value like <code>#ffffff</code></td></tr>
            </tbody>
          </table>
        </div>
        <h3>Returns</h3>
        <p class="docs-section__copy">PNG as a base64 string.</p>
        <p class="docs-section__copy"><strong>Access:</strong> Pro account or premium collection purchase.</p>
      </section>
      <section class="docs-section" id="converter-tools-png-svg">
        <h2 class="docs-section__title"><code>convert_png_to_svg</code></h2>
        <p class="docs-section__copy">Trace a raster PNG image into an SVG. Output quality depends heavily on the source image and the settings you choose. Simple, flat-color images trace well. Complex photographs and gradient-heavy images do not.</p>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Type</th>
                <th>Required</th>
                <th>Default</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><code>imageBase64</code></td><td>string</td><td>Yes</td><td>-</td><td>PNG as base64 text or a data URL</td></tr>
              <tr><td><code>colorMode</code></td><td>string</td><td>No</td><td><code>color</code></td><td><code>color</code> or <code>mono</code></td></tr>
              <tr><td><code>qualityMode</code></td><td>string</td><td>No</td><td><code>exact</code></td><td><code>exact</code> or <code>compact</code></td></tr>
              <tr><td><code>traceClass</code></td><td>string</td><td>No</td><td><code>general-color</code></td><td>See <code>traceClass</code> reference below</td></tr>
              <tr><td><code>uiMode</code></td><td>string</td><td>No</td><td><code>logo</code></td><td><code>logo</code> or <code>icon</code></td></tr>
            </tbody>
          </table>
        </div>
        <h3>Returns</h3>
        <p class="docs-section__copy">SVG string.</p>
        <p class="docs-section__copy"><strong>Access:</strong> Pro account or premium collection purchase.</p>
      </section>
      <section class="docs-section" id="converter-tools-trace-class">
        <h2 class="docs-section__title"><code>traceClass</code> reference</h2>
        <p class="docs-section__copy">The <code>traceClass</code> parameter selects the tracing profile tuned for your source image type. Choosing the wrong class will produce imprecise or overweight output.</p>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead>
              <tr>
                <th><code>traceClass</code> value</th>
                <th>Best for</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><code>general-color</code></td><td>Most full-color images. A safe default when unsure.</td></tr>
              <tr><td><code>flat-logo-color</code></td><td>Logos with solid, flat color fills and no gradients</td></tr>
              <tr><td><code>tile-icon-color</code></td><td>Small repeating tile icons</td></tr>
              <tr><td><code>tiny-line-icon</code></td><td>Very small icons with fine line detail</td></tr>
              <tr><td><code>single-color-mark</code></td><td>Single-color logos, wordmarks, or simple marks</td></tr>
              <tr><td><code>mono-mask</code></td><td>High-contrast black and white images</td></tr>
            </tbody>
          </table>
        </div>
      </section>
      <section class="docs-section" id="converter-tools-quality-mode">
        <h2 class="docs-section__title"><code>qualityMode</code> reference</h2>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead>
              <tr>
                <th><code>qualityMode</code> value</th>
                <th>Behavior</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><code>exact</code></td><td>Preserves maximum path detail. Output file is larger. Recommended for most use cases.</td></tr>
              <tr><td><code>compact</code></td><td>Simplifies paths to reduce file size. Some fine detail will be lost.</td></tr>
            </tbody>
          </table>
        </div>
      </section>
      <section class="docs-section" id="converter-tools-ui-mode">
        <h2 class="docs-section__title"><code>uiMode</code> reference</h2>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead>
              <tr>
                <th><code>uiMode</code> value</th>
                <th>Behavior</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><code>logo</code></td><td>Optimizes output for logo-style artwork with free-form shapes and curves</td></tr>
              <tr><td><code>icon</code></td><td>Optimizes output for icon-style artwork, favoring geometric precision and clean edges</td></tr>
            </tbody>
          </table>
        </div>
      </section>
      <section class="docs-section" id="converter-tools-combos">
        <h2 class="docs-section__title">Recommended combinations</h2>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead>
              <tr>
                <th>Source image</th>
                <th>Recommended settings</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Full-color logo with gradients</td><td><code>general-color</code>, <code>exact</code>, <code>logo</code></td></tr>
              <tr><td>Simple flat logo</td><td><code>flat-logo-color</code>, <code>exact</code>, <code>logo</code></td></tr>
              <tr><td>Single-color wordmark</td><td><code>single-color-mark</code>, <code>compact</code>, <code>logo</code></td></tr>
              <tr><td>Small UI icon</td><td><code>tiny-line-icon</code>, <code>exact</code>, <code>icon</code></td></tr>
              <tr><td>Black and white illustration</td><td><code>mono-mask</code>, <code>exact</code>, <code>logo</code></td></tr>
            </tbody>
          </table>
        </div>
      </section>
    `,
  },
  'docs-motion-lab': {
    navLabel: 'Introduction',
    kicker: 'Motion Lab',
    pageTitle: 'Motion Lab',
    summary: 'Try presets and preview animations without a Pro account. Export as CSS or animated SVG with a Pro account or a premium collection purchase.',
    bodyHtml: `
      <section class="docs-section" id="motion-lab-intro">
        <p class="docs-section__copy">Motion Lab is a preset-driven animation workspace for Supericons icons. Choose a preset, adjust the trigger, timing, and intensity, then export the result as a Motion Lab CSS file or a standalone animated SVG. Both outputs are production-ready and require no JavaScript.</p>
      </section>
      <section class="docs-section" id="motion-lab-access">
        <h2 class="docs-section__title">How to access Motion Lab</h2>
        <p class="docs-section__copy">Motion Lab is available in two ways:</p>
        <ul>
          <li><strong>In the browser</strong>: Open the ${appLink('motion-lab', 'Supericons Motion Lab')} without a Pro account. Select any icon to browse the preset panel and preview animations in real time. Exporting your animation as CSS or SVG requires a Pro account or a premium collection purchase.</li>
          <li><strong>Through MCP</strong>: Your coding agent can call Motion Lab tools directly. See the ${docsLink('docs-mcp-motion', 'Motion Lab MCP tools reference')}.</li>
        </ul>
        <p class="docs-section__copy"><strong>Browser:</strong> Open and preview without a Pro account. Exporting CSS or SVG output requires a Pro account or a premium collection purchase.</p>
        <p class="docs-section__copy"><strong>MCP:</strong> All Motion Lab tools require a Pro account or a premium collection purchase, plus a valid API key.</p>
      </section>
      <section class="docs-section" id="motion-lab-output">
        <h2 class="docs-section__title">What Motion Lab produces</h2>
        <p class="docs-section__copy">Motion Lab generates two types of output from any preset:</p>
        <p class="docs-section__copy"><strong>Motion Lab CSS</strong> - A stylesheet with <code>@keyframes</code> and animation rules. Replace the placeholder token <code>{{ICON_SELECTOR}}</code> with the selector for your inline SVG, then keep the SVG and animation in separate files.</p>
        <p class="docs-section__copy"><strong>Animated SVG</strong> - A self-contained SVG file with the animation embedded in a <code>&lt;style&gt;</code> block inside the SVG. Drop it anywhere without external CSS.</p>
      </section>
      <section class="docs-section" id="motion-lab-next">
        <h2 class="docs-section__title">Where to go next</h2>
        <div class="docs-grid docs-grid--cards">
          <article class="docs-card">
            <div class="docs-card__head">
              <h3>Presets</h3>
              <a class="docs-btn docs-btn--ghost" href="${docsHref('docs-motion-lab-presets')}" data-docs-view="docs-motion-lab-presets">Open the reference</a>
            </div>
            <p>Full list of available presets with descriptions and categories.</p>
          </article>
          <article class="docs-card">
            <div class="docs-card__head">
              <h3>Trigger Types</h3>
              <a class="docs-btn docs-btn--ghost" href="${docsHref('docs-motion-lab-triggers')}" data-docs-view="docs-motion-lab-triggers">Open the guide</a>
            </div>
            <p>Understand loop, hover, and click behavior before exporting.</p>
          </article>
          <article class="docs-card">
            <div class="docs-card__head">
              <h3>Exports</h3>
              <a class="docs-btn docs-btn--ghost" href="${docsHref('docs-motion-lab-exports')}" data-docs-view="docs-motion-lab-exports">Open the guide</a>
            </div>
            <p>How to use CSS and animated SVG output in your project.</p>
          </article>
        </div>
      </section>
    `,
  },
  'docs-motion-lab-presets': {
    navLabel: 'Presets',
    kicker: 'Motion Lab',
    pageTitle: 'Motion Lab Presets',
    summary: `Supericons Motion Lab includes ${motionLabPresetCount} presets across ${motionLabGroupCount} live groups: Motion, Entrances, Exits, and Special. Every preset supports loop, hover, and click triggers, with duration from 100ms to 4000ms and intensity from 25% to 200%.`,
    bodyHtml: `
      <section class="docs-section" id="motion-presets-intro">
        <p class="docs-section__copy">This reference reflects the same Motion Lab preset set used in the browser and exposed through MCP. Use it when you want a complete view of the preset names, groups, and baseline descriptions in one place.</p>
      </section>
      <section class="docs-section" id="motion-presets-table">
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Label</th>
                <th>Category</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              ${motionLabPresetTableRows}
            </tbody>
          </table>
        </div>
      </section>
      <section class="docs-section" id="motion-presets-ranges">
        <h2 class="docs-section__title">Parameter ranges</h2>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Minimum</th>
                <th>Default</th>
                <th>Maximum</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Duration</td><td>100ms</td><td>500ms</td><td>4000ms</td></tr>
              <tr><td>Intensity</td><td>25%</td><td>100%</td><td>200%</td></tr>
            </tbody>
          </table>
        </div>
      </section>
      <section class="docs-section" id="motion-presets-groups">
        <h2 class="docs-section__title">Preset groups explained</h2>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead>
              <tr>
                <th>Group</th>
                <th>Preset count</th>
                <th>How to use it</th>
              </tr>
            </thead>
            <tbody>
              ${motionLabGroupRows}
            </tbody>
          </table>
        </div>
      </section>
    `,
  },
  'docs-motion-lab-triggers': {
    navLabel: 'Trigger Types',
    kicker: 'Motion Lab',
    pageTitle: 'Trigger Types',
    summary: 'Every Motion Lab preset supports three trigger types. The trigger controls when the animation starts and how many times it plays. Choose based on the context where the icon appears.',
    bodyHtml: `
      <section class="docs-section" id="motion-trigger-loop">
        <h2 class="docs-section__title"><code>loop</code></h2>
        <p class="docs-section__copy">The animation plays continuously as soon as the icon is rendered. It repeats indefinitely with no user interaction required.</p>
        <p class="docs-section__copy"><strong>When to use:</strong> Loading states, ambient decorations, hero section branding icons, always-on visual interest.</p>
        <p class="docs-section__copy"><strong>When not to use:</strong> Interactive elements where continuous motion would compete with user focus.</p>
      </section>
      <section class="docs-section" id="motion-trigger-hover">
        <h2 class="docs-section__title"><code>hover</code></h2>
        <p class="docs-section__copy">The animation plays while the user hovers the icon element. It starts on <code>mouseenter</code> and stops naturally when the animation completes after <code>mouseleave</code>.</p>
        <p class="docs-section__copy"><strong>When to use:</strong> Interactive buttons, links, menu items, and call-to-action icons that reward pointer interaction.</p>
        <p class="docs-section__copy"><strong>When not to use:</strong> Touch-only interfaces where hover has no reliable equivalent.</p>
      </section>
      <section class="docs-section" id="motion-trigger-click">
        <h2 class="docs-section__title"><code>click</code></h2>
        <p class="docs-section__copy">The animation plays when the icon is pressed (<code>:active</code>) or when an <code>.active</code> class is applied. It plays 3 times on activation, then stops.</p>
        <p class="docs-section__copy"><strong>When to use:</strong> Toggle states, like/unlike actions, confirmation icons, submit button feedback, and state changes the user triggers explicitly.</p>
        <p class="docs-section__copy"><strong>When not to use:</strong> Icons that have a persistent hover state (use <code>hover</code> trigger instead).</p>
      </section>
      <section class="docs-section" id="motion-trigger-summary">
        <h2 class="docs-section__title">Trigger behavior summary</h2>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead>
              <tr>
                <th>Trigger</th>
                <th>Starts when</th>
                <th>Repeats</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><code>loop</code></td><td>Icon renders</td><td>Continuously</td><td>Infinite</td></tr>
              <tr><td><code>hover</code></td><td>User hovers</td><td>Until unhovered</td><td>Infinite while hovered</td></tr>
              <tr><td><code>click</code></td><td>User presses (<code>:active</code> or <code>.active</code> class)</td><td>On click</td><td>3 times per click</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    `,
  },
  'docs-motion-lab-exports': {
    navLabel: 'Exports',
    kicker: 'Motion Lab',
    pageTitle: 'Motion Lab Exports',
    summary: 'Motion Lab produces two export formats: Motion Lab CSS and animated SVG. Both are production-ready. Exporting requires a Pro account or a premium collection purchase. Choose the format based on how you manage your SVG and animation files.',
    bodyHtml: `
      <section class="docs-section" id="motion-exports-css">
        <h2 class="docs-section__title">Motion Lab CSS</h2>
        <h3>What it is</h3>
        <p class="docs-section__copy">A stylesheet with <code>@keyframes</code> definitions and animation rules. Apply it alongside an SVG element in your HTML or JSX. The SVG and the animation are separate files.</p>
        <h3>How to use it</h3>
        <ol class="docs-list docs-list--numbered">
          <li>Get the SVG from Supericons using <code>search_icons</code> or <code>get_icon</code>. (Free)</li>
          <li>Call <code>export_motion_css</code> with your chosen preset and trigger to get the CSS. (Requires a Pro account or a premium collection purchase)</li>
          <li>Keep the SVG inline in your markup.</li>
          <li>Replace <code>{{ICON_SELECTOR}}</code> in the returned CSS with the selector for your inline SVG.</li>
          <li>Link the updated CSS file, or paste the rules into your existing stylesheet.</li>
        </ol>
        <h3>What the CSS contains</h3>
        <p class="docs-section__copy">The CSS export includes:</p>
        <ul>
          <li>A brand comment: <code>/* Supericons Motion Lab */</code></li>
          <li>A preset label comment with your chosen preset, trigger, duration, and intensity</li>
          <li>A <code>@keyframes</code> block for the animation</li>
          <li>An animation rule using the placeholder selector token <code>{{ICON_SELECTOR}}</code></li>
          <li><code>overflow: visible</code>, <code>transform-box: fill-box</code>, and <code>transform-origin: center</code> on the SVG and its children to ensure transforms behave correctly</li>
        </ul>
      </section>
      <section class="docs-section" id="motion-exports-svg">
        <h2 class="docs-section__title">Animated SVG</h2>
        <h3>What it is</h3>
        <p class="docs-section__copy">A self-contained SVG file with the animation embedded inside a <code>&lt;style&gt;</code> block within the SVG itself. No external CSS needed.</p>
        <h3>How to use it</h3>
        <p class="docs-section__copy">Drop the animated SVG file directly into any HTML page:</p>
        <div class="docs-code">
          <pre><code>&lt;img src="icon-animated.svg" alt="animated icon" width="24" height="24"&gt;</code></pre>
        </div>
        <p class="docs-section__copy">Or paste the SVG inline:</p>
        <div class="docs-code">
          <pre><code>&lt;!-- paste the entire animated SVG string here --&gt;</code></pre>
        </div>
        <h3>Compatibility note</h3>
        <p class="docs-section__copy">Self-contained animated SVGs work in most modern browsers. When used as an <code>&lt;img&gt;</code> source, CSS animations play automatically. When pasted inline, hover and click triggers respond to pointer events as normal.</p>
      </section>
      <section class="docs-section" id="motion-exports-decision">
        <h2 class="docs-section__title">Which format should I use?</h2>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead>
              <tr>
                <th>Situation</th>
                <th>Recommended format</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>SVG is in your HTML or JSX, styled through your CSS pipeline</td><td>Motion Lab CSS</td></tr>
              <tr><td>You want one portable file with no dependencies</td><td>Animated SVG</td></tr>
              <tr><td>You are embedding in email or a documentation site</td><td>Animated SVG</td></tr>
              <tr><td>You need to update the animation without changing the SVG</td><td>Motion Lab CSS</td></tr>
              <tr><td>You want both formats at once</td><td>Call <code>animate_icon</code></td></tr>
            </tbody>
          </table>
        </div>
      </section>
    `,
  },
  'docs-converter-guide': {
    navLabel: 'Introduction',
    kicker: 'Converter',
    pageTitle: 'Converter Guide',
    summary: 'Convert PNG to SVG and SVG to PNG. Preview your result in the browser without a Pro account. Downloading the output requires a Pro account or a premium collection purchase.',
    bodyHtml: renderPlaceholderBody({
      title: 'Converter: what you can do',
      summary: 'Upload a PNG or SVG to see your result in real time. Downloading the converted file requires a Pro account or a premium collection purchase. Choose your conversion path below.',
      todayLinks: [
        { view: 'docs', label: 'Introduction' },
        { view: 'pricing', label: 'Pricing' },
      ],
    }),
  },
  'docs-converter-png-to-svg': {
    navLabel: 'PNG to SVG',
    kicker: 'Converter',
    pageTitle: 'PNG to SVG',
    summary: 'Trace a PNG into an SVG. Preview the result in the browser. Download the SVG file with a Pro account or a premium collection purchase.',
    bodyHtml: renderPlaceholderBody({
      title: 'PNG to SVG: how it works',
      summary: 'Upload your PNG to preview the traced SVG result. Simple, flat-color images trace best. Complex photos and gradients do not trace cleanly. Downloading your SVG requires a Pro account or a premium collection purchase.',
      todayLinks: [
        { view: 'docs-converter-guide', label: 'Converter introduction' },
      ],
    }),
  },
  'docs-converter-svg-to-png': {
    navLabel: 'SVG to PNG',
    kicker: 'Converter',
    pageTitle: 'SVG to PNG',
    summary: 'Render an SVG as a PNG at any size. Preview in the browser. Download the PNG with a Pro account or a premium collection purchase.',
    bodyHtml: renderPlaceholderBody({
      title: 'SVG to PNG: how it works',
      summary: 'Paste or upload your SVG and choose an output width and background color to preview the PNG. Output sizes range from 16 to 2048 pixels wide. Downloading the PNG requires a Pro account or a premium collection purchase.',
      todayLinks: [
        { view: 'docs-converter-guide', label: 'Converter introduction' },
      ],
    }),
  },
  'docs-converter-settings': {
    navLabel: 'Settings',
    kicker: 'Converter',
    pageTitle: 'Converter Settings Reference',
    summary: 'Reference for traceClass, qualityMode, and uiMode settings in the PNG to SVG converter.',
    bodyHtml: renderPlaceholderBody({
      title: 'This page will explain the Converter settings',
      summary: 'It will define each trace class clearly and show how quality and UI modes change the output.',
      todayLinks: [
        { view: 'docs-converter-guide', label: 'Converter introduction' },
      ],
    }),
  },
  'docs-access-api-keys': {
    navLabel: 'API Keys',
    kicker: 'Access and API Keys',
    pageTitle: 'API Keys',
    summary: 'This page will explain what API keys unlock and how access is tied to your account.',
    bodyHtml: renderPlaceholderBody({
      title: 'This page will explain API keys and entitlement',
      summary: 'It will clarify what the key does, what it does not do by itself, and how it carries the access already present on your account.',
      todayLinks: [
        { view: 'api-keys', label: 'API Keys page' },
        { view: 'docs-quickstart', label: 'Quickstart' },
      ],
    }),
  },
  'docs-access-premium': {
    navLabel: 'Pro and Collections',
    kicker: 'Access and API Keys',
    pageTitle: 'Pro and Collections',
    summary: 'This page will explain the difference between a Pro account and a premium collection purchase.',
    bodyHtml: renderPlaceholderBody({
      title: 'This page will explain premium access paths',
      summary: 'It will show what a Pro account unlocks, what a premium collection purchase unlocks, and how those two paths affect docs, tools, and product access.',
      todayLinks: [
        { view: 'pricing', label: 'Pricing' },
        { view: 'docs-access-api-keys', label: 'API Keys' },
      ],
    }),
  },
  'docs-troubleshooting': {
    navLabel: 'Troubleshooting',
    kicker: 'Support',
    pageTitle: 'Troubleshooting',
    summary: 'This page will gather the recurring setup, access, and export failures in one place.',
    bodyHtml: renderPlaceholderBody({
      title: 'This page will become the main troubleshooting guide',
      summary: 'It will collect the most common MCP setup issues, Pro account and premium collection purchase issues, Motion Lab output questions, and Converter quality problems.',
      todayLinks: [
        { view: 'docs-claude-code', label: 'Claude Code' },
        { view: 'docs-codex', label: 'Codex' },
        { view: 'docs-cursor', label: 'Cursor' },
      ],
    }),
  },
};

export const DOCS_PAGE_GROUPS = docsPageGroups;
export const DOCS_PAGES = docsPages;
export const DOCS_PAGE_ORDER = Object.keys(docsPages);
export const DOCS_PAGE_VIEWS = new Set(DOCS_PAGE_ORDER);

export function getDocsPageConfig(view) {
  return docsPages[view] || docsPages.docs;
}
