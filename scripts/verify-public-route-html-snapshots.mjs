import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { getCanonicalUrl, getPublicSeoEntries } from '../lib/public-route-seo.js';

const distDir = path.resolve('dist');
const entries = getPublicSeoEntries();

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/"/g, '&quot;');
}

function outputPathForRoute(routePath) {
  if (routePath === '/') return path.join(distDir, 'index.html');
  const cleanRoute = routePath.replace(/^\/+|\/+$/g, '');
  return path.join(distDir, cleanRoute, 'index.html');
}

for (const route of entries) {
  const htmlPath = outputPathForRoute(route.path);
  const html = await readFile(htmlPath, 'utf8');
  const canonicalUrl = getCanonicalUrl(route.path);

  assert.ok(
    html.includes(`<title>${escapeHtml(route.title)}</title>`),
    `${htmlPath} is missing the expected title`,
  );
  assert.ok(
    html.includes(`<meta name="description" content="${escapeAttribute(route.description)}">`),
    `${htmlPath} is missing the expected description`,
  );
  assert.ok(
    html.includes(`<link rel="canonical" href="${escapeAttribute(canonicalUrl)}">`),
    `${htmlPath} is missing the expected canonical URL`,
  );
  assert.ok(
    html.includes(`<meta property="og:url" content="${escapeAttribute(canonicalUrl)}">`),
    `${htmlPath} is missing the expected Open Graph URL`,
  );
}

const sitemap = await readFile(path.join(distDir, 'sitemap.xml'), 'utf8');
for (const route of entries) {
  assert.ok(
    sitemap.includes(`<loc>${getCanonicalUrl(route.path)}</loc>`),
    `dist/sitemap.xml is missing ${route.path}`,
  );
}

assert.equal(/\?view=|\?locale=/.test(sitemap), false, 'dist/sitemap.xml includes query URLs');

console.log(`verify-public-route-html-snapshots: ok (${entries.length} routes)`);
