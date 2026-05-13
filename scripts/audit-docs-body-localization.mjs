import fs from 'node:fs/promises';

import { DOCS_PAGE_GROUPS, DOCS_PAGE_ORDER, DOCS_PAGES } from '../docs-pages.js';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../lib/i18n/locales.js';

const catalogPath = 'data/i18n/messages';
const nonEnglishLocales = SUPPORTED_LOCALES.filter((locale) => locale !== DEFAULT_LOCALE);
const groupByView = new Map();

for (const group of DOCS_PAGE_GROUPS) {
  for (const view of group.pages) {
    groupByView.set(view, group.label);
  }
}

function textFromHtml(html = '') {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[^;]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasLocaleScript(locale, text) {
  if (locale === 'zh-Hans' || locale === 'zh-Hant') return /[\u3400-\u9fff]/.test(text);
  if (locale === 'ja') return /[\u3040-\u30ff]/.test(text);
  if (locale === 'ko') return /[\uac00-\ud7af]/.test(text);
  if (locale === 'ar') return /[\u0600-\u06ff]/.test(text);
  if (locale === 'hi') return /[\u0900-\u097f]/.test(text);
  if (locale === 'th') return /[\u0e00-\u0e7f]/.test(text);
  if (locale === 'vi') return /[ăâđêôơưáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i.test(text);
  return /[a-z]/i.test(text);
}

const rows = [];

for (const locale of nonEnglishLocales) {
  const catalog = JSON.parse(await fs.readFile(`${catalogPath}/${locale}.json`, 'utf8'));
  for (const view of DOCS_PAGE_ORDER) {
    const bodyHtml = catalog.docs?.pages?.[view]?.bodyHtml || '';
    const sourceBodyHtml = DOCS_PAGES[view]?.bodyHtml || '';
    const bodyText = textFromHtml(bodyHtml);
    const sourceText = textFromHtml(sourceBodyHtml);
    rows.push({
      locale,
      group: groupByView.get(view) || 'Unknown',
      view,
      status: bodyHtml === sourceBodyHtml ? 'english_fallback' : 'localized_or_custom',
      bodyLength: bodyText.length,
      sourceLength: sourceText.length,
      hasLocaleScript: hasLocaleScript(locale, bodyText),
    });
  }
}

const byLocale = Object.fromEntries(nonEnglishLocales.map((locale) => [
  locale,
  rows.filter((row) => row.locale === locale && row.status === 'english_fallback').length,
]));

const groups = [...new Set(rows.map((row) => row.group))];
const byGroup = Object.fromEntries(groups.map((group) => [
  group,
  rows.filter((row) => row.group === group && row.status === 'english_fallback').length,
]));

const summary = {
  docsPages: DOCS_PAGE_ORDER.length,
  nonEnglishLocales: nonEnglishLocales.length,
  totalNonEnglishBodies: rows.length,
  englishFallbackBodies: rows.filter((row) => row.status === 'english_fallback').length,
  byLocale,
  byGroup,
};

console.log(JSON.stringify(summary, null, 2));

if (process.argv.includes('--fail-on-fallback') && summary.englishFallbackBodies > 0) {
  throw new Error(`${summary.englishFallbackBodies} non-English docs bodies still use English fallback`);
}
