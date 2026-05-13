import fs from 'node:fs/promises';
import path from 'node:path';

import { DOCS_PAGE_GROUPS, DOCS_PAGE_ORDER, DOCS_PAGES } from '../docs-pages.js';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../lib/i18n/locales.js';

const TAG_RE = /(<[^>]+>)/g;
const CODE_BLOCK_RE = /<pre\b[\s\S]*?<\/pre>|<code\b[\s\S]*?<\/code>/gi;
const DEFAULT_OUT_DIR = 'output/docs-body-deepl';

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

const groupFilter = readOption('--group');
const localeFilter = readOption('--locale');
const outDir = readOption('--out-dir') || DEFAULT_OUT_DIR;
const tokenPiecesOnly = process.argv.includes('--token-pieces-only');

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
  const value = html.replace(CODE_BLOCK_RE, (match) => {
    const token = `ZXDOCS${String(protectedValues.length).padStart(5, '0')}ZX`;
    protectedValues.push(match);
    return token;
  });
  return { value, protectedValues };
}

function isTranslatableTextNode(part) {
  if (!part || part.startsWith('<')) return false;
  const core = part.trim();
  return /[A-Za-z]/.test(core) && !/^ZXDOCS\d{5}ZX$/.test(core);
}

function protectTermsAsHtml(text) {
  const terms = [...PROTECTED_TERMS].sort((a, b) => b.length - a.length);
  const matches = [];

  for (const match of text.matchAll(/ZXDOCS\d{5}ZX/g)) {
    matches.push({ start: match.index, end: match.index + match[0].length, value: match[0] });
  }

  for (const term of terms) {
    const escapedTerm = escapeRegExp(term);
    const boundaryPrefix = /^[A-Za-z0-9]/.test(term) ? '(?<![A-Za-z0-9])' : '';
    const boundarySuffix = /[A-Za-z0-9]$/.test(term) ? '(?![A-Za-z0-9])' : '';
    const termRe = new RegExp(`${boundaryPrefix}${escapedTerm}${boundarySuffix}`, 'g');
    for (const match of text.matchAll(termRe)) {
      const start = match.index;
      const end = start + match[0].length;
      const overlaps = matches.some((existing) => start < existing.end && end > existing.start);
      if (!overlaps) matches.push({ start, end, value: match[0] });
    }
  }

  matches.sort((a, b) => a.start - b.start);
  let result = '';
  let cursor = 0;
  for (const match of matches) {
    result += escapeUnsafeText(text.slice(cursor, match.start));
    result += `<span translate="no" class="notranslate">${escapeUnsafeText(match.value)}</span>`;
    cursor = match.end;
  }
  result += escapeUnsafeText(text.slice(cursor));
  return result;
}

function escapeUnsafeText(value) {
  return String(value)
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function escapeAttribute(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function collectSegments(view, bodyHtml) {
  const codeProtected = protectCodeBlocks(bodyHtml);
  const parts = codeProtected.value.split(TAG_RE);
  const segments = [];

  parts.forEach((part, index) => {
    if (!isTranslatableTextNode(part)) return;
    const match = part.match(/^(\s*)([\s\S]*?)(\s*)$/);
    const core = match?.[2] || '';
    if (!core.trim()) return;
    if (/ZXDOCS\d{5}ZX/.test(core)) {
      const pieces = core.split(/(ZXDOCS\d{5}ZX)/g);
      pieces.forEach((piece, pieceIndex) => {
        if (!piece || /^ZXDOCS\d{5}ZX$/.test(piece) || !/[A-Za-z]/.test(piece)) return;
        segments.push({
          id: `${view}__${index}__${pieceIndex}`,
          view,
          partIndex: index,
          html: protectTermsAsHtml(piece),
        });
      });
      return;
    }
    if (!tokenPiecesOnly) {
      segments.push({
        id: `${view}__${index}`,
        view,
        partIndex: index,
        html: protectTermsAsHtml(core),
      });
    }
  });

  return segments;
}

const views = selectedViews();
const allSegments = views.flatMap((view) => {
  const bodyHtml = DOCS_PAGES[view]?.bodyHtml;
  if (!bodyHtml) throw new Error(`${view}: missing source docs body`);
  return collectSegments(view, bodyHtml);
});

if (!allSegments.length) {
  throw new Error('No docs text segments found to export');
}

await fs.mkdir(outDir, { recursive: true });

for (const locale of selectedLocales) {
  if (locale === DEFAULT_LOCALE) continue;
  if (!SUPPORTED_LOCALES.includes(locale)) throw new Error(`Unsupported locale: ${locale}`);

  const file = path.join(outDir, `${locale}.html`);
  const body = allSegments
    .map((segment) => `<p data-si-segment="${escapeAttribute(segment.id)}">${segment.html}</p>`)
    .join('\n');
  const document = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Supericons docs body translation batch: ${escapeAttribute(locale)}</title>
</head>
<body>
${body}
</body>
</html>
`;

  await fs.writeFile(file, document, 'utf8');
  console.log(`${file}: exported ${allSegments.length} segments`);
}
