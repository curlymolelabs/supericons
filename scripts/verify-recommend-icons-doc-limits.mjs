import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const expectedPhrases = {
  ar: 'من خانة واحدة إلى عشرين خانة واجهة مستخدم',
  de: 'Ein bis zwanzig UI-Slots',
  en: 'One to twenty UI slots',
  es: 'De uno a veinte espacios de UI',
  hi: 'एक से बीस UI स्लॉट',
  ja: '1〜20個のUIスロット',
  ko: '1~20개의 UI 슬롯',
  pt: 'De um a vinte espaços de UI',
  th: 'ตำแหน่ง UI ตั้งแต่หนึ่งถึงยี่สิบตำแหน่ง',
  vi: 'Một đến hai mươi vị trí UI',
  'zh-Hans': '1 到 20 个 UI 位置',
  'zh-Hant': '1 到 20 個 UI 位置',
};

const docsSource = fs.readFileSync('docs-pages.js', 'utf8');
assert.match(docsSource, /One to twenty UI slots/);
assert.doesNotMatch(docsSource, /One to twelve UI slots/);

for (const [locale, expectedPhrase] of Object.entries(expectedPhrases)) {
  const sourcePath = path.join('data', 'i18n', 'messages', `${locale}.json`);
  const publicPath = path.join('public', 'i18n', 'messages', `${locale}.json`);
  const mcpPath = path.join('mcp', 'public', 'i18n', 'messages', `${locale}.json`);
  const sourceText = fs.readFileSync(sourcePath, 'utf8');
  const source = JSON.parse(sourceText);
  const body = source.docs.pages['docs-mcp-icons'].bodyHtml;
  assert.ok(body.includes(expectedPhrase), `${locale} must state the 20-slot recommendation limit.`);
  assert.equal(fs.readFileSync(publicPath, 'utf8'), sourceText);
  assert.equal(fs.readFileSync(mcpPath, 'utf8'), sourceText);
}

console.log(JSON.stringify({
  status: 'ok',
  locale_count: Object.keys(expectedPhrases).length,
  recommendation_slot_limit: 20,
  public_catalogs_match_sources: true,
}, null, 2));
