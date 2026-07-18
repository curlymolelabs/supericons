import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DOCS_PAGES } from '../docs-pages.js';
import { SUPPORTED_LOCALES } from '../lib/i18n/locales.js';
import {
  MCP_CLIENT_CONFIGS,
  assertMcpClientConfig,
} from '../lib/mcp-client-configs.js';

const catalogDirs = [
  'data/i18n/messages',
  'public/i18n/messages',
  'mcp/public/i18n/messages',
];

const keylessIntroByLocale = Object.freeze({
  ar: 'لا تحتاج إلى مفتاح API للبحث عن الرموز المجانية أو معاينتها أو استردادها أو إدراجها من خلال MCP المحلي أو المستضاف. أضف مفتاحًا فقط عندما تحتاج الأداة المدعومة إلى الوصول المرتبط بحساب Supericons الخاص بك.',
  de: 'Sie benötigen keinen API-Schlüssel, um kostenlose Symbole über lokales oder gehostetes MCP zu suchen, in der Vorschau anzuzeigen, abzurufen oder aufzulisten. Fügen Sie einen Schlüssel nur hinzu, wenn ein unterstütztes Tool Zugriff benötigt, der an Ihr Supericons-Konto gebunden ist.',
  en: 'You do not need an API key to search, preview, retrieve, or list free icons through local or hosted MCP. Add a key only when a supported tool needs access tied to your Supericons account.',
  es: 'No necesita una clave API para buscar, obtener una vista previa, recuperar o enumerar íconos gratuitos a través de MCP local o alojado. Agregue una clave solo cuando una herramienta compatible necesite acceso vinculado a su cuenta Supericons.',
  hi: 'आपको स्थानीय या होस्ट किए गए MCP के माध्यम से मुफ्त आइकन खोजने, पूर्वावलोकन करने, पुनर्प्राप्त करने या सूचीबद्ध करने के लिए API कुंजी की आवश्यकता नहीं है। कुंजी तभी जोड़ें जब किसी समर्थित टूल को आपके Supericons खाते से जुड़ी पहुंच की आवश्यकता हो।',
  ja: 'ローカルまたはホストされた MCP を通じて無料のアイコンを検索、プレビュー、取得、または一覧表示するために、API キーは必要ありません。サポートされているツールが Supericons アカウントに関連付けられたアクセスを必要とする場合にのみキーを追加します。',
  ko: '로컬 또는 호스팅된 MCP를 통해 무료 아이콘을 검색, 미리보기, 검색 또는 나열하는 데 API 키가 필요하지 않습니다. 지원되는 도구에 Supericons 계정에 연결된 액세스가 필요한 경우에만 키를 추가하세요.',
  pt: 'Você não precisa de uma chave API para pesquisar, visualizar, recuperar ou listar ícones gratuitos por meio de MCP local ou hospedado. Adicione uma chave somente quando uma ferramenta compatível precisar de acesso vinculado à sua conta Supericons.',
  th: 'คุณไม่จำเป็นต้องใช้คีย์ API เพื่อค้นหา ดูตัวอย่าง ดึงข้อมูล หรือแสดงรายการไอคอนฟรีผ่าน MCP ในเครื่องหรือที่โฮสต์ เพิ่มคีย์เฉพาะเมื่อเครื่องมือที่รองรับต้องการเข้าถึงที่เชื่อมโยงกับบัญชี Supericons ของคุณ',
  vi: 'Bạn không cần khóa API để tìm kiếm, xem trước, truy xuất hoặc liệt kê các biểu tượng miễn phí thông qua MCP cục bộ hoặc được lưu trữ. Chỉ thêm khóa khi công cụ được hỗ trợ cần quyền truy cập được liên kết với tài khoản Supericons của bạn.',
  'zh-Hans': '您不需要 API 密钥即可通过本地或托管 MCP 搜索、预览、检索或列出免费图标。仅当支持的工具需要与您的 Supericons 帐户绑定的访问权限时才添加密钥。',
  'zh-Hant': '您不需要 API 金鑰即可透過本機或託管 MCP 搜尋、預覽、擷取或列出免費圖示。僅當支援的工具需要與您的 Supericons 帳戶綁定的存取權限時才新增金鑰。',
});

const staleEnglishClaims = [
  'Is required for MCP and other programmatic workflows.',
  'You need SUPERICONS_API_KEY when you use Supericons through Claude Code, Codex, Cursor, or another MCP client.',
  'Use an API key from your Supericons account for MCP and other app integrations.',
];

const englishPage = DOCS_PAGES['docs-access-api-keys'];
assert.ok(englishPage, 'English API-key docs page is missing.');
assert.ok(
  englishPage.bodyHtml.includes(keylessIntroByLocale.en),
  'English API-key docs must state the complete keyless free-MCP contract.',
);
assert.ok(
  englishPage.bodyHtml.includes('Today, API keys are available to accounts with an active Pro subscription or at least one pack purchase.'),
  'English API-key docs must state current key eligibility.',
);
for (const staleClaim of staleEnglishClaims) {
  assert.ok(!englishPage.bodyHtml.includes(staleClaim), `Stale API-key claim remains: ${staleClaim}`);
  assert.ok(!englishPage.summary.includes(staleClaim), `Stale API-key summary remains: ${staleClaim}`);
}

for (const config of MCP_CLIENT_CONFIGS) {
  assert.equal(assertMcpClientConfig(config), true);
}
assert.equal(new Set(MCP_CLIENT_CONFIGS.map((config) => config.id)).size, 7);

for (const locale of SUPPORTED_LOCALES) {
  const sourcePath = path.join(catalogDirs[0], `${locale}.json`);
  const sourceRaw = await fs.readFile(sourcePath, 'utf8');
  const source = JSON.parse(sourceRaw);
  const page = source.docs?.pages?.['docs-access-api-keys'];
  assert.ok(page, `${locale}: API-key docs page is missing.`);
  assert.ok(
    page.bodyHtml.includes(keylessIntroByLocale[locale]),
    `${locale}: API-key docs are missing the reviewed keyless free-MCP statement.`,
  );
  assert.equal(typeof source.landing?.mcpKeylessNote, 'string', `${locale}: landing keyless note is missing.`);
  assert.ok(source.landing.mcpKeylessNote.trim().length >= 8, `${locale}: landing keyless note is too short.`);
  for (const key of ['chooseMcpClient', 'configFile', 'copied']) {
    assert.equal(typeof source.landing?.[key], 'string', `${locale}: landing.${key} is missing.`);
    assert.ok(source.landing[key].trim(), `${locale}: landing.${key} is empty.`);
  }

  for (const outputDir of catalogDirs.slice(1)) {
    const outputRaw = await fs.readFile(path.join(outputDir, `${locale}.json`), 'utf8');
    assert.equal(outputRaw, sourceRaw, `${outputDir}/${locale}: generated catalog differs from its source.`);
  }
}

const publicClaimFiles = [
  'index.html',
  'docs-pages.js',
  'store.js',
  'mcp/package.json',
  'lib/docs-guide-config.js',
];
for (const file of publicClaimFiles) {
  const value = await fs.readFile(file, 'utf8');
  for (const staleClaim of staleEnglishClaims) {
    assert.ok(!value.includes(staleClaim), `${file}: stale API-key claim remains.`);
  }
}

console.log('verify-mcp-access-claims: ok');
