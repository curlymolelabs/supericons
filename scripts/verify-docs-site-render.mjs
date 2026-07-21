import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getDocsGuideConfig } from '../lib/docs-guide-config.js';
import {
  renderDocsArticleMarkup,
  renderDocsSidebar,
  renderDocsSiteShellMarkup,
} from '../lib/docs-site-render.js';
import { createTranslator } from '../lib/i18n/translate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

async function readCatalog(locale) {
  return JSON.parse(await fs.readFile(path.join(rootDir, 'data', 'i18n', 'messages', `${locale}.json`), 'utf8'));
}

const catalogs = {
  en: await readCatalog('en'),
  'zh-Hans': await readCatalog('zh-Hans'),
};

function setRuntimeLocale(locale) {
  globalThis.__supericons = {
    getActiveLocale: () => locale,
    t: createTranslator(catalogs, locale),
  };
}

assert.equal(getDocsGuideConfig('docs-codex').title, 'Set up Supericons MCP in Codex');
assert.equal(getDocsGuideConfig('docs-claude-code').eyebrow, 'Claude Code');
assert.equal(getDocsGuideConfig('docs-unknown'), null);

setRuntimeLocale('en');
const shellMarkup = renderDocsSiteShellMarkup('docs-mcp-tools');
assert.match(shellMarkup, /docsSidebarNav/);
assert.match(shellMarkup, /data-docs-view="docs-mcp-tools"/);

const articleMarkup = renderDocsArticleMarkup('docs-mcp-tools');
assert.match(articleMarkup, /search_icons/);
assert.match(articleMarkup, /docs-shell__pager/);

const universalMarkup = renderDocsArticleMarkup('docs-mcp-universal');
assert.doesNotMatch(universalMarkup, /Video guide coming here/);
assert.match(universalMarkup, /Quick setup videos/);
assert.match(universalMarkup, /data-setup-video/);
assert.match(universalMarkup, /\/videos\/mcp-setup\/hosted-claude-desktop\.mp4/);
assert.match(universalMarkup, /\/videos\/mcp-setup\/local-cursor-ide\.mp4/);
assert.match(universalMarkup, /\/videos\/mcp-setup\/local-codex-desktop\.mp4/);
assert.match(universalMarkup, /Quick local setup/);
assert.match(universalMarkup, /docs-universal-cli-command/);
assert.match(universalMarkup, /npx -y @supericons\/mcp@latest/);
assert.match(universalMarkup, /Choose your setup/);
assert.match(universalMarkup, /Hosted setup/);
assert.match(universalMarkup, /Local setup/);
assert.match(universalMarkup, /Premium\/Pro setup/);
assert.match(universalMarkup, /href="#universal-premium"/);
assert.match(universalMarkup, /Step 1: Add the MCP server/);
assert.match(universalMarkup, /docs-universal-hosted-url/);
assert.match(universalMarkup, /https:\/\/mcp\.supericons\.dev\/mcp/);
assert.match(universalMarkup, /Authentication for free icon tools/);
assert.match(universalMarkup, /docs-universal-field-name/);
assert.match(universalMarkup, /docs-universal-field-command/);
assert.match(universalMarkup, /docs-universal-field-arg-y/);
assert.match(universalMarkup, /docs-universal-field-arg-package/);
assert.match(universalMarkup, /Environment variables for free setup/);
assert.match(universalMarkup, /Free hosted setup/);
assert.match(universalMarkup, /Free local config-file setup/);
assert.match(universalMarkup, /Step 2 for Premium\/Pro: Add your API key/);
assert.match(universalMarkup, /docs-universal-premium-env-key/);
assert.match(universalMarkup, /Keep your key private/);
assert.match(universalMarkup, /Use Supericons MCP to search for a database icon/);

for (const video of [
  'hosted-claude-desktop.mp4',
  'local-cursor-ide.mp4',
  'local-codex-desktop.mp4',
]) {
  const stats = await fs.stat(path.join(rootDir, 'public', 'videos', 'mcp-setup', video));
  assert.ok(stats.size > 1_000_000, `${video} must be a real video asset`);
}

setRuntimeLocale('zh-Hans');
const localizedSidebar = renderDocsSidebar('docs-mcp-tools');
assert.ok(localizedSidebar.includes('\u901a\u7528\u8bbe\u7f6e'));
assert.ok(localizedSidebar.includes('\u641c\u7d22\u6307\u5357'));
assert.doesNotMatch(localizedSidebar, />Quickstart</);

const storeSource = await fs.readFile(path.join(rootDir, 'store.js'), 'utf8');
assert.match(storeSource, /function refreshDocsSiteShellLocale/);
assert.match(storeSource, /renderDocsSidebar\(view\)/);

console.log('verify-docs-site-render: ok');
