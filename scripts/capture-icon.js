// capture-icon.js
// Playwright script: captures 90 frames of the agent-workflow animation at 60fps
// Requires: npm install -D playwright + npx playwright install chromium
// Usage: node supericons/scripts/capture-icon.js

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const harnessPath = path.resolve(__dirname, 'capture-harness.html');
const framesDir = path.resolve(__dirname, 'tmp-frames');

// Settings
const FPS = 60;
const DURATION_MS = 3000;
const TOTAL_FRAMES = Math.ceil((FPS * DURATION_MS) / 1000); // 90 frames
const FRAME_INTERVAL_MS = 1000 / FPS;

if (!existsSync(framesDir)) {
  mkdirSync(framesDir, { recursive: true });
}

console.log(`Launching Chromium...`);
const browser = await chromium.launch();
const page = await browser.newPage();

// Capture at 2x (56px) for supersampling quality, ffmpeg scales to 28px output
await page.setViewportSize({ width: 56, height: 56 });

// Load the harness as a local file
await page.goto(`file://${harnessPath}`);
await page.waitForFunction(() => window.captureReady === true);

console.log(`Triggering animation...`);
// Add 'hovered' class to start the CSS animation
await page.evaluate(() => {
  document.getElementById('cell').classList.add('hovered');
});

console.log(`Capturing ${TOTAL_FRAMES} frames at ${FPS}fps...`);
for (let i = 0; i < TOTAL_FRAMES; i++) {
  const frameNum = String(i).padStart(3, '0');
  const framePath = path.join(framesDir, `frame-${frameNum}.png`);
  await page.screenshot({ path: framePath, clip: { x: 0, y: 0, width: 56, height: 56 } });

  // Wait one frame interval before next capture
  await new Promise(r => setTimeout(r, FRAME_INTERVAL_MS));
}

await browser.close();
console.log(`Done. ${TOTAL_FRAMES} frames saved to ${framesDir}`);
console.log(`\nNext step - run ffmpeg encode:`);
console.log(`  node supericons/scripts/encode-mp4.js`);
