#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { convertPngToSvg } from '../lib/converter-workflow.js';
import { sanitizeSvgExportMarkup } from '../lib/public-metadata-sanitizer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const defaultOutputDir = path.join(repoRoot, 'data', 'si-registry', 'staging', 'supericons-logo-pipeline');
const simpleIconsRecordPath = path.join(repoRoot, 'data', 'si-registry', 'source', 'libraries', 'simpleicons.json');
const simpleIconsPackageDataPath = path.join(repoRoot, 'node_modules', 'simple-icons', 'data', 'simple-icons.json');

const SUPPORTED_RASTER_MIME_TYPES = new Set(['image/png']);
const SUPPORTED_SVG_MIME_TYPES = new Set(['image/svg+xml', 'text/plain', 'application/xml', 'text/xml']);

function printUsage() {
  console.log(`Supericons logo pipeline

Commands:
  audit     Check candidates against local Simple Icons coverage and create a build queue.
  discover  Look for likely logo assets on each candidate's official homepage.
  ingest    Download or read approved official assets, convert PNG to SVG, and stage draft records.

Examples:
  node scripts/supericons-logo-pipeline.mjs audit --name "Kimi" --name "Google Gemini"
  node scripts/supericons-logo-pipeline.mjs audit --input data/logo-candidates.json
  node scripts/supericons-logo-pipeline.mjs discover --input data/si-registry/staging/supericons-logo-pipeline/audit-report.json
  node scripts/supericons-logo-pipeline.mjs ingest --input data/approved-logo-sources.json

Candidate inputs can be:
  - JSON array of strings
  - JSON array of objects
  - JSON object with candidates, logos, queue, approved_sources, or sources
  - Plain text with one candidate per line

Useful options:
  --output <dir>              Output directory. Defaults to data/si-registry/staging/supericons-logo-pipeline
  --include-simpleicons       Do not skip candidates that already exist in Simple Icons.
  --quality-mode <mode>       Converter quality mode: exact or compact. Default: exact
  --trace-class <class>       Converter trace class. Default: flat-logo-color
  --color-mode <mode>         Converter color mode: color or mono. Default: color
  --local-path <path>         Local asset path for a one-off ingest with --name.
  --source-url <url>          Official asset URL for a one-off ingest with --name.
`);
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {
    command,
    names: [],
    aliases: [],
    includeSimpleIcons: false,
    qualityMode: 'exact',
    traceClass: 'flat-logo-color',
    colorMode: 'color',
    outputDir: defaultOutputDir,
  };

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    const next = rest[index + 1];

    if (token === '--help' || token === '-h') {
      options.help = true;
      continue;
    }

    if (token === '--include-simpleicons') {
      options.includeSimpleIcons = true;
      continue;
    }

    if (token === '--input') {
      options.input = next;
      index += 1;
      continue;
    }

    if (token === '--output') {
      options.outputDir = path.resolve(repoRoot, next);
      index += 1;
      continue;
    }

    if (token === '--name') {
      options.names.push(next);
      index += 1;
      continue;
    }

    if (token === '--alias') {
      options.aliases.push(next);
      index += 1;
      continue;
    }

    if (token === '--homepage') {
      options.homepage = next;
      index += 1;
      continue;
    }

    if (token === '--source-page-url') {
      options.sourcePageUrl = next;
      index += 1;
      continue;
    }

    if (token === '--source-url') {
      options.sourceUrl = next;
      index += 1;
      continue;
    }

    if (token === '--local-path') {
      options.localPath = next;
      index += 1;
      continue;
    }

    if (token === '--quality-mode') {
      options.qualityMode = next;
      index += 1;
      continue;
    }

    if (token === '--trace-class') {
      options.traceClass = next;
      index += 1;
      continue;
    }

    if (token === '--color-mode') {
      options.colorMode = next;
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${token}`);
  }

  return options;
}

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeSearchKey(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/\+/g, ' plus ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

function slugify(value) {
  const normalized = String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/\+/g, ' plus ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return normalized || 'untitled-logo';
}

function uniqueStrings(values) {
  const seen = new Set();
  const result = [];
  for (const value of values.flatMap((item) => toArray(item))) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

function dedupeBy(values, selector) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const key = selector(value);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function readJsonIfExists(filePath, fallback) {
  try {
    return await readJson(filePath);
  } catch (error) {
    if (error?.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value, 'utf8');
}

function extractCandidateArray(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];

  for (const field of ['candidates', 'logos', 'queue', 'approved_sources', 'sources', 'items']) {
    if (Array.isArray(value[field])) return value[field];
  }

  return [];
}

function normalizeCandidate(entry) {
  const raw = typeof entry === 'string' ? { name: entry } : { ...entry };
  const label = raw.label || raw.name || raw.title || raw.product || raw.brand || raw.query;

  if (!label || typeof label !== 'string') {
    throw new Error(`Candidate is missing a label/name: ${JSON.stringify(entry)}`);
  }

  const aliases = uniqueStrings([
    raw.aliases,
    raw.synonyms,
    raw.search_terms,
    raw.related_terms,
    raw.query,
  ]);

  const sourceName = slugify(raw.source_name || raw.slug || label);
  const homepage = raw.homepage || raw.website || raw.official_site || raw.official_homepage || null;
  const sourceUrl = raw.source_url || raw.official_asset_url || raw.asset_url || raw.logo_url || raw.url || null;
  const sourcePageUrl = raw.source_page_url || raw.brand_page_url || raw.press_kit_url || homepage || null;
  const localPath = raw.local_path || raw.asset_path || raw.file || null;

  return {
    label: label.trim(),
    source_name: sourceName,
    aliases,
    homepage,
    source_url: sourceUrl,
    source_page_url: sourcePageUrl,
    local_path: localPath,
    priority: raw.priority || null,
    category: raw.category || 'brand_identity',
    tags: uniqueStrings([raw.tags, raw.semantic_tags]),
    asset_type: raw.asset_type || 'logo',
    access_tier: raw.access_tier || 'public_open_record',
    projection_policy: raw.projection_policy || 'future_public_record',
    usage_note: raw.usage_note || null,
    source_type: raw.source_type || raw.asset_source_type || null,
    include: raw.include !== false,
    raw,
  };
}

async function loadCandidates(options) {
  const entries = [];

  if (options.input) {
    const inputPath = path.resolve(repoRoot, options.input);
    const rawText = await fs.readFile(inputPath, 'utf8');
    const isJson = inputPath.toLowerCase().endsWith('.json') || rawText.trim().startsWith('{') || rawText.trim().startsWith('[');

    if (isJson) {
      entries.push(...extractCandidateArray(JSON.parse(rawText)));
    } else {
      entries.push(
        ...rawText
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line && !line.startsWith('#'))
      );
    }
  }

  if (options.names.length && (options.localPath || options.sourceUrl || options.homepage || options.sourcePageUrl || options.aliases.length)) {
    entries.push(
      ...options.names.map((name) => ({
        name,
        aliases: options.aliases,
        homepage: options.homepage || null,
        source_page_url: options.sourcePageUrl || options.homepage || null,
        source_url: options.sourceUrl || null,
        local_path: options.localPath || null,
      }))
    );
  } else {
    entries.push(...options.names);
  }

  const candidates = entries.map((entry) => normalizeCandidate(entry)).filter((candidate) => candidate.include);
  return dedupeBy(candidates, (candidate) => normalizeSearchKey(candidate.label) || candidate.source_name);
}

function addSimpleIconKey(map, key, entry) {
  const normalized = normalizeSearchKey(key);
  if (!normalized) return;
  if (!map.has(normalized)) map.set(normalized, []);
  map.get(normalized).push(entry);
}

function buildSimpleIconsRegistryEntries(records) {
  return records.map((record) => ({
    source: 'supericons-registry',
    icon_id: record.icon_id,
    source_name: record.source_name,
    label: record.label,
    source_url: null,
  }));
}

function buildSimpleIconsPackageEntries(records) {
  return records.map((record) => ({
    source: 'simple-icons-package',
    icon_id: `simpleicons:${record.slug}`,
    source_name: record.slug,
    label: record.title,
    source_url: record.source || null,
    aliases: uniqueStrings([record.aliases?.aka, record.aliases?.dup, record.aliases?.loc]),
  }));
}

async function loadSimpleIconsIndex() {
  const registryRecords = await readJsonIfExists(simpleIconsRecordPath, []);
  const packageRecords = await readJsonIfExists(simpleIconsPackageDataPath, []);
  const entries = [
    ...buildSimpleIconsRegistryEntries(registryRecords),
    ...buildSimpleIconsPackageEntries(packageRecords),
  ];

  const index = new Map();
  for (const entry of entries) {
    addSimpleIconKey(index, entry.label, entry);
    addSimpleIconKey(index, entry.source_name, entry);
    addSimpleIconKey(index, entry.icon_id?.replace(/^simpleicons:/, ''), entry);
    for (const alias of entry.aliases || []) addSimpleIconKey(index, alias, entry);

    const registryRecord = registryRecords.find((record) => record.icon_id === entry.icon_id);
    for (const synonym of registryRecord?.synonyms || []) addSimpleIconKey(index, synonym, entry);
  }

  return index;
}

function getCandidateSearchKeys(candidate) {
  return uniqueStrings([
    candidate.label,
    candidate.source_name,
    candidate.aliases,
  ])
    .map((value) => normalizeSearchKey(value))
    .filter(Boolean);
}

function findSimpleIconsMatches(candidate, simpleIconsIndex) {
  const matches = [];
  for (const key of getCandidateSearchKeys(candidate)) {
    for (const match of simpleIconsIndex.get(key) || []) {
      matches.push({ matched_key: key, ...match });
    }
  }

  return dedupeBy(matches, (match) => match.icon_id);
}

function buildSearchUrls(candidate) {
  const quoted = encodeURIComponent(`"${candidate.label}" official logo png`);
  const brandKit = encodeURIComponent(`${candidate.label} brand kit logo`);
  return [
    `https://www.google.com/search?q=${quoted}`,
    `https://www.google.com/search?q=${brandKit}`,
  ];
}

async function runAudit(options) {
  const candidates = await loadCandidates(options);
  if (!candidates.length) throw new Error('No candidates were provided.');

  const simpleIconsIndex = await loadSimpleIconsIndex();
  const excluded = [];
  const queue = [];

  for (const candidate of candidates) {
    const simpleicons_matches = findSimpleIconsMatches(candidate, simpleIconsIndex);
    if (simpleicons_matches.length && !options.includeSimpleIcons) {
      excluded.push({
        label: candidate.label,
        source_name: candidate.source_name,
        status: 'covered_by_simpleicons',
        simpleicons_matches,
      });
      continue;
    }

    queue.push({
      label: candidate.label,
      source_name: candidate.source_name,
      aliases: candidate.aliases,
      homepage: candidate.homepage,
      source_page_url: candidate.source_page_url,
      source_url: candidate.source_url,
      local_path: candidate.local_path,
      asset_type: candidate.asset_type,
      category: candidate.category,
      tags: candidate.tags,
      priority: candidate.priority,
      status: simpleicons_matches.length ? 'included_despite_simpleicons_match' : 'needs_supericons_asset',
      simpleicons_matches,
      official_source_search_urls: buildSearchUrls(candidate),
    });
  }

  const report = {
    schema_version: '1.0.0',
    purpose: 'Audit logo demand against local Simple Icons coverage before creating Supericons custom assets.',
    summary: {
      total_candidates: candidates.length,
      excluded_simpleicons: excluded.length,
      queued_for_supericons: queue.length,
    },
    excluded,
    queue,
  };

  const outputPath = path.join(options.outputDir, 'audit-report.json');
  await writeJson(outputPath, report);

  console.log(`audit: candidates=${candidates.length} | excluded_simpleicons=${excluded.length} | queued=${queue.length}`);
  console.log(`audit: wrote ${path.relative(repoRoot, outputPath)}`);
}

function getAttribute(tag, name) {
  const pattern = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const match = tag.match(pattern);
  return match ? (match[2] || match[3] || match[4] || '').trim() : '';
}

function resolveUrl(value, baseUrl) {
  if (!value) return null;
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return null;
  }
}

function inferAssetKind(urlValue, contentType = '') {
  const extension = path.extname(new URL(urlValue).pathname).toLowerCase();
  if (contentType.includes('svg') || extension === '.svg') return 'svg';
  if (contentType.includes('png') || extension === '.png') return 'png';
  if (extension === '.webp') return 'webp';
  if (extension === '.ico') return 'ico';
  if (extension === '.jpg' || extension === '.jpeg') return 'jpg';
  return 'unknown';
}

function pushAssetCandidate(list, asset) {
  if (!asset.url || !asset.url.startsWith('http')) return;
  list.push(asset);
}

function extractHomepageAssetCandidates(html, homepageUrl) {
  const candidates = [];

  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    const rel = getAttribute(tag, 'rel').toLowerCase();
    const href = resolveUrl(getAttribute(tag, 'href'), homepageUrl);
    if (!href) continue;
    if (/(icon|apple-touch-icon|mask-icon|shortcut icon)/i.test(rel)) {
      pushAssetCandidate(candidates, {
        url: href,
        asset_kind: inferAssetKind(href),
        confidence: rel.includes('apple') || rel.includes('icon') ? 'medium' : 'low',
        reason: `homepage link rel="${rel}"`,
      });
    }
  }

  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    const property = `${getAttribute(tag, 'property')} ${getAttribute(tag, 'name')}`.toLowerCase();
    const content = resolveUrl(getAttribute(tag, 'content'), homepageUrl);
    if (!content) continue;
    if (/(og:image|twitter:image|image_src)/i.test(property)) {
      pushAssetCandidate(candidates, {
        url: content,
        asset_kind: inferAssetKind(content),
        confidence: 'low',
        reason: `homepage meta ${property.trim()}`,
      });
    }
  }

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const descriptor = `${getAttribute(tag, 'alt')} ${getAttribute(tag, 'title')} ${getAttribute(tag, 'class')} ${getAttribute(tag, 'src')}`.toLowerCase();
    if (!/(logo|brand|mark|icon)/i.test(descriptor)) continue;

    const src = resolveUrl(getAttribute(tag, 'src') || getAttribute(tag, 'data-src'), homepageUrl);
    if (!src) continue;
    pushAssetCandidate(candidates, {
      url: src,
      asset_kind: inferAssetKind(src),
      confidence: descriptor.includes('logo') ? 'medium' : 'low',
      reason: 'homepage image references logo, brand, mark, or icon',
    });
  }

  for (const wellKnownPath of ['/favicon.svg', '/favicon.png', '/apple-touch-icon.png', '/logo.svg', '/logo.png']) {
    pushAssetCandidate(candidates, {
      url: resolveUrl(wellKnownPath, homepageUrl),
      asset_kind: inferAssetKind(resolveUrl(wellKnownPath, homepageUrl)),
      confidence: wellKnownPath.includes('logo') ? 'medium' : 'low',
      reason: `well-known path ${wellKnownPath}`,
    });
  }

  return dedupeBy(candidates, (candidate) => candidate.url);
}

async function fetchText(urlValue) {
  const response = await fetch(urlValue, {
    headers: {
      'user-agent': 'Supericons logo source review/1.0',
      accept: 'text/html,application/xhtml+xml',
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${urlValue}`);
  return response.text();
}

async function runDiscover(options) {
  const candidates = await loadCandidates(options);
  if (!candidates.length) throw new Error('No candidates were provided.');

  const simpleIconsIndex = await loadSimpleIconsIndex();
  const discovered = [];
  const skipped = [];

  for (const candidate of candidates) {
    const simpleicons_matches = findSimpleIconsMatches(candidate, simpleIconsIndex);
    if (simpleicons_matches.length && !options.includeSimpleIcons) {
      skipped.push({
        label: candidate.label,
        source_name: candidate.source_name,
        status: 'covered_by_simpleicons',
        simpleicons_matches,
      });
      continue;
    }

    if (!candidate.homepage && !candidate.source_page_url) {
      discovered.push({
        label: candidate.label,
        source_name: candidate.source_name,
        status: 'needs_homepage',
        source_candidates: [],
        official_source_search_urls: buildSearchUrls(candidate),
      });
      continue;
    }

    const homepage = candidate.homepage || candidate.source_page_url;
    try {
      const html = await fetchText(homepage);
      discovered.push({
        label: candidate.label,
        source_name: candidate.source_name,
        homepage,
        status: 'needs_source_review',
        source_candidates: extractHomepageAssetCandidates(html, homepage),
      });
    } catch (error) {
      discovered.push({
        label: candidate.label,
        source_name: candidate.source_name,
        homepage,
        status: 'homepage_fetch_failed',
        error: error.message,
        source_candidates: [],
        official_source_search_urls: buildSearchUrls(candidate),
      });
    }
  }

  const report = {
    schema_version: '1.0.0',
    purpose: 'Find likely logo assets from official homepages for human source review before ingestion.',
    summary: {
      total_candidates: candidates.length,
      skipped_simpleicons: skipped.length,
      source_review_items: discovered.length,
    },
    skipped,
    discovered,
  };

  const outputPath = path.join(options.outputDir, 'source-candidates.json');
  await writeJson(outputPath, report);

  console.log(`discover: candidates=${candidates.length} | skipped_simpleicons=${skipped.length} | review_items=${discovered.length}`);
  console.log(`discover: wrote ${path.relative(repoRoot, outputPath)}`);
}

async function readAssetBytes(candidate) {
  if (candidate.local_path) {
    const localPath = path.resolve(repoRoot, candidate.local_path);
    return {
      buffer: await fs.readFile(localPath),
      sourceUrl: localPath,
      contentType: '',
    };
  }

  if (!candidate.source_url) {
    throw new Error(`Missing source_url or local_path for ${candidate.label}`);
  }

  const response = await fetch(candidate.source_url, {
    headers: {
      'user-agent': 'Supericons logo asset ingestion/1.0',
      accept: 'image/svg+xml,image/png,*/*;q=0.5',
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${candidate.source_url}`);
  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    sourceUrl: candidate.source_url,
    contentType: response.headers.get('content-type') || '',
  };
}

function inferMimeType(candidate, contentType, sourceUrl) {
  const lowerType = String(contentType || '').split(';')[0].trim().toLowerCase();
  if (SUPPORTED_RASTER_MIME_TYPES.has(lowerType) || SUPPORTED_SVG_MIME_TYPES.has(lowerType)) return lowerType;

  const pathname = sourceUrl && sourceUrl.startsWith('http')
    ? new URL(sourceUrl).pathname
    : sourceUrl || candidate.local_path || '';
  const extension = path.extname(pathname).toLowerCase();

  if (extension === '.png') return 'image/png';
  if (extension === '.svg') return 'image/svg+xml';
  return lowerType || 'application/octet-stream';
}

function stripXmlDeclaration(svg) {
  return String(svg || '').replace(/^\s*<\?xml[\s\S]*?\?>\s*/i, '').trim();
}

function stripExternalCssImports(svg) {
  const warnings = [];
  const stripped = String(svg || '').replace(/@import\s+url\([^)]*\)\s*;?/gi, () => {
    warnings.push('Removed external CSS @import from the staged SVG.');
    return '';
  });

  return {
    svg: stripped,
    warnings: uniqueStrings(warnings),
  };
}

function inspectSvgQuality(svg) {
  const warnings = [];
  if (/<text\b/i.test(svg)) {
    warnings.push('SVG contains live text; convert text to outlines before promotion.');
  }
  if (/<image\b/i.test(svg)) {
    warnings.push('SVG contains an embedded image element; use vector paths before promotion.');
  }
  if (/\b(?:href|xlink:href)\s*=\s*["']https?:\/\//i.test(svg)) {
    warnings.push('SVG references an external URL; remove external dependencies before promotion.');
  }
  return warnings;
}

function parseSvgViewBox(svg) {
  const match = String(svg || '').match(/\bviewBox\s*=\s*"([^"]+)"/i)
    || String(svg || '').match(/\bviewBox\s*=\s*'([^']+)'/i);
  if (match) {
    const parts = match[1].trim().split(/[\s,]+/).map(Number);
    if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return null;
    const [minX, minY, width, height] = parts;
    if (width <= 0 || height <= 0) return null;
    return { minX, minY, width, height };
  }

  const svgTag = parseSvgTag(svg);
  const width = Number.parseFloat(getAttribute(`<svg ${svgTag}>`, 'width'));
  const height = Number.parseFloat(getAttribute(`<svg ${svgTag}>`, 'height'));
  if (width <= 0 || height <= 0) return null;
  return { minX: 0, minY: 0, width, height };
}

function parseSvgTag(svg) {
  const match = String(svg || '').match(/<svg\b([^>]*)>/i);
  return match ? match[1] : '';
}

function extractSvgInner(svg) {
  const withoutDeclaration = stripXmlDeclaration(svg);
  const openTagMatch = withoutDeclaration.match(/<svg\b[^>]*>/i);
  if (!openTagMatch) return withoutDeclaration;
  return withoutDeclaration
    .slice(openTagMatch.index + openTagMatch[0].length)
    .replace(/<\/svg>\s*$/i, '')
    .trim();
}

function getPresentationAttributes(svgTag) {
  const allowedAttributes = ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'color'];
  return allowedAttributes
    .map((name) => {
      const value = getAttribute(`<svg ${svgTag}>`, name);
      return value ? `${name}="${value.replace(/"/g, '&quot;')}"` : '';
    })
    .filter(Boolean)
    .join(' ');
}

function indentMultiline(text, spaces = 4) {
  const prefix = ' '.repeat(spaces);
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => `${prefix}${line}`)
    .join('\n');
}

function roundNumber(value) {
  return Number(value.toFixed(6)).toString();
}

function normalizeSvgToIconFrame(svg, options = {}) {
  const sanitizedBase = stripXmlDeclaration(sanitizeSvgExportMarkup(svg, { preserveBranding: false }));
  const strippedImports = stripExternalCssImports(sanitizedBase);
  const sanitized = strippedImports.svg;
  const viewBox = parseSvgViewBox(sanitized);
  const inner = extractSvgInner(sanitized);
  const svgTag = parseSvgTag(sanitized);
  const presentationAttributes = getPresentationAttributes(svgTag);
  const qualityWarnings = [...strippedImports.warnings, ...inspectSvgQuality(sanitized)];

  if (!viewBox || !inner) {
    return {
      svg: sanitized.endsWith('\n') ? sanitized : `${sanitized}\n`,
      warnings: uniqueStrings([
        'Could not find a reliable SVG viewBox, so the asset was sanitized but not reframed to 24x24.',
        qualityWarnings,
      ]),
    };
  }

  const liveArea = options.liveArea || 20;
  const padding = (24 - liveArea) / 2;
  const scale = liveArea / Math.max(viewBox.width, viewBox.height);
  const offsetX = padding + ((liveArea - viewBox.width * scale) / 2);
  const offsetY = padding + ((liveArea - viewBox.height * scale) / 2);
  const groupAttrs = [
    presentationAttributes,
    `transform="translate(${roundNumber(offsetX)} ${roundNumber(offsetY)}) scale(${roundNumber(scale)}) translate(${roundNumber(-viewBox.minX)} ${roundNumber(-viewBox.minY)})"`,
  ].filter(Boolean).join(' ');

  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">\n  <g ${groupAttrs}>\n${indentMultiline(inner, 4)}\n  </g>\n</svg>\n`,
    warnings: uniqueStrings(qualityWarnings),
  };
}

function getAssetExtension(mimeType, sourceUrl) {
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/svg+xml') return '.svg';
  const extension = sourceUrl ? path.extname(sourceUrl.startsWith('http') ? new URL(sourceUrl).pathname : sourceUrl) : '';
  return extension || '.asset';
}

async function convertAssetToSvg(candidate, options) {
  const asset = await readAssetBytes(candidate);
  const mimeType = inferMimeType(candidate, asset.contentType, asset.sourceUrl);
  const sourceExtension = getAssetExtension(mimeType, asset.sourceUrl);
  const sourceAssetPath = path.join(options.outputDir, 'assets', `${candidate.source_name}.source${sourceExtension}`);
  await fs.mkdir(path.dirname(sourceAssetPath), { recursive: true });
  await fs.writeFile(sourceAssetPath, asset.buffer);

  if (mimeType === 'image/png') {
    const result = await convertPngToSvg({
      imageBase64: asset.buffer.toString('base64'),
      mimeType: 'image/png',
      qualityMode: candidate.raw.quality_mode || options.qualityMode,
      colorMode: candidate.raw.color_mode || options.colorMode,
      traceClass: candidate.raw.trace_class || options.traceClass,
      uiMode: 'logo',
    });

    return {
      sourceAssetPath,
      sourceMimeType: mimeType,
      rawSvg: result.svg,
      converter: result.request,
      metrics: result.metrics,
      warnings: result.warnings || [],
    };
  }

  if (mimeType === 'image/svg+xml' || String(asset.buffer).trim().startsWith('<svg') || String(asset.buffer).includes('<svg')) {
    return {
      sourceAssetPath,
      sourceMimeType: 'image/svg+xml',
      rawSvg: asset.buffer.toString('utf8'),
      converter: null,
      metrics: null,
      warnings: [],
    };
  }

  throw new Error(`Unsupported asset type for ${candidate.label}: ${mimeType}`);
}

function buildDraftRecord(candidate, svgRelativePath) {
  const tags = uniqueStrings([
    candidate.source_name,
    candidate.label,
    candidate.aliases,
    candidate.tags,
    'brand',
    'logo',
  ]).map((tag) => tag.toLowerCase());

  return {
    icon_id: `supericons:${candidate.source_name}`,
    source_group: candidate.access_tier === 'protected_premium_record' ? 'premium' : 'free',
    source_library: 'supericons',
    source_name: candidate.source_name,
    label: candidate.label,
    purpose: `Show the official ${candidate.label} brand or product mark.`,
    category: 'brand_identity',
    semantic_tags: tags,
    use_when: `Use when the interface refers specifically to ${candidate.label} as a brand, app, model, platform, login provider, connected service, supported tool, or official destination.`,
    avoid_when: `Do not use as a generic AI, model, agent, or developer-tool icon when the meaning is not specifically ${candidate.label}.`,
    version: '0.1.0',
    status: 'draft',
    access_tier: candidate.access_tier,
    projection_policy: candidate.projection_policy,
    is_premium: candidate.access_tier === 'protected_premium_record',
    asset_type: candidate.asset_type,
    source_url: candidate.source_url || candidate.local_path,
    source_page_url: candidate.source_page_url || candidate.homepage,
    source_asset_name: svgRelativePath.replaceAll('\\', '/'),
    usage_note: candidate.usage_note || 'Brand marks remain trademarks of their respective owners.',
    evidence: [
      'source_name',
      'official_source',
      'svg_payload',
    ],
    synonyms: uniqueStrings([candidate.aliases, candidate.label, candidate.source_name]),
  };
}

async function runIngest(options) {
  const candidates = await loadCandidates(options);
  if (!candidates.length) throw new Error('No candidates were provided.');

  const simpleIconsIndex = await loadSimpleIconsIndex();
  const records = [];
  const imported = [];
  const skipped = [];
  const failed = [];

  for (const candidate of candidates) {
    const simpleicons_matches = findSimpleIconsMatches(candidate, simpleIconsIndex);
    if (simpleicons_matches.length && !options.includeSimpleIcons) {
      skipped.push({
        label: candidate.label,
        source_name: candidate.source_name,
        status: 'covered_by_simpleicons',
        simpleicons_matches,
      });
      continue;
    }

    try {
      const converted = await convertAssetToSvg(candidate, options);
      const normalized = normalizeSvgToIconFrame(converted.rawSvg);
      const svgPath = path.join(options.outputDir, 'svg', `${candidate.source_name}.svg`);
      await writeText(svgPath, normalized.svg);

      const relativeSvgPath = path.relative(path.join(repoRoot, 'data', 'si-registry', 'staging'), svgPath);
      const record = buildDraftRecord(candidate, relativeSvgPath);
      records.push(record);
      imported.push({
        label: candidate.label,
        source_name: candidate.source_name,
        status: 'staged',
        source_asset_path: path.relative(repoRoot, converted.sourceAssetPath),
        svg_path: path.relative(repoRoot, svgPath),
        source_mime_type: converted.sourceMimeType,
        converter: converted.converter,
        metrics: converted.metrics,
        warnings: uniqueStrings([converted.warnings, normalized.warnings]),
      });
    } catch (error) {
      failed.push({
        label: candidate.label,
        source_name: candidate.source_name,
        status: 'failed',
        error: error.message,
      });
    }
  }

  const recordsPath = path.join(options.outputDir, 'records', 'draft-records.json');
  const reportPath = path.join(options.outputDir, 'ingest-report.json');
  await writeJson(recordsPath, records);
  await writeJson(reportPath, {
    schema_version: '1.0.0',
    purpose: 'Stage approved official logo assets as Supericons draft SVGs and registry records.',
    summary: {
      total_candidates: candidates.length,
      staged: imported.length,
      skipped_simpleicons: skipped.length,
      failed: failed.length,
    },
    imported,
    skipped,
    failed,
  });

  console.log(`ingest: candidates=${candidates.length} | staged=${imported.length} | skipped_simpleicons=${skipped.length} | failed=${failed.length}`);
  console.log(`ingest: wrote ${path.relative(repoRoot, recordsPath)}`);
  console.log(`ingest: wrote ${path.relative(repoRoot, reportPath)}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.command || options.command === '--help' || options.command === '-h' || options.help) {
    printUsage();
    return;
  }

  if (options.command === 'audit') {
    await runAudit(options);
    return;
  }

  if (options.command === 'discover') {
    await runDiscover(options);
    return;
  }

  if (options.command === 'ingest') {
    await runIngest(options);
    return;
  }

  throw new Error(`Unknown command: ${options.command}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
