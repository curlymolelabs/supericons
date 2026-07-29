import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [
  readme,
  telemetrySource,
  packageJsonSource,
  packageLockSource,
  serverJsonSource,
  productFactsSource,
] = await Promise.all([
  readFile('mcp/README.md', 'utf8'),
  readFile('mcp/telemetry.js', 'utf8'),
  readFile('mcp/package.json', 'utf8'),
  readFile('mcp/package-lock.json', 'utf8'),
  readFile('mcp/server.json', 'utf8'),
  readFile('data/product-facts.json', 'utf8'),
]);

const packageJson = JSON.parse(packageJsonSource);
const packageLock = JSON.parse(packageLockSource);
const serverJson = JSON.parse(serverJsonSource);
const productFacts = JSON.parse(productFactsSource);
const flags = [
  'SUPERICONS_DISABLE_TELEMETRY',
  'SUPERICONS_TELEMETRY',
  'SUPERICONS_MCP_TELEMETRY_ENABLED',
  'DO_NOT_TRACK',
];

for (const flag of flags) {
  assert.match(readme, new RegExp(flag));
  assert.match(telemetrySource, new RegExp(flag));
}

for (const statement of [
  'Supericons telemetry records do not store raw IP addresses',
  'platform logging policy',
  'server-keyed hash',
  'retained for up to 90 days',
  'does not block or change icon search',
  'Icon search keeps working when telemetry is disabled',
]) {
  assert.ok(readme.includes(statement), `Missing notice statement: ${statement}`);
}

assert.equal(packageJson.version, '0.4.25');
assert.equal(packageLock.version, packageJson.version);
assert.equal(packageLock.packages[''].version, packageJson.version);
assert.equal(packageJson.dependencies['@modelcontextprotocol/sdk'], '^1.30.0');
assert.equal(packageLock.packages['node_modules/@modelcontextprotocol/sdk'].version, '1.30.0');
assert.equal(packageLock.packages['node_modules/@hono/node-server'].version, '2.0.12');
assert.equal(serverJson.version, packageJson.version);
assert.equal(serverJson.packages[0].version, packageJson.version);
assert.equal(productFacts.mcpPackageVersion, packageJson.version);
assert.equal(
  JSON.parse(await readFile('mcp/public/product-facts.json', 'utf8')).mcpPackageVersion,
  packageJson.version,
);
assert.equal(packageJson.files.includes('README.md'), true);
assert.equal(packageJson.files.includes('local-telemetry-identity.js'), true);

console.log(JSON.stringify({
  status: 'passed',
  package_version: packageJson.version,
  opt_out_controls_documented: flags.length,
  privacy_boundaries_documented: true,
  release_surfaces_synchronized: true,
}, null, 2));
