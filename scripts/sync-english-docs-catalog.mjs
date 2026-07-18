import fs from 'node:fs/promises';

import { DOCS_PAGES, DOCS_PAGE_ORDER } from '../docs-pages.js';

const catalogFile = 'data/i18n/messages/en.json';
const catalog = JSON.parse(await fs.readFile(catalogFile, 'utf8'));

if (!catalog.docs?.pages) {
  throw new Error(`${catalogFile}: missing docs pages catalog`);
}

for (const view of DOCS_PAGE_ORDER) {
  const source = DOCS_PAGES[view];
  const target = catalog.docs.pages[view];
  if (!source || !target) {
    throw new Error(`${view}: missing English docs source or catalog entry`);
  }

  catalog.docs.pages[view] = {
    ...target,
    navLabel: source.navLabel,
    kicker: source.kicker,
    pageTitle: source.pageTitle,
    summary: source.summary,
    bodyHtml: source.bodyHtml,
  };
}

await fs.writeFile(catalogFile, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
console.log(`sync-english-docs-catalog: synchronized ${DOCS_PAGE_ORDER.length} pages`);
