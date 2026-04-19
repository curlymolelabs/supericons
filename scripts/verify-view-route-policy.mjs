import assert from 'node:assert/strict';

import {
  buildRouteUrl,
  getRouteMeta,
  normalizeRouteView,
  shouldPersistRouteView,
} from '../lib/view-route-policy.js';

assert.equal(normalizeRouteView('mcp'), 'docs');
assert.equal(normalizeRouteView('packs'), 'packs');
assert.equal(normalizeRouteView('unknown-view'), 'icons');

assert.equal(shouldPersistRouteView('packs'), true);
assert.equal(shouldPersistRouteView('pricing'), true);
assert.equal(shouldPersistRouteView('docs-mcp-tools'), true);
assert.equal(shouldPersistRouteView('collection-detail'), false);

assert.equal(getRouteMeta('converter').panelSuppressed, true);
assert.equal(getRouteMeta('packs').storeShell, true);
assert.equal(getRouteMeta('icons').storeShell, false);

assert.equal(
  buildRouteUrl({ pathname: '/', view: 'pricing', hash: '' }),
  '/?view=pricing',
);

assert.equal(
  buildRouteUrl({ pathname: '/', view: 'docs-mcp-tools', hash: '#icon-tools-search' }),
  '/?view=docs-mcp-tools#icon-tools-search',
);

console.log('verify-view-route-policy: ok');
