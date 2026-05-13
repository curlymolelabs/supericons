import fs from 'node:fs/promises';
import path from 'node:path';

import { DOCS_PAGE_GROUPS, DOCS_PAGE_ORDER, DOCS_PAGES } from '../docs-pages.js';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../lib/i18n/locales.js';

const TAG_RE = /(<[^>]+>)/g;
const CODE_BLOCK_RE = /<pre\b[\s\S]*?<\/pre>|<code\b[\s\S]*?<\/code>/gi;

const groupFilter = readOption('--group');
const locale = readOption('--locale');
const inputFiles = readOption('--input').split(',').map((value) => value.trim()).filter(Boolean);
const dryRun = process.argv.includes('--dry-run');

if (!locale) throw new Error('Missing --locale=<locale>');
if (!inputFiles.length) throw new Error('Missing --input=<translated-html-file>');
if (locale === DEFAULT_LOCALE || !SUPPORTED_LOCALES.includes(locale)) {
  throw new Error(`Unsupported non-English locale: ${locale}`);
}

const selectedGroups = groupFilter
  ? new Set(groupFilter.split(',').map((group) => group.trim()).filter(Boolean))
  : null;

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
  const value = html.replace(CODE_BLOCK_RE, (match) => {
    const token = `ZXDOCS${String(protectedValues.length).padStart(5, '0')}ZX`;
    protectedValues.push(match);
    return token;
  });
  return { value, protectedValues };
}

function restoreCodeBlocks(html, protectedValues) {
  let value = html;
  protectedValues.forEach((protectedValue, index) => {
    value = value.replaceAll(`ZXDOCS${String(index).padStart(5, '0')}ZX`, protectedValue);
  });
  return value;
}

function isTranslatableTextNode(part) {
  if (!part || part.startsWith('<')) return false;
  const core = part.trim();
  return /[A-Za-z]/.test(core) && !/^ZXDOCS\d{5}ZX$/.test(core);
}

function parseTranslatedSegments(html) {
  const segments = new Map();
  const segmentRe = /<p\b[^>]*data-si-segment="([^"]+)"[^>]*>([\s\S]*?)<\/p>/gi;
  for (const match of html.matchAll(segmentRe)) {
    const id = decodeEntities(match[1]);
    const value = normalizeTranslatedText(match[2]);
    segments.set(id, value);
  }
  return segments;
}

async function readTranslatedSegments(files) {
  const segments = new Map();
  for (const file of files) {
    const html = await fs.readFile(file, 'utf8');
    for (const [id, value] of parseTranslatedSegments(html)) {
      segments.set(id, value);
    }
  }
  return segments;
}

function normalizeTranslatedText(html) {
  const text = html
    .replace(/<span\b[^>]*translate="no"[^>]*>([\s\S]*?)<\/span>/gi, '$1')
    .replace(/<span\b[^>]*class="[^"]*\bnotranslate\b[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return escapeUnsafeText(text);
}

function stripUnexpectedCodeTokens(value) {
  return String(value).replace(/ZXDOCS\d{5}ZX/g, '').replace(/\s{2,}/g, ' ').trim();
}

function escapeUnsafeText(value) {
  return String(value)
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function decodeEntities(value) {
  return String(value)
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function tagSequence(html) {
  return [...html.matchAll(/<[^>]+>/g)].map((match) => match[0]);
}

function localizeBodyFromSegments({ view, sourceBody, translatedSegments }) {
  const codeProtected = protectCodeBlocks(sourceBody);
  const parts = codeProtected.value.split(TAG_RE);
  let replaced = 0;

  const localized = parts.map((part, index) => {
    if (!isTranslatableTextNode(part)) return part;
    const match = part.match(/^(\s*)([\s\S]*?)(\s*)$/);
    const core = match?.[2] || '';
    if (/ZXDOCS\d{5}ZX/.test(core)) {
      const pieces = core.split(/(ZXDOCS\d{5}ZX)/g);
      const translatedCore = pieces.map((piece, pieceIndex) => {
        if (!piece || /^ZXDOCS\d{5}ZX$/.test(piece) || !/[A-Za-z]/.test(piece)) return piece;
        const pieceId = `${view}__${index}__${pieceIndex}`;
        if (!translatedSegments.has(pieceId)) {
          throw new Error(`${locale}/${view}: missing translated segment ${pieceId}`);
        }
        const translatedPiece = stripUnexpectedCodeTokens(translatedSegments.get(pieceId));
        replaced += 1;
        return translatedPiece;
      }).join('');
      return `${match?.[1] || ''}${translatedCore}${match?.[3] || ''}`;
    }

    const id = `${view}__${index}`;
    if (!translatedSegments.has(id)) {
      throw new Error(`${locale}/${view}: missing translated segment ${id}`);
    }
    const translated = stripUnexpectedCodeTokens(translatedSegments.get(id));
    replaced += 1;
    return `${match?.[1] || ''}${translated}${match?.[3] || ''}`;
  }).join('');

  const restored = restoreCodeBlocks(localized, codeProtected.protectedValues);
  const sourceTags = tagSequence(sourceBody);
  const localizedTags = tagSequence(restored);
  if (JSON.stringify(localizedTags) !== JSON.stringify(sourceTags)) {
    const mismatchIndex = sourceTags.findIndex((tag, index) => tag !== localizedTags[index]);
    throw new Error(
      `${locale}/${view}: localized tag sequence differs from English source; ` +
      `source tags=${sourceTags.length}, localized tags=${localizedTags.length}, ` +
      `first mismatch=${mismatchIndex}, source=${sourceTags[mismatchIndex] || 'none'}, localized=${localizedTags[mismatchIndex] || 'none'}`,
    );
  }

  return { bodyHtml: restored, replaced };
}

const translatedSegments = await readTranslatedSegments(inputFiles);
if (!translatedSegments.size) {
  throw new Error(`${inputFiles.join(', ')}: no translated segments found`);
}

const catalogFile = path.join('data/i18n/messages', `${locale}.json`);
const catalog = JSON.parse(await fs.readFile(catalogFile, 'utf8'));
const views = selectedViews();
let updated = 0;
let replaced = 0;

for (const view of views) {
  const sourceBody = DOCS_PAGES[view]?.bodyHtml;
  if (!sourceBody) throw new Error(`${view}: missing source docs body`);
  if (!catalog.docs?.pages?.[view]) throw new Error(`${locale}/${view}: missing catalog page`);

  const result = localizeBodyFromSegments({ view, sourceBody, translatedSegments });
  if (result.bodyHtml === sourceBody) {
    throw new Error(`${locale}/${view}: translated body matches English source`);
  }
  catalog.docs.pages[view].bodyHtml = result.bodyHtml;
  updated += 1;
  replaced += result.replaced;
}

if (!dryRun) {
  await fs.writeFile(catalogFile, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
}

console.log(`import-docs-body-deepl-batch: ${dryRun ? 'checked' : 'updated'} ${updated} pages and ${replaced} segments for ${locale}`);
