import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  getCanonicalUrl,
  getPublicSeoEntries,
  SITE_ORIGIN,
} from '../lib/public-route-seo.js';

const distDir = path.resolve('dist');
const templatePath = path.join(distDir, 'index.html');
const templateHtml = await readFile(templatePath, 'utf8');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/"/g, '&quot;');
}

function insertBeforeHeadClose(html, tag) {
  return html.replace('</head>', `    ${tag}\n</head>`);
}

function setTitle(html, title) {
  const tag = `<title>${escapeHtml(title)}</title>`;
  if (/<title>[\s\S]*?<\/title>/i.test(html)) {
    return html.replace(/<title>[\s\S]*?<\/title>/i, tag);
  }
  return insertBeforeHeadClose(html, tag);
}

function upsertMetaName(html, name, content) {
  const tag = `<meta name="${escapeAttribute(name)}" content="${escapeAttribute(content)}">`;
  const pattern = new RegExp(`<meta\\s+name=["']${name}["'][^>]*>`, 'i');
  if (pattern.test(html)) return html.replace(pattern, tag);
  return insertBeforeHeadClose(html, tag);
}

function upsertMetaProperty(html, property, content) {
  const tag = `<meta property="${escapeAttribute(property)}" content="${escapeAttribute(content)}">`;
  const pattern = new RegExp(`<meta\\s+property=["']${property}["'][^>]*>`, 'i');
  if (pattern.test(html)) return html.replace(pattern, tag);
  return insertBeforeHeadClose(html, tag);
}

function upsertCanonical(html, canonicalUrl) {
  const tag = `<link rel="canonical" href="${escapeAttribute(canonicalUrl)}">`;
  const pattern = /<link\s+rel=["']canonical["'][^>]*>/i;
  if (pattern.test(html)) return html.replace(pattern, tag);
  return insertBeforeHeadClose(html, tag);
}

function upsertStructuredData(html, route) {
  const canonicalUrl = getCanonicalUrl(route.path);
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: route.title,
    description: route.description,
    url: canonicalUrl,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Supericons',
      url: SITE_ORIGIN,
    },
  };
  const json = JSON.stringify(structuredData, null, 2).replace(/</g, '\\u003c');
  const tag = `<script type="application/ld+json">\n${json}\n    </script>`;
  const pattern = /<script\s+type=["']application\/ld\+json["']>[\s\S]*?<\/script>/i;
  if (pattern.test(html)) return html.replace(pattern, tag);
  return insertBeforeHeadClose(html, tag);
}

function renderRouteHtml(route) {
  const canonicalUrl = getCanonicalUrl(route.path);
  let html = templateHtml;
  html = setTitle(html, route.title);
  html = upsertMetaName(html, 'description', route.description);
  html = upsertCanonical(html, canonicalUrl);
  html = upsertMetaProperty(html, 'og:title', route.title);
  html = upsertMetaProperty(html, 'og:description', route.description);
  html = upsertMetaProperty(html, 'og:url', canonicalUrl);
  html = upsertMetaName(html, 'twitter:title', route.title);
  html = upsertMetaName(html, 'twitter:description', route.description);
  html = upsertStructuredData(html, route);
  return html;
}

function outputPathForRoute(routePath) {
  if (routePath === '/') return templatePath;
  const cleanRoute = routePath.replace(/^\/+|\/+$/g, '');
  return path.join(distDir, cleanRoute, 'index.html');
}

let written = 0;
for (const route of getPublicSeoEntries()) {
  const outputPath = outputPathForRoute(route.path);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, renderRouteHtml(route));
  written += 1;
}

console.log(`build-public-route-html-snapshots: wrote ${written} route HTML files`);
