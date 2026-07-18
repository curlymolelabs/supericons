import {
  DOCS_PAGE_GROUPS,
  DOCS_PAGES,
} from '../docs-pages.js';

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'how', 'i', 'if', 'in', 'is', 'it', 'my', 'of', 'on', 'or', 'the', 'to', 'use', 'what', 'when', 'who', 'with', 'you', 'your',
]);

const PAGE_ALIASES = Object.freeze({
  docs: ['start here', 'docs home', 'introduction', 'overview', 'where do i start', 'getting started'],
  'docs-quickstart': ['quickstart', 'quick start', 'setup fast', 'first steps', 'first install'],
  'docs-what-is-supericons': ['what is supericons', 'overview', 'free vs pro', 'free vs paid'],
  'docs-mcp-universal': ['universal setup', 'base config', 'mcp install', 'add api key', 'env setup'],
  'docs-claude-code': ['claude code', 'claude', 'anthropic', 'claude setup'],
  'docs-codex': ['codex', 'openai codex', 'codex cli', 'codex config'],
  'docs-cursor': ['cursor', 'cursor setup', 'cursor mcp'],
  'docs-mcp-others': ['other clients', 'windsurf', 'cline', 'copilot agent', 'opencode'],
  'docs-mcp-tools': ['all tools', 'tool list', 'mcp tools', 'available tools'],
  'docs-mcp-icons': ['icon tools', 'search icons', 'get icon', 'libraries', 'premium icons'],
  'docs-mcp-motion': ['motion lab tools', 'motion tools', 'animate icon', 'motion css', 'animated svg'],
  'docs-mcp-converter': ['converter tools', 'png tracing', 'svg to png', 'png to svg'],
  'docs-motion-lab': ['motion lab', 'animation', 'motion intro', 'animate icons'],
  'docs-motion-lab-presets': ['presets', 'motion presets', 'animation presets'],
  'docs-motion-lab-triggers': ['triggers', 'hover', 'click trigger', 'loop'],
  'docs-motion-lab-exports': ['exports', 'motion css', 'animated svg', 'selector token', 'selector instructions'],
  'docs-motion-lab-mcp-workflow': ['workflow', 'agent workflow', 'tool order', 'which tool'],
  'docs-motion-lab-client-setup': ['motion lab setup', 'client setup', 'motion lab api key'],
  'docs-motion-lab-use-cases': ['use cases', 'when to use motion', 'no motion', 'motion examples'],
  'docs-converter-guide': ['converter', 'convert png to svg', 'convert svg to png', 'browser converter'],
  'docs-converter-png-to-svg': ['png to svg', 'trace png', 'trace raster'],
  'docs-converter-svg-to-png': ['svg to png', 'raster export', 'background'],
  'docs-converter-settings': ['converter settings', 'trace class', 'quality mode', 'color mode', 'ui mode'],
  'docs-access-api-keys': ['api keys', 'api key', 'authentication', 'account access', 'free mcp', 'keyless mcp', 'no api key', 'purchased access'],
  'docs-access-premium': ['pro and collections', 'pro vs packs', 'pack ownership', 'who gets what'],
  'docs-troubleshooting': ['troubleshooting', 'help', 'problems', 'errors', 'not working'],
});

const SECTION_ALIASES = Object.freeze({
  'docs-quickstart#quickstart-premium': ['premium setup', 'paid setup', 'pro setup', 'pack access'],
  'docs-mcp-tools#mcp-overview-note': ['premium icons', 'pack access', 'owned packs'],
  'docs-mcp-motion#motion-tools-css': ['motion css', 'selector token', 'selector instructions', 'selector mode'],
  'docs-mcp-motion#motion-tools-svg': ['animated svg export', 'self contained svg'],
  'docs-motion-lab#motion-lab-access': ['who can use motion lab', 'motion lab access', 'browser preview'],
  'docs-motion-lab-exports#motion-exports-css': ['selector token', 'selector instructions', 'css export'],
  'docs-motion-lab-client-setup#motion-mcp-setup-prereqs': ['motion lab api key', 'motion lab pro plan'],
  'docs-converter-guide#converter-browser-vs-mcp': ['browser vs mcp', 'agent workflow', 'which converter'],
  'docs-converter-svg-to-png': ['background color', 'target width', 'png export'],
  'docs-converter-png-to-svg': ['png tracing', 'tracing', 'trace quality'],
  'docs-access-premium': ['who can use converter', 'who can use motion lab', 'pro plan', 'pack ownership'],
});

let docsSearchEntriesCache = null;

function normalizeText(value) {
  return (value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&amp;/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value) {
  return normalizeText(value)
    .split(' ')
    .filter((token) => token && !STOP_WORDS.has(token));
}

function humanizeCodeToken(token) {
  return String(token || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_./:-]+/g, ' ');
}

function collectCodeLikeVariants(value) {
  const tokens = String(value || '').match(/[A-Za-z][A-Za-z0-9_./:-]*/g) || [];
  const variants = new Set();

  tokens.forEach((token) => {
    const rawNormalized = normalizeText(token);
    const humanized = normalizeText(humanizeCodeToken(token));
    if (rawNormalized) variants.add(rawNormalized);
    if (humanized) variants.add(humanized);
  });

  return [...variants];
}

function buildSearchText(value) {
  const normalized = normalizeText(value);
  const codeVariants = collectCodeLikeVariants(value).join(' ');
  return [normalized, codeVariants].filter(Boolean).join(' ').trim();
}

function parseBodyHtml(bodyHtml = '') {
  const parser = new DOMParser();
  return parser.parseFromString(`<body>${bodyHtml}</body>`, 'text/html');
}

function extractVisibleText(node) {
  return buildSearchText(node?.textContent || '');
}

function extractSectionTitle(section) {
  const heading = section.querySelector('h2, h3');
  return heading?.textContent?.trim() || '';
}

function extractPreviewText(section) {
  const paragraph = section.querySelector('p, li');
  return paragraph?.textContent?.trim() || '';
}

function extractCodeTerms(node) {
  const terms = new Set();
  node.querySelectorAll('code, pre code, td code, th code').forEach((el) => {
    collectCodeLikeVariants(el.textContent || '').forEach((term) => terms.add(term));
  });
  return [...terms];
}

function buildGroupMap() {
  const map = new Map();
  DOCS_PAGE_GROUPS.forEach((group) => {
    group.pages.forEach((view) => map.set(view, group.label));
  });
  return map;
}

function collectAliases(view, sectionId = '') {
  const pageAliases = PAGE_ALIASES[view] || [];
  const pageScopedSectionAliases = SECTION_ALIASES[view] || [];
  const scopedAliases = sectionId ? (SECTION_ALIASES[`${view}#${sectionId}`] || []) : [];
  return [...new Set([...pageAliases, ...pageScopedSectionAliases, ...scopedAliases])];
}

function isPlaceholderContent(summary, bodyText) {
  return normalizeText(summary || '').startsWith('this page will explain')
    || normalizeText(bodyText || '').includes('while this section is being filled out');
}

function createPageEntry(view, config, groupLabel) {
  const doc = parseBodyHtml(config.bodyHtml || '');
  const body = doc.body;
  const aliases = collectAliases(view);
  const visibleText = body.textContent || '';

  return {
    id: `${view}::page`,
    type: 'page',
    view,
    sectionId: '',
    pageTitle: config.pageTitle || '',
    sectionTitle: '',
    groupLabel,
    summary: config.summary || '',
    preview: config.summary || '',
    aliases,
    codeTerms: extractCodeTerms(body),
    isPlaceholder: isPlaceholderContent(config.summary, visibleText),
    searchTitle: buildSearchText(`${config.pageTitle || ''} ${config.navLabel || ''}`),
    searchSummary: buildSearchText(config.summary || ''),
    searchBody: extractVisibleText(body),
    searchAliases: buildSearchText(aliases.join(' ')),
    searchGroup: buildSearchText(groupLabel),
  };
}

function createSectionEntries(view, config, groupLabel) {
  const doc = parseBodyHtml(config.bodyHtml || '');
  const sections = [...doc.querySelectorAll('section[id]')];

  return sections.map((section) => {
    const sectionId = section.id || '';
    const sectionTitle = extractSectionTitle(section);
    const preview = extractPreviewText(section);
    const aliases = collectAliases(view, sectionId);
    const visibleText = section.textContent || '';

    return {
      id: `${view}#${sectionId}`,
      type: 'section',
      view,
      sectionId,
      pageTitle: config.pageTitle || '',
      sectionTitle,
      groupLabel,
      summary: config.summary || '',
      preview,
      aliases,
      codeTerms: extractCodeTerms(section),
      isPlaceholder: isPlaceholderContent(config.summary, visibleText),
      searchTitle: buildSearchText(`${config.pageTitle || ''} ${sectionTitle}`),
      searchSummary: buildSearchText(config.summary || ''),
      searchBody: extractVisibleText(section),
      searchAliases: buildSearchText(aliases.join(' ')),
      searchGroup: buildSearchText(groupLabel),
    };
  });
}

export function getDocsSearchEntries() {
  if (docsSearchEntriesCache) return docsSearchEntriesCache;

  const groupMap = buildGroupMap();
  const entries = [];

  Object.entries(DOCS_PAGES).forEach(([view, config]) => {
    const groupLabel = groupMap.get(view) || 'Docs';
    entries.push(createPageEntry(view, config, groupLabel));
    entries.push(...createSectionEntries(view, config, groupLabel));
  });

  docsSearchEntriesCache = entries;
  return entries;
}

function buildQueryInfo(query) {
  const raw = String(query || '').trim();
  const normalizedQuery = normalizeText(raw);
  const queryTokens = tokenize(raw);
  const queryForms = new Set([normalizedQuery]);
  collectCodeLikeVariants(raw).forEach((form) => queryForms.add(form));

  if (queryTokens.length > 1) {
    const camelForm = `${queryTokens[0]}${queryTokens.slice(1).map((token) => token.charAt(0).toUpperCase() + token.slice(1)).join('')}`;
    const snakeForm = queryTokens.join('_');
    const kebabForm = queryTokens.join('-');
    const upperSnakeForm = queryTokens.join('_').toUpperCase();
    [camelForm, snakeForm, kebabForm, upperSnakeForm].forEach((form) => {
      collectCodeLikeVariants(form).forEach((variant) => queryForms.add(variant));
    });
  }

  const forms = [...queryForms].filter(Boolean);
  const isCodeLike = /[_./:-]/.test(raw)
    || /[a-z][A-Z]/.test(raw)
    || /[A-Z]{2,}/.test(raw)
    || queryTokens.length > 1 && raw.includes('-');

  return {
    raw,
    normalizedQuery,
    queryTokens,
    queryForms: forms,
    isCodeLike,
  };
}

function includesAny(field, queryForms) {
  return queryForms.some((form) => form && field.includes(form));
}

function exactCodeTermMatch(entry, queryForms) {
  return entry.codeTerms.some((term) => queryForms.includes(term));
}

function scoreEntry(entry, queryInfo) {
  const { normalizedQuery, queryTokens, queryForms, isCodeLike } = queryInfo;
  if (!normalizedQuery) return 0;

  let score = 0;

  const titleExact = queryForms.some((form) => entry.searchTitle === form);
  const aliasExact = queryForms.some((form) => entry.searchAliases === form);
  const codeExact = exactCodeTermMatch(entry, queryForms);
  const titlePhrase = includesAny(entry.searchTitle, queryForms);
  const aliasPhrase = includesAny(entry.searchAliases, queryForms);
  const summaryPhrase = includesAny(entry.searchSummary, queryForms);
  const bodyPhrase = includesAny(entry.searchBody, queryForms);

  if (codeExact) score += isCodeLike ? 320 : 180;
  if (titleExact) score += 260;
  if (aliasExact) score += isCodeLike ? 180 : 210;
  if (titlePhrase) score += isCodeLike ? 150 : 110;
  if (aliasPhrase) score += isCodeLike ? 54 : 95;
  if (summaryPhrase) score += isCodeLike ? 64 : 72;
  if (bodyPhrase) score += isCodeLike ? 72 : 36;

  queryTokens.forEach((token) => {
    if (entry.searchTitle.includes(token)) score += 22;
    if (entry.searchSummary.includes(token)) score += 12;
    if (entry.searchBody.includes(token)) score += isCodeLike ? 8 : 6;
    if (entry.searchGroup.includes(token)) score += 8;
    if (!isCodeLike && entry.searchAliases.includes(token)) score += 18;
    if (entry.codeTerms.some((term) => term.includes(token))) score += isCodeLike ? 20 : 8;
  });

  if (entry.type === 'section' && entry.sectionTitle) score += 12;
  if (entry.type === 'page') score += isCodeLike ? 2 : 8;
  if (entry.isPlaceholder) score -= 240;

  return score;
}

export function searchDocs(query, { limit = 8 } = {}) {
  const queryInfo = buildQueryInfo(query);
  if (!queryInfo.normalizedQuery) return [];

  const entries = getDocsSearchEntries();
  const ranked = entries
    .map((entry) => ({ entry, score: scoreEntry(entry, queryInfo) }))
    .filter((result) => result.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.entry.type !== b.entry.type) return a.entry.type === 'section' ? -1 : 1;
      return a.entry.pageTitle.localeCompare(b.entry.pageTitle);
    });

  if (!ranked.length) return [];

  const scoreFloor = Math.max(18, Math.floor(ranked[0].score * 0.18));
  const filteredRanked = ranked.filter((result) => result.score >= scoreFloor);

  const bestSectionScoreByView = new Map();
  filteredRanked.forEach((result) => {
    if (result.entry.type !== 'section') return;
    const previous = bestSectionScoreByView.get(result.entry.view) || 0;
    if (result.score > previous) {
      bestSectionScoreByView.set(result.entry.view, result.score);
    }
  });

  const deduped = [];
  const countsByView = new Map();

  for (const result of filteredRanked) {
    const view = result.entry.view;
    const count = countsByView.get(view) || 0;
    const bestSectionScore = bestSectionScoreByView.get(view) || 0;

    if (result.entry.type === 'page' && bestSectionScore >= result.score - 24) {
      continue;
    }

    if (count >= 2) continue;

    deduped.push({
      ...result.entry,
      score: result.score,
    });
    countsByView.set(view, count + 1);

    if (deduped.length >= limit) break;
  }

  return deduped;
}
