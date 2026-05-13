import fs from 'node:fs';
import path from 'node:path';

import { SUPPORTED_LOCALES } from '../lib/i18n/locales.js';

const rootDir = process.cwd();
const sourceDir = path.join(rootDir, 'data/i18n/messages');
const reportPath = path.join(rootDir, 'docs/non-doc-product-localization-audit-2026-05-14.md');

const SURFACES = Object.freeze({
  'Terms': ['legal.terms'],
  'Privacy': ['legal.privacy'],
  'Pricing + FAQ': ['pricing'],
  'Collections / Packs': ['packs', 'purchaseFlow', 'claimFlow'],
  'Motion Lab': ['motionLab'],
  'Converter': ['converter'],
  'Logged-in commerce/account variants': ['loggedIn', 'apiKeys', 'checkout', 'auth'],
});

const INTENTIONAL_SHARED_VALUES = new Set([
  'converter.modes.svgToPng',
  'converter.modes.pngToSvg',
  'apiKeys.status',
]);

const PROTECTED_TERMS = [
  'MCP',
  'API',
  'SVG',
  'PNG',
  'CSS',
  'JSON',
  'Stripe',
  'Supabase',
];

const LOCALE_SCRIPT_TESTS = {
  'zh-Hans': /[\p{Script=Han}]/u,
  'zh-Hant': /[\p{Script=Han}]/u,
  ja: /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u,
  ko: /[\p{Script=Hangul}]/u,
  ar: /[\p{Script=Arabic}]/u,
  hi: /[\p{Script=Devanagari}]/u,
  th: /[\p{Script=Thai}]/u,
};

const LATIN_NON_ENGLISH = new Set(['es', 'de', 'pt', 'vi']);

function readCatalog(locale) {
  return JSON.parse(fs.readFileSync(path.join(sourceDir, `${locale}.json`), 'utf8'));
}

function flatten(value, prefix = '', out = new Map()) {
  if (Array.isArray(value)) {
    value.forEach((child, index) => flatten(child, `${prefix}.${index}`, out));
    return out;
  }

  if (!value || typeof value !== 'object') {
    out.set(prefix, String(value ?? ''));
    return out;
  }

  for (const [key, child] of Object.entries(value)) {
    flatten(child, prefix ? `${prefix}.${key}` : key, out);
  }

  return out;
}

function get(value, dottedPath) {
  return dottedPath.split('.').reduce((cursor, part) => cursor?.[part], value);
}

function stripHtml(value) {
  return String(value)
    .replace(/<!--([\s\S]*?)-->/g, ' $1 ')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function placeholders(value) {
  return [...String(value).matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((match) => match[1]).sort();
}

function htmlTags(value) {
  return [...String(value).replace(/<!--[\s\S]*?-->/g, '').matchAll(/<\/?([a-z][a-z0-9-]*)\b/gi)].map((match) => match[0].replace(/\s+.*/, '>'));
}

function countOccurrences(value, term) {
  return (String(value).match(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
}

function containsEnglishSentence(value) {
  const text = stripHtml(value);
  return /\b(the|this|that|with|without|your|you|free|premium|collection|collections|password|account|search|download|upload|preview|pricing|privacy|terms)\b/i.test(text)
    && /[A-Za-z]{4,}\s+[A-Za-z]{4,}/.test(text);
}

function isFunctionalSharedValue(key, value) {
  if (INTENTIONAL_SHARED_VALUES.has(key)) return true;
  return /^(SVG|PNG|CSS|MCP|API|JSON|Pro|px|deg|x)$/u.test(value);
}

function surfaceKeySet(englishFlat) {
  const result = new Map();
  for (const [surface, roots] of Object.entries(SURFACES)) {
    const keys = [...englishFlat.keys()].filter((key) => roots.some((root) => key === root || key.startsWith(`${root}.`)));
    result.set(surface, keys);
  }
  return result;
}

const english = readCatalog('en');
const englishFlat = flatten(english);
const surfaces = surfaceKeySet(englishFlat);
const findings = [];
const coverage = [];

for (const locale of SUPPORTED_LOCALES.filter((locale) => locale !== 'en')) {
  const catalog = readCatalog(locale);
  const flat = flatten(catalog);

  for (const [surface, keys] of surfaces.entries()) {
    let checked = 0;
    let shared = 0;
    let issues = 0;

    for (const key of keys) {
      checked += 1;
      const englishValue = englishFlat.get(key);
      const localizedValue = flat.get(key);
      const englishText = stripHtml(englishValue);
      const localizedText = stripHtml(localizedValue);

      if (localizedValue === undefined) {
        findings.push({ severity: 'high', locale, surface, key, issue: 'Missing localized key', action: 'Add the key with localized text.' });
        issues += 1;
        continue;
      }

      if (!localizedText) {
        findings.push({ severity: 'high', locale, surface, key, issue: 'Empty localized value', action: 'Replace with localized text.' });
        issues += 1;
      }

      if (localizedValue === englishValue && !isFunctionalSharedValue(key, localizedValue)) {
        findings.push({ severity: 'high', locale, surface, key, issue: 'Exact English fallback', action: 'Translate the visible text while preserving protected tokens.' });
        issues += 1;
      }

      if (localizedValue === englishValue && isFunctionalSharedValue(key, localizedValue)) {
        shared += 1;
      }

      if (placeholders(localizedValue).join('|') !== placeholders(englishValue).join('|')) {
        findings.push({ severity: 'high', locale, surface, key, issue: 'Placeholder mismatch', action: 'Restore the same placeholders as English.' });
        issues += 1;
      }

      if (htmlTags(localizedValue).join('|') !== htmlTags(englishValue).join('|')) {
        findings.push({ severity: 'high', locale, surface, key, issue: 'HTML tag sequence differs from English', action: 'Preserve the same HTML structure and translate only text nodes.' });
        issues += 1;
      }

      for (const term of PROTECTED_TERMS) {
        if (countOccurrences(englishValue, term) > 0 && countOccurrences(localizedValue, term) === 0) {
          findings.push({ severity: 'medium', locale, surface, key, issue: `Protected term count changed: ${term}`, action: 'Verify this is intentional; otherwise preserve the product/code term.' });
          issues += 1;
        }
      }

      const scriptTest = LOCALE_SCRIPT_TESTS[locale];
      if (
        scriptTest
        && englishText.length > 24
        && /[A-Za-z]{4,}/.test(englishText)
        && !scriptTest.test(localizedText)
        && !isFunctionalSharedValue(key, localizedValue)
      ) {
        findings.push({ severity: 'medium', locale, surface, key, issue: 'Long text does not contain the expected locale script', action: 'Verify whether this is an intentional brand/code-only string.' });
        issues += 1;
      }

      if (
        locale !== 'en'
        && !LATIN_NON_ENGLISH.has(locale)
        && containsEnglishSentence(localizedValue)
        && !isFunctionalSharedValue(key, localizedValue)
      ) {
        findings.push({ severity: 'medium', locale, surface, key, issue: 'Possible English sentence remains in localized copy', action: 'Translate the prose if it is user-visible.' });
        issues += 1;
      }
    }

    coverage.push({ locale, surface, checked, shared, issues });
  }
}

function escapeCell(value) {
  return String(value).replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

const lines = [];
lines.push('# Non-Doc Product Localization Audit');
lines.push('');
lines.push('Generated for the product pages outside the docs body: Terms, Privacy, Pricing + FAQ, Collections, Motion Lab, Converter, and logged-in commerce/account variants.');
lines.push('');
lines.push('## Scope');
lines.push('');
for (const [surface, roots] of Object.entries(SURFACES)) {
  lines.push(`- ${surface}: \`${roots.join('`, `')}\``);
}
lines.push('');
lines.push('## Summary');
lines.push('');
lines.push('| Locale | Surface | Keys Checked | Intentional Shared Values | Findings |');
lines.push('|---|---:|---:|---:|---:|');
for (const row of coverage) {
  lines.push(`| ${row.locale} | ${escapeCell(row.surface)} | ${row.checked} | ${row.shared} | ${row.issues} |`);
}
lines.push('');
lines.push('## Verified Findings');
lines.push('');
if (!findings.length) {
  lines.push('No deterministic catalog issues were found for the audited non-doc surfaces.');
} else {
  lines.push('| Severity | Locale | Surface | Key | Finding | Recommended Action |');
  lines.push('|---|---|---|---|---|---|');
  for (const finding of findings) {
    lines.push(`| ${finding.severity} | ${finding.locale} | ${escapeCell(finding.surface)} | \`${finding.key}\` | ${escapeCell(finding.issue)} | ${escapeCell(finding.action)} |`);
  }
}
lines.push('');
lines.push('## Notes');
lines.push('');
lines.push('- This audit checks deterministic risks: missing keys, exact English fallback, placeholder mismatch, HTML tag mismatch, protected product/code terms, and obvious script mismatch.');
lines.push('- A clean result does not mean native-reviewed copy. It means no verified deterministic quality gap was found in the requested surfaces.');

fs.writeFileSync(reportPath, `${lines.join('\n')}\n`, 'utf8');

if (findings.some((finding) => finding.severity === 'high')) {
  console.error(`audit-non-doc-product-localization: ${findings.length} findings, including high severity. See ${reportPath}`);
  process.exit(1);
}

console.log(`audit-non-doc-product-localization: ${findings.length} findings. Wrote ${reportPath}`);
