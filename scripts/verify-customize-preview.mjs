import assert from 'node:assert/strict';

import { chromium } from 'playwright';
const baseUrl = process.env.SI_BASE_URL || 'http://127.0.0.1:4173/';
const targetHex = '#f97a75';
const targetRgb = 'rgb(249, 122, 117)';

async function collectPreviewState(page) {
  return await page.evaluate(() => {
    const preview = document.querySelector('.panel__preview-icon');
    const svg = preview?.querySelector('svg');
    const panel = document.querySelector('.panel__preview');
    const visibleCells = Array.from(document.querySelectorAll('.icon-grid .icon-cell')).filter(
      (cell) => cell.getClientRects().length > 0
    );
    const unselectedCell = visibleCells.find((cell) => !cell.classList.contains('selected')) || null;
    const surfaceProbe = document.createElement('div');
    surfaceProbe.style.backgroundColor = 'var(--si-icon-grid-surface)';
    surfaceProbe.style.position = 'absolute';
    surfaceProbe.style.pointerEvents = 'none';
    surfaceProbe.style.opacity = '0';
    document.body.appendChild(surfaceProbe);
    const sharedSurfaceColor = getComputedStyle(surfaceProbe).backgroundColor;
    surfaceProbe.remove();

    return {
      bodyClass: document.body.className,
      previewColor: preview ? getComputedStyle(preview).color : null,
      svgColor: svg ? getComputedStyle(svg).color : null,
      panelBackgroundColor: panel ? getComputedStyle(panel).backgroundColor : null,
      panelBackgroundImage: panel ? getComputedStyle(panel).backgroundImage : null,
      unselectedCellBackgroundColor: unselectedCell ? getComputedStyle(unselectedCell).backgroundColor : null,
      sharedSurfaceColor,
      colorHex: document.querySelector('#colorHex')?.value || null,
    };
  });
}

let browser;

try {
  let serverReady = false;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const resp = await fetch(baseUrl);
      if (resp.ok) {
        serverReady = true;
        break;
      }
    } catch {
      // Keep polling until the local app is reachable.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  assert.equal(
    serverReady,
    true,
    `verify-customize-preview could not reach ${baseUrl}. Start the local app first, for example with "npm run dev -- --host 127.0.0.1 --port 4173".`
  );

  browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.getByRole('textbox', { name: 'Search icons' }).waitFor({ state: 'visible' });
  await page.getByRole('textbox', { name: 'Search icons' }).fill('claude');
  await page.locator('[data-icon-id="claude"][data-icon-lib="simpleicons"]').click();
  await page.locator('#colorHex').fill(targetHex);

  await page.waitForFunction(
    (expected) => document.querySelector('#colorHex')?.value === expected,
    targetHex
  );

  const darkState = await collectPreviewState(page);
  assert.equal(darkState.colorHex, targetHex, 'dark mode should keep the selected hex in the customize field');
  assert.equal(darkState.previewColor, targetRgb, 'dark mode wrapper should use the selected customize color');
  assert.equal(darkState.svgColor, targetRgb, 'dark mode preview svg should use the selected customize color');
  assert.equal(
    darkState.panelBackgroundColor,
    darkState.sharedSurfaceColor,
    'dark mode preview background should use the shared icon grid surface color'
  );
  assert.equal(
    darkState.unselectedCellBackgroundColor,
    darkState.sharedSurfaceColor,
    'dark mode icon grid cells should use the shared icon grid surface color'
  );

  await page.getByRole('button', { name: 'Light Mode' }).click();
  await page.waitForFunction(() => document.body.classList.contains('theme-light'));
  await page.waitForTimeout(400);

  const lightState = await collectPreviewState(page);
  assert.equal(lightState.colorHex, targetHex, 'light mode should keep the selected hex in the customize field');
  assert.equal(lightState.previewColor, targetRgb, 'light mode wrapper should keep the selected customize color');
  assert.equal(lightState.svgColor, targetRgb, 'light mode preview svg should keep the selected customize color');
  assert.equal(
    lightState.panelBackgroundImage,
    'none',
    'light mode preview should not use a custom gradient background'
  );
  assert.equal(
    lightState.panelBackgroundColor,
    lightState.sharedSurfaceColor,
    'light mode preview background should use the shared icon grid surface color'
  );
  assert.equal(
    lightState.unselectedCellBackgroundColor,
    lightState.sharedSurfaceColor,
    'light mode icon grid cells should use the shared icon grid surface color'
  );

  console.log('verify-customize-preview: ok');
} finally {
  await browser?.close();
}
