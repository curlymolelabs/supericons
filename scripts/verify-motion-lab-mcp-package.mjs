import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(__dirname);
const mcpDir = join(repoRoot, 'mcp');
const expectedFiles = [
  'CHANGELOG.md',
  'LICENSE',
  'README.md',
  'THIRD_PARTY_LICENSES/bootstrap-icons-LICENSE.txt',
  'THIRD_PARTY_LICENSES/feather-LICENSE.txt',
  'THIRD_PARTY_LICENSES/heroicons-LICENSE.txt',
  'THIRD_PARTY_LICENSES/iconoir-LICENSE.txt',
  'THIRD_PARTY_LICENSES/ionicons-LICENSE.txt',
  'THIRD_PARTY_LICENSES/lucide-LICENSE.txt',
  'THIRD_PARTY_LICENSES/material-LICENSE.txt',
  'THIRD_PARTY_LICENSES/mingcute-LICENSE.txt',
  'THIRD_PARTY_LICENSES/phosphor-LICENSE.txt',
  'THIRD_PARTY_LICENSES/simple-icons-LICENSE.txt',
  'THIRD_PARTY_LICENSES/tabler-LICENSE.txt',
  'THIRD_PARTY_NOTICES.md',
  'THIRD_PARTY_PROVENANCE.json',
  'auth.js',
  'controlled-run-auth.js',
  'converter.js',
  'generated/mcp-output-locales.json',
  'generated/motion-lab-baseline.json',
  'hosted-candidate-hydration.js',
  'hosted-search-client.js',
  'hosted-search-resilience.js',
  'index.js',
  'library-capabilities.js',
  'local-telemetry-identity.js',
  'material-export.js',
  'material-hydration.js',
  'material-mcp-assets-manifest.json',
  'material-mcp-assets.json.gz',
  'mcp-output-localization.js',
  'motion-lab-client.js',
  'motion-lab.js',
  'package.json',
  'public/cjk-search-terms.json',
  'public/icon-index-solid.json',
  'public/icon-index.json',
  'public/material-export-manifest.json',
  'public/multilingual-search-aliases.json',
  'public/product-facts.json',
  'public/synonyms.json',
  'public-icon-preview.js',
  'preview-icons.js',
  'recommend-icons.js',
  'release-channel.js',
  'railway-local-search.js',
  'remote-server.js',
  'search-query-normalization.js',
  'search-tool-shell.js',
  'runtime/converter-workflow.js',
  'runtime/cjk-search-core.js',
  'runtime/generated-search-intent-graph.js',
  'runtime/generated-search-intent-rules.js',
  'runtime/generated-search-ranking-policy.js',
  'runtime/icon-semantic-aliases.js',
  'runtime/supericons-ai-taxonomy.js',
  'runtime/icon-taxonomy-seed.js',
  'runtime/public-metadata-sanitizer.js',
  'runtime/search-query-frame.js',
  'runtime/search-intent-core.js',
  'runtime/search-pipeline.js',
  'runtime/search-ranking-policy.js',
  'semantic-registry.js',
  'search.js',
  'server.json',
  'telemetry.js',
  'usage-dedupe.js',
  'usage-attribution.js',
  'variant-support.js',
  'workflow-access.js',
];

const blockedFiles = [
  'public/registry-records.json',
  'public/registry-summary.json',
];

function fail(message) {
  console.error(`Supericons MCP package check failed: ${message}`);
  process.exit(1);
}

let raw;
try {
  raw = execSync('npm pack --dry-run --json', {
    cwd: mcpDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  });
} catch (error) {
  const stderr = error.stderr?.toString?.().trim();
  fail(stderr || error.message);
}

let packInfo;
try {
  const parsed = JSON.parse(raw);
  packInfo = Array.isArray(parsed) ? parsed[0] : parsed;
} catch (error) {
  fail(`could not parse npm pack JSON output: ${error.message}`);
}

if (!packInfo || !Array.isArray(packInfo.files)) {
  fail('npm pack output did not include a file list.');
}

const packedPaths = packInfo.files.map((entry) => entry.path).sort();
const expectedPaths = [...expectedFiles].sort();

for (const path of packedPaths) {
  if (path.endsWith('.tgz')) {
    fail(`unexpected tarball nested in package: ${path}`);
  }
}

const missing = expectedPaths.filter((path) => !packedPaths.includes(path));
const unexpected = packedPaths.filter((path) => !expectedPaths.includes(path));
const blocked = packedPaths.filter((path) => blockedFiles.includes(path));

if (missing.length) {
  fail(`missing expected files: ${missing.join(', ')}`);
}

if (unexpected.length) {
  fail(`found unexpected files: ${unexpected.join(', ')}`);
}

if (blocked.length) {
  fail(`protected package includes bulk registry files: ${blocked.join(', ')}`);
}

if (Number(packInfo.size || 0) > 7_000_000) {
  fail(`protected package is too large: ${packInfo.size} bytes packed`);
}

if (Number(packInfo.unpackedSize || 0) > 27_000_000) {
  fail(`protected package is too large: ${packInfo.unpackedSize} bytes unpacked`);
}

console.log(`Supericons MCP package verified: ${packedPaths.length} files, ${packInfo.unpackedSize} bytes unpacked.`);
