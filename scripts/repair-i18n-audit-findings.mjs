import fs from 'node:fs';
import path from 'node:path';

throw new Error('Archived unsafe script: do not rewrite docs bodies with generic localized copy. Use targeted audit fixes or verified docs-body localization batches instead.');

const messagesDir = path.join('data', 'i18n', 'messages');
const locales = fs.readdirSync(messagesDir).filter((file) => file.endsWith('.json')).map((file) => file.replace(/\.json$/, ''));

function merge(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) target[key] = {};
      merge(target[key], value);
    } else {
      target[key] = value;
    }
  }
}

function legalHtml(updated, sections) {
  return `<div class="terms-content"><p class="terms-content__updated">${updated}</p>${sections.map((section) => `<section class="terms-section"><h3 class="terms-section__title">${section.title}</h3>${section.body.map((line) => `<p>${line}</p>`).join('')}</section>`).join('')}</div>`;
}

const common = {
  'zh-Hans': {
    confirm: ['这会移除此浏览器中保存的所有收藏。不会影响你的账户或已购买的图标包。', '这会移除此浏览器中的最近图标历史。不会影响收藏、购买或账户访问。', '这只会影响当前浏览器中保存的数据。', '此设备', '只会影响此浏览器的存储。'],
    toast: ['已清除此设备上的收藏', '已清除此设备上的最近图标'],
    authNote: '免费账户。使用免费图标不需要银行卡。',
  },
  'zh-Hant': {
    confirm: ['這會移除此瀏覽器中儲存的所有收藏。不會影響你的帳戶或已購買的圖示包。', '這會移除此瀏覽器中的最近圖示記錄。不會影響收藏、購買或帳戶存取。', '這只會影響目前瀏覽器中儲存的資料。', '此裝置', '只會影響此瀏覽器的儲存空間。'],
    toast: ['已清除此裝置上的收藏', '已清除此裝置上的最近圖示'],
    authNote: '免費帳戶。使用免費圖示不需要信用卡。',
  },
  ja: {
    confirm: ['このブラウザに保存されたすべてのお気に入りを削除します。アカウントや購入済みパックには影響しません。', 'このブラウザに保存された最近使ったアイコン履歴を削除します。お気に入り、購入、アカウントアクセスには影響しません。', '現在のブラウザに保存されたデータだけに影響します。', 'このデバイス', 'このブラウザの保存データだけが対象です。'],
    toast: ['このデバイスのお気に入りを削除しました', 'このデバイスの最近使ったアイコンを削除しました'],
    authNote: '無料アカウントです。無料アイコンにカードは不要です。',
  },
  ko: {
    confirm: ['이 브라우저에 저장된 모든 즐겨찾기를 제거합니다. 계정이나 구매한 팩에는 영향을 주지 않습니다.', '이 브라우저에 저장된 최근 아이콘 기록을 제거합니다. 즐겨찾기, 구매, 계정 접근에는 영향을 주지 않습니다.', '현재 브라우저에 저장된 데이터에만 영향을 줍니다.', '이 기기', '이 브라우저 저장소만 영향을 받습니다.'],
    toast: ['이 기기의 즐겨찾기를 지웠습니다', '이 기기의 최근 아이콘을 지웠습니다'],
    authNote: '무료 계정입니다. 무료 아이콘에는 카드가 필요하지 않습니다.',
  },
  es: {
    confirm: ['Esto elimina todos los favoritos guardados en este navegador. No afecta tu cuenta ni los packs comprados.', 'Esto elimina el historial reciente de iconos guardado en este navegador. No afecta favoritos, compras ni acceso a la cuenta.', 'Esto solo afecta los datos guardados en el navegador actual.', 'Este dispositivo', 'Solo se ve afectado el almacenamiento de este navegador.'],
    toast: ['Favoritos borrados en este dispositivo', 'Iconos recientes borrados en este dispositivo'],
    authNote: 'Cuenta gratuita. No se necesita tarjeta para usar iconos gratuitos.',
  },
  de: {
    confirm: ['Dadurch werden alle in diesem Browser gespeicherten Favoriten entfernt. Dein Konto und gekaufte Pakete bleiben unverändert.', 'Dadurch wird der in diesem Browser gespeicherte Verlauf der zuletzt verwendeten Icons entfernt. Favoriten, Käufe und Kontozugriff bleiben unverändert.', 'Dies betrifft nur Daten, die im aktuellen Browser gespeichert sind.', 'Dieses Gerät', 'Nur der Speicher dieses Browsers ist betroffen.'],
    toast: ['Favoriten auf diesem Gerät gelöscht', 'Zuletzt verwendete Icons auf diesem Gerät gelöscht'],
    authNote: 'Kostenloses Konto. Für kostenlose Icons ist keine Karte erforderlich.',
  },
  pt: {
    confirm: ['Isso remove todos os favoritos salvos neste navegador. Não afeta sua conta nem os pacotes comprados.', 'Isso remove o histórico recente de ícones salvo neste navegador. Não afeta favoritos, compras nem acesso à conta.', 'Isso afeta apenas os dados salvos no navegador atual.', 'Este dispositivo', 'Apenas o armazenamento deste navegador é afetado.'],
    toast: ['Favoritos apagados neste dispositivo', 'Ícones recentes apagados neste dispositivo'],
    authNote: 'Conta gratuita. Não é necessário cartão para usar ícones gratuitos.',
  },
  ar: {
    confirm: ['يزيل هذا كل المفضلات المحفوظة في هذا المتصفح. لا يؤثر في حسابك أو الحزم التي اشتريتها.', 'يزيل هذا سجل الأيقونات الحديثة المحفوظ في هذا المتصفح. لا يؤثر في المفضلات أو المشتريات أو الوصول إلى الحساب.', 'يؤثر هذا فقط في البيانات المحفوظة في المتصفح الحالي.', 'هذا الجهاز', 'يتأثر تخزين هذا المتصفح فقط.'],
    toast: ['تم مسح المفضلات على هذا الجهاز', 'تم مسح الأيقونات الحديثة على هذا الجهاز'],
    authNote: 'حساب مجاني. لا تحتاج إلى بطاقة لاستخدام الأيقونات المجانية.',
  },
  hi: {
    confirm: ['यह इस ब्राउज़र में सेव किए गए सभी पसंदीदा आइकन हटाता है। इससे आपके खाते या खरीदे गए पैक पर असर नहीं पड़ता।', 'यह इस ब्राउज़र में सेव किया गया हाल का आइकन इतिहास हटाता है। इससे पसंदीदा, खरीदारी या खाते की पहुंच पर असर नहीं पड़ता।', 'यह केवल मौजूदा ब्राउज़र में सेव डेटा को प्रभावित करता है।', 'यह डिवाइस', 'केवल इस ब्राउज़र का स्टोरेज प्रभावित होता है।'],
    toast: ['इस डिवाइस पर पसंदीदा साफ़ किए गए', 'इस डिवाइस पर हाल के आइकन साफ़ किए गए'],
    authNote: 'मुफ्त खाता। मुफ्त आइकन के लिए कार्ड की जरूरत नहीं है।',
  },
  vi: {
    confirm: ['Thao tác này xóa mọi mục yêu thích đã lưu trong trình duyệt này. Tài khoản và các gói đã mua không bị ảnh hưởng.', 'Thao tác này xóa lịch sử biểu tượng gần đây đã lưu trong trình duyệt này. Mục yêu thích, giao dịch mua và quyền truy cập tài khoản không bị ảnh hưởng.', 'Thao tác này chỉ ảnh hưởng đến dữ liệu lưu trong trình duyệt hiện tại.', 'Thiết bị này', 'Chỉ bộ nhớ của trình duyệt này bị ảnh hưởng.'],
    toast: ['Đã xóa mục yêu thích trên thiết bị này', 'Đã xóa biểu tượng gần đây trên thiết bị này'],
    authNote: 'Tài khoản miễn phí. Không cần thẻ để dùng biểu tượng miễn phí.',
  },
  th: {
    confirm: ['การดำเนินการนี้จะลบรายการโปรดทั้งหมดที่บันทึกในเบราว์เซอร์นี้ โดยไม่กระทบบัญชีหรือแพ็กที่ซื้อไว้', 'การดำเนินการนี้จะลบประวัติไอคอนล่าสุดที่บันทึกในเบราว์เซอร์นี้ โดยไม่กระทบรายการโปรด การซื้อ หรือการเข้าถึงบัญชี', 'การดำเนินการนี้มีผลเฉพาะข้อมูลที่บันทึกในเบราว์เซอร์ปัจจุบัน', 'อุปกรณ์นี้', 'มีผลเฉพาะพื้นที่เก็บข้อมูลของเบราว์เซอร์นี้'],
    toast: ['ล้างรายการโปรดบนอุปกรณ์นี้แล้ว', 'ล้างไอคอนล่าสุดบนอุปกรณ์นี้แล้ว'],
    authNote: 'บัญชีฟรี ไม่ต้องใช้บัตรสำหรับไอคอนฟรี',
  },
};

const docsOverrides = {
  de: {
    'docs-mcp-others': ['Andere MCP-Clients', 'MCP-Einrichtung', 'Andere MCP-Clients', 'Nutze Supericons mit anderen Clients, die MCP unterstützen.'],
    'docs-access-premium': ['Pro und Sammlungen', 'Zugriff und API-Schlüssel', 'Pro und Sammlungen', 'Gekaufte Pakete schalten genau diese Icons frei. Motion Lab und Converter gehören zum Supericons Pro-Tarif.'],
    'docs-motion-lab': ['Motion Lab', 'Motion Lab', 'Motion Lab', 'Sieh Icon-Animationen in der Vorschau an und exportiere sie.'],
    'docs-troubleshooting': ['Fehlerbehebung', 'Hilfe', 'Fehlerbehebung', 'Behebe häufige Probleme mit MCP-Einrichtung, API-Schlüsseln, Motion Lab und Converter.'],
  },
  pt: {
    'docs-mcp-others': ['Outros clientes MCP', 'Configuração do MCP', 'Outros clientes MCP', 'Use o Supericons com outros clientes compatíveis com MCP.'],
    'docs-access-premium': ['Pro e coleções', 'Acesso e chaves de API', 'Pro e coleções', 'Comprar pacotes libera esses ícones. Motion Lab e Converter fazem parte do plano Supericons Pro.'],
    'docs-motion-lab': ['Motion Lab', 'Motion Lab', 'Motion Lab', 'Pré-visualize e exporte animações de ícones.'],
    'docs-troubleshooting': ['Solução de problemas', 'Suporte', 'Solução de problemas', 'Corrija problemas comuns com configuração de MCP, chaves de API, Motion Lab e Converter.'],
  },
  ar: {
    'docs-mcp-others': ['عملاء MCP آخرون', 'إعداد MCP', 'عملاء MCP آخرون', 'استخدم Supericons مع عملاء آخرين يدعمون MCP.'],
    'docs-access-premium': ['Pro والمجموعات', 'الوصول ومفاتيح API', 'Pro والمجموعات', 'شراء الحزم يفتح تلك الأيقونات. Motion Lab و Converter جزء من خطة Supericons Pro.'],
    'docs-motion-lab': ['Motion Lab', 'Motion Lab', 'Motion Lab', 'عاين حركات الأيقونات وصدّرها.'],
    'docs-troubleshooting': ['استكشاف الأخطاء وإصلاحها', 'الدعم', 'استكشاف الأخطاء وإصلاحها', 'أصلح المشكلات الشائعة في إعداد MCP ومفاتيح API و Motion Lab و Converter.'],
  },
  hi: {
    'docs-mcp-others': ['अन्य MCP क्लाइंट', 'MCP सेटअप', 'अन्य MCP क्लाइंट', 'Supericons को MCP समर्थित अन्य क्लाइंट में इस्तेमाल करें।'],
    'docs-access-premium': ['Pro और संग्रह', 'एक्सेस और API कुंजियां', 'Pro और संग्रह', 'पैक खरीदने से वही आइकन खुलते हैं। Motion Lab और Converter Supericons Pro प्लान का हिस्सा हैं।'],
    'docs-motion-lab': ['Motion Lab', 'Motion Lab', 'Motion Lab', 'आइकन एनिमेशन का पूर्वावलोकन करें और निर्यात करें।'],
    'docs-troubleshooting': ['समस्या निवारण', 'सहायता', 'समस्या निवारण', 'MCP सेटअप, API कुंजियों, Motion Lab और Converter की सामान्य समस्याएं ठीक करें।'],
  },
  vi: {
    'docs-mcp-others': ['Client MCP khác', 'Thiết lập MCP', 'Client MCP khác', 'Dùng Supericons với các client khác hỗ trợ MCP.'],
    'docs-access-premium': ['Pro và bộ sưu tập', 'Truy cập và khóa API', 'Pro và bộ sưu tập', 'Mua gói sẽ mở các biểu tượng trong gói đó. Motion Lab và Converter thuộc gói Supericons Pro.'],
    'docs-motion-lab': ['Motion Lab', 'Motion Lab', 'Motion Lab', 'Xem trước và xuất hoạt ảnh biểu tượng.'],
    'docs-troubleshooting': ['Khắc phục sự cố', 'Hỗ trợ', 'Khắc phục sự cố', 'Sửa các vấn đề thường gặp với thiết lập MCP, khóa API, Motion Lab và Converter.'],
  },
  th: {
    'docs-mcp-others': ['ไคลเอนต์ MCP อื่น', 'การตั้งค่า MCP', 'ไคลเอนต์ MCP อื่น', 'ใช้ Supericons กับไคลเอนต์อื่นที่รองรับ MCP'],
    'docs-access-premium': ['Pro และคอลเลกชัน', 'การเข้าถึงและคีย์ API', 'Pro และคอลเลกชัน', 'การซื้อแพ็กจะปลดล็อกไอคอนในแพ็กนั้น Motion Lab และ Converter อยู่ในแผน Supericons Pro'],
    'docs-motion-lab': ['Motion Lab', 'Motion Lab', 'Motion Lab', 'ดูตัวอย่างและส่งออกแอนิเมชันไอคอน'],
    'docs-troubleshooting': ['การแก้ไขปัญหา', 'การสนับสนุน', 'การแก้ไขปัญหา', 'แก้ปัญหาทั่วไปเกี่ยวกับการตั้งค่า MCP คีย์ API Motion Lab และ Converter'],
  },
};

const docsLeakSnippets = [
  'Comprar packs te da esos iconos. Motion Lab y Converter forman parte del plan Supericons Pro.',
  'Previsualiza y exporta animaciones de iconos.',
  'Corrige problemas comunes con la configuración de MCP, claves API, Motion Lab y Converter.',
];

const docsBodyCopy = {
  de: {
    covers: 'Was diese Seite behandelt',
    steps: 'Praktische Schritte',
    note: 'Was nicht übersetzt wird',
    guide: (title) => `Diese lokalisierte Anleitung erklärt ${title}. Wichtige Befehle und Konfigurationswerte bleiben unverändert.`,
    items: ['Prüfe zuerst die Zusammenfassung, damit du auf der passenden Einrichtungsseite bist.', 'Kopiere Befehle, Paketnamen und Umgebungsvariablen unverändert.', 'Starte deinen MCP-Client nach Änderungen an der Konfiguration neu.'],
    code: 'Befehle, Paketnamen, Umgebungsvariablen, Tool-IDs und Konfigurationsfelder bleiben absichtlich unverändert, damit Beispiele funktionieren.',
  },
  pt: {
    covers: 'O que esta página cobre',
    steps: 'Passos práticos',
    note: 'O que não é traduzido',
    guide: (title) => `Este guia localizado explica ${title}. Comandos e valores de configuração importantes permanecem sem tradução.`,
    items: ['Leia o resumo primeiro para confirmar que esta é a página certa para sua configuração.', 'Copie comandos, nomes de pacote e variáveis de ambiente sem traduzir.', 'Reinicie o cliente MCP depois de mudar a configuração.'],
    code: 'Comandos, nomes de pacote, variáveis de ambiente, IDs de ferramenta e campos de configuração ficam no original para que os exemplos funcionem.',
  },
  ar: {
    covers: 'ما تغطيه هذه الصفحة',
    steps: 'خطوات عملية',
    note: 'ما لا تتم ترجمته',
    guide: (title) => `يشرح هذا الدليل المحلي ${title}. تبقى الأوامر وقيم الإعداد المهمة كما هي دون ترجمة.`,
    items: ['اقرأ الملخص أولا للتأكد من أن هذه الصفحة تناسب إعدادك.', 'انسخ الأوامر وأسماء الحزم ومتغيرات البيئة دون ترجمتها.', 'أعد تشغيل عميل MCP بعد تغيير الإعدادات.'],
    code: 'تبقى الأوامر وأسماء الحزم ومتغيرات البيئة ومعرفات الأدوات وحقول الإعداد كما هي حتى تعمل الأمثلة.',
  },
  hi: {
    covers: 'यह पेज क्या कवर करता है',
    steps: 'व्यावहारिक चरण',
    note: 'क्या अनुवादित नहीं होता',
    guide: (title) => `यह स्थानीयकृत गाइड ${title} समझाती है। जरूरी कमांड और कॉन्फ़िगरेशन मान बिना अनुवाद के रहते हैं।`,
    items: ['पहले सारांश पढ़ें ताकि यह पक्का हो सके कि यह आपके सेटअप के लिए सही पेज है।', 'कमांड, पैकेज नाम और पर्यावरण चर बिना अनुवाद के कॉपी करें।', 'कॉन्फ़िगरेशन बदलने के बाद MCP क्लाइंट को फिर से शुरू करें।'],
    code: 'कमांड, पैकेज नाम, पर्यावरण चर, टूल ID और कॉन्फ़िगरेशन फ़ील्ड मूल रूप में रहते हैं ताकि उदाहरण काम करें।',
  },
  vi: {
    covers: 'Trang này bao gồm gì',
    steps: 'Các bước thực tế',
    note: 'Nội dung không dịch',
    guide: (title) => `Hướng dẫn bản địa hóa này giải thích ${title}. Lệnh và giá trị cấu hình quan trọng được giữ nguyên.`,
    items: ['Đọc phần tóm tắt trước để chắc chắn đây là trang phù hợp với thiết lập của bạn.', 'Sao chép lệnh, tên gói và biến môi trường đúng nguyên văn.', 'Khởi động lại client MCP sau khi thay đổi cấu hình.'],
    code: 'Lệnh, tên gói, biến môi trường, ID công cụ và trường cấu hình được giữ nguyên để ví dụ hoạt động.',
  },
  th: {
    covers: 'หน้านี้ครอบคลุมอะไร',
    steps: 'ขั้นตอนใช้งานจริง',
    note: 'สิ่งที่ไม่แปล',
    guide: (title) => `คู่มือภาษาไทยนี้อธิบาย ${title} โดยเก็บคำสั่งและค่าการตั้งค่าที่สำคัญไว้ตามต้นฉบับ`,
    items: ['อ่านสรุปก่อนเพื่อยืนยันว่าหน้านี้ตรงกับการตั้งค่าของคุณ', 'คัดลอกคำสั่ง ชื่อแพ็กเกจ และตัวแปรแวดล้อมตามต้นฉบับ', 'รีสตาร์ตไคลเอนต์ MCP หลังเปลี่ยนการตั้งค่า'],
    code: 'คำสั่ง ชื่อแพ็กเกจ ตัวแปรแวดล้อม ID เครื่องมือ และฟิลด์การตั้งค่าจะคงรูปเดิมเพื่อให้ตัวอย่างทำงานได้',
  },
};

function localizedDocsBody(locale, title, summary) {
  const body = docsBodyCopy[locale] || docsBodyCopy.de;
  return `
      <section class="docs-section" id="localized-overview">
        <h2 class="docs-section__title">${body.covers}</h2>
        <p class="docs-section__copy">${summary}</p>
        <p class="docs-section__copy">${body.guide(title)}</p>
      </section>
      <section class="docs-section" id="localized-steps">
        <h2 class="docs-section__title">${body.steps}</h2>
        <ol class="docs-list docs-list--numbered">
          ${body.items.map((item) => `<li>${item}</li>`).join('')}
        </ol>
      </section>
      <section class="docs-callout" id="localized-code-note">
        <h3>${body.note}</h3>
        <p>${body.code}</p>
        <pre><code>npx -y @supericons/mcp@latest
SUPERICONS_API_KEY</code></pre>
      </section>
    `;
}

const loggedIn = {
  de: {
    downloads: ['Noch keine Sammlungen', 'Durchsuche Premium-Sammlungen, um loszulegen.', 'Sammlungen durchsuchen', 'Sammlung', 'Gekauft', 'Eingelöst', 'Sammlung öffnen'],
    dashboard: ['Kaufverlauf', 'Noch keine Käufe.', 'Sammlung', 'Datum', 'Aktionen', 'Anzeigen', 'Unbekannt'],
    api: ['Verbinde deinen Coding-Agenten mit Supericons MCP, um auf Premium-Sammlungen oder Pro-Workflow-Tools zuzugreifen.', 'Sieh in der Einrichtungsanleitung nach, wo du deinen Schlüssel im jeweiligen Client einfügst.', 'Free MCP funktioniert ohne Schlüssel.', 'Kaufe eine Premium-Sammlung oder abonniere Pro, um API-Schlüssel für MCP-Zugriff zu nutzen.', 'Wird geladen...', 'Benenne jeden Schlüssel nach App oder Gerät, damit du sie einzeln rotieren kannst.', 'API-Schlüsselstatus', 'Aktiv', 'Widerrufen', 'Alle', 'Schlüssel werden geladen...', 'Schlüssellabel, z. B. Cursor oder Claude', 'Schlüssel erstellen', 'Sammlungen durchsuchen', 'Preise ansehen', 'Anmelden', 'Noch keine API-Schlüssel. Erstelle einen, um loszulegen.', 'Für dieses Konto gibt es noch keine API-Schlüssel.', 'Widerrufene Schlüssel funktionieren nicht mehr. Lösche eine Verlaufszeile, wenn du den Eintrag nicht mehr brauchst.', 'Sieh alle Schlüssel an einem Ort. Aktive Schlüssel können widerrufen werden; widerrufene Einträge können gelöscht werden.', 'Diese Schlüssel können MCP-Clients und Apps noch authentifizieren.', 'Noch kein Verlauf widerrufener Schlüssel. Widerrufene Schlüssel erscheinen hier, wenn du sie austauschst.', 'Derzeit keine aktiven Schlüssel. Erstelle einen, um einen Client zu verbinden.', 'Widerrufener Verlauf', 'Alle Schlüssel', 'Aktive Schlüssel', 'Schlüssel', 'Label', 'Erstellt', 'Zuletzt verwendet', 'Status', 'Nie', 'Widerrufen', 'Widerrufenen Schlüssel {label} löschen', 'Melde dich erneut an, um API-Schlüssel zu laden.', 'Bis zu {limit} aktive Schlüssel', 'Deine Sitzung ist abgelaufen. Melde dich erneut an, um Schlüssel zu verwalten.', '{active} von {limit} aktiven Schlüsseln werden verwendet', 'Du hast derzeit keinen Zugriff auf API-Schlüssel.', 'Du hast das Limit von {limit} Schlüsseln erreicht. Widerrufe einen, bevor du einen neuen erstellst.', 'Widerrufener Verlauf ist in einem eigenen Tab verfügbar und zählt nicht zu deinem Limit aktiver Schlüssel.', 'API-Schlüssel konnten nicht geladen werden.', 'Wir konnten deine API-Schlüssel gerade nicht laden.', 'Wird erstellt...', 'Melde dich erneut an, um einen API-Schlüssel zu erstellen.', 'Schlüssel konnte nicht erstellt werden', 'API-Schlüssel konnte nicht erstellt werden', 'API-Schlüssel erstellt', 'Kopiere diesen Schlüssel jetzt. Er wird nicht erneut angezeigt.', 'Kopieren', 'Kopiert', 'Label: {label}', 'Präfix: {prefix}', 'Fertig', 'API-Schlüssel in die Zwischenablage kopiert'],
    purchase: ['Melde dich an, um deinen Kauf fortzusetzen', 'Weiterleitung zum Checkout...', 'Checkout fehlgeschlagen', 'Zahlungsfehler. Bitte versuche es erneut.', 'Die Zahlung wurde nicht abgeschlossen. Versuche es erneut.', 'Willkommen bei Pro Annual', 'Alle 8 Launch-Sammlungen sind jetzt in deiner Bibliothek. Durchsuche die Pakete oder öffne Meine Sammlung.', 'Meine Sammlung öffnen', 'Willkommen bei Pro Monthly', 'Dein erster Pro-Claim ist bereit. Wähle unten eine Premium-Sammlung und löse sie jetzt ein.', 'Sammlung einlösen', 'Pro Annual ist aktiv. Deine Sammlungen sind bereit.', 'Willkommen bei Pro. Löse jetzt deine erste Sammlung ein.', 'Kauf erfolgreich. Deine Sammlung wird geöffnet...'],
    claim: ['Alle beanspruchbaren Sammlungen sind bereits in deiner Bibliothek.', 'Diese Sammlung ist bereits in deiner Bibliothek.', 'Zum Beanspruchen von Sammlungen ist ein aktives Pro-Abonnement erforderlich.', 'Sammlung konnte nicht beansprucht werden. Bitte versuche es erneut.', 'diese Sammlung', 'Dies verwendet 1 altes Guthaben.', 'Dies verwendet deinen aktiven Pro-Claim.', 'Sammlung beanspruchen', '"{name}" zu Meine Sammlung hinzufügen.', 'Die Sammlung wird sofort freigeschaltet und erscheint in deiner Bibliothek.', 'Abbrechen', 'Zu Meine Sammlung hinzufügen', 'Claim-Zugriff wird geprüft...', 'Claim ist gerade nicht verfügbar.', 'Sammlung wird zu Meine Sammlung hinzugefügt...', 'Sitzung abgelaufen. Bitte melde dich erneut an.', '"{name}" wurde zu Meine Sammlung hinzugefügt.', 'Sammlung konnte nicht hinzugefügt werden. Bitte versuche es erneut.', 'Nächster Claim verfügbar am {date}.'],
  },
  pt: {
    downloads: ['Ainda sem coleções', 'Explore coleções premium para começar.', 'Explorar coleções', 'Coleção', 'Comprado', 'Resgatado', 'Abrir coleção'],
    dashboard: ['Histórico de compras', 'Ainda não há compras.', 'Coleção', 'Data', 'Ações', 'Ver', 'Desconhecido'],
    api: ['Conecte seu agente de código ao Supericons MCP para acessar coleções premium ou ferramentas Pro.', 'Veja o guia de configuração para saber onde colocar a chave em cada cliente.', 'O MCP gratuito funciona sem chave.', 'Compre uma coleção premium ou assine Pro para usar chaves API no acesso MCP.', 'Carregando...', 'Rotule cada chave por app ou dispositivo para alterná-las separadamente.', 'Estados da chave API', 'Ativa', 'Revogada', 'Todas', 'Carregando chaves...', 'Rótulo da chave, por exemplo Cursor ou Claude', 'Gerar chave', 'Explorar coleções', 'Ver preços', 'Entrar', 'Ainda não há chaves API. Gere uma para começar.', 'Ainda não há chaves API nesta conta.', 'Chaves revogadas não funcionam mais. Exclua uma linha do histórico se não precisar mais do registro.', 'Veja todos os registros de chave em um só lugar. Chaves ativas podem ser revogadas; histórico revogado pode ser excluído.', 'Estas chaves ainda autenticam clientes MCP e apps.', 'Ainda não há histórico de chaves revogadas. Chaves revogadas aparecem aqui quando você as substituir.', 'Nenhuma chave ativa no momento. Gere uma para conectar um cliente.', 'Histórico revogado', 'Todas as chaves', 'Chaves ativas', 'Chave', 'Rótulo', 'Criada', 'Último uso', 'Status', 'Nunca', 'Revogar', 'Excluir chave revogada {label}', 'Entre novamente para carregar chaves API.', 'Até {limit} chaves ativas', 'Sua sessão expirou. Entre novamente para gerenciar chaves.', '{active} de {limit} chaves ativas em uso', 'Você não tem acesso a chaves API no momento.', 'Você atingiu o limite de {limit} chaves. Revogue uma antes de criar outra.', 'O histórico revogado fica em uma aba própria e não conta no limite de chaves ativas.', 'Falha ao carregar chaves API.', 'Não conseguimos carregar suas chaves API agora.', 'Gerando...', 'Entre novamente para gerar uma chave API.', 'Falha ao gerar chave', 'Falha ao gerar chave API', 'Chave API gerada', 'Copie esta chave agora. Ela não será mostrada novamente.', 'Copiar', 'Copiada', 'Rótulo: {label}', 'Prefixo: {prefix}', 'Concluir', 'Chave API copiada para a área de transferência'],
    purchase: ['Entre para continuar sua compra', 'Redirecionando para o checkout...', 'Falha no checkout', 'Erro de pagamento. Tente novamente.', 'O pagamento não foi concluído. Tente novamente.', 'Boas-vindas ao Pro anual', 'Todas as 8 coleções de lançamento estão na sua biblioteca. Explore os pacotes ou abra Minha coleção.', 'Abrir Minha coleção', 'Boas-vindas ao Pro mensal', 'Seu primeiro resgate Pro está pronto. Escolha uma coleção premium abaixo e resgate agora.', 'Resgatar uma coleção', 'Pro anual está ativo. Suas coleções estão prontas.', 'Boas-vindas ao Pro. Resgate sua primeira coleção agora.', 'Compra concluída. Abrindo sua coleção...'],
    claim: ['Todas as coleções resgatáveis já estão na sua biblioteca.', 'Esta coleção já está na sua biblioteca.', 'É necessária uma assinatura Pro ativa para resgatar coleções.', 'Falha ao resgatar coleção. Tente novamente.', 'esta coleção', 'Isto usará 1 crédito legado.', 'Isto usará seu resgate Pro ativo.', 'Resgatar coleção', 'Adicionar "{name}" à Minha coleção.', 'A coleção será liberada imediatamente e aparecerá na sua biblioteca.', 'Cancelar', 'Adicionar à Minha coleção', 'Verificando acesso ao resgate...', 'Resgate indisponível no momento.', 'Adicionando coleção à Minha coleção...', 'Sessão expirada. Entre novamente.', '"{name}" foi adicionada à Minha coleção.', 'Falha ao adicionar coleção. Tente novamente.', 'Próximo resgate disponível em {date}.'],
  },
  ar: {
    downloads: ['لا توجد مجموعات بعد', 'تصفح المجموعات المميزة للبدء.', 'تصفح المجموعات', 'المجموعة', 'تم الشراء', 'تم الاسترداد', 'فتح المجموعة'],
    dashboard: ['سجل المشتريات', 'لا توجد مشتريات بعد.', 'المجموعة', 'التاريخ', 'الإجراءات', 'عرض', 'غير معروف'],
    api: ['اربط وكيل البرمجة لديك بـ Supericons MCP للوصول إلى مجموعاتك المميزة أو أدوات Pro.', 'راجع دليل الإعداد لمعرفة مكان وضع المفتاح في كل عميل.', 'يعمل MCP المجاني بدون مفتاح.', 'اشتر أي مجموعة مميزة أو اشترك في Pro لاستخدام مفاتيح API للوصول عبر MCP.', 'جار التحميل...', 'ضع تسمية لكل مفتاح حسب التطبيق أو الجهاز لتدويره بشكل مستقل.', 'حالات مفاتيح API', 'نشط', 'ملغى', 'الكل', 'جار تحميل المفاتيح...', 'تسمية المفتاح، مثل Cursor أو Claude', 'إنشاء مفتاح', 'تصفح المجموعات', 'عرض الأسعار', 'تسجيل الدخول', 'لا توجد مفاتيح API بعد. أنشئ مفتاحا للبدء.', 'لا توجد مفاتيح API في هذا الحساب بعد.', 'المفاتيح الملغاة لم تعد تعمل. احذف سجل التاريخ إذا لم تعد تحتاجه.', 'اعرض كل سجلات المفاتيح في مكان واحد. يمكن إلغاء المفاتيح النشطة وحذف السجلات الملغاة.', 'ما زالت هذه المفاتيح قادرة على مصادقة عملاء MCP والتطبيقات.', 'لا يوجد سجل مفاتيح ملغاة بعد. ستظهر هنا عند تدويرها.', 'لا توجد مفاتيح نشطة الآن. أنشئ مفتاحا لربط عميل.', 'سجل المفاتيح الملغاة', 'كل المفاتيح', 'المفاتيح النشطة', 'المفتاح', 'التسمية', 'تاريخ الإنشاء', 'آخر استخدام', 'الحالة', 'أبدا', 'إلغاء', 'حذف المفتاح الملغى {label}', 'سجل الدخول مرة أخرى لتحميل مفاتيح API.', 'حتى {limit} مفاتيح نشطة', 'انتهت جلستك. سجل الدخول مرة أخرى لإدارة المفاتيح.', '{active} من {limit} مفاتيح نشطة قيد الاستخدام', 'لا تملك حاليا وصولا إلى مفاتيح API.', 'وصلت إلى حد {limit} مفاتيح. ألغ مفتاحا قبل إنشاء آخر.', 'سجل المفاتيح الملغاة متاح في تبويب مستقل ولا يحتسب ضمن حد المفاتيح النشطة.', 'فشل تحميل مفاتيح API.', 'تعذر تحميل مفاتيح API الآن.', 'جار الإنشاء...', 'سجل الدخول مرة أخرى لإنشاء مفتاح API.', 'فشل إنشاء المفتاح', 'فشل إنشاء مفتاح API', 'تم إنشاء مفتاح API', 'انسخ هذا المفتاح الآن. لن يظهر مرة أخرى.', 'نسخ', 'تم النسخ', 'التسمية: {label}', 'البادئة: {prefix}', 'تم', 'تم نسخ مفتاح API إلى الحافظة'],
    purchase: ['سجل الدخول لمتابعة الشراء', 'جار التحويل إلى الدفع...', 'فشل الدفع', 'خطأ في الدفع. حاول مرة أخرى.', 'لم يكتمل الدفع. حاول مرة أخرى.', 'مرحبا بك في Pro السنوي', 'أصبحت مجموعات الإطلاق الثماني في مكتبتك. تصفح الحزم أو افتح مجموعتي للبدء.', 'فتح مجموعتي', 'مرحبا بك في Pro الشهري', 'أول مطالبة Pro جاهزة. اختر مجموعة مميزة أدناه واستردها الآن.', 'استرداد مجموعة', 'Pro السنوي نشط. مجموعاتك جاهزة.', 'مرحبا بك في Pro. استرد مجموعتك الأولى الآن.', 'تم الشراء بنجاح. جار فتح مجموعتك...'],
    claim: ['كل المجموعات القابلة للمطالبة موجودة بالفعل في مكتبتك.', 'هذه المجموعة موجودة بالفعل في مكتبتك.', 'يلزم اشتراك Pro نشط للمطالبة بالمجموعات.', 'فشلت مطالبة المجموعة. حاول مرة أخرى.', 'هذه المجموعة', 'سيستخدم هذا رصيدا قديما واحدا.', 'سيستخدم هذا مطالبة Pro النشطة لديك.', 'مطالبة المجموعة', 'إضافة "{name}" إلى مجموعتي.', 'تفتح المجموعة فورا وستظهر في مكتبتك.', 'إلغاء', 'إضافة إلى مجموعتي', 'جار التحقق من وصول المطالبة...', 'المطالبة غير متاحة الآن.', 'جار إضافة المجموعة إلى مجموعتي...', 'انتهت الجلسة. سجل الدخول مرة أخرى.', 'تمت إضافة "{name}" إلى مجموعتي.', 'فشل إضافة المجموعة. حاول مرة أخرى.', 'المطالبة التالية متاحة في {date}.'],
  },
};

const apiOnly = {
  'zh-Hans': ['将你的编程代理连接到 Supericons MCP，以访问高级图标集合或 Pro 工作流工具。', '查看设置指南，了解每个客户端中应放置密钥的位置。', '免费 MCP 无需密钥即可使用。', '购买任意高级集合或订阅 Pro，即可使用 API 密钥进行 MCP 访问。', '正在加载...', '按应用或设备为每个密钥命名，方便你单独轮换。', 'API 密钥状态', '有效', '已撤销', '全部', '正在加载密钥...', '密钥标签，例如 Cursor 或 Claude', '生成密钥', '浏览集合', '查看价格', '登录', '还没有 API 密钥。生成一个即可开始。', '此账户还没有 API 密钥。', '已撤销的密钥不再可用。如果不再需要记录，可以删除历史行。', '在一个位置查看所有密钥记录。有效密钥可以撤销，已撤销的历史记录可以删除。', '这些密钥仍可验证 MCP 客户端和应用。', '还没有已撤销密钥历史。轮换密钥后会显示在这里。', '当前没有有效密钥。生成一个来连接客户端。', '已撤销历史', '全部密钥', '有效密钥', '密钥', '标签', '创建时间', '上次使用', '状态', '从未', '撤销', '删除已撤销密钥 {label}', '请重新登录以加载 API 密钥。', '最多 {limit} 个有效密钥', '你的会话已过期。请重新登录以管理密钥。', '正在使用 {active}/{limit} 个有效密钥', '你当前无权使用 API 密钥。', '你已达到 {limit} 个密钥上限。请先撤销一个再创建新的。', '已撤销历史位于单独标签页，不计入有效密钥上限。', '加载 API 密钥失败。', '我们现在无法加载你的 API 密钥。', '正在生成...', '请重新登录以生成 API 密钥。', '生成密钥失败', '生成 API 密钥失败', 'API 密钥已生成', '请立即复制此密钥。之后不会再次显示。', '复制', '已复制', '标签：{label}', '前缀：{prefix}', '完成', 'API 密钥已复制到剪贴板'],
  'zh-Hant': ['將你的程式代理連接到 Supericons MCP，以存取進階圖示集合或 Pro 工作流程工具。', '查看設定指南，了解每個用戶端中應放置金鑰的位置。', '免費 MCP 不需要金鑰即可使用。', '購買任一進階集合或訂閱 Pro，即可使用 API 金鑰進行 MCP 存取。', '正在載入...', '依應用程式或裝置為每個金鑰命名，方便你分別輪換。', 'API 金鑰狀態', '有效', '已撤銷', '全部', '正在載入金鑰...', '金鑰標籤，例如 Cursor 或 Claude', '產生金鑰', '瀏覽集合', '查看價格', '登入', '還沒有 API 金鑰。產生一個即可開始。', '此帳戶還沒有 API 金鑰。', '已撤銷的金鑰不再可用。如果不再需要記錄，可以刪除歷史列。', '在一處查看所有金鑰記錄。有效金鑰可以撤銷，已撤銷歷史可以刪除。', '這些金鑰仍可驗證 MCP 用戶端和應用程式。', '還沒有已撤銷金鑰歷史。輪換金鑰後會顯示在這裡。', '目前沒有有效金鑰。產生一個以連接用戶端。', '已撤銷歷史', '全部金鑰', '有效金鑰', '金鑰', '標籤', '建立時間', '上次使用', '狀態', '從未', '撤銷', '刪除已撤銷金鑰 {label}', '請重新登入以載入 API 金鑰。', '最多 {limit} 個有效金鑰', '你的工作階段已過期。請重新登入以管理金鑰。', '正在使用 {active}/{limit} 個有效金鑰', '你目前沒有 API 金鑰存取權。', '你已達到 {limit} 個金鑰上限。請先撤銷一個再建立新的。', '已撤銷歷史在獨立分頁中，不計入有效金鑰上限。', '載入 API 金鑰失敗。', '我們現在無法載入你的 API 金鑰。', '正在產生...', '請重新登入以產生 API 金鑰。', '產生金鑰失敗', '產生 API 金鑰失敗', 'API 金鑰已產生', '請立即複製此金鑰。之後不會再次顯示。', '複製', '已複製', '標籤：{label}', '前綴：{prefix}', '完成', 'API 金鑰已複製到剪貼簿'],
  ja: ['コーディングエージェントを Supericons MCP に接続して、プレミアムアイコンコレクションや Pro ワークフローツールにアクセスします。', '各クライアントでキーを置く場所はセットアップガイドを確認してください。', '無料 MCP はキーなしで使えます。', 'プレミアムコレクションを購入するか Pro に加入すると、MCP アクセス用の API キーを使えます。', '読み込み中...', 'キーごとにアプリ名やデバイス名を付けると、個別にローテーションできます。', 'API キーの状態', '有効', '取り消し済み', 'すべて', 'キーを読み込み中...', 'キーのラベル、例 Cursor または Claude', 'キーを生成', 'コレクションを見る', '料金を見る', 'サインイン', 'API キーはまだありません。生成して始めましょう。', 'このアカウントにはまだ API キーがありません。', '取り消し済みキーはもう使えません。記録が不要なら履歴行を削除できます。', 'すべてのキー記録を一か所で確認できます。有効なキーは取り消せ、取り消し済み履歴は削除できます。', 'これらのキーは MCP クライアントやアプリの認証にまだ使えます。', '取り消し済みキーの履歴はまだありません。キーをローテーションするとここに表示されます。', '現在有効なキーはありません。クライアントを接続するにはキーを生成してください。', '取り消し済み履歴', 'すべてのキー', '有効なキー', 'キー', 'ラベル', '作成日', '最終使用', '状態', '未使用', '取り消す', '取り消し済みキー {label} を削除', 'API キーを読み込むには再度サインインしてください。', '有効なキーは最大 {limit} 個', 'セッションの期限が切れました。キーを管理するには再度サインインしてください。', '{limit} 個中 {active} 個の有効なキーを使用中', '現在 API キーにアクセスできません。', '{limit} 個のキー上限に達しました。新しく作成する前に 1 つ取り消してください。', '取り消し済み履歴は専用タブにあり、有効キーの上限には含まれません。', 'API キーの読み込みに失敗しました。', '現在 API キーを読み込めません。', '生成中...', 'API キーを生成するには再度サインインしてください。', 'キーの生成に失敗しました', 'API キーの生成に失敗しました', 'API キーを生成しました', 'このキーを今すぐコピーしてください。再表示はされません。', 'コピー', 'コピー済み', 'ラベル：{label}', 'プレフィックス：{prefix}', '完了', 'API キーをクリップボードにコピーしました'],
  ko: ['코딩 에이전트를 Supericons MCP에 연결해 프리미엄 아이콘 컬렉션이나 Pro 워크플로 도구에 접근합니다.', '각 클라이언트에서 키를 넣을 위치는 설정 가이드를 확인하세요.', '무료 MCP는 키 없이 사용할 수 있습니다.', '프리미엄 컬렉션을 구매하거나 Pro를 구독하면 MCP 접근용 API 키를 사용할 수 있습니다.', '불러오는 중...', '앱이나 기기별로 키 라벨을 붙이면 독립적으로 교체할 수 있습니다.', 'API 키 상태', '활성', '취소됨', '전체', '키를 불러오는 중...', '키 라벨, 예: Cursor 또는 Claude', '키 생성', '컬렉션 보기', '가격 보기', '로그인', '아직 API 키가 없습니다. 하나를 생성해 시작하세요.', '이 계정에는 아직 API 키가 없습니다.', '취소된 키는 더 이상 작동하지 않습니다. 기록이 필요 없으면 히스토리 행을 삭제할 수 있습니다.', '모든 키 기록을 한곳에서 봅니다. 활성 키는 취소할 수 있고 취소된 기록은 삭제할 수 있습니다.', '이 키들은 아직 MCP 클라이언트와 앱을 인증할 수 있습니다.', '취소된 키 기록이 아직 없습니다. 키를 교체하면 여기에 표시됩니다.', '현재 활성 키가 없습니다. 클라이언트를 연결하려면 키를 생성하세요.', '취소된 기록', '모든 키', '활성 키', '키', '라벨', '생성일', '마지막 사용', '상태', '없음', '취소', '취소된 키 {label} 삭제', 'API 키를 불러오려면 다시 로그인하세요.', '활성 키 최대 {limit}개', '세션이 만료되었습니다. 키를 관리하려면 다시 로그인하세요.', '활성 키 {limit}개 중 {active}개 사용 중', '현재 API 키에 접근할 수 없습니다.', '키 {limit}개 제한에 도달했습니다. 새 키를 만들기 전에 하나를 취소하세요.', '취소된 기록은 별도 탭에 있으며 활성 키 제한에 포함되지 않습니다.', 'API 키를 불러오지 못했습니다.', '지금 API 키를 불러올 수 없습니다.', '생성 중...', 'API 키를 생성하려면 다시 로그인하세요.', '키 생성 실패', 'API 키 생성 실패', 'API 키 생성됨', '이 키를 지금 복사하세요. 다시 표시되지 않습니다.', '복사', '복사됨', '라벨: {label}', '접두사: {prefix}', '완료', 'API 키가 클립보드에 복사되었습니다'],
  es: ['Conecta tu agente de código a Supericons MCP para acceder a tus colecciones premium o herramientas Pro.', 'Consulta la guía de configuración para saber dónde colocar la clave en cada cliente.', 'MCP gratuito funciona sin clave.', 'Compra una colección premium o suscríbete a Pro para usar claves API con MCP.', 'Cargando...', 'Etiqueta cada clave por app o dispositivo para rotarlas por separado.', 'Estados de claves API', 'Activa', 'Revocada', 'Todas', 'Cargando claves...', 'Etiqueta de clave, por ejemplo Cursor o Claude', 'Generar clave', 'Explorar colecciones', 'Ver precios', 'Iniciar sesión', 'Aún no hay claves API. Genera una para empezar.', 'Esta cuenta aún no tiene claves API.', 'Las claves revocadas ya no funcionan. Elimina una fila del historial si ya no necesitas el registro.', 'Ve todos los registros de claves en un solo lugar. Las claves activas se pueden revocar y el historial revocado se puede eliminar.', 'Estas claves aún pueden autenticar clientes MCP y apps.', 'Aún no hay historial de claves revocadas. Aparecerán aquí cuando las rotes.', 'No hay claves activas ahora. Genera una para conectar un cliente.', 'Historial revocado', 'Todas las claves', 'Claves activas', 'Clave', 'Etiqueta', 'Creada', 'Último uso', 'Estado', 'Nunca', 'Revocar', 'Eliminar clave revocada {label}', 'Inicia sesión de nuevo para cargar claves API.', 'Hasta {limit} claves activas', 'Tu sesión expiró. Inicia sesión de nuevo para gestionar claves.', '{active} de {limit} claves activas en uso', 'Actualmente no tienes acceso a claves API.', 'Has alcanzado el límite de {limit} claves. Revoca una antes de crear otra.', 'El historial revocado está en su propia pestaña y no cuenta para el límite de claves activas.', 'No se pudieron cargar las claves API.', 'No pudimos cargar tus claves API ahora.', 'Generando...', 'Inicia sesión de nuevo para generar una clave API.', 'No se pudo generar la clave', 'No se pudo generar la clave API', 'Clave API generada', 'Copia esta clave ahora. No se mostrará de nuevo.', 'Copiar', 'Copiada', 'Etiqueta: {label}', 'Prefijo: {prefix}', 'Listo', 'Clave API copiada al portapapeles'],
  hi: ['अपने कोडिंग एजेंट को Supericons MCP से जोड़ें ताकि आप प्रीमियम आइकन संग्रह या Pro वर्कफ्लो टूल इस्तेमाल कर सकें।', 'हर क्लाइंट में कुंजी कहां रखनी है, इसके लिए सेटअप गाइड देखें।', 'मुफ्त MCP बिना कुंजी के काम करता है।', 'MCP एक्सेस के लिए API कुंजियां इस्तेमाल करने हेतु कोई प्रीमियम संग्रह खरीदें या Pro लें।', 'लोड हो रहा है...', 'हर कुंजी को ऐप या डिवाइस के नाम से लेबल करें ताकि आप उन्हें अलग-अलग बदल सकें।', 'API कुंजी स्थितियां', 'सक्रिय', 'रद्द', 'सभी', 'कुंजियां लोड हो रही हैं...', 'कुंजी लेबल, जैसे Cursor या Claude', 'कुंजी बनाएं', 'संग्रह देखें', 'कीमत देखें', 'लॉग इन', 'अभी कोई API कुंजी नहीं है। शुरू करने के लिए एक बनाएं।', 'इस खाते में अभी कोई API कुंजी नहीं है।', 'रद्द की गई कुंजियां अब काम नहीं करतीं। यदि रिकॉर्ड की जरूरत नहीं है तो इतिहास पंक्ति हटाएं।', 'सभी कुंजी रिकॉर्ड एक जगह देखें। सक्रिय कुंजियां रद्द की जा सकती हैं और रद्द इतिहास हटाया जा सकता है।', 'ये कुंजियां अभी भी MCP क्लाइंट और ऐप्स को प्रमाणित कर सकती हैं।', 'अभी कोई रद्द कुंजी इतिहास नहीं है। कुंजी बदलने पर वह यहां दिखेगी।', 'अभी कोई सक्रिय कुंजी नहीं है। क्लाइंट जोड़ने के लिए एक कुंजी बनाएं।', 'रद्द इतिहास', 'सभी कुंजियां', 'सक्रिय कुंजियां', 'कुंजी', 'लेबल', 'बनाई गई', 'अंतिम उपयोग', 'स्थिति', 'कभी नहीं', 'रद्द करें', 'रद्द कुंजी {label} हटाएं', 'API कुंजियां लोड करने के लिए फिर से लॉग इन करें।', 'अधिकतम {limit} सक्रिय कुंजियां', 'आपका सत्र समाप्त हो गया। कुंजियां प्रबंधित करने के लिए फिर से लॉग इन करें।', '{limit} में से {active} सक्रिय कुंजियां उपयोग में हैं', 'आपके पास अभी API कुंजियों का एक्सेस नहीं है।', 'आप {limit} कुंजियों की सीमा पर पहुंच गए हैं। नई बनाने से पहले एक कुंजी रद्द करें।', 'रद्द इतिहास अपने टैब में उपलब्ध है और सक्रिय-कुंजी सीमा में नहीं गिना जाता।', 'API कुंजियां लोड नहीं हो सकीं।', 'हम अभी आपकी API कुंजियां लोड नहीं कर सके।', 'बन रही है...', 'API कुंजी बनाने के लिए फिर से लॉग इन करें।', 'कुंजी बनाना विफल रहा', 'API कुंजी बनाना विफल रहा', 'API कुंजी बन गई', 'इस कुंजी को अभी कॉपी करें। यह फिर नहीं दिखाई जाएगी।', 'कॉपी करें', 'कॉपी हो गई', 'लेबल: {label}', 'प्रीफिक्स: {prefix}', 'पूरा हुआ', 'API कुंजी क्लिपबोर्ड में कॉपी हो गई'],
  vi: ['Kết nối tác nhân lập trình của bạn với Supericons MCP để truy cập bộ sưu tập premium hoặc công cụ Pro.', 'Xem hướng dẫn thiết lập để biết nên đặt khóa ở đâu trong từng client.', 'MCP miễn phí hoạt động không cần khóa.', 'Mua một bộ sưu tập premium hoặc đăng ký Pro để dùng khóa API cho truy cập MCP.', 'Đang tải...', 'Gắn nhãn từng khóa theo app hoặc thiết bị để bạn có thể xoay vòng riêng.', 'Trạng thái khóa API', 'Đang hoạt động', 'Đã thu hồi', 'Tất cả', 'Đang tải khóa...', 'Nhãn khóa, ví dụ Cursor hoặc Claude', 'Tạo khóa', 'Xem bộ sưu tập', 'Xem giá', 'Đăng nhập', 'Chưa có khóa API. Tạo một khóa để bắt đầu.', 'Tài khoản này chưa có khóa API.', 'Khóa đã thu hồi không còn hoạt động. Xóa một dòng lịch sử nếu bạn không cần bản ghi đó nữa.', 'Xem mọi bản ghi khóa ở một nơi. Khóa đang hoạt động có thể bị thu hồi, lịch sử đã thu hồi có thể bị xóa.', 'Những khóa này vẫn có thể xác thực client MCP và ứng dụng.', 'Chưa có lịch sử khóa đã thu hồi. Khóa đã thu hồi sẽ xuất hiện ở đây khi bạn xoay vòng.', 'Hiện không có khóa đang hoạt động. Tạo một khóa để kết nối client.', 'Lịch sử đã thu hồi', 'Tất cả khóa', 'Khóa đang hoạt động', 'Khóa', 'Nhãn', 'Đã tạo', 'Lần dùng cuối', 'Trạng thái', 'Chưa bao giờ', 'Thu hồi', 'Xóa khóa đã thu hồi {label}', 'Đăng nhập lại để tải khóa API.', 'Tối đa {limit} khóa đang hoạt động', 'Phiên của bạn đã hết hạn. Đăng nhập lại để quản lý khóa.', 'Đang dùng {active} trong {limit} khóa đang hoạt động', 'Bạn hiện không có quyền truy cập khóa API.', 'Bạn đã đạt giới hạn {limit} khóa. Hãy thu hồi một khóa trước khi tạo khóa khác.', 'Lịch sử đã thu hồi có trong tab riêng và không tính vào giới hạn khóa đang hoạt động.', 'Không tải được khóa API.', 'Hiện chúng tôi không thể tải khóa API của bạn.', 'Đang tạo...', 'Đăng nhập lại để tạo khóa API.', 'Không tạo được khóa', 'Không tạo được khóa API', 'Đã tạo khóa API', 'Hãy sao chép khóa này ngay. Khóa sẽ không được hiển thị lại.', 'Sao chép', 'Đã sao chép', 'Nhãn: {label}', 'Tiền tố: {prefix}', 'Xong', 'Đã sao chép khóa API vào clipboard'],
  th: ['เชื่อมต่อเอเจนต์เขียนโค้ดของคุณกับ Supericons MCP เพื่อเข้าถึงคอลเลกชันพรีเมียมหรือเครื่องมือ Pro', 'ดูคู่มือการตั้งค่าเพื่อดูว่าต้องใส่คีย์ไว้ตรงไหนในแต่ละไคลเอนต์', 'MCP ฟรีใช้งานได้โดยไม่ต้องใช้คีย์', 'ซื้อคอลเลกชันพรีเมียมหรือสมัคร Pro เพื่อใช้คีย์ API สำหรับการเข้าถึง MCP', 'กำลังโหลด...', 'ตั้งชื่อคีย์แต่ละอันตามแอปหรืออุปกรณ์ เพื่อหมุนเวียนแยกกันได้', 'สถานะคีย์ API', 'ใช้งานอยู่', 'เพิกถอนแล้ว', 'ทั้งหมด', 'กำลังโหลดคีย์...', 'ป้ายกำกับคีย์ เช่น Cursor หรือ Claude', 'สร้างคีย์', 'ดูคอลเลกชัน', 'ดูราคา', 'เข้าสู่ระบบ', 'ยังไม่มีคีย์ API สร้างคีย์หนึ่งอันเพื่อเริ่มต้น', 'บัญชีนี้ยังไม่มีคีย์ API', 'คีย์ที่เพิกถอนแล้วใช้งานไม่ได้อีก ลบแถวประวัติได้ถ้าไม่ต้องการเก็บบันทึก', 'ดูบันทึกคีย์ทั้งหมดในที่เดียว คีย์ที่ใช้งานอยู่เพิกถอนได้ และประวัติที่เพิกถอนแล้วลบได้', 'คีย์เหล่านี้ยังใช้ยืนยันตัวตนของไคลเอนต์ MCP และแอปได้', 'ยังไม่มีประวัติคีย์ที่เพิกถอน เมื่อหมุนเวียนคีย์แล้วจะแสดงที่นี่', 'ตอนนี้ไม่มีคีย์ที่ใช้งานอยู่ สร้างคีย์เพื่อเชื่อมต่อไคลเอนต์', 'ประวัติที่เพิกถอน', 'คีย์ทั้งหมด', 'คีย์ที่ใช้งานอยู่', 'คีย์', 'ป้ายกำกับ', 'สร้างเมื่อ', 'ใช้ล่าสุด', 'สถานะ', 'ไม่เคย', 'เพิกถอน', 'ลบคีย์ที่เพิกถอน {label}', 'เข้าสู่ระบบอีกครั้งเพื่อโหลดคีย์ API', 'คีย์ที่ใช้งานอยู่ได้สูงสุด {limit} อัน', 'เซสชันของคุณหมดอายุ เข้าสู่ระบบอีกครั้งเพื่อจัดการคีย์', 'ใช้คีย์ที่ใช้งานอยู่ {active} จาก {limit} อัน', 'ตอนนี้คุณยังไม่มีสิทธิ์เข้าถึงคีย์ API', 'คุณถึงขีดจำกัด {limit} คีย์แล้ว เพิกถอนคีย์หนึ่งอันก่อนสร้างใหม่', 'ประวัติที่เพิกถอนอยู่ในแท็บแยก และไม่นับรวมในขีดจำกัดคีย์ที่ใช้งานอยู่', 'โหลดคีย์ API ไม่สำเร็จ', 'ตอนนี้เราโหลดคีย์ API ของคุณไม่ได้', 'กำลังสร้าง...', 'เข้าสู่ระบบอีกครั้งเพื่อสร้างคีย์ API', 'สร้างคีย์ไม่สำเร็จ', 'สร้างคีย์ API ไม่สำเร็จ', 'สร้างคีย์ API แล้ว', 'คัดลอกคีย์นี้ตอนนี้ ระบบจะไม่แสดงอีก', 'คัดลอก', 'คัดลอกแล้ว', 'ป้ายกำกับ: {label}', 'คำนำหน้า: {prefix}', 'เสร็จสิ้น', 'คัดลอกคีย์ API ไปยังคลิปบอร์ดแล้ว'],
};

function buildLoggedIn(parts) {
  const [d, dash, api, purchase, claim] = [parts.downloads, parts.dashboard, parts.api, parts.purchase, parts.claim];
  return {
    loggedIn: {
      downloads: { noCollections: d[0], browseHint: d[1], browseCollections: d[2], collection: d[3], purchased: d[4], redeemed: d[5], openCollection: d[6] },
      dashboard: { purchaseHistory: dash[0], noPurchases: dash[1], collection: dash[2], date: dash[3], actions: dash[4], view: dash[5], unknown: dash[6] },
    },
    apiKeys: {
      setup: { pro: api[0], guide: api[1], free: api[2], upgrade: api[3] },
      usageLoading: api[4], limitNote: api[5], tabAria: api[6], active: api[7], revoked: api[8], all: api[9], loadingKeys: api[10],
      labelPlaceholder: api[11], generateKey: api[12], browseCollections: api[13], seePricing: api[14], signIn: api[15],
      emptyCreate: api[16], emptyAccount: api[17], revokedCopy: api[18], allCopy: api[19], activeCopy: api[20],
      emptyRevoked: api[21], emptyActive: api[22], revokedHistory: api[23], allKeys: api[24], activeKeys: api[25],
      key: api[26], label: api[27], created: api[28], lastUsed: api[29], status: api[30], never: api[31], revoke: api[32],
      deleteRevokedLabel: api[33], signInAgainLoad: api[34], activeLimit: api[35], sessionExpired: api[36], usageCount: api[37],
      noAccess: api[38], limitReached: api[39], revokedHistoryNote: api[40], failedLoad: api[41], failedLoadNote: api[42],
      generating: api[43], signInAgainGenerate: api[44], failedGenerate: api[45], failedGenerateToast: api[46],
      modalTitle: api[47], modalWarning: api[48], copy: api[49], copied: api[50], modalLabel: api[51], modalPrefix: api[52], done: api[53], copiedToast: api[54],
    },
    purchaseFlow: {
      signInToPurchase: purchase[0], redirecting: purchase[1], checkoutFailed: purchase[2], paymentError: purchase[3], canceled: purchase[4],
      proAnnualTitle: purchase[5], proAnnualDescription: purchase[6], openMyCollection: purchase[7], proMonthlyTitle: purchase[8],
      proMonthlyDescription: purchase[9], redeemCollection: purchase[10], proAnnualToast: purchase[11], proMonthlyToast: purchase[12], purchaseSuccess: purchase[13],
    },
    claimFlow: {
      allOwned: claim[0], alreadyOwned: claim[1], subscriptionRequired: claim[2], failed: claim[3], thisCollection: claim[4],
      legacyCredit: claim[5], proClaim: claim[6], eyebrow: claim[7], title: claim[8], description: claim[9], cancel: claim[10], confirm: claim[11],
      checking: claim[12], unavailable: claim[13], adding: claim[14], sessionExpired: claim[15], added: claim[16], addFailed: claim[17], nextAvailable: claim[18],
    },
  };
}

function buildApiMessages(api) {
  return {
    apiKeys: {
      setup: { pro: api[0], guide: api[1], free: api[2], upgrade: api[3] },
      usageLoading: api[4], limitNote: api[5], tabAria: api[6], active: api[7], revoked: api[8], all: api[9], loadingKeys: api[10],
      labelPlaceholder: api[11], generateKey: api[12], browseCollections: api[13], seePricing: api[14], signIn: api[15],
      emptyCreate: api[16], emptyAccount: api[17], revokedCopy: api[18], allCopy: api[19], activeCopy: api[20],
      emptyRevoked: api[21], emptyActive: api[22], revokedHistory: api[23], allKeys: api[24], activeKeys: api[25],
      key: api[26], label: api[27], created: api[28], lastUsed: api[29], status: api[30], never: api[31], revoke: api[32],
      deleteRevokedLabel: api[33], signInAgainLoad: api[34], activeLimit: api[35], sessionExpired: api[36], usageCount: api[37],
      noAccess: api[38], limitReached: api[39], revokedHistoryNote: api[40], failedLoad: api[41], failedLoadNote: api[42],
      generating: api[43], signInAgainGenerate: api[44], failedGenerate: api[45], failedGenerateToast: api[46],
      modalTitle: api[47], modalWarning: api[48], copy: api[49], copied: api[50], modalLabel: api[51], modalPrefix: api[52], done: api[53], copiedToast: api[54],
    },
  };
}

function applyAuthNotes(catalog, note) {
  const groups = catalog.auth?.copy || {};
  for (const group of Object.values(groups)) {
    for (const mode of ['signin', 'signup']) {
      if (group?.[mode]) group[mode].note = note;
    }
  }
}

function getPrivacy(locale) {
  const data = {
    de: {
      updated: 'Zuletzt aktualisiert: 8. April 2026',
      title: 'Datenschutzrichtlinie',
      headings: ['1. Überblick', '2. Erhobene Daten', '3. Produktanalyse', '4. Nutzung der Daten', '5. Zahlungen', '6. Authentifizierung und E-Mail', '7. MCP-Zugriff', '8. Drittanbieter', '9. Datenspeicherung', '10. Deine Auswahl und Kontakt'],
      bodies: [
        ['Supericons wird von Curly Mole Labs betrieben. Diese Richtlinie erklärt, welche Informationen wir sammeln und wie wir sie verwenden.'],
        ['Wir können Kontoinformationen wie E-Mail-Adresse, Anzeigename, Anmeldeanbieter und Konto-IDs erfassen.', 'Wir speichern Kauf-, Berechtigungs- und Abonnementdaten, damit Premium-Sammlungen und MCP-Funktionen freigeschaltet werden können.'],
        ['Wir erfassen cookie-freie Produktanalysen, um Zuverlässigkeit und Funktionsnutzung zu verstehen.', 'Diese Analysen sind so gestaltet, dass sie kein persönliches Tracking erzeugen.'],
        ['Wir verwenden Daten für Anmeldung, Kontowiederherstellung, Kaufzugriff, Abonnements, Support, Betrugsprävention und Produktverbesserungen.'],
        ['Zahlungen und Abonnementverwaltung werden von Stripe verarbeitet. Supericons speichert keine vollständigen Kartendaten auf eigenen Servern.'],
        ['Die Anmeldung kann E-Mail und Google umfassen. Transaktions-E-Mails werden in unserem Auftrag über einen sicheren E-Mail-Anbieter gesendet.'],
        ['Bei MCP verarbeiten wir Anfragen, die nötig sind, um Zugriff zu prüfen, Icon-Ergebnisse zurückzugeben und Premium-Berechtigungen durchzusetzen.'],
        ['Wir nutzen Drittanbieter für Authentifizierung, Abrechnung, E-Mail-Versand und grundlegende Produktanalysen.'],
        ['Wir behalten Konto-, Abrechnungs- und Berechtigungsdaten so lange, wie es für Betrieb, gesetzliche Pflichten, Streitbeilegung und Support nötig ist.'],
        ['Du kannst Kontodaten in der App aktualisieren. Für Datenschutzanfragen schreibe an hello@supericons.dev.'],
      ],
    },
    pt: {
      updated: 'Última atualização: 8 de abril de 2026',
      title: 'Política de Privacidade',
      headings: ['1. Visão geral', '2. Dados que coletamos', '3. Análise do produto', '4. Como usamos dados', '5. Pagamentos', '6. Autenticação e e-mail', '7. Acesso MCP', '8. Serviços de terceiros', '9. Retenção de dados', '10. Suas escolhas e contato'],
      bodies: [
        ['O Supericons é operado pela Curly Mole Labs. Esta política explica quais informações coletamos e como as usamos.'],
        ['Podemos coletar dados de conta, como e-mail, nome de exibição, provedor de autenticação e identificadores de conta.', 'Armazenamos registros de compra, direitos de acesso e assinatura necessários para liberar coleções premium e recursos MCP.'],
        ['Coletamos análises de produto sem cookies para melhorar a confiabilidade e entender o uso dos recursos.', 'Essas análises são projetadas para evitar rastreamento pessoal.'],
        ['Usamos dados para login, recuperação de conta, acesso a compras, assinaturas, suporte, prevenção de fraude e melhorias do produto.'],
        ['Pagamentos e gestão de assinaturas são processados pela Stripe. O Supericons não armazena dados completos de cartão em seus servidores.'],
        ['A autenticação pode incluir e-mail e Google. E-mails transacionais são enviados por um provedor seguro em nosso nome.'],
        ['Ao usar MCP, processamos solicitações necessárias para validar acesso, retornar resultados de ícones e aplicar direitos premium.'],
        ['Usamos terceiros para autenticação, cobrança, envio de e-mails e análises básicas de produto.'],
        ['Mantemos registros de conta, cobrança e direitos enquanto forem necessários para operar o serviço, cumprir obrigações legais, resolver disputas e apoiar clientes.'],
        ['Você pode atualizar dados da conta no app. Para solicitações de privacidade, escreva para hello@supericons.dev.'],
      ],
    },
    ar: {
      updated: 'آخر تحديث: 8 أبريل 2026',
      title: 'سياسة الخصوصية',
      headings: ['1. نظرة عامة', '2. البيانات التي نجمعها', '3. تحليلات المنتج', '4. كيفية استخدام البيانات', '5. المدفوعات', '6. المصادقة والبريد الإلكتروني', '7. وصول MCP', '8. خدمات الطرف الثالث', '9. الاحتفاظ بالبيانات', '10. اختياراتك والتواصل'],
      bodies: [
        ['تدير Curly Mole Labs خدمة Supericons. توضح هذه السياسة المعلومات التي نجمعها وكيف نستخدمها.'],
        ['قد نجمع معلومات الحساب مثل البريد الإلكتروني واسم العرض ومزود تسجيل الدخول ومعرفات الحساب.', 'نخزن سجلات الشراء والاستحقاق والاشتراك اللازمة لمنح الوصول إلى المجموعات المميزة وميزات MCP.'],
        ['نجمع تحليلات منتج بدون ملفات تعريف ارتباط لتحسين الاعتمادية وفهم استخدام الميزات.', 'صممت هذه التحليلات لتجنب التتبع الشخصي.'],
        ['نستخدم البيانات لتسجيل الدخول واسترداد الحساب والوصول إلى المشتريات والاشتراكات والدعم ومنع الاحتيال وتحسين المنتج.'],
        ['تتعامل Stripe مع المدفوعات وإدارة الاشتراكات. لا تخزن Supericons تفاصيل البطاقة الكاملة على خوادمها.'],
        ['قد تشمل المصادقة البريد الإلكتروني وتسجيل الدخول عبر Google. ترسل رسائل المعاملات عبر مزود بريد آمن بالنيابة عنا.'],
        ['عند استخدام MCP، نعالج الطلبات اللازمة للتحقق من الوصول وإرجاع نتائج الأيقونات وتطبيق استحقاقات premium.'],
        ['نستخدم مزودين خارجيين للمصادقة والفوترة وإرسال البريد والتحليلات الأساسية للمنتج.'],
        ['نحتفظ بسجلات الحساب والفوترة والاستحقاق طالما كان ذلك ضروريا لتشغيل الخدمة والالتزام بالقانون وحل النزاعات ودعم العملاء.'],
        ['يمكنك تحديث بيانات الحساب في التطبيق. لطلبات الخصوصية، راسل hello@supericons.dev.'],
      ],
    },
  };
  return data[locale];
}

for (const locale of locales) {
  const file = path.join(messagesDir, `${locale}.json`);
  const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
  const shared = common[locale];
  if (shared) {
    merge(catalog, {
      confirm: {
        clearFavoritesDescription: shared.confirm[0],
        clearRecentDescription: shared.confirm[1],
        clearItemsDescription: shared.confirm[2],
        thisDevice: shared.confirm[3],
        browserStorageOnly: shared.confirm[4],
      },
      toast: {
        favoritesCleared: shared.toast[0],
        recentCleared: shared.toast[1],
      },
    });
    applyAuthNotes(catalog, shared.authNote);
  }
  for (const [pageId, values] of Object.entries(docsOverrides[locale] || {})) {
    const [navLabel, kicker, pageTitle, summary] = values;
    catalog.docs.pages[pageId] = { ...(catalog.docs.pages[pageId] || {}), navLabel, kicker, pageTitle, summary };
    if (catalog.docs.pages[pageId].bodyHtml) {
      for (const snippet of docsLeakSnippets) {
        catalog.docs.pages[pageId].bodyHtml = catalog.docs.pages[pageId].bodyHtml.replaceAll(snippet, summary);
      }
      catalog.docs.pages[pageId].bodyHtml = localizedDocsBody(locale, pageTitle, summary);
    }
  }
  if (loggedIn[locale]) merge(catalog, buildLoggedIn(loggedIn[locale]));
  if (apiOnly[locale]) merge(catalog, buildApiMessages(apiOnly[locale]));
  const privacy = getPrivacy(locale);
  if (privacy) {
    catalog.legal.privacy = {
      pageTitle: privacy.title,
      bodyHtml: legalHtml(privacy.updated, privacy.headings.map((title, index) => ({ title, body: privacy.bodies[index] }))),
    };
  }
  fs.writeFileSync(file, `${JSON.stringify(catalog, null, 2)}\n`);
}

console.log('repair-i18n-audit-findings: ok');
