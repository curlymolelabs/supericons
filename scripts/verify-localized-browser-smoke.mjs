import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.SUPERICONS_LOCAL_URL || 'http://127.0.0.1:5173/';

const cases = [
  {
    locale: 'en',
    dir: 'ltr',
    placeholderIncludes: 'Search',
    query: 'settings',
    expectedName: 'settings',
    shellLabels: ['Browse', 'Favorites', 'Recent', 'Libraries', 'Premium Collections', 'Collections', 'Tools', 'Motion Lab', 'Converter', 'Customize', 'Tags'],
  },
  {
    locale: 'de',
    dir: 'ltr',
    placeholderIncludes: 'Icons suchen',
    query: 'rechnung',
    expectedName: 'invoice',
    shellLabels: ['Durchsuchen', 'Favoriten', 'Zuletzt verwendet', 'Bibliotheken', 'Premium-Sammlungen', 'Sammlungen', 'Werkzeuge', 'Motion Lab', 'Konverter', 'Anpassen', 'Tags'],
    customizeLabels: ['Farbe', 'Linienstärke', 'Container', 'Animation', 'Export', 'SVG kopieren'],
    docsLabels: ['Dokumentation', 'Überblick', 'MCP-Einrichtung', 'Supericons-Dokumentation'],
    docsBodyLabels: ['Was diese Seite behandelt', 'Was nicht übersetzt wird'],
  },
  {
    locale: 'zh-Hans',
    dir: 'ltr',
    placeholderIncludes: '搜索',
    query: '设置',
    expectedName: 'settings',
    shellLabels: ['浏览', '收藏', '最近', '库', '高级集合', '集合', '工具', '动效实验室', '转换器', '自定义', '标签'],
    customizeLabels: ['颜色', '容器', '动画', '导出', '复制 SVG'],
    docsLabels: ['文档', '概览', '简介', '快速开始', '什么是 Supericons', 'Supericons 文档'],
    docsBodyLabels: ['本页内容', '保持不翻译的内容', '设置 MCP，学习 Motion Lab，并使用 Converter。'],
    docsForbiddenLabels: ['Introduction', 'Quickstart', 'What Is Supericons', 'Supericons Docs', 'Set up MCP, learn Motion Lab, and use Converter.'],
    docsPages: [
      {
        view: 'docs-claude-code',
        labels: ['Claude Code 设置', '已根据 2026 年 4 月 10 日的官方文档核对。'],
        forbiddenLabels: ['Verified against official documentation as of 10 April 2026.'],
      },
      {
        view: 'docs-codex',
        labels: ['Codex 设置', '已根据 2026 年 4 月 10 日的 Codex 官方文档核对。'],
        forbiddenLabels: ['Verified against official OpenAI Codex documentation as of 10 April 2026.'],
      },
      {
        view: 'docs-cursor',
        labels: ['Cursor 设置', '已根据 2026 年 4 月 10 日的 Cursor 官方文档核对。'],
        forbiddenLabels: ['Verified against official Cursor documentation as of 10 April 2026.'],
      },
    ],
    tagCategoryLabels: ['AI 与自动化', '导航与寻路', '操作与控件', '状态与反馈', '文件与内容'],
    tagForbiddenLabels: ['AI & Automation', 'Navigation & Wayfinding', 'Actions & Controls', 'Status & Feedback', 'Files & Content'],
  },
  {
    locale: 'ar',
    dir: 'rtl',
    placeholderIncludes: 'ابحث',
    query: 'كلمة المرور',
    expectedName: 'password',
    shellLabels: ['تصفح', 'المفضلة', 'الأخيرة', 'المكتبات', 'المجموعات المميزة', 'المجموعات', 'الأدوات', 'مختبر الحركة', 'المحول', 'تخصيص', 'الوسوم'],
  },
  {
    locale: 'th',
    dir: 'ltr',
    placeholderIncludes: 'ค้นหา',
    query: 'ค้นหา',
    expectedName: 'search',
    shellLabels: ['เรียกดู', 'รายการโปรด', 'ล่าสุด', 'ไลบรารี', 'คอลเลกชันพรีเมียม', 'คอลเลกชัน', 'เครื่องมือ', 'Motion Lab', 'ตัวแปลง', 'ปรับแต่ง', 'แท็ก'],
  },
  {
    locale: 'ja',
    dir: 'ltr',
    placeholderIncludes: 'アイコン',
    query: '設定',
    expectedName: 'settings',
    shellLabels: ['ブラウズ', 'お気に入り', '最近', 'ライブラリ', 'プレミアムコレクション', 'コレクション', 'ツール', 'モーションラボ', 'コンバーター', 'カスタマイズ', 'タグ'],
  },
  {
    locale: 'hi',
    dir: 'ltr',
    placeholderIncludes: 'आइकन',
    query: 'चालान',
    expectedName: 'invoice',
    shellLabels: ['ब्राउज़ करें', 'पसंदीदा', 'हाल के', 'लाइब्रेरी', 'प्रीमियम संग्रह', 'संग्रह', 'टूल', 'मोशन लैब', 'कन्वर्टर', 'कस्टमाइज़ करें', 'टैग'],
  },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const consoleErrors = [];
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', (error) => {
  consoleErrors.push(error.message);
});

try {
  for (const item of cases) {
    const url = new URL(baseUrl);
    url.searchParams.set('locale', item.locale);
    await page.goto(url.toString(), { waitUntil: 'commit' });
    await page.waitForSelector('#searchInput', { state: 'visible' });
    await page.waitForFunction(() => document.querySelectorAll('main button[aria-label^="Add "]').length > 0);

    const result = await page.evaluate(async ({ query, expectedName }) => {
      const input = document.querySelector('#searchInput');
      if (!input) return { error: 'missing search input' };

      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      input.focus();
      input.value = query;
      input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: query }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await wait(750);

      const names = Array.from(document.querySelectorAll('main button[aria-label^="Add "]'))
        .slice(0, 16)
        .map((button) => button.getAttribute('aria-label').replace(/^Add\s+|\s+to compare$/g, ''));

      const shellText = [
        ...Array.from(document.querySelectorAll('.sidebar__section-title, .sidebar__item-name, .panel__title'))
          .map((node) => node.textContent.trim()),
        document.querySelector('#useCaseFilterText')?.textContent.trim() || '',
      ];

      window.__supericons?.dismissLanding?.();
      const firstIcon = document.querySelector('.icon-cell');
      firstIcon?.click();
      await wait(250);
      const panelText = document.querySelector('#panel')?.innerText || '';
      document.querySelector('#useCaseFilters')?.click();
      await wait(250);
      const tagMenuText = document.querySelector('#useCaseFilterMenu')?.innerText || '';

      return {
        lang: document.documentElement.lang,
        dir: document.documentElement.dir,
        placeholder: input.getAttribute('placeholder'),
        shellText,
        panelText,
        tagTip: document.querySelector('#useCaseFilters')?.getAttribute('data-tip') || '',
        tagAria: document.querySelector('#useCaseFilters')?.getAttribute('aria-label') || '',
        tagMenuText,
        themeAria: document.querySelector('#themeToggle')?.getAttribute('aria-label') || '',
        names,
        matched: names.some((name) => name.toLowerCase().includes(expectedName)),
      };
    }, item);

    assert.equal(result.error, undefined, `${item.locale}: ${result.error || ''}`);
    assert.equal(result.lang, item.locale, `${item.locale}: html lang mismatch`);
    assert.equal(result.dir, item.dir, `${item.locale}: html dir mismatch`);
    assert.ok(result.placeholder.includes(item.placeholderIncludes), `${item.locale}: placeholder was ${result.placeholder}`);
    for (const label of item.shellLabels) {
      assert.ok(result.shellText.some((text) => text.includes(label)), `${item.locale}: missing localized shell label ${label}`);
    }
    for (const label of item.customizeLabels || []) {
      assert.ok(result.panelText.toLocaleLowerCase().includes(label.toLocaleLowerCase()), `${item.locale}: missing localized customize label ${label}`);
    }
    const expectedTag = item.shellLabels.at(-1);
    assert.equal(result.tagTip, expectedTag, `${item.locale}: tag tooltip mismatch`);
    assert.equal(result.tagAria, expectedTag, `${item.locale}: tag aria label mismatch`);
    for (const label of item.tagCategoryLabels || []) {
      assert.ok(result.tagMenuText.includes(label), `${item.locale}: missing localized tag menu label ${label}`);
    }
    for (const label of item.tagForbiddenLabels || []) {
      assert.ok(!result.tagMenuText.includes(label), `${item.locale}: unlocalized tag menu label leaked ${label}`);
    }
    assert.ok(!/^app\./.test(result.themeAria), `${item.locale}: theme button still shows message key`);
    assert.ok(result.matched, `${item.locale}: expected ${item.expectedName} in ${result.names.join(', ')}`);

    if (item.docsLabels?.length) {
      const docsUrl = new URL(baseUrl);
      docsUrl.searchParams.set('locale', item.locale);
      docsUrl.searchParams.set('view', 'docs');
      await page.goto(docsUrl.toString(), { waitUntil: 'commit' });
      await page.waitForSelector('#docsView', { state: 'visible' });
      await page.waitForFunction(
        (label) => document.querySelector('#docsView')?.innerText.toLocaleLowerCase().includes(label.toLocaleLowerCase()),
        item.docsLabels[0],
      );
      const docsText = await page.locator('#docsView').innerText();
      for (const label of item.docsLabels) {
        assert.ok(docsText.toLocaleLowerCase().includes(label.toLocaleLowerCase()), `${item.locale}: missing localized docs label ${label}`);
      }
      for (const label of item.docsBodyLabels || []) {
        assert.ok(docsText.toLocaleLowerCase().includes(label.toLocaleLowerCase()), `${item.locale}: missing localized docs body label ${label}`);
      }
      for (const label of item.docsForbiddenLabels || []) {
        assert.ok(!docsText.includes(label), `${item.locale}: unlocalized docs label leaked ${label}`);
      }
      assert.ok(!docsText.includes('Start here'), `${item.locale}: English docs body leaked`);
    }
    for (const docsPage of item.docsPages || []) {
      const docsUrl = new URL(baseUrl);
      docsUrl.searchParams.set('locale', item.locale);
      docsUrl.searchParams.set('view', docsPage.view);
      await page.goto(docsUrl.toString(), { waitUntil: 'commit' });
      await page.waitForSelector('#docsView', { state: 'visible' });
      await page.waitForFunction(
        (label) => document.querySelector('#docsView')?.innerText.includes(label),
        docsPage.labels[0],
      );
      const docsText = await page.locator('#docsView').innerText();
      for (const label of docsPage.labels) {
        assert.ok(docsText.includes(label), `${item.locale}:${docsPage.view}: missing localized docs label ${label}`);
      }
      for (const label of docsPage.forbiddenLabels || []) {
        assert.ok(!docsText.includes(label), `${item.locale}:${docsPage.view}: unlocalized docs label leaked ${label}`);
      }
    }
    console.log(`[PASS] ${item.locale}: ${result.placeholder}`);
  }

  assert.deepEqual(consoleErrors, [], `browser console errors: ${consoleErrors.join('\n')}`);
  console.log('verify-localized-browser-smoke: ok');
} finally {
  await browser.close();
}
