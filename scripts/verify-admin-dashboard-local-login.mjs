import { createServer } from 'node:http';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { startAdminDashboardPhaseBLiveServer } from './serve-admin-dashboard-phase-b-live.mjs';

function ok(condition, message) {
  if (!condition) throw new Error(message);
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(payload));
}

let acceptedSecret = 'temporary-secret-one';
let authChecks = 0;
let protectedRequests = 0;

const upstream = createServer((request, response) => {
  const url = new URL(request.url || '/', 'http://127.0.0.1');
  const isAuthCheck = url.pathname.endsWith('/_local-auth-check');
  if (isAuthCheck) authChecks += 1;
  const allowed = request.headers['x-admin-secret'] === acceptedSecret;
  if (!allowed) {
    sendJson(response, 403, { error: 'Forbidden' });
    return;
  }

  if (isAuthCheck) {
    sendJson(response, 404, { error: 'Not found' });
    return;
  }

  protectedRequests += 1;
  sendJson(response, 200, {});
});

await listen(upstream);
const upstreamAddress = upstream.address();
const adminApiUrl = `http://127.0.0.1:${upstreamAddress.port}/functions/v1/admin-api`;

let dashboard;
let browser;

try {
  dashboard = await startAdminDashboardPhaseBLiveServer({
    adminApiUrl,
    port: 0,
  });

  const htmlResponse = await fetch(dashboard.url);
  const html = await htmlResponse.text();
  ok(htmlResponse.ok, 'The local dashboard page did not load.');
  ok(html.includes('managedAuth:true'), 'The browser login runtime was not enabled.');
  ok(!html.includes(acceptedSecret), 'The dashboard page exposed the admin secret.');
  ok(!html.includes('requestBadge'), 'The ambiguous Searches badge is still present.');

  let response = await fetch(new URL('/api/admin/session', dashboard.url));
  let payload = await response.json();
  ok(response.ok && payload.authenticated === false, 'A new local server started authenticated.');

  const beforeDeniedProxy = protectedRequests;
  response = await fetch(new URL('/api/admin/v2/overview', dashboard.url));
  ok(response.status === 401, 'A protected request was allowed before sign-in.');
  ok(protectedRequests === beforeDeniedProxy, 'A request before sign-in reached the protected data route.');

  response = await fetch(new URL('/api/admin/session', dashboard.url), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://example.com',
    },
    body: JSON.stringify({ secret: acceptedSecret }),
  });
  ok(response.status === 403, 'A cross-site sign-in request was accepted.');

  response = await fetch(new URL('/api/admin/session', dashboard.url), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: 'wrong-secret' }),
  });
  payload = await response.json();
  ok(response.status === 403, 'An invalid admin secret was accepted.');
  ok(!JSON.stringify(payload).includes('wrong-secret'), 'A rejected secret was echoed in the response.');

  response = await fetch(new URL('/api/admin/session', dashboard.url));
  payload = await response.json();
  ok(payload.authenticated === false, 'A rejected secret created a local session.');

  response = await fetch(new URL('/api/admin/session', dashboard.url), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: acceptedSecret }),
  });
  payload = await response.json();
  ok(response.ok && payload.authenticated === true, 'A valid admin secret did not create a local session.');
  ok(!JSON.stringify(payload).includes(acceptedSecret), 'An accepted secret was echoed in the response.');

  response = await fetch(new URL('/api/admin/v2/overview', dashboard.url));
  ok(response.ok, 'A protected request failed after valid sign-in.');

  acceptedSecret = 'temporary-secret-two';
  response = await fetch(new URL('/api/admin/v2/overview', dashboard.url));
  ok(response.status === 403, 'A rotated secret did not invalidate the local session.');
  response = await fetch(new URL('/api/admin/session', dashboard.url));
  payload = await response.json();
  ok(payload.authenticated === false, 'The server retained a secret rejected after rotation.');

  await dashboard.close();
  dashboard = await startAdminDashboardPhaseBLiveServer({
    adminApiUrl,
    port: 0,
  });

  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
  await page.goto(dashboard.url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.activeElement?.id === 'adminSecretInput');
  ok(await page.locator('#adminSecretModal.open').count() === 1, 'The sign-in window did not open on first load.');
  await mkdir('.tmp', { recursive: true });
  await page.screenshot({ path: '.tmp/admin-dashboard-local-login.png', fullPage: true });

  await page.fill('#adminSecretInput', 'wrong-secret');
  await page.click('#adminSecretSubmitBtn');
  await page.waitForFunction(() => document.querySelector('#adminSecretError')?.textContent?.includes('rejected'));
  ok(await page.locator('#adminSecretModal.open').count() === 1, 'A rejected browser sign-in closed the sign-in window.');
  ok(await page.locator('#adminSecretInput').inputValue() === '', 'A rejected secret remained in the password field.');

  await page.fill('#adminSecretInput', acceptedSecret);
  await page.click('#adminSecretSubmitBtn');
  await page.waitForFunction(() => document.querySelector('#adminSecretModal')?.getAttribute('aria-hidden') === 'true');
  await page.waitForFunction(() => document.querySelector('#refreshButton')?.getAttribute('aria-busy') === 'false');
  ok(await page.locator('#adminSecretInput').inputValue() === '', 'An accepted secret remained in the password field.');
  ok(await page.evaluate((secret) => (
    [window.localStorage, window.sessionStorage].every((storage) => (
      Object.values(storage).every((value) => !String(value).includes(secret))
    ))
  ), acceptedSecret), 'The browser stored the accepted admin secret.');

  acceptedSecret = 'temporary-secret-three';
  await page.click('#refreshButton');
  await page.waitForFunction(() => document.querySelector('#adminSecretModal')?.classList.contains('open'));
  ok(
    (await page.locator('#adminSecretError').innerText()).includes('rejected'),
    'Secret rotation did not explain why sign-in was required again.',
  );
  await page.fill('#adminSecretInput', acceptedSecret);
  await page.click('#adminSecretSubmitBtn');
  await page.waitForFunction(() => document.querySelector('#adminSecretModal')?.getAttribute('aria-hidden') === 'true');

  ok(authChecks >= 5, 'The local server did not validate each candidate with the protected API.');
  ok(protectedRequests > 0, 'No authenticated browser request reached the protected API.');

  console.log(JSON.stringify({
    status: 'ok',
    allowed_path: true,
    denied_path: true,
    rotation_reprompt: true,
    browser_storage_secret: false,
    ambiguous_searches_badge: false,
    screenshot: '.tmp/admin-dashboard-local-login.png',
  }, null, 2));
} finally {
  if (browser) await browser.close();
  if (dashboard) await dashboard.close().catch(() => {});
  await close(upstream);
}
