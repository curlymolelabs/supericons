import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  getIconPreviewCommerceProfile,
  listIconPreviewCommerceProfileIds,
} from '../lib/icon-preview-commerce.js';

const previewCommerceStrings = [
  'Build real apps',
  'sponsored noopener noreferrer',
];
const publicJsonFiles = [
  'public/icon-index.json',
  'public/icon-index-solid.json',
  'data/si-registry/source/libraries/supericons.json',
];
const portableAssetFiles = [
  'data/supericons/icon-library/agentic-ai-tools-logos-001/base44.svg',
];

const profileIds = listIconPreviewCommerceProfileIds();
assert.deepEqual(profileIds, ['si:base44'], 'commerce preview pilot should only target the Base44 logo');

const base44Profile = getIconPreviewCommerceProfile('si:base44');
assert.equal(base44Profile?.ctaLabel, 'Build real apps');
assert.equal(base44Profile?.url, 'https://base44.com/');
assert.match(base44Profile?.rel || '', /\bsponsored\b/, 'preview CTA should mark monetized links as sponsored');

for (const filePath of publicJsonFiles) {
  const contents = await readFile(filePath, 'utf8');
  for (const value of previewCommerceStrings) {
    assert.equal(
      contents.includes(value),
      false,
      `${filePath} should not contain preview commerce config value ${value}`
    );
  }
}

const iconIndex = JSON.parse(await readFile('public/icon-index.json', 'utf8'));
const base44Icon = (iconIndex.icons || []).find((icon) => icon.lib === 'si' && icon.id === 'base44');
assert.equal(base44Icon?.sourceUrl, 'https://base44.com/', 'Base44 official source URL should remain in public metadata');

for (const filePath of portableAssetFiles) {
  const contents = await readFile(filePath, 'utf8');
  assert.equal(
    contents.includes(base44Profile.url),
    false,
    `${filePath} should not embed the preview commerce URL`
  );
}

console.log('verify-icon-preview-commerce: ok');
