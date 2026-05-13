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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

const expectedLocales = ['zh-Hans', 'zh-Hant', 'ja', 'ko', 'es', 'de', 'pt', 'ar', 'hi', 'vi', 'th'];

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
  zhHansCatalog,
  jaCatalog,
  arCatalog,
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
  readJson('data/i18n/messages/zh-Hans.json'),
  readJson('data/i18n/messages/ja.json'),
  readJson('data/i18n/messages/ar.json'),
]);

assertIncludesAll(indexSource, expectedLocales, 'stdio MCP search schema');
assertIncludesAll(remoteSource, expectedLocales, 'hosted MCP search schema');
assert.ok(indexSource.includes('locale: z.enum'), 'stdio MCP must expose a locale schema');
assert.ok(remoteSource.includes('locale: z.enum'), 'hosted MCP must expose a locale schema');
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
assert.match(packageJson.description, /multilingual/i, 'MCP package description should mention multilingual search');
assert.match(serverJson.description, /Multilingual/i, 'MCP server registry description should mention multilingual search');

assert.deepEqual(publicAliasData, aliasData, 'public alias artifact must match source');
assert.deepEqual(packagedAliasData, aliasData, 'packaged MCP alias artifact must match source');
assert.deepEqual(aliasData.locales, expectedLocales, 'alias locales must match supported MCP locales');
assert.equal(aliasData.aliases.length, expectedLocales.length * 18, 'alias artifact must include 18 categories per locale');

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

console.log('verify-mcp-multilingual-support: ok');
