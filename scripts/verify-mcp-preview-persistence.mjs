import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = 4187;
const baseUrl = `http://127.0.0.1:${port}/`;
const viteBin = path.join(repoRoot, 'node_modules', 'vite', 'bin', 'vite.js');
execFileSync(process.execPath, [viteBin, 'build'], {
  cwd: repoRoot,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});
const server = spawn(
  process.execPath,
  [viteBin, 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
  {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  },
);

let serverOutput = '';
server.stdout.on('data', (chunk) => {
  serverOutput += String(chunk);
});
server.stderr.on('data', (chunk) => {
  serverOutput += String(chunk);
});

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (server.exitCode !== null) {
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

function authStubSource() {
  return `
    window.supabase = {
      createClient() {
        return {
          auth: {
            onAuthStateChange() {
              return { data: { subscription: { unsubscribe() {} } } };
            },
            async getSession() {
              return { data: { session: null } };
            }
          }
        };
      }
    };
  `;
}

async function createPage(browser, {
  popularityDelayMs = 250,
  hostedHandler = null,
} = {}) {
  const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
  await page.addInitScript(() => {
    localStorage.setItem('si-hero-dismissed', '1');
    window.__SUPERICONS_SEARCH_ENGINE_ANON_KEY__ = 'test-publishable-key';
    window.__SUPERICONS_SEARCH_ENGINE_REQUIRE_JWT__ = 'false';
  });

  await page.route('**/supabase.min.js', (route) => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: authStubSource(),
  }));
  await page.route('**/jszip.min.js', (route) => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: 'window.JSZip = class JSZip {};',
  }));
  await page.route('https://cloud.umami.is/**', (route) => route.abort());
  await page.route('https://kcjmkakdhsqplvasgkjv.supabase.co/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/rest/v1/icon_scores?')) {
      await new Promise((resolve) => setTimeout(resolve, popularityDelayMs));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            icon_id: 'simpleicons:github',
            copy_count_30d: 999,
            download_count_30d: 999,
            favorite_count_30d: 999,
            popularity_score_30d: 999,
            trending_score_7d: 999,
          },
        ]),
      });
      return;
    }
    if (url.includes('/functions/v1/search-icons') && hostedHandler) {
      await hostedHandler(route);
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    });
  });
  return page;
}

async function waitForApp(page) {
  await page.waitForFunction(() => (
    window.__supericons?.state?.icons?.length > 1000
    && document.querySelector('#mcpPreviewBanner')
  ), null, { timeout: 30000 });
}

async function readPreviewState(page) {
  return page.evaluate(() => ({
    preview: window.__supericons.state.mcpPreview,
    refs: window.__supericons.state.filteredIcons.map((icon) => `${icon.lib}:${icon.id}`),
    filteredCount: window.__supericons.state.filteredIcons.length,
    totalCount: window.__supericons.state.icons.length,
    searchQuery: window.__supericons.state.searchQuery,
    bannerHidden: document.querySelector('#mcpPreviewBanner')?.hidden ?? true,
    emptyTitle: document.querySelector('.grid-empty__title')?.textContent?.trim() || '',
    url: window.location.href,
  }));
}

async function exerciseLocaleAndAuthRenders(page) {
  await page.evaluate(async () => {
    await window.__supericons.setActiveLocale('ja');
    window.dispatchEvent(new CustomEvent('supericons:auth-signed-in', {
      detail: { userId: 'preview-test' },
    }));
    window.dispatchEvent(new CustomEvent('supericons:auth-signed-out'));
  });
  await page.waitForTimeout(100);
}

let browser;

try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });

  {
    const page = await createPage(browser);
    const url = new URL(baseUrl);
    url.searchParams.set('view', 'icons');
    url.searchParams.set('preview', 'mcp');
    url.searchParams.set('icons', 'lucide:settings,tabler:settings,material:settings');
    await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await page.waitForTimeout(700);

    const expectedRefs = ['lucide:settings', 'tabler:settings', 'material:settings'];
    let result = await readPreviewState(page);
    assert.equal(result.preview?.mode, 'explicit');
    assert.deepEqual(result.refs, expectedRefs);
    assert.equal(result.bannerHidden, false);
    assert.equal(new URL(result.url).searchParams.get('view'), 'icons');

    await exerciseLocaleAndAuthRenders(page);
    result = await readPreviewState(page);
    assert.deepEqual(result.refs, expectedRefs);
    assert.equal(result.preview?.mode, 'explicit');
    await page.close();
  }

  {
    const page = await createPage(browser, {
      hostedHandler: async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            results: [{ icon_id: 'lucide:settings' }],
          }),
        });
      },
    });
    const url = new URL(baseUrl);
    url.searchParams.set('view', 'icons');
    url.searchParams.set('preview', 'mcp');
    url.searchParams.set('q', 'settings');
    url.searchParams.set('library', 'lucide');
    await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await page.waitForTimeout(700);

    let result = await readPreviewState(page);
    assert.equal(result.preview?.mode, 'query');
    assert.equal(result.searchQuery, 'settings');
    assert.ok(result.filteredCount > 0);
    assert.ok(result.filteredCount < result.totalCount);
    assert.equal(result.bannerHidden, false);

    await exerciseLocaleAndAuthRenders(page);
    result = await readPreviewState(page);
    assert.equal(result.preview?.mode, 'query');
    assert.equal(result.searchQuery, 'settings');
    assert.ok(result.filteredCount > 0);
    assert.ok(result.filteredCount < result.totalCount);
    await page.close();
  }

  {
    const page = await createPage(browser);
    const url = new URL(baseUrl);
    url.searchParams.set('view', 'icons');
    url.searchParams.set('preview', 'mcp');
    url.searchParams.set('icons', 'unknown:missing,also-unknown:none');
    await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await page.waitForTimeout(700);

    let result = await readPreviewState(page);
    assert.equal(result.preview?.mode, 'explicit');
    assert.equal(result.filteredCount, 0);
    assert.equal(result.emptyTitle, 'No shared icons found');

    await exerciseLocaleAndAuthRenders(page);
    result = await readPreviewState(page);
    assert.equal(result.filteredCount, 0);
    assert.equal(result.preview?.mode, 'explicit');
    await page.close();
  }

  {
    let releaseHosted;
    let observeHosted;
    const hostedReleased = new Promise((resolve) => {
      releaseHosted = resolve;
    });
    const hostedObserved = new Promise((resolve) => {
      observeHosted = resolve;
    });
    const page = await createPage(browser, {
      popularityDelayMs: 1500,
      hostedHandler: async (route) => {
        observeHosted();
        await hostedReleased;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            results: [{ icon_id: 'lucide:settings' }],
          }),
        });
      },
    });
    const url = new URL(baseUrl);
    url.searchParams.set('view', 'icons');
    url.searchParams.set('preview', 'mcp');
    url.searchParams.set('q', 'settings');
    await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await hostedObserved;

    await page.locator('#mcpPreviewBrowseAll').click();
    let result = await readPreviewState(page);
    assert.equal(result.preview, null);
    assert.equal(result.searchQuery, '');
    assert.equal(result.filteredCount, result.totalCount);
    assert.equal(new URL(result.url).searchParams.has('preview'), false);
    assert.equal(new URL(result.url).searchParams.has('q'), false);
    assert.equal(new URL(result.url).searchParams.get('view'), 'icons');

    releaseHosted();
    await page.waitForTimeout(300);
    result = await readPreviewState(page);
    assert.equal(result.preview, null);
    assert.equal(result.filteredCount, result.totalCount);
    assert.equal(result.searchQuery, '');
    await page.close();
  }

  console.log(JSON.stringify({
    status: 'ok',
    explicit_preview_survives_popularity_locale_auth: true,
    query_preview_survives_popularity_locale_auth: true,
    unknown_refs_remain_zero_results: true,
    late_hosted_response_invalidated_after_exit: true,
    view_icons_preserved_until_exit: true,
  }, null, 2));
} finally {
  await browser?.close();
  if (server.exitCode === null) {
    server.kill();
  }
}
