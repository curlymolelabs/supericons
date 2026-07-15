import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const bundlePath = join(rootDir, 'mcp', 'material-mcp-assets.json.gz');
const manifestPath = join(rootDir, 'mcp', 'material-mcp-assets-manifest.json');
const validationPath = join(rootDir, 'references', 'verification', 'material-full-asset-validation-2026-07-14.json');

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

const compressed = readFileSync(bundlePath);
const serialized = gunzipSync(compressed);
const bundle = JSON.parse(serialized.toString('utf8'));
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const validation = JSON.parse(readFileSync(validationPath, 'utf8'));

assert.equal(manifest.bundle_sha256, sha256(compressed));
assert.equal(manifest.uncompressed_sha256, sha256(serialized));
assert.equal(bundle.source_revision, validation.source_revision);
assert.equal(manifest.source_revision, validation.source_revision);
assert.equal(bundle.asset_count, 8524);
assert.equal(manifest.asset_count, 8524);
assert.equal(manifest.icon_count, 4262);
assert.equal(manifest.outline_count, 4262);
assert.equal(manifest.solid_count, 4262);
assert.equal(Object.keys(bundle.assets).length, 8524);

for (const asset of validation.assets) {
  const iconId = String(asset.icon_id).replace(/^material:/, '');
  const svg = bundle.assets[`${asset.variant}:${iconId}`];
  assert.ok(svg?.startsWith('<svg'), `missing ${asset.icon_id}:${asset.variant}`);
  assert.equal(sha256(svg), asset.checksum, `checksum mismatch for ${asset.icon_id}:${asset.variant}`);
}

const mcpPackage = JSON.parse(readFileSync(join(rootDir, 'mcp', 'package.json'), 'utf8'));
assert.ok(!mcpPackage.files.includes('material-mcp-assets.json.gz'), 'Railway-only bundle leaked into npm package');
const dockerignore = readFileSync(join(rootDir, '.dockerignore'), 'utf8');
assert.ok(!/(^|\n)\*\.gz(\n|$)/.test(dockerignore), 'Docker context excludes the Material bundle');

console.log(JSON.stringify({
  status: 'ok',
  source_revision: manifest.source_revision,
  icon_count: manifest.icon_count,
  outline_count: manifest.outline_count,
  solid_count: manifest.solid_count,
  asset_count: manifest.asset_count,
  compressed_bytes: manifest.compressed_bytes,
  bundle_sha256: manifest.bundle_sha256,
}));
