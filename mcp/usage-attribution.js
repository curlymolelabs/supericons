import { isIP } from 'node:net';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { Reader } from 'maxmind';

const require = createRequire(import.meta.url);
const geoLitePackageDirectory = dirname(require.resolve('@ip-location-db/geolite2-country-mmdb/package.json'));
const geoLiteCountryReader = new Reader(readFileSync(join(geoLitePackageDirectory, 'geolite2-country.mmdb')));

function clean(value) {
  const text = String(value ?? '').trim();
  return text || null;
}

function normalizeCountryCode(value) {
  const code = String(value || '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) && !['XX', 'ZZ'].includes(code) ? code : null;
}

function normalizeIpAddress(value) {
  let token = String(value || '').trim();
  if (!token || token.toLowerCase() === 'unknown') return null;
  token = token.split(',')[0].trim().replace(/^"|"$/g, '');
  const forwarded = token.match(/^for="?([^";,]+)"?/i);
  if (forwarded) token = forwarded[1];
  const bracketed = token.match(/^\[([^\]]+)](?::\d+)?$/);
  if (bracketed) token = bracketed[1];
  if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(token)) {
    token = token.slice(0, token.lastIndexOf(':'));
  }
  token = token.replace(/%.+$/, '');
  if (/^::ffff:/i.test(token)) token = token.slice(7);
  return isIP(token) > 0 ? token : null;
}

function isPublicIpv4(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b, c] = parts;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 192 && b === 0 && c === 0) return false;
  if (a === 192 && b === 0 && c === 2) return false;
  if (a === 198 && (b === 18 || b === 19)) return false;
  if (a === 198 && b === 51 && c === 100) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  return true;
}

function isPublicIpv6(ip) {
  const value = ip.toLowerCase();
  if (value === '::' || value === '::1') return false;
  if (/^(fc|fd)/.test(value)) return false;
  if (/^fe[89ab]/.test(value)) return false;
  if (/^ff/.test(value)) return false;
  if (/^fec/.test(value) || /^fed/.test(value) || /^fee/.test(value) || /^fef/.test(value)) return false;
  if (/^2001:db8(?::|$)/.test(value)) return false;
  if (/^3fff(?::|$)/.test(value)) return false;
  if (/^100:(?:0*:){0,3}/.test(value)) return false;
  return true;
}

export function getPublicClientIp(value) {
  const ip = normalizeIpAddress(value);
  if (!ip) return null;
  const version = isIP(ip);
  if (version === 4) return isPublicIpv4(ip) ? ip : null;
  if (version === 6) return isPublicIpv6(ip) ? ip : null;
  return null;
}

export function lookupRailwayCountry(value, lookup = (ip) => geoLiteCountryReader.get(ip)) {
  const publicIp = getPublicClientIp(value);
  if (!publicIp) {
    return {
      country_code: null,
      geo_source: null,
      client_ip_public: false,
    };
  }
  let countryCode = null;
  try {
    const result = lookup(publicIp);
    countryCode = normalizeCountryCode(result?.country_code || result?.country?.isoCode || result?.country);
  } catch {
    countryCode = null;
  }
  return {
    country_code: countryCode,
    geo_source: countryCode ? 'railway_geoip' : null,
    client_ip_public: true,
  };
}

export function deriveMcpQueryOrigin(toolName) {
  const tool = String(toolName || '').trim().toLowerCase();
  if (tool === 'search_icons' || tool === 'recommend_icons') return 'agent_query';
  if (tool === 'get_icon') return 'icon_lookup';
  return 'legacy_unknown';
}

export function getMcpRequestedLimit(toolName, args = {}) {
  const tool = String(toolName || '').trim().toLowerCase();
  if (tool === 'search_icons') {
    const limit = Number(args.limit);
    return Number.isInteger(limit) && limit > 0 ? limit : 10;
  }
  if (tool === 'recommend_icons') {
    return Array.isArray(args.slots) && args.slots.length > 0 ? args.slots.length : null;
  }
  if (tool === 'get_icon') return 1;
  return null;
}

export function resolveCountryContext({ clientIp, headerCandidates = [] } = {}) {
  const publicIp = getPublicClientIp(clientIp);
  if (!publicIp) {
    return {
      country_code: null,
      geo_source: null,
      client_ip_public: false,
    };
  }
  for (const [name, value] of headerCandidates) {
    const countryCode = normalizeCountryCode(value);
    if (countryCode) {
      return {
        country_code: countryCode,
        geo_source: clean(name),
        client_ip_public: true,
      };
    }
  }
  return lookupRailwayCountry(publicIp);
}
