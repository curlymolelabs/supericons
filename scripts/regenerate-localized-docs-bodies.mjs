import fs from 'node:fs';
import path from 'node:path';

throw new Error('Archived unsafe script: do not regenerate localized docs bodies from generic skeleton copy. Use a verified docs-body localization batch instead.');

const phrases = {
  'zh-Hans': {
    pageContent: '本页内容',
    steps: '实用步骤',
    keep: '保持不翻译的内容',
    intro: (title) => `这份本地化指南说明 ${title}。它保留关键设置值，并用本语言解释如何安全使用 Supericons。`,
    step1: '阅读页面顶部摘要，确认这是否是你当前需要的设置或工作流。',
    step2: '复制代码块时不要翻译代码、命令或环境变量。',
    step3: '如果你使用 MCP，请在修改配置后重启客户端。',
    codeNote: '命令、包名、环境变量、工具 ID 和配置字段必须保持原样，这样 MCP 客户端和代码示例才能正常工作。',
  },
  'zh-Hant': {
    pageContent: '本頁內容',
    steps: '實用步驟',
    keep: '保持不翻譯的內容',
    intro: (title) => `這份在地化指南說明 ${title}。它保留關鍵設定值，並用本語言解釋如何安全使用 Supericons。`,
    step1: '閱讀頁面頂部摘要，確認這是否是你目前需要的設定或工作流程。',
    step2: '複製程式碼區塊時不要翻譯程式碼、命令或環境變數。',
    step3: '如果你使用 MCP，修改設定後請重新啟動用戶端。',
    codeNote: '命令、套件名稱、環境變數、工具 ID 和設定欄位必須保持原樣，這樣 MCP 用戶端和程式碼範例才能正常工作。',
  },
  ja: {
    pageContent: 'このページの内容',
    steps: '実用的な手順',
    keep: '翻訳しない内容',
    intro: (title) => `このローカライズ済みガイドでは ${title} について説明します。重要な設定値はそのまま残し、Supericons を安全に使う方法をこの言語で説明します。`,
    step1: 'ページ上部の概要を読み、現在の設定やワークフローに合うページか確認します。',
    step2: 'コードブロックをコピーするときは、コード、コマンド、環境変数を翻訳しないでください。',
    step3: 'MCP を使用している場合は、設定変更後にクライアントを再起動してください。',
    codeNote: 'コマンド、パッケージ名、環境変数、ツール ID、設定フィールドはそのままにしてください。MCP クライアントとコード例が正しく動作するためです。',
  },
  ko: {
    pageContent: '이 페이지의 내용',
    steps: '실용 단계',
    keep: '번역하지 않는 내용',
    intro: (title) => `이 현지화된 가이드는 ${title}을 설명합니다. 중요한 설정 값은 그대로 두고 Supericons를 안전하게 사용하는 방법을 이 언어로 설명합니다.`,
    step1: '페이지 상단 요약을 읽고 현재 설정이나 워크플로에 맞는지 확인합니다.',
    step2: '코드 블록을 복사할 때 코드, 명령, 환경 변수는 번역하지 마세요.',
    step3: 'MCP를 사용하는 경우 설정을 바꾼 뒤 클라이언트를 다시 시작하세요.',
    codeNote: '명령, 패키지 이름, 환경 변수, 도구 ID 및 설정 필드는 그대로 유지해야 MCP 클라이언트와 코드 예제가 정상적으로 작동합니다.',
  },
  es: {
    pageContent: 'Qué cubre esta página',
    steps: 'Pasos prácticos',
    keep: 'Contenido que no se traduce',
    intro: (title) => `Esta guía localizada explica ${title}. Mantiene intactos los valores de configuración importantes y explica en este idioma cómo usar Supericons con seguridad.`,
    step1: 'Lee el resumen superior y confirma que esta página coincide con tu configuración o flujo actual.',
    step2: 'Al copiar bloques de código, no traduzcas código, comandos ni variables de entorno.',
    step3: 'Si usas MCP, reinicia el cliente después de cambiar la configuración.',
    codeNote: 'Los comandos, nombres de paquetes, variables de entorno, IDs de herramientas y campos de configuración deben mantenerse igual para que los clientes MCP y ejemplos de código funcionen.',
  },
  de: {
    pageContent: 'Was diese Seite behandelt',
    steps: 'Praktische Schritte',
    keep: 'Was nicht übersetzt wird',
    intro: (title) => `Diese lokalisierte Anleitung erklärt ${title}. Wichtige Konfigurationswerte bleiben unverändert, und die Nutzung von Supericons wird auf Deutsch erklärt.`,
    step1: 'Lies die Zusammenfassung oben und prüfe, ob diese Seite zu deiner aktuellen Einrichtung oder deinem Workflow passt.',
    step2: 'Beim Kopieren von Codeblöcken werden Code, Befehle und Umgebungsvariablen nicht übersetzt.',
    step3: 'Wenn du MCP verwendest, starte den Client nach einer Konfigurationsänderung neu.',
    codeNote: 'Befehle, Paketnamen, Umgebungsvariablen, Tool-IDs und Konfigurationsfelder bleiben unverändert, damit MCP-Clients und Codebeispiele funktionieren.',
  },
  pt: {
    pageContent: 'O que esta página cobre',
    steps: 'Passos práticos',
    keep: 'Conteúdo que não deve ser traduzido',
    intro: (title) => `Este guia localizado explica ${title}. Ele mantém valores importantes de configuração intactos e explica em português como usar o Supericons com segurança.`,
    step1: 'Leia o resumo no topo e confirme se esta página corresponde à sua configuração ou fluxo atual.',
    step2: 'Ao copiar blocos de código, não traduza código, comandos nem variáveis de ambiente.',
    step3: 'Se você usa MCP, reinicie o cliente depois de alterar a configuração.',
    codeNote: 'Comandos, nomes de pacotes, variáveis de ambiente, IDs de ferramentas e campos de configuração devem permanecer iguais para que clientes MCP e exemplos de código funcionem.',
  },
  ar: {
    pageContent: 'ما تغطيه هذه الصفحة',
    steps: 'خطوات عملية',
    keep: 'محتوى لا يترجم',
    intro: (title) => `يشرح هذا الدليل المحلي ${title}. يحافظ على قيم الإعداد المهمة كما هي ويشرح بهذه اللغة كيفية استخدام Supericons بأمان.`,
    step1: 'اقرأ الملخص في أعلى الصفحة وتأكد من أن هذه الصفحة تناسب إعدادك أو سير عملك الحالي.',
    step2: 'عند نسخ كتل التعليمات البرمجية، لا تترجم الكود أو الأوامر أو متغيرات البيئة.',
    step3: 'إذا كنت تستخدم MCP، فأعد تشغيل العميل بعد تغيير الإعدادات.',
    codeNote: 'يجب إبقاء الأوامر وأسماء الحزم ومتغيرات البيئة ومعرفات الأدوات وحقول الإعداد كما هي حتى تعمل عملاء MCP وأمثلة الكود بشكل صحيح.',
  },
  hi: {
    pageContent: 'यह पेज क्या कवर करता है',
    steps: 'व्यावहारिक चरण',
    keep: 'जिस सामग्री का अनुवाद नहीं करना है',
    intro: (title) => `यह स्थानीयकृत गाइड ${title} समझाती है। यह महत्वपूर्ण कॉन्फ़िगरेशन मानों को जस का तस रखती है और इस भाषा में बताती है कि Supericons को सुरक्षित रूप से कैसे इस्तेमाल करें।`,
    step1: 'ऊपर दिया सारांश पढ़ें और पक्का करें कि यह पेज आपकी मौजूदा सेटिंग या वर्कफ़्लो से मेल खाता है।',
    step2: 'कोड ब्लॉक कॉपी करते समय कोड, कमांड या पर्यावरण चर का अनुवाद न करें।',
    step3: 'अगर आप MCP इस्तेमाल करते हैं, तो कॉन्फ़िगरेशन बदलने के बाद क्लाइंट को फिर से शुरू करें।',
    codeNote: 'कमांड, पैकेज नाम, पर्यावरण चर, टूल ID और कॉन्फ़िगरेशन फ़ील्ड वैसे ही रहने चाहिए ताकि MCP क्लाइंट और कोड उदाहरण सही काम करें।',
  },
  vi: {
    pageContent: 'Trang này bao gồm gì',
    steps: 'Các bước thực tế',
    keep: 'Nội dung không dịch',
    intro: (title) => `Hướng dẫn bản địa hóa này giải thích ${title}. Hướng dẫn giữ nguyên các giá trị cấu hình quan trọng và giải thích bằng tiếng Việt cách dùng Supericons an toàn.`,
    step1: 'Đọc phần tóm tắt ở đầu trang và xác nhận trang này phù hợp với thiết lập hoặc quy trình hiện tại của bạn.',
    step2: 'Khi sao chép khối mã, không dịch mã, lệnh hoặc biến môi trường.',
    step3: 'Nếu bạn dùng MCP, hãy khởi động lại client sau khi thay đổi cấu hình.',
    codeNote: 'Lệnh, tên gói, biến môi trường, ID công cụ và trường cấu hình phải được giữ nguyên để client MCP và ví dụ mã hoạt động đúng.',
  },
  th: {
    pageContent: 'หน้านี้ครอบคลุมอะไร',
    steps: 'ขั้นตอนที่ใช้ได้จริง',
    keep: 'เนื้อหาที่ไม่ควรแปล',
    intro: (title) => `คู่มือที่แปลเป็นภาษานี้อธิบาย ${title} โดยคงค่าการตั้งค่าที่สำคัญไว้ตามเดิม และอธิบายวิธีใช้ Supericons อย่างปลอดภัยในภาษานี้`,
    step1: 'อ่านสรุปด้านบนและตรวจสอบว่าหน้านี้ตรงกับการตั้งค่าหรือเวิร์กโฟลว์ปัจจุบันของคุณ',
    step2: 'เมื่อคัดลอกบล็อกโค้ด อย่าแปลโค้ด คำสั่ง หรือตัวแปรสภาพแวดล้อม',
    step3: 'ถ้าคุณใช้ MCP ให้รีสตาร์ตไคลเอนต์หลังจากเปลี่ยนการตั้งค่า',
    codeNote: 'คำสั่ง ชื่อแพ็กเกจ ตัวแปรสภาพแวดล้อม ID เครื่องมือ และฟิลด์การตั้งค่าต้องคงไว้เหมือนเดิม เพื่อให้ไคลเอนต์ MCP และตัวอย่างโค้ดทำงานได้ถูกต้อง',
  },
};

function bodyHtml(localePhrases, pageTitle, summary) {
  const intro = localePhrases.intro(pageTitle);
  const overview = summary || intro;
  return `
      <section class="docs-section" id="localized-overview">
        <h2 class="docs-section__title">${localePhrases.pageContent}</h2>
        <p class="docs-section__copy">${overview}</p>
        <p class="docs-section__copy">${intro}</p>
      </section>
      <section class="docs-section" id="localized-steps">
        <h2 class="docs-section__title">${localePhrases.steps}</h2>
        <ol class="docs-list docs-list--numbered">
          <li>${localePhrases.step1}</li>
          <li>${localePhrases.step2}</li>
          <li>${localePhrases.step3}</li>
        </ol>
      </section>
      <section class="docs-callout" id="localized-code-note">
        <h3>${localePhrases.keep}</h3>
        <p>${localePhrases.codeNote}</p>
        <pre><code>npx -y @supericons/mcp@latest
SUPERICONS_API_KEY</code></pre>
      </section>
    `;
}

for (const [locale, localePhrases] of Object.entries(phrases)) {
  const file = path.join('data/i18n/messages', `${locale}.json`);
  const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const page of Object.values(catalog.docs.pages)) {
    page.bodyHtml = bodyHtml(localePhrases, page.pageTitle, page.summary);
  }
  fs.writeFileSync(file, `${JSON.stringify(catalog, null, 2)}\n`);
}

console.log('regenerate-localized-docs-bodies: ok');
