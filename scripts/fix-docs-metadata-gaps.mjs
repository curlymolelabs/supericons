import fs from 'node:fs';
import path from 'node:path';

const overrides = {
  ja: {
    'docs-mcp-others': ['その他の MCP クライアント', 'MCP 設定', 'その他の MCP クライアント', 'MCP 対応の他のクライアントで Supericons を使用します。'],
    'docs-mcp-search-guide': ['検索ガイド', 'MCP リファレンス', 'MCP 検索ガイド', '名前、ライブラリ、用途、意味でアイコンを探します。'],
    'docs-mcp-tools': ['すべてのツール', 'MCP リファレンス', 'MCP ツール', '公開されているすべての Supericons MCP ツールです。'],
    'docs-mcp-icons': ['アイコンツール', 'MCP リファレンス', 'MCP アイコンツール', 'MCP でアイコンを検索して取得します。'],
    'docs-mcp-motion': ['Motion ツール', 'MCP リファレンス', 'Motion Lab MCP ツール', 'MCP でアイコンにアニメーションを付けます。'],
    'docs-mcp-converter': ['Converter ツール', 'MCP リファレンス', 'Converter MCP ツール', 'MCP で PNG と SVG アセットを変換します。'],
    'docs-motion-lab-presets': ['プリセット', 'Motion Lab', 'Motion Lab プリセット', '適切なアニメーションプリセットを選びます。'],
    'docs-motion-lab-triggers': ['トリガー', 'Motion Lab', 'Motion Lab トリガー', 'アニメーションの開始方法を選びます。'],
    'docs-motion-lab-exports': ['書き出し', 'Motion Lab', 'Motion Lab 書き出し', 'Motion Lab CSS またはアニメーション SVG を書き出します。'],
    'docs-motion-lab-mcp-workflow': ['MCP ワークフロー', 'Motion Lab', 'Motion Lab MCP ワークフロー', 'エージェントから Motion Lab を使用します。'],
    'docs-motion-lab-client-setup': ['クライアント設定', 'Motion Lab', 'Motion Lab クライアント設定', 'Motion Lab 用に MCP クライアントを準備します。'],
    'docs-motion-lab-use-cases': ['ユースケース', 'Motion Lab', 'Motion Lab ユースケース', 'モーションを使う場面と静止させる場面を判断します。'],
    'docs-converter-guide': ['Converter ガイド', 'Converter', 'Converter ガイド', '適切な変換ワークフローを選びます。'],
    'docs-converter-settings': ['設定', 'Converter', 'Converter 設定', 'トレース種別、品質、色、出力設定を理解します。'],
    'docs-access-api-keys': ['API キー', 'アクセスと API キー', 'API キー', 'Supericons アカウントの API キーを MCP と他のアプリ連携に使用します。'],
    'docs-access-premium': ['Pro とコレクション', 'アクセスと API キー', 'Pro とコレクション', 'パックを購入するとそのアイコンが使えます。Motion Lab と Converter は Supericons Pro プランに含まれます。'],
    'docs-troubleshooting': ['トラブルシューティング', 'サポート', 'トラブルシューティング', 'MCP 設定、API キー、Motion Lab、Converter の一般的な問題を修正します。'],
  },
  ko: {
    'docs-mcp-others': ['기타 MCP 클라이언트', 'MCP 설정', '기타 MCP 클라이언트', 'MCP를 지원하는 다른 클라이언트에서 Supericons를 사용합니다.'],
    'docs-mcp-search-guide': ['검색 가이드', 'MCP 참조', 'MCP 검색 가이드', '이름, 라이브러리, 사용 사례 또는 의미로 아이콘을 찾습니다.'],
    'docs-mcp-tools': ['모든 도구', 'MCP 참조', 'MCP 도구', '모든 공개 Supericons MCP 도구입니다.'],
    'docs-mcp-icons': ['아이콘 도구', 'MCP 참조', 'MCP 아이콘 도구', 'MCP에서 아이콘을 검색하고 가져옵니다.'],
    'docs-mcp-motion': ['Motion 도구', 'MCP 참조', 'Motion Lab MCP 도구', 'MCP로 아이콘에 애니메이션을 적용합니다.'],
    'docs-mcp-converter': ['Converter 도구', 'MCP 참조', 'Converter MCP 도구', 'MCP를 통해 PNG와 SVG 자산을 변환합니다.'],
    'docs-motion-lab-presets': ['프리셋', 'Motion Lab', 'Motion Lab 프리셋', '적절한 애니메이션 프리셋을 선택합니다.'],
    'docs-motion-lab-triggers': ['트리거', 'Motion Lab', 'Motion Lab 트리거', '애니메이션 시작 방식을 선택합니다.'],
    'docs-motion-lab-exports': ['내보내기', 'Motion Lab', 'Motion Lab 내보내기', 'Motion Lab CSS 또는 애니메이션 SVG를 내보냅니다.'],
    'docs-motion-lab-mcp-workflow': ['MCP 워크플로', 'Motion Lab', 'Motion Lab MCP 워크플로', '에이전트에서 Motion Lab을 사용합니다.'],
    'docs-motion-lab-client-setup': ['클라이언트 설정', 'Motion Lab', 'Motion Lab 클라이언트 설정', 'Motion Lab용 MCP 클라이언트를 준비합니다.'],
    'docs-motion-lab-use-cases': ['사용 사례', 'Motion Lab', 'Motion Lab 사용 사례', '언제 움직임을 쓰고 언제 정지 상태를 유지할지 판단합니다.'],
    'docs-converter-guide': ['Converter 가이드', 'Converter', 'Converter 가이드', '적절한 변환 워크플로를 선택합니다.'],
    'docs-converter-settings': ['설정', 'Converter', 'Converter 설정', '추적 클래스, 품질, 색상 및 출력 설정을 이해합니다.'],
    'docs-access-api-keys': ['API 키', '액세스 및 API 키', 'API 키', 'Supericons 계정의 API 키를 MCP와 다른 앱 연동에 사용합니다.'],
    'docs-access-premium': ['Pro 및 컬렉션', '액세스 및 API 키', 'Pro 및 컬렉션', '팩을 구매하면 해당 아이콘을 사용할 수 있습니다. Motion Lab과 Converter는 Supericons Pro 플랜에 포함됩니다.'],
    'docs-troubleshooting': ['문제 해결', '지원', '문제 해결', 'MCP 설정, API 키, Motion Lab 및 Converter의 일반적인 문제를 해결합니다.'],
  },
  es: {
    'docs-mcp-others': ['Otros clientes MCP', 'Configuración de MCP', 'Otros clientes MCP', 'Usa Supericons con otros clientes compatibles con MCP.'],
    'docs-mcp-search-guide': ['Guía de búsqueda', 'Referencia de MCP', 'Guía de búsqueda MCP', 'Busca iconos por nombre, biblioteca, caso de uso o significado.'],
    'docs-mcp-tools': ['Todas las herramientas', 'Referencia de MCP', 'Herramientas MCP', 'Todas las herramientas públicas de Supericons MCP.'],
    'docs-mcp-icons': ['Herramientas de iconos', 'Referencia de MCP', 'Herramientas MCP de iconos', 'Busca y recupera iconos mediante MCP.'],
    'docs-mcp-motion': ['Herramientas Motion', 'Referencia de MCP', 'Herramientas MCP de Motion Lab', 'Anima iconos mediante MCP.'],
    'docs-mcp-converter': ['Herramientas Converter', 'Referencia de MCP', 'Herramientas MCP de Converter', 'Convierte recursos PNG y SVG mediante MCP.'],
    'docs-motion-lab-presets': ['Preajustes', 'Motion Lab', 'Preajustes de Motion Lab', 'Elige el ajuste de animación correcto.'],
    'docs-motion-lab-triggers': ['Disparadores', 'Motion Lab', 'Disparadores de Motion Lab', 'Elige cómo empieza una animación.'],
    'docs-motion-lab-exports': ['Exportaciones', 'Motion Lab', 'Exportaciones de Motion Lab', 'Exporta CSS de Motion Lab o SVG animado.'],
    'docs-motion-lab-mcp-workflow': ['Flujo MCP', 'Motion Lab', 'Flujo MCP de Motion Lab', 'Usa Motion Lab desde un agente.'],
    'docs-motion-lab-client-setup': ['Configuración del cliente', 'Motion Lab', 'Configuración de cliente para Motion Lab', 'Prepara tu cliente MCP para Motion Lab.'],
    'docs-motion-lab-use-cases': ['Casos de uso', 'Motion Lab', 'Casos de uso de Motion Lab', 'Cuándo usar movimiento y cuándo dejarlo estático.'],
    'docs-converter-guide': ['Guía de Converter', 'Converter', 'Guía de Converter', 'Elige el flujo de conversión correcto.'],
    'docs-converter-settings': ['Configuración', 'Converter', 'Configuración de Converter', 'Comprende la clase de trazado, la calidad, el color y la salida.'],
    'docs-access-api-keys': ['Claves API', 'Acceso y claves API', 'Claves API', 'Usa una clave API de tu cuenta de Supericons para MCP y otras integraciones.'],
    'docs-access-premium': ['Pro y colecciones', 'Acceso y claves API', 'Pro y colecciones', 'Comprar packs te da esos iconos. Motion Lab y Converter forman parte del plan Supericons Pro.'],
    'docs-troubleshooting': ['Solución de problemas', 'Soporte', 'Solución de problemas', 'Corrige problemas comunes con la configuración de MCP, claves API, Motion Lab y Converter.'],
  },
};

const patchLocales = ['de', 'pt', 'ar', 'hi', 'vi', 'th'];
const localeCopyFromSpanish = {
  de: {
    'docs-mcp-search-guide': ['Suchanleitung', 'MCP-Referenz', 'MCP-Suchanleitung', 'Suche Icons nach Name, Bibliothek, Anwendungsfall oder Bedeutung.'],
    'docs-mcp-tools': ['Alle Tools', 'MCP-Referenz', 'MCP-Tools', 'Alle öffentlichen Supericons MCP-Tools.'],
    'docs-mcp-icons': ['Icon-Tools', 'MCP-Referenz', 'MCP-Icon-Tools', 'Suche und lade Icons über MCP.'],
    'docs-mcp-motion': ['Motion-Tools', 'MCP-Referenz', 'Motion Lab MCP-Tools', 'Animiere Icons über MCP.'],
    'docs-mcp-converter': ['Converter-Tools', 'MCP-Referenz', 'Converter MCP-Tools', 'Konvertiere PNG- und SVG-Dateien über MCP.'],
    'docs-converter-settings': ['Einstellungen', 'Converter', 'Converter-Einstellungen', 'Verstehe Trace-Klasse, Qualität, Farbe und Ausgabe.'],
    'docs-motion-lab-presets': ['Voreinstellungen', 'Motion Lab', 'Motion Lab Voreinstellungen', 'Wähle das passende Animationspreset.'],
    'docs-motion-lab-triggers': ['Auslöser', 'Motion Lab', 'Motion Lab Auslöser', 'Wähle, wie eine Animation startet.'],
    'docs-motion-lab-exports': ['Exporte', 'Motion Lab', 'Motion Lab Exporte', 'Exportiere Motion Lab CSS oder animiertes SVG.'],
    'docs-motion-lab-mcp-workflow': ['MCP-Workflow', 'Motion Lab', 'Motion Lab MCP-Workflow', 'Verwende Motion Lab aus einem Agenten.'],
    'docs-motion-lab-client-setup': ['Client-Einrichtung', 'Motion Lab', 'Motion Lab Client-Einrichtung', 'Bereite deinen MCP-Client für Motion Lab vor.'],
    'docs-motion-lab-use-cases': ['Anwendungsfälle', 'Motion Lab', 'Motion Lab Anwendungsfälle', 'Wann Bewegung sinnvoll ist und wann ein Icon ruhig bleiben sollte.'],
    'docs-converter-guide': ['Converter-Anleitung', 'Converter', 'Converter-Anleitung', 'Wähle den passenden Konvertierungsablauf.'],
    'docs-troubleshooting': ['Fehlerbehebung', 'Hilfe', 'Fehlerbehebung', 'Behebe häufige Probleme mit MCP-Einrichtung, API-Schlüsseln, Motion Lab und Converter.'],
  },
  pt: {
    'docs-mcp-search-guide': ['Guia de busca', 'Referência do MCP', 'Guia de busca do MCP', 'Pesquise ícones por nome, biblioteca, caso de uso ou significado.'],
    'docs-mcp-tools': ['Todas as ferramentas', 'Referência do MCP', 'Ferramentas MCP', 'Todas as ferramentas públicas do Supericons MCP.'],
    'docs-mcp-icons': ['Ferramentas de ícones', 'Referência do MCP', 'Ferramentas MCP de ícones', 'Pesquise e recupere ícones pelo MCP.'],
    'docs-mcp-motion': ['Ferramentas Motion', 'Referência do MCP', 'Ferramentas MCP do Motion Lab', 'Anime ícones pelo MCP.'],
    'docs-mcp-converter': ['Ferramentas Converter', 'Referência do MCP', 'Ferramentas MCP do Converter', 'Converta recursos PNG e SVG pelo MCP.'],
    'docs-converter-settings': ['Configurações', 'Converter', 'Configurações do Converter', 'Entenda classe de traçado, qualidade, cor e saída.'],
    'docs-motion-lab-presets': ['Predefinições', 'Motion Lab', 'Predefinições do Motion Lab', 'Escolha a predefinição de animação correta.'],
    'docs-motion-lab-triggers': ['Gatilhos', 'Motion Lab', 'Gatilhos do Motion Lab', 'Escolha como uma animação começa.'],
    'docs-motion-lab-exports': ['Exportações', 'Motion Lab', 'Exportações do Motion Lab', 'Exporte CSS do Motion Lab ou SVG animado.'],
    'docs-motion-lab-mcp-workflow': ['Fluxo MCP', 'Motion Lab', 'Fluxo MCP do Motion Lab', 'Use o Motion Lab a partir de um agente.'],
    'docs-motion-lab-client-setup': ['Configuração do cliente', 'Motion Lab', 'Configuração de cliente do Motion Lab', 'Prepare seu cliente MCP para o Motion Lab.'],
    'docs-motion-lab-use-cases': ['Casos de uso', 'Motion Lab', 'Casos de uso do Motion Lab', 'Quando usar movimento e quando manter estático.'],
    'docs-converter-guide': ['Guia do Converter', 'Converter', 'Guia do Converter', 'Escolha o fluxo de conversão correto.'],
  },
  ar: {
    'docs-mcp-search-guide': ['دليل البحث', 'مرجع MCP', 'دليل بحث MCP', 'ابحث عن الأيقونات حسب الاسم أو المكتبة أو حالة الاستخدام أو المعنى.'],
    'docs-mcp-tools': ['كل الأدوات', 'مرجع MCP', 'أدوات MCP', 'كل أدوات Supericons MCP العامة.'],
    'docs-mcp-icons': ['أدوات الأيقونات', 'مرجع MCP', 'أدوات أيقونات MCP', 'ابحث عن الأيقونات واسترجعها عبر MCP.'],
    'docs-mcp-motion': ['أدوات Motion', 'مرجع MCP', 'أدوات Motion Lab MCP', 'حرّك الأيقونات عبر MCP.'],
    'docs-mcp-converter': ['أدوات Converter', 'مرجع MCP', 'أدوات Converter MCP', 'حوّل أصول PNG و SVG عبر MCP.'],
    'docs-converter-settings': ['الإعدادات', 'Converter', 'إعدادات Converter', 'افهم فئة التتبع والجودة واللون والإخراج.'],
    'docs-motion-lab-presets': ['الإعدادات المسبقة', 'Motion Lab', 'إعدادات Motion Lab المسبقة', 'اختر إعداد الحركة المناسب.'],
    'docs-motion-lab-triggers': ['المشغلات', 'Motion Lab', 'مشغلات Motion Lab', 'اختر كيف تبدأ الحركة.'],
    'docs-motion-lab-exports': ['التصدير', 'Motion Lab', 'تصدير Motion Lab', 'صدّر CSS من Motion Lab أو SVG متحركًا.'],
    'docs-motion-lab-mcp-workflow': ['سير عمل MCP', 'Motion Lab', 'سير عمل Motion Lab MCP', 'استخدم Motion Lab من وكيل.'],
    'docs-motion-lab-client-setup': ['إعداد العميل', 'Motion Lab', 'إعداد عميل Motion Lab', 'حضّر عميل MCP لاستخدام Motion Lab.'],
    'docs-motion-lab-use-cases': ['حالات الاستخدام', 'Motion Lab', 'حالات استخدام Motion Lab', 'متى تستخدم الحركة ومتى تبقي الأيقونة ثابتة.'],
    'docs-converter-guide': ['دليل Converter', 'Converter', 'دليل Converter', 'اختر سير التحويل المناسب.'],
  },
  hi: {
    'docs-mcp-search-guide': ['खोज गाइड', 'MCP संदर्भ', 'MCP खोज गाइड', 'नाम, लाइब्रेरी, उपयोग या अर्थ से आइकन खोजें।'],
    'docs-mcp-tools': ['सभी टूल', 'MCP संदर्भ', 'MCP टूल', 'सभी सार्वजनिक Supericons MCP टूल।'],
    'docs-mcp-icons': ['आइकन टूल', 'MCP संदर्भ', 'MCP आइकन टूल', 'MCP के ज़रिए आइकन खोजें और प्राप्त करें।'],
    'docs-mcp-motion': ['Motion टूल', 'MCP संदर्भ', 'Motion Lab MCP टूल', 'MCP के ज़रिए आइकन ऐनिमेट करें।'],
    'docs-mcp-converter': ['Converter टूल', 'MCP संदर्भ', 'Converter MCP टूल', 'MCP के ज़रिए PNG और SVG एसेट बदलें।'],
    'docs-converter-settings': ['सेटिंग्स', 'Converter', 'Converter सेटिंग्स', 'ट्रेस क्लास, गुणवत्ता, रंग और आउटपुट समझें।'],
    'docs-motion-lab-presets': ['प्रीसेट', 'Motion Lab', 'Motion Lab प्रीसेट', 'सही ऐनिमेशन प्रीसेट चुनें।'],
    'docs-motion-lab-triggers': ['ट्रिगर', 'Motion Lab', 'Motion Lab ट्रिगर', 'चुनें कि ऐनिमेशन कैसे शुरू होगा।'],
    'docs-motion-lab-exports': ['निर्यात', 'Motion Lab', 'Motion Lab निर्यात', 'Motion Lab CSS या ऐनिमेटेड SVG निर्यात करें।'],
    'docs-motion-lab-mcp-workflow': ['MCP वर्कफ़्लो', 'Motion Lab', 'Motion Lab MCP वर्कफ़्लो', 'एजेंट से Motion Lab का उपयोग करें।'],
    'docs-motion-lab-client-setup': ['क्लाइंट सेटअप', 'Motion Lab', 'Motion Lab क्लाइंट सेटअप', 'Motion Lab के लिए अपना MCP क्लाइंट तैयार करें।'],
    'docs-motion-lab-use-cases': ['उपयोग मामले', 'Motion Lab', 'Motion Lab उपयोग मामले', 'कब गति इस्तेमाल करें और कब स्थिर रखें।'],
    'docs-converter-guide': ['Converter गाइड', 'Converter', 'Converter गाइड', 'सही कन्वर्ज़न वर्कफ़्लो चुनें।'],
  },
  vi: {
    'docs-mcp-search-guide': ['Hướng dẫn tìm kiếm', 'Tham khảo MCP', 'Hướng dẫn tìm kiếm MCP', 'Tìm biểu tượng theo tên, thư viện, trường hợp sử dụng hoặc ý nghĩa.'],
    'docs-mcp-tools': ['Tất cả công cụ', 'Tham khảo MCP', 'Công cụ MCP', 'Tất cả công cụ Supericons MCP công khai.'],
    'docs-mcp-icons': ['Công cụ biểu tượng', 'Tham khảo MCP', 'Công cụ biểu tượng MCP', 'Tìm kiếm và lấy biểu tượng qua MCP.'],
    'docs-mcp-motion': ['Công cụ Motion', 'Tham khảo MCP', 'Công cụ Motion Lab MCP', 'Tạo chuyển động cho biểu tượng qua MCP.'],
    'docs-mcp-converter': ['Công cụ Converter', 'Tham khảo MCP', 'Công cụ Converter MCP', 'Chuyển đổi tài nguyên PNG và SVG qua MCP.'],
    'docs-converter-settings': ['Cài đặt', 'Converter', 'Cài đặt Converter', 'Hiểu lớp đồ lại, chất lượng, màu và đầu ra.'],
    'docs-motion-lab-presets': ['Mẫu có sẵn', 'Motion Lab', 'Mẫu có sẵn của Motion Lab', 'Chọn mẫu chuyển động phù hợp.'],
    'docs-motion-lab-triggers': ['Kích hoạt', 'Motion Lab', 'Kích hoạt Motion Lab', 'Chọn cách hoạt ảnh bắt đầu.'],
    'docs-motion-lab-exports': ['Xuất', 'Motion Lab', 'Xuất từ Motion Lab', 'Xuất CSS Motion Lab hoặc SVG động.'],
    'docs-motion-lab-mcp-workflow': ['Quy trình MCP', 'Motion Lab', 'Quy trình Motion Lab MCP', 'Dùng Motion Lab từ một tác nhân.'],
    'docs-motion-lab-client-setup': ['Thiết lập client', 'Motion Lab', 'Thiết lập client Motion Lab', 'Chuẩn bị client MCP cho Motion Lab.'],
    'docs-motion-lab-use-cases': ['Trường hợp sử dụng', 'Motion Lab', 'Trường hợp sử dụng Motion Lab', 'Khi nào nên dùng chuyển động và khi nào nên giữ tĩnh.'],
    'docs-converter-guide': ['Hướng dẫn Converter', 'Converter', 'Hướng dẫn Converter', 'Chọn quy trình chuyển đổi phù hợp.'],
  },
  th: {
    'docs-mcp-search-guide': ['คู่มือการค้นหา', 'อ้างอิง MCP', 'คู่มือค้นหา MCP', 'ค้นหาไอคอนตามชื่อ ไลบรารี กรณีใช้งาน หรือความหมาย'],
    'docs-mcp-tools': ['เครื่องมือทั้งหมด', 'อ้างอิง MCP', 'เครื่องมือ MCP', 'เครื่องมือ Supericons MCP สาธารณะทั้งหมด'],
    'docs-mcp-icons': ['เครื่องมือไอคอน', 'อ้างอิง MCP', 'เครื่องมือไอคอน MCP', 'ค้นหาและดึงไอคอนผ่าน MCP'],
    'docs-mcp-motion': ['เครื่องมือ Motion', 'อ้างอิง MCP', 'เครื่องมือ Motion Lab MCP', 'ทำให้ไอคอนเคลื่อนไหวผ่าน MCP'],
    'docs-mcp-converter': ['เครื่องมือ Converter', 'อ้างอิง MCP', 'เครื่องมือ Converter MCP', 'แปลงไฟล์ PNG และ SVG ผ่าน MCP'],
    'docs-converter-settings': ['การตั้งค่า', 'Converter', 'การตั้งค่า Converter', 'ทำความเข้าใจประเภทการแปลง คุณภาพ สี และผลลัพธ์'],
    'docs-motion-lab-presets': ['พรีเซ็ต', 'Motion Lab', 'พรีเซ็ต Motion Lab', 'เลือกพรีเซ็ตแอนิเมชันที่เหมาะสม'],
    'docs-motion-lab-triggers': ['ทริกเกอร์', 'Motion Lab', 'ทริกเกอร์ Motion Lab', 'เลือกวิธีเริ่มแอนิเมชัน'],
    'docs-motion-lab-exports': ['การส่งออก', 'Motion Lab', 'การส่งออก Motion Lab', 'ส่งออก CSS ของ Motion Lab หรือ SVG แบบเคลื่อนไหว'],
    'docs-motion-lab-mcp-workflow': ['เวิร์กโฟลว์ MCP', 'Motion Lab', 'เวิร์กโฟลว์ Motion Lab MCP', 'ใช้ Motion Lab จากเอเจนต์'],
    'docs-motion-lab-client-setup': ['การตั้งค่าไคลเอนต์', 'Motion Lab', 'การตั้งค่าไคลเอนต์ Motion Lab', 'เตรียมไคลเอนต์ MCP สำหรับ Motion Lab'],
    'docs-motion-lab-use-cases': ['กรณีใช้งาน', 'Motion Lab', 'กรณีใช้งาน Motion Lab', 'ควรใช้การเคลื่อนไหวเมื่อใด และควรปล่อยให้นิ่งเมื่อใด'],
    'docs-converter-guide': ['คู่มือ Converter', 'Converter', 'คู่มือ Converter', 'เลือกเวิร์กโฟลว์การแปลงที่เหมาะสม'],
  },
};

for (const locale of Object.keys(overrides)) {
  const file = path.join('data/i18n/messages', `${locale}.json`);
  const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const [pageId, [navLabel, kicker, pageTitle, summary]] of Object.entries(overrides[locale])) {
    catalog.docs.pages[pageId] = {
      ...(catalog.docs.pages[pageId] || {}),
      navLabel,
      kicker,
      pageTitle,
      summary,
    };
  }
  fs.writeFileSync(file, `${JSON.stringify(catalog, null, 2)}\n`);
}

for (const locale of patchLocales) {
  const file = path.join('data/i18n/messages', `${locale}.json`);
  const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const [pageId, [navLabel, kicker, pageTitle, summary]] of Object.entries(localeCopyFromSpanish[locale])) {
    catalog.docs.pages[pageId] = {
      ...(catalog.docs.pages[pageId] || {}),
      navLabel,
      kicker,
      pageTitle,
      summary,
    };
  }
  fs.writeFileSync(file, `${JSON.stringify(catalog, null, 2)}\n`);
}

console.log('fix-docs-metadata-gaps: ok');
