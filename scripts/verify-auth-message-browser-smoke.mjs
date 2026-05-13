import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.SUPERICONS_LOCAL_URL || 'http://127.0.0.1:5173/';
const locales = ['en', 'zh-Hans', 'zh-Hant', 'ja', 'ko', 'es', 'de', 'pt', 'ar', 'hi', 'vi', 'th'];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 760 } });

async function openLocale(locale) {
  const url = new URL(baseUrl);
  url.searchParams.set('view', 'icons');
  url.searchParams.set('locale', locale);
  await page.addInitScript(() => localStorage.setItem('si-hero-dismissed', '1'));
  await page.goto(url.toString(), { waitUntil: 'networkidle' });
  await page.waitForSelector('#authSignInBtn', { state: 'visible' });
}

function assertMessageLike(label, message, action) {
  assert.ok(message, `${label}: message is empty`);
  assert.notEqual(message, action, `${label}: message equals action label`);
  assert.ok(Array.from(message).length >= 12, `${label}: message is too short: ${message}`);
}

async function openPricingLocale(locale) {
  const pricingUrl = new URL(baseUrl);
  pricingUrl.searchParams.set('view', 'pricing');
  pricingUrl.searchParams.set('locale', locale);
  await page.addInitScript(() => localStorage.setItem('si-hero-dismissed', '1'));
  await page.goto(pricingUrl.toString(), { waitUntil: 'networkidle' });
}

async function assertPricingAuthContext({ locale, buttonSelector, label }) {
  await openPricingLocale(locale);
  await page.locator(buttonSelector).click();
  const modal = await page.evaluate(() => ({
    title: document.querySelector('#authModalTitle')?.textContent?.trim() || '',
    desc: document.querySelector('#authModalDesc')?.textContent?.trim() || '',
    note: document.querySelector('#authModalNote')?.textContent?.trim() || '',
    submit: document.querySelector('#authSubmitText')?.textContent?.trim() || ''
  }));

  assert.ok(modal.title, `${locale}: ${label} auth title is empty`);
  assert.notEqual(modal.title, modal.submit, `${locale}: ${label} auth title equals action label`);
  assertMessageLike(`${locale}: ${label} auth description`, modal.desc, modal.submit);
  assertMessageLike(`${locale}: ${label} auth note`, modal.note, modal.submit);
  await page.locator('#authClose').click();
  console.log(`[PASS] ${locale}: ${label} auth context is message-like`);
}

try {
  for (const locale of locales) {
    await openLocale(locale);
    await page.locator('#authSignInBtn').click();
    await page.locator('#authForgotBtn').click();
    const forgot = await page.evaluate(() => ({
      title: document.querySelector('#authModalTitle')?.textContent?.trim() || '',
      desc: document.querySelector('#authModalDesc')?.textContent?.trim() || '',
      note: document.querySelector('#authModalNote')?.textContent?.trim() || '',
      submit: document.querySelector('#authForgotSubmitBtn')?.textContent?.trim() || ''
    }));

    assert.ok(forgot.title, `${locale}: forgot-password title is empty`);
    assertMessageLike(`${locale}: forgot-password description`, forgot.desc, forgot.submit);
    assertMessageLike(`${locale}: forgot-password note`, forgot.note, forgot.submit);
    console.log(`[PASS] ${locale}: forgot password copy is message-like`);
  }

  for (const locale of locales) {
    await assertPricingAuthContext({
      locale,
      buttonSelector: '#pricingProBtn',
      label: 'subscribe'
    });
    await assertPricingAuthContext({
      locale,
      buttonSelector: '#pricingLaunchBtn',
      label: 'purchase'
    });
  }

  await openLocale('en');
  await page.locator('#authSignInBtn').click();
  await page.locator('#authEmail').fill('wrong-password-check@example.invalid');
  await page.locator('#authPassword').fill('incorrect-password');
  await page.locator('#authForm button[type="submit"]').click();
  await page.waitForFunction(() => {
    const text = document.querySelector('#authStatus')?.textContent?.trim() || '';
    return text && text !== 'Sign in';
  }, { timeout: 20000 });
  const status = (await page.locator('#authStatus').textContent()).trim();
  assert.notEqual(status, 'Sign in', 'wrong-password status must not be the sign-in action label');
  assert.ok(status.includes('email') || status.includes('password') || status.length > 30, `wrong-password status is not message-like: ${status}`);
  console.log('[PASS] en: wrong-password status is message-like');

  console.log('verify-auth-message-browser-smoke: ok');
} finally {
  await browser.close();
}
