import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const suppliedBaseUrl = process.env.WEBSITE_POPULARITY_BASE_URL || '';
const port = 4179;
const baseUrl = suppliedBaseUrl || `http://127.0.0.1:${port}`;
const viteBin = path.join(repoRoot, 'node_modules', 'vite', 'bin', 'vite.js');
if (!suppliedBaseUrl) {
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
    assert.equal(response.ok, true, `Web surface returned HTTP ${response.status}.`);
    return;
  }
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (server && server.exitCode !== null) {
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
const screenshotDir = path.resolve(
  '.tmp',
  'website-popularity-verification'
);
const screenshotPath = path.join(screenshotDir, 'outline-fresh.png');

const expectedTop20 = [
  'lucide:shield-check',
  'lucide:search',
  'lucide:workflow',
  'lucide:users',
  'lucide:database',
  'lucide:brain-cog',
  'lucide:network',
  'lucide:triangle-alert',
  'lucide:package',
  'lucide:sparkles',
  'lucide:chart-no-axes-combined',
  'lucide:star',
  'lucide:map-pin',
  'lucide:route',
  'lucide:clipboard-check',
  'tabler:brand-openai',
  'lucide:refresh-cw',
  'lucide:trash-2',
  'lucide:users-round',
  'lucide:settings',
];
const expectedSolidTop20 = [
  'tabler:shield-check',
  'tabler:chevron-right',
  'tabler:send',
  'tabler:calendar-event',
  'tabler:clipboard-check',
  'tabler:layout-grid',
  'tabler:alarm',
  'tabler:settings',
  'tabler:brand-whatsapp',
  'tabler:shield-lock',
  'tabler:alert-triangle',
  'tabler:circle-check',
  'tabler:clock',
  'tabler:database',
  'phosphor:user-circle-fill',
  'tabler:archive',
  'tabler:clipboard-list',
  'tabler:layout-dashboard',
  'tabler:leaf',
  'tabler:x',
];

await fs.mkdir(screenshotDir, { recursive: true });

let browser;

try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

async function enterGridIfNeeded() {
  const heroSearchButton = page.locator('#heroSearchBtn');
  if (await heroSearchButton.isVisible()) {
    await heroSearchButton.click();
  }
}

let releasePopularity;
const popularityGate = new Promise((resolve) => {
  releasePopularity = resolve;
});
let popularityReleased = false;
let outlineStatus = 'fresh';

await page.route(
  '**/rest/v1/icon_scores?**',
  (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: '[]',
  })
);

await page.route(
  '**/rest/v1/rpc/si_get_website_popular_icons',
  async (route) => {
    if (!popularityReleased) await popularityGate;
    const body = route.request().postDataJSON();
    const style = body?.p_style;
    if (style === 'outline' && outlineStatus === 'network_error') {
      await route.abort('failed');
      return;
    }
    const now = Date.now();
    const payload = style === 'outline' && outlineStatus === 'fresh'
      ? {
          status: 'fresh',
          calculated_at: new Date(now - 60 * 60 * 1000).toISOString(),
          stale_after: new Date(now + 47 * 60 * 60 * 1000).toISOString(),
          icon_refs: expectedTop20,
        }
      : style === 'outline'
        ? {
            status: outlineStatus,
            calculated_at: new Date(now - 49 * 60 * 60 * 1000).toISOString(),
            stale_after: new Date(now - 60 * 60 * 1000).toISOString(),
            icon_refs: [],
          }
      : {
          status: 'fresh',
          calculated_at: new Date(now - 60 * 60 * 1000).toISOString(),
          stale_after: new Date(now + 47 * 60 * 60 * 1000).toISOString(),
          icon_refs: expectedSolidTop20,
        };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    });
  }
);

await page.route(
  '**/functions/v1/web-search-telemetry',
  (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ status: 'ok' }),
  })
);

await page.route(
  'https://mcp.supericons.dev/search-icons',
  (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      results: [],
      search_runtime: { mode: 'browser-verification' },
    }),
  })
);

await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
await enterGridIfNeeded();
await page.waitForFunction(() => (
  window.__supericons?.state?.filteredIcons?.length > 20000
));

const baseOrder = await page.evaluate(() => (
  window.__supericons.state.filteredIcons
    .map((icon) => `${icon.lib}:${icon.id}`)
));
assert.equal(
  await page.evaluate(() => (
    window.__supericons.state.websitePopularityAppliedCount
  )),
  0
);

popularityReleased = true;
releasePopularity();

await page.waitForFunction(() => (
  window.__supericons?.state?.websitePopularityAppliedCount === 20
));

const promotedOrder = await page.evaluate(() => (
  window.__supericons.state.filteredIcons
    .map((icon) => `${icon.lib}:${icon.id}`)
));
assert.deepEqual(promotedOrder.slice(0, 20), expectedTop20);

const expectedSet = new Set(expectedTop20);
assert.deepEqual(
  promotedOrder.slice(20),
  baseOrder.filter((ref) => !expectedSet.has(ref)),
  'the browser grid tail must keep its previous relative order'
);
assert.equal(await page.locator('.tier-divider').count(), 0);
await page.waitForFunction(() => (
  document.querySelector('#gridMeta')?.textContent
    ?.includes('supported hosted agent tools')
));
assert.match(
  await page.locator('#gridMeta').textContent(),
  /Updated/
);

await page.screenshot({
  path: screenshotPath,
  fullPage: false,
});

await page.locator('#searchInput').fill('settings');
await page.waitForFunction(() => (
  window.__supericons?.state?.searchQuery === 'settings'
  && window.__supericons.state.websitePopularityAppliedCount === 0
));

await page.locator('#searchInput').fill('');
await page.waitForFunction(() => (
  window.__supericons?.state?.searchQuery === ''
  && window.__supericons.state.websitePopularityAppliedCount === 20
));

for (const library of ['lucide', 'favorites', 'recent']) {
  await page.locator(`[data-library="${library}"]`).evaluate((item) => item.click());
  await page.waitForFunction((expectedLibrary) => (
    window.__supericons?.state?.activeLibrary === expectedLibrary
    && window.__supericons.state.websitePopularityAppliedCount === 0
  ), library);
  await page.locator('[data-library="all"]').evaluate((item) => item.click());
  await page.waitForFunction(() => (
    window.__supericons?.state?.activeLibrary === 'all'
    && window.__supericons.state.websitePopularityAppliedCount === 20
  ));
}

await page.locator('#styleSolid').click();
await page.waitForFunction(() => (
  window.__supericons?.state?.iconStyle === 'solid'
  && window.__supericons.state.websitePopularityByStyle.solid.status
    === 'fresh'
  && window.__supericons.state.websitePopularityAppliedCount === 20
));
assert.deepEqual(
  await page.evaluate(() => (
    window.__supericons.state.filteredIcons
      .slice(0, 20)
      .map((icon) => `${icon.lib}:${icon.id}`)
  )),
  expectedSolidTop20
);

outlineStatus = 'stale';
await page.reload({ waitUntil: 'domcontentloaded' });
await enterGridIfNeeded();
await page.waitForFunction(() => (
  window.__supericons?.state?.websitePopularityByStyle?.outline?.status
    === 'stale'
));
assert.equal(
  await page.evaluate(() => (
    window.__supericons.state.websitePopularityAppliedCount
  )),
  0
);
assert.match(
  await page.locator('#gridMeta').textContent(),
  /Popular icons are being refreshed/
);
assert.deepEqual(
  await page.evaluate(() => (
    window.__supericons.state.filteredIcons
      .map((icon) => `${icon.lib}:${icon.id}`)
  )),
  baseOrder,
  'a stale response must preserve the usual grid order'
);

outlineStatus = 'failed';
await page.reload({ waitUntil: 'domcontentloaded' });
await enterGridIfNeeded();
await page.waitForFunction(() => (
  window.__supericons?.state?.websitePopularityByStyle?.outline?.status
    === 'failed'
));
assert.match(
  await page.locator('#gridMeta').textContent(),
  /Popular icons are unavailable right now/
);

outlineStatus = 'network_error';
await page.reload({ waitUntil: 'domcontentloaded' });
await enterGridIfNeeded();
await page.waitForFunction(() => (
  window.__supericons?.state?.websitePopularityByStyle?.outline?.status
    === 'failed'
));
assert.deepEqual(
  await page.evaluate(() => (
    window.__supericons.state.filteredIcons
      .map((icon) => `${icon.lib}:${icon.id}`)
  )),
  baseOrder,
  'a network error must preserve the usual grid order'
);
assert.match(
  await page.locator('#gridMeta').textContent(),
  /Popular icons are unavailable right now/
);

const previewUrl = new URL(baseUrl);
previewUrl.searchParams.set('view', 'icons');
previewUrl.searchParams.set('preview', 'mcp');
previewUrl.searchParams.set(
  'icons',
  'lucide:settings,tabler:settings,material:settings'
);
await page.goto(previewUrl.toString(), { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => (
  window.__supericons?.state?.mcpPreview?.mode === 'explicit'
  && window.__supericons.state.filteredIcons.length === 3
));
assert.equal(
  await page.evaluate(() => (
    window.__supericons.state.websitePopularityAppliedCount
  )),
  0
);
assert.deepEqual(
  await page.evaluate(() => (
    window.__supericons.state.filteredIcons
      .map((icon) => `${icon.lib}:${icon.id}`)
  )),
  ['lucide:settings', 'tabler:settings', 'material:settings']
);

  console.log(JSON.stringify({
    status: 'ok',
    browser: 'chromium',
    promoted_refs: expectedTop20.length,
    tail_length: promotedOrder.length - expectedTop20.length,
    search_prefix_disabled: true,
    library_and_personal_views_unchanged: true,
    mcp_preview_unchanged: true,
    solid_status: 'fresh',
    stale_fallback_verified: true,
    failed_fallback_verified: true,
    network_error_fallback_verified: true,
    screenshot: screenshotPath,
  }, null, 2));
} finally {
  await browser?.close();
  server?.kill();
}
