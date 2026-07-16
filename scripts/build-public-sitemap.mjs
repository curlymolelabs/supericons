import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { getCanonicalUrl, getPublicSeoEntries } from '../lib/public-route-seo.js';

const today = new Date().toISOString().slice(0, 10);
const entries = getPublicSeoEntries();

const urls = entries
  .map((route) => {
    const loc = getCanonicalUrl(route.path);
    const priority = route.priority || '0.5';
    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <priority>${priority}</priority>
  </url>`;
  })
  .join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

await writeFile(path.resolve('public/sitemap.xml'), xml);

console.log(`build-public-sitemap: wrote ${entries.length} URLs to public/sitemap.xml`);
