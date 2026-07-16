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
import {
  BETA_HOSTED_SEARCH_FUNCTION,
  STABLE_HOSTED_SEARCH_FUNCTION,
  getHostedSearchFunctionNameForTool,
} from '../mcp/release-channel.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const mcpDir = join(rootDir, 'mcp');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

const outlineIndex = readJson(join(mcpDir, 'public', 'icon-index.json'));
const solidIndex = readJson(join(mcpDir, 'public', 'icon-index-solid.json'));
const manifest = readJson(join(mcpDir, 'public', 'material-export-manifest.json'));
const packageJson = readJson(join(mcpDir, 'package.json'));
const packageLock = readJson(join(mcpDir, 'package-lock.json'));
const supabaseConfig = readFileSync(join(rootDir, 'supabase', 'config.toml'), 'utf8');
const fullValidation = readJson(join(
  rootDir,
  'references',
  'verification',
  'material-full-asset-validation-2026-07-14.json',
));
const outlineCounts = countIconsByLibrary(outlineIndex.icons);
const solidCounts = countIconsByLibrary(solidIndex.icons);

assert.equal(packageJson.version, '0.4.19-beta.0');
assert.equal(packageLock.version, packageJson.version);
assert.equal(packageLock.packages[''].version, packageJson.version);
assert.equal(
  getHostedSearchFunctionNameForTool(packageJson.version, 'search_icons'),
  BETA_HOSTED_SEARCH_FUNCTION,
  'search_icons must use the isolated beta search function',
);
for (const toolName of ['recommend_icons', 'get_icon', 'preview_icons']) {
  assert.equal(
    getHostedSearchFunctionNameForTool(packageJson.version, toolName),
    STABLE_HOSTED_SEARCH_FUNCTION,
    `${toolName} must use the stable hosted search function`,
  );
}

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
  package_version: packageJson.version,
  material_tool_route: BETA_HOSTED_SEARCH_FUNCTION,
  required_package_files: 4,
  packaged_local_cache_entries: 0,
  packed_size_bytes: pack.size,
  packed_uncompressed_size_bytes: pack.unpackedSize,
  source_revision: MATERIAL_EXPORT_SOURCE.ref,
  full_asset_validation: `${fullValidation.successful_assets}/${fullValidation.requested_assets}`,
}, null, 2));
