import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const tempDir = mkdtempSync(join(tmpdir(), 'supericons-railway-runtime-'));
const tempMcpDir = join(tempDir, 'mcp');

function runNpm(args, cwd) {
  if (process.platform === 'win32') {
    return execFileSync(
      process.env.ComSpec,
      ['/d', '/s', '/c', `npm ${args.join(' ')}`],
      { cwd, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
    );
  }
  return execFileSync('npm', args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });
}

try {
  copyFileSync(join(rootDir, 'package.json'), join(tempDir, 'package.json'));
  copyFileSync(join(rootDir, 'package-lock.json'), join(tempDir, 'package-lock.json'));
  mkdirSync(tempMcpDir, { recursive: true });
  copyFileSync(
    join(rootDir, 'mcp', 'usage-attribution.js'),
    join(tempMcpDir, 'usage-attribution.js'),
  );

  runNpm([
    'ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund',
  ], tempDir);

  const maxmindPackage = JSON.parse(readFileSync(
    join(tempDir, 'node_modules', 'maxmind', 'package.json'),
    'utf8',
  ));
  const geoLitePackage = JSON.parse(readFileSync(
    join(tempDir, 'node_modules', '@ip-location-db', 'geolite2-country-mmdb', 'package.json'),
    'utf8',
  ));
  assert.equal(maxmindPackage.version, '5.0.6');
  assert.equal(geoLitePackage.version, '2.3.2026061719');

  const attribution = await import(pathToFileURL(join(tempMcpDir, 'usage-attribution.js')).href);
  assert.equal(attribution.getPublicClientIp('127.0.0.1'), null);
  assert.deepEqual(attribution.lookupRailwayCountry('8.8.8.8'), {
    country_code: 'US',
    geo_source: 'railway_geoip',
    client_ip_public: true,
  });

  console.log(JSON.stringify({
    status: 'ok',
    install_mode: 'root_production_dependencies',
    maxmind_version: maxmindPackage.version,
    geolite2_country_version: geoLitePackage.version,
    usage_attribution_imported: true,
    live_dataset_lookup: '8.8.8.8=US',
  }, null, 2));
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
