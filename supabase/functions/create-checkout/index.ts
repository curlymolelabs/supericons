// Supericons: Create Stripe Checkout Session
// Supabase Edge Function (Deno)
// POST /functions/v1/create-checkout

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const stripeLocales = new Set([
  'auto',
  'ar',
  'de',
  'en',
  'es',
  'fr',
  'hi',
  'ja',
  'ko',
  'pt',
  'th',
  'vi',
  'zh',
  'zh-TW',
]);

function normalizeStripeLocale(locale: unknown) {
  if (typeof locale !== 'string') return undefined;
  const value = locale.trim();
  return stripeLocales.has(value) ? value : undefined;
}

const appLocales = new Set([
  'ar',
  'de',
  'en',
  'es',
  'hi',
  'ja',
  'ko',
  'pt',
  'th',
  'vi',
  'zh-Hans',
  'zh-Hant',
]);

type CheckoutProductCopy = {
  name: string;
  description: string;
};

type CheckoutLocaleCopy = {
  products: Record<string, CheckoutProductCopy>;
  launch: CheckoutProductCopy;
  pro: {
    title: string;
    monthlyDescription: string;
    annualDescription: string;
  };
};

type CheckoutProductRow = {
  slug: string;
  name: string;
  description: string | null;
  stripe_price_id: string | null;
  status: string;
};

const checkoutCopy: Record<string, CheckoutLocaleCopy> = {
  ar: {
    products: {
      'ai-agentic': { name: 'ذكاء اصطناعي وكيل', description: 'حالات تطبيقات أصلية للذكاء الاصطناعي وحركات ملاحظات الوكلاء' },
      'agentic-motion': { name: 'حركة الوكلاء', description: 'أيقونات وكلاء حية: تسليم المهام وحالات الوكيل ومدفوعات الآلات بالحركة' },
      'status-feedback': { name: 'الحالة والملاحظات', description: 'حركات حالة التطبيق: تحميل، نجاح، خطأ، إشعارات' },
      ecommerce: { name: 'التجارة الإلكترونية', description: 'حركات ملاحظات السلة والدفع والشحن' },
      'navigation-menus': { name: 'التنقل والقوائم', description: 'حركات واجهة المستخدم: القائمة، التبويبات، الشريط الجانبي، البحث' },
      'data-charts': { name: 'البيانات والرسوم', description: 'حالات تحميل لوحات التحكم وحركات الرسوم البيانية' },
      'social-communication': { name: 'التواصل الاجتماعي', description: 'حركات التفاعل والرسائل والمشاركة' },
      'media-playback': { name: 'الوسائط والتشغيل', description: 'حركات عناصر تشغيل الوسائط وحالات التسجيل' },
      'security-auth': { name: 'الأمان والمصادقة', description: 'حركات تسجيل الدخول والأذونات وإشارات الثقة' },
    },
    launch: { name: 'إصدار الإطلاق', description: 'كل المجموعات الثماني، 400 أيقونة متحركة، ومشاريع غير محدودة.' },
    pro: { title: 'الترقية إلى Pro', monthlyDescription: 'وصول MCP، أدوات سير العمل، ومجموعة مميزة واحدة كل شهر.', annualDescription: 'امتلك كل المجموعات المميزة الثماني الآن، مع الإصدارات المستقبلية أثناء تفعيل الخطة السنوية.' },
  },
  de: {
    products: {
      'ai-agentic': { name: 'Agentic AI', description: 'KI-native App-Zustände und Agenten-Feedback-Animationen' },
      'agentic-motion': { name: 'Agentic Motion', description: 'Lebendige Agenten-Icons: Übergaben, Zustände und Maschinenzahlungen in Bewegung' },
      'status-feedback': { name: 'Status & Feedback', description: 'App-Zustandsanimationen: Laden, Erfolg, Fehler und Benachrichtigungen' },
      ecommerce: { name: 'E-Commerce', description: 'Feedback-Animationen für Warenkorb, Zahlung und Versand' },
      'navigation-menus': { name: 'Navigation & Menüs', description: 'UI-Chrome-Animationen: Hamburger, Tabs, Seitenleiste und Suche' },
      'data-charts': { name: 'Daten & Diagramme', description: 'Dashboard-Ladezustände und Diagrammanimationen' },
      'social-communication': { name: 'Social & Kommunikation', description: 'Animationen für Reaktionen, Nachrichten und Teilen' },
      'media-playback': { name: 'Medien & Wiedergabe', description: 'Player-Steuerungen und Aufnahmestatus-Animationen' },
      'security-auth': { name: 'Sicherheit & Auth', description: 'Animationen für Login-Flows, Berechtigungen und Vertrauenssignale' },
    },
    launch: { name: 'Launch Edition', description: 'Alle 8 Kollektionen, 400 animierte Icons, unbegrenzte Projekte.' },
    pro: { title: 'Pro nutzen', monthlyDescription: 'MCP-Zugriff, Workflow-Tools und jeden Monat 1 Premium-Kollektion.', annualDescription: 'Besitze jetzt alle 8 Premium-Kollektionen plus künftige Drops, solange der Jahresplan aktiv ist.' },
  },
  en: {
    products: {
      'ai-agentic': { name: 'Agentic AI', description: 'AI-native app states and agent feedback animations' },
      'agentic-motion': { name: 'Agentic Motion', description: 'Living agent icons: handoffs, lifecycle states, and machine payments in motion' },
      'status-feedback': { name: 'Status & Feedback', description: 'App state animations: loading, success, error, notifications' },
      ecommerce: { name: 'E-commerce', description: 'Cart, payment, and shipping feedback animations' },
      'navigation-menus': { name: 'Navigation & Menus', description: 'UI chrome animations: hamburger, tabs, sidebar, search' },
      'data-charts': { name: 'Data & Charts', description: 'Dashboard loading states and chart animations' },
      'social-communication': { name: 'Social & Communication', description: 'Reactions, messaging, and sharing animations' },
      'media-playback': { name: 'Media & Playback', description: 'Player controls and recording state animations' },
      'security-auth': { name: 'Security & Auth', description: 'Login flows, permissions, and trust signal animations' },
    },
    launch: { name: 'Launch Edition', description: 'All 8 collections, 400 animated icons, unlimited projects.' },
    pro: { title: 'Go Pro', monthlyDescription: 'MCP access, workflow tools, and 1 premium collection every month.', annualDescription: 'Own all 8 premium collections now, plus future drops while annual is active.' },
  },
  es: {
    products: {
      'ai-agentic': { name: 'IA agéntica', description: 'Estados de apps nativas de IA y animaciones de feedback de agentes' },
      'agentic-motion': { name: 'Agentic Motion', description: 'Iconos de agentes vivos: transferencias, estados y pagos entre máquinas en movimiento' },
      'status-feedback': { name: 'Estado y feedback', description: 'Animaciones de estado de app: carga, éxito, error y notificaciones' },
      ecommerce: { name: 'Comercio electrónico', description: 'Animaciones de feedback para carrito, pago y envío' },
      'navigation-menus': { name: 'Navegación y menús', description: 'Animaciones de interfaz: hamburguesa, pestañas, barra lateral y búsqueda' },
      'data-charts': { name: 'Datos y gráficos', description: 'Estados de carga de paneles y animaciones de gráficos' },
      'social-communication': { name: 'Social y comunicación', description: 'Animaciones de reacciones, mensajes y compartir' },
      'media-playback': { name: 'Medios y reproducción', description: 'Animaciones de controles de reproductor y estados de grabación' },
      'security-auth': { name: 'Seguridad y acceso', description: 'Animaciones para login, permisos y señales de confianza' },
    },
    launch: { name: 'Edición de lanzamiento', description: 'Las 8 colecciones, 400 iconos animados, proyectos ilimitados.' },
    pro: { title: 'Pasar a Pro', monthlyDescription: 'Acceso MCP, herramientas de trabajo y 1 colección premium cada mes.', annualDescription: 'Obtén ahora las 8 colecciones premium, más futuros lanzamientos mientras el plan anual esté activo.' },
  },
  hi: {
    products: {
      'ai-agentic': { name: 'एजेंटिक AI', description: 'AI-नेटिव ऐप अवस्थाएँ और एजेंट फीडबैक एनिमेशन' },
      'agentic-motion': { name: 'एजेंटिक मोशन', description: 'जीवंत एजेंट आइकन: हैंडऑफ़, अवस्थाएँ और मशीन भुगतान गति में' },
      'status-feedback': { name: 'स्थिति और फीडबैक', description: 'ऐप स्थिति एनिमेशन: लोडिंग, सफलता, त्रुटि, सूचनाएँ' },
      ecommerce: { name: 'ई-कॉमर्स', description: 'कार्ट, भुगतान और शिपिंग फीडबैक एनिमेशन' },
      'navigation-menus': { name: 'नेविगेशन और मेनू', description: 'UI क्रोम एनिमेशन: हैमबर्गर, टैब, साइडबार, खोज' },
      'data-charts': { name: 'डेटा और चार्ट', description: 'डैशबोर्ड लोडिंग अवस्थाएँ और चार्ट एनिमेशन' },
      'social-communication': { name: 'सोशल और संचार', description: 'रिएक्शन, मैसेजिंग और शेयरिंग एनिमेशन' },
      'media-playback': { name: 'मीडिया प्लेबैक', description: 'प्लेयर नियंत्रण और रिकॉर्डिंग स्थिति एनिमेशन' },
      'security-auth': { name: 'सुरक्षा और प्रमाणीकरण', description: 'लॉगिन, अनुमतियाँ और भरोसे के संकेतों के एनिमेशन' },
    },
    launch: { name: 'लॉन्च एडिशन', description: 'सभी 8 कलेक्शन, 400 एनिमेटेड आइकन, असीमित प्रोजेक्ट।' },
    pro: { title: 'Pro में अपग्रेड करें', monthlyDescription: 'MCP एक्सेस, वर्कफ्लो टूल और हर महीने 1 प्रीमियम कलेक्शन।', annualDescription: 'सभी 8 प्रीमियम कलेक्शन अभी पाएं, साथ में वार्षिक प्लान सक्रिय रहने तक भविष्य के ड्रॉप भी।' },
  },
  ja: {
    products: {
      'ai-agentic': { name: 'エージェント AI', description: 'AI ネイティブアプリの状態とエージェントフィードバックのアニメーション' },
      'agentic-motion': { name: 'エージェンティックモーション', description: '動くエージェントアイコン: ハンドオフ、状態、マシン間決済をアニメーションで表現' },
      'status-feedback': { name: '状態とフィードバック', description: '読み込み、成功、エラー、通知などのアプリ状態アニメーション' },
      ecommerce: { name: 'E コマース', description: 'カート、決済、配送フィードバックのアニメーション' },
      'navigation-menus': { name: 'ナビゲーションとメニュー', description: 'ハンバーガー、タブ、サイドバー、検索などの UI クロームアニメーション' },
      'data-charts': { name: 'データとチャート', description: 'ダッシュボード読み込み状態とチャートアニメーション' },
      'social-communication': { name: 'ソーシャルとコミュニケーション', description: 'リアクション、メッセージ、共有のアニメーション' },
      'media-playback': { name: 'メディア再生', description: 'プレイヤー操作と録画状態のアニメーション' },
      'security-auth': { name: 'セキュリティと認証', description: 'ログイン、権限、信頼シグナルのアニメーション' },
    },
    launch: { name: 'ローンチ版', description: '全 8 コレクション、400 個のアニメーションアイコン、プロジェクト数無制限。' },
    pro: { title: 'Pro にアップグレード', monthlyDescription: 'MCP アクセス、ワークフローツール、毎月 1 つのプレミアムコレクション。', annualDescription: '今すぐ全 8 個のプレミアムコレクションを所有し、年間プラン有効中は今後の追加分も利用できます。' },
  },
  ko: {
    products: {
      'ai-agentic': { name: '에이전트 AI', description: 'AI 네이티브 앱 상태와 에이전트 피드백 애니메이션' },
      'agentic-motion': { name: '에이전틱 모션', description: '살아있는 에이전트 아이콘: 핸드오프, 상태, 머신 결제를 모션으로 표현' },
      'status-feedback': { name: '상태 및 피드백', description: '로딩, 성공, 오류, 알림 등 앱 상태 애니메이션' },
      ecommerce: { name: '이커머스', description: '장바구니, 결제, 배송 피드백 애니메이션' },
      'navigation-menus': { name: '내비게이션 및 메뉴', description: '햄버거, 탭, 사이드바, 검색 등 UI 크롬 애니메이션' },
      'data-charts': { name: '데이터 및 차트', description: '대시보드 로딩 상태와 차트 애니메이션' },
      'social-communication': { name: '소셜 및 커뮤니케이션', description: '반응, 메시징, 공유 애니메이션' },
      'media-playback': { name: '미디어 재생', description: '플레이어 컨트롤과 녹화 상태 애니메이션' },
      'security-auth': { name: '보안 및 인증', description: '로그인 흐름, 권한, 신뢰 신호 애니메이션' },
    },
    launch: { name: '출시판', description: '전체 8개 컬렉션, 애니메이션 아이콘 400개, 프로젝트 무제한.' },
    pro: { title: 'Pro로 업그레이드', monthlyDescription: 'MCP 접근, 워크플로 도구, 매월 프리미엄 컬렉션 1개.', annualDescription: '프리미엄 컬렉션 8개를 지금 모두 소유하고, 연간 플랜 활성 기간 동안 향후 드롭도 이용하세요.' },
  },
  pt: {
    products: {
      'ai-agentic': { name: 'IA agêntica', description: 'Estados de apps nativos de IA e animações de feedback de agentes' },
      'agentic-motion': { name: 'Agentic Motion', description: 'Ícones de agentes vivos: transferências, estados e pagamentos entre máquinas em movimento' },
      'status-feedback': { name: 'Status e feedback', description: 'Animações de estado do app: carregamento, sucesso, erro e notificações' },
      ecommerce: { name: 'E-commerce', description: 'Animações de feedback para carrinho, pagamento e entrega' },
      'navigation-menus': { name: 'Navegação e menus', description: 'Animações de interface: menu, abas, barra lateral e busca' },
      'data-charts': { name: 'Dados e gráficos', description: 'Estados de carregamento de painéis e animações de gráficos' },
      'social-communication': { name: 'Social e comunicação', description: 'Animações de reações, mensagens e compartilhamento' },
      'media-playback': { name: 'Mídia e reprodução', description: 'Animações de controles de player e estado de gravação' },
      'security-auth': { name: 'Segurança e autenticação', description: 'Animações para login, permissões e sinais de confiança' },
    },
    launch: { name: 'Edição de lançamento', description: 'Todas as 8 coleções, 400 ícones animados, projetos ilimitados.' },
    pro: { title: 'Virar Pro', monthlyDescription: 'Acesso MCP, ferramentas de fluxo de trabalho e 1 coleção premium por mês.', annualDescription: 'Tenha agora as 8 coleções premium, além de futuros lançamentos enquanto o anual estiver ativo.' },
  },
  th: {
    products: {
      'ai-agentic': { name: 'AI แบบเอเจนต์', description: 'สถานะแอปแบบ AI-native และแอนิเมชันฟีดแบ็กของเอเจนต์' },
      'agentic-motion': { name: 'เอเจนติกโมชัน', description: 'ไอคอนเอเจนต์ที่มีชีวิต: การส่งต่องาน สถานะ และการชำระเงินระหว่างเครื่องแบบเคลื่อนไหว' },
      'status-feedback': { name: 'สถานะและฟีดแบ็ก', description: 'แอนิเมชันสถานะแอป: โหลด สำเร็จ ข้อผิดพลาด การแจ้งเตือน' },
      ecommerce: { name: 'อีคอมเมิร์ซ', description: 'แอนิเมชันฟีดแบ็กสำหรับรถเข็น การชำระเงิน และการจัดส่ง' },
      'navigation-menus': { name: 'การนำทางและเมนู', description: 'แอนิเมชัน UI: เมนู แท็บ แถบด้านข้าง การค้นหา' },
      'data-charts': { name: 'ข้อมูลและกราฟ', description: 'สถานะโหลดแดชบอร์ดและแอนิเมชันกราฟ' },
      'social-communication': { name: 'โซเชียลและการสื่อสาร', description: 'แอนิเมชันรีแอ็กชัน ข้อความ และการแชร์' },
      'media-playback': { name: 'มีเดียและการเล่น', description: 'แอนิเมชันปุ่มเล่นและสถานะบันทึก' },
      'security-auth': { name: 'ความปลอดภัยและการยืนยันตัวตน', description: 'แอนิเมชันล็อกอิน สิทธิ์ และสัญญาณความน่าเชื่อถือ' },
    },
    launch: { name: 'รุ่นเปิดตัว', description: 'ครบทั้ง 8 คอลเลกชัน ไอคอนเคลื่อนไหว 400 รายการ ใช้ได้ไม่จำกัดโปรเจกต์' },
    pro: { title: 'อัปเกรดเป็น Pro', monthlyDescription: 'สิทธิ์เข้าถึง MCP เครื่องมือเวิร์กโฟลว์ และคอลเลกชันพรีเมียม 1 ชุดทุกเดือน', annualDescription: 'เป็นเจ้าของคอลเลกชันพรีเมียมทั้ง 8 ชุดตอนนี้ พร้อมชุดใหม่ในอนาคตระหว่างที่แผนรายปียังใช้งานอยู่' },
  },
  vi: {
    products: {
      'ai-agentic': { name: 'AI tác nhân', description: 'Trạng thái app gốc AI và hiệu ứng phản hồi tác nhân' },
      'agentic-motion': { name: 'Agentic Motion', description: 'Biểu tượng agent sống động: bàn giao, trạng thái và thanh toán máy với máy trong chuyển động' },
      'status-feedback': { name: 'Trạng thái và phản hồi', description: 'Hiệu ứng trạng thái app: tải, thành công, lỗi, thông báo' },
      ecommerce: { name: 'Thương mại điện tử', description: 'Hiệu ứng phản hồi cho giỏ hàng, thanh toán và giao hàng' },
      'navigation-menus': { name: 'Điều hướng và menu', description: 'Hiệu ứng giao diện: hamburger, tab, thanh bên, tìm kiếm' },
      'data-charts': { name: 'Dữ liệu và biểu đồ', description: 'Trạng thái tải dashboard và hiệu ứng biểu đồ' },
      'social-communication': { name: 'Mạng xã hội và liên lạc', description: 'Hiệu ứng phản ứng, nhắn tin và chia sẻ' },
      'media-playback': { name: 'Phát media', description: 'Hiệu ứng điều khiển trình phát và trạng thái ghi' },
      'security-auth': { name: 'Bảo mật và xác thực', description: 'Hiệu ứng đăng nhập, quyền và tín hiệu tin cậy' },
    },
    launch: { name: 'Bản ra mắt', description: 'Đủ 8 bộ sưu tập, 400 icon động, không giới hạn dự án.' },
    pro: { title: 'Nâng cấp Pro', monthlyDescription: 'Truy cập MCP, công cụ quy trình và 1 bộ premium mỗi tháng.', annualDescription: 'Sở hữu ngay cả 8 bộ premium, cùng các đợt phát hành sau trong thời gian gói năm còn hiệu lực.' },
  },
  'zh-Hans': {
    products: {
      'ai-agentic': { name: '代理式 AI', description: 'AI 原生应用状态和代理反馈动效' },
      'agentic-motion': { name: '智能体动效', description: '生动的智能体图标：任务交接、状态与机器支付的动态呈现' },
      'status-feedback': { name: '状态与反馈', description: '应用状态动效：加载、成功、错误、通知' },
      ecommerce: { name: '电商', description: '购物车、付款和配送反馈动效' },
      'navigation-menus': { name: '导航与菜单', description: '界面框架动效：汉堡菜单、标签页、侧边栏、搜索' },
      'data-charts': { name: '数据与图表', description: '仪表盘加载状态和图表动效' },
      'social-communication': { name: '社交与沟通', description: '反应、消息和分享动效' },
      'media-playback': { name: '媒体播放', description: '播放器控制和录制状态动效' },
      'security-auth': { name: '安全与认证', description: '登录流程、权限和信任提示动效' },
    },
    launch: { name: '发布版', description: '全部 8 个集合，400 个动效图标，不限项目使用。' },
    pro: { title: '升级到 Pro', monthlyDescription: 'MCP 访问、工作流工具，以及每月 1 个高级集合。', annualDescription: '立即拥有全部 8 个高级集合，并在年付有效期内获得后续新增内容。' },
  },
  'zh-Hant': {
    products: {
      'ai-agentic': { name: '代理式 AI', description: 'AI 原生應用狀態與代理回饋動效' },
      'agentic-motion': { name: '智慧代理動效', description: '生動的代理圖示：任務交接、狀態與機器支付的動態呈現' },
      'status-feedback': { name: '狀態與回饋', description: '應用狀態動效：載入、成功、錯誤、通知' },
      ecommerce: { name: '電子商務', description: '購物車、付款與配送回饋動效' },
      'navigation-menus': { name: '導覽與選單', description: '介面框架動效：漢堡選單、分頁、側邊欄、搜尋' },
      'data-charts': { name: '資料與圖表', description: '儀表板載入狀態與圖表動效' },
      'social-communication': { name: '社交與溝通', description: '反應、訊息與分享動效' },
      'media-playback': { name: '媒體播放', description: '播放器控制與錄製狀態動效' },
      'security-auth': { name: '安全與驗證', description: '登入流程、權限與信任提示動效' },
    },
    launch: { name: '發布版', description: '全部 8 個集合，400 個動效圖示，不限專案使用。' },
    pro: { title: '升級到 Pro', monthlyDescription: 'MCP 存取、工作流程工具，以及每月 1 個高級集合。', annualDescription: '立即擁有全部 8 個高級集合，並在年付有效期間取得後續新增內容。' },
  },
};

function normalizeAppLocale(locale: unknown) {
  if (typeof locale !== 'string') return 'en';
  const value = locale.trim();
  return appLocales.has(value) ? value : 'en';
}

function getCheckoutLocaleCopy(locale: string) {
  return checkoutCopy[locale] || checkoutCopy.en;
}

function buildProductDisplayName(name: string) {
  return `Supericons: ${name}`;
}

function getSubscriptionCopy(locale: string, price: Stripe.Price) {
  const copy = getCheckoutLocaleCopy(locale);
  const isAnnual = price.recurring?.interval === 'year';
  return {
    name: copy.pro.title,
    description: isAnnual ? copy.pro.annualDescription : copy.pro.monthlyDescription,
  };
}

function buildLineItemFromPrice(price: Stripe.Price, productData: CheckoutProductCopy, checkoutMode: 'payment' | 'subscription') {
  if (typeof price.unit_amount !== 'number' || !price.currency) {
    throw new Error('Stripe price is missing amount or currency');
  }

  const priceData: Stripe.Checkout.SessionCreateParams.LineItem.PriceData = {
    currency: price.currency,
    unit_amount: price.unit_amount,
    product_data: productData,
  };

  if (checkoutMode === 'subscription') {
    if (!price.recurring) throw new Error('Subscription checkout requires a recurring Stripe price');
    priceData.recurring = {
      interval: price.recurring.interval,
      interval_count: price.recurring.interval_count || 1,
    };
  }

  return {
    price_data: priceData,
    quantity: 1,
  };
}

async function getLocalizedProductData({
  supabase,
  productId,
  priceId,
  stripePrice,
  checkoutMode,
  locale,
}: {
  supabase: any;
  productId?: string;
  priceId: string;
  stripePrice: Stripe.Price;
  checkoutMode: 'payment' | 'subscription';
  locale: string;
}) {
  const copy = getCheckoutLocaleCopy(locale);

  if (checkoutMode === 'subscription') {
    return getSubscriptionCopy(locale, stripePrice);
  }

  if (productId === 'launch_edition') {
    return {
      name: buildProductDisplayName(copy.launch.name),
      description: copy.launch.description,
    };
  }

  if (!productId) {
    return {
      name: 'Supericons',
      description: copy.launch.description,
    };
  }

  const { data, error } = await supabase
    .from('si_products')
    .select('slug,name,description,stripe_price_id,status')
    .eq('id', productId)
    .maybeSingle();

  const product = data as CheckoutProductRow | null;

  if (error || !product) {
    throw new Error('Product not found');
  }

  if (product.status !== 'active') {
    throw new Error('Product is not available');
  }

  if (product.stripe_price_id !== priceId) {
    throw new Error('Price does not match product');
  }

  const localizedProduct = copy.products[product.slug] || {
    name: product.name,
    description: product.description || '',
  };

  return {
    name: buildProductDisplayName(localizedProduct.name),
    description: localizedProduct.description || product.description || '',
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify auth
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { price_id, product_id, success_url, cancel_url, mode, locale } = await req.json();

    if (!price_id || !success_url || !cancel_url) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const checkoutMode = mode === 'subscription' ? 'subscription' : 'payment';
    const appLocale = normalizeAppLocale(locale);

    // Init Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2023-10-16',
    });

    const stripePrice = await stripe.prices.retrieve(price_id);
    const productData = await getLocalizedProductData({
      supabase,
      productId: product_id,
      priceId: price_id,
      stripePrice,
      checkoutMode,
      locale: appLocale,
    });

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: checkoutMode,
      payment_method_types: ['card'],
      line_items: [buildLineItemFromPrice(stripePrice, productData, checkoutMode)],
      success_url,
      cancel_url,
      customer_email: user.email,
      locale: normalizeStripeLocale(locale),
      metadata: {
        user_id: user.id,
        product_id: product_id || '',
        locale: appLocale,
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Checkout error:', err);
    const message = err instanceof Error ? err.message : 'Checkout failed';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
