import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(__dirname);
const mcpDir = join(repoRoot, 'mcp');
const expectedFiles = [
  'CHANGELOG.md',
  'auth.js',
  'converter.js',
  'generated/motion-lab-baseline.json',
  'index.js',
  'material-export.js',
  'motion-lab-client.js',
  'motion-lab.js',
  'package.json',
  'public/icon-index.json',
  'public/synonyms.json',
  'runtime/converter-workflow.js',
  'runtime/public-metadata-sanitizer.js',
  'search.js',
  'workflow-access.js',
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

if (missing.length) {
  fail(`missing expected files: ${missing.join(', ')}`);
}

if (unexpected.length) {
  fail(`found unexpected files: ${unexpected.join(', ')}`);
}

console.log(`Supericons MCP package verified: ${packedPaths.length} files.`);
