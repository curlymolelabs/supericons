import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  MOTION_LAB_PRESET_GROUPS,
  MOTION_LAB_PRESET_IDS,
} from '../lib/motion-lab-presets.js';

const storePath = fileURLToPath(new URL('../store.js', import.meta.url));
const storeSource = readFileSync(storePath, 'utf8');

const groupRegex = /<div class="ml__quad ml__quad--[^"]+"[^>]*data-quad="([^"]+)"[\s\S]*?<span class="ml__quad-label">([^<]+)<\/span>[\s\S]*?<div class="ml__quad-btns"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g;
const buttonRegex = /<button class="ml__preset-btn" data-preset="([^"]+)">[\s\S]*?<span class="material-symbols-outlined"[^>]*>([^<]+)<\/span>\s*([^<\n]+)\s*<\/button>/g;

function parseBrowserGroups(source) {
  const groups = [];
  let groupMatch;
  while ((groupMatch = groupRegex.exec(source))) {
    const [, key, label, body] = groupMatch;
    const items = [];
    let buttonMatch;
    while ((buttonMatch = buttonRegex.exec(body))) {
      items.push({
        preset: buttonMatch[1],
        icon: buttonMatch[2].trim(),
        label: buttonMatch[3].trim(),
      });
    }
    groups.push({ key, label: label.trim(), items });
  }
  return groups;
}

function fail(message) {
  console.error(`Motion Lab preset parity check failed: ${message}`);
  process.exitCode = 1;
}

const browserGroups = parseBrowserGroups(storeSource);
const sharedGroups = MOTION_LAB_PRESET_GROUPS;

if (browserGroups.length !== sharedGroups.length) {
  fail(`expected ${sharedGroups.length} browser groups, found ${browserGroups.length}`);
}

for (let index = 0; index < Math.max(browserGroups.length, sharedGroups.length); index += 1) {
  const browserGroup = browserGroups[index];
  const sharedGroup = sharedGroups[index];
  if (!browserGroup || !sharedGroup) continue;

  if (browserGroup.key !== sharedGroup.key || browserGroup.label !== sharedGroup.label) {
    fail(`group mismatch at position ${index}: browser=${browserGroup?.key}/${browserGroup?.label}, shared=${sharedGroup?.key}/${sharedGroup?.label}`);
    continue;
  }

  const browserPresets = browserGroup.items.map((item) => item.preset);
  const sharedPresets = sharedGroup.items.map((item) => item.preset);
  if (browserPresets.join('|') !== sharedPresets.join('|')) {
    fail(`preset ordering mismatch in group "${sharedGroup.label}"`);
  }
}

const browserPresetIds = browserGroups.flatMap((group) => group.items.map((item) => item.preset));
const uniqueBrowserPresetIds = new Set(browserPresetIds);
if (uniqueBrowserPresetIds.size !== browserPresetIds.length) {
  fail('duplicate preset ids found in browser Motion Lab buttons');
}

const uniqueSharedPresetIds = new Set(MOTION_LAB_PRESET_IDS);
if (uniqueSharedPresetIds.size !== MOTION_LAB_PRESET_IDS.length) {
  fail('duplicate preset ids found in shared Motion Lab preset source');
}

if (browserPresetIds.join('|') !== MOTION_LAB_PRESET_IDS.join('|')) {
  fail('browser preset ids do not match shared preset ids exactly');
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log(`Motion Lab preset parity verified: ${MOTION_LAB_PRESET_IDS.length} presets across ${sharedGroups.length} groups.`);
