import assert from 'node:assert/strict';

import { getDocsGuideConfig } from '../lib/docs-guide-config.js';
import {
  renderDocsArticleMarkup,
  renderDocsSiteShellMarkup,
} from '../lib/docs-site-render.js';

assert.equal(getDocsGuideConfig('docs-codex').title, 'Set up Supericons MCP in Codex');
assert.equal(getDocsGuideConfig('docs-claude-code').eyebrow, 'Claude Code');
assert.equal(getDocsGuideConfig('docs-unknown'), null);

const shellMarkup = renderDocsSiteShellMarkup('docs-mcp-tools');
assert.match(shellMarkup, /docsSidebarNav/);
assert.match(shellMarkup, /data-docs-view="docs-mcp-tools"/);

const articleMarkup = renderDocsArticleMarkup('docs-mcp-tools');
assert.match(articleMarkup, /search_icons/);
assert.match(articleMarkup, /docs-shell__pager/);

console.log('verify-docs-site-render: ok');
