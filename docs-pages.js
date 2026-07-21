import {
  MOTION_LAB_PRESET_GROUPS,
  listMotionLabPresetMeta,
} from './lib/motion-lab-presets.js';
import { PRODUCT_FACTS, PRODUCT_FACT_LABELS } from './lib/product-facts.js';

const docsHref = (view) => `/?view=${view}`;
const docsLink = (view, label) => `<a href="${docsHref(view)}" data-docs-view="${view}">${label}</a>`;
const appLink = (view, label) => `<a href="/?view=${view}" data-docs-view="${view}">${label}</a>`;
const hostedMcpUrl = 'https://mcp.supericons.dev/mcp';

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
const freeIconsAcrossLibrariesFreeLabel = PRODUCT_FACT_LABELS.freeIconsAcrossLibrariesFreeLabel;
const openSourceSvgIconsAcrossLibrariesLabel = PRODUCT_FACT_LABELS.openSourceSvgIconsAcrossLibrariesLabel;
const mcpToolCount = PRODUCT_FACTS.mcpToolCount;
const mcpFreeToolCount = PRODUCT_FACTS.mcpFreeToolCount;

const MCP_SETUP_VIDEOS = Object.freeze([
  {
    badge: 'Hosted',
    title: 'Claude Desktop',
    description: 'Connect Claude Desktop to the keyless hosted MCP server.',
    src: '/videos/mcp-setup/hosted-claude-desktop.mp4',
    icon: 'cloud_done',
  },
  {
    badge: 'Local',
    title: 'Cursor IDE',
    description: 'Run the latest local MCP package with npx in Cursor.',
    src: '/videos/mcp-setup/local-cursor-ide.mp4',
    icon: 'terminal',
  },
  {
    badge: 'Local',
    title: 'Codex Desktop',
    description: 'Connect the latest local MCP package in Codex Desktop.',
    src: '/videos/mcp-setup/local-codex-desktop.mp4',
    icon: 'data_object',
  },
]);

function renderMcpSetupVideoGuide() {
  const cards = MCP_SETUP_VIDEOS.map((video) => `
          <button
            class="docs-video-thumb"
            type="button"
            data-setup-video
            data-video-src="${video.src}"
            data-video-title="${video.title}"
            data-video-eyebrow="${video.badge} setup"
            data-video-description="${video.description}"
            aria-label="Watch ${video.badge.toLowerCase()} setup guide for ${video.title}"
          >
            <span class="docs-video-thumb__art" aria-hidden="true">
              <span class="docs-video-thumb__icon material-symbols-outlined">${video.icon}</span>
              <span class="docs-video-thumb__play">
                <span class="material-symbols-outlined">play_arrow</span>
              </span>
              <span class="docs-video-thumb__line docs-video-thumb__line--one"></span>
              <span class="docs-video-thumb__line docs-video-thumb__line--two"></span>
            </span>
            <span class="docs-video-thumb__body">
              <span class="docs-video-thumb__badge">${video.badge}</span>
              <strong>${video.title}</strong>
              <span>${video.description}</span>
            </span>
          </button>`)
    .join('');

  return `
      <section class="docs-section docs-video-guide" id="universal-setup-videos" aria-labelledby="universal-setup-videos-title">
        <div class="docs-video-guide__head">
          <div>
            <h2 class="docs-section__title" id="universal-setup-videos-title">Quick setup videos</h2>
            <p class="docs-section__copy">Watch the setup flow, then use the current values below. These videos were recorded in May 2026, so client screens may move while the connection details stay the same.</p>
          </div>
          <a class="docs-btn docs-btn--secondary" href="#universal-ide-form">Use setup fields</a>
        </div>
        <div class="docs-video-grid" aria-label="Supericons MCP setup videos">
${cards}
        </div>
      </section>
    `;
}

function renderMcpCliSetupGuide() {
  return `
      <section class="docs-section" id="universal-cli-setup">
        <h2 class="docs-section__title">Quick local setup</h2>
        <p class="docs-section__copy">If your client asks for a local command, use this one-line setup. If it asks for separate fields, put <code>npx</code> in the command field and add <code>-y</code> and <code>@supericons/mcp@latest</code> as arguments. The package name follows the npm latest tag.</p>
        <div class="docs-code docs-code--with-copy docs-code--compact">
          <button class="docs-copy docs-copy--overlay" type="button" data-copy-target="docs-universal-cli-command">Copy</button>
          <pre><code id="docs-universal-cli-command">npx -y @supericons/mcp@latest</code></pre>
        </div>
        <p class="docs-section__copy">If your client asks for a remote server URL instead, use <code>${hostedMcpUrl}</code>.</p>
      </section>
    `;
}

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
    pages: ['docs-mcp-search-guide', 'docs-mcp-tools', 'docs-mcp-icons', 'docs-mcp-motion', 'docs-mcp-converter'],
  },
  {
    label: 'Motion Lab',
    pages: [
      'docs-motion-lab',
      'docs-motion-lab-presets',
      'docs-motion-lab-triggers',
      'docs-motion-lab-exports',
      'docs-motion-lab-mcp-workflow',
      'docs-motion-lab-client-setup',
      'docs-motion-lab-use-cases',
    ],
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
              <h3>Search with MCP</h3>
              <a class="docs-btn docs-btn--ghost" href="${docsHref('docs-mcp-search-guide')}" data-docs-view="docs-mcp-search-guide">See prompts</a>
            </div>
            <p>Prompt examples for finding icons by name, library, use case, or meaning.</p>
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
        <p class="docs-section__copy">Supericons is also listed on <a href="https://smithery.ai/servers/curly-mole-labs/supericons" target="_blank" rel="noopener noreferrer">Smithery</a>. If your client connects through Smithery, it may ask you to sign in to Smithery first.</p>
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
        <p class="docs-section__copy">To use paid Supericons access through MCP, set up your account access first. Premium packs use the access already on your account. Motion Lab and Converter are Pro features.</p>
        <ol class="docs-list docs-list--numbered">
          <li>A Supericons account. Buy the packs you need, or get Pro if you want Motion Lab and Converter.</li>
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
        <h3>Your key uses the access your account already has</h3>
        <p>Your API key does not create new access by itself. Buying packs gives you the premium icons in those packs. Motion Lab and Converter require the ${appLink('pricing', 'Supericons Pro plan')}.</p>
      </section>
    `,
  },
  'docs-what-is-supericons': {
    navLabel: 'What Is Supericons',
    kicker: 'Overview',
    pageTitle: 'What Is Supericons',
    bodyHtml: `
      <section class="docs-section" id="what-is-intro">
        <p class="docs-section__copy">Supericons gives you ${openSourceSvgIconsAcrossLibrariesLabel} in one searchable interface. Search by name, concept, or style. Customize color, size, stroke, and fill in real time. Export as SVG, PNG, or React, Vue, or Svelte components with one click.</p>
        <p class="docs-section__copy">For AI-assisted development, Supericons ships a dedicated MCP server. Your coding agent can search and retrieve icons without switching to a browser. In the browser, you can open Motion Lab and Converter, use the controls, and preview the result without a paid plan. Exporting, downloading, or copying the final output requires the ${appLink('pricing', 'Supericons Pro plan')}. Through MCP, Motion Lab and Converter tools are also part of the ${appLink('pricing', 'Supericons Pro plan')}. Buying packs gives you the premium icons you bought, but it does not unlock Motion Lab or Converter.</p>
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
              <tr><td>${PRODUCT_FACT_LABELS.freeSvgIconsAcrossLibrariesLabel}</td><td>Yes</td><td>Yes</td></tr>
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
          ${docsLink('docs-mcp-search-guide', 'Search with MCP')}
          ${appLink('pricing', 'Get Pro')}
          ${appLink('api-keys', 'API Keys')}
        </div>
        <p class="docs-section__copy">${docsLink('docs-mcp-universal', 'Set up MCP')} - Get the MCP server running in your coding agent</p>
        <p class="docs-section__copy">${docsLink('docs-mcp-search-guide', 'Search with MCP')} - Learn the best prompts for finding icons through your agent</p>
        <p class="docs-section__copy">${appLink('pricing', 'Get Pro')} - See what a Pro account includes</p>
        <p class="docs-section__copy">${appLink('api-keys', 'API Keys')} - Understand how authentication works</p>
      </section>
    `,
  },
  'docs-mcp-universal': {
    navLabel: 'Universal setup',
    kicker: 'MCP Setup',
    pageTitle: 'Universal MCP Setup',
    summary: 'The field values and config blocks for MCP-capable coding agents and IDEs.',
    bodyHtml: `
      ${renderMcpSetupVideoGuide()}
      ${renderMcpCliSetupGuide()}
      <section class="docs-section" id="universal-setup-types">
        <h2 class="docs-section__title">Choose your setup</h2>
        <div class="docs-grid docs-grid--cards">
          <article class="docs-card">
            <h3>Hosted setup</h3>
            <p>Use this when your client supports remote or Streamable HTTP MCP servers. Free public icon tools work without an account, API key, Node.js, or package installation.</p>
          </article>
          <article class="docs-card">
            <h3>Local setup</h3>
            <p>Use this when your client supports local stdio MCP servers, or when you need purchased packs or Pro tools through <code>SUPERICONS_API_KEY</code>.</p>
          </article>
          <article class="docs-card">
            <h3><a href="#universal-premium">Premium/Pro setup</a></h3>
            <p>Use the local setup below, then add one environment variable: <code>SUPERICONS_API_KEY</code>.</p>
          </article>
        </div>
      </section>
      <section class="docs-section" id="universal-ide-form">
        <h2 class="docs-section__title">Step 1: Add the MCP server</h2>
        <p class="docs-section__copy">Choose hosted when your client asks for a server URL. Choose local when it asks for a command and arguments.</p>
        <h3>Hosted setup fields</h3>
        <div class="docs-field-list" aria-label="Hosted MCP setup field values">
          <div class="docs-field-row">
            <div class="docs-field-row__body">
              <span class="docs-field-row__label">Name</span>
              <code id="docs-universal-hosted-name">supericons</code>
            </div>
            <button class="docs-copy docs-copy--small" type="button" data-copy-target="docs-universal-hosted-name">Copy</button>
          </div>
          <div class="docs-field-row">
            <div class="docs-field-row__body">
              <span class="docs-field-row__label">Transport</span>
              <code id="docs-universal-hosted-transport">streamable-http</code>
            </div>
            <button class="docs-copy docs-copy--small" type="button" data-copy-target="docs-universal-hosted-transport">Copy</button>
          </div>
          <div class="docs-field-row">
            <div class="docs-field-row__body">
              <span class="docs-field-row__label">Server URL</span>
              <code id="docs-universal-hosted-url">${hostedMcpUrl}</code>
            </div>
            <button class="docs-copy docs-copy--small" type="button" data-copy-target="docs-universal-hosted-url">Copy</button>
          </div>
          <div class="docs-field-row docs-field-row--muted">
            <div class="docs-field-row__body">
              <span class="docs-field-row__label">Authentication for free icon tools</span>
              <span class="docs-field-row__value">None. Connect and start searching.</span>
            </div>
          </div>
        </div>
        <h3>Local setup fields</h3>
        <div class="docs-field-list" aria-label="Local MCP setup field values">
          <div class="docs-field-row">
            <div class="docs-field-row__body">
              <span class="docs-field-row__label">Name</span>
              <code id="docs-universal-field-name">supericons</code>
            </div>
            <button class="docs-copy docs-copy--small" type="button" data-copy-target="docs-universal-field-name">Copy</button>
          </div>
          <div class="docs-field-row">
            <div class="docs-field-row__body">
              <span class="docs-field-row__label">Transport</span>
              <code id="docs-universal-field-transport">stdio</code>
            </div>
            <button class="docs-copy docs-copy--small" type="button" data-copy-target="docs-universal-field-transport">Copy</button>
          </div>
          <div class="docs-field-row">
            <div class="docs-field-row__body">
              <span class="docs-field-row__label">Command to launch</span>
              <code id="docs-universal-field-command">npx</code>
            </div>
            <button class="docs-copy docs-copy--small" type="button" data-copy-target="docs-universal-field-command">Copy</button>
          </div>
          <div class="docs-field-row">
            <div class="docs-field-row__body">
              <span class="docs-field-row__label">Argument 1</span>
              <code id="docs-universal-field-arg-y">-y</code>
            </div>
            <button class="docs-copy docs-copy--small" type="button" data-copy-target="docs-universal-field-arg-y">Copy</button>
          </div>
          <div class="docs-field-row">
            <div class="docs-field-row__body">
              <span class="docs-field-row__label">Argument 2</span>
              <code id="docs-universal-field-arg-package">@supericons/mcp@latest</code>
            </div>
            <button class="docs-copy docs-copy--small" type="button" data-copy-target="docs-universal-field-arg-package">Copy</button>
          </div>
          <div class="docs-field-row docs-field-row--muted">
            <div class="docs-field-row__body">
              <span class="docs-field-row__label">Environment variables for free setup</span>
              <span class="docs-field-row__value">Leave empty. Premium/Pro users add the API key in Step 2.</span>
            </div>
          </div>
          <div class="docs-field-row docs-field-row--muted">
            <div class="docs-field-row__body">
              <span class="docs-field-row__label">Working directory</span>
              <span class="docs-field-row__value">Leave blank unless your IDE requires one.</span>
            </div>
          </div>
        </div>
        <div class="docs-grid docs-grid--cards">
          <article class="docs-card">
            <h3>If your IDE asks for a server URL</h3>
            <p>Use <code>${hostedMcpUrl}</code>. Do not add an API key for free public icon tools.</p>
          </article>
          <article class="docs-card">
            <h3>If your IDE has separate argument rows</h3>
            <p>Add two arguments. First add <code>-y</code>. Then add <code>@supericons/mcp@latest</code>.</p>
          </article>
          <article class="docs-card">
            <h3>If your IDE has one argument field</h3>
            <p>Paste <code>-y @supericons/mcp@latest</code> into the argument field.</p>
          </article>
          <article class="docs-card">
            <h3>If your IDE asks for environment variables</h3>
            <p>For hosted setup and free local setup, leave them empty. For account features through local setup, add <code>SUPERICONS_API_KEY</code> in Step 2.</p>
          </article>
          <article class="docs-card">
            <h3>If the hosted URL does not connect</h3>
            <p>Check that your client supports remote or Streamable HTTP MCP servers. If it supports local MCP only, use the <code>npx</code> setup.</p>
          </article>
        </div>
      </section>
      <section class="docs-section" id="universal-agent-prompt">
        <h2 class="docs-section__title">Ask your agent to set it up</h2>
        <p class="docs-section__copy">If your coding agent can edit its own MCP settings, paste this prompt into the agent. If it gets stuck, use the field values above manually.</p>
        <div class="docs-code docs-code--with-copy">
          <button class="docs-copy docs-copy--overlay" type="button" data-copy-target="docs-universal-agent-install-prompt">Copy</button>
          <pre><code id="docs-universal-agent-install-prompt">Connect the Supericons MCP server to this IDE.

Prefer this keyless hosted setup when the IDE supports remote or Streamable HTTP MCP servers:
Name: supericons
Transport: streamable-http
Server URL: ${hostedMcpUrl}
Authentication: none

Otherwise use this local stdio setup:
Name: supericons
Transport: stdio
Command: npx
Arguments: -y @supericons/mcp@latest

After saving, restart or reconnect MCP if this IDE requires it. Then test it by asking Supericons MCP to search for a database icon.</code></pre>
        </div>
      </section>
      <section class="docs-section" id="universal-hosted">
        <h2 class="docs-section__title">Free hosted setup</h2>
        <p class="docs-section__copy">Hosted MCP is the simplest path when your client supports remote servers. It uses the current hosted Search v2 service and needs no package installation for free public icon tools.</p>
        <p class="docs-section__copy">Use this common JSON shape when your client accepts <code>type</code> and <code>url</code> fields. Client field names can differ, so use the setup fields above if this exact shape is not accepted.</p>
        <div class="docs-code docs-code--with-copy">
          <button class="docs-copy docs-copy--overlay" type="button" data-copy-target="docs-universal-hosted-json">Copy</button>
          <pre><code id="docs-universal-hosted-json">{
  "mcpServers": {
    "supericons": {
      "type": "streamable-http",
      "url": "${hostedMcpUrl}"
    }
  }
}</code></pre>
        </div>
        <p class="docs-section__copy">If your client supports local MCP only, use the local setup below.</p>
      </section>
      <section class="docs-section" id="universal-free">
        <h2 class="docs-section__title">Free local config-file setup</h2>
        <p class="docs-section__copy">Free icons work without an account or API key. Any coding agent that can launch a local stdio MCP server can use Supericons.</p>
        <p class="docs-section__copy">Use this JSON config block when your client accepts <code>mcpServers</code>, <code>command</code>, and <code>args</code> fields:</p>
        <div class="docs-code docs-code--with-copy">
          <button class="docs-copy docs-copy--overlay" type="button" data-copy-target="docs-universal-free">Copy</button>
          <pre><code id="docs-universal-free">{
  "mcpServers": {
    "supericons": {
      "command": "npx",
      "args": ["-y", "@supericons/mcp@latest"]
    }
  }
}</code></pre>
        </div>
        <p class="docs-section__copy">Some VS Code-style MCP clients use <code>servers</code> and an explicit <code>type</code> field instead. Use this shape if your IDE expects that format:</p>
        <div class="docs-code docs-code--with-copy">
          <button class="docs-copy docs-copy--overlay" type="button" data-copy-target="docs-universal-vscode-json">Copy</button>
          <pre><code id="docs-universal-vscode-json">{
  "servers": {
    "supericons": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@supericons/mcp@latest"]
    }
  }
}</code></pre>
        </div>
        <p class="docs-section__copy">If your client uses TOML or another wrapper format, keep the same <code>command</code> and <code>args</code> values and adapt only the surrounding syntax to your client&apos;s settings format.</p>
      </section>
      <section class="docs-section" id="universal-test">
        <h2 class="docs-section__title">Test that it worked</h2>
        <p class="docs-section__copy">After saving, restart your IDE or reconnect MCP if needed. Then ask your agent one of these prompts.</p>
        <div class="docs-code docs-code--with-copy">
          <button class="docs-copy docs-copy--overlay" type="button" data-copy-target="docs-universal-test-prompts">Copy</button>
          <pre><code id="docs-universal-test-prompts">Use Supericons MCP to search for a database icon.

Use Supericons MCP to show me a visual preview of icons for ai slop. Pick the top 3 and explain why each fits.

Use Supericons MCP to recommend Lucide outline icons for an AI dashboard sidebar. The slots are model, prompt, dataset, evaluation, deployment, and monitoring. Show the icon id, library, and short reason for each choice.</code></pre>
        </div>
      </section>
      <section class="docs-section" id="universal-premium">
        <h2 class="docs-section__title">Step 2 for Premium/Pro: Add your API key</h2>
        <p class="docs-section__copy">Skip this step if you only want free icon tools. Use the local setup and add this step when you need purchased packs, Motion Lab, or Converter through your account.</p>
        <h3>If your IDE has environment variable fields</h3>
        <p class="docs-section__copy">Click Add environment variable. Put <code>SUPERICONS_API_KEY</code> in the key field. Put your real Supericons API key in the value field.</p>
        <div class="docs-field-list" aria-label="Premium MCP setup field values">
          <div class="docs-field-row">
            <div class="docs-field-row__body">
              <span class="docs-field-row__label">Environment variable key</span>
              <code id="docs-universal-premium-env-key">SUPERICONS_API_KEY</code>
            </div>
            <button class="docs-copy docs-copy--small" type="button" data-copy-target="docs-universal-premium-env-key">Copy</button>
          </div>
          <div class="docs-field-row">
            <div class="docs-field-row__body">
              <span class="docs-field-row__label">Environment variable value</span>
              <code id="docs-universal-premium-env-value">your-key-here</code>
            </div>
            <button class="docs-copy docs-copy--small" type="button" data-copy-target="docs-universal-premium-env-value">Copy</button>
          </div>
        </div>
        <div class="docs-callout">
          <h3>Keep your key private</h3>
          <p>Use your own key in your IDE&apos;s private settings. Do not put a real API key in the command, arguments, working directory, shared project files, public docs, screenshots, or chat messages.</p>
        </div>
        <h3>If your client uses a config file</h3>
        <p class="docs-section__copy">Use this JSON shape when your client supports an <code>env</code> field. The only difference from free setup is the <code>env</code> section.</p>
        <div class="docs-code docs-code--with-copy">
          <button class="docs-copy docs-copy--overlay" type="button" data-copy-target="docs-universal-premium">Copy</button>
          <pre><code id="docs-universal-premium">{
  "mcpServers": {
    "supericons": {
      "command": "npx",
      "args": ["-y", "@supericons/mcp@latest"],
      "env": {
        "SUPERICONS_API_KEY": "your-key-here"
      }
    }
  }
}</code></pre>
        </div>
        <div class="docs-callout">
          <h3>Where to get your key</h3>
          <p>Generate your API key at supericons.dev under ${appLink('api-keys', 'API Keys')}. Use an API key from your Supericons account. Your key uses the access already on your account. Bought packs unlock the premium icons in those packs. Motion Lab and Converter require the ${appLink('pricing', 'Supericons Pro plan')}.</p>
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
      <section class="docs-section" id="universal-troubleshooting">
        <h2 class="docs-section__title">Common setup fixes</h2>
        <div class="docs-grid docs-grid--cards">
          <article class="docs-card">
            <h3>The server does not appear</h3>
            <p>Save the settings, restart the IDE, then open the MCP server list again. Many IDEs only load MCP servers at startup.</p>
          </article>
          <article class="docs-card">
            <h3><code>npx</code> is not found</h3>
            <p>Install Node.js, then open a terminal and run <code>npx --version</code>. The IDE must be able to access the same <code>npx</code> command.</p>
          </article>
          <article class="docs-card">
            <h3>The command field looks wrong</h3>
            <p>Put only <code>npx</code> in the command field. Do not paste the full JSON block into the command field.</p>
          </article>
          <article class="docs-card">
            <h3>The arguments do not work</h3>
            <p>If separate rows fail, try one argument line: <code>-y @supericons/mcp@latest</code>. If one line fails, split it into <code>-y</code> and <code>@supericons/mcp@latest</code>.</p>
          </article>
          <article class="docs-card">
            <h3>The hosted URL does not work</h3>
            <p>Confirm your client supports remote or Streamable HTTP MCP servers. If it does not, use the local <code>npx</code> setup instead.</p>
          </article>
        </div>
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
          <pre><code id="docs-claude-cli"># macOS / Linux (all your projects; use --scope project for a shared .mcp.json)
claude mcp add --scope user supericons -- npx -y @supericons/mcp@latest

# Windows
claude mcp add --scope user supericons -- cmd /c npx -y @supericons/mcp@latest</code></pre>
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
      "args": ["-y", "@supericons/mcp@latest"]
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
        <p class="docs-section__copy">To use premium icons you own, or Pro tools like Motion Lab and Converter, add your API key to the server config. Use the config file method with the <code>env</code> field:</p>
        <div class="docs-code docs-code--with-copy">
          <button class="docs-copy docs-copy--overlay" type="button" data-copy-target="docs-claude-premium">Copy</button>
          <pre><code id="docs-claude-premium">{
  "mcpServers": {
    "supericons": {
      "command": "npx",
      "args": ["-y", "@supericons/mcp@latest"],
      "env": {
        "SUPERICONS_API_KEY": "your-key-here"
      }
    }
  }
}</code></pre>
        </div>
        <div class="docs-callout">
          <h3>Where to get your key</h3>
          <p>Generate your API key at supericons.dev under ${appLink('api-keys', 'API Keys')}. Use an API key from your Supericons account. Your key uses the access already on your account. Bought packs unlock the premium icons in those packs. Motion Lab and Converter require the ${appLink('pricing', 'Supericons Pro plan')}.</p>
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
            <p>Confirm three things. (1) Your account access matches what you want to use. Bought packs unlock the premium icons in those packs. Motion Lab and Converter require the ${appLink('pricing', 'Supericons Pro plan')}. (2) You generated an API key from the dashboard. (3) <code>SUPERICONS_API_KEY</code> is present in the config Claude Code reads at startup.</p>
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
    verifiedNote: 'Verified against official Codex documentation as of 10 April 2026.',
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
          <pre><code id="docs-codex-cli">codex mcp add supericons -- npx -y @supericons/mcp@latest</code></pre>
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
args = ["-y", "@supericons/mcp@latest"]</code></pre>
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
        <p class="docs-section__copy">To use premium icons you own, or Pro tools like Motion Lab and Converter, add your API key to the server config:</p>
        <div class="docs-code docs-code--with-copy">
          <button class="docs-copy docs-copy--overlay" type="button" data-copy-target="docs-codex-premium">Copy</button>
          <pre><code id="docs-codex-premium">[mcp_servers.supericons]
command = "npx"
args = ["-y", "@supericons/mcp@latest"]
env = { SUPERICONS_API_KEY = "your-key-here" }</code></pre>
        </div>
        <div class="docs-callout">
          <h3>Where to get your key</h3>
          <p>Generate your API key at supericons.dev under ${appLink('api-keys', 'API Keys')}. Use an API key from your Supericons account. Your key uses the access already on your account. Bought packs unlock the premium icons in those packs. Motion Lab and Converter require the ${appLink('pricing', 'Supericons Pro plan')}.</p>
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
            <p>Confirm <code>SUPERICONS_API_KEY</code> is in the <code>env</code> block of <code>[mcp_servers.supericons]</code>. Check that your account access matches what you want to use. Bought packs unlock the premium icons in those packs. Motion Lab and Converter require the ${appLink('pricing', 'Supericons Pro plan')}. Restart after updating the config.</p>
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
      "args": ["-y", "@supericons/mcp@latest"]
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
      "args": ["-y", "@supericons/mcp@latest"],
      "env": {
        "SUPERICONS_API_KEY": "your-key-here"
      }
    }
  }
}</code></pre>
        </div>
        <div class="docs-callout">
          <h3>Where to get your key</h3>
          <p>Generate your API key at supericons.dev under ${appLink('api-keys', 'API Keys')}. Use an API key from your Supericons account. Your key uses the access already on your account. Bought packs unlock the premium icons in those packs. Motion Lab and Converter require the ${appLink('pricing', 'Supericons Pro plan')}.</p>
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
            <p>Confirm <code>SUPERICONS_API_KEY</code> is present in the <code>env</code> block. Confirm your account access matches what you want to use. Bought packs unlock the premium icons in those packs. Motion Lab and Converter require the ${appLink('pricing', 'Supericons Pro plan')}.</p>
          </article>
          <article class="docs-card">
            <h3><code>npx</code> takes a long time on first run</h3>
            <p>The first run of <code>npx -y @supericons/mcp@latest</code> downloads the package from npm. This is a one-time delay. Subsequent starts are faster.</p>
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
            <p>Official OpenCode docs for local and remote MCP server setup.</p>
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
      <section class="docs-callout" id="others-hosted-note">
        <h3>About hosted MCP links</h3>
        <p>Supericons also has hosted MCP endpoints for compatible clients and registry listings. Some hosted paths, including Smithery, may require that client to complete Smithery authentication first. If setup fails in a coding agent, use the local <code>npx</code> setup from the universal guide.</p>
      </section>
    `,
  },
  'docs-mcp-search-guide': {
    navLabel: 'Search Guide',
    kicker: 'MCP Reference',
    pageTitle: 'How to Search Icons with MCP',
    summary: 'Prompt examples for asking your AI agent to find, compare, and fetch Supericons icons.',
    bodyHtml: `
      <section class="docs-section" id="mcp-search-intro">
        <p class="docs-section__copy">Once Supericons MCP is connected, you can ask your AI agent for icons in normal language. You do not need to know the exact icon name first. Describe the object, action, feeling, screen, or job the icon needs to support.</p>
        <p class="docs-section__copy">The safest workflow is simple: ask for options, choose one, then ask the agent to fetch the SVG or place it in your code.</p>
      </section>
      <section class="docs-section" id="mcp-search-tools">
        <h2 class="docs-section__title">Which tool should the agent use?</h2>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead>
              <tr>
                <th>Need</th>
                <th>Best tool</th>
                <th>Example prompt</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Find icons from a word or phrase</td><td><code>search_icons</code></td><td>Find me a database icon. Use this when you want text results, icon IDs, or SVGs. For non-English search, include <code>locale</code>, such as <code>zh-Hans</code>, <code>ja</code>, or <code>ko</code>.</td></tr>
              <tr><td>See icons before choosing</td><td><code>preview_icons</code></td><td>Show me a visual preview of icons for ai slop. If the chat cannot show the image, ask for the image link or browser preview link.</td></tr>
              <tr><td>Choose icons for several UI slots</td><td><code>recommend_icons</code></td><td>Recommend icons for an AI dashboard: model, prompt, dataset, evaluation, deployment, and monitoring. Ask for <code>response_mode: "plan"</code> when you want compact output. If your slots are not in English, include <code>locale</code>.</td></tr>
              <tr><td>Fetch one known icon</td><td><code>get_icon</code></td><td>Get the SVG for <code>database</code> from Iconoir.</td></tr>
              <tr><td>See available libraries</td><td><code>list_libraries</code></td><td>List the Supericons icon libraries.</td></tr>
            </tbody>
          </table>
        </div>
      </section>
      <section class="docs-section" id="mcp-search-prompts">
        <h2 class="docs-section__title">Good prompts to try</h2>
        <div class="docs-grid docs-grid--cards">
          <article class="docs-card">
            <h3>Search by object</h3>
            <ul>
              <li>Find me a database icon.</li>
              <li>Find a calendar icon from Tabler.</li>
              <li>Search for a shield icon for account security.</li>
            </ul>
          </article>
          <article class="docs-card">
            <h3>Search by action</h3>
            <ul>
              <li>Find icons for upload to cloud.</li>
              <li>Search Lucide for user profile icons.</li>
              <li>Find icons that mean block user or deny access.</li>
            </ul>
          </article>
          <article class="docs-card">
            <h3>Search by meaning</h3>
            <ul>
              <li>Find a friendly icon for something beautiful.</li>
              <li>Find an icon that could represent a bad smell.</li>
              <li>Find an icon for something broken or risky.</li>
            </ul>
          </article>
          <article class="docs-card">
            <h3>Preview visually</h3>
            <ul>
              <li>Show me a visual preview of icons for ai slop.</li>
              <li>Visually compare the top 3 icons for smart automation.</li>
              <li>Preview icons for license plate recognition camera scan car.</li>
            </ul>
          </article>
          <article class="docs-card">
            <h3>Search by UI slot</h3>
            <ul>
              <li>Recommend icons for a mobile bottom nav: home, create, alerts, and profile.</li>
              <li>Recommend icons for an AI dashboard: model, prompt, dataset, evaluation, deployment, and monitoring.</li>
              <li>Recommend icons for an admin sidebar: users, billing, database, settings, and reports.</li>
            </ul>
          </article>
        </div>
      </section>
      <section class="docs-section" id="mcp-search-output">
        <h2 class="docs-section__title">Ask for the output you need</h2>
        <p class="docs-section__copy">After the agent finds good matches, tell it what to return. You can ask for a shortlist, the icon IDs, the SVG, or code-ready markup.</p>
        <div class="docs-code docs-code--with-copy">
          <button class="docs-copy docs-copy--overlay" type="button" data-copy-target="docs-mcp-search-output-prompts">Copy</button>
          <pre><code id="docs-mcp-search-output-prompts">Show me the top 5 choices with icon id, library, and a short reason.

Show me a visual preview first, then list the icon refs.

Get the SVG for the best result.

Use the best Lucide result and add it to this button.

Give me three alternatives if the first one feels too generic.</code></pre>
        </div>
      </section>
      <section class="docs-section" id="mcp-search-locales">
        <h2 class="docs-section__title">Search in supported languages</h2>
        <p class="docs-section__copy">For multilingual search, keep tool names and icon IDs in English, but pass a supported <code>locale</code> with the search phrase. Supericons expands approved localized terms to stable English concepts before ranking icons.</p>
        <div class="docs-code docs-code--with-copy">
          <button class="docs-copy docs-copy--overlay" type="button" data-copy-target="docs-mcp-search-locale-prompts">Copy</button>
          <pre><code id="docs-mcp-search-locale-prompts">search_icons({ query: "设置", locale: "zh-Hans" })
search_icons({ query: "搜尋", locale: "zh-Hant" })
search_icons({ query: "検索", locale: "ja" })
search_icons({ query: "설정", locale: "ko" })
search_icons({ query: "seguridad", locale: "es" })
search_icons({ query: "Sicherheit", locale: "de" })
search_icons({ query: "الأمان", locale: "ar" })</code></pre>
        </div>
        <p class="docs-section__copy">Supported locale values are <code>zh-Hans</code>, <code>zh-Hant</code>, <code>ja</code>, <code>ko</code>, <code>es</code>, <code>de</code>, <code>pt</code>, <code>ar</code>, <code>hi</code>, <code>vi</code>, and <code>th</code>.</p>
      </section>
      <section class="docs-callout" id="mcp-search-private-note">
        <h3>What stays private</h3>
        <p>Supericons search can understand names, related words, and common icon meanings. The public docs describe how to use it, but they do not expose private service keys, private scoring details, or internal maintenance workflows.</p>
      </section>
      <section class="docs-section" id="mcp-search-next">
        <h2 class="docs-section__title">Next references</h2>
        <div class="docs-link-list docs-link-list--inline">
          ${docsLink('docs-mcp-icons', 'Icon tools reference')}
          ${docsLink('docs-mcp-tools', 'All MCP tools')}
          ${docsLink('docs-mcp-universal', 'MCP setup')}
        </div>
      </section>
    `,
  },
  'docs-mcp-tools': {
    navLabel: 'Overview',
    kicker: 'MCP Reference',
    pageTitle: 'MCP Tools Overview',
    summary: 'All public Supericons MCP tools.',
    bodyHtml: `
      <section class="docs-section" id="mcp-overview-intro">
        <p class="docs-section__copy">The Supericons MCP server exposes ${mcpToolCount} tools your coding agent can call directly. ${mcpFreeToolCount} tools are free and work without an account. Premium icon access depends on what your account already has: the packs you bought, the ${appLink('pricing', 'Supericons Pro plan')}, or both. Motion Lab and Converter tools require the ${appLink('pricing', 'Supericons Pro plan')} and a valid <code>SUPERICONS_API_KEY</code>.</p>
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
              <tr><td><code>search_icons</code></td><td>Search ${freeIconsAcrossLibrariesFreeLabel}</td><td>Free</td></tr>
              <tr><td><code>preview_icons</code></td><td>Show a visual contact sheet, direct image link, and browser preview link for search results or known icon refs</td><td>Free</td></tr>
              <tr><td><code>recommend_icons</code></td><td>Choose icons for several app slots, with confidence and alternatives</td><td>Free</td></tr>
              <tr><td><code>get_icon</code></td><td>Retrieve a specific icon by ID and library</td><td>Free</td></tr>
              <tr><td><code>list_libraries</code></td><td>List all available icon libraries</td><td>Free</td></tr>
              <tr><td><code>list_motion_presets</code></td><td>List all Motion Lab animation presets</td><td>Supericons Pro plan</td></tr>
              <tr><td><code>get_motion_recipe</code></td><td>Get a plain-language description of any preset</td><td>Supericons Pro plan</td></tr>
              <tr><td><code>animate_icon</code></td><td>Get Motion Lab CSS and animated SVG in one call</td><td>Supericons Pro plan</td></tr>
              <tr><td><code>export_motion_css</code></td><td>Get only the Motion Lab CSS for an icon</td><td>Supericons Pro plan</td></tr>
              <tr><td><code>export_animated_svg</code></td><td>Get only the standalone animated SVG</td><td>Supericons Pro plan</td></tr>
              <tr><td><code>inspect_converter_options</code></td><td>List Converter settings and valid values</td><td>Supericons Pro plan</td></tr>
              <tr><td><code>inspect_converter_input</code></td><td>Inspect a PNG and recommend safe starting settings</td><td>Supericons Pro plan</td></tr>
              <tr><td><code>convert_svg_to_png</code></td><td>Render an SVG as a PNG at any resolution</td><td>Supericons Pro plan</td></tr>
              <tr><td><code>convert_png_to_svg</code></td><td>Trace a PNG image into an SVG</td><td>Supericons Pro plan</td></tr>
            </tbody>
          </table>
        </div>
      </section>
      <section class="docs-callout" id="mcp-overview-note">
        <h3>Premium collections also require access</h3>
        <p>Premium animated icon collections from <code>get_icon</code> and <code>search_icons</code> require an API key from an account that already owns those packs, or from an account with the ${appLink('pricing', 'Supericons Pro plan')}.</p>
      </section>
      <section class="docs-section" id="mcp-overview-links">
        <h2 class="docs-section__title">Detailed references</h2>
        <div class="docs-link-list docs-link-list--inline">
          ${docsLink('docs-mcp-search-guide', 'Search guide')}
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
    summary: 'Search and retrieve icons through MCP.',
    bodyHtml: `
      <section class="docs-section" id="icon-tools-intro">
        <p class="docs-section__copy">These ${mcpFreeToolCount} tools are free and do not require an API key for the standard ${PRODUCT_FACT_LABELS.freeIconLibraryLabel}. Premium animated icon collections from these tools require either the ${appLink('pricing', 'Supericons Pro plan')} or an account that already owns those packs.</p>
      </section>
      <section class="docs-section" id="icon-tools-search">
        <h2 class="docs-section__title"><code>search_icons</code></h2>
        <p class="docs-section__copy">Search ${freeIconsAcrossLibrariesFreeLabel} using AI-powered synonym expansion. Returns matching icons with SVG code, public library labels, and browser preview links. Premium packs are available when you use an API key from an account that already owns those packs, or from an account with the ${appLink('pricing', 'Supericons Pro plan')}.</p>
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
              <tr><td><code>library</code></td><td>string</td><td>No</td><td>-</td><td>Filter by library. Use <code>si</code> for Supericons AI and developer tool logos. Use <code>simpleicons</code> for Simple Icons brand logos. Other valid values include <code>lucide</code>, <code>tabler</code>, <code>phosphor</code>, <code>heroicons</code>, <code>bootstrap</code>, <code>iconoir</code>, <code>ionicons</code>, <code>material</code>, <code>mingcute</code>, or a premium pack name</td></tr>
              <tr><td><code>limit</code></td><td>integer</td><td>No</td><td>10</td><td>Max results returned. Range: 1 to 50</td></tr>
              <tr><td><code>locale</code></td><td>string</td><td>No</td><td>-</td><td>Use for multilingual search terms. Supported values: <code>zh-Hans</code>, <code>zh-Hant</code>, <code>ja</code>, <code>ko</code>, <code>es</code>, <code>de</code>, <code>pt</code>, <code>ar</code>, <code>hi</code>, <code>vi</code>, <code>th</code></td></tr>
            </tbody>
          </table>
        </div>
        <h3>Returns</h3>
        <p class="docs-section__copy">Matching icons with SVG code, icon ID, public library label, metadata, and preview links. When no results are found, returns a message indicating no match.</p>
        <p class="docs-section__copy"><strong>Access:</strong> Free.</p>
      </section>
      <section class="docs-section" id="icon-tools-preview">
        <h2 class="docs-section__title"><code>preview_icons</code></h2>
        <p class="docs-section__copy">Create a visual preview for icon search results or a fixed list of icon refs. It returns a browser preview URL, a direct PNG image URL, and a ready-made Markdown image snippet. Some MCP clients can also show the included PNG contact sheet inside chat.</p>
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
              <tr><td><code>query</code></td><td>string</td><td>No</td><td>-</td><td>Search phrase to preview visually, such as <code>license plate recognition camera scan car</code></td></tr>
              <tr><td><code>icon_refs</code></td><td>string array</td><td>No</td><td>-</td><td>Known icon refs in <code>library:id</code> format, such as <code>si:x-ai</code> or <code>mingcute:scan_2_line</code></td></tr>
              <tr><td><code>library</code></td><td>string</td><td>No</td><td>-</td><td>Optional library filter. Use <code>si</code> for Supericons and <code>simpleicons</code> for Simple Icons</td></tr>
              <tr><td><code>style</code></td><td>string</td><td>No</td><td><code>any</code></td><td>Use <code>outline</code>, <code>solid</code>, or <code>any</code></td></tr>
              <tr><td><code>locale</code></td><td>string</td><td>No</td><td>-</td><td>Use for multilingual search terms. Supported values match <code>search_icons</code></td></tr>
              <tr><td><code>limit</code></td><td>integer</td><td>No</td><td>9</td><td>Maximum icons included in the preview. Range: 1 to 12</td></tr>
              <tr><td><code>include_image</code></td><td>boolean</td><td>No</td><td><code>true</code></td><td>When true, Supericons may include a PNG contact sheet for clients that can display images</td></tr>
            </tbody>
          </table>
        </div>
        <h3>Returns</h3>
        <p class="docs-section__copy">A <code>preview_url</code> for the Supericons web UI, an <code>image_url</code> for a direct PNG contact sheet, a <code>markdown_image</code> snippet for clients that render remote Markdown images, and matching icon refs. Some clients also show the image inside the chat.</p>
        <h3>Recommended prompt</h3>
        <div class="docs-code docs-code--with-copy">
          <button class="docs-copy docs-copy--overlay" type="button" data-copy-target="docs-preview-icons-prompt">Copy</button>
          <pre><code id="docs-preview-icons-prompt">Use Supericons to show me a visual preview of icons for ai slop. Pick the top 3 results and explain briefly why each icon fits.</code></pre>
        </div>
        <p class="docs-section__copy"><strong>Access:</strong> Free for standard icons. Premium animated icons require the ${appLink('pricing', 'Supericons Pro plan')} or an account that already owns those packs.</p>
      </section>
      <section class="docs-section" id="icon-tools-recommend">
        <h2 class="docs-section__title"><code>recommend_icons</code></h2>
        <p class="docs-section__copy">Choose icons for several app slots in one call. Use this when you are planning a sidebar, toolbar, bottom navigation, dashboard, or product screen and want consistent icon choices before fetching SVGs. Results include public library labels and a browser preview link for the recommended set.</p>
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
              <tr><td><code>task</code></td><td>string</td><td>Yes</td><td>-</td><td>Overall UI task. Example: "choose icons for an ecommerce admin sidebar"</td></tr>
              <tr><td><code>slots</code></td><td>string array</td><td>Yes</td><td>-</td><td>One to twenty UI slots, such as <code>["Products", "Orders", "Customers"]</code></td></tr>
              <tr><td><code>library</code></td><td>string</td><td>No</td><td>-</td><td>Optional library filter, such as <code>si</code> for Supericons, <code>lucide</code>, <code>tabler</code>, <code>phosphor</code>, <code>mingcute</code>, or <code>simpleicons</code> for Simple Icons</td></tr>
              <tr><td><code>style</code></td><td>string</td><td>No</td><td><code>any</code></td><td>Use <code>outline</code>, <code>solid</code>, or <code>any</code></td></tr>
              <tr><td><code>locale</code></td><td>string</td><td>No</td><td>-</td><td>Use when slot labels are not in English. Supported values match <code>search_icons</code></td></tr>
              <tr><td><code>limit_per_slot</code></td><td>integer</td><td>No</td><td>3</td><td>How many choices to return per slot. Range: 1 to 5</td></tr>
              <tr><td><code>response_mode</code></td><td>string</td><td>No</td><td><code>plan</code></td><td>Use <code>plan</code> for compact icon IDs and reasons, <code>assets</code> to include SVGs for top choices, or <code>full</code> for the largest response</td></tr>
            </tbody>
          </table>
        </div>
        <h3>Recommended prompt</h3>
        <div class="docs-code docs-code--with-copy">
          <button class="docs-copy docs-copy--overlay" type="button" data-copy-target="docs-recommend-icons-prompt">Copy</button>
          <pre><code id="docs-recommend-icons-prompt">Use Supericons recommend_icons first.

Choose Tabler icons for an ecommerce admin: Products, Orders, Customers, Cart, Discounts, Inventory, Shipping, Returns, Payments, and Store settings.

Return a table with slot, icon ID, confidence, and alternatives. Use response_mode: "plan".</code></pre>
        </div>
        <p class="docs-section__copy"><strong>Access:</strong> Free.</p>
      </section>
      <section class="docs-section" id="icon-tools-get">
        <h2 class="docs-section__title"><code>get_icon</code></h2>
        <p class="docs-section__copy">Retrieve a specific icon by its ID and library. Returns the full SVG code, metadata, public library label, and preview link. Premium icons require an API key from an account that already owns those packs, or from an account with the ${appLink('pricing', 'Supericons Pro plan')}.</p>
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
              <tr><td><code>library</code></td><td>string</td><td>Yes</td><td>Library key. Example: <code>si</code> for Supericons, <code>lucide</code>, <code>tabler</code>, <code>phosphor</code>, or a premium pack name</td></tr>
            </tbody>
          </table>
        </div>
        <h3>Returns</h3>
        <p class="docs-section__copy">Full SVG code plus icon metadata, including ID, name, library key, public library label, preview link, and premium status. For premium animated icons, also returns the CSS animation block and a usage HTML snippet.</p>
        <p class="docs-section__copy"><strong>Access:</strong> Free for standard icons. Premium animated icons require the ${appLink('pricing', 'Supericons Pro plan')} or an account that already owns those packs.</p>
      </section>
      <section class="docs-section" id="icon-tools-libraries">
        <h2 class="docs-section__title"><code>list_libraries</code></h2>
        <p class="docs-section__copy">List all available icon libraries with their names, icon counts, and descriptions. Premium libraries are marked.</p>
        <h3>Parameters</h3>
        <p class="docs-section__copy">None.</p>
        <h3>Returns</h3>
        <p class="docs-section__copy">An array of library objects, each with: <code>id</code>, <code>name</code>, <code>label</code>, <code>count</code>, <code>description</code>, <code>premium</code> (boolean), and <code>accessible</code> (whether your current API key can access it).</p>
        <p class="docs-section__copy"><strong>Access:</strong> Free.</p>
      </section>
    `,
  },
  'docs-mcp-motion': {
    navLabel: 'Motion Lab',
    kicker: 'MCP Reference',
    pageTitle: 'Motion Lab MCP Tools',
    summary: 'Animate icons through MCP.',
    bodyHtml: `
      <section class="docs-section" id="motion-tools-intro">
        <p class="docs-section__copy">These five tools expose Motion Lab capabilities to your coding agent. All five require the ${appLink('pricing', 'Supericons Pro plan')} plus a valid <code>SUPERICONS_API_KEY</code>.</p>
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
        <p class="docs-section__copy"><strong>Access:</strong> ${appLink('pricing', 'Supericons Pro plan')}.</p>
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
        <p class="docs-section__copy">A preset profile with <code>preset_id</code>, <code>preset</code>, <code>group</code>, <code>description</code>, <code>trigger</code>, <code>duration_ms</code>, <code>intensity_percent</code>, <code>default_duration_ms</code>, <code>duration_range_ms</code>, <code>default_intensity_percent</code>, <code>intensity_range_percent</code>, <code>export_compatibility</code>, <code>technical_output_notes</code>, <code>visual_character</code>, <code>emotional_tone</code>, <code>recommended_contexts</code>, <code>avoid_for</code>, <code>behavior</code>, and usage <code>notes</code>.</p>
        <p class="docs-section__copy"><strong>Access:</strong> ${appLink('pricing', 'Supericons Pro plan')}.</p>
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
        <p class="docs-section__copy">An object with: <code>id</code>, <code>library</code>, <code>recipe</code> (the preset profile), <code>css</code> (Motion Lab CSS), <code>animated_svg</code> (standalone SVG with embedded animation), and <code>selector_mode</code>. Placeholder CSS responses also include <code>selector_token</code>.</p>
        <p class="docs-section__copy"><strong>Access:</strong> ${appLink('pricing', 'Supericons Pro plan')}.</p>
      </section>
      <section class="docs-section" id="motion-tools-css">
        <h2 class="docs-section__title"><code>export_motion_css</code></h2>
        <p class="docs-section__copy">Generate only the Motion Lab CSS for an icon. Use this when you have the SVG inline in your markup and want to manage the animation as a separate stylesheet.</p>
        <h3>Parameters</h3>
        <p class="docs-section__copy">Same as <code>animate_icon</code>.</p>
        <h3>Returns</h3>
        <p class="docs-section__copy">An object with: <code>id</code>, <code>library</code>, <code>preset</code> (the preset profile), <code>css</code> (the Motion Lab CSS with <code>@keyframes</code> and animation rules), and <code>selector_mode</code>. Placeholder responses also include <code>selector_token</code>.</p>
        <h3>The CSS selector targets</h3>
        <p class="docs-section__copy">The hosted Motion Lab CSS path returns portable CSS by default using the token <code>{{ICON_SELECTOR}}</code>. Replace that token with the selector for your inline SVG before applying the stylesheet.</p>
        <p class="docs-section__copy"><strong>Access:</strong> ${appLink('pricing', 'Supericons Pro plan')}.</p>
      </section>
      <section class="docs-section" id="motion-tools-svg">
        <h2 class="docs-section__title"><code>export_animated_svg</code></h2>
        <p class="docs-section__copy">Generate a self-contained animated SVG with the animation embedded directly in the file. Drop it into any HTML page without external CSS.</p>
        <h3>Parameters</h3>
        <p class="docs-section__copy">Same as <code>animate_icon</code>.</p>
        <h3>Returns</h3>
        <p class="docs-section__copy">An object with: <code>id</code>, <code>library</code>, <code>preset</code> (the preset profile), and <code>animated_svg</code> (a complete SVG string with a <code>&lt;style&gt;</code> block embedded inside).</p>
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
        <p class="docs-section__copy"><strong>Access:</strong> ${appLink('pricing', 'Supericons Pro plan')}.</p>
      </section>
    `,
  },
  'docs-mcp-converter': {
    navLabel: 'Converter',
    kicker: 'MCP Reference',
    pageTitle: 'Converter MCP Tools',
    summary: 'Convert PNG and SVG assets through MCP.',
    bodyHtml: `
      <section class="docs-section" id="converter-tools-intro">
        <p class="docs-section__copy">These four tools expose Converter capabilities to your coding agent. All four require the ${appLink('pricing', 'Supericons Pro plan')}. The safest workflow is to inspect the PNG first, inspect the option guidance second, then convert with a justified starting configuration.</p>
      </section>
      <section class="docs-section" id="converter-tools-inspect">
        <h2 class="docs-section__title"><code>inspect_converter_options</code></h2>
        <p class="docs-section__copy">List the current Converter MCP options, setting guidance, workflow hints, and recommended starter combinations. Call this when you need the valid values and the reasoning behind them.</p>
        <h3>Parameters</h3>
        <p class="docs-section__copy">None.</p>
        <h3>Returns</h3>
        <p class="docs-section__copy">An object describing all available converter settings, valid values, default values, limits, workflow order, setting guidance, and starter combinations.</p>
        <p class="docs-section__copy"><strong>Access:</strong> ${appLink('pricing', 'Supericons Pro plan')}.</p>
      </section>
      <section class="docs-section" id="converter-tools-inspect-input">
        <h2 class="docs-section__title"><code>inspect_converter_input</code></h2>
        <p class="docs-section__copy">Inspect a PNG before tracing. Returns structural hints from the file header, likely risks, and recommended starting settings for <code>convert_png_to_svg</code>. Use this when an agent needs a justified first pass instead of guessing at <code>traceClass</code>.</p>
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
              <tr><td><code>mimeType</code></td><td>string</td><td>No</td><td><code>image/png</code></td><td>Optional MIME type override if the data URL is not present. Only <code>image/png</code> is currently supported.</td></tr>
            </tbody>
          </table>
        </div>
        <h3>Returns</h3>
        <p class="docs-section__copy">An object with input metadata, a structural assessment, likely trace risks, and recommended starting settings for the next converter call.</p>
        <p class="docs-section__copy"><strong>Access:</strong> ${appLink('pricing', 'Supericons Pro plan')}.</p>
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
        <p class="docs-section__copy">An object with <code>pngBase64</code>, <code>pngDataUrl</code>, <code>metrics</code> (elapsed time, output size, width, and height), and <code>request</code> (the resolved width and background settings).</p>
        <p class="docs-section__copy"><strong>Access:</strong> ${appLink('pricing', 'Supericons Pro plan')}.</p>
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
        <p class="docs-section__copy">An object with <code>svg</code>, <code>warnings</code>, <code>metrics</code> (elapsed time, output size, path count, shape count, and viewBox), and <code>request</code> (the resolved converter settings used for the trace).</p>
        <p class="docs-section__copy"><strong>Access:</strong> ${appLink('pricing', 'Supericons Pro plan')}.</p>
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
              <tr><td>Single-color wordmark</td><td><code>single-color-mark</code>, <code>exact</code>, <code>logo</code></td></tr>
              <tr><td>Small colored icon or badge</td><td><code>tile-icon-color</code>, <code>exact</code>, <code>icon</code></td></tr>
              <tr><td>Small UI icon</td><td><code>tiny-line-icon</code>, <code>exact</code>, <code>icon</code></td></tr>
              <tr><td>High-contrast mask or silhouette</td><td><code>mono-mask</code>, <code>exact</code>, <code>logo</code></td></tr>
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
    summary: 'Preset-driven icon animation. Export as CSS or animated SVG.',
    bodyHtml: `
      <section class="docs-section" id="motion-lab-intro">
        <p class="docs-section__copy">Pick a preset, set the trigger, timing, and intensity, then export as production-ready CSS or a self-contained animated SVG. Both formats are drop-in ready with no JavaScript.</p>
      </section>
      <section class="docs-section" id="motion-lab-access">
        <h2 class="docs-section__title">Two ways to use Motion Lab</h2>
        <ul>
          <li><strong>In the browser</strong>: Open Motion Lab directly and browse presets with any icon. Preview animations in real time. Exporting CSS or SVG requires the ${appLink('pricing', 'Supericons Pro plan')}.</li>
          <li><strong>Through MCP</strong>: Your agent calls Motion Lab tools directly. All Motion Lab tools require the ${appLink('pricing', 'Supericons Pro plan')} plus a valid API key from your Supericons account. See the ${docsLink('docs-mcp-motion', 'Motion Lab MCP tools reference')} for exact parameters.</li>
        </ul>
      </section>
      <section class="docs-section" id="motion-lab-mcp-mental-model">
        <h2 class="docs-section__title">How Motion Lab works through MCP</h2>
        <p class="docs-section__copy">Motion Lab through MCP runs on two layers by design. The local process handles preset discovery and request orchestration. Premium preset profiles, CSS rendering, and animated SVG rendering resolve through hosted Supericons functions using a short-lived session token. The local package stays lightweight; premium rendering stays behind the hosted path.</p>
        <p class="docs-section__copy">If you want the practical agent workflow, open ${docsLink('docs-motion-lab-mcp-workflow', 'MCP Workflow')}. If you need exact tool parameters, keep ${docsLink('docs-mcp-motion', 'Motion Lab MCP Tools')} as the API-style reference.</p>
      </section>
      <section class="docs-section" id="motion-lab-output">
        <h2 class="docs-section__title">What Motion Lab produces</h2>
        <p class="docs-section__copy">Motion Lab produces two output types:</p>
        <p class="docs-section__copy"><strong>Motion Lab CSS</strong>: A stylesheet with <code>@keyframes</code> and animation rules. Keep your SVG inline in markup and link the CSS separately. Replace <code>{{ICON_SELECTOR}}</code> in the returned CSS with your SVG&apos;s selector.</p>
        <p class="docs-section__copy"><strong>Animated SVG</strong>: A complete SVG with the animation embedded inside a <code>&lt;style&gt;</code> block. No external stylesheet needed. Use it as an <code>&lt;img&gt;</code> reference or paste it inline.</p>
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
          <article class="docs-card">
            <div class="docs-card__head">
              <h3>MCP Workflow</h3>
              <a class="docs-btn docs-btn--ghost" href="${docsHref('docs-motion-lab-mcp-workflow')}" data-docs-view="docs-motion-lab-mcp-workflow">Open the guide</a>
            </div>
            <p>The practical human-and-agent flow for choosing presets and exporting safely.</p>
          </article>
          <article class="docs-card">
            <div class="docs-card__head">
              <h3>Client Setup</h3>
              <a class="docs-btn docs-btn--ghost" href="${docsHref('docs-motion-lab-client-setup')}" data-docs-view="docs-motion-lab-client-setup">Open setup</a>
            </div>
            <p>If you have not connected a client yet, start here. Add your API key, then run a short verify sequence to confirm the hosted premium path is live.</p>
          </article>
          <article class="docs-card">
            <div class="docs-card__head">
              <h3>Use Cases</h3>
              <a class="docs-btn docs-btn--ghost" href="${docsHref('docs-motion-lab-use-cases')}" data-docs-view="docs-motion-lab-use-cases">Open examples</a>
            </div>
            <p>Concrete guidance for hover states, security flows, celebrations, ambient motion, and restraint.</p>
          </article>
        </div>
      </section>
    `,
  },
  'docs-motion-lab-presets': {
    navLabel: 'Presets',
    kicker: 'Motion Lab',
    pageTitle: 'Motion Lab Presets',
    summary: `Full preset reference for Motion Lab. ${motionLabPresetCount} presets across ${motionLabGroupCount} groups: Motion, Entrances, Exits, and Special. Every preset works with loop, hover, and click triggers. Duration: 100ms to 4000ms. Intensity: 25% to 200%.`,
    bodyHtml: `
      <section class="docs-section" id="motion-presets-intro">
        <p class="docs-section__copy">Each row includes the preset ID to use as the <code>preset</code> parameter in any Motion Lab tool call. Use the Group column to narrow candidates by intent before committing to an export.</p>
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
        <h2 class="docs-section__title">Preset groups</h2>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead>
              <tr>
                <th>Group</th>
                <th>Preset count</th>
                <th>When to reach for it</th>
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
    summary: 'Three trigger types control when a Motion Lab animation starts and how many times it plays. The right choice depends on how the icon is used in the interface: always-visible, interactive, or state-driven.',
    bodyHtml: `
      <section class="docs-section" id="motion-trigger-loop">
        <h2 class="docs-section__title"><code>loop</code></h2>
        <p class="docs-section__copy">The animation plays continuously as soon as the icon is rendered. It repeats indefinitely with no user interaction required.</p>
        <p class="docs-section__copy"><strong>When to use:</strong> Loading states, ambient decorations, hero section branding icons, always-on visual interest.</p>
        <p class="docs-section__copy"><strong>When not to use:</strong> Interactive elements where continuous motion would compete with user focus.</p>
      </section>
      <section class="docs-section" id="motion-trigger-hover">
        <h2 class="docs-section__title"><code>hover</code></h2>
        <p class="docs-section__copy">The animation plays while the user hovers the icon element. It stops naturally when the animation completes after the pointer leaves. Internally, this uses CSS <code>:hover</code> triggered by <code>mouseenter</code> and <code>mouseleave</code> events.</p>
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
    summary: 'Two production-ready formats: Motion Lab CSS for inline SVG with a separate stylesheet, and animated SVG for a self-contained drop-in file. Both require the Supericons Pro plan. The right choice depends on how you integrate SVG into your project.',
    bodyHtml: `
      <section class="docs-section" id="motion-exports-css">
        <h2 class="docs-section__title">Motion Lab CSS</h2>
        <h3>What it is</h3>
        <p class="docs-section__copy">A stylesheet with <code>@keyframes</code> definitions and animation rules. Apply it alongside an SVG element in your HTML or JSX. The SVG and the animation are separate files.</p>
        <h3>How to use it</h3>
        <ol class="docs-list docs-list--numbered">
          <li>Get the SVG from Supericons using <code>search_icons</code> or <code>get_icon</code>. (Free)</li>
          <li>Call <code>export_motion_css</code> with your chosen preset and trigger to get the CSS. (Requires the ${appLink('pricing', 'Supericons Pro plan')})</li>
          <li>Keep the SVG inline in your markup.</li>
          <li>Replace <code>{{ICON_SELECTOR}}</code> in the returned CSS with the selector for your inline SVG when <code>selector_mode</code> is <code>placeholder</code>.</li>
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
        <h3>Selector fields in MCP responses</h3>
        <p class="docs-section__copy">The hosted CSS response is now explicit about how selector replacement works:</p>
        <ul>
          <li><code>selector_mode: "placeholder"</code>: The CSS contains <code>{{ICON_SELECTOR}}</code>. Replace it with your SVG&apos;s selector before applying the stylesheet.</li>
          <li><code>selector_mode: "literal"</code>: The CSS already contains your selector. Use it directly.</li>
          <li><code>selector_token</code>: The exact placeholder string in the returned CSS. Use it to locate and replace the token programmatically.</li>
          <li><code>selector_instructions</code>: Plain-language guidance on what selector format to use. This is especially helpful when an agent is handling the replacement step.</li>
        </ul>
        <div class="docs-code">
          <pre><code>.settings-button svg
#login-icon svg
.sidebar .nav-icon svg</code></pre>
        </div>
        <p class="docs-section__copy">Both <code>export_motion_css</code> and <code>animate_icon</code> can return CSS with these selector fields.</p>
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
        <p class="docs-section__copy">Self-contained animated SVGs work in current major browsers. When used as an <code>&lt;img&gt;</code> source, CSS animations play automatically. When pasted inline, hover and click triggers respond to pointer events normally.</p>
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
  'docs-motion-lab-mcp-workflow': {
    navLabel: 'MCP Workflow',
    kicker: 'Motion Lab',
    pageTitle: 'Motion Lab MCP Workflow',
    summary: 'A step-by-step workflow for using Motion Lab through MCP. Inspect presets, compare preset profiles, choose an output type, and export with full context before committing.',
    bodyHtml: `
      <section class="docs-section" id="motion-mcp-workflow-intro">
        <p class="docs-section__copy">Motion Lab through MCP is a complete icon animation workflow inside your coding agent: inspect presets, compare preset profiles, export CSS for inline SVG, get a self-contained animated SVG, or generate both in one call.</p>
      </section>
      <section class="docs-section" id="motion-mcp-workflow-mental-model">
        <h2 class="docs-section__title">Core mental model</h2>
        <p class="docs-section__copy">The local MCP layer handles preset discovery and request orchestration. Premium preset profiles, CSS render, animated SVG render, and bundled <code>animate_icon</code> output resolve through hosted Supericons functions using a short-lived session token.</p>
        <p class="docs-section__copy">That split is intentional. It keeps the local package lightweight for discovery while moving premium rendering logic behind the hosted path.</p>
      </section>
      <section class="docs-section" id="motion-mcp-workflow-order">
        <h2 class="docs-section__title">Recommended tool order</h2>
        <ol class="docs-list docs-list--numbered">
          <li>Call <code>list_motion_presets</code> to see what exists.</li>
          <li>Call <code>get_motion_recipe</code> on one or more candidates before committing.</li>
          <li>Choose the output type based on integration needs.</li>
          <li>Use <code>export_motion_css</code>, <code>export_animated_svg</code>, or <code>animate_icon</code>.</li>
        </ol>
        <p class="docs-section__copy">This reduces trial-and-error and makes the final choice easier to explain to teammates or future agents.</p>
      </section>
      <section class="docs-section" id="motion-mcp-workflow-tool-map">
        <h2 class="docs-section__title">When to use each tool</h2>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead>
              <tr>
                <th>Tool</th>
                <th>Use it when you want to...</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><code>list_motion_presets</code></td><td>browse preset IDs, labels, groups, descriptions, and supported triggers</td></tr>
              <tr><td><code>get_motion_recipe</code></td><td>understand how a preset behaves before exporting</td></tr>
              <tr><td><code>export_motion_css</code></td><td>keep your SVG inline and apply motion through CSS</td></tr>
              <tr><td><code>export_animated_svg</code></td><td>get one self-contained animated asset</td></tr>
              <tr><td><code>animate_icon</code></td><td>get the preset profile, CSS, and animated SVG in one call</td></tr>
            </tbody>
          </table>
        </div>
        <p class="docs-section__copy">For exact parameter tables and field names, keep ${docsLink('docs-mcp-motion', 'Motion Lab MCP Tools')} open as the strict reference page.</p>
      </section>
      <section class="docs-section" id="motion-mcp-workflow-human-vs-agent">
        <h2 class="docs-section__title">Human vs agent workflow</h2>
        <p class="docs-section__copy"><strong>Human developers</strong> should start from product intent: subtle hover, security feel, celebration, ambient motion, or no motion at all. Then use <code>get_motion_recipe</code> to confirm the fit before exporting.</p>
        <p class="docs-section__copy"><strong>AI agents</strong> should inspect presets, narrow candidates by UI context, compare preset profiles, justify the chosen preset, and only then export. A good agent should also explain why noisier presets were avoided.</p>
      </section>
      <section class="docs-callout" id="motion-mcp-workflow-no-motion">
        <h3>Sometimes the right answer is no motion</h3>
        <p>Accessibility-sensitive surfaces, calm admin panels, and trust-critical flows are usually better with no motion at all. If motion is required, choose the most restrained option available and be able to explain why it does not compete with the user&apos;s focus.</p>
      </section>
    `,
  },
  'docs-motion-lab-client-setup': {
    navLabel: 'Client Setup',
    kicker: 'Motion Lab',
    pageTitle: 'Motion Lab MCP Client Setup',
    summary: 'Connect Motion Lab to your MCP client, add your API key, and verify the hosted premium path is live. Includes setup examples for Cursor and Claude Desktop.',
    bodyHtml: `
      <section class="docs-section" id="motion-mcp-setup-prereqs">
        <h2 class="docs-section__title">What you need</h2>
        <ul>
          <li>Node.js 18 or later installed</li>
          <li>An API key from a Supericons account with the ${appLink('pricing', 'Supericons Pro plan')}</li>
          <li>An MCP client such as Cursor or Claude Desktop</li>
          <li>Permission to add an MCP server in that client&apos;s config</li>
        </ul>
      </section>
      <section class="docs-section" id="motion-mcp-setup-command">
        <h2 class="docs-section__title">Recommended server command</h2>
        <p class="docs-section__copy">Use the published MCP package. Set this as your <code>command</code> value in the MCP server config:</p>
        <div class="docs-code">
          <pre><code>npx -y @supericons/mcp@latest</code></pre>
        </div>
        <p class="docs-section__copy">If you are developing against a local checkout, keep the same env block but swap the command to <code>node</code> and point the arg at your own absolute path to <code>mcp/index.js</code>.</p>
      </section>
      <section class="docs-section" id="motion-mcp-setup-cursor">
        <h2 class="docs-section__title">Cursor setup example</h2>
        <p class="docs-section__copy">Add this MCP server block to your Cursor config and replace the API key value:</p>
        <div class="docs-code">
          <pre><code>{
  "mcpServers": {
    "supericons": {
      "command": "npx",
      "args": ["-y", "@supericons/mcp@latest"],
      "env": {
        "SUPERICONS_API_KEY": "si_your_pro_key_here"
      }
    }
  }
}</code></pre>
        </div>
      </section>
      <section class="docs-section" id="motion-mcp-setup-claude">
        <h2 class="docs-section__title">Claude Desktop setup example</h2>
        <p class="docs-section__copy">Claude Desktop uses the same JSON config format as Cursor. Open your Claude Desktop MCP settings file (<code>claude_desktop_config.json</code>), add the same server block, and replace the API key value:</p>
        <div class="docs-code">
          <pre><code>{
  "mcpServers": {
    "supericons": {
      "command": "npx",
      "args": ["-y", "@supericons/mcp@latest"],
      "env": {
        "SUPERICONS_API_KEY": "si_your_pro_key_here"
      }
    }
  }
}</code></pre>
        </div>
      </section>
      <section class="docs-section" id="motion-mcp-setup-verify">
        <h2 class="docs-section__title">Your first successful Motion Lab call</h2>
        <p class="docs-section__copy"><strong>What success looks like:</strong> <code>list_motion_presets</code> returns a preset array and <code>get_motion_recipe</code> returns a preset profile. That confirms the local MCP server and the hosted premium path are both live.</p>
        <p class="docs-section__copy">After restarting your client, confirm these tools appear:</p>
        <ul>
          <li><code>list_motion_presets</code></li>
          <li><code>get_motion_recipe</code></li>
          <li><code>export_motion_css</code></li>
          <li><code>export_animated_svg</code></li>
          <li><code>animate_icon</code></li>
        </ul>
        <p class="docs-section__copy">Then run this sequence:</p>
        <ol class="docs-list docs-list--numbered">
          <li><code>list_motion_presets</code></li>
          <li><code>get_motion_recipe</code> with preset <code>sweep</code>, trigger <code>hover</code>, duration <code>240</code>, intensity <code>100</code></li>
          <li><code>export_motion_css</code> or <code>animate_icon</code></li>
        </ol>
      </section>
      <section class="docs-callout" id="motion-mcp-setup-next">
        <h3>Need exact tool fields?</h3>
        <p>Open ${docsLink('docs-mcp-motion', 'Motion Lab MCP Tools')} for the full parameter and return-shape reference.</p>
      </section>
    `,
  },
  'docs-motion-lab-use-cases': {
    navLabel: 'Use Cases',
    kicker: 'Motion Lab',
    pageTitle: 'Motion Lab Use Cases',
    summary: 'Match presets to product context, not animation names. Each use case maps UI intent to recommended presets and what to avoid.',
    bodyHtml: `
      <section class="docs-section" id="motion-use-cases-intro">
        <p class="docs-section__copy">Start with the UI context, not the animation name. The best Motion Lab preset is the one that matches the moment in the product, the screen&apos;s tone, and the motion budget appropriate for that user.</p>
      </section>
      <section class="docs-section" id="motion-use-cases-table">
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead>
              <tr>
                <th>Context</th>
                <th>Likely presets</th>
                <th>What to avoid</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Professional dashboard hover</td><td><code>sweep</code>, <code>glide</code></td><td>playful or explosive motion that distracts from data</td></tr>
              <tr><td>Security or authentication</td><td><code>fingerprint</code>, <code>radar</code></td><td>celebratory or bouncy motion that weakens trust</td></tr>
              <tr><td>Success or celebration</td><td><code>sparkle</code>, <code>bloom</code></td><td>effects that feel childish if the tone is premium</td></tr>
              <tr><td>Ambient empty state</td><td><code>breathe</code>, <code>float</code></td><td>high-energy motion that becomes tiring over time</td></tr>
              <tr><td>Accessibility-sensitive settings panel</td><td>prefer no motion; otherwise choose the most restrained option</td><td>constant attention-seeking motion</td></tr>
            </tbody>
          </table>
        </div>
      </section>
      <section class="docs-section" id="motion-use-cases-output">
        <h2 class="docs-section__title">Choosing CSS vs animated SVG</h2>
        <p class="docs-section__copy">Choose <strong>Motion Lab CSS</strong> when your SVG is already inline in the DOM and you want to control markup placement yourself. Choose <strong>animated SVG</strong> when you want one self-contained output with fewer integration steps.</p>
        <p class="docs-section__copy">If the choice is still unclear, use ${docsLink('docs-motion-lab-mcp-workflow', 'MCP Workflow')} first, then use ${docsLink('docs-motion-lab-exports', 'Exports')} as the integration guide.</p>
      </section>
      <section class="docs-callout" id="motion-use-cases-restraint">
        <h3>Restraint is part of good motion design</h3>
        <p>The strongest Motion Lab decisions include recommending no animation at all when it would weaken clarity, trust, or calm. If motion is still needed, choose the most subtle option and be ready to explain why it earns its place.</p>
      </section>
    `,
  },
  'docs-converter-guide': {
    navLabel: 'Introduction',
    kicker: 'Converter',
    pageTitle: 'Converter Guide',
    summary: 'Convert PNG to SVG or SVG to PNG. Preview in the browser, then download with the Supericons Pro plan.',
    bodyHtml: `
      <section class="docs-section" id="converter-intro">
        <p class="docs-section__copy">Converter does two things: it traces flat PNG images into SVG files you can edit and scale, and it exports SVG artwork as PNG images at any size you choose. In the browser, you can preview both directions without a paid plan. Downloading the converted result requires the ${appLink('pricing', 'Supericons Pro plan')}.</p>
      </section>
      <section class="docs-section" id="converter-directions">
        <h2 class="docs-section__title">Choose the direction that matches your source file</h2>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead>
              <tr>
                <th>You have...</th>
                <th>You want...</th>
                <th>Open this guide</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>PNG artwork</td><td>A scalable SVG you can edit, ship, or refine further</td><td>${docsLink('docs-converter-png-to-svg', 'PNG to SVG')}</td></tr>
              <tr><td>SVG artwork</td><td>A raster PNG at a specific size or with a fixed background</td><td>${docsLink('docs-converter-svg-to-png', 'SVG to PNG')}</td></tr>
            </tbody>
          </table>
        </div>
      </section>
      <section class="docs-section" id="converter-best-fit">
        <h2 class="docs-section__title">What Converter is best at</h2>
        <ul>
          <li><strong>PNG to SVG</strong>: Best for logos, flat illustrations, marks, UI icons, and other clean artwork with limited colors.</li>
          <li><strong>SVG to PNG</strong>: Best when you already trust the SVG and just need a precise raster export for social, docs, email, app stores, or presentation decks.</li>
          <li><strong>Not ideal for tracing</strong>: Photographs, heavy gradients, textured fills, and noisy screenshots usually need manual cleanup after tracing or should stay raster.</li>
        </ul>
      </section>
      <section class="docs-section" id="converter-browser-vs-mcp">
        <h2 class="docs-section__title">Browser workflow vs MCP workflow</h2>
        <ul>
          <li><strong>In the browser</strong>: Fastest way to preview a conversion and visually judge whether the result is good enough.</li>
          <li><strong>Through MCP</strong>: Best when your agent needs structured output, repeatable settings, or conversion as part of a larger build workflow. Start with ${docsLink('docs-mcp-converter', 'Converter MCP Tools')} if you are wiring this into an agent flow.</li>
        </ul>
      </section>
      <section class="docs-callout" id="converter-expectations">
        <h3>Preview first, then decide if the output earns a download</h3>
        <p>The converter is strongest when it helps you make a quick quality judgment. If the preview already looks rough, choppy, or cluttered with noise, changing output format alone will not rescue the source art.</p>
      </section>
    `,
  },
  'docs-converter-png-to-svg': {
    navLabel: 'PNG to SVG',
    kicker: 'Converter',
    pageTitle: 'PNG to SVG',
    summary: 'Trace flat PNG artwork into SVG. Best for logos, marks, and icons with clean edges and limited color complexity.',
    bodyHtml: `
      <section class="docs-section" id="converter-png-svg-intro">
        <p class="docs-section__copy">PNG to SVG tracing, which means automatically converting pixels into scalable vector shapes, works best when the source image already behaves like vector art: sharp edges, simple fills, high contrast, and minimal background detail. Use it for logos, single-color marks, UI icons, and flat illustrations. Treat photographs and gradient-heavy artwork as exceptions, not defaults.</p>
      </section>
      <section class="docs-section" id="converter-png-svg-best-results">
        <h2 class="docs-section__title">How to get the cleanest trace</h2>
        <ul>
          <li>Start with the highest-quality PNG you have. Tiny, blurry, or compressed inputs lose edge definition before tracing even begins.</li>
          <li>Prefer flat shapes over gradients, shadows, and textures.</li>
          <li>Use artwork with clear foreground and background separation.</li>
          <li>If the original is already SVG somewhere in your pipeline, use that instead of tracing a PNG copy.</li>
        </ul>
      </section>
      <section class="docs-section" id="converter-png-svg-settings">
        <h2 class="docs-section__title">Which settings matter most</h2>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead>
              <tr>
                <th>Setting</th>
                <th>What it changes</th>
                <th>Good starting instinct</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><code>traceClass</code></td><td>Chooses the tracing profile for the kind of image you uploaded</td><td>Match it to the source: logo, small icon, single-color mark, or general color artwork</td></tr>
              <tr><td><code>qualityMode</code></td><td>Balances fidelity against file size and visual complexity</td><td>Start with <code>exact</code>; switch to <code>compact</code> only if the SVG is unnecessarily large</td></tr>
              <tr><td><code>uiMode</code></td><td>Tunes the output for icon-like geometry or logo-like shapes</td><td>Use <code>icon</code> for UI glyphs and <code>logo</code> for marks and wordmarks</td></tr>
              <tr><td><code>colorMode</code></td><td>Keeps the trace in color or forces a monochrome result</td><td>Use <code>mono</code> only when the artwork is intentionally single-color</td></tr>
            </tbody>
          </table>
        </div>
        <p class="docs-section__copy">For the full setting reference, open ${docsLink('docs-converter-settings', 'Converter Settings Reference')}. For agent-driven conversion, pair this with ${docsLink('docs-mcp-converter', 'Converter MCP Tools')}.</p>
      </section>
      <section class="docs-section" id="converter-png-svg-workflow">
        <h2 class="docs-section__title">Recommended workflow</h2>
        <ol>
          <li>Preview the PNG in the browser and decide whether the source looks traceable at all.</li>
          <li>Choose the closest tracing profile and start with <code>exact</code> quality.</li>
          <li>Review the SVG for jagged edges, bloated file size, or missing detail.</li>
          <li>Only then switch to <code>compact</code> or a different trace class if the first pass is too heavy or too loose.</li>
        </ol>
      </section>
      <section class="docs-callout" id="converter-png-svg-restraint">
        <h3>Do not force vectorization when the source is telling you no</h3>
        <p>If a preview already looks patchy, broken up, or missing fine detail, the better decision may be to keep the original as PNG or find the original SVG or design file instead of tracing harder.</p>
      </section>
    `,
  },
  'docs-converter-svg-to-png': {
    navLabel: 'SVG to PNG',
    kicker: 'Converter',
    pageTitle: 'SVG to PNG',
    summary: 'Render SVG into PNG at the size you need. Best when the source vector is already trustworthy and you need a raster export.',
    bodyHtml: `
      <section class="docs-section" id="converter-svg-png-intro">
        <p class="docs-section__copy">SVG to PNG is the simpler direction: you already have vector art, and Converter turns it into a crisp raster output at a specific width. Use this for social previews, docs, presentations, email, app listings, or anywhere you need a fixed image file instead of a live scalable SVG.</p>
      </section>
      <section class="docs-section" id="converter-svg-png-controls">
        <h2 class="docs-section__title">The two controls that matter</h2>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead>
              <tr>
                <th>Control</th>
                <th>What it does</th>
                <th>Guidance</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><code>targetWidth</code></td><td>Sets the PNG width in pixels</td><td>Choose the smallest width that still covers the real use case. Larger files are not automatically better.</td></tr>
              <tr><td><code>background</code></td><td>Sets a transparent or solid background behind the SVG</td><td>Use <code>transparent</code> when the PNG needs to sit on multiple surfaces. Use a fixed hex color when the target context already has a known background.</td></tr>
            </tbody>
          </table>
        </div>
      </section>
      <section class="docs-section" id="converter-svg-png-uses">
        <h2 class="docs-section__title">Common uses</h2>
        <ul>
          <li>Preparing a logo or icon for tools that do not accept SVG uploads.</li>
          <li>Generating a flat PNG for slide decks, documentation, or marketplace listings.</li>
          <li>Creating an exact raster export with a known background instead of relying on browser rendering differences.</li>
        </ul>
      </section>
      <section class="docs-section" id="converter-svg-png-quality">
        <h2 class="docs-section__title">Quality expectations</h2>
        <p class="docs-section__copy">The PNG can only be as good as the SVG you give it. If the source SVG has clipping issues, missing fills, or broken or incomplete code, the PNG will preserve those problems faithfully. Converter is rendering the file, not redesigning it.</p>
      </section>
      <section class="docs-callout" id="converter-svg-png-tip">
        <h3>Keep the output width intentional</h3>
        <p>Pick the width based on the real surface where the PNG will be used. Oversized exports increase file weight and can make teams think they solved quality when they only increased pixels.</p>
      </section>
    `,
  },
  'docs-converter-settings': {
    navLabel: 'Settings',
    kicker: 'Converter',
    pageTitle: 'Converter Settings Reference',
    summary: 'Reference for traceClass, qualityMode, and uiMode settings in the PNG to SVG converter.',
    bodyHtml: `
      <section class="docs-section" id="converter-settings-intro">
        <p class="docs-section__copy">These settings shape how PNG tracing behaves. Getting them right preserves clean edges and keeps the SVG to a manageable size. Getting them wrong can produce noisy paths, blurred or rounded shapes, or output that is technically complete but visually imprecise.</p>
      </section>
      <section class="docs-section" id="converter-settings-trace-class">
        <h2 class="docs-section__title"><code>traceClass</code>: choose the closest source profile</h2>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead>
              <tr>
                <th><code>traceClass</code></th>
                <th>Best for</th>
                <th>Avoid when</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><code>general-color</code></td><td>Most full-color artwork when you are unsure where to start</td><td>The source is clearly a tiny icon or single-color mark</td></tr>
              <tr><td><code>flat-logo-color</code></td><td>Logos with solid flat fills and simple separation between shapes</td><td>The artwork uses many gradients or photographic detail</td></tr>
              <tr><td><code>tile-icon-color</code></td><td>Small repeating tiles or small decorative color icons</td><td>The artwork is a free-form logo rather than a compact icon</td></tr>
              <tr><td><code>tiny-line-icon</code></td><td>Very small icons with fine strokes and UI-style geometry</td><td>The image is a broad logo or illustration with filled shapes</td></tr>
              <tr><td><code>single-color-mark</code></td><td>Single-color logos, wordmarks, and simple marks</td><td>The source needs multi-color separation</td></tr>
              <tr><td><code>mono-mask</code></td><td>High-contrast black-and-white artwork intended to stay monochrome</td><td>The design depends on color relationships</td></tr>
            </tbody>
          </table>
        </div>
      </section>
      <section class="docs-section" id="converter-settings-quality">
        <h2 class="docs-section__title"><code>qualityMode</code>: keep detail or simplify output</h2>
        <ul>
          <li><strong><code>exact</code></strong>: Best default. Keeps more path detail and usually gives the cleanest first pass.</li>
          <li><strong><code>compact</code></strong>: Simplifies paths and reduces file weight. Use it when the first pass is accurate but heavier than it needs to be.</li>
        </ul>
        <p class="docs-section__copy">Start with <code>exact</code>. Move to <code>compact</code> only after you have seen that the detailed trace is already faithful.</p>
      </section>
      <section class="docs-section" id="converter-settings-ui-mode">
        <h2 class="docs-section__title"><code>uiMode</code>: shape the output for icons or for logos</h2>
        <ul>
          <li><strong><code>logo</code></strong>: Better for free-form marks, curves, and wordmarks.</li>
          <li><strong><code>icon</code></strong>: Better for geometric UI icons where edge precision matters.</li>
        </ul>
      </section>
      <section class="docs-section" id="converter-settings-color-mode">
        <h2 class="docs-section__title"><code>colorMode</code>: preserve color or force a monochrome result</h2>
        <ul>
          <li><strong><code>color</code></strong>: Keeps color separation in the output and should be the default for most logos and illustrations.</li>
          <li><strong><code>mono</code></strong>: Collapses the result to monochrome. Use it only when the artwork is single-color, or when collapsing it to one color is the specific result you want.</li>
        </ul>
      </section>
      <section class="docs-section" id="converter-settings-starting-points">
        <h2 class="docs-section__title">Good starting points</h2>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead>
              <tr>
                <th>Source image</th>
                <th>Start with</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Flat logo</td><td><code>flat-logo-color</code>, <code>exact</code>, <code>logo</code>, <code>color</code></td></tr>
              <tr><td>Single-color wordmark</td><td><code>single-color-mark</code>, <code>exact</code>, <code>logo</code>, <code>mono</code> if the brand is truly one-color</td></tr>
              <tr><td>Small UI icon</td><td><code>tiny-line-icon</code>, <code>exact</code>, <code>icon</code>, usually <code>mono</code></td></tr>
              <tr><td>Multi-color illustration or artwork</td><td><code>general-color</code>, <code>exact</code>, <code>logo</code>, <code>color</code></td></tr>
            </tbody>
          </table>
        </div>
        <p class="docs-section__copy">If you are using MCP, ${docsLink('docs-mcp-converter', 'Converter MCP Tools')} exposes the same settings plus guidance and preflight inspection.</p>
      </section>
      <section class="docs-callout" id="converter-settings-callout">
        <h3>The best setting choice is the one that matches the source, not the one that sounds strongest</h3>
        <p>Most disappointing converter output comes from mismatching the source type. The tracer cannot invent clean vector structure that the source image does not already hint at.</p>
      </section>
    `,
  },
  'docs-access-api-keys': {
    navLabel: 'API Keys',
    kicker: 'Access and API Keys',
    pageTitle: 'API Keys',
    summary: 'Free MCP works without an API key. Add a key only when you need account access for purchases or Pro tools.',
    bodyHtml: `
      <section class="docs-section" id="access-api-keys-intro">
        <h2 class="docs-section__title">Start free without a key</h2>
        <p class="docs-section__copy">You do not need an API key to search, preview, retrieve, or list free icons through local or hosted MCP. Add a key only when a supported tool needs access tied to your Supericons account.</p>
      </section>
      <section class="docs-callout" id="access-api-keys-reassurance">
        <h3>A key identifies your account</h3>
        <p>It does not upgrade your account or unlock anything you have not bought. There is not a separate Pro key or pack key.</p>
      </section>
      <section class="docs-section" id="access-api-keys-does">
        <h2 class="docs-section__title">What an API key does</h2>
        <ul>
          <li>Signs your app or MCP client into your Supericons account.</li>
          <li>Lets Supericons check which icons and tools that account can use.</li>
          <li>Connects supported paid and account-bound workflows to that access.</li>
        </ul>
      </section>
      <section class="docs-section" id="access-api-keys-does-not">
        <h2 class="docs-section__title">What an API key does not do</h2>
        <ul>
          <li>It does not upgrade your account by itself.</li>
          <li>It does not turn bought packs into Motion Lab or Converter access.</li>
          <li>It does not change what your account has already bought or subscribed to.</li>
        </ul>
      </section>
      <section class="docs-section" id="access-api-keys-when">
        <h2 class="docs-section__title">When you need one</h2>
        <div class="docs-grid docs-grid--cards">
          <article class="docs-card">
            <h3>Free MCP tools</h3>
            <p>No key is needed to search, preview, retrieve, or list free icons through Claude Code, Codex, Cursor, or another MCP client.</p>
          </article>
          <article class="docs-card">
            <h3>Purchased and Pro access</h3>
            <p>Add <code>SUPERICONS_API_KEY</code> when a supported MCP tool needs a purchased pack or a Pro feature such as Motion Lab or Converter.</p>
          </article>
        </div>
        <p class="docs-section__copy">Today, API keys are available to accounts with an active Pro subscription or at least one pack purchase.</p>
      </section>
      <section class="docs-section" id="access-api-keys-account-bridge">
        <p class="docs-section__copy">What your account can access depends on what you have bought or subscribed to. See ${docsLink('docs-access-premium', 'Pro and Collections')} for a clear breakdown.</p>
      </section>
      <section class="docs-section" id="access-api-keys-next">
        <h2 class="docs-section__title">Next steps</h2>
        <div class="docs-grid docs-grid--cards">
          <article class="docs-card">
            <div class="docs-card__head">
              <h3>Open API Keys</h3>
              <a class="docs-btn docs-btn--ghost" href="/?view=api-keys" data-docs-view="api-keys">Open page</a>
            </div>
            <p>If your account is eligible, generate or manage the key you use for account-bound access.</p>
          </article>
          <article class="docs-card">
            <div class="docs-card__head">
              <h3>Read Quickstart</h3>
              <a class="docs-btn docs-btn--ghost" href="${docsHref('docs-quickstart')}" data-docs-view="docs-quickstart">Open guide</a>
            </div>
            <p>Set up keyless free MCP first. Add <code>SUPERICONS_API_KEY</code> later only if you need account-bound tools.</p>
          </article>
          <article class="docs-card">
            <div class="docs-card__head">
              <h3>View Pricing</h3>
              <a class="docs-btn docs-btn--ghost" href="/?view=pricing" data-docs-view="pricing">See plans</a>
            </div>
            <p>Check whether you need the ${appLink('pricing', 'Supericons Pro plan')} for Motion Lab or Converter.</p>
          </article>
        </div>
      </section>
    `,
  },
  'docs-access-premium': {
    navLabel: 'Pro and Collections',
    kicker: 'Access and API Keys',
    pageTitle: 'Pro and Collections',
    summary: 'Buying packs gives you those icons. Motion Lab and Converter are part of the Supericons Pro plan.',
    bodyHtml: `
      <section class="docs-section" id="access-premium-intro">
        <h2 class="docs-section__title">Two different access paths</h2>
        <p class="docs-section__copy">Buying packs gives you the premium icons in those packs. Motion Lab and Converter are separate features in the ${appLink('pricing', 'Supericons Pro plan')}. You can have one without the other.</p>
      </section>
      <section class="docs-callout" id="access-premium-clarify">
        <h3>Why this can feel confusing</h3>
        <p>Icon access and tool access are different. If you bought a pack and can already use those premium icons, that is expected. Motion Lab and Converter are separate features and stay locked until the account has the ${appLink('pricing', 'Supericons Pro plan')}.</p>
      </section>
      <section class="docs-section" id="access-premium-packs">
        <h2 class="docs-section__title">What bought packs give you</h2>
        <ul>
          <li>The premium icons in the packs or collections you bought.</li>
          <li>That same icon access when you use an API key from the same account.</li>
        </ul>
        <p class="docs-section__copy">Pack purchases do not include Motion Lab or Converter. Those tools are part of the ${appLink('pricing', 'Supericons Pro plan')}.</p>
      </section>
      <section class="docs-section" id="access-premium-pro">
        <h2 class="docs-section__title">What the Supericons Pro plan gives you</h2>
        <ul>
          <li>Motion Lab in the browser and through MCP.</li>
          <li>Converter in the browser and through MCP.</li>
          <li>The browser export paths and agent tools for those workflows.</li>
        </ul>
      </section>
      <section class="docs-section" id="access-premium-examples">
        <h2 class="docs-section__title">Quick examples</h2>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead>
              <tr><th>Situation</th><th>What works</th></tr>
            </thead>
            <tbody>
              <tr><td>I bought a premium pack, but I do not have the Supericons Pro plan.</td><td>I can use the premium icons in that pack, but Motion Lab and Converter stay locked.</td></tr>
              <tr><td>I have the Supericons Pro plan.</td><td>I can use Motion Lab and Converter. If I have also bought packs, those icon collections work too.</td></tr>
              <tr><td>I use an API key from my account.</td><td>The key uses whatever that account already has: bought packs, the Supericons Pro plan, or both.</td></tr>
            </tbody>
          </table>
        </div>
      </section>
      <section class="docs-section" id="access-premium-next">
        <h2 class="docs-section__title">Next steps</h2>
        <div class="docs-grid docs-grid--cards">
          <article class="docs-card">
            <div class="docs-card__head">
              <h3>View Pricing</h3>
              <a class="docs-btn docs-btn--ghost" href="/?view=pricing" data-docs-view="pricing">See plans</a>
            </div>
            <p>Check whether you need the ${appLink('pricing', 'Supericons Pro plan')} for Motion Lab or Converter.</p>
          </article>
          <article class="docs-card">
            <div class="docs-card__head">
              <h3>Open API Keys</h3>
              <a class="docs-btn docs-btn--ghost" href="/?view=api-keys" data-docs-view="api-keys">Open page</a>
            </div>
            <p>Use an API key from the same account that owns your packs or subscription.</p>
          </article>
          <article class="docs-card">
            <div class="docs-card__head">
              <h3>Go to Motion Lab</h3>
              <a class="docs-btn docs-btn--ghost" href="${docsHref('docs-motion-lab')}" data-docs-view="docs-motion-lab">Open guide</a>
            </div>
            <p>Learn what Motion Lab does before you decide whether you need the plan.</p>
          </article>
          <article class="docs-card">
            <div class="docs-card__head">
              <h3>Go to Converter</h3>
              <a class="docs-btn docs-btn--ghost" href="${docsHref('docs-converter-guide')}" data-docs-view="docs-converter-guide">Open guide</a>
            </div>
            <p>See what Converter does in the browser and through MCP.</p>
          </article>
        </div>
      </section>
    `,
  },
  'docs-troubleshooting': {
    navLabel: 'Troubleshooting',
    kicker: 'Support',
    pageTitle: 'Troubleshooting',
    summary: 'Fix common problems with MCP setup, API keys, Motion Lab, and Converter.',
    bodyHtml: `
      <section class="docs-section" id="troubleshooting-setup">
        <h2 class="docs-section__title">MCP setup</h2>
        <div class="docs-grid docs-grid--cards">
          <article class="docs-card">
            <h3>Server does not appear after adding</h3>
            <p>In Claude Code or Codex, type <code>/mcp</code> to list active servers. In Cursor, open MCP settings in the sidebar and confirm <code>supericons</code> appears there. If it is missing, restart the client, then confirm your config file is in the correct location for your client and scope.</p>
          </article>
          <article class="docs-card">
            <h3>Not sure which config file to edit</h3>
            <p>Check the table below for the right file path. If the server is in the wrong file, move it, save the file, and restart the client.</p>
          </article>
          <article class="docs-card">
            <h3><code>npx</code> takes a long time on first run</h3>
            <p>The first time you run <code>npx -y @supericons/mcp@latest</code>, npm downloads the package. Subsequent starts are faster. This one-time delay is normal.</p>
          </article>
        </div>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead>
              <tr><th>Client</th><th>Scope</th><th>Path</th></tr>
            </thead>
            <tbody>
              <tr><td>Claude Code</td><td>User</td><td><code>~/.claude.json</code></td></tr>
              <tr><td>Claude Code</td><td>Project</td><td><code>.mcp.json</code> (project root)</td></tr>
              <tr><td>Codex</td><td>User</td><td><code>~/.codex/config.toml</code></td></tr>
              <tr><td>Codex</td><td>Project</td><td><code>.codex/config.toml</code> (project root)</td></tr>
              <tr><td>Cursor</td><td>Global</td><td><code>~/.cursor/mcp.json</code></td></tr>
              <tr><td>Cursor</td><td>Project</td><td><code>.cursor/mcp.json</code> (project root)</td></tr>
            </tbody>
          </table>
        </div>
        <p class="docs-section__copy">For client-specific setup details, see ${docsLink('docs-claude-code', 'Claude Code')}, ${docsLink('docs-codex', 'Codex')}, or ${docsLink('docs-cursor', 'Cursor')}.</p>
      </section>
      <section class="docs-section" id="troubleshooting-access">
        <h2 class="docs-section__title">Access and API keys</h2>
        <p class="docs-section__copy">Free icon search does not need an API key. If free search fails, check the MCP server setup above. Use the checks below only for purchased or Pro access.</p>
        <div class="docs-grid docs-grid--cards">
          <article class="docs-card">
            <h3>Purchased or Pro features are not available</h3>
            <p>Confirm all four:</p>
            <ol>
              <li>You are using an API key from the correct Supericons account.</li>
              <li><code>SUPERICONS_API_KEY</code> is present in the server <code>env</code> block.</li>
              <li>You restarted the client after editing the config.</li>
              <li>Your account has the access you are trying to use.</li>
            </ol>
          </article>
          <article class="docs-card">
            <h3>API key is invalid or revoked</h3>
            <p>Generate a new key under ${appLink('api-keys', 'API Keys')}, update your config, and restart the client.</p>
          </article>
          <article class="docs-card">
            <h3>Premium icons appear but a tool is still locked</h3>
            <p>Your account has icon access from a purchased pack, but does not have the ${appLink('pricing', 'Supericons Pro plan')}. Motion Lab and Converter are separate features in the plan. See ${appLink('pricing', 'Pricing')} if you need it.</p>
          </article>
        </div>
        <p class="docs-section__copy">For the full access breakdown, see ${docsLink('docs-access-api-keys', 'API Keys')} for how the key identifies your account, and ${docsLink('docs-access-premium', 'Pro and Collections')} for the difference between bought packs and the plan.</p>
      </section>
      <section class="docs-section" id="troubleshooting-motion-lab">
        <h2 class="docs-section__title">Motion Lab</h2>
        <div class="docs-grid docs-grid--cards">
          <article class="docs-card">
            <h3>Motion Lab tools return an access error</h3>
            <p>Motion Lab is part of the ${appLink('pricing', 'Supericons Pro plan')}. Confirm two things: your API key is present in the server <code>env</code> block, and the Supericons account that key belongs to has the plan. Restart the client after any config change.</p>
          </article>
          <article class="docs-card">
            <h3>Animated SVG does not animate in an <code>&lt;img&gt;</code> tag</h3>
            <p>Self-contained animated SVGs work in current major browsers, but some older browsers and webviews block animation in externally loaded SVGs. If your target environment does not animate the file reliably, paste the SVG inline instead.</p>
          </article>
          <article class="docs-card">
            <h3>The wrong preset is animating</h3>
            <p>Confirm the <code>preset</code> parameter matches a valid preset ID exactly. Preset IDs are case-sensitive and use camelCase for multi-word presets, for example <code>magneticIn</code>, not <code>magnetic-in</code> or <code>MagneticIn</code>. Call <code>list_motion_presets</code> to see the valid IDs.</p>
          </article>
        </div>
        <p class="docs-section__copy">For more Motion Lab detail, see ${docsLink('docs-motion-lab', 'Motion Lab')} and ${docsLink('docs-motion-lab-exports', 'Motion Lab Exports')}.</p>
      </section>
      <section class="docs-section" id="troubleshooting-converter">
        <h2 class="docs-section__title">Converter</h2>
        <div class="docs-grid docs-grid--cards">
          <article class="docs-card">
            <h3>PNG-to-SVG output is imprecise or has too many paths</h3>
            <p>The source image likely has gradients, shadows, or photographic detail that does not trace cleanly. Try a more specific <code>traceClass</code>, or switch <code>qualityMode</code> to <code>compact</code> to simplify the output.</p>
          </article>
          <article class="docs-card">
            <h3>Not sure which <code>traceClass</code> to use</h3>
            <p>Call <code>inspect_converter_options</code> for guided recommendations, or refer to ${docsLink('docs-converter-settings', 'Converter Settings')} for the trace class reference.</p>
          </article>
          <article class="docs-card">
            <h3>SVG-to-PNG output is wrong size</h3>
            <p>The <code>targetWidth</code> parameter sets the output pixel width. Height scales proportionally from the SVG <code>viewBox</code>. If the PNG is too small, increase <code>targetWidth</code>. If it is larger than you need, reduce it. Larger files are not automatically better quality.</p>
          </article>
        </div>
        <p class="docs-section__copy">For full converter guidance, see ${docsLink('docs-converter-guide', 'Converter')} for workflow help and ${docsLink('docs-converter-settings', 'Converter Settings')} for parameter detail.</p>
      </section>
      <section class="docs-callout" id="troubleshooting-contact">
        <h3>Your problem is still not listed</h3>
        <p>Open the <a href="#" data-open-contact="true">contact form</a> or email <a href="mailto:hello@supericons.dev">hello@supericons.dev</a>.</p>
      </section>
    `,
  },
};

export const DOCS_PAGE_GROUPS = docsPageGroups;
export const DOCS_PAGES = docsPages;
export const DOCS_PAGE_ORDER = Object.keys(docsPages);
export const DOCS_PAGE_VIEWS = new Set(DOCS_PAGE_ORDER);

export function getDocsPageConfig(view) {
  return docsPages[view] || docsPages.docs;
}
