import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { DOCS_PAGES, DOCS_PAGE_ORDER } from '../docs-pages.js';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../lib/i18n/locales.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const catalogDirs = [
  'data/i18n/messages',
  'public/i18n/messages',
  'mcp/public/i18n/messages',
];
const GENERIC_LOCALIZED_SECTION_IDS = [
  'localized-overview',
  'localized-focus',
  'localized-steps',
  'localized-code-note',
];

const FORBIDDEN_PLACEHOLDER_SNIPPETS = [
  'English uses the full source guide.',
];

const LOCALIZED_FORBIDDEN_ENGLISH_SNIPPETS = [
  'Official OpenCode docs for local and remote MCP server setup.',
];

const REQUIRED_LITERAL_SNIPPETS = [
  'npx -y @supericons/mcp@latest',
  'SUPERICONS_API_KEY',
];
const STALE_MCP_SETUP_PATTERNS = [
  /npx\s+-y\s+@supericons\/mcp(?!@latest)/,
  /-y\s+@supericons\/mcp(?!@latest)/,
  /["']@supericons\/mcp["']/,
  /docs-universal-field-arg-package">[\s\n]*@supericons\/mcp(?!@latest)/,
];

function bodyMetrics(bodyHtml = '') {
  const tags = [...bodyHtml.matchAll(/<[^>]+>/g)].map((match) =>
    match[0].replace(
      /\s(aria-label|data-video-eyebrow|data-video-description|title)="[^"]*"/g,
      ' $1="<localized>"',
    ),
  );
  const sectionIds = [...bodyHtml.matchAll(/<section\b[^>]*id="([^"]+)"/g)].map((match) => match[1]);
  const headingCount = [...bodyHtml.matchAll(/<h[2-4]\b/g)].length;
  const codeCount = [...bodyHtml.matchAll(/<code\b/g)].length;
  const text = bodyHtml
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[^;]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    tags,
    sectionIds,
    sectionCount: sectionIds.length,
    headingCount,
    codeCount,
    textLength: text.length,
  };
}

function hasGenericLocalizedSkeleton(bodyHtml = '') {
  return GENERIC_LOCALIZED_SECTION_IDS.some((id) => bodyHtml.includes(`id="${id}"`));
}

function hasForbiddenPlaceholder(bodyHtml = '') {
  return FORBIDDEN_PLACEHOLDER_SNIPPETS.some((snippet) => bodyHtml.includes(snippet));
}

function assertLocalizedBodyParity({ locale, view, bodyHtml, requireLocalized = true }) {
  const englishBody = DOCS_PAGES[view]?.bodyHtml || '';
  const english = bodyMetrics(englishBody);
  const localized = bodyMetrics(bodyHtml);
  const localeCode = String(locale).split('/').pop();
  const minLengthRatio = localizedTextLengthRatio(localeCode);

  assert.ok(english.textLength > 200, `${view}: English source docs body is unexpectedly short`);
  assert.ok(!hasForbiddenPlaceholder(englishBody), `${view}: English source docs body contains placeholder copy`);

  assert.ok(
    !hasGenericLocalizedSkeleton(bodyHtml),
    `${locale}/${view}: generic localized docs skeleton must not be shipped`,
  );
  assert.ok(
    !hasForbiddenPlaceholder(bodyHtml),
    `${locale}/${view}: docs body placeholder must not be shipped`,
  );
  if (requireLocalized) {
    assert.notEqual(
      bodyHtml,
      englishBody,
      `${locale}/${view}: non-English docs body must not fall back to English source`,
    );
    for (const snippet of LOCALIZED_FORBIDDEN_ENGLISH_SNIPPETS) {
      assert.ok(
        !bodyHtml.includes(snippet),
        `${locale}/${view}: untranslated English docs copy must be localized: ${snippet}`,
      );
    }
  }
  assert.deepEqual(
    localized.tags,
    english.tags,
    `${locale}/${view}: docs body HTML tag structure must match English source exactly`,
  );

  assert.ok(
    localized.textLength >= english.textLength * minLengthRatio,
    `${locale}/${view}: localized body is too short compared with English source`,
  );
  if (english.sectionCount > 0) {
    assert.ok(
      localized.sectionCount >= Math.max(1, Math.floor(english.sectionCount * 0.75)),
      `${locale}/${view}: localized body has too few sections compared with English source`,
    );
  }
  if (english.headingCount > 0) {
    assert.ok(
      localized.headingCount >= Math.max(1, Math.floor(english.headingCount * 0.65)),
      `${locale}/${view}: localized body has too few headings compared with English source`,
    );
  }
  assert.ok(
    localized.codeCount >= Math.floor(english.codeCount * 0.9),
    `${locale}/${view}: localized body dropped code examples or inline code`,
  );

  for (const snippet of REQUIRED_LITERAL_SNIPPETS) {
    if (englishBody.includes(snippet)) {
      assert.ok(
        bodyHtml.includes(snippet),
        `${locale}/${view}: required literal snippet missing: ${snippet}`,
      );
    }
  }
  if (englishBody.includes('@supericons/mcp@latest')) {
    assert.ok(
      bodyHtml.includes('@supericons/mcp@latest'),
      `${locale}/${view}: missing current MCP package literal @supericons/mcp@latest`,
    );
    for (const pattern of STALE_MCP_SETUP_PATTERNS) {
      assert.ok(
        !pattern.test(bodyHtml),
        `${locale}/${view}: stale MCP setup literal must use @supericons/mcp@latest`,
      );
    }
  }
}

function localizedTextLengthRatio(locale) {
  if (locale === 'zh-Hans' || locale === 'zh-Hant') return 0.35;
  if (locale === 'ja' || locale === 'ko') return 0.50;
  return 0.55;
}

for (const catalogDir of catalogDirs) {
  const messagesDir = path.join(rootDir, catalogDir);

  for (const locale of SUPPORTED_LOCALES) {
    const catalog = JSON.parse(await fs.readFile(path.join(messagesDir, `${locale}.json`), 'utf8'));
    assert.ok(catalog.docs?.pages, `${catalogDir}/${locale}: missing docs pages catalog`);

    for (const view of DOCS_PAGE_ORDER) {
      const page = catalog.docs.pages[view];
      assert.ok(page, `${catalogDir}/${locale}/${view}: missing docs page catalog`);
      assert.equal(typeof page.navLabel, 'string', `${catalogDir}/${locale}/${view}: navLabel missing`);
      assert.equal(typeof page.pageTitle, 'string', `${catalogDir}/${locale}/${view}: pageTitle missing`);
      if (page.summary !== undefined) {
        assert.equal(typeof page.summary, 'string', `${catalogDir}/${locale}/${view}: summary must be a string when provided`);
      }

      if (locale === DEFAULT_LOCALE) {
        assert.equal(typeof page.bodyHtml, 'string', `${catalogDir}/${locale}/${view}: English bodyHtml missing`);
        assertLocalizedBodyParity({
          locale: `${catalogDir}/${locale}`,
          view,
          bodyHtml: page.bodyHtml,
          requireLocalized: false,
        });
        continue;
      }

      if (page.bodyHtml === undefined) {
        continue;
      }

      assert.equal(typeof page.bodyHtml, 'string', `${catalogDir}/${locale}/${view}: bodyHtml must be a string when provided`);
      assertLocalizedBodyParity({ locale: `${catalogDir}/${locale}`, view, bodyHtml: page.bodyHtml });
    }
  }
}

console.log('verify-localized-docs-bodies: ok');
