import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

import {
  MCP_CLIENT_CONFIGS,
  assertMcpClientConfig,
} from '../lib/mcp-client-configs.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifactRootIndex = process.argv.indexOf('--artifact-root');
const artifactRoot = artifactRootIndex >= 0
  ? path.resolve(process.argv[artifactRootIndex + 1])
  : repoRoot;
const baseUrlIndex = process.argv.indexOf('--base-url');
const suppliedBaseUrl = baseUrlIndex >= 0
  ? new URL(process.argv[baseUrlIndex + 1]).toString()
  : null;
const useExistingDist = process.argv.includes('--use-existing-dist');
const port = 4193;
const baseUrl = suppliedBaseUrl || `http://127.0.0.1:${port}/`;
const viteBin = path.join(repoRoot, 'node_modules', 'vite', 'bin', 'vite.js');

for (const config of MCP_CLIENT_CONFIGS) {
  assert.equal(assertMcpClientConfig(config), true);
}

if (!suppliedBaseUrl && !useExistingDist) {
  execFileSync(process.execPath, [viteBin, 'build'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

const server = suppliedBaseUrl
  ? null
  : spawn(
    process.execPath,
    [
      viteBin,
      'preview',
      artifactRoot,
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--strictPort',
    ],
    {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    },
  );

let serverOutput = '';
server?.stdout.on('data', (chunk) => {
  serverOutput += String(chunk);
});
server?.stderr.on('data', (chunk) => {
  serverOutput += String(chunk);
});

async function waitForServer() {
  if (suppliedBaseUrl) {
    const response = await fetch(baseUrl);
    assert.equal(response.ok, true, `Remote web surface returned HTTP ${response.status}.`);
    return;
  }
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (server?.exitCode !== null) {
      throw new Error(`Local Vite server exited early.\n${serverOutput}`);
    }
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Local Vite server did not become ready.\n${serverOutput}`);
}

async function createPage(browser, viewport) {
  const context = await browser.newContext({
    viewport,
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await context.newPage();
  await page.route('https://cloud.umami.is/**', (route) => route.abort());
  await page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: 'window.supabase={createClient(){return {auth:{onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}},async getSession(){return {data:{session:null}}}}}}};',
  }));
  await page.route('https://kcjmkakdhsqplvasgkjv.supabase.co/**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: '[]',
  }));
  return { context, page };
}

let browser;

try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });

  const desktop = await createPage(browser, { width: 1180, height: 900 });
  await desktop.page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await desktop.page.waitForSelector('[data-mcp-client="claude-code"][aria-selected="true"]');

  for (const config of MCP_CLIENT_CONFIGS) {
    const tab = desktop.page.locator(`[data-mcp-client="${config.id}"]`);
    await tab.click();
    assert.equal(await tab.getAttribute('aria-selected'), 'true', `${config.id}: tab was not selected.`);
    assert.equal(
      await desktop.page.locator('[data-mcp-client][aria-selected="true"]').count(),
      1,
      `${config.id}: more than one tab was selected.`,
    );
    assert.equal(await desktop.page.locator('#mcpConfigLocation').textContent(), config.location);
    assert.equal(await desktop.page.locator('#mcpConfigBlock code').textContent(), config.code);
    assert.equal(await desktop.page.locator('#mcpConfigBlock code').getAttribute('data-format'), config.format);

    await desktop.page.locator('#mcpCopyBtn').click();
    assert.equal(
      (await desktop.page.evaluate(() => navigator.clipboard.readText())).replaceAll('\r\n', '\n'),
      config.code.replaceAll('\r\n', '\n'),
      `${config.id}: copy button did not copy the active config.`,
    );
  }

  const firstTab = desktop.page.locator('[data-mcp-client="claude-code"]');
  await firstTab.focus();
  await firstTab.press('ArrowRight');
  assert.equal(await desktop.page.locator('[data-mcp-client="codex"]').getAttribute('aria-selected'), 'true');
  await desktop.page.locator('[data-mcp-client="codex"]').press('End');
  assert.equal(await desktop.page.locator('[data-mcp-client="windsurf"]').getAttribute('aria-selected'), 'true');
  await desktop.page.locator('[data-mcp-client="windsurf"]').press('Home');
  assert.equal(await firstTab.getAttribute('aria-selected'), 'true');

  const englishDocsUrl = new URL(baseUrl);
  englishDocsUrl.searchParams.set('view', 'docs-access-api-keys');
  await desktop.page.goto(englishDocsUrl.toString(), { waitUntil: 'domcontentloaded' });
  await desktop.page.getByRole('heading', { name: 'Start free without a key' }).waitFor();
  await desktop.page.getByText(
    'You do not need an API key to search, preview, retrieve, or list free icons through local or hosted MCP.',
    { exact: false },
  ).waitFor();
  await desktop.page.getByText(
    'Today, API keys are available to accounts with an active Pro subscription or at least one pack purchase.',
    { exact: true },
  ).waitFor();

  const germanDocsUrl = new URL(englishDocsUrl);
  germanDocsUrl.searchParams.set('locale', 'de');
  await desktop.page.goto(germanDocsUrl.toString(), { waitUntil: 'domcontentloaded' });
  await desktop.page.getByText(
    'Sie benötigen keinen API-Schlüssel, um kostenlose Symbole über lokales oder gehostetes MCP zu suchen',
    { exact: false },
  ).waitFor();
  await desktop.context.close();

  const mobile = await createPage(browser, { width: 390, height: 844 });
  await mobile.page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await mobile.page.waitForSelector('[data-mcp-client="claude-code"][aria-selected="true"]');
  const mobileTabs = await mobile.page.locator('#mcpClientTabs').evaluate((node) => ({
    clientWidth: node.clientWidth,
    scrollWidth: node.scrollWidth,
    overflowX: getComputedStyle(node).overflowX,
  }));
  assert.ok(mobileTabs.scrollWidth > mobileTabs.clientWidth, 'Mobile client tabs must be horizontally scrollable.');
  assert.equal(mobileTabs.overflowX, 'auto');
  await mobile.page.locator('[data-mcp-client="opencode"]').click();
  assert.equal(await mobile.page.locator('#mcpConfigLocation').textContent(), 'opencode.json in your project');
  assert.ok((await mobile.page.locator('#mcpConfigBlock code').textContent()).includes('"type": "local"'));
  await mobile.context.close();

  console.log('verify-mcp-client-tabs-browser: ok');
} finally {
  await browser?.close();
  if (server && server.exitCode === null) server.kill();
}
