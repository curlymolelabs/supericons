import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { expandCjkQuery } from '../lib/cjk-search-core.js';
import { buildWebSearchQueryPlan } from '../lib/web-cjk-search-smoke.js';
import { buildIntentQueryVariants } from '../lib/search-intent-core.js';
import { searchIcons } from '../mcp/search.js';
import { recommendIconsForTask } from '../mcp/recommend-icons.js';
import { getConverterMcpOptions } from '../mcp/converter.js';
import { normalizeSupportedLocale } from '../mcp/search-tool-shell.js';
import {
  SUPPORTED_MCP_OUTPUT_LOCALES,
  localizeConverterOptions,
  localizeMotionPresetSummary,
  localizeMotionRecipe,
  localizeSelectorInstructions,
} from '../mcp/mcp-output-localization.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

const expectedLocales = ['zh-Hans', 'zh-Hant', 'ja', 'ko', 'es', 'de', 'pt', 'ar', 'hi', 'vi', 'th'];

assert.equal(normalizeSupportedLocale('pt-BR', expectedLocales), 'pt');
assert.equal(normalizeSupportedLocale('zh-CN', expectedLocales), 'zh-Hans');
assert.equal(normalizeSupportedLocale('zh-TW', expectedLocales), 'zh-Hant');
assert.equal(normalizeSupportedLocale('DE-de', expectedLocales), 'de');
assert.equal(normalizeSupportedLocale('en-US', expectedLocales), undefined);

async function readText(relativePath) {
  return fs.readFile(path.join(rootDir, relativePath), 'utf8');
}

async function readJson(relativePath) {
  return JSON.parse(await readText(relativePath));
}

function assertIncludesAll(text, values, context) {
  for (const value of values) {
    assert.ok(text.includes(value), `${context} must include ${value}`);
  }
}

function assertIncludesLocaleExample(bodyHtml, locale, context) {
  const rawQuoteExample = `locale: "${locale}"`;
  const escapedQuoteExample = `locale: &quot;${locale}&quot;`;
  assert.ok(
    bodyHtml.includes(rawQuoteExample) || bodyHtml.includes(escapedQuoteExample),
    `${context} docs must include locale examples`
  );
}

const [
  indexSource,
  remoteSource,
  docsSource,
  searchSource,
  telemetrySource,
  packageJson,
  serverJson,
  aliasData,
  publicAliasData,
  packagedAliasData,
  cjkData,
  publicIcons,
  synonyms,
  mcpOutputLocales,
  zhHansCatalog,
  jaCatalog,
  arCatalog,
  evaluationSet,
] = await Promise.all([
  readText('mcp/index.js'),
  readText('mcp/remote-server.js'),
  readText('docs-pages.js'),
  readText('mcp/search.js'),
  readText('mcp/telemetry.js'),
  readJson('mcp/package.json'),
  readJson('mcp/server.json'),
  readJson('data/i18n/multilingual-search-aliases.json'),
  readJson('public/multilingual-search-aliases.json'),
  readJson('mcp/public/multilingual-search-aliases.json'),
  readJson('data/i18n/cjk-search-terms.json'),
  readJson('public/icon-index.json'),
  readJson('public/synonyms.json'),
  readJson('data/i18n/mcp-output-locales.json'),
  readJson('data/i18n/messages/zh-Hans.json'),
  readJson('data/i18n/messages/ja.json'),
  readJson('data/i18n/messages/ar.json'),
  readJson('data/semantic-search-v2/evaluation-set.json'),
]);

assertIncludesAll(indexSource, expectedLocales, 'stdio MCP search schema');
assertIncludesAll(remoteSource, expectedLocales, 'hosted MCP search schema');
assert.ok(
  indexSource.includes('locale: forgivingStringSchema.optional()'),
  'stdio MCP must expose the forgiving locale schema used for agent-readable warnings',
);
assert.ok(
  /locale:\s*forgivingStringSchema\s*\.optional\(\)/.test(remoteSource),
  'hosted MCP must expose the forgiving locale schema used for agent-readable warnings',
);
assert.ok(remoteSource.includes('locale,') && remoteSource.includes('searchIconsHostedMcp'), 'hosted MCP must pass locale to search');
assert.ok(indexSource.includes('locale,') && indexSource.includes('recommendIconsForTask'), 'stdio recommend_icons must accept locale');
assert.ok(remoteSource.includes('recommendIconsForTask') && remoteSource.includes('locale,'), 'hosted recommend_icons must accept locale');

assert.ok(searchSource.includes('multilingual-search-aliases.json'), 'local MCP search must load multilingual aliases');
assert.ok(telemetrySource.includes('locale=${locale}'), 'MCP telemetry must preserve locale metadata');
assert.ok(docsSource.includes('mcp-search-locales'), 'docs must include multilingual MCP search examples');
assert.ok(docsSource.includes('<code>locale</code>'), 'docs must mention the locale parameter');
for (const [locale, catalog] of [['zh-Hans', zhHansCatalog], ['ja', jaCatalog], ['ar', arCatalog]]) {
  const bodyHtml = catalog.docs.pages['docs-mcp-search-guide'].bodyHtml || '';
  assert.ok(bodyHtml.includes('mcp-search-locales'), `${locale} docs must include localized MCP search examples`);
  assertIncludesLocaleExample(bodyHtml, locale, locale);
}
assert.ok(packageJson.files.includes('public/multilingual-search-aliases.json'), 'MCP package must include multilingual aliases');
assert.ok(packageJson.files.includes('generated/mcp-output-locales.json'), 'MCP package must include MCP output locale data');
assert.ok(packageJson.files.includes('mcp-output-localization.js'), 'MCP package must include MCP output localization helper');
assert.match(packageJson.description, /multilingual/i, 'MCP package description should mention multilingual search');
assert.match(serverJson.description, /Multilingual/i, 'MCP server registry description should mention multilingual search');
assert.doesNotMatch(
  indexSource,
  /Premium collections are available when your API key/i,
  'stdio MCP search description must not imply premium pack icon search is exposed'
);
assert.doesNotMatch(
  indexSource,
  /premium pack names/i,
  'stdio MCP icon search library descriptions must not advertise premium pack names'
);
assert.doesNotMatch(
  indexSource,
  /Premium icons require/i,
  'stdio MCP get_icon description must not imply premium pack icon retrieval is exposed'
);

assert.deepEqual(publicAliasData, aliasData, 'public alias artifact must match source');
assert.deepEqual(packagedAliasData, aliasData, 'packaged MCP alias artifact must match source');
assert.deepEqual(aliasData.locales, expectedLocales, 'alias locales must match supported MCP locales');
assert.equal(aliasData.aliases.length, expectedLocales.length * 18, 'alias artifact must include 18 categories per locale');
assert.deepEqual(SUPPORTED_MCP_OUTPUT_LOCALES, expectedLocales, 'MCP output locale helper must expose every supported locale');
assert.deepEqual(Object.keys(mcpOutputLocales.locales), expectedLocales, 'MCP output locale artifact must include every supported locale');

const synonymKeys = new Set(Object.keys(synonyms));
for (const alias of aliasData.aliases) {
  assert.equal(alias.gate, 'auto_accept', `${alias.locale}:${alias.category} must be auto_accept`);
  assert.ok(alias.term, `${alias.locale}:${alias.category} must include a term`);
  for (const concept of alias.maps_to || []) {
    assert.ok(synonymKeys.has(concept), `${alias.locale}:${alias.category} maps to unknown concept ${concept}`);
  }
}

const allExpansionTerms = [...cjkData.terms, ...aliasData.aliases];
const zhSecurity = aliasData.aliases.find((alias) => alias.locale === 'zh-Hans' && alias.category === 'security-access');
assert.ok(zhSecurity, 'zh-Hans security category alias must exist');
const securityExpansion = expandCjkQuery(zhSecurity.term, {
  locale: 'zh-Hans',
  terms: allExpansionTerms,
});
assert.ok(securityExpansion.variants.includes('lock'), 'category alias should expand to lock');
assert.ok(securityExpansion.variants.includes('shield'), 'category alias should expand to shield');

const webPlan = buildWebSearchQueryPlan(zhSecurity.term, allExpansionTerms, buildIntentQueryVariants, 'zh-Hans');
assert.ok(webPlan.variants.includes('lock'), 'web query plan should include category alias expansion');
assert.ok(webPlan.variants.includes('shield'), 'web query plan should include category alias expansion');

const mcpResults = searchIcons(zhSecurity.term, publicIcons.icons, synonyms, {
  locale: 'zh-Hans',
  limit: 8,
});
assert.ok(mcpResults.length > 0, 'MCP local fallback should return icons for a localized category alias');

const localizedSearchIconCases = [];
function collectLocalizedSearchIconCases(value) {
  if (Array.isArray(value)) {
    value.forEach(collectLocalizedSearchIconCases);
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (/^multi-.+-search-icon$/.test(value.case_id || '')) localizedSearchIconCases.push(value);
  Object.values(value).forEach(collectLocalizedSearchIconCases);
}
collectLocalizedSearchIconCases(evaluationSet);
assert.equal(localizedSearchIconCases.length, expectedLocales.length);

const normalizedFixtureLocales = localizedSearchIconCases.map((testCase) => (
  testCase.locale === 'pt-BR' ? 'pt' : testCase.locale
));
assert.deepEqual([...normalizedFixtureLocales].sort(), [...expectedLocales].sort());

for (const testCase of localizedSearchIconCases) {
  const locale = testCase.locale === 'pt-BR' ? 'pt' : testCase.locale;
  const results = searchIcons(testCase.query, publicIcons.icons, synonyms, {
    locale,
    limit: 5,
  });
  assert.ok(results.length > 0, `${testCase.case_id} must return localized search icons`);
  assert.ok(
    results.slice(0, 3).some((icon) => /search|magnif/i.test(`${icon.id} ${icon.name || ''}`)),
    `${testCase.case_id} must rank a search or magnifier icon in the first three results`,
  );
}

const reviewedMultilingualCases = [];
function collectReviewedMultilingualCases(value) {
  if (Array.isArray(value)) {
    value.forEach(collectReviewedMultilingualCases);
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (
    value.case_id
    && value.locale
    && Array.isArray(value.acceptable_families)
    && value.acceptable_families.length > 0
  ) {
    reviewedMultilingualCases.push(value);
  }
  Object.values(value).forEach(collectReviewedMultilingualCases);
}
collectReviewedMultilingualCases(evaluationSet);
assert.equal(reviewedMultilingualCases.length, 75);

function normalizedFamilyTokens(families) {
  return families
    .flatMap((family) => String(family || '').toLowerCase().split(/[^a-z0-9]+/))
    .filter((token) => token.length >= 3);
}

const reviewedMissesByLocale = new Map();
for (const testCase of reviewedMultilingualCases) {
  const locale = testCase.locale === 'pt-BR' ? 'pt' : testCase.locale;
  const results = searchIcons(testCase.query, publicIcons.icons, synonyms, {
    locale,
    limit: 8,
  });
  const acceptableTokens = normalizedFamilyTokens(testCase.acceptable_families);
  const hasReviewedFamily = results.some((icon) => {
    const candidateText = `${icon.lib || ''} ${icon.id || ''} ${icon.name || ''}`.toLowerCase();
    return acceptableTokens.some((token) => candidateText.includes(token));
  });
  if (!hasReviewedFamily) {
    const misses = reviewedMissesByLocale.get(testCase.locale) || [];
    misses.push(testCase.case_id);
    reviewedMissesByLocale.set(testCase.locale, misses);
  }
}

const reviewedMissCount = [...reviewedMissesByLocale.values()]
  .reduce((total, misses) => total + misses.length, 0);
assert.ok(
  (reviewedMultilingualCases.length - reviewedMissCount) / reviewedMultilingualCases.length >= 0.9,
  `reviewed multilingual pass rate fell below 90 percent: ${reviewedMissCount} misses`,
);
for (const [locale, misses] of reviewedMissesByLocale) {
  assert.ok(
    misses.length <= 1,
    `${locale} has more than one reviewed multilingual miss: ${misses.join(', ')}`,
  );
}

const arSecurityShortcut = expandCjkQuery('\u0627\u0644\u0623\u0645\u0627\u0646', {
  locale: 'ar',
  terms: allExpansionTerms,
});
assert.ok(arSecurityShortcut.variants.includes('lock'), 'Arabic security shortcut should expand to lock');
assert.ok(arSecurityShortcut.variants.includes('shield'), 'Arabic security shortcut should expand to shield');

const hostedSearchClientUrl = pathToFileURL(path.join(rootDir, 'mcp', 'hosted-search-client.js')).href;
const hostedCallScript = `
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const body = JSON.parse(init.body || '{}');
    calls.push({ url: String(url), body });
    return { ok: true, json: async () => ({ results: [{ id: 'lock', library: 'tabler', svg: '<svg></svg>' }] }) };
  };
  const mod = await import(${JSON.stringify(hostedSearchClientUrl)});
  await mod.searchIconsHostedMcp({ query: 'seguridad', locale: 'es', limit: 3 });
  console.log(JSON.stringify(calls[0]));
`;
const hostedCallOutput = execFileSync(process.execPath, ['--input-type=module', '-e', hostedCallScript], {
  cwd: rootDir,
  encoding: 'utf8',
  env: {
    ...process.env,
    SUPERICONS_MCP_SEARCH_URL: 'https://example.test/mcp-search',
  },
});
const hostedCall = JSON.parse(hostedCallOutput.trim().split('\n').at(-1));
assert.equal(hostedCall.body.locale, 'es', 'hosted search client must forward locale');

const hostedFallbackScript = `
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const body = JSON.parse(init.body || '{}');
    calls.push(body);
    if (body.query === 'settings') {
      return {
        ok: true,
        json: async () => ({ results: [{ id: 'settings', name: 'settings', library: 'lucide', svg: '<svg></svg>' }] }),
      };
    }
    return { ok: true, json: async () => ({ results: [] }) };
  };
  const mod = await import(${JSON.stringify(hostedSearchClientUrl)});
  const payload = await mod.searchIconsHostedMcp({ query: '\u8bbe\u7f6e', locale: 'zh-Hans', limit: 3 });
  console.log(JSON.stringify({ calls, payload }));
`;
const hostedFallbackOutput = execFileSync(process.execPath, ['--input-type=module', '-e', hostedFallbackScript], {
  cwd: rootDir,
  encoding: 'utf8',
  env: {
    ...process.env,
    SUPERICONS_MCP_SEARCH_URL: 'https://example.test/mcp-search',
  },
});
const hostedFallback = JSON.parse(hostedFallbackOutput.trim().split('\n').at(-1));
assert.equal(hostedFallback.payload.results[0]?.id, 'settings', 'hosted search client must retry localized queries with expanded English concepts');
assert.ok(hostedFallback.calls.some((call) => call.query === 'settings'), 'hosted search client must send expanded settings query');

const recommendation = await recommendIconsForTask({
  task: '\u8bbe\u7f6e\u9875\u9762',
  slots: ['\u8bbe\u7f6e'],
  locale: 'zh-Hans',
  limitPerSlot: 1,
  searchIconsForQuery: async ({ query, locale }) => {
    if (locale === 'zh-Hans' && ['settings', 'gear', 'sliders'].includes(query)) {
      return [{ id: 'settings', name: 'settings', lib: 'lucide', style: 'outline', svg: '<svg></svg>' }];
    }
    return [];
  },
  buildIconResult: async (icon) => ({
    id: icon.id,
    name: icon.name,
    library: icon.lib,
    style: icon.style,
    svg: icon.svg,
  }),
  semanticMap: new Map(),
});
assert.equal(recommendation.results[0]?.recommended?.id, 'settings', 'recommend_icons should expand localized slot labels');

const naturalLocalizedRecommendation = await recommendIconsForTask({
  task: '\u4e3a\u8bbe\u7f6e\u9875\u9762\u9009\u62e9\u4e00\u5957\u7b80\u6d01\u7edf\u4e00\u7684\u7ebf\u6027\u98ce\u683c\u56fe\u6807',
  slots: [
    '\u8d26\u6237\u4e0e\u4e2a\u4eba\u8d44\u6599',
    '\u901a\u77e5\u8bbe\u7f6e',
    '\u9690\u79c1\u4e0e\u5b89\u5168',
    '\u5916\u89c2\u4e0e\u4e3b\u9898',
    '\u8bed\u8a00\u8bbe\u7f6e',
  ],
  locale: 'zh-Hans',
  limitPerSlot: 1,
  searchIconsForQuery: async ({ query }) => {
    if (query === 'user') return [{ id: 'user', name: 'user', lib: 'lucide', style: 'outline', svg: '<svg></svg>' }];
    if (query === 'notification') return [{ id: 'notifications', name: 'notifications', lib: 'lucide', style: 'outline', svg: '<svg></svg>' }];
    if (query === 'notifications') return [{ id: 'notifications', name: 'notifications', lib: 'lucide', style: 'outline', svg: '<svg></svg>' }];
    if (query === 'lock') return [{ id: 'lock', name: 'lock', lib: 'tabler', style: 'outline', svg: '<svg></svg>' }];
    if (query === 'moon') return [{ id: 'moon', name: 'moon', lib: 'lucide', style: 'outline', svg: '<svg></svg>' }];
    if (query === 'globe') return [{ id: 'globe', name: 'globe', lib: 'lucide', style: 'outline', svg: '<svg></svg>' }];
    if (query === 'settings') return [{ id: 'settings', name: 'settings', lib: 'lucide', style: 'outline', svg: '<svg></svg>' }];
    throw new Error('simulated hosted search failure');
  },
  buildIconResult: async (icon) => ({
    id: icon.id,
    name: icon.name,
    library: icon.lib,
    style: icon.style,
    svg: icon.svg,
  }),
  semanticMap: new Map(),
});
assert.deepEqual(
  naturalLocalizedRecommendation.results.map((result) => result.recommended?.id),
  ['user', 'notifications', 'lock', 'moon', 'globe'],
  'recommend_icons should recover natural localized slot labels and ignore failed query variants'
);

const settingsSlotFixtures = {
  en: ['Account/Profile', 'Notifications', 'Privacy/Security', 'Appearance/Theme', 'Language'],
  'zh-Hans': [
    '\u8d26\u6237\u4e0e\u4e2a\u4eba\u8d44\u6599',
    '\u901a\u77e5\u8bbe\u7f6e',
    '\u9690\u79c1\u4e0e\u5b89\u5168',
    '\u5916\u89c2\u4e0e\u4e3b\u9898',
    '\u8bed\u8a00\u8bbe\u7f6e',
  ],
  'zh-Hant': [
    '\u5e33\u6236\u8207\u500b\u4eba\u8cc7\u6599',
    '\u901a\u77e5\u8a2d\u5b9a',
    '\u96b1\u79c1\u8207\u5b89\u5168',
    '\u5916\u89c0\u8207\u4e3b\u984c',
    '\u8a9e\u8a00\u8a2d\u5b9a',
  ],
  ja: [
    '\u30a2\u30ab\u30a6\u30f3\u30c8\u3068\u30d7\u30ed\u30d5\u30a3\u30fc\u30eb',
    '\u901a\u77e5\u8a2d\u5b9a',
    '\u30d7\u30e9\u30a4\u30d0\u30b7\u30fc\u3068\u30bb\u30ad\u30e5\u30ea\u30c6\u30a3',
    '\u5916\u89b3\u3068\u30c6\u30fc\u30de',
    '\u8a00\u8a9e\u8a2d\u5b9a',
  ],
  ko: [
    '\uacc4\uc815 \ubc0f \ud504\ub85c\ud544',
    '\uc54c\ub9bc \uc124\uc815',
    '\uac1c\uc778\uc815\ubcf4 \ubc0f \ubcf4\uc548',
    '\uc678\uad00 \ubc0f \ud14c\ub9c8',
    '\uc5b8\uc5b4 \uc124\uc815',
  ],
  es: ['Cuenta y perfil', 'Notificaciones', 'Privacidad y seguridad', 'Apariencia y tema', 'Idioma'],
  de: ['Konto und Profil', 'Benachrichtigungen', 'Datenschutz und Sicherheit', 'Erscheinungsbild und Design', 'Sprache'],
  pt: ['Conta e perfil', 'Notificacoes', 'Privacidade e seguranca', 'Aparencia e tema', 'Idioma'],
  ar: [
    '\u0627\u0644\u062d\u0633\u0627\u0628 \u0648\u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062e\u0635\u064a',
    '\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a',
    '\u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629 \u0648\u0627\u0644\u0623\u0645\u0627\u0646',
    '\u0627\u0644\u0645\u0638\u0647\u0631 \u0648\u0627\u0644\u0633\u0645\u0629',
    '\u0627\u0644\u0644\u063a\u0629',
  ],
  hi: [
    '\u0916\u093e\u0924\u093e \u0914\u0930 \u092a\u094d\u0930\u094b\u092b\u093c\u093e\u0907\u0932',
    '\u0938\u0942\u091a\u0928\u093e\u090f\u0901',
    '\u0917\u094b\u092a\u0928\u0940\u092f\u0924\u093e \u0914\u0930 \u0938\u0941\u0930\u0915\u094d\u0937\u093e',
    '\u0930\u0942\u092a \u0914\u0930 \u0925\u0940\u092e',
    '\u092d\u093e\u0937\u093e',
  ],
  vi: [
    'T\u00e0i kho\u1ea3n v\u00e0 h\u1ed3 s\u01a1',
    'Th\u00f4ng b\u00e1o',
    'Quy\u1ec1n ri\u00eang t\u01b0 v\u00e0 b\u1ea3o m\u1eadt',
    'Giao di\u1ec7n v\u00e0 ch\u1ee7 \u0111\u1ec1',
    'Ng\u00f4n ng\u1eef',
  ],
  th: [
    '\u0e1a\u0e31\u0e0d\u0e0a\u0e35\u0e41\u0e25\u0e30\u0e42\u0e1b\u0e23\u0e44\u0e1f\u0e25\u0e4c',
    '\u0e01\u0e32\u0e23\u0e41\u0e08\u0e49\u0e07\u0e40\u0e15\u0e37\u0e2d\u0e19',
    '\u0e04\u0e27\u0e32\u0e21\u0e40\u0e1b\u0e47\u0e19\u0e2a\u0e48\u0e27\u0e19\u0e15\u0e31\u0e27\u0e41\u0e25\u0e30\u0e04\u0e27\u0e32\u0e21\u0e1b\u0e25\u0e2d\u0e14\u0e20\u0e31\u0e22',
    '\u0e23\u0e39\u0e1b\u0e25\u0e31\u0e01\u0e29\u0e13\u0e4c\u0e41\u0e25\u0e30\u0e18\u0e35\u0e21',
    '\u0e20\u0e32\u0e29\u0e32',
  ],
};

const settingsQueryResultMap = new Map([
  ['user profile', 'user'],
  ['account user', 'user'],
  ['avatar person', 'user'],
  ['user', 'user'],
  ['profile', 'user'],
  ['account', 'user'],
  ['notification', 'bell'],
  ['notifications', 'bell'],
  ['bell', 'bell'],
  ['alert', 'bell'],
  ['alarm', 'bell'],
  ['privacy security', 'shield-lock'],
  ['shield lock', 'shield-lock'],
  ['lock', 'shield-lock'],
  ['shield', 'shield-lock'],
  ['privacy', 'shield-lock'],
  ['security', 'shield-lock'],
  ['appearance theme', 'palette'],
  ['theme', 'palette'],
  ['palette', 'palette'],
  ['moon', 'palette'],
  ['sun moon', 'palette'],
  ['appearance', 'palette'],
  ['globe', 'globe'],
  ['languages', 'globe'],
  ['translate', 'globe'],
  ['language', 'globe'],
]);

for (const [locale, slots] of Object.entries(settingsSlotFixtures)) {
  const recommendationPayload = await recommendIconsForTask({
    task: 'choose icons for a settings page',
    slots,
    locale: locale === 'en' ? null : locale,
    limitPerSlot: 1,
    searchIconsForQuery: async ({ query }) => {
      const id = settingsQueryResultMap.get(query);
      return id ? [{ id, name: id, lib: 'lucide', style: 'outline', svg: '<svg></svg>' }] : [];
    },
    buildIconResult: async (icon) => ({
      id: icon.id,
      name: icon.name,
      library: icon.lib,
      style: icon.style,
      svg: icon.svg,
    }),
    semanticMap: new Map(),
  });

  assert.deepEqual(
    recommendationPayload.results.map((result) => result.recommended?.id),
    ['user', 'bell', 'shield-lock', 'palette', 'globe'],
    `recommend_icons should return semantically correct settings-page slots for ${locale}`
  );
}

for (const locale of expectedLocales) {
  const localeRecord = mcpOutputLocales.locales[locale];
  assert.equal(Object.keys(localeRecord.motionLab.presets).length, 80, `${locale} must include all Motion Lab preset overlays`);
  for (const presetId of ['breathe', 'pulse', 'heartbeat', 'shake', 'spin']) {
    const summary = localizeMotionPresetSummary({
      preset: presetId,
      label: 'English label',
      group: 'Motion',
      description: 'English description',
      supported_triggers: ['loop', 'hover', 'click'],
    }, locale);
    assert.equal(summary.preset, presetId, `${locale}:${presetId} must preserve preset id`);
    assert.ok(summary.localized?.label, `${locale}:${presetId} must include a localized label`);
    assert.ok(summary.localized?.description, `${locale}:${presetId} must include a localized description`);
    assert.notEqual(summary.localized.description, 'English description', `${locale}:${presetId} must not reuse the English test description`);
  }

  const recipe = localizeMotionRecipe({
    preset_id: 'breathe',
    preset: 'Breathe',
    group: 'Motion',
    trigger: 'hover',
  }, locale);
  assert.ok(recipe.localized?.description, `${locale} recipe must include localized Motion Lab description`);
  assert.ok(recipe.localized?.trigger, `${locale} recipe must include localized trigger label`);

  const selectorInstructions = localizeSelectorInstructions('placeholder', '{{ICON_SELECTOR}}', locale);
  assert.ok(selectorInstructions?.includes('{{ICON_SELECTOR}}'), `${locale} selector instructions must preserve placeholder token`);

  const converterOptions = localizeConverterOptions(getConverterMcpOptions(), locale);
  assert.ok(converterOptions.localized?.traceClasses?.['tiny-line-icon']?.bestFor, `${locale} Converter options must include localized tiny-line-icon guidance`);
  assert.equal(converterOptions.pngToSvg.traceClasses[0], 'general-color', `${locale} Converter localization must preserve functional trace class IDs`);
}

console.log('verify-mcp-multilingual-support: ok');
