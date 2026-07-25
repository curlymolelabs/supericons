import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  deriveMcpQueryOrigin,
  getMcpRequestedLimit,
  getPublicClientIp,
  lookupRailwayCountry,
  resolveCountryContext,
} from '../mcp/usage-attribution.js';

const mcpPackage = JSON.parse(readFileSync('mcp/package.json', 'utf8'));
const dependencyFreshness = JSON.parse(readFileSync('data/dependency-freshness.json', 'utf8'));
const remoteSource = readFileSync('mcp/remote-server.js', 'utf8');
const notices = readFileSync('THIRD_PARTY_NOTICES.md', 'utf8');

assert.equal(deriveMcpQueryOrigin('search_icons'), 'agent_query');
assert.equal(deriveMcpQueryOrigin('recommend_icons'), 'agent_query');
assert.equal(deriveMcpQueryOrigin('get_icon'), 'icon_lookup');
assert.equal(deriveMcpQueryOrigin('preview_icons'), 'legacy_unknown');

assert.equal(getMcpRequestedLimit('search_icons', {}), 10);
assert.equal(getMcpRequestedLimit('search_icons', { limit: 3 }), 3);
assert.equal(getMcpRequestedLimit('recommend_icons', { slots: ['header', 'footer'] }), 2);
assert.equal(getMcpRequestedLimit('get_icon', {}), 1);

assert.equal(getPublicClientIp('8.8.8.8'), '8.8.8.8');
assert.equal(getPublicClientIp('8.8.8.8:443'), '8.8.8.8');
assert.equal(getPublicClientIp('10.0.0.1'), null);
assert.equal(getPublicClientIp('100.64.0.1'), null);
assert.equal(getPublicClientIp('192.0.2.1'), null);
assert.equal(getPublicClientIp('198.51.100.1'), null);
assert.equal(getPublicClientIp('203.0.113.1'), null);
assert.equal(getPublicClientIp('127.0.0.1'), null);
assert.equal(getPublicClientIp('::1'), null);
assert.equal(getPublicClientIp('fc00::1'), null);
assert.equal(getPublicClientIp('2001:db8::1'), null);
assert.equal(getPublicClientIp('not-an-ip'), null);

const googleCountry = lookupRailwayCountry('8.8.8.8');
assert.equal(googleCountry.client_ip_public, true);
assert.equal(googleCountry.country_code, 'US');
assert.equal(googleCountry.geo_source, 'railway_geoip');

const headerCountry = resolveCountryContext({
  clientIp: '8.8.8.8',
  headerCandidates: [['cf-ipcountry', 'SG']],
});
assert.deepEqual(headerCountry, {
  country_code: 'SG',
  geo_source: 'cf-ipcountry',
  client_ip_public: true,
});

const privateHeader = resolveCountryContext({
  clientIp: '10.0.0.1',
  headerCandidates: [['cf-ipcountry', 'SG']],
});
assert.deepEqual(privateHeader, {
  country_code: null,
  geo_source: null,
  client_ip_public: false,
});

assert.equal(mcpPackage.dependencies.maxmind, '5.0.6');
assert.equal(mcpPackage.dependencies['@ip-location-db/geolite2-country-mmdb'], '2.3.2026061719');
assert.equal(mcpPackage.dependencies['geoip-country'], undefined);
assert.equal(mcpPackage.dependencies['@maxmind/geoip2-node'], undefined);
assert.ok(mcpPackage.files.includes('usage-attribution.js'));
assert.match(notices, /MaxMind database reader version `5\.0\.6`/);
assert.match(notices, /GeoLite2 Country data package version `2\.3\.2026061719`/);
assert.match(notices, /within 30 days/);

const versionDateMatch = mcpPackage.dependencies['@ip-location-db/geolite2-country-mmdb'].match(/(\d{8})\d{2}$/);
assert.ok(versionDateMatch, 'The pinned GeoIP package version must contain its dataset date.');
const versionDate = Date.parse(`${versionDateMatch[1].slice(0, 4)}-${versionDateMatch[1].slice(4, 6)}-${versionDateMatch[1].slice(6, 8)}T00:00:00Z`);
const ageDays = Math.floor((Date.now() - versionDate) / 86400000);
assert.ok(ageDays >= 0, 'The pinned GeoIP dataset date cannot be in the future.');
const geoLiteFreshness = dependencyFreshness.packages['@ip-location-db/geolite2-country-mmdb'];
assert.equal(geoLiteFreshness.installed_version, mcpPackage.dependencies['@ip-location-db/geolite2-country-mmdb']);
assert.equal(geoLiteFreshness.latest_version, mcpPackage.dependencies['@ip-location-db/geolite2-country-mmdb']);
assert.match(geoLiteFreshness.latest_integrity, /^sha512-[A-Za-z0-9+/]+=*$/);
const registryCheckAgeDays = Math.floor(
  (Date.now() - Date.parse(dependencyFreshness.checked_at)) / 86400000,
);
assert.ok(
  registryCheckAgeDays >= 0 && registryCheckAgeDays <= 7,
  `The GeoIP registry check is ${registryCheckAgeDays} days old.`,
);

for (const field of ['query_origin', 'requested_limit', 'client_ip_public']) {
  assert.match(remoteSource, new RegExp(`\\b${field}:`), `Hosted telemetry must write ${field}.`);
}
assert.match(remoteSource, /getCountryContext\(req, clientIp\)/);
assert.match(remoteSource, /deriveMcpQueryOrigin\(toolName\)/);
assert.match(remoteSource, /getMcpRequestedLimit\(toolName, args\)/);
assert.match(remoteSource, /const MCP_USAGE_WRITE_TIMEOUT_MS = 500;/);
const usageWrapperSource = remoteSource.match(
  /async function withMcpUsageEvent[\s\S]*?\nfunction createServer/,
)?.[0] || '';
assert.equal(
  (usageWrapperSource.match(/await logMcpUsageEvent\(/g) || []).length,
  2,
  'Hosted MCP success and error usage writes must finish before the tool response returns.',
);
assert.doesNotMatch(
  usageWrapperSource,
  /void logMcpUsageEvent\(/,
  'Hosted MCP top-level usage writes must not be fire and forget.',
);
assert.match(
  remoteSource,
  /signal: AbortSignal\.timeout\(MCP_USAGE_WRITE_TIMEOUT_MS\)/,
  'Hosted telemetry writes need a bounded timeout.',
);
assert.match(
  remoteSource,
  /async function logMcpUsageEvent[\s\S]*?catch \(error\)[\s\S]*?[\r\n]+}[\r\n]+[\r\n]+async function withMcpUsageEvent/,
  'Telemetry write failures must stay isolated from successful tool responses.',
);
assert.match(
  remoteSource,
  /usage ledger write failed:[\s\S]*?error\?\.name \|\| error\?\.code \|\| 'unknown_error'/,
  'Hosted telemetry failures must be visible without logging request data.',
);

console.log(JSON.stringify({
  status: 'ok',
  query_origin_cases: 4,
  requested_limit_cases: 4,
  public_ip_cases: 12,
  geoip_header_precedence: true,
  private_ip_country_rejected: true,
  live_dataset_lookup: '8.8.8.8=US',
  geoip_reader: mcpPackage.dependencies.maxmind,
  geoip_database: mcpPackage.dependencies['@ip-location-db/geolite2-country-mmdb'],
  dataset_age_days: ageDays,
  registry_latest_version: geoLiteFreshness.latest_version,
  registry_check_age_days: registryCheckAgeDays,
  telemetry_fields: ['query_origin', 'requested_limit', 'client_ip_public'],
  top_level_usage_write: 'awaited_with_500ms_timeout',
}, null, 2));
