import fs from 'node:fs/promises';

import { DOCS_PAGE_GROUPS, DOCS_PAGE_ORDER, DOCS_PAGES } from '../docs-pages.js';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../lib/i18n/locales.js';

throw new Error('localize-docs-body-content is disabled. Use export-docs-body-deepl-batch.mjs and import-docs-body-deepl-batch.mjs so only text-node segments are translated and docs HTML layout stays unchanged.');

const GOOGLE_LOCALE = {
  'zh-Hans': 'zh-CN',
  'zh-Hant': 'zh-TW',
  ja: 'ja',
  ko: 'ko',
  es: 'es',
  de: 'de',
  pt: 'pt',
  ar: 'ar',
  hi: 'hi',
  vi: 'vi',
  th: 'th',
};

const LINGVA_LOCALE = {
  'zh-Hans': 'zh',
  'zh-Hant': 'zh_HANT',
  ja: 'ja',
  ko: 'ko',
  es: 'es',
  de: 'de',
  pt: 'pt',
  ar: 'ar',
  hi: 'hi',
  vi: 'vi',
  th: 'th',
};

const PROTECTED_TERMS = [
  'SUPERICONS_API_KEY',
  'supericons-mcp',
  'mcpServers',
  'Supericons Pro',
  'Supericons',
  'Motion Lab',
  'Converter',
  'Claude Code',
  'Claude Desktop',
  'Codex CLI',
  'Codex',
  'Cursor',
  'Smithery',
  'Lucide',
  'Tabler',
  'Phosphor',
  'Heroicons',
  'Bootstrap Icons',
  'Bootstrap',
  'Iconoir',
  'Ionicons',
  'Material Symbols',
  'MingCute',
  'Simple Icons',
  'React',
  'Svelte',
  'Vue',
  'Node.js',
  'JSON',
  'TOML',
  'CSS',
  'SVG',
  'PNG',
  'MCP',
  'API',
  'Pro',
];

const CODE_BLOCK_RE = /<pre\b[\s\S]*?<\/pre>|<code\b[\s\S]*?<\/code>/gi;
const TAG_RE = /(<[^>]+>)/g;
const MAX_RETRIES = 8;

const args = new Set(process.argv.slice(2));
const groupFilter = readOption('--group');
const localeFilter = readOption('--locale');
const provider = readOption('--provider') || 'lingva';
const dryRun = args.has('--dry-run');

const selectedGroups = groupFilter
  ? new Set(groupFilter.split(',').map((group) => group.trim()).filter(Boolean))
  : null;
const selectedLocales = localeFilter
  ? localeFilter.split(',').map((locale) => locale.trim()).filter(Boolean)
  : SUPPORTED_LOCALES.filter((locale) => locale !== DEFAULT_LOCALE);

function readOption(name) {
  const prefix = `${name}=`;
  const value = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : '';
}

function selectedViews() {
  if (!selectedGroups) return DOCS_PAGE_ORDER;

  const views = [];
  for (const group of DOCS_PAGE_GROUPS) {
    if (selectedGroups.has(group.label)) {
      views.push(...group.pages);
    }
  }
  return views;
}

function protectCodeBlocks(html) {
  const protectedValues = [];
  const value = html.replace(CODE_BLOCK_RE, (match) => protect(match, protectedValues));
  return { value, protectedValues };
}

function protectTermsOutsideTags(html, protectedValues) {
  const parts = html.split(TAG_RE);
  const value = parts.map((part) => {
    if (!part || part.startsWith('<')) return part;
    let text = part;
    for (const term of PROTECTED_TERMS) {
      text = text.replaceAll(term, () => protect(term, protectedValues));
    }
    return text;
  }).join('');
  return { value, protectedValues };
}

function protect(value, protectedValues) {
  const token = `ZXSI${String(protectedValues.length).padStart(5, '0')}ZX`;
  protectedValues.push(value);
  return token;
}

function restoreProtected(value, protectedValues) {
  let restored = value;
  protectedValues.forEach((protectedValue, index) => {
    restored = restored.replaceAll(`ZXSI${String(index).padStart(5, '0')}ZX`, protectedValue);
  });
  return restored;
}

async function translateHtml(html, targetLocale) {
  if (provider === 'lingva') {
    return translateHtmlByTextNodes(html, targetLocale);
  }

  const googleLocale = GOOGLE_LOCALE[targetLocale];
  if (!googleLocale) throw new Error(`No translation target configured for ${targetLocale}`);

  const codeProtected = protectCodeBlocks(html);
  const termProtected = protectTermsOutsideTags(codeProtected.value, codeProtected.protectedValues);
  const translated = await translateText(termProtected.value, googleLocale);
  const restored = restoreProtected(translated, termProtected.protectedValues);
  validateProtectedRestoration(restored, termProtected.protectedValues, targetLocale);
  return restored;
}

async function translateHtmlByTextNodes(html, targetLocale) {
  const codeProtected = protectCodeBlocks(html);
  const parts = codeProtected.value.split(TAG_RE);
  const protectedValues = codeProtected.protectedValues;
  const textItems = [];
  const partMeta = parts.map((part) => {
    if (!part || part.startsWith('<')) return null;
    const match = part.match(/^(\s*)([\s\S]*?)(\s*)$/);
    const core = match?.[2] || '';
    if (!/[A-Za-z0-9]/.test(core)) return null;
    const protectedCore = protectTermsInText(core, protectedValues);
    const pieces = protectedCore.split(/(ZXSI\d{5}ZX)/g).filter((piece) => piece !== '');
    for (const piece of pieces) {
      if (!/^ZXSI\d{5}ZX$/.test(piece) && /[A-Za-z0-9]/.test(piece)) {
        textItems.push(piece);
      }
    }
    return { prefix: match?.[1] || '', suffix: match?.[3] || '', pieces };
  });

  const translations = await translateTextItems(textItems, targetLocale);
  const translatedParts = parts.map((part, index) => {
    const meta = partMeta[index];
    if (!meta) return part;
    const translatedCore = meta.pieces.map((piece) => {
      if (/^ZXSI\d{5}ZX$/.test(piece)) return piece;
      return translations.get(piece) || piece;
    }).join('');
    return `${meta.prefix}${restoreProtected(translatedCore, protectedValues)}${meta.suffix}`;
  });

  const restored = restoreProtected(translatedParts.join(''), protectedValues);
  validateProtectedRestoration(restored, protectedValues, targetLocale);
  return restored;
}

function protectTermsInText(text, protectedValues) {
  let protectedText = text;
  for (const term of PROTECTED_TERMS) {
    protectedText = protectedText.replaceAll(term, () => protect(term, protectedValues));
  }
  return protectedText;
}

async function translateText(text, targetLocale) {
  const params = new URLSearchParams({
    client: 'gtx',
    sl: 'en',
    tl: targetLocale,
    dt: 't',
    q: text,
  });

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch('https://translate.googleapis.com/translate_a/single', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: params,
      });
      if (!response.ok) {
        const preview = items.map((item) => item.slice(0, 80).replace(/\s+/g, ' ')).join(' | ');
        const error = new Error(`HTTP ${response.status} for ${targetLocale} chunk (${source.length} chars): ${preview}`);
        error.status = response.status;
        throw error;
      }
      const payload = await response.json();
      return payload?.[0]?.map((part) => part?.[0] || '').join('') || '';
    } catch (error) {
      if (attempt === MAX_RETRIES) throw error;
      const delay = error.status === 429 ? 10_000 * attempt : 700 * attempt;
      await sleep(delay);
    }
  }
  return text;
}

async function translateTextItems(items, targetLocale) {
  const unique = [...new Set(items)];
  const translations = new Map();
  const chunks = [];
  let current = [];
  let currentLength = 0;

  for (const item of unique) {
    const nextLength = currentLength + item.length + 16;
    if (current.length && (nextLength > 700 || current.length >= 6)) {
      chunks.push(current);
      current = [];
      currentLength = 0;
    }
    current.push(item);
    currentLength += item.length + 16;
  }
  if (current.length) chunks.push(current);

  for (const chunk of chunks) {
    const translated = await translateTextLingva(chunk, targetLocale);
    translated.forEach((value, index) => translations.set(chunk[index], value));
    await sleep(250);
  }

  return translations;
}

async function translateTextLingva(items, targetLocale) {
  const lingvaLocale = LINGVA_LOCALE[targetLocale];
  if (!lingvaLocale) throw new Error(`No Lingva target configured for ${targetLocale}`);

  const delimiter = '|||SUPERICONS_DELIM|||';
  const source = items.join(`\n${delimiter}\n`);
  const url = `https://lingva.ml/api/v1/en/${encodeURIComponent(lingvaLocale)}/${encodeURIComponent(source)}`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}`);
        error.status = response.status;
        throw error;
      }
      const payload = await response.json();
      const translated = String(payload.translation || '');
      const parts = translated.split(delimiter).map((part) => part.replace(/^\s+|\s+$/g, ''));
      if (parts.length !== items.length) {
        throw new Error(`Lingva delimiter mismatch: expected ${items.length}, got ${parts.length}`);
      }
      return parts;
    } catch (error) {
      if (attempt === MAX_RETRIES) throw error;
      const delay = error.status === 429 ? 10_000 * attempt : 1_000 * attempt;
      await sleep(delay);
    }
  }
  return items;
}

function validateProtectedRestoration(html, protectedValues, locale) {
  const leftover = html.match(/ZXSI\d{5}ZX/g);
  if (leftover) {
    throw new Error(`${locale}: protected tokens were not restored: ${leftover.slice(0, 5).join(', ')}`);
  }
  for (const protectedValue of protectedValues) {
    if (!html.includes(protectedValue)) {
      throw new Error(`${locale}: protected fragment missing after translation: ${protectedValue.slice(0, 80)}`);
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const views = selectedViews();
let updated = 0;

for (const locale of selectedLocales) {
  if (locale === DEFAULT_LOCALE) continue;
  const catalogFile = `data/i18n/messages/${locale}.json`;
  const catalog = JSON.parse(await fs.readFile(catalogFile, 'utf8'));

  for (const view of views) {
    const sourceBody = DOCS_PAGES[view]?.bodyHtml;
    if (!sourceBody) throw new Error(`${view}: missing source docs body`);
    if (!catalog.docs?.pages?.[view]) throw new Error(`${locale}/${view}: missing catalog page`);

    const localizedBody = await translateHtml(sourceBody, locale);
    if (localizedBody === sourceBody) {
      throw new Error(`${locale}/${view}: translation produced English fallback`);
    }
    catalog.docs.pages[view].bodyHtml = localizedBody;
    updated += 1;
    console.log(`${locale}/${view}: localized`);
    await sleep(900);
  }

  if (!dryRun) {
    await fs.writeFile(catalogFile, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  }
}

console.log(`localize-docs-body-content: ${dryRun ? 'checked' : 'updated'} ${updated} docs bodies`);
