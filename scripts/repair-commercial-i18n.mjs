import fs from 'node:fs';
import path from 'node:path';

const dir = path.join('data', 'i18n', 'messages');
const locales = fs.readdirSync(dir).filter((file) => file.endsWith('.json')).map((file) => file.replace(/\.json$/, ''));

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

function page(updated, pageTitle, headings, bodies) {
  return {
    pageTitle,
    bodyHtml: legalHtml(updated, headings.map((title, index) => ({ title, body: bodies[index] }))),
  };
}

const english = {
  updated: 'Last updated: April 8, 2026',
  termsTitle: 'Terms of Service',
  privacyTitle: 'Privacy Policy',
  termsHeadings: ['1. Usage Rights', '2. AI Output Rights', '3. Redistribution Policy', '4. Licensing Tiers', '5. Refund Policy', '6. Contact'],
  termsBodies: [
    ['Supericons provides free and premium icon assets for digital products. Free icons keep their original open-source licenses.', 'Premium animated collections are owned by Curly Mole Labs. Your usage rights depend on your license tier.'],
    ['Icons retrieved through the Supericons MCP server may be used in AI-generated code output.', 'The underlying SVG and CSS animation source files remain Curly Mole Labs assets and may not be extracted, reverse-engineered, or bulk-exported.'],
    ['You may not redistribute raw SVG or CSS animation source files, include premium icons as open bundled assets, resell access, sublicense access, or build a competing icon library.', 'You may use icons in finished websites, apps, client work, and compiled output where raw source files are not directly exposed.'],
    ['Single Project License applies to a-la-carte purchases and Pro Monthly collection claims.', 'Unlimited Project License applies to active Pro subscribers, Pro Annual included collections, and Launch Edition purchasers.'],
    ['Pro subscriptions may be canceled at any time. No partial refunds are issued for the current billing period.', 'One-time digital purchases are not refundable after download access is granted, unless a technical issue prevents access and you contact us within 14 days.'],
    ['For terms, licensing, or refund questions, email hello@supericons.dev.'],
  ],
  privacyHeadings: ['1. Overview', '2. Data We Collect', '3. Product Analytics', '4. How We Use Data', '5. Payments', '6. Authentication And Email', '7. MCP Access', '8. Third-Party Services', '9. Data Retention', '10. Your Choices And Contact'],
  privacyBodies: [
    ['Supericons is operated by Curly Mole Labs. This policy explains what information we collect and how we use it.'],
    ['We may collect account information such as email address, display name, authentication provider, and account identifiers.', 'We store purchase, entitlement, and subscription records needed to grant access to premium collections and MCP features.'],
    ['We collect cookie-free product analytics to improve reliability and understand feature usage.', 'These analytics are designed to avoid personal tracking.'],
    ['We use data to provide sign-in, account recovery, purchase access, subscriptions, support, fraud prevention, and product improvements.'],
    ['Payments and subscription management are handled by Stripe. Supericons does not store full card details on its servers.'],
    ['Authentication may include email and Google sign-in. Transactional emails are delivered by a secure email provider on our behalf.'],
    ['When you use MCP, we process requests needed to validate access, return icon results, and enforce premium entitlements.'],
    ['We use third-party providers for authentication, billing, email delivery, and basic product analytics.'],
    ['We keep account, billing, and entitlement records as long as needed to operate the service, meet legal obligations, resolve disputes, and support customers.'],
    ['You can update account details in the app. For privacy requests, email hello@supericons.dev.'],
  ],
  pricing: {
    headerTitle: 'Simple, transparent pricing',
    headerSubtitle: 'Free icons for everyone. Premium animated packs to polish your UI.',
    freeIconsAcrossLibraries: '20,000+ icons across 10 libraries',
    mcpServerFreeIcons: 'MCP server with 20,000+ free icons',
    monthly: 'Monthly',
    annual: 'Annual',
    save45: 'Save 45%',
    save28: 'Save 28%',
    mostPopular: 'Most Popular',
    faqTitle: 'Frequently Asked Questions',
    plans: {
      free: { name: 'Free', description: '{freeIconsAcrossLibraries}, AI search, SVG export. No account needed.', cta: 'Start for Free', features: 'Material, Lucide, Tabler, Phosphor, and more|AI semantic search|SVG, PNG, and CSS export|{mcpServerFreeIcons}|Animated premium packs|Premium icons via MCP' },
      pro: { name: 'Pro', cta: 'Go Pro', monthlyDescription: 'Pro tools, full premium access, and 1 premium collection every month.', annualDescription: 'Own all 8 premium collections now, plus future drops while your annual plan is active.', monthlyFeatures: 'Everything in Free|1 premium collection each month|Access all collections while active|Cancel anytime and keep claimed collections|Motion Lab exports CSS animations|Converter supports unlimited SVG and PNG conversion|Full MCP access for free and premium icons|Commercial use for unlimited projects|Priority support', annualFeatures: 'Everything in Free|Own all 8 premium collections now|Keep the 8 included collections forever|Future premium drops while annual is active|Motion Lab exports CSS animations|Converter supports unlimited SVG and PNG conversion|Full MCP access for free and premium icons|Commercial use for unlimited projects|Priority support' },
      singlePack: { name: 'Single Pack', period: 'per pack', description: 'Pick any one collection. 50 animated icons, yours permanently.', cta: 'Browse Packs', features: 'Everything in Free|50 animated SVG icons per pack|Unique hover animation per icon|Lifetime ownership|Single project license|MCP access for the purchased pack|No Pro tools such as Motion Lab or Converter' },
      launchBundle: { name: 'Launch Bundle', period: 'one-time', description: 'All 8 packs. 400 animated icons. One payment, no subscription.', cta: 'Get Launch Bundle', features: 'All 8 premium packs|400 animated SVG icons|AI, commerce, media, navigation, security, and more|Lifetime ownership plus future updates to those packs|Commercial use for unlimited projects|MCP access for all 8 packs|No Pro tools such as Motion Lab or Converter' },
    },
    faq: {
      questions: 'What the 8 premium animated packs include|How Pro Monthly and Pro Annual collection access works|What the MCP server does|Canceling a Pro subscription|Access after canceling Pro|Commercial use for premium icons|Launch Bundle availability',
      answers: 'Each pack contains 50 animated SVG icons with unique hover animations. The 8 packs cover common product areas such as AI, status, commerce, navigation, media, security, social, and data.|Pro Monthly lets you add 1 premium collection to your permanent library each month. Pro Annual unlocks all 8 current premium collections immediately and includes future premium drops while the annual plan is active.|The MCP server lets AI coding agents search and retrieve icons programmatically. Free users can access the free icon libraries, while paid users can access premium collections tied to their account.|You can cancel from your account dashboard. Pro benefits stay active until the end of the paid billing period.|Claimed or purchased collections stay in your library. Live access to unowned collections, future drops, and Pro tools ends when the subscription period ends unless you renew.|Yes. Premium icons include commercial use according to the license attached to your plan or purchase.|The Launch Bundle is a one-time purchase at launch pricing. It includes the 8 current premium packs and future updates to those same packs.',
    },
  },
};

const localized = {
  en: english,
  'zh-Hans': {
    updated: '最后更新：2026 年 4 月 8 日',
    termsTitle: '服务条款',
    privacyTitle: '隐私政策',
    termsHeadings: ['1. 使用权利', '2. AI 输出权利', '3. 再分发规则', '4. 授权层级', '5. 退款规则', '6. 联系方式'],
    termsBodies: [
      ['Supericons 提供免费和高级图标资源，用于网站、应用和数字产品。免费图标保留原开源许可证。', '高级动画集合归 Curly Mole Labs 所有，你的使用权取决于购买的授权类型。'],
      ['通过 Supericons MCP 服务器取得的图标可以用于 AI 生成的代码输出。', '底层 SVG 和 CSS 动画源文件仍属于 Curly Mole Labs，不得提取、逆向工程或批量导出。'],
      ['你不得再分发原始 SVG 或 CSS 动画源文件，不得作为开放捆绑资源包含高级图标，不得转售访问权限、转授权，或建立竞争性图标库。', '你可以在完成的网站、应用、客户项目和不直接暴露源文件的编译输出中使用图标。'],
      ['单项目授权适用于单独购买和 Pro 月付领取的集合。', '无限项目授权适用于有效 Pro 订阅、Pro 年付包含集合和 Launch Edition 购买者。'],
      ['Pro 订阅可随时取消，当前计费期不提供部分退款。', '一次性数字购买在开通下载后通常不退款；如技术问题导致无法访问，请在 14 天内联系我们。'],
      ['条款、授权或退款问题请发送邮件至 hello@supericons.dev。'],
    ],
    privacyHeadings: ['1. 概览', '2. 收集的数据', '3. 产品分析', '4. 数据用途', '5. 支付', '6. 认证和邮件', '7. MCP 访问', '8. 第三方服务', '9. 数据保留', '10. 你的选择和联系'],
    privacyBodies: [
      ['Supericons 由 Curly Mole Labs 运营。本政策说明我们收集哪些信息以及如何使用。'],
      ['我们可能收集邮箱、显示名称、登录提供方和账户标识等账户信息。', '我们保存购买、权益和订阅记录，以提供高级集合和 MCP 功能访问。'],
      ['我们收集不使用 cookie 的产品分析数据，用于提升可靠性和了解功能使用情况。', '这些分析设计为避免个人追踪。'],
      ['我们使用数据提供登录、账户恢复、购买访问、订阅、支持、防滥用和产品改进。'],
      ['付款和订阅管理由 Stripe 处理。Supericons 不在服务器保存完整银行卡信息。'],
      ['认证可包括邮箱和 Google 登录。交易邮件由安全邮件服务商代为发送。'],
      ['使用 MCP 时，我们会处理验证访问、返回图标结果和执行高级权益所需的请求。'],
      ['我们使用第三方服务处理认证、计费、邮件发送和基础产品分析。'],
      ['我们会在运营服务、履行法律义务、解决争议和支持客户所需期间保留相关记录。'],
      ['你可以在应用中更新账户信息。隐私请求请发送邮件至 hello@supericons.dev。'],
    ],
    pricing: {
      headerTitle: '简单透明的价格',
      headerSubtitle: '免费图标面向所有人。高级动画包让界面更精致。',
      freeIconsAcrossLibraries: '20,000+ 图标，覆盖 10 个图标库',
      mcpServerFreeIcons: 'MCP 服务器，含 20,000+ 免费图标',
      monthly: '月付',
      annual: '年付',
      save45: '节省 45%',
      save28: '节省 28%',
      mostPopular: '最受欢迎',
      faqTitle: '常见问题',
      plans: {
        free: { name: '免费', description: '{freeIconsAcrossLibraries}、AI 搜索、SVG 导出。无需账户。', cta: '免费开始', features: 'Material、Lucide、Tabler、Phosphor 等|AI 语义搜索|SVG、PNG、CSS 导出|{mcpServerFreeIcons}|高级动画包|通过 MCP 使用高级图标' },
        pro: { name: 'Pro', cta: '升级 Pro', monthlyDescription: 'Pro 工具、完整高级访问权限，以及每月 1 个高级集合。', annualDescription: '立即拥有 8 个高级集合，并在年付有效期内获得未来新集合。', monthlyFeatures: '包含免费版全部内容|每月 1 个高级集合|有效期内访问全部集合|可随时取消并保留已领取集合|Motion Lab 可导出 CSS 动画|Converter 支持不限量 SVG 和 PNG 转换|完整 MCP 访问，包含免费和高级图标|商业使用，不限项目|优先支持', annualFeatures: '包含免费版全部内容|立即拥有全部 8 个高级集合|永久保留 8 个包含集合|年付有效期内获得未来高级集合|Motion Lab 可导出 CSS 动画|Converter 支持不限量 SVG 和 PNG 转换|完整 MCP 访问，包含免费和高级图标|商业使用，不限项目|优先支持' },
        singlePack: { name: '单个集合', period: '每个集合', description: '任选一个集合。50 个动画图标，永久拥有。', cta: '浏览集合', features: '包含免费版全部内容|每个集合 50 个动画 SVG 图标|每个图标都有独特悬停动画|永久拥有|单项目授权|购买集合的 MCP 访问|不含 Motion Lab 或 Converter 等 Pro 工具' },
        launchBundle: { name: 'Launch 套装', period: '一次性', description: '全部 8 个集合。400 个动画图标。一次付款，无订阅。', cta: '获取 Launch 套装', features: '全部 8 个高级集合|400 个动画 SVG 图标|覆盖 AI、电商、媒体、导航、安全等场景|永久拥有，并获得这些集合的未来更新|商业使用，不限项目|全部 8 个集合的 MCP 访问|不含 Motion Lab 或 Converter 等 Pro 工具' },
      },
      faq: {
        questions: '8 个高级动画包包含什么|Pro 月付和年付的集合访问如何运作|MCP 服务器的用途|取消 Pro 订阅|取消 Pro 后的访问权限|高级图标的商业使用|Launch 套装的可用性',
        answers: '每个集合包含 50 个动画 SVG 图标，并带有独特悬停动画。8 个集合覆盖 AI、状态、电商、导航、媒体、安全、社交和数据等常见产品场景。|Pro 月付每月可添加 1 个永久集合。Pro 年付会立即解锁当前全部 8 个高级集合，并在年付有效期内包含未来高级新集合。|MCP 服务器让 AI 编程代理可以用程序搜索和获取图标。免费用户可访问免费图标库，付费用户可访问账户绑定的高级集合。|你可以在账户仪表板取消订阅。Pro 权益会保留到已付计费周期结束。|已领取或已购买的集合会留在你的库中。订阅期结束后，未拥有集合的实时访问、未来新集合和 Pro 工具会停止，除非续订。|可以。高级图标根据你的方案或购买所附授权用于商业用途。|Launch 套装是一次性购买，采用发布期价格。它包含当前 8 个高级集合，以及这些集合的未来更新。',
      },
    },
  },
};

function deriveTraditional() {
  return {
    ...localized['zh-Hans'],
    updated: '最後更新：2026 年 4 月 8 日',
    termsTitle: '服務條款',
    privacyTitle: '隱私權政策',
    termsHeadings: ['1. 使用權利', '2. AI 輸出權利', '3. 再散布規則', '4. 授權層級', '5. 退款規則', '6. 聯絡方式'],
    termsBodies: [
      ['Supericons 提供免費與進階圖示資源，可用於網站、應用程式與數位產品。免費圖示保留原本的開源授權。', '進階動畫集合由 Curly Mole Labs 擁有，你的使用權依購買的授權類型而定。'],
      ['透過 Supericons MCP 伺服器取得的圖示可以用於 AI 產生的程式碼輸出。', '底層 SVG 與 CSS 動畫原始檔仍屬於 Curly Mole Labs，不得擷取、逆向工程或批次匯出。'],
      ['你不得再散布原始 SVG 或 CSS 動畫檔，不得將進階圖示作為開放捆綁資源，不得轉售存取權、轉授權，或建立競爭性圖示庫。', '你可以在完成的網站、應用程式、客戶作品，以及不直接暴露原始檔的編譯輸出中使用圖示。'],
      ['單一專案授權適用於單獨購買與 Pro 月付領取的集合。', '無限專案授權適用於有效 Pro 訂閱、Pro 年付包含集合與 Launch Edition 購買者。'],
      ['Pro 訂閱可隨時取消，當期費用不提供部分退款。', '一次性數位購買在開通下載後通常不退款；若技術問題導致無法存取，請在 14 天內聯絡我們。'],
      ['條款、授權或退款問題請寄信至 hello@supericons.dev。'],
    ],
    privacyHeadings: ['1. 概覽', '2. 收集的資料', '3. 產品分析', '4. 資料用途', '5. 付款', '6. 認證與電子郵件', '7. MCP 存取', '8. 第三方服務', '9. 資料保留', '10. 你的選擇與聯絡'],
    privacyBodies: [
      ['Supericons 由 Curly Mole Labs 營運。本政策說明我們收集哪些資訊以及如何使用。'],
      ['我們可能收集電子郵件、顯示名稱、登入提供者與帳戶識別碼等帳戶資訊。', '我們保存購買、權益與訂閱記錄，以提供進階集合與 MCP 功能存取。'],
      ['我們收集不使用 cookie 的產品分析資料，用於提升可靠性與了解功能使用。', '這些分析設計為避免個人追蹤。'],
      ['我們使用資料提供登入、帳戶復原、購買存取、訂閱、支援、防濫用與產品改進。'],
      ['付款與訂閱管理由 Stripe 處理。Supericons 不在伺服器保存完整卡片資料。'],
      ['認證可包含電子郵件與 Google 登入。交易郵件由安全郵件服務商代為發送。'],
      ['使用 MCP 時，我們會處理驗證存取、回傳圖示結果與執行進階權益所需的請求。'],
      ['我們使用第三方服務處理認證、計費、郵件發送與基礎產品分析。'],
      ['我們會在營運服務、履行法律義務、解決爭議與支援客戶所需期間保留相關記錄。'],
      ['你可以在應用程式中更新帳戶資訊。隱私請求請寄信至 hello@supericons.dev。'],
    ],
    pricing: {
      ...localized['zh-Hans'].pricing,
      headerTitle: '簡單透明的價格',
      headerSubtitle: '免費圖示人人可用。進階動畫包讓介面更精緻。',
      freeIconsAcrossLibraries: '20,000+ 圖示，涵蓋 10 個圖示庫',
      mcpServerFreeIcons: 'MCP 伺服器，含 20,000+ 免費圖示',
      monthly: '月付',
      annual: '年付',
      save45: '省 45%',
      save28: '省 28%',
      mostPopular: '最受歡迎',
      faqTitle: '常見問題',
      plans: {
        free: { name: '免費', description: '{freeIconsAcrossLibraries}、AI 搜尋、SVG 匯出。無需帳戶。', cta: '免費開始', features: 'Material、Lucide、Tabler、Phosphor 等|AI 語意搜尋|SVG、PNG、CSS 匯出|{mcpServerFreeIcons}|進階動畫包|透過 MCP 使用進階圖示' },
        pro: { name: 'Pro', cta: '升級 Pro', monthlyDescription: 'Pro 工具、完整進階存取權，以及每月 1 個進階集合。', annualDescription: '立即擁有 8 個進階集合，並在年付有效期內取得未來新集合。', monthlyFeatures: '包含免費版全部內容|每月 1 個進階集合|有效期內存取全部集合|可隨時取消並保留已領取集合|Motion Lab 可匯出 CSS 動畫|Converter 支援不限量 SVG 和 PNG 轉換|完整 MCP 存取，包含免費和進階圖示|商業使用，不限專案|優先支援', annualFeatures: '包含免費版全部內容|立即擁有全部 8 個進階集合|永久保留 8 個包含集合|年付有效期內取得未來進階集合|Motion Lab 可匯出 CSS 動畫|Converter 支援不限量 SVG 和 PNG 轉換|完整 MCP 存取，包含免費和進階圖示|商業使用，不限專案|優先支援' },
        singlePack: { name: '單一集合', period: '每個集合', description: '任選一個集合。50 個動畫圖示，永久擁有。', cta: '瀏覽集合', features: '包含免費版全部內容|每個集合 50 個動畫 SVG 圖示|每個圖示都有獨特懸停動畫|永久擁有|單一專案授權|購買集合的 MCP 存取|不含 Motion Lab 或 Converter 等 Pro 工具' },
        launchBundle: { name: 'Launch 套裝', period: '一次性', description: '全部 8 個集合。400 個動畫圖示。一次付款，無訂閱。', cta: '取得 Launch 套裝', features: '全部 8 個進階集合|400 個動畫 SVG 圖示|涵蓋 AI、電商、媒體、導覽、安全等場景|永久擁有，並取得這些集合的未來更新|商業使用，不限專案|全部 8 個集合的 MCP 存取|不含 Motion Lab 或 Converter 等 Pro 工具' },
      },
      faq: {
        questions: '8 個進階動畫包包含什麼|Pro 月付和年付的集合存取如何運作|MCP 伺服器的用途|取消 Pro 訂閱|取消 Pro 後的存取權|進階圖示的商業使用|Launch 套裝的可用性',
        answers: '每個集合包含 50 個動畫 SVG 圖示，並帶有獨特懸停動畫。8 個集合涵蓋 AI、狀態、電商、導覽、媒體、安全、社交和資料等常見產品場景。|Pro 月付每月可加入 1 個永久集合。Pro 年付會立即解鎖目前全部 8 個進階集合，並在年付有效期內包含未來進階新集合。|MCP 伺服器讓 AI 程式代理能以程式方式搜尋和取得圖示。免費使用者可存取免費圖示庫，付費使用者可存取帳戶綁定的進階集合。|你可以在帳戶儀表板取消訂閱。Pro 權益會保留到已付計費週期結束。|已領取或已購買的集合會留在你的庫中。訂閱期結束後，未擁有集合的即時存取、未來新集合和 Pro 工具會停止，除非續訂。|可以。進階圖示可依你的方案或購買所附授權用於商業用途。|Launch 套裝是一次性購買，採用發布期價格。它包含目前 8 個進階集合，以及這些集合的未來更新。',
      },
    },
  };
}

localized['zh-Hant'] = deriveTraditional();

const compactLocales = {
  es: {
    updated: 'Última actualización: 8 de abril de 2026',
    termsTitle: 'Términos del servicio',
    privacyTitle: 'Política de privacidad',
    termsHeadings: ['1. Derechos de uso', '2. Derechos en salidas de IA', '3. Redistribución', '4. Tipos de licencia', '5. Reembolsos', '6. Contacto'],
    privacyHeadings: ['1. Resumen', '2. Datos que recopilamos', '3. Analítica del producto', '4. Uso de los datos', '5. Pagos', '6. Autenticación y correo', '7. Acceso MCP', '8. Servicios externos', '9. Conservación de datos', '10. Opciones y contacto'],
    pricing: {
      headerTitle: 'Precios simples y transparentes',
      headerSubtitle: 'Iconos gratis para todos. Packs animados premium para pulir tu interfaz.',
      freeIconsAcrossLibraries: '20,000+ iconos en 10 bibliotecas',
      mcpServerFreeIcons: 'Servidor MCP con 20,000+ iconos gratis',
      monthly: 'Mensual',
      annual: 'Anual',
      save45: 'Ahorra 45%',
      save28: 'Ahorra 28%',
      mostPopular: 'Más popular',
      faqTitle: 'Preguntas frecuentes',
      freeName: 'Gratis',
      freeDesc: '{freeIconsAcrossLibraries}, búsqueda con IA y exportación SVG. Sin cuenta.',
      freeCta: 'Empezar gratis',
      freeFeatures: 'Material, Lucide, Tabler, Phosphor y más|Búsqueda semántica con IA|Exportación SVG, PNG y CSS|{mcpServerFreeIcons}|Packs animados premium|Iconos premium por MCP',
      proCta: 'Ir a Pro',
      proMonthlyDesc: 'Herramientas Pro, acceso premium completo y 1 colección premium al mes.',
      proAnnualDesc: 'Obtén las 8 colecciones premium ahora y futuros lanzamientos mientras el plan anual esté activo.',
      proMonthlyFeatures: 'Todo lo de Gratis|1 colección premium al mes|Acceso a todas las colecciones mientras esté activo|Cancela cuando quieras y conserva lo reclamado|Motion Lab exporta animaciones CSS|Converter permite conversión SVG y PNG ilimitada|Acceso MCP completo para iconos gratis y premium|Uso comercial, proyectos ilimitados|Soporte prioritario',
      proAnnualFeatures: 'Todo lo de Gratis|Las 8 colecciones premium ahora|Conserva para siempre las 8 colecciones incluidas|Futuros lanzamientos mientras el plan anual esté activo|Motion Lab exporta animaciones CSS|Converter permite conversión SVG y PNG ilimitada|Acceso MCP completo para iconos gratis y premium|Uso comercial, proyectos ilimitados|Soporte prioritario',
      singleName: 'Pack individual',
      singlePeriod: 'por pack',
      singleDesc: 'Elige una colección. 50 iconos animados, tuyos para siempre.',
      singleCta: 'Ver packs',
      singleFeatures: 'Todo lo de Gratis|50 iconos SVG animados por pack|Animación hover única por icono|Propiedad permanente|Licencia para un proyecto|Acceso MCP al pack comprado|Sin herramientas Pro como Motion Lab o Converter',
      launchName: 'Pack Launch',
      launchPeriod: 'pago único',
      launchDesc: 'Los 8 packs. 400 iconos animados. Un pago, sin suscripción.',
      launchCta: 'Obtener Pack Launch',
      launchFeatures: 'Los 8 packs premium|400 iconos SVG animados|IA, comercio, medios, navegación, seguridad y más|Propiedad permanente y futuras actualizaciones de esos packs|Uso comercial, proyectos ilimitados|Acceso MCP para los 8 packs|Sin herramientas Pro como Motion Lab o Converter',
      faqQuestions: 'Qué incluyen los 8 packs animados premium|Cómo funciona el acceso de Pro mensual y anual|Para qué sirve el servidor MCP en Supericons|Cómo cancelar una suscripción Pro|Qué acceso queda después de cancelar Pro|Cómo usar iconos premium en trabajos comerciales|Qué incluye la disponibilidad del Pack Launch',
      faqAnswers: 'Cada pack incluye 50 iconos SVG animados con animaciones hover únicas. Los 8 packs cubren áreas comunes de producto como IA, estado, comercio, navegación, medios, seguridad, social y datos.|Pro mensual añade 1 colección permanente al mes. Pro anual desbloquea las 8 colecciones premium actuales de inmediato e incluye futuros lanzamientos premium mientras el plan anual esté activo.|El servidor MCP permite que agentes de programación con IA busquen y obtengan iconos de forma programática. Los usuarios gratis acceden a bibliotecas gratuitas y los usuarios de pago acceden a colecciones premium de su cuenta.|Puedes cancelar desde el panel de tu cuenta. Los beneficios Pro siguen activos hasta el final del periodo pagado.|Las colecciones reclamadas o compradas quedan en tu biblioteca. El acceso en vivo a colecciones no poseídas, futuros lanzamientos y herramientas Pro termina al finalizar el periodo salvo que renueves.|Sí. Los iconos premium incluyen uso comercial según la licencia de tu plan o compra.|El Pack Launch es una compra única con precio de lanzamiento. Incluye los 8 packs premium actuales y futuras actualizaciones de esos mismos packs.',
    },
  },
  de: {
    updated: 'Zuletzt aktualisiert: 8. April 2026',
    termsTitle: 'Nutzungsbedingungen',
    privacyTitle: 'Datenschutzrichtlinie',
    termsHeadings: ['1. Nutzungsrechte', '2. Rechte an KI-Ausgaben', '3. Weitergabe', '4. Lizenzstufen', '5. Rückerstattungen', '6. Kontakt'],
    privacyHeadings: ['1. Überblick', '2. Erhobene Daten', '3. Produktanalyse', '4. Nutzung der Daten', '5. Zahlungen', '6. Anmeldung und E-Mail', '7. MCP-Zugriff', '8. Drittanbieter', '9. Aufbewahrung', '10. Optionen und Kontakt'],
    pricing: {
      headerTitle: 'Einfache, transparente Preise',
      headerSubtitle: 'Kostenlose Icons für alle. Premium-Animationspakete für eine bessere Oberfläche.',
      freeIconsAcrossLibraries: '20.000+ Icons aus 10 Bibliotheken',
      mcpServerFreeIcons: 'MCP-Server mit 20.000+ kostenlosen Icons',
      monthly: 'Monatlich',
      annual: 'Jährlich',
      save45: '45% sparen',
      save28: '28% sparen',
      mostPopular: 'Beliebt',
      faqTitle: 'Häufige Fragen',
    },
  },
  fr: {
    updated: 'Dernière mise à jour : 8 avril 2026',
    termsTitle: 'Conditions d’utilisation',
    privacyTitle: 'Politique de confidentialité',
    termsHeadings: ['1. Droits d’utilisation', '2. Droits liés aux sorties IA', '3. Redistribution', '4. Niveaux de licence', '5. Remboursements', '6. Contact'],
    privacyHeadings: ['1. Aperçu', '2. Données collectées', '3. Analyse produit', '4. Utilisation des données', '5. Paiements', '6. Authentification et e-mail', '7. Accès MCP', '8. Services tiers', '9. Conservation', '10. Choix et contact'],
    pricing: {
      headerTitle: 'Tarifs simples et transparents',
      headerSubtitle: 'Des icônes gratuites pour tous. Des packs animés premium pour peaufiner votre interface.',
      freeIconsAcrossLibraries: '20 000+ icônes dans 10 bibliothèques',
      mcpServerFreeIcons: 'Serveur MCP avec 20 000+ icônes gratuites',
      monthly: 'Mensuel',
      annual: 'Annuel',
      save45: 'Économisez 45%',
      save28: 'Économisez 28%',
      mostPopular: 'Le plus populaire',
      faqTitle: 'Questions fréquentes',
    },
  },
  pt: {
    updated: 'Última atualização: 8 de abril de 2026',
    termsTitle: 'Termos de serviço',
    privacyTitle: 'Política de privacidade',
    termsHeadings: ['1. Direitos de uso', '2. Direitos em saídas de IA', '3. Redistribuição', '4. Níveis de licença', '5. Reembolsos', '6. Contato'],
    privacyHeadings: ['1. Visão geral', '2. Dados coletados', '3. Análise do produto', '4. Uso dos dados', '5. Pagamentos', '6. Autenticação e email', '7. Acesso MCP', '8. Serviços de terceiros', '9. Retenção de dados', '10. Escolhas e contato'],
    pricing: {
      headerTitle: 'Preços simples e transparentes',
      headerSubtitle: 'Ícones grátis para todos. Pacotes animados premium para polir sua interface.',
      freeIconsAcrossLibraries: '20.000+ ícones em 10 bibliotecas',
      mcpServerFreeIcons: 'Servidor MCP com 20.000+ ícones grátis',
      monthly: 'Mensal',
      annual: 'Anual',
      save45: 'Economize 45%',
      save28: 'Economize 28%',
      mostPopular: 'Mais popular',
      faqTitle: 'Perguntas frequentes',
    },
  },
  ja: {
    updated: '最終更新日：2026年4月8日',
    termsTitle: '利用規約',
    privacyTitle: 'プライバシーポリシー',
    termsHeadings: ['1. 使用権', '2. AI 出力での利用', '3. 再配布', '4. ライセンス区分', '5. 返金', '6. 連絡先'],
    privacyHeadings: ['1. 概要', '2. 収集するデータ', '3. 製品分析', '4. データの利用目的', '5. 支払い', '6. 認証とメール', '7. MCP アクセス', '8. 外部サービス', '9. データ保持', '10. 選択肢と連絡先'],
    pricing: {
      headerTitle: 'シンプルで透明な料金',
      headerSubtitle: '無料アイコンは誰でも利用できます。プレミアムアニメーションパックで UI を磨けます。',
      freeIconsAcrossLibraries: '10 ライブラリの 20,000+ アイコン',
      mcpServerFreeIcons: '20,000+ 無料アイコン対応の MCP サーバー',
      monthly: '月額',
      annual: '年額',
      save45: '45% お得',
      save28: '28% お得',
      mostPopular: '人気',
      faqTitle: 'よくある質問',
    },
  },
  ko: {
    updated: '마지막 업데이트: 2026년 4월 8일',
    termsTitle: '서비스 약관',
    privacyTitle: '개인정보 처리방침',
    termsHeadings: ['1. 사용 권리', '2. AI 출력물 권리', '3. 재배포', '4. 라이선스 등급', '5. 환불', '6. 문의'],
    privacyHeadings: ['1. 개요', '2. 수집하는 데이터', '3. 제품 분석', '4. 데이터 사용', '5. 결제', '6. 인증 및 이메일', '7. MCP 접근', '8. 외부 서비스', '9. 데이터 보관', '10. 선택권과 문의'],
    pricing: {
      headerTitle: '단순하고 투명한 가격',
      headerSubtitle: '무료 아이콘은 누구나 사용할 수 있습니다. 프리미엄 애니메이션 팩으로 UI를 다듬으세요.',
      freeIconsAcrossLibraries: '10개 라이브러리의 20,000+ 아이콘',
      mcpServerFreeIcons: '20,000+ 무료 아이콘을 제공하는 MCP 서버',
      monthly: '월간',
      annual: '연간',
      save45: '45% 절약',
      save28: '28% 절약',
      mostPopular: '가장 인기',
      faqTitle: '자주 묻는 질문',
    },
  },
  ar: {
    updated: 'آخر تحديث: 8 أبريل 2026',
    termsTitle: 'شروط الخدمة',
    privacyTitle: 'سياسة الخصوصية',
    termsHeadings: ['1. حقوق الاستخدام', '2. حقوق مخرجات الذكاء الاصطناعي', '3. إعادة التوزيع', '4. مستويات الترخيص', '5. سياسة الاسترداد', '6. التواصل'],
    privacyHeadings: ['1. نظرة عامة', '2. البيانات التي نجمعها', '3. تحليلات المنتج', '4. كيفية استخدام البيانات', '5. المدفوعات', '6. المصادقة والبريد', '7. وصول MCP', '8. خدمات الطرف الثالث', '9. الاحتفاظ بالبيانات', '10. اختياراتك والتواصل'],
    pricing: {
      headerTitle: 'أسعار بسيطة وواضحة',
      headerSubtitle: 'أيقونات مجانية للجميع وحزم متحركة مميزة لتحسين الواجهة.',
      freeIconsAcrossLibraries: 'أكثر من 20,000 أيقونة عبر 10 مكتبات',
      mcpServerFreeIcons: 'خادم MCP مع أكثر من 20,000 أيقونة مجانية',
      monthly: 'شهري',
      annual: 'سنوي',
      save45: 'وفر 45%',
      save28: 'وفر 28%',
      mostPopular: 'الأكثر شيوعا',
      faqTitle: 'الأسئلة الشائعة',
    },
  },
  hi: {
    updated: 'अंतिम अपडेट: 8 अप्रैल 2026',
    termsTitle: 'सेवा की शर्तें',
    privacyTitle: 'गोपनीयता नीति',
    termsHeadings: ['1. उपयोग अधिकार', '2. AI आउटपुट अधिकार', '3. पुनर्वितरण', '4. लाइसेंस स्तर', '5. रिफंड नीति', '6. संपर्क'],
    privacyHeadings: ['1. अवलोकन', '2. हम कौन सा डेटा लेते हैं', '3. उत्पाद विश्लेषण', '4. डेटा का उपयोग', '5. भुगतान', '6. प्रमाणीकरण और ईमेल', '7. MCP पहुंच', '8. तृतीय-पक्ष सेवाएं', '9. डेटा रखरखाव', '10. आपके विकल्प और संपर्क'],
    pricing: {
      headerTitle: 'सरल और साफ कीमतें',
      headerSubtitle: 'सभी के लिए मुफ्त आइकन। UI को बेहतर बनाने के लिए प्रीमियम एनिमेटेड पैक।',
      freeIconsAcrossLibraries: '10 लाइब्रेरी में 20,000+ आइकन',
      mcpServerFreeIcons: '20,000+ मुफ्त आइकन वाला MCP सर्वर',
      monthly: 'मासिक',
      annual: 'वार्षिक',
      save45: '45% बचत',
      save28: '28% बचत',
      mostPopular: 'सबसे लोकप्रिय',
      faqTitle: 'अक्सर पूछे जाने वाले प्रश्न',
    },
  },
  vi: {
    updated: 'Cập nhật lần cuối: 8 tháng 4, 2026',
    termsTitle: 'Điều khoản dịch vụ',
    privacyTitle: 'Chính sách quyền riêng tư',
    termsHeadings: ['1. Quyền sử dụng', '2. Quyền với đầu ra AI', '3. Phân phối lại', '4. Cấp phép', '5. Hoàn tiền', '6. Liên hệ'],
    privacyHeadings: ['1. Tổng quan', '2. Dữ liệu chúng tôi thu thập', '3. Phân tích sản phẩm', '4. Cách dùng dữ liệu', '5. Thanh toán', '6. Xác thực và email', '7. Truy cập MCP', '8. Dịch vụ bên thứ ba', '9. Lưu giữ dữ liệu', '10. Lựa chọn và liên hệ'],
    pricing: {
      headerTitle: 'Giá đơn giản, minh bạch',
      headerSubtitle: 'Biểu tượng miễn phí cho mọi người. Gói động cao cấp giúp giao diện tinh tế hơn.',
      freeIconsAcrossLibraries: '20.000+ biểu tượng trong 10 thư viện',
      mcpServerFreeIcons: 'Máy chủ MCP với 20.000+ biểu tượng miễn phí',
      monthly: 'Hàng tháng',
      annual: 'Hàng năm',
      save45: 'Tiết kiệm 45%',
      save28: 'Tiết kiệm 28%',
      mostPopular: 'Phổ biến nhất',
      faqTitle: 'Câu hỏi thường gặp',
    },
  },
  th: {
    updated: 'อัปเดตล่าสุด: 8 เมษายน 2026',
    termsTitle: 'ข้อกำหนดการให้บริการ',
    privacyTitle: 'นโยบายความเป็นส่วนตัว',
    termsHeadings: ['1. สิทธิ์การใช้งาน', '2. สิทธิ์ในผลงานจาก AI', '3. การแจกจ่ายต่อ', '4. ระดับใบอนุญาต', '5. การคืนเงิน', '6. ติดต่อ'],
    privacyHeadings: ['1. ภาพรวม', '2. ข้อมูลที่เราเก็บ', '3. การวิเคราะห์ผลิตภัณฑ์', '4. การใช้ข้อมูล', '5. การชำระเงิน', '6. การยืนยันตัวตนและอีเมล', '7. การเข้าถึง MCP', '8. บริการภายนอก', '9. การเก็บรักษาข้อมูล', '10. ตัวเลือกและการติดต่อ'],
    pricing: {
      headerTitle: 'ราคาง่ายและโปร่งใส',
      headerSubtitle: 'ไอคอนฟรีสำหรับทุกคน แพ็กแอนิเมชันพรีเมียมช่วยขัดเกลา UI',
      freeIconsAcrossLibraries: 'ไอคอน 20,000+ รายการใน 10 ไลบรารี',
      mcpServerFreeIcons: 'เซิร์ฟเวอร์ MCP พร้อมไอคอนฟรี 20,000+ รายการ',
      monthly: 'รายเดือน',
      annual: 'รายปี',
      save45: 'ประหยัด 45%',
      save28: 'ประหยัด 28%',
      mostPopular: 'ยอดนิยม',
      faqTitle: 'คำถามที่พบบ่อย',
    },
  },
};

const qualityPricingText = {
  de: {
    freeDesc: '{freeIconsAcrossLibraries}, KI-Suche und SVG-Export. Kein Konto erforderlich.',
    freeFeatures: 'Material, Lucide, Tabler, Phosphor und mehr|Semantische KI-Suche|SVG-, PNG- und CSS-Export|{mcpServerFreeIcons}|Animierte Premium-Pakete|Premium-Icons über MCP',
    proMonthlyDesc: 'Pro-Werkzeuge, voller Premium-Zugriff und 1 Premium-Kollektion pro Monat.',
    proAnnualDesc: 'Erhalte alle 8 Premium-Kollektionen sofort und zukünftige Drops, solange der Jahresplan aktiv ist.',
    proMonthlyFeatures: 'Alles aus Kostenlos|1 Premium-Kollektion pro Monat|Zugriff auf alle Kollektionen während der aktiven Laufzeit|Jederzeit kündbar und beanspruchte Kollektionen behalten|Motion Lab exportiert CSS-Animationen|Converter unterstützt unbegrenzte SVG- und PNG-Konvertierung|Voller MCP-Zugriff für kostenlose und Premium-Icons|Kommerzielle Nutzung für unbegrenzte Projekte|Priorisierter Support',
    proAnnualFeatures: 'Alles aus Kostenlos|Alle 8 Premium-Kollektionen sofort besitzen|Die 8 enthaltenen Kollektionen dauerhaft behalten|Zukünftige Premium-Drops während der Jahreslaufzeit|Motion Lab exportiert CSS-Animationen|Converter unterstützt unbegrenzte SVG- und PNG-Konvertierung|Voller MCP-Zugriff für kostenlose und Premium-Icons|Kommerzielle Nutzung für unbegrenzte Projekte|Priorisierter Support',
    singleDesc: 'Wähle eine Kollektion. 50 animierte Icons, dauerhaft in deiner Bibliothek.',
    singleFeatures: 'Alles aus Kostenlos|50 animierte SVG-Icons pro Paket|Eigene Hover-Animation pro Icon|Dauerhafter Besitz|Lizenz für ein Projekt|MCP-Zugriff auf das gekaufte Paket|Keine Pro-Werkzeuge wie Motion Lab oder Converter',
    launchDesc: 'Alle 8 Pakete. 400 animierte Icons. Eine Zahlung, kein Abo.',
    launchFeatures: 'Alle 8 Premium-Pakete|400 animierte SVG-Icons|KI, Commerce, Medien, Navigation, Sicherheit und mehr|Dauerhafter Besitz plus zukünftige Updates dieser Pakete|Kommerzielle Nutzung für unbegrenzte Projekte|MCP-Zugriff auf alle 8 Pakete|Keine Pro-Werkzeuge wie Motion Lab oder Converter',
    faqQuestions: 'Was enthalten die 8 animierten Premium-Pakete|Wie funktionieren Pro Monatlich und Pro Jährlich|Wofür wird der MCP-Server in Supericons genutzt|Wie kündige ich ein Pro-Abo|Welcher Zugriff bleibt nach dem Kündigen von Pro|Wie dürfen Premium-Icons kommerziell genutzt werden|Was umfasst die Verfügbarkeit des Launch-Pakets',
    faqAnswers: 'Jedes Paket enthält 50 animierte SVG-Icons mit eigenen Hover-Animationen. Die 8 Pakete decken Produktbereiche wie KI, Status, Commerce, Navigation, Medien, Sicherheit, Social und Daten ab.|Pro Monatlich fügt jeden Monat 1 Premium-Kollektion dauerhaft zu deiner Bibliothek hinzu. Pro Jährlich schaltet alle 8 aktuellen Premium-Kollektionen sofort frei und umfasst zukünftige Premium-Drops während der Jahreslaufzeit.|Der MCP-Server lässt KI-Coding-Agenten Icons programmatisch suchen und abrufen. Kostenlose Nutzer greifen auf freie Bibliotheken zu, zahlende Nutzer auf die Premium-Kollektionen ihres Kontos.|Du kannst im Konto-Dashboard kündigen. Pro-Vorteile bleiben bis zum Ende des bezahlten Abrechnungszeitraums aktiv.|Beanspruchte oder gekaufte Kollektionen bleiben in deiner Bibliothek. Live-Zugriff auf nicht besessene Kollektionen, zukünftige Drops und Pro-Werkzeuge endet nach der Laufzeit, sofern du nicht verlängerst.|Ja. Premium-Icons dürfen gemäß der Lizenz deines Plans oder Kaufs kommerziell genutzt werden.|Das Launch-Paket ist ein einmaliger Kauf zum Einführungspreis. Es enthält die 8 aktuellen Premium-Pakete und zukünftige Updates für genau diese Pakete.',
  },
  fr: {
    freeDesc: '{freeIconsAcrossLibraries}, recherche IA et export SVG. Aucun compte requis.',
    freeFeatures: 'Material, Lucide, Tabler, Phosphor et plus|Recherche sémantique par IA|Export SVG, PNG et CSS|{mcpServerFreeIcons}|Packs animés premium|Icônes premium via MCP',
    proMonthlyDesc: 'Outils Pro, accès premium complet et 1 collection premium chaque mois.',
    proAnnualDesc: 'Obtenez les 8 collections premium maintenant, ainsi que les futurs ajouts pendant que le plan annuel est actif.',
    proMonthlyFeatures: 'Tout ce qui est inclus dans Gratuit|1 collection premium par mois|Accès à toutes les collections pendant la période active|Annulation possible à tout moment avec conservation des collections réclamées|Motion Lab exporte des animations CSS|Converter permet une conversion SVG et PNG illimitée|Accès MCP complet aux icônes gratuites et premium|Usage commercial pour un nombre illimité de projets|Support prioritaire',
    proAnnualFeatures: 'Tout ce qui est inclus dans Gratuit|Possession immédiate des 8 collections premium|Conservation permanente des 8 collections incluses|Futurs ajouts premium pendant la période annuelle|Motion Lab exporte des animations CSS|Converter permet une conversion SVG et PNG illimitée|Accès MCP complet aux icônes gratuites et premium|Usage commercial pour un nombre illimité de projets|Support prioritaire',
    singleDesc: 'Choisissez une collection. 50 icônes animées, à vous durablement.',
    singleFeatures: 'Tout ce qui est inclus dans Gratuit|50 icônes SVG animées par pack|Animation au survol propre à chaque icône|Possession permanente|Licence pour un projet|Accès MCP au pack acheté|Pas d’outils Pro comme Motion Lab ou Converter',
    launchDesc: 'Les 8 packs. 400 icônes animées. Un paiement, sans abonnement.',
    launchFeatures: 'Les 8 packs premium|400 icônes SVG animées|IA, commerce, médias, navigation, sécurité et plus|Possession permanente plus futures mises à jour de ces packs|Usage commercial pour un nombre illimité de projets|Accès MCP aux 8 packs|Pas d’outils Pro comme Motion Lab ou Converter',
    faqQuestions: 'Ce que contiennent les 8 packs animés premium|Comment fonctionnent Pro mensuel et Pro annuel|À quoi sert le serveur MCP dans Supericons|Comment annuler un abonnement Pro|Quel accès reste après l’annulation de Pro|Comment utiliser les icônes premium à des fins commerciales|Ce que couvre la disponibilité du Pack Launch',
    faqAnswers: 'Chaque pack contient 50 icônes SVG animées avec des animations au survol uniques. Les 8 packs couvrent des domaines produit comme IA, état, commerce, navigation, médias, sécurité, social et données.|Pro mensuel ajoute 1 collection premium permanente chaque mois. Pro annuel débloque immédiatement les 8 collections premium actuelles et inclut les futurs ajouts premium pendant la période annuelle.|Le serveur MCP permet aux agents de code IA de rechercher et récupérer des icônes par programme. Les utilisateurs gratuits accèdent aux bibliothèques gratuites, les utilisateurs payants aux collections premium liées à leur compte.|Vous pouvez annuler depuis le tableau de bord du compte. Les avantages Pro restent actifs jusqu’à la fin de la période payée.|Les collections réclamées ou achetées restent dans votre bibliothèque. L’accès en direct aux collections non possédées, aux futurs ajouts et aux outils Pro prend fin à la fin de la période, sauf renouvellement.|Oui. Les icônes premium incluent un usage commercial selon la licence de votre plan ou achat.|Le Pack Launch est un achat unique au prix de lancement. Il inclut les 8 packs premium actuels et les futures mises à jour de ces mêmes packs.',
  },
  pt: {
    freeDesc: '{freeIconsAcrossLibraries}, busca com IA e exportação SVG. Não precisa de conta.',
    freeFeatures: 'Material, Lucide, Tabler, Phosphor e mais|Busca semântica com IA|Exportação SVG, PNG e CSS|{mcpServerFreeIcons}|Pacotes animados premium|Ícones premium via MCP',
    proMonthlyDesc: 'Ferramentas Pro, acesso premium completo e 1 coleção premium por mês.',
    proAnnualDesc: 'Tenha as 8 coleções premium agora e futuros lançamentos enquanto o plano anual estiver ativo.',
    proMonthlyFeatures: 'Tudo do Grátis|1 coleção premium por mês|Acesso a todas as coleções enquanto ativo|Cancele quando quiser e mantenha coleções resgatadas|Motion Lab exporta animações CSS|Converter oferece conversão SVG e PNG ilimitada|Acesso MCP completo para ícones gratuitos e premium|Uso comercial em projetos ilimitados|Suporte prioritário',
    proAnnualFeatures: 'Tudo do Grátis|Tenha as 8 coleções premium agora|Mantenha para sempre as 8 coleções incluídas|Futuros lançamentos premium enquanto o anual estiver ativo|Motion Lab exporta animações CSS|Converter oferece conversão SVG e PNG ilimitada|Acesso MCP completo para ícones gratuitos e premium|Uso comercial em projetos ilimitados|Suporte prioritário',
    singleDesc: 'Escolha uma coleção. 50 ícones animados, seus permanentemente.',
    singleFeatures: 'Tudo do Grátis|50 ícones SVG animados por pacote|Animação de hover exclusiva por ícone|Propriedade permanente|Licença para um projeto|Acesso MCP ao pacote comprado|Sem ferramentas Pro como Motion Lab ou Converter',
    launchDesc: 'Todos os 8 pacotes. 400 ícones animados. Um pagamento, sem assinatura.',
    launchFeatures: 'Todos os 8 pacotes premium|400 ícones SVG animados|IA, comércio, mídia, navegação, segurança e mais|Propriedade permanente mais futuras atualizações desses pacotes|Uso comercial em projetos ilimitados|Acesso MCP aos 8 pacotes|Sem ferramentas Pro como Motion Lab ou Converter',
    faqQuestions: 'O que os 8 pacotes animados premium incluem|Como funcionam Pro mensal e Pro anual|Para que serve o servidor MCP no Supericons|Como cancelar a assinatura Pro|Que acesso continua depois de cancelar Pro|Como usar ícones premium em trabalhos comerciais|O que a disponibilidade do Pacote Launch inclui',
    faqAnswers: 'Cada pacote contém 50 ícones SVG animados com animações de hover exclusivas. Os 8 pacotes cobrem áreas de produto como IA, status, comércio, navegação, mídia, segurança, social e dados.|Pro mensal adiciona 1 coleção premium permanente por mês. Pro anual libera imediatamente as 8 coleções premium atuais e inclui futuros lançamentos premium enquanto o plano anual estiver ativo.|O servidor MCP permite que agentes de código com IA pesquisem e recuperem ícones por programa. Usuários gratuitos acessam bibliotecas gratuitas, usuários pagos acessam coleções premium da conta.|Você pode cancelar no painel da conta. Os benefícios Pro ficam ativos até o fim do período pago.|Coleções resgatadas ou compradas ficam na sua biblioteca. O acesso ao vivo a coleções não possuídas, futuros lançamentos e ferramentas Pro termina ao fim do período, salvo renovação.|Sim. Ícones premium incluem uso comercial conforme a licença do seu plano ou compra.|O Pacote Launch é uma compra única com preço de lançamento. Ele inclui os 8 pacotes premium atuais e futuras atualizações desses mesmos pacotes.',
  },
  ja: {
    freeDesc: '{freeIconsAcrossLibraries}、AI 検索、SVG エクスポート。アカウント不要。',
    freeFeatures: 'Material、Lucide、Tabler、Phosphor など|AI セマンティック検索|SVG、PNG、CSS エクスポート|{mcpServerFreeIcons}|プレミアムアニメーションパック|MCP 経由のプレミアムアイコン',
    proMonthlyDesc: 'Pro ツール、プレミアム全体へのアクセス、毎月 1 つのプレミアムコレクション。',
    proAnnualDesc: '現在の 8 つのプレミアムコレクションをすぐに所有し、年額プランが有効な間は今後の追加分も利用できます。',
    proMonthlyFeatures: '無料プランのすべて|毎月 1 つのプレミアムコレクション|有効期間中はすべてのコレクションにアクセス|いつでも解約でき、取得済みコレクションは保持|Motion Lab で CSS アニメーションをエクスポート|Converter で SVG と PNG を無制限に変換|無料とプレミアムの両方に完全 MCP アクセス|商用利用、プロジェクト数無制限|優先サポート',
    proAnnualFeatures: '無料プランのすべて|8 つのプレミアムコレクションをすぐに所有|含まれる 8 コレクションを永続保持|年額プランが有効な間の今後のプレミアム追加分|Motion Lab で CSS アニメーションをエクスポート|Converter で SVG と PNG を無制限に変換|無料とプレミアムの両方に完全 MCP アクセス|商用利用、プロジェクト数無制限|優先サポート',
    singleDesc: '好きなコレクションを 1 つ選択。50 個のアニメーションアイコンを永続利用できます。',
    singleFeatures: '無料プランのすべて|1 パックあたり 50 個のアニメーション SVG アイコン|各アイコン固有のホバーアニメーション|永続所有|1 プロジェクトライセンス|購入パックの MCP アクセス|Motion Lab や Converter などの Pro ツールは対象外',
    launchDesc: '8 パックすべて。400 個のアニメーションアイコン。買い切りでサブスクリプションなし。',
    launchFeatures: '8 つのプレミアムパックすべて|400 個のアニメーション SVG アイコン|AI、コマース、メディア、ナビゲーション、セキュリティなど|永続所有と対象パックの将来アップデート|商用利用、プロジェクト数無制限|8 パックすべての MCP アクセス|Motion Lab や Converter などの Pro ツールは対象外',
    faqQuestions: '8 つのプレミアムアニメーションパックに含まれる内容|Pro 月額と Pro 年額のアクセスの違い|Supericons の MCP サーバーでできること|Pro サブスクリプションを解約する方法|Pro 解約後も残るアクセス内容|プレミアムアイコンを商用利用する方法|Launch バンドルに含まれる内容',
    faqAnswers: '各パックには、固有のホバーアニメーションを持つ 50 個のアニメーション SVG アイコンが含まれます。8 パックは AI、ステータス、コマース、ナビゲーション、メディア、セキュリティ、ソーシャル、データなどを対象にします。|Pro 月額では毎月 1 つのプレミアムコレクションを永続ライブラリに追加できます。Pro 年額では現在の 8 つのプレミアムコレクションをすぐに解放し、年額期間中の今後のプレミアム追加分も含みます。|MCP サーバーは、AI コーディングエージェントがプログラムからアイコンを検索して取得できるようにします。無料ユーザーは無料ライブラリ、有料ユーザーはアカウントに紐づくプレミアムコレクションを利用できます。|アカウント画面から解約できます。Pro 特典は支払い済み期間の終了まで有効です。|取得済みまたは購入済みのコレクションはライブラリに残ります。未所有コレクションへのライブアクセス、今後の追加分、Pro ツールは期間終了時に停止します。|はい。プレミアムアイコンは、プランまたは購入に付属するライセンスに従って商用利用できます。|Launch バンドルはローンチ価格の買い切りです。現在の 8 つのプレミアムパックと、それら同じパックの将来アップデートを含みます。',
  },
  ko: {
    freeDesc: '{freeIconsAcrossLibraries}, AI 검색, SVG 내보내기. 계정은 필요하지 않습니다.',
    freeFeatures: 'Material, Lucide, Tabler, Phosphor 등|AI 의미 검색|SVG, PNG, CSS 내보내기|{mcpServerFreeIcons}|프리미엄 애니메이션 팩|MCP를 통한 프리미엄 아이콘',
    proMonthlyDesc: 'Pro 도구, 전체 프리미엄 접근, 매월 1개의 프리미엄 컬렉션.',
    proAnnualDesc: '현재 8개 프리미엄 컬렉션을 바로 소유하고 연간 플랜이 활성인 동안 향후 드롭도 이용합니다.',
    proMonthlyFeatures: '무료 플랜 전체|매월 1개 프리미엄 컬렉션|활성 기간 동안 모든 컬렉션 접근|언제든 취소하고 받은 컬렉션 유지|Motion Lab에서 CSS 애니메이션 내보내기|Converter에서 SVG 및 PNG 무제한 변환|무료와 프리미엄 아이콘 전체 MCP 접근|무제한 프로젝트 상업적 사용|우선 지원',
    proAnnualFeatures: '무료 플랜 전체|현재 8개 프리미엄 컬렉션 즉시 소유|포함된 8개 컬렉션 영구 보관|연간 플랜 활성 기간의 향후 프리미엄 드롭|Motion Lab에서 CSS 애니메이션 내보내기|Converter에서 SVG 및 PNG 무제한 변환|무료와 프리미엄 아이콘 전체 MCP 접근|무제한 프로젝트 상업적 사용|우선 지원',
    singleDesc: '원하는 컬렉션 하나를 선택하세요. 50개의 애니메이션 아이콘을 영구 보유합니다.',
    singleFeatures: '무료 플랜 전체|팩당 50개 애니메이션 SVG 아이콘|아이콘마다 고유한 호버 애니메이션|영구 소유|단일 프로젝트 라이선스|구매한 팩의 MCP 접근|Motion Lab 또는 Converter 같은 Pro 도구 제외',
    launchDesc: '8개 팩 전체. 400개 애니메이션 아이콘. 구독 없는 일회성 결제.',
    launchFeatures: '8개 프리미엄 팩 전체|400개 애니메이션 SVG 아이콘|AI, 커머스, 미디어, 내비게이션, 보안 등|영구 소유와 해당 팩의 향후 업데이트|무제한 프로젝트 상업적 사용|8개 팩 전체 MCP 접근|Motion Lab 또는 Converter 같은 Pro 도구 제외',
    faqQuestions: '8개 프리미엄 애니메이션 팩에 포함된 내용|Pro 월간과 Pro 연간 접근 방식의 차이|Supericons MCP 서버로 할 수 있는 일|Pro 구독을 취소하는 방법|Pro 취소 후에도 남는 접근 권한|프리미엄 아이콘을 상업적으로 사용하는 방법|Launch 번들에 포함된 내용',
    faqAnswers: '각 팩에는 고유한 호버 애니메이션이 있는 50개의 애니메이션 SVG 아이콘이 포함됩니다. 8개 팩은 AI, 상태, 커머스, 내비게이션, 미디어, 보안, 소셜, 데이터 같은 제품 영역을 다룹니다.|Pro 월간은 매월 1개 프리미엄 컬렉션을 영구 라이브러리에 추가합니다. Pro 연간은 현재 8개 프리미엄 컬렉션을 즉시 열고 연간 플랜 활성 기간 동안 향후 프리미엄 드롭을 포함합니다.|MCP 서버는 AI 코딩 에이전트가 프로그램 방식으로 아이콘을 검색하고 가져오게 합니다. 무료 사용자는 무료 라이브러리에, 유료 사용자는 계정에 연결된 프리미엄 컬렉션에 접근합니다.|계정 대시보드에서 취소할 수 있습니다. Pro 혜택은 결제된 기간이 끝날 때까지 유지됩니다.|받았거나 구매한 컬렉션은 라이브러리에 남습니다. 소유하지 않은 컬렉션의 실시간 접근, 향후 드롭, Pro 도구는 기간 종료 후 갱신하지 않으면 중단됩니다.|예. 프리미엄 아이콘은 플랜 또는 구매에 연결된 라이선스에 따라 상업적으로 사용할 수 있습니다.|Launch 번들은 출시 가격의 일회성 구매입니다. 현재 8개 프리미엄 팩과 같은 팩의 향후 업데이트를 포함합니다.',
  },
  ar: {
    freeDesc: '{freeIconsAcrossLibraries}، بحث بالذكاء الاصطناعي وتصدير SVG. لا يلزم حساب.',
    freeFeatures: 'Material وLucide وTabler وPhosphor والمزيد|بحث دلالي بالذكاء الاصطناعي|تصدير SVG وPNG وCSS|{mcpServerFreeIcons}|حزم متحركة مميزة|أيقونات مميزة عبر MCP',
    proMonthlyDesc: 'أدوات Pro ووصول مميز كامل ومجموعة مميزة واحدة كل شهر.',
    proAnnualDesc: 'امتلك المجموعات المميزة الثماني الآن واحصل على الإصدارات المستقبلية أثناء تفعيل الخطة السنوية.',
    proMonthlyFeatures: 'كل ما في الخطة المجانية|مجموعة مميزة واحدة كل شهر|الوصول إلى كل المجموعات أثناء التفعيل|إلغاء في أي وقت مع الاحتفاظ بالمجموعات التي تمت مطالبتها|Motion Lab يصدر حركات CSS|Converter يدعم تحويل SVG وPNG بلا حدود|وصول MCP كامل للأيقونات المجانية والمميزة|استخدام تجاري لمشاريع غير محدودة|دعم ذو أولوية',
    proAnnualFeatures: 'كل ما في الخطة المجانية|امتلاك المجموعات المميزة الثماني الآن|الاحتفاظ بالمجموعات الثماني المضمنة دائما|الإصدارات المميزة المستقبلية أثناء تفعيل السنوي|Motion Lab يصدر حركات CSS|Converter يدعم تحويل SVG وPNG بلا حدود|وصول MCP كامل للأيقونات المجانية والمميزة|استخدام تجاري لمشاريع غير محدودة|دعم ذو أولوية',
    singleDesc: 'اختر مجموعة واحدة. 50 أيقونة متحركة تملكها بشكل دائم.',
    singleFeatures: 'كل ما في الخطة المجانية|50 أيقونة SVG متحركة لكل حزمة|حركة تمرير فريدة لكل أيقونة|ملكية دائمة|ترخيص لمشروع واحد|وصول MCP للحزمة المشتراة|لا تشمل أدوات Pro مثل Motion Lab أو Converter',
    launchDesc: 'كل الحزم الثماني. 400 أيقونة متحركة. دفعة واحدة بلا اشتراك.',
    launchFeatures: 'كل الحزم المميزة الثماني|400 أيقونة SVG متحركة|ذكاء اصطناعي وتجارة ووسائط وتنقل وأمان والمزيد|ملكية دائمة مع تحديثات مستقبلية لهذه الحزم|استخدام تجاري لمشاريع غير محدودة|وصول MCP لكل الحزم الثماني|لا تشمل أدوات Pro مثل Motion Lab أو Converter',
    faqQuestions: 'ما الذي تتضمنه الحزم المتحركة المميزة الثماني|كيف يعمل Pro الشهري وPro السنوي|ما الذي يتيحه خادم MCP في Supericons|كيفية إلغاء اشتراك Pro|ما الوصول الذي يبقى بعد إلغاء Pro|كيفية استخدام الأيقونات المميزة تجاريا|ما الذي تتضمنه حزمة Launch',
    faqAnswers: 'تحتوي كل حزمة على 50 أيقونة SVG متحركة مع حركات تمرير فريدة. تغطي الحزم الثماني مجالات منتج مثل الذكاء الاصطناعي والحالة والتجارة والتنقل والوسائط والأمان والتواصل والبيانات.|يضيف Pro الشهري مجموعة مميزة واحدة إلى مكتبتك الدائمة كل شهر. يفتح Pro السنوي كل المجموعات المميزة الحالية الثماني فورا ويشمل الإصدارات المميزة المستقبلية أثناء تفعيل السنوي.|يسمح خادم MCP لوكلاء البرمجة بالذكاء الاصطناعي بالبحث عن الأيقونات واسترجاعها برمجيا. يصل المستخدمون المجانيون إلى المكتبات المجانية، ويصل المستخدمون المدفوعون إلى المجموعات المميزة المرتبطة بحسابهم.|يمكنك الإلغاء من لوحة الحساب. تبقى مزايا Pro نشطة حتى نهاية الفترة المدفوعة.|تبقى المجموعات المطالب بها أو المشتراة في مكتبتك. ينتهي الوصول المباشر إلى المجموعات غير المملوكة والإصدارات المستقبلية وأدوات Pro عند انتهاء الفترة ما لم يتم التجديد.|نعم. تشمل الأيقونات المميزة استخداما تجاريا وفق الترخيص المرتبط بخطتك أو شرائك.|حزمة Launch شراء لمرة واحدة بسعر الإطلاق. تشمل الحزم المميزة الثماني الحالية والتحديثات المستقبلية لهذه الحزم نفسها.',
  },
  hi: {
    freeDesc: '{freeIconsAcrossLibraries}, AI खोज और SVG निर्यात। खाते की जरूरत नहीं।',
    freeFeatures: 'Material, Lucide, Tabler, Phosphor और अधिक|AI अर्थ खोज|SVG, PNG और CSS निर्यात|{mcpServerFreeIcons}|प्रीमियम एनिमेटेड पैक|MCP के जरिए प्रीमियम आइकन',
    proMonthlyDesc: 'Pro टूल, पूरा प्रीमियम एक्सेस और हर महीने 1 प्रीमियम कलेक्शन।',
    proAnnualDesc: 'सभी 8 प्रीमियम कलेक्शन अभी पाएं और वार्षिक प्लान सक्रिय रहने तक भविष्य के ड्रॉप भी पाएं।',
    proMonthlyFeatures: 'मुफ्त प्लान की सभी चीजें|हर महीने 1 प्रीमियम कलेक्शन|सक्रिय अवधि में सभी कलेक्शन तक पहुंच|कभी भी रद्द करें और लिए गए कलेक्शन रखें|Motion Lab CSS एनिमेशन निर्यात करता है|Converter असीमित SVG और PNG रूपांतरण देता है|मुफ्त और प्रीमियम आइकन के लिए पूरा MCP एक्सेस|असीमित प्रोजेक्ट में व्यावसायिक उपयोग|प्राथमिकता सहायता',
    proAnnualFeatures: 'मुफ्त प्लान की सभी चीजें|सभी 8 प्रीमियम कलेक्शन अभी अपने करें|शामिल 8 कलेक्शन हमेशा रखें|वार्षिक सक्रिय रहने तक भविष्य के प्रीमियम ड्रॉप|Motion Lab CSS एनिमेशन निर्यात करता है|Converter असीमित SVG और PNG रूपांतरण देता है|मुफ्त और प्रीमियम आइकन के लिए पूरा MCP एक्सेस|असीमित प्रोजेक्ट में व्यावसायिक उपयोग|प्राथमिकता सहायता',
    singleDesc: 'कोई एक कलेक्शन चुनें। 50 एनिमेटेड आइकन स्थायी रूप से आपके।',
    singleFeatures: 'मुफ्त प्लान की सभी चीजें|हर पैक में 50 एनिमेटेड SVG आइकन|हर आइकन के लिए अलग hover एनिमेशन|स्थायी स्वामित्व|एक प्रोजेक्ट लाइसेंस|खरीदे गए पैक का MCP एक्सेस|Motion Lab या Converter जैसे Pro टूल शामिल नहीं',
    launchDesc: 'सभी 8 पैक। 400 एनिमेटेड आइकन। एक बार भुगतान, कोई सदस्यता नहीं।',
    launchFeatures: 'सभी 8 प्रीमियम पैक|400 एनिमेटेड SVG आइकन|AI, कॉमर्स, मीडिया, नेविगेशन, सुरक्षा और अधिक|स्थायी स्वामित्व और उन्हीं पैक के भविष्य अपडेट|असीमित प्रोजेक्ट में व्यावसायिक उपयोग|सभी 8 पैक का MCP एक्सेस|Motion Lab या Converter जैसे Pro टूल शामिल नहीं',
    faqQuestions: '8 प्रीमियम एनिमेटेड पैक में क्या शामिल है|Pro मासिक और Pro वार्षिक एक्सेस कैसे अलग हैं|Supericons MCP सर्वर क्या करने देता है|Pro सदस्यता कैसे रद्द करें|Pro रद्द करने के बाद कौन सा एक्सेस बचता है|प्रीमियम आइकन का व्यावसायिक उपयोग कैसे करें|Launch बंडल में क्या शामिल है',
    faqAnswers: 'हर पैक में अलग hover एनिमेशन वाले 50 एनिमेटेड SVG आइकन होते हैं। 8 पैक AI, स्थिति, कॉमर्स, नेविगेशन, मीडिया, सुरक्षा, सोशल और डेटा जैसे उत्पाद क्षेत्रों को कवर करते हैं।|Pro मासिक हर महीने 1 प्रीमियम कलेक्शन आपकी स्थायी लाइब्रेरी में जोड़ता है। Pro वार्षिक अभी सभी 8 मौजूदा प्रीमियम कलेक्शन खोलता है और वार्षिक अवधि में भविष्य के प्रीमियम ड्रॉप शामिल करता है।|MCP सर्वर AI कोडिंग एजेंटों को प्रोग्राम से आइकन खोजने और पाने देता है। मुफ्त उपयोगकर्ता मुफ्त लाइब्रेरी देखते हैं और भुगतान करने वाले उपयोगकर्ता अपने खाते से जुड़े प्रीमियम कलेक्शन देखते हैं।|आप खाते के डैशबोर्ड से रद्द कर सकते हैं। Pro लाभ भुगतान अवधि के अंत तक सक्रिय रहते हैं।|लिए गए या खरीदे गए कलेक्शन आपकी लाइब्रेरी में रहते हैं। गैर-स्वामित्व वाले कलेक्शन, भविष्य ड्रॉप और Pro टूल का लाइव एक्सेस अवधि के अंत में रुक जाता है जब तक आप नवीनीकरण न करें।|हाँ। प्रीमियम आइकन आपके प्लान या खरीद से जुड़े लाइसेंस के अनुसार व्यावसायिक उपयोग शामिल करते हैं।|Launch बंडल लॉन्च कीमत पर एक बार की खरीद है। इसमें मौजूदा 8 प्रीमियम पैक और उन्हीं पैक के भविष्य अपडेट शामिल हैं।',
  },
  vi: {
    freeDesc: '{freeIconsAcrossLibraries}, tìm kiếm AI và xuất SVG. Không cần tài khoản.',
    freeFeatures: 'Material, Lucide, Tabler, Phosphor và nhiều thư viện khác|Tìm kiếm ngữ nghĩa bằng AI|Xuất SVG, PNG và CSS|{mcpServerFreeIcons}|Gói động cao cấp|Biểu tượng cao cấp qua MCP',
    proMonthlyDesc: 'Công cụ Pro, quyền truy cập cao cấp đầy đủ và 1 bộ sưu tập cao cấp mỗi tháng.',
    proAnnualDesc: 'Sở hữu ngay 8 bộ sưu tập cao cấp và nhận bản phát hành tương lai khi gói năm còn hoạt động.',
    proMonthlyFeatures: 'Mọi thứ trong gói Miễn phí|1 bộ sưu tập cao cấp mỗi tháng|Truy cập mọi bộ sưu tập khi còn hoạt động|Hủy bất cứ lúc nào và giữ bộ đã nhận|Motion Lab xuất hoạt ảnh CSS|Converter chuyển đổi SVG và PNG không giới hạn|Truy cập MCP đầy đủ cho biểu tượng miễn phí và cao cấp|Dùng thương mại cho số dự án không giới hạn|Hỗ trợ ưu tiên',
    proAnnualFeatures: 'Mọi thứ trong gói Miễn phí|Sở hữu ngay 8 bộ sưu tập cao cấp|Giữ vĩnh viễn 8 bộ sưu tập đã bao gồm|Bản phát hành cao cấp tương lai khi gói năm còn hoạt động|Motion Lab xuất hoạt ảnh CSS|Converter chuyển đổi SVG và PNG không giới hạn|Truy cập MCP đầy đủ cho biểu tượng miễn phí và cao cấp|Dùng thương mại cho số dự án không giới hạn|Hỗ trợ ưu tiên',
    singleDesc: 'Chọn một bộ sưu tập. 50 biểu tượng động thuộc về bạn lâu dài.',
    singleFeatures: 'Mọi thứ trong gói Miễn phí|50 biểu tượng SVG động mỗi gói|Hoạt ảnh hover riêng cho từng biểu tượng|Sở hữu lâu dài|Giấy phép cho một dự án|Truy cập MCP cho gói đã mua|Không gồm công cụ Pro như Motion Lab hoặc Converter',
    launchDesc: 'Toàn bộ 8 gói. 400 biểu tượng động. Thanh toán một lần, không cần đăng ký.',
    launchFeatures: 'Toàn bộ 8 gói cao cấp|400 biểu tượng SVG động|AI, thương mại, media, điều hướng, bảo mật và hơn nữa|Sở hữu lâu dài cùng bản cập nhật tương lai cho các gói đó|Dùng thương mại cho số dự án không giới hạn|Truy cập MCP cho cả 8 gói|Không gồm công cụ Pro như Motion Lab hoặc Converter',
    faqQuestions: '8 gói động cao cấp bao gồm những gì|Pro tháng và Pro năm hoạt động khác nhau ra sao|Máy chủ MCP trong Supericons dùng để làm gì|Cách hủy gói Pro trong tài khoản|Sau khi hủy Pro bạn còn quyền truy cập nào|Cách dùng biểu tượng cao cấp cho công việc thương mại|Gói Launch bao gồm những gì',
    faqAnswers: 'Mỗi gói có 50 biểu tượng SVG động với hoạt ảnh hover riêng. 8 gói bao phủ các nhóm sản phẩm như AI, trạng thái, thương mại, điều hướng, media, bảo mật, xã hội và dữ liệu.|Pro tháng thêm 1 bộ sưu tập cao cấp vào thư viện lâu dài của bạn mỗi tháng. Pro năm mở ngay 8 bộ sưu tập cao cấp hiện có và gồm các bản phát hành cao cấp tương lai khi gói năm còn hoạt động.|Máy chủ MCP cho phép tác nhân lập trình AI tìm kiếm và lấy biểu tượng bằng chương trình. Người dùng miễn phí truy cập thư viện miễn phí, người dùng trả phí truy cập bộ sưu tập cao cấp gắn với tài khoản.|Bạn có thể hủy trong bảng điều khiển tài khoản. Quyền lợi Pro vẫn hoạt động đến hết kỳ đã thanh toán.|Bộ sưu tập đã nhận hoặc đã mua vẫn ở trong thư viện. Quyền truy cập trực tiếp vào bộ chưa sở hữu, bản phát hành tương lai và công cụ Pro kết thúc khi hết kỳ nếu không gia hạn.|Có. Biểu tượng cao cấp bao gồm quyền dùng thương mại theo giấy phép của gói hoặc giao dịch mua.|Gói Launch là mua một lần với giá ra mắt. Gói gồm 8 bộ cao cấp hiện có và bản cập nhật tương lai cho chính các bộ đó.',
  },
  th: {
    freeDesc: '{freeIconsAcrossLibraries}, ค้นหาด้วย AI และส่งออก SVG ไม่ต้องมีบัญชี',
    freeFeatures: 'Material, Lucide, Tabler, Phosphor และอื่นๆ|ค้นหาเชิงความหมายด้วย AI|ส่งออก SVG, PNG และ CSS|{mcpServerFreeIcons}|แพ็กแอนิเมชันพรีเมียม|ไอคอนพรีเมียมผ่าน MCP',
    proMonthlyDesc: 'เครื่องมือ Pro การเข้าถึงพรีเมียมเต็มรูปแบบ และชุดพรีเมียม 1 ชุดทุกเดือน',
    proAnnualDesc: 'เป็นเจ้าของชุดพรีเมียมทั้ง 8 ชุดทันที และรับชุดใหม่ในอนาคตระหว่างที่แผนรายปียังใช้งานอยู่',
    proMonthlyFeatures: 'ทุกอย่างในแผนฟรี|ชุดพรีเมียม 1 ชุดต่อเดือน|เข้าถึงทุกชุดระหว่างที่แผนใช้งานอยู่|ยกเลิกได้ทุกเมื่อและเก็บชุดที่รับไปแล้ว|Motion Lab ส่งออกแอนิเมชัน CSS|Converter แปลง SVG และ PNG ได้ไม่จำกัด|เข้าถึง MCP เต็มรูปแบบสำหรับไอคอนฟรีและพรีเมียม|ใช้เชิงพาณิชย์ได้ไม่จำกัดจำนวนโปรเจกต์|การสนับสนุนลำดับความสำคัญ',
    proAnnualFeatures: 'ทุกอย่างในแผนฟรี|เป็นเจ้าของชุดพรีเมียมทั้ง 8 ชุดทันที|เก็บชุดที่รวมอยู่ทั้ง 8 ชุดถาวร|รับชุดพรีเมียมใหม่ระหว่างที่แผนรายปียังใช้งานอยู่|Motion Lab ส่งออกแอนิเมชัน CSS|Converter แปลง SVG และ PNG ได้ไม่จำกัด|เข้าถึง MCP เต็มรูปแบบสำหรับไอคอนฟรีและพรีเมียม|ใช้เชิงพาณิชย์ได้ไม่จำกัดจำนวนโปรเจกต์|การสนับสนุนลำดับความสำคัญ',
    singleDesc: 'เลือกชุดใดก็ได้หนึ่งชุด ไอคอนแอนิเมชัน 50 รายการเป็นของคุณถาวร',
    singleFeatures: 'ทุกอย่างในแผนฟรี|ไอคอน SVG แอนิเมชัน 50 รายการต่อแพ็ก|แอนิเมชัน hover เฉพาะแต่ละไอคอน|เป็นเจ้าของถาวร|ใบอนุญาตสำหรับหนึ่งโปรเจกต์|เข้าถึง MCP สำหรับแพ็กที่ซื้อ|ไม่รวมเครื่องมือ Pro เช่น Motion Lab หรือ Converter',
    launchDesc: 'ครบทั้ง 8 แพ็ก ไอคอนแอนิเมชัน 400 รายการ จ่ายครั้งเดียว ไม่มีการสมัครสมาชิก',
    launchFeatures: 'แพ็กพรีเมียมครบทั้ง 8 ชุด|ไอคอน SVG แอนิเมชัน 400 รายการ|AI, คอมเมิร์ซ, สื่อ, การนำทาง, ความปลอดภัย และอื่นๆ|เป็นเจ้าของถาวรพร้อมอัปเดตในอนาคตของแพ็กเหล่านี้|ใช้เชิงพาณิชย์ได้ไม่จำกัดจำนวนโปรเจกต์|เข้าถึง MCP สำหรับทั้ง 8 แพ็ก|ไม่รวมเครื่องมือ Pro เช่น Motion Lab หรือ Converter',
    faqQuestions: 'แพ็กแอนิเมชันพรีเมียม 8 ชุดมีอะไรบ้าง|Pro รายเดือนและรายปีทำงานต่างกันอย่างไร|เซิร์ฟเวอร์ MCP ใน Supericons ใช้ทำอะไร|วิธียกเลิกการสมัคร Pro|หลังยกเลิก Pro แล้วยังเข้าถึงอะไรได้บ้าง|วิธีใช้ไอคอนพรีเมียมในงานเชิงพาณิชย์|ชุด Launch มีอะไรบ้าง',
    faqAnswers: 'แต่ละแพ็กมีไอคอน SVG แอนิเมชัน 50 รายการพร้อมแอนิเมชัน hover เฉพาะ แพ็กทั้ง 8 ครอบคลุมหมวดผลิตภัณฑ์ เช่น AI, สถานะ, คอมเมิร์ซ, การนำทาง, สื่อ, ความปลอดภัย, โซเชียล และข้อมูล|Pro รายเดือนเพิ่มชุดพรีเมียม 1 ชุดลงในไลบรารีถาวรทุกเดือน Pro รายปีปลดล็อกชุดพรีเมียมปัจจุบันทั้ง 8 ชุดทันที และรวมชุดพรีเมียมใหม่ระหว่างที่แผนรายปียังใช้งานอยู่|เซิร์ฟเวอร์ MCP ช่วยให้เอเจนต์เขียนโค้ดด้วย AI ค้นหาและดึงไอคอนผ่านโปรแกรมได้ ผู้ใช้ฟรีเข้าถึงไลบรารีฟรี ผู้ใช้แบบชำระเงินเข้าถึงชุดพรีเมียมที่ผูกกับบัญชี|คุณยกเลิกได้จากแดชบอร์ดบัญชี สิทธิ์ Pro ยังใช้งานได้จนสิ้นสุดรอบที่ชำระเงินแล้ว|ชุดที่รับหรือซื้อแล้วจะอยู่ในไลบรารีของคุณ การเข้าถึงชุดที่ยังไม่ได้เป็นเจ้าของ ชุดใหม่ในอนาคต และเครื่องมือ Pro จะสิ้นสุดเมื่อหมดรอบ หากไม่ต่ออายุ|ได้ ไอคอนพรีเมียมรวมสิทธิ์ใช้งานเชิงพาณิชย์ตามใบอนุญาตของแผนหรือการซื้อ|ชุด Launch เป็นการซื้อครั้งเดียวในราคาเปิดตัว รวมแพ็กพรีเมียมปัจจุบันทั้ง 8 ชุดและอัปเดตในอนาคตของแพ็กเหล่านั้น',
  },
};

function localizedBody(locale, kind, index) {
  const c = compactLocales[locale];
  const contact = locale === 'ar'
    ? 'للطلبات أو الأسئلة، راسل hello@supericons.dev.'
    : locale === 'ja'
      ? '質問やリクエストは hello@supericons.dev までご連絡ください。'
      : locale === 'ko'
        ? '문의나 요청은 hello@supericons.dev로 보내 주세요.'
        : locale === 'hi'
          ? 'अनुरोध या प्रश्नों के लिए hello@supericons.dev पर लिखें।'
          : locale === 'vi'
            ? 'Với yêu cầu hoặc câu hỏi, hãy gửi email hello@supericons.dev.'
            : locale === 'th'
              ? 'หากมีคำขอหรือคำถาม โปรดส่งอีเมลถึง hello@supericons.dev'
              : locale === 'de'
                ? 'Für Fragen oder Anfragen schreibe an hello@supericons.dev.'
                : locale === 'fr'
                  ? 'Pour toute question ou demande, écrivez à hello@supericons.dev.'
                  : locale === 'pt'
                    ? 'Para solicitações ou dúvidas, escreva para hello@supericons.dev.'
                    : 'Para solicitudes o preguntas, escribe a hello@supericons.dev.';
  const legalTopics = {
    es: [
      ['Supericons ofrece iconos gratuitos y premium para productos digitales. Los iconos gratuitos mantienen sus licencias de código abierto originales.', 'Las colecciones premium pertenecen a Curly Mole Labs y se usan según el nivel de licencia comprado.'],
      ['Los iconos obtenidos mediante MCP pueden usarse en código generado por IA.', 'Los archivos fuente SVG y CSS siguen siendo activos de Curly Mole Labs y no se pueden extraer ni exportar en masa.'],
      ['No puedes redistribuir archivos fuente SVG o CSS, revender acceso, sublicenciar acceso ni crear una biblioteca de iconos competidora.', 'Sí puedes usar iconos en sitios, aplicaciones y entregables finales donde el archivo fuente no queda expuesto.'],
      ['La licencia de un proyecto aplica a compras individuales y reclamaciones de Pro mensual.', 'La licencia de proyectos ilimitados aplica a suscripciones Pro activas, colecciones incluidas en Pro anual y compras Launch Edition.'],
      ['Las suscripciones Pro se pueden cancelar en cualquier momento y no tienen reembolsos parciales del periodo actual.', 'Las compras digitales únicas no se reembolsan después de habilitar la descarga, salvo problemas técnicos comunicados dentro de 14 días.'],
      ['Para términos, licencias o reembolsos, escribe a hello@supericons.dev.'],
    ],
    de: [
      ['Supericons bietet kostenlose und Premium-Icons für digitale Produkte. Kostenlose Icons behalten ihre ursprünglichen Open-Source-Lizenzen.', 'Premium-Animationskollektionen gehören Curly Mole Labs und werden gemäß der gekauften Lizenz genutzt.'],
      ['Icons aus dem MCP-Server dürfen in KI-generiertem Code verwendet werden.', 'Die zugrunde liegenden SVG- und CSS-Quelldateien bleiben Assets von Curly Mole Labs und dürfen nicht extrahiert oder massenhaft exportiert werden.'],
      ['Du darfst rohe SVG- oder CSS-Dateien nicht weitergeben, Zugriff nicht weiterverkaufen, keine Unterlizenzen vergeben und keine konkurrierende Icon-Bibliothek bauen.', 'Du darfst Icons in fertigen Websites, Apps und Kundenergebnissen verwenden, wenn die Quelldateien nicht offenliegen.'],
      ['Die Ein-Projekt-Lizenz gilt für Einzelkäufe und Pro-Monatsansprüche.', 'Die Lizenz für unbegrenzte Projekte gilt für aktive Pro-Abos, in Pro Jährlich enthaltene Kollektionen und Launch Edition-Käufe.'],
      ['Pro-Abos können jederzeit gekündigt werden. Für den laufenden Zeitraum gibt es keine anteilige Rückerstattung.', 'Einmalige digitale Käufe werden nach Freischaltung des Downloads nicht erstattet, außer ein technisches Problem wird innerhalb von 14 Tagen gemeldet.'],
      ['Für Bedingungen, Lizenzfragen oder Rückerstattungen schreibe an hello@supericons.dev.'],
    ],
    fr: [
      ['Supericons fournit des icônes gratuites et premium pour les produits numériques. Les icônes gratuites conservent leurs licences open source d’origine.', 'Les collections animées premium appartiennent à Curly Mole Labs et s’utilisent selon la licence achetée.'],
      ['Les icônes récupérées via MCP peuvent être utilisées dans du code généré par IA.', 'Les fichiers source SVG et CSS restent des actifs de Curly Mole Labs et ne doivent pas être extraits ni exportés en masse.'],
      ['Vous ne pouvez pas redistribuer les sources SVG ou CSS, revendre l’accès, sous-licencier l’accès ou créer une bibliothèque concurrente.', 'Vous pouvez utiliser les icônes dans des sites, applications et livrables finaux où les sources ne sont pas exposées.'],
      ['La licence pour un projet s’applique aux achats individuels et aux collections réclamées avec Pro mensuel.', 'La licence projets illimités s’applique aux abonnements Pro actifs, aux collections incluses dans Pro annuel et aux achats Launch Edition.'],
      ['Les abonnements Pro peuvent être annulés à tout moment. Aucun remboursement partiel n’est prévu pour la période en cours.', 'Les achats numériques uniques ne sont pas remboursés après l’ouverture du téléchargement, sauf problème technique signalé sous 14 jours.'],
      ['Pour les conditions, licences ou remboursements, écrivez à hello@supericons.dev.'],
    ],
    pt: [
      ['Supericons oferece ícones gratuitos e premium para produtos digitais. Ícones gratuitos mantêm suas licenças open-source originais.', 'Coleções animadas premium pertencem à Curly Mole Labs e são usadas conforme a licença comprada.'],
      ['Ícones obtidos pelo MCP podem ser usados em código gerado por IA.', 'Os arquivos fonte SVG e CSS continuam sendo ativos da Curly Mole Labs e não podem ser extraídos nem exportados em massa.'],
      ['Você não pode redistribuir SVG ou CSS fonte, revender acesso, sublicenciar acesso ou criar uma biblioteca concorrente.', 'Você pode usar ícones em sites, apps e entregáveis finais quando os arquivos fonte não ficam expostos.'],
      ['A licença de um projeto vale para compras individuais e resgates do Pro mensal.', 'A licença de projetos ilimitados vale para assinaturas Pro ativas, coleções incluídas no Pro anual e compras Launch Edition.'],
      ['Assinaturas Pro podem ser canceladas a qualquer momento. Não há reembolso parcial do período atual.', 'Compras digitais únicas não são reembolsadas após liberação do download, salvo problema técnico informado em até 14 dias.'],
      ['Para termos, licenças ou reembolsos, escreva para hello@supericons.dev.'],
    ],
    ja: [
      ['Supericons はデジタル製品向けに無料およびプレミアムのアイコン素材を提供します。無料アイコンは元のオープンソースライセンスを保持します。', 'プレミアムアニメーションコレクションは Curly Mole Labs の資産であり、購入したライセンス区分に従って利用します。'],
      ['MCP サーバーから取得したアイコンは、AI が生成したコード内で使用できます。', '元の SVG と CSS アニメーションソースは Curly Mole Labs の資産であり、抽出、リバースエンジニアリング、一括エクスポートはできません。'],
      ['生の SVG または CSS ソースの再配布、アクセスの再販売、サブライセンス、競合するアイコンライブラリの構築はできません。', 'ソースファイルが直接公開されない完成済みサイト、アプリ、クライアント成果物ではアイコンを使用できます。'],
      ['単一プロジェクトライセンスは、個別購入と Pro 月額で取得したコレクションに適用されます。', '無制限プロジェクトライセンスは、有効な Pro、Pro 年額に含まれるコレクション、Launch Edition 購入に適用されます。'],
      ['Pro サブスクリプションはいつでも解約できます。現在の請求期間に対する日割り返金はありません。', '一回限りのデジタル購入は、ダウンロードアクセス付与後は原則返金されません。ただし技術的にアクセスできない場合は 14 日以内にご連絡ください。'],
      ['規約、ライセンス、返金については hello@supericons.dev までご連絡ください。'],
    ],
    ko: [
      ['Supericons는 디지털 제품을 위한 무료 및 프리미엄 아이콘 자산을 제공합니다. 무료 아이콘은 원래의 오픈소스 라이선스를 유지합니다.', '프리미엄 애니메이션 컬렉션은 Curly Mole Labs 자산이며 구매한 라이선스 등급에 따라 사용합니다.'],
      ['MCP 서버에서 가져온 아이콘은 AI 생성 코드 출력에 사용할 수 있습니다.', '기반 SVG 및 CSS 애니메이션 소스 파일은 Curly Mole Labs 자산으로 남으며 추출, 역공학, 대량 내보내기를 할 수 없습니다.'],
      ['원본 SVG 또는 CSS 파일을 재배포하거나, 접근 권한을 재판매하거나, 하위 라이선스를 부여하거나, 경쟁 아이콘 라이브러리를 만들 수 없습니다.', '소스 파일이 직접 노출되지 않는 완성된 웹사이트, 앱, 클라이언트 결과물에서는 아이콘을 사용할 수 있습니다.'],
      ['단일 프로젝트 라이선스는 개별 구매와 Pro 월간 컬렉션 청구에 적용됩니다.', '무제한 프로젝트 라이선스는 활성 Pro 구독, Pro 연간 포함 컬렉션, Launch Edition 구매에 적용됩니다.'],
      ['Pro 구독은 언제든 취소할 수 있습니다. 현재 결제 기간에 대한 부분 환불은 제공되지 않습니다.', '일회성 디지털 구매는 다운로드 접근이 제공된 후 환불되지 않으며, 접근을 막는 기술 문제가 있으면 14일 이내 연락해 주세요.'],
      ['약관, 라이선스 또는 환불 문의는 hello@supericons.dev로 보내 주세요.'],
    ],
    ar: [
      ['يوفر Supericons أصول أيقونات مجانية ومميزة للمنتجات الرقمية. تحتفظ الأيقونات المجانية بتراخيصها الأصلية مفتوحة المصدر.', 'المجموعات المتحركة المميزة مملوكة لـ Curly Mole Labs وتستخدم حسب مستوى الترخيص الذي تم شراؤه.'],
      ['يمكن استخدام الأيقونات المسترجعة عبر خادم MCP داخل التعليمات البرمجية الناتجة عن الذكاء الاصطناعي.', 'تظل ملفات SVG وCSS الأصلية أصولا لـ Curly Mole Labs ولا يجوز استخراجها أو عكس هندستها أو تصديرها بكميات كبيرة.'],
      ['لا يجوز إعادة توزيع ملفات SVG أو CSS الخام أو إعادة بيع الوصول أو منحه بترخيص فرعي أو إنشاء مكتبة أيقونات منافسة.', 'يجوز استخدام الأيقونات في مواقع وتطبيقات ومخرجات عمل نهائية عندما لا تكون ملفات المصدر مكشوفة مباشرة.'],
      ['ينطبق ترخيص المشروع الواحد على المشتريات الفردية ومجموعات Pro الشهرية المطالب بها.', 'ينطبق ترخيص المشاريع غير المحدودة على اشتراكات Pro النشطة ومجموعات Pro السنوية المضمنة ومشتريات Launch Edition.'],
      ['يمكن إلغاء اشتراكات Pro في أي وقت. لا تصدر مبالغ مستردة جزئية للفترة الحالية.', 'لا ترد المشتريات الرقمية لمرة واحدة بعد منح الوصول للتنزيل، إلا إذا منعت مشكلة تقنية الوصول وتم التواصل خلال 14 يوما.'],
      ['لشروط الخدمة أو التراخيص أو طلبات الاسترداد، راسل hello@supericons.dev.'],
    ],
    hi: [
      ['Supericons डिजिटल उत्पादों के लिए मुफ्त और प्रीमियम आइकन संसाधन देता है। मुफ्त आइकन अपनी मूल open-source लाइसेंस शर्तें रखते हैं।', 'प्रीमियम एनिमेटेड कलेक्शन Curly Mole Labs की संपत्ति हैं और खरीदे गए लाइसेंस स्तर के अनुसार इस्तेमाल होते हैं।'],
      ['MCP सर्वर से मिले आइकन AI द्वारा बनाए गए कोड आउटपुट में इस्तेमाल किए जा सकते हैं।', 'मूल SVG और CSS एनिमेशन स्रोत फाइलें Curly Mole Labs की संपत्ति रहती हैं और उन्हें निकाला, reverse-engineer या bulk-export नहीं किया जा सकता।'],
      ['आप raw SVG या CSS स्रोत फाइलें पुनर्वितरित नहीं कर सकते, access दोबारा बेच नहीं सकते, sublicense नहीं दे सकते या प्रतिस्पर्धी आइकन लाइब्रेरी नहीं बना सकते।', 'आप तैयार वेबसाइट, ऐप, client work और compiled output में आइकन इस्तेमाल कर सकते हैं जहां स्रोत फाइलें सीधे उजागर नहीं होतीं।'],
      ['एक प्रोजेक्ट लाइसेंस अलग खरीद और Pro मासिक कलेक्शन claim पर लागू होता है।', 'असीमित प्रोजेक्ट लाइसेंस सक्रिय Pro सदस्यता, Pro वार्षिक में शामिल कलेक्शन और Launch Edition खरीद पर लागू होता है।'],
      ['Pro सदस्यता कभी भी रद्द की जा सकती है। चालू बिलिंग अवधि के लिए आंशिक refund नहीं दिया जाता।', 'एक बार download access मिल जाने पर one-time digital purchases refundable नहीं हैं, सिवाय तकनीकी access issue के जिसकी सूचना 14 दिन में दी जाए।'],
      ['शर्तों, लाइसेंस या refund के लिए hello@supericons.dev पर लिखें।'],
    ],
    vi: [
      ['Supericons cung cấp tài nguyên biểu tượng miễn phí và cao cấp cho sản phẩm số. Biểu tượng miễn phí giữ giấy phép mã nguồn mở gốc.', 'Bộ sưu tập động cao cấp thuộc Curly Mole Labs và được dùng theo cấp giấy phép đã mua.'],
      ['Biểu tượng lấy qua máy chủ MCP có thể dùng trong mã do AI tạo ra.', 'Tệp nguồn SVG và CSS animation vẫn là tài sản của Curly Mole Labs và không được trích xuất, đảo ngược hoặc xuất hàng loạt.'],
      ['Bạn không được phân phối lại tệp SVG hoặc CSS gốc, bán lại quyền truy cập, cấp lại giấy phép hoặc tạo thư viện biểu tượng cạnh tranh.', 'Bạn có thể dùng biểu tượng trong website, ứng dụng, sản phẩm khách hàng và đầu ra đã biên dịch khi tệp nguồn không bị lộ trực tiếp.'],
      ['Giấy phép một dự án áp dụng cho mua lẻ và bộ sưu tập nhận qua Pro tháng.', 'Giấy phép dự án không giới hạn áp dụng cho Pro đang hoạt động, bộ sưu tập trong Pro năm và mua Launch Edition.'],
      ['Gói Pro có thể hủy bất cứ lúc nào. Không hoàn tiền một phần cho kỳ thanh toán hiện tại.', 'Giao dịch mua kỹ thuật số một lần không hoàn tiền sau khi mở quyền tải xuống, trừ khi lỗi kỹ thuật ngăn truy cập và bạn liên hệ trong 14 ngày.'],
      ['Về điều khoản, giấy phép hoặc hoàn tiền, hãy gửi email hello@supericons.dev.'],
    ],
    th: [
      ['Supericons ให้บริการไอคอนฟรีและไอคอนพรีเมียมสำหรับผลิตภัณฑ์ดิจิทัล ไอคอนฟรียังคงใช้ใบอนุญาตโอเพนซอร์สดั้งเดิม', 'ชุดแอนิเมชันพรีเมียมเป็นทรัพย์สินของ Curly Mole Labs และใช้ตามระดับใบอนุญาตที่ซื้อ'],
      ['ไอคอนที่ดึงผ่านเซิร์ฟเวอร์ MCP สามารถใช้ในโค้ดที่สร้างโดย AI ได้', 'ไฟล์ต้นฉบับ SVG และ CSS animation ยังเป็นทรัพย์สินของ Curly Mole Labs และห้ามดึง แกะย้อนกลับ หรือส่งออกจำนวนมาก'],
      ['คุณห้ามแจกจ่ายไฟล์ SVG หรือ CSS ดิบต่อ ห้ามขายสิทธิ์เข้าถึงต่อ ห้ามให้ sublicense และห้ามสร้างไลบรารีไอคอนที่แข่งขันกัน', 'คุณใช้ไอคอนในเว็บไซต์ แอป งานลูกค้า และผลลัพธ์ที่คอมไพล์แล้วได้เมื่อไฟล์ต้นฉบับไม่ถูกเปิดเผยโดยตรง'],
      ['ใบอนุญาตหนึ่งโปรเจกต์ใช้กับการซื้อแยกและชุดที่รับผ่าน Pro รายเดือน', 'ใบอนุญาตไม่จำกัดโปรเจกต์ใช้กับ Pro ที่ยังใช้งานอยู่ ชุดที่รวมใน Pro รายปี และการซื้อ Launch Edition'],
      ['ยกเลิก Pro ได้ทุกเมื่อ ไม่มีการคืนเงินบางส่วนสำหรับรอบบิลปัจจุบัน', 'การซื้อดิจิทัลแบบครั้งเดียวไม่คืนเงินหลังเปิดสิทธิ์ดาวน์โหลด ยกเว้นปัญหาทางเทคนิคที่ทำให้เข้าถึงไม่ได้และแจ้งภายใน 14 วัน'],
      ['เรื่องข้อกำหนด ใบอนุญาต หรือการคืนเงิน โปรดส่งอีเมลถึง hello@supericons.dev'],
    ],
  };
  if (kind === 'terms') return legalTopics[locale]?.[index] || [contact];
  const privacy = {
    es: 'Solo describimos datos necesarios para operar Supericons, como cuenta, compras, derechos de acceso, soporte, seguridad y analítica sin cookies.',
    de: 'Beschrieben werden nur Daten, die für Supericons nötig sind, etwa Konto, Käufe, Berechtigungen, Support, Sicherheit und cookie-freie Analysen.',
    fr: 'Nous décrivons uniquement les données nécessaires au fonctionnement de Supericons, comme le compte, les achats, les droits, le support, la sécurité et les analyses sans cookies.',
    pt: 'Descrevemos apenas os dados necessários para operar o Supericons, como conta, compras, permissões, suporte, segurança e análises sem cookies.',
    ja: 'Supericons の運用に必要なアカウント、購入、権限、サポート、セキュリティ、cookie を使わない分析データについて説明します。',
    ko: 'Supericons 운영에 필요한 계정, 구매, 권한, 지원, 보안, 쿠키 없는 분석 데이터만 설명합니다.',
    ar: 'نوضح فقط البيانات اللازمة لتشغيل Supericons، مثل الحساب والمشتريات والاستحقاقات والدعم والأمان والتحليلات دون ملفات تعريف ارتباط.',
    hi: 'हम केवल Supericons चलाने के लिए जरूरी डेटा बताते हैं, जैसे खाता, खरीद, अधिकार, सहायता, सुरक्षा और cookie रहित विश्लेषण।',
    vi: 'Chúng tôi chỉ mô tả dữ liệu cần thiết để vận hành Supericons, như tài khoản, giao dịch mua, quyền truy cập, hỗ trợ, bảo mật và phân tích không dùng cookie.',
    th: 'เราอธิบายเฉพาะข้อมูลที่จำเป็นต่อการให้บริการ Supericons เช่น บัญชี การซื้อ สิทธิ์การเข้าถึง การสนับสนุน ความปลอดภัย และการวิเคราะห์แบบไม่ใช้คุกกี้',
  };
  return [privacy[locale] || assets, contact];
}

function completeCompact(locale) {
  const c = compactLocales[locale];
  const termsBodies = c.termsHeadings.map((_, index) => localizedBody(locale, 'terms', index));
  const privacyBodies = c.privacyHeadings.map((_, index) => localizedBody(locale, 'privacy', index));
  const p = c.pricing;
  const q = qualityPricingText[locale] || p;
  const inherited = compactLocales.es.pricing;
  const localizedPlanNames = {
    es: ['Gratis', 'Pro', 'Paquete individual', 'Paquete Launch', 'Pasar a Pro', 'Ver paquetes', 'Obtener Paquete Launch'],
    de: ['Kostenlos', 'Pro', 'Einzelpaket', 'Launch-Paket', 'Pro werden', 'Pakete ansehen', 'Launch-Paket kaufen'],
    fr: ['Gratuit', 'Pro', 'Pack individuel', 'Pack Launch', 'Passer à Pro', 'Voir les packs', 'Obtenir le Pack Launch'],
    pt: ['Grátis', 'Pro', 'Pacote individual', 'Pacote Launch', 'Assinar Pro', 'Ver pacotes', 'Obter Pacote Launch'],
    ja: ['無料', 'Pro', '単体パック', 'Launch バンドル', 'Pro にする', 'パックを見る', 'Launch バンドルを入手'],
    ko: ['무료', 'Pro', '단일 팩', 'Launch 번들', 'Pro로 업그레이드', '팩 보기', 'Launch 번들 받기'],
    ar: ['مجاني', 'Pro', 'حزمة واحدة', 'حزمة Launch', 'الترقية إلى Pro', 'تصفح الحزم', 'احصل على حزمة Launch'],
    hi: ['मुफ्त', 'Pro', 'एक पैक', 'Launch बंडल', 'Pro लें', 'पैक देखें', 'Launch बंडल लें'],
    vi: ['Miễn phí', 'Pro', 'Gói riêng lẻ', 'Gói Launch', 'Nâng cấp Pro', 'Xem gói', 'Nhận gói Launch'],
    th: ['ฟรี', 'Pro', 'แพ็กเดี่ยว', 'ชุด Launch', 'อัปเกรดเป็น Pro', 'ดูแพ็ก', 'รับชุด Launch'],
  }[locale] || ['Free', 'Pro', 'Single Pack', 'Launch Bundle', 'Go Pro', 'Browse Packs', 'Get Launch Bundle'];
  const localizedPeriods = {
    es: ['por pack', 'pago único'],
    de: ['pro Paket', 'einmalig'],
    fr: ['par pack', 'paiement unique'],
    pt: ['por pacote', 'pagamento único'],
    ja: ['パックごと', '一回払い'],
    ko: ['팩당', '일회성'],
    ar: ['لكل حزمة', 'دفعة واحدة'],
    hi: ['प्रति पैक', 'एक बार'],
    vi: ['mỗi gói', 'thanh toán một lần'],
    th: ['ต่อแพ็ก', 'จ่ายครั้งเดียว'],
  }[locale] || ['per pack', 'one-time'];
  return {
    updated: c.updated,
    termsTitle: c.termsTitle,
    privacyTitle: c.privacyTitle,
    termsHeadings: c.termsHeadings,
    termsBodies,
    privacyHeadings: c.privacyHeadings,
    privacyBodies,
    pricing: {
      ...english.pricing,
      headerTitle: p.headerTitle,
      headerSubtitle: p.headerSubtitle,
      freeIconsAcrossLibraries: p.freeIconsAcrossLibraries,
      mcpServerFreeIcons: p.mcpServerFreeIcons,
      monthly: p.monthly,
      annual: p.annual,
      save45: p.save45,
      save28: p.save28,
      mostPopular: p.mostPopular,
      faqTitle: p.faqTitle,
      plans: {
        free: { ...english.pricing.plans.free, name: localizedPlanNames[0], description: q.freeDesc || inherited.freeDesc, cta: localizedPlanNames[0], features: q.freeFeatures || inherited.freeFeatures },
        pro: { ...english.pricing.plans.pro, name: localizedPlanNames[1], cta: localizedPlanNames[4], monthlyDescription: q.proMonthlyDesc || inherited.proMonthlyDesc, annualDescription: q.proAnnualDesc || inherited.proAnnualDesc, monthlyFeatures: q.proMonthlyFeatures || inherited.proMonthlyFeatures, annualFeatures: q.proAnnualFeatures || inherited.proAnnualFeatures },
        singlePack: { ...english.pricing.plans.singlePack, name: localizedPlanNames[2], period: q.singlePeriod || localizedPeriods[0], description: q.singleDesc || inherited.singleDesc, cta: localizedPlanNames[5], features: q.singleFeatures || inherited.singleFeatures },
        launchBundle: { ...english.pricing.plans.launchBundle, name: localizedPlanNames[3], period: q.launchPeriod || localizedPeriods[1], description: q.launchDesc || inherited.launchDesc, cta: localizedPlanNames[6], features: q.launchFeatures || inherited.launchFeatures },
      },
      faq: { questions: q.faqQuestions || inherited.faqQuestions, answers: q.faqAnswers || inherited.faqAnswers },
    },
  };
}

for (const locale of Object.keys(compactLocales)) {
  localized[locale] = completeCompact(locale);
}

for (const locale of locales) {
  const file = path.join(dir, `${locale}.json`);
  const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
  const copy = localized[locale] || english;
  catalog.legal = catalog.legal || {};
  catalog.legal.terms = page(copy.updated, copy.termsTitle, copy.termsHeadings, copy.termsBodies);
  catalog.legal.privacy = page(copy.updated, copy.privacyTitle, copy.privacyHeadings, copy.privacyBodies);
  catalog.pricing = copy.pricing;
  fs.writeFileSync(file, `${JSON.stringify(catalog, null, 2)}\n`);
}
