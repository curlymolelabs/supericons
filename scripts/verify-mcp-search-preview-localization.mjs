import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../lib/i18n/locales.js';

const VIEW_ID = 'docs-mcp-search-guide';
const CATALOG_DIRS = [
  'data/i18n/messages',
  'public/i18n/messages',
  'mcp/public/i18n/messages',
];
const EXPECTED_TOOL_ORDER = [
  'search_icons',
  'preview_icons',
  'recommend_icons',
  'get_icon',
  'list_libraries',
];

const ENGLISH_REQUIRED = [
  '<code>preview_icons</code>',
  'See icons before choosing',
  'Preview visually',
  'Show me a visual preview first, then list the icon refs.',
];

const NON_ENGLISH_FORBIDDEN = [
  'See icons before choosing',
  'Preview visually',
  'Show me a visual preview first, then list the icon refs.',
  'Recommend icons for an AI dashboard',
  'Ask for <code>response_mode: "plan"</code> when you want compact output.',
  'Get the SVG for <code>database</code> from Iconoir.',
  'Show me the top 5 choices with icon id, library, and a short reason.',
  'Get the SVG for the best result.',
  'Use the best Lucide result and add it to this button.',
  'Give me three alternatives if the first one feels too generic.',
  'For multilingual search, keep tool names and icon IDs in English',
  'Supported locale values are',
];

const EXPECTED_LOCALIZED_SNIPPETS = {
  es: [
    'Ver iconos antes de elegir',
    'Vista previa visual',
    'Muéstrame primero una vista previa visual y luego enumera las referencias de iconos.',
  ],
  de: [
    'Symbole vor der Auswahl ansehen',
    'Visuell vorschauen',
    'Zeige mir zuerst eine visuelle Vorschau und liste danach die Symbolreferenzen auf.',
  ],
  pt: [
    'Ver ícones antes de escolher',
    'Prévia visual',
    'Mostre primeiro uma prévia visual e depois liste as referências dos ícones.',
  ],
  ja: [
    '選ぶ前にアイコンを見る',
    '視覚的にプレビュー',
    'まず視覚的なプレビューを見せてから、アイコン参照を一覧にしてください。',
  ],
  ko: [
    '선택하기 전에 아이콘 보기',
    '시각적으로 미리보기',
    '먼저 시각적 미리보기를 보여 준 다음 아이콘 참조를 나열해 주세요.',
  ],
  'zh-Hans': [
    '选择前先查看图标',
    '视觉预览',
    '先显示视觉预览，然后列出图标引用。',
  ],
  'zh-Hant': [
    '選擇前先查看圖示',
    '視覺預覽',
    '先顯示視覺預覽，然後列出圖示引用。',
  ],
  ar: [
    'مشاهدة الأيقونات قبل الاختيار',
    'معاينة مرئية',
    'اعرض لي أولًا معاينة مرئية، ثم اذكر مراجع الأيقونات.',
  ],
  hi: [
    'चुनने से पहले आइकन देखें',
    'दृश्य पूर्वावलोकन',
    'पहले दृश्य पूर्वावलोकन दिखाएँ, फिर आइकन संदर्भ सूचीबद्ध करें।',
  ],
  vi: [
    'Xem biểu tượng trước khi chọn',
    'Xem trước trực quan',
    'Trước tiên hãy hiển thị bản xem trước trực quan, sau đó liệt kê các tham chiếu biểu tượng.',
  ],
  th: [
    'ดูไอคอนก่อนเลือก',
    'ดูตัวอย่างแบบภาพ',
    'แสดงตัวอย่างภาพก่อน จากนั้นแสดงรายการอ้างอิงไอคอน',
  ],
};

function getPage(catalog, locale, dir) {
  const page = catalog?.docs?.pages?.[VIEW_ID];
  assert.ok(page, `${dir}/${locale}: missing ${VIEW_ID}`);
  assert.equal(typeof page.bodyHtml, 'string', `${dir}/${locale}: missing bodyHtml`);
  return page;
}

async function readCatalog(dir, locale) {
  const file = path.join(dir, `${locale}.json`);
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

function stripTags(html) {
  return String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function previewRowText(body) {
  const match = toolTableRows(body).find((row) => row.includes('<code>preview_icons</code>'))?.match(
    /<tr><td>([\s\S]*?)<\/td><td><code>preview_icons<\/code><\/td><td>([\s\S]*?)<\/td><\/tr>/,
  );
  assert.ok(match, 'missing preview_icons table row');
  return [stripTags(match[1]), stripTags(match[2])];
}

function toolTableRows(body) {
  const table = body.match(/<section class="docs-section" id="mcp-search-tools">[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/)?.[1] || '';
  return [...table.matchAll(/<tr>[\s\S]*?<\/tr>/g)].map((match) => match[0]);
}

function toolOrder(body) {
  return toolTableRows(body).map((row) => row.match(/<td><code>(.*?)<\/code><\/td>/)?.[1] || '');
}

function previewCardText(body) {
  const cards = [...body.matchAll(/<article class="docs-card">[\s\S]*?<\/article>/g)].map((match) => match[0]);
  const card = cards.find((value) => value.includes('ai slop') && value.includes('smart automation'));
  assert.ok(card, 'missing visual preview prompt card');
  return stripTags(card);
}

function outputPromptText(body) {
  const match = body.match(/<code id="docs-mcp-search-output-prompts">([\s\S]*?)<\/code>/);
  assert.ok(match, 'missing output prompt code block');
  return stripTags(match[1]);
}

const sourcePages = new Map();
for (const locale of SUPPORTED_LOCALES) {
  const catalog = await readCatalog(CATALOG_DIRS[0], locale);
  sourcePages.set(locale, getPage(catalog, locale, CATALOG_DIRS[0]));
}

for (const dir of CATALOG_DIRS) {
  for (const locale of SUPPORTED_LOCALES) {
    const catalog = await readCatalog(dir, locale);
    const page = getPage(catalog, locale, dir);
    const body = page.bodyHtml;
    const rowText = previewRowText(body).join(' ');
    const cardText = previewCardText(body);
    const outputText = outputPromptText(body);

    assert.ok(
      body.includes('<code>preview_icons</code>'),
      `${dir}/${locale}: missing preview_icons tool guidance`,
    );
    assert.deepEqual(
      toolOrder(body),
      EXPECTED_TOOL_ORDER,
      `${dir}/${locale}: MCP search guide tool table must keep all five tools in order`,
    );

    if (locale === DEFAULT_LOCALE) {
      for (const snippet of ENGLISH_REQUIRED) {
        assert.ok(body.includes(snippet), `${dir}/${locale}: missing English preview snippet: ${snippet}`);
      }
      continue;
    }

    for (const snippet of NON_ENGLISH_FORBIDDEN) {
      assert.ok(
        !body.includes(snippet),
        `${dir}/${locale}: MCP search guide still contains untranslated English snippet: ${snippet}`,
      );
    }

    for (const snippet of EXPECTED_LOCALIZED_SNIPPETS[locale] || []) {
      assert.ok(body.includes(snippet), `${dir}/${locale}: missing localized preview snippet: ${snippet}`);
    }

    assert.ok(rowText.includes('ai slop') || cardText.includes('ai slop'), `${dir}/${locale}: missing shared preview example query`);
    assert.ok(cardText.includes('smart automation'), `${dir}/${locale}: missing shared comparison example query`);
    assert.ok(
      cardText.includes('license plate recognition camera scan car'),
      `${dir}/${locale}: missing shared long-query preview example`,
    );

    assert.ok(!/\?{3,}/.test(rowText), `${dir}/${locale}: preview row contains replacement question marks`);
    assert.ok(!/\?{3,}/.test(cardText), `${dir}/${locale}: preview card contains replacement question marks`);
    assert.ok(!/\?{3,}/.test(outputText), `${dir}/${locale}: preview output prompt contains replacement question marks`);

    if (dir !== CATALOG_DIRS[0]) {
      assert.equal(
        body,
        sourcePages.get(locale).bodyHtml,
        `${dir}/${locale}: public catalog is not synced from data source`,
      );
    }
  }
}

console.log('verify-mcp-search-preview-localization: ok');
