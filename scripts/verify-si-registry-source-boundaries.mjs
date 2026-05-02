import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const registryRoot = path.join(repoRoot, 'data/si-registry');
const manifestPath = path.join(registryRoot, 'registry-manifest.json');

const BLOCKED_PREFIXES = [
  'automation/',
  'manual-redo/',
  'generated/',
  'public/',
  'mcp/',
];

const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));

assert.ok(Array.isArray(manifest.recordGroups), 'registry manifest recordGroups must be an array');

for (const recordGroup of manifest.recordGroups) {
  assert.equal(typeof recordGroup.path, 'string', `record group ${recordGroup.id} must have a path`);
  assert.equal(
    recordGroup.path.startsWith('source/'),
    true,
    `record group ${recordGroup.id} must point into data/si-registry/source/`
  );

  for (const blockedPrefix of BLOCKED_PREFIXES) {
    assert.equal(
      recordGroup.path.startsWith(blockedPrefix),
      false,
      `record group ${recordGroup.id} must not point into ${blockedPrefix}`
    );
  }

  const absolutePath = path.join(registryRoot, recordGroup.path);
  const records = JSON.parse(await fs.readFile(absolutePath, 'utf8'));
  assert.equal(Array.isArray(records), true, `record group ${recordGroup.id} must be a JSON array`);
}

console.log('verify-si-registry-source-boundaries: ok');
