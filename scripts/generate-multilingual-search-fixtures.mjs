import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { searchIcons } from '../mcp/search.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const outputPath = path.join(rootDir, 'data/i18n/cjk-search-fixtures.json');

const LOCALES = ['zh-Hans', 'zh-Hant', 'ja', 'ko', 'es', 'de', 'pt', 'ar', 'hi', 'vi', 'th'];
const CONCEPTS = [
  'search',
  'settings',
  'menu',
  'save',
  'download',
  'upload',
  'mail',
  'database',
  'code',
  'refresh',
  'chat',
  'phone',
  'music',
  'star',
  'shield',
  'cloud',
  'map',
  'globe',
  'filter',
  'grid',
  'list',
  'zoom',
  'palette',
  'dashboard',
  'question',
  'robot',
  'rocket',
  'bookmark',
  'wallet',
  'bank',
  'store',
  'building',
  'loading',
  'online',
  'login',
  'logout',
  'password',
  'admin',
  'api',
  'git',
  'invoice',
  'receipt',
  'playlist',
  'mute',
  'meeting',
  'support',
  'layer',
  'component',
  'laptop',
  'doctor',
  'restaurant',
  'flight',
  'firewall',
  'vpn',
  'llm',
  'prompt',
  'workflow',
];

function iconId(icon) {
  return `${icon.lib}:${icon.id}`;
}

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(rootDir, relativePath), 'utf8'));
}

const { icons } = await readJson('public/icon-index.json');
const synonyms = await readJson('public/synonyms.json');
const cjkTerms = (await readJson('data/i18n/cjk-search-terms.json')).terms;
const fixtures = [];

for (const locale of LOCALES) {
  for (const concept of CONCEPTS) {
    const record = cjkTerms.find((item) => item.locale === locale && item.concept === concept);
    if (!record) throw new Error(`missing term for ${locale}:${concept}`);
    const query = record.term;
    const localizedResults = searchIcons(query, icons, synonyms, { locale, limit: 8 }).map(iconId);
    const englishResults = searchIcons(concept, icons, synonyms, { limit: 8 }).map(iconId);
    const overlap = localizedResults.filter((id) => englishResults.includes(id));
    const requiredIncluded = (overlap.length >= 2 ? overlap : localizedResults).slice(0, 2);
    if (requiredIncluded.length === 0) throw new Error(`no search results for ${locale}:${concept}:${query}`);

    fixtures.push({
      locale,
      query,
      topN: 8,
      requiredIncluded,
    });
  }
}

await fs.writeFile(outputPath, `${JSON.stringify({ version: 1, fixtures }, null, 2)}\n`, 'utf8');
const counts = Object.fromEntries(LOCALES.map((locale) => [
  locale,
  fixtures.filter((fixture) => fixture.locale === locale).length,
]));
console.log(JSON.stringify({ fixtures: fixtures.length, counts }, null, 2));
