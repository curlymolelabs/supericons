import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const viteBin = path.join(repoRoot, 'node_modules', 'vite', 'bin', 'vite.js');
const port = 4300 + Math.floor(Math.random() * 400);
const baseUrl = `http://127.0.0.1:${port}/`;

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
for (const stream of [server.stdout, server.stderr]) {
  stream.on('data', (chunk) => {
    serverOutput = `${serverOutput}${chunk}`.slice(-12_000);
  });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`Browser artifact server exited early.\n${serverOutput}`);
    }
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // The built artifact is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Browser artifact server did not become ready.\n${serverOutput}`);
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

const corpus = JSON.parse(readFileSync(
  path.join(repoRoot, 'data', 'semantic-search-v2', 'surface-equivalence-corpus.json'),
  'utf8',
));
const cases = corpus.cases;

let browser;
let page;
let forceHostedFailure = false;

try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage({ viewport: { width: 1200, height: 820 } });
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
  await page.route('https://mcp.supericons.dev/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/search-icons')) {
      if (forceHostedFailure) {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'hosted dependency unavailable fixture' }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [],
          search_runtime: {
            mode: 'hosted',
            fallback_used: false,
            hosted_search_calls: 1,
          },
        }),
      });
      return;
    }
    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'unexpected hosted request' }),
    });
  });
  await page.route('https://kcjmkakdhsqplvasgkjv.supabase.co/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/functions/v1/search-icons')) {
      if (forceHostedFailure) {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'hosted dependency unavailable fixture' }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [],
          search_runtime: {
            mode: 'hosted',
            fallback_used: false,
            hosted_search_calls: 1,
          },
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    });
  });

  const url = new URL(baseUrl);
  url.searchParams.set('view', 'icons');
  await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__supericons?.state?.icons?.length > 20_000, null, {
    timeout: 30_000,
  });
  const searchInput = page.locator('#searchInput');
  await searchInput.waitFor({ state: 'visible', timeout: 10_000 });

  const observations = [];
  for (const item of cases) {
    forceHostedFailure = item.expected_decision === 'expected_error';
    const hostedResponse = page.waitForResponse(
      (response) => {
        if (!response.url().includes('/search-icons')) return false;
        try {
          return response.request().postDataJSON()?.query === item.query;
        } catch {
          return false;
        }
      },
      { timeout: 10_000 },
    );
    await page.evaluate((library) => {
      window.__supericons.state.activeLibrary = library || 'all';
    }, item.library || null);
    await searchInput.fill(item.query);
    await hostedResponse;
    await page.waitForFunction(
      (query) => (
        window.__supericons?.state?.searchQuery === query
        && window.__supericons?.state?.hostedSearchPending === false
      ),
      item.query,
      { timeout: 10_000 },
    );
    const refs = await page.evaluate(() => (
      window.__supericons.state.filteredIcons
        .slice(0, 8)
        .map((icon) => `${icon.lib}:${icon.id}`)
    ));

    const hostedSearchError = await page.evaluate(() => window.__supericons.state.hostedSearchError);
    if (item.expected_decision === 'expected_error') {
      assert.equal(
        hostedSearchError,
        'hosted_search_failed',
        `${item.case_id} hid the hosted browser error.`,
      );
      assert.equal(refs.length, 0, `${item.case_id} exposed local results after a hosted error.`);
      await page.locator(
        '.grid-empty__title',
        { hasText: 'Search is temporarily unavailable' },
      ).waitFor();
    } else if (item.expected_decision === 'expected_zero') {
      assert.equal(hostedSearchError, null, `${item.case_id} reported an unexpected browser error.`);
      assert.equal(refs.length, 0, `${item.case_id} fabricated browser results.`);
    } else {
      assert.equal(hostedSearchError, null, `${item.case_id} reported an unexpected browser error.`);
      assert.ok(refs.length > 0, `${item.case_id} returned a browser false zero.`);
      assert.ok(
        refs.slice(0, 3).some((ref) => (
          item.relevant_any.some((expected) => ref.toLowerCase().includes(String(expected).toLowerCase()))
        )),
        `${item.case_id} lacked a reviewed relevant icon in the browser top three: ${refs.join(', ')}`,
      );
      if (item.library_mode === 'strict') {
        assert.ok(
          refs.every((ref) => ref.startsWith(`${item.library}:`)),
          `${item.case_id} violated the strict browser library constraint: ${refs.join(', ')}`,
        );
      }
    }
    observations.push({ case_id: item.case_id, query: item.query, refs });
  }

  console.log(JSON.stringify({
    status: 'ok',
    fixture_id: corpus.fixture_id,
    built_artifact: true,
    hosted_zero_fixture: true,
    evaluated_cases: observations.length,
    observations,
  }, null, 2));
} finally {
  if (page) await page.close().catch(() => {});
  if (browser) await browser.close().catch(() => {});
  server.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => server.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]);
  if (server.exitCode === null) server.kill('SIGKILL');
}
