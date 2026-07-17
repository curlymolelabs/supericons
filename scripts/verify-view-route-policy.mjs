import assert from 'node:assert/strict';

import {
  buildRouteUrl,
  getRouteMeta,
  getRouteViewFromPath,
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
assert.equal(getRouteViewFromPath('/terms/'), 'terms');
assert.equal(getRouteViewFromPath('/privacy/'), 'privacy');
assert.equal(getRouteViewFromPath('/legal/supericons-single-icon-license'), null);

assert.equal(
  buildRouteUrl({ pathname: '/', view: 'pricing', hash: '' }),
  '/?view=pricing',
);

assert.equal(
  buildRouteUrl({ pathname: '/', view: 'pricing', search: '?locale=ja', hash: '' }),
  '/?locale=ja&view=pricing',
);

assert.equal(
  buildRouteUrl({ pathname: '/', view: 'icons', search: '?locale=ar&view=pricing', hash: '' }),
  '/?locale=ar',
);

assert.equal(
  buildRouteUrl({ pathname: '/', view: 'icons', search: '?view=icons&preview=mcp&q=xai&library=si&limit=3', hash: '' }),
  '/?view=icons&preview=mcp&q=xai&library=si&limit=3',
);

assert.equal(
  buildRouteUrl({ pathname: '/', view: 'icons', search: '?view=pricing&preview=mcp&q=xai', hash: '' }),
  '/?preview=mcp&q=xai',
);

assert.equal(
  buildRouteUrl({ pathname: '/', view: 'docs-mcp-tools', hash: '#icon-tools-search' }),
  '/?view=docs-mcp-tools#icon-tools-search',
);

assert.equal(
  buildRouteUrl({ pathname: '/', view: 'terms', hash: '#single-icon-license' }),
  '/terms/#single-icon-license',
);

assert.equal(
  buildRouteUrl({ pathname: '/terms/', view: 'privacy', search: '?locale=ja', hash: '' }),
  '/privacy/?locale=ja',
);

console.log('verify-view-route-policy: ok');
