import fs from 'node:fs';
import path from 'node:path';

const notesByLocale = {
  en: {
    default: 'Verified against official documentation as of 10 April 2026.',
    codex: 'Verified against official Codex documentation as of 10 April 2026.',
    cursor: 'Verified against official Cursor documentation as of 10 April 2026.',
  },
  'zh-Hans': {
    default: '已根据 2026 年 4 月 10 日的官方文档核对。',
    codex: '已根据 2026 年 4 月 10 日的 Codex 官方文档核对。',
    cursor: '已根据 2026 年 4 月 10 日的 Cursor 官方文档核对。',
  },
  'zh-Hant': {
    default: '已根據 2026 年 4 月 10 日的官方文件核對。',
    codex: '已根據 2026 年 4 月 10 日的 Codex 官方文件核對。',
    cursor: '已根據 2026 年 4 月 10 日的 Cursor 官方文件核對。',
  },
  ja: {
    default: '2026年4月10日時点の公式ドキュメントで確認済みです。',
    codex: '2026年4月10日時点のCodex公式ドキュメントで確認済みです。',
    cursor: '2026年4月10日時点のCursor公式ドキュメントで確認済みです。',
  },
  ko: {
    default: '2026년 4월 10일 기준 공식 문서를 확인했습니다.',
    codex: '2026년 4월 10일 기준 Codex 공식 문서를 확인했습니다.',
    cursor: '2026년 4월 10일 기준 Cursor 공식 문서를 확인했습니다.',
  },
  es: {
    default: 'Verificado con la documentación oficial al 10 de abril de 2026.',
    codex: 'Verificado con la documentación oficial de Codex al 10 de abril de 2026.',
    cursor: 'Verificado con la documentación oficial de Cursor al 10 de abril de 2026.',
  },
  de: {
    default: 'Anhand der offiziellen Dokumentation mit Stand vom 10. April 2026 geprüft.',
    codex: 'Anhand der offiziellen Codex-Dokumentation mit Stand vom 10. April 2026 geprüft.',
    cursor: 'Anhand der offiziellen Cursor-Dokumentation mit Stand vom 10. April 2026 geprüft.',
  },
  pt: {
    default: 'Verificado com a documentação oficial em 10 de abril de 2026.',
    codex: 'Verificado com a documentação oficial do Codex em 10 de abril de 2026.',
    cursor: 'Verificado com a documentação oficial do Cursor em 10 de abril de 2026.',
  },
  ar: {
    default: 'تم التحقق وفقًا للوثائق الرسمية بتاريخ 10 أبريل 2026.',
    codex: 'تم التحقق وفقًا لوثائق Codex الرسمية بتاريخ 10 أبريل 2026.',
    cursor: 'تم التحقق وفقًا لوثائق Cursor الرسمية بتاريخ 10 أبريل 2026.',
  },
  hi: {
    default: '10 अप्रैल 2026 तक के आधिकारिक दस्तावेज़ों से सत्यापित।',
    codex: '10 अप्रैल 2026 तक के आधिकारिक Codex दस्तावेज़ों से सत्यापित।',
    cursor: '10 अप्रैल 2026 तक के आधिकारिक Cursor दस्तावेज़ों से सत्यापित।',
  },
  vi: {
    default: 'Đã kiểm tra theo tài liệu chính thức tính đến ngày 10 tháng 4 năm 2026.',
    codex: 'Đã kiểm tra theo tài liệu chính thức của Codex tính đến ngày 10 tháng 4 năm 2026.',
    cursor: 'Đã kiểm tra theo tài liệu chính thức của Cursor tính đến ngày 10 tháng 4 năm 2026.',
  },
  th: {
    default: 'ตรวจสอบกับเอกสารทางการ ณ วันที่ 10 เมษายน 2026 แล้ว',
    codex: 'ตรวจสอบกับเอกสารทางการของ Codex ณ วันที่ 10 เมษายน 2026 แล้ว',
    cursor: 'ตรวจสอบกับเอกสารทางการของ Cursor ณ วันที่ 10 เมษายน 2026 แล้ว',
  },
};

for (const [locale, notes] of Object.entries(notesByLocale)) {
  const file = path.join('data/i18n/messages', `${locale}.json`);
  const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));

  catalog.docs.pages['docs-claude-code'].verifiedNote = notes.default;
  catalog.docs.pages['docs-codex'].verifiedNote = notes.codex;
  catalog.docs.pages['docs-cursor'].verifiedNote = notes.cursor;

  fs.writeFileSync(file, `${JSON.stringify(catalog, null, 2)}\n`);
}

console.log('add-docs-verified-note-localization: ok');
