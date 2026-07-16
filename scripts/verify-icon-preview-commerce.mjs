import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  getIconPreviewCommerceProfile,
  listIconPreviewCommerceProfileIds,
} from '../lib/icon-preview-commerce.js';

const previewCommerceStrings = [
  'base44.pxf.io/c/7419860/2049275/25619?trafcat=base',
  'railway.com?referralCode=H0klSF',
  'sponsored noopener noreferrer',
];
const publicJsonFiles = [
  'public/icon-index.json',
  'public/icon-index-solid.json',
  'data/si-registry/source/libraries/supericons.json',
  'data/si-registry/source/libraries/simpleicons.json',
];
const portableAssetFiles = [
  'data/supericons/icon-library/agentic-ai-tools-logos-001/base44.svg',
];
const mcpSourceFiles = [
  'mcp/index.js',
  'mcp/search.js',
  'mcp/recommend-icons.js',
  'mcp/remote-server.js',
];

const profileIds = listIconPreviewCommerceProfileIds();
assert.deepEqual(
  profileIds,
  ['si:base44', 'simpleicons:railway'],
  'commerce preview profiles should only target approved brand logos'
);

const base44Profile = getIconPreviewCommerceProfile('si:base44');
assert.equal(base44Profile?.ctaLabel, 'Build with Base44');
assert.equal(base44Profile?.url, 'https://base44.pxf.io/c/7419860/2049275/25619?trafcat=base');
assert.match(base44Profile?.rel || '', /\bsponsored\b/, 'preview CTA should mark monetized links as sponsored');

const railwayProfile = getIconPreviewCommerceProfile('simpleicons:railway');
assert.equal(railwayProfile?.ctaLabel, 'Deploy with Railway');
assert.equal(railwayProfile?.url, 'https://railway.com?referralCode=H0klSF');
assert.match(railwayProfile?.rel || '', /\bsponsored\b/, 'Railway CTA should mark the referral link as sponsored');

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
const railwayIcon = (iconIndex.icons || []).find((icon) => icon.lib === 'simpleicons' && icon.id === 'railway');
assert.ok(railwayIcon, 'Simple Icons Railway logo should exist in the public icon index');

for (const filePath of portableAssetFiles) {
  const contents = await readFile(filePath, 'utf8');
  assert.equal(
    contents.includes(base44Profile.url),
    false,
    `${filePath} should not embed the preview commerce URL`
  );
}

for (const filePath of mcpSourceFiles) {
  const contents = await readFile(filePath, 'utf8');
  for (const profile of [base44Profile, railwayProfile]) {
    assert.equal(
      contents.includes(profile.url),
      false,
      `${filePath} must not contain web-only partner links`
    );
    assert.equal(
      contents.includes(profile.ctaLabel),
      false,
      `${filePath} must not contain web-only partner CTA copy`
    );
  }
}

console.log('verify-icon-preview-commerce: ok');
