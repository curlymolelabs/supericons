import fs from 'node:fs';
import path from 'node:path';

throw new Error('Archived unsafe script: do not repair docs bodies with generic localized skeleton copy. Use a verified docs-body localization batch instead.');

const localeConfigs = {
  'zh-Hans': {
    pageContent: '本页内容',
    steps: '实用步骤',
    keep: '保持不翻译的内容',
    intro: (title) => `这份本地化指南说明 ${title}。它保留关键设置值，并用本语言解释如何安全使用 Supericons。`,
    step1: '阅读页面顶部摘要，确认这是否是你当前需要的设置或工作流。',
    step2: '复制代码块时不要翻译代码、命令或环境变量。',
    step3: '如果你使用 MCP，请在修改配置后重启客户端。',
    codeNote: '命令、包名、环境变量、工具 ID 和配置字段必须保持原样，这样 MCP 客户端和代码示例才能正常工作。',
    pages: {
      docs: ['简介', 'Supericons 文档', '设置 MCP，学习 Motion Lab，并使用 Converter。'],
      'docs-quickstart': ['快速开始', '快速开始', '在 5 分钟内让 Supericons 在你的编码代理中运行。'],
      'docs-what-is-supericons': ['什么是 Supericons', '什么是 Supericons', null],
      'docs-mcp-universal': ['通用设置', '通用 MCP 设置', '用任何支持 MCP 的客户端连接 Supericons。'],
      'docs-claude-code': ['Claude Code', 'Claude Code 设置', '在 Claude Code 中添加 Supericons MCP 服务器。'],
      'docs-codex': ['Codex', 'Codex 设置', '在 Codex 中使用 Supericons 搜索、转换和动画工具。'],
      'docs-cursor': ['Cursor', 'Cursor 设置', '在 Cursor 中连接 Supericons MCP 工具。'],
      'docs-mcp-others': ['其他 MCP 客户端', '其他 MCP 客户端', '在更多 MCP 客户端中配置 Supericons。'],
      'docs-mcp-search-guide': ['搜索指南', 'MCP 搜索指南', '学习如何用 MCP 更快找到合适图标。'],
      'docs-mcp-tools': ['工具参考', 'MCP 工具参考', '查看 Supericons MCP 工具及其用途。'],
      'docs-mcp-icons': ['图标工具', 'MCP 图标工具', '搜索、获取和推荐图标。'],
      'docs-mcp-motion': ['Motion Lab 工具', 'MCP Motion Lab 工具', '生成图标动画 CSS 和动画 SVG。'],
      'docs-mcp-converter': ['转换器工具', 'MCP 转换器工具', '在 PNG 和 SVG 工作流之间转换图标资源。'],
      'docs-motion-lab': ['Motion Lab', 'Motion Lab', '用 Motion Lab 为图标添加可复用动画。'],
      'docs-motion-lab-presets': ['预设', 'Motion Lab 预设', '了解可用于图标的动画预设。'],
      'docs-motion-lab-triggers': ['触发方式', 'Motion Lab 触发方式', '选择循环、悬停或点击触发动画。'],
      'docs-motion-lab-exports': ['导出', 'Motion Lab 导出', '导出 CSS 或完整动画 SVG。'],
      'docs-motion-lab-mcp-workflow': ['MCP 工作流', 'Motion Lab MCP 工作流', '通过 MCP 从代理工作流生成动画资源。'],
      'docs-motion-lab-client-setup': ['客户端设置', 'Motion Lab 客户端设置', '配置客户端以使用 Motion Lab 工具。'],
      'docs-motion-lab-use-cases': ['使用场景', 'Motion Lab 使用场景', '了解适合动态图标的常见产品场景。'],
      'docs-converter-guide': ['转换器指南', '转换器指南', '了解何时使用 Supericons Converter。'],
      'docs-converter-png-to-svg': ['PNG 转 SVG', 'PNG 转 SVG', '把 PNG 图标转换为 SVG。'],
      'docs-converter-svg-to-png': ['SVG 转 PNG', 'SVG 转 PNG', '把 SVG 图标导出为 PNG。'],
      'docs-converter-settings': ['转换器设置', '转换器设置', '选择适合图标转换的质量和颜色设置。'],
      'docs-access-api-keys': ['访问和 API 密钥', '访问和 API 密钥', '设置 API 密钥以使用需要账户权限的功能。'],
      'docs-access-premium': ['高级集合', '高级集合访问', '了解高级图标集合如何解锁和使用。'],
      'docs-troubleshooting': ['故障排除', '故障排除', '修复常见设置、搜索和导出问题。'],
    },
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
    pages: {
      docs: ['簡介', 'Supericons 文件', '設定 MCP、學習 Motion Lab，並使用 Converter。'],
      'docs-quickstart': ['快速開始', '快速開始', '在 5 分鐘內讓 Supericons 在你的編碼代理中運作。'],
      'docs-what-is-supericons': ['什麼是 Supericons', '什麼是 Supericons', null],
      'docs-mcp-universal': ['通用設定', '通用 MCP 設定', '用任何支援 MCP 的用戶端連接 Supericons。'],
      'docs-claude-code': ['Claude Code', 'Claude Code 設定', '在 Claude Code 中加入 Supericons MCP 伺服器。'],
      'docs-codex': ['Codex', 'Codex 設定', '在 Codex 中使用 Supericons 搜尋、轉換和動畫工具。'],
      'docs-cursor': ['Cursor', 'Cursor 設定', '在 Cursor 中連接 Supericons MCP 工具。'],
      'docs-mcp-others': ['其他 MCP 用戶端', '其他 MCP 用戶端', '在更多 MCP 用戶端中設定 Supericons。'],
      'docs-mcp-search-guide': ['搜尋指南', 'MCP 搜尋指南', '學習如何用 MCP 更快找到合適圖示。'],
      'docs-mcp-tools': ['工具參考', 'MCP 工具參考', '查看 Supericons MCP 工具及其用途。'],
      'docs-mcp-icons': ['圖示工具', 'MCP 圖示工具', '搜尋、取得和推薦圖示。'],
      'docs-mcp-motion': ['Motion Lab 工具', 'MCP Motion Lab 工具', '產生圖示動畫 CSS 和動畫 SVG。'],
      'docs-mcp-converter': ['轉換器工具', 'MCP 轉換器工具', '在 PNG 和 SVG 工作流程之間轉換圖示資源。'],
      'docs-motion-lab': ['Motion Lab', 'Motion Lab', '用 Motion Lab 為圖示加入可重複使用的動畫。'],
      'docs-motion-lab-presets': ['預設', 'Motion Lab 預設', '了解可用於圖示的動畫預設。'],
      'docs-motion-lab-triggers': ['觸發方式', 'Motion Lab 觸發方式', '選擇循環、懸停或點擊觸發動畫。'],
      'docs-motion-lab-exports': ['匯出', 'Motion Lab 匯出', '匯出 CSS 或完整動畫 SVG。'],
      'docs-motion-lab-mcp-workflow': ['MCP 工作流程', 'Motion Lab MCP 工作流程', '透過 MCP 從代理工作流程產生動畫資源。'],
      'docs-motion-lab-client-setup': ['用戶端設定', 'Motion Lab 用戶端設定', '設定用戶端以使用 Motion Lab 工具。'],
      'docs-motion-lab-use-cases': ['使用情境', 'Motion Lab 使用情境', '了解適合動態圖示的常見產品情境。'],
      'docs-converter-guide': ['轉換器指南', '轉換器指南', '了解何時使用 Supericons Converter。'],
      'docs-converter-png-to-svg': ['PNG 轉 SVG', 'PNG 轉 SVG', '把 PNG 圖示轉換為 SVG。'],
      'docs-converter-svg-to-png': ['SVG 轉 PNG', 'SVG 轉 PNG', '把 SVG 圖示匯出為 PNG。'],
      'docs-converter-settings': ['轉換器設定', '轉換器設定', '選擇適合圖示轉換的品質和色彩設定。'],
      'docs-access-api-keys': ['存取和 API 金鑰', '存取和 API 金鑰', '設定 API 金鑰以使用需要帳戶權限的功能。'],
      'docs-access-premium': ['高級集合', '高級集合存取', '了解高級圖示集合如何解鎖和使用。'],
      'docs-troubleshooting': ['疑難排解', '疑難排解', '修正常見設定、搜尋和匯出問題。'],
    },
  },
};

function bodyHtml(localeConfig, title, summary) {
  const intro = localeConfig.intro(title);
  const overview = summary || intro;
  return `
      <section class="docs-section" id="localized-overview">
        <h2 class="docs-section__title">${localeConfig.pageContent}</h2>
        <p class="docs-section__copy">${overview}</p>
        <p class="docs-section__copy">${intro}</p>
      </section>
      <section class="docs-section" id="localized-focus">
        <h2 class="docs-section__title">${localeConfig.pageContent}</h2>
        <p class="docs-section__copy">${intro}</p>
      </section>
      <section class="docs-section" id="localized-steps">
        <h2 class="docs-section__title">${localeConfig.steps}</h2>
        <ol class="docs-list docs-list--numbered">
          <li>${localeConfig.step1}</li>
          <li>${localeConfig.step2}</li>
          <li>${localeConfig.step3}</li>
        </ol>
      </section>
      <section class="docs-callout" id="localized-code-note">
        <h3>${localeConfig.keep}</h3>
        <p>${localeConfig.codeNote}</p>
        <pre><code>npx -y @supericons/mcp@latest
SUPERICONS_API_KEY</code></pre>
      </section>
    `;
}

for (const [locale, localeConfig] of Object.entries(localeConfigs)) {
  const file = path.join('data/i18n/messages', `${locale}.json`);
  const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));

  for (const [pageId, [navLabel, pageTitle, summary]] of Object.entries(localeConfig.pages)) {
    const nextPage = {
      ...(catalog.docs.pages[pageId] || {}),
      navLabel,
      pageTitle,
      bodyHtml: bodyHtml(localeConfig, pageTitle, summary),
    };
    if (summary) {
      nextPage.summary = summary;
    } else {
      delete nextPage.summary;
    }
    catalog.docs.pages[pageId] = {
      ...nextPage,
    };
  }

  fs.writeFileSync(file, `${JSON.stringify(catalog, null, 2)}\n`);
}

console.log('repair-chinese-docs-localization: ok');
