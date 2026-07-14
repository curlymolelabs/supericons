import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildLibraryCapability,
  countIconsByLibrary,
} from '../mcp/library-capabilities.js';
import { MATERIAL_EXPORT_SOURCE } from '../mcp/material-export.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const mcpDir = join(rootDir, 'mcp');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

const outlineIndex = readJson(join(mcpDir, 'public', 'icon-index.json'));
const solidIndex = readJson(join(mcpDir, 'public', 'icon-index-solid.json'));
const manifest = readJson(join(mcpDir, 'public', 'material-export-manifest.json'));
const supabaseConfig = readFileSync(join(rootDir, 'supabase', 'config.toml'), 'utf8');
const fullValidation = readJson(join(
  rootDir,
  'references',
  'verification',
  'material-full-asset-validation-2026-07-14.json',
));
const outlineCounts = countIconsByLibrary(outlineIndex.icons);
const solidCounts = countIconsByLibrary(solidIndex.icons);

const localMaterial = buildLibraryCapability('material', {
  outlineCounts,
  solidCounts,
  materialUsesOutlineForSolid: true,
});
assert.deepEqual(localMaterial, {
  count: 4262,
  outlineCount: 4262,
  solidCount: 4262,
  supportedStyles: ['outline', 'solid'],
});

const hostedMaterial = buildLibraryCapability('material', {
  outlineCounts,
  materialUsesOutlineForSolid: true,
});
assert.deepEqual(hostedMaterial, localMaterial);

const hostedLucide = buildLibraryCapability('lucide', {
  outlineCounts,
  materialUsesOutlineForSolid: true,
});
assert.deepEqual(hostedLucide.supportedStyles, ['outline']);
assert.equal(hostedLucide.solidCount, 0);

assert.equal(manifest.upstream.ref, MATERIAL_EXPORT_SOURCE.ref);
assert.equal(manifest.storage.functionBaseUrl.includes('serve-material-snapshot'), true);
assert.match(
  supabaseConfig,
  /\[functions\.mcp-search\]\s*verify_jwt\s*=\s*false/,
  'the stable public MCP search function must not require a Supabase JWT',
);
assert.match(
  supabaseConfig,
  /\[functions\.serve-material-snapshot\]\s*verify_jwt\s*=\s*false/,
  'the public Material snapshot function must not require a Supabase JWT',
);
assert.equal(manifest.storage.entryCount, 0);
assert.deepEqual(manifest.entries, {});
assert.equal(fullValidation.source_revision, MATERIAL_EXPORT_SOURCE.ref);
assert.equal(fullValidation.requested_assets, 8524);
assert.equal(fullValidation.successful_assets, 8524);
assert.equal(fullValidation.failed_assets, 0);
assert.equal(fullValidation.exception_rate, 0);

const npmCommand = process.platform === 'win32' ? process.env.ComSpec : 'npm';
const npmArgs = process.platform === 'win32'
  ? ['/d', '/s', '/c', 'npm pack --dry-run --json']
  : ['pack', '--dry-run', '--json'];
const packOutput = execFileSync(npmCommand, npmArgs, {
  cwd: mcpDir,
  encoding: 'utf8',
  maxBuffer: 10 * 1024 * 1024,
});
const pack = JSON.parse(packOutput)[0];
const packedFiles = new Map(pack.files.map((file) => [file.path, file.size]));
for (const requiredPath of [
  'library-capabilities.js',
  'public/icon-index.json',
  'public/icon-index-solid.json',
  'public/material-export-manifest.json',
]) {
  assert.ok(packedFiles.get(requiredPath) > 0, `Packed MCP is missing ${requiredPath}`);
}

console.log(JSON.stringify({
  status: 'ok',
  material_ids: localMaterial.count,
  material_styles: localMaterial.supportedStyles,
  hosted_non_material_solid_advertising: false,
  required_package_files: 4,
  packaged_local_cache_entries: 0,
  packed_size_bytes: pack.size,
  packed_uncompressed_size_bytes: pack.unpackedSize,
  source_revision: MATERIAL_EXPORT_SOURCE.ref,
  full_asset_validation: `${fullValidation.successful_assets}/${fullValidation.requested_assets}`,
}, null, 2));
