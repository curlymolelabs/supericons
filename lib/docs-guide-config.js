import { PRODUCT_FACT_LABELS } from './product-facts.js';

const { freeResultsLabel, freeIconsLabel } = PRODUCT_FACT_LABELS;

const GUIDE_CONFIGS = Object.freeze({
  'docs-claude-code': {
    eyebrow: 'Claude Code',
    title: 'Set up Supericons MCP in Claude Code',
    heroCopy: 'Add icon search and SVG retrieval to Claude Code without leaving the command line. Search, pick, and insert icons in the same session as your code edits.',
    snippets: [
      {
        id: 'claude-config',
        label: 'Copy',
        code: `# macOS / Linux
claude mcp add supericons -- npx -y supericons-mcp

# Windows
claude mcp add supericons -- cmd /c npx -y supericons-mcp`,
      },
    ],
    heroNote: 'Prefer JSON config over CLI? Use the same <code>command</code> and <code>args</code> values. Claude Code stores your own MCP servers in <code>~/.claude.json</code>, and shared project MCP servers in <code>.mcp.json</code> at the project root.',
    flowCards: [
      {
        title: '1. Add the server',
        copy: 'Run the Claude CLI command above to register the local <code>supericons</code> MCP server.',
      },
      {
        title: '2. Confirm Claude can see it',
        copy: 'Run <code>claude mcp list</code> to verify the server registered, or restart the session if it is not listed.',
      },
      {
        title: '3. Verify with a search',
        copy: 'Ask Claude Code to find an icon (e.g., a settings or navigation icon) and verify that the results include Lucide or Tabler options.',
      },
      {
        title: '4. Pull SVG into code',
        copy: 'Once the search result looks right, ask Claude Code to insert the SVG directly into your component or markup.',
      },
    ],
    exampleCode: `Find a settings icon from Lucide for a dashboard header.
Return two alternatives from Tabler as well.
Then insert the chosen SVG into my React component.`,
    premiumCards: [
      {
        title: 'How premium access works',
        copy: 'Premium icons are not unlocked simply by adding a key. They unlock when your Supericons account has an active <a href="/?view=pricing" data-docs-view="pricing">Pro subscription or purchased collection</a>, and <code>SUPERICONS_API_KEY</code> is present in the MCP server config Claude Code uses at startup.',
      },
      {
        title: 'What to do',
        copy: 'Sign in to Supericons, generate an API key from the <a href="/?view=api-keys" data-docs-view="api-keys">API Keys</a> page, then add that key in the env or secrets field Claude Code uses for MCP server configuration.',
      },
    ],
    troubleshootingCards: [
      {
        title: 'Server does not appear',
        copy: 'Run <code>claude mcp list</code> after adding the server. If it still does not appear, restart the Claude Code session.',
      },
      {
        title: 'Windows cannot launch <code>npx</code>',
        copy: 'On native Windows, use <code>cmd /c npx -y supericons-mcp</code> instead of calling <code>npx</code> directly.',
      },
      {
        title: 'Premium icons are missing',
        copy: 'Free icons work without a Pro subscription. Premium collections require an active <a href="/?view=pricing" data-docs-view="pricing">Pro subscription or purchased collection</a> on your Supericons account, plus a valid <code>SUPERICONS_API_KEY</code> in your MCP server config.',
      },
    ],
    relatedGuides: [
      { href: '/?view=docs', view: 'docs', label: 'Docs' },
      { href: '/?view=docs-codex', view: 'docs-codex', label: 'Codex setup' },
      { href: '/?view=docs-cursor', view: 'docs-cursor', label: 'Cursor setup' },
    ],
  },
  'docs-codex': {
    eyebrow: 'Codex',
    title: 'Set up Supericons MCP in Codex',
    heroCopy: 'Add icon search to your Codex session. Find and insert icons without switching to a browser - search, pick, and drop SVGs in the same coding flow as your edits.',
    snippets: [
      {
        id: 'codex-config',
        label: 'Copy',
        code: 'codex mcp add supericons -- npx -y supericons-mcp',
      },
      {
        id: 'codex-config-toml',
        label: 'Copy',
        code: `[mcp_servers.supericons]
command = "npx"
args = ["-y", "supericons-mcp"]`,
      },
    ],
    heroNote: 'MCP is supported in the Codex CLI and IDE extension. The CLI command is the quickest path. Prefer a config file? Add the same values to <code>~/.codex/config.toml</code> under <code>[mcp_servers.supericons]</code>.',
    flowCards: [
      {
        title: '1. Register the MCP server',
        copy: 'Run <code>codex mcp add supericons -- npx -y supericons-mcp</code> or add the same values to <code>config.toml</code>.',
      },
      {
        title: '2. Confirm Codex can see it',
        copy: 'Open Codex and use <code>/mcp</code> to confirm the server is active before you rely on icon tool calls.',
      },
      {
        title: '3. Try a narrow prompt',
        copy: 'Start with a concrete request like a navigation, auth, or dashboard icon so you can verify the flow quickly.',
      },
      {
        title: '4. Insert the SVG',
        copy: 'After selecting an icon, ask Codex to place the SVG inside your component or template file directly.',
      },
    ],
    exampleCode: `Search Supericons for a secure login icon.
Show me a Lucide option and a Tabler option.
Insert the Lucide SVG into the sign-in button component.`,
    premiumCards: [
      {
        title: 'Your account comes first',
        copy: 'Your API key authenticates to your Supericons account. The collections and tools you can access depend on what your account owns - either a <a href="/?view=pricing" data-docs-view="pricing">Pro subscription or purchased collection packs</a>. The key alone does not grant access.',
      },
      {
        title: 'How to add your API key in Codex',
        copy: 'Generate the key in <a href="/?view=api-keys" data-docs-view="api-keys">API Keys</a>, then add <code>SUPERICONS_API_KEY</code> to the env or secrets field your Codex MCP config uses for the <code>supericons-mcp</code> server.',
      },
    ],
    troubleshootingCards: [
      {
        title: 'Server saved but not visible in Codex',
        copy: 'Use <code>/mcp</code> in Codex to inspect active servers and restart the session after changing MCP config.',
      },
      {
        title: 'The <code>npx</code> command does not run',
        copy: 'Ensure <code>npx</code> is available in the shell environment that Codex uses for local MCP processes.',
      },
      {
        title: 'Premium icons do not appear',
        copy: `Free icons still return ${freeResultsLabel} without a Pro subscription. Premium icon access requires an active <a href="/?view=pricing" data-docs-view="pricing">Pro subscription or purchased collection</a> on your Supericons account, plus a valid <code>SUPERICONS_API_KEY</code>.`,
      },
    ],
    relatedGuides: [
      { href: '/?view=docs', view: 'docs', label: 'Docs' },
      { href: '/?view=docs-claude-code', view: 'docs-claude-code', label: 'Claude Code setup' },
      { href: '/?view=docs-cursor', view: 'docs-cursor', label: 'Cursor setup' },
    ],
  },
  'docs-cursor': {
    eyebrow: 'Cursor',
    title: 'Set up Supericons MCP in Cursor',
    heroCopy: 'Add icon search and SVG retrieval to Cursor. Find and insert icons without leaving the editor - in the same session as your code edits and component builds.',
    snippets: [
      {
        id: 'cursor-config',
        label: 'Copy',
        code: `{
  "mcpServers": {
    "supericons": {
      "command": "npx",
      "args": ["-y", "supericons-mcp"]
    }
  }
}`,
      },
    ],
    flowCards: [
      {
        title: '1. Add the MCP entry',
        copy: 'Open Cursor settings, navigate to MCP, and paste the server config. For a global setup, add it to <code>~/.cursor/mcp.json</code>. For a project-specific setup, use <code>.cursor/mcp.json</code> in the project root.',
      },
      {
        title: '2. Reload MCP servers',
        copy: 'Save and reload. Verify the <code>supericons</code> server appears in Cursor\'s MCP tool list before continuing.',
      },
      {
        title: '3. Test with a UI prompt',
        copy: 'Ask Cursor to search for a concrete icon use case like auth, charts, or navigation to validate the setup.',
      },
      {
        title: '4. Apply the result in code',
        copy: 'Once the icon is selected, have Cursor insert the SVG directly into the file it is already editing.',
      },
    ],
    exampleCode: `Find an icon for a dashboard analytics tab.
Return one Lucide option and one Phosphor option.
Then replace the placeholder SVG in my sidebar component.`,
    premiumCards: [
      {
        title: 'What you need for premium access',
        copy: 'Premium MCP access requires an active <a href="/?view=pricing" data-docs-view="pricing">Pro subscription or purchased collection</a> on your Supericons account, plus a valid <code>SUPERICONS_API_KEY</code> in your Cursor MCP server config.',
      },
      {
        title: 'What to do first',
        copy: 'Generate the key in <a href="/?view=api-keys" data-docs-view="api-keys">API Keys</a>, add it to the env or secrets field Cursor uses for the <code>supericons</code> server, then reload MCP servers.',
      },
    ],
    troubleshootingCards: [
      {
        title: 'Cursor cannot see the server',
        copy: 'Reload Cursor\'s MCP config after saving. Most issues here come from a stale server registry rather than a bad config block.',
      },
      {
        title: '<code>npx</code> is not found or fails to start',
        copy: 'Make sure Node.js and <code>npx</code> are available to the shell environment Cursor launches for MCP tools.',
      },
      {
        title: 'Premium collections are missing',
        copy: `Cursor can still use the free ${freeIconsLabel} without a Pro subscription. Premium results require an active <a href="/?view=pricing" data-docs-view="pricing">Pro subscription or purchased collection</a> on your Supericons account, plus a valid <code>SUPERICONS_API_KEY</code>.`,
      },
    ],
    relatedGuides: [
      { href: '/?view=docs', view: 'docs', label: 'Docs' },
      { href: '/?view=docs-claude-code', view: 'docs-claude-code', label: 'Claude Code setup' },
      { href: '/?view=docs-codex', view: 'docs-codex', label: 'Codex setup' },
    ],
  },
});

export function getDocsGuideConfig(view) {
  return GUIDE_CONFIGS[view] || null;
}
