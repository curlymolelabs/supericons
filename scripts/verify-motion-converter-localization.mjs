import fs from 'node:fs';
import path from 'node:path';
import { SUPPORTED_LOCALES } from '../lib/i18n/locales.js';

const root = process.cwd();
const catalogDirs = ['data/i18n/messages', 'public/i18n/messages', 'mcp/public/i18n/messages'];
const requiredSections = ['motionLab', 'converter'];
const intentionalSharedValues = new Set([
  'converter.modes.svgToPng',
  'converter.modes.pngToSvg',
]);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function listLeaves(value, prefix = '') {
  if (!value || typeof value !== 'object') return [prefix];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => listLeaves(item, `${prefix}.${index}`));
  }
  return Object.entries(value).flatMap(([key, child]) => {
    const next = prefix ? `${prefix}.${key}` : key;
    return listLeaves(child, next);
  });
}

function readPath(value, dottedPath) {
  return dottedPath.split('.').reduce((cursor, part) => cursor?.[part], value);
}

function collectSectionLeaves(catalog) {
  return requiredSections.flatMap((section) => {
    if (!catalog[section]) return [section];
    return listLeaves(catalog[section], section);
  });
}

function isIntentionalSharedValue(leaf, value) {
  if (intentionalSharedValues.has(leaf)) return true;
  return /^(SVG|PNG|CSS|MCP|Pro|px)$/u.test(value);
}

function stableJson(value) {
  return JSON.stringify(value);
}

const failures = [];
const sourceEn = readJson(path.join(root, 'data/i18n/messages/en.json'));
const expectedLeaves = collectSectionLeaves(sourceEn);

for (const locale of SUPPORTED_LOCALES) {
  const catalogs = Object.fromEntries(catalogDirs.map((dir) => [
    dir,
    readJson(path.join(root, dir, `${locale}.json`)),
  ]));
  const dataCatalog = catalogs['data/i18n/messages'];

  for (const section of requiredSections) {
    for (const [dir, catalog] of Object.entries(catalogs)) {
      if (!catalog[section]) failures.push(`${locale}: missing ${dir} ${section}`);
      if (stableJson(dataCatalog[section]) !== stableJson(catalog[section])) {
        failures.push(`${locale}: ${section} differs between data and ${dir}`);
      }
    }
  }

  for (const leaf of expectedLeaves) {
    for (const [dir, catalog] of Object.entries(catalogs)) {
      const value = readPath(catalog, leaf);
      if (value === undefined) failures.push(`${locale}: missing ${dir} key ${leaf}`);
      if (typeof value === 'string' && value.trim() === '') {
        failures.push(`${locale}: empty ${dir} key ${leaf}`);
      }
      if (typeof value === 'string' && /[\uFFFD]/u.test(value)) {
        failures.push(`${locale}: replacement character in ${dir} key ${leaf}`);
      }
      const englishValue = readPath(sourceEn, leaf);
      if (
        locale !== 'en'
        && typeof value === 'string'
        && typeof englishValue === 'string'
        && value === englishValue
        && !isIntentionalSharedValue(leaf, value)
      ) {
        failures.push(`${locale}: English fallback in ${dir} key ${leaf}`);
      }
    }
  }
}

if (failures.length) {
  console.error('Motion Lab / Converter localization verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Motion Lab / Converter localization verified for ${SUPPORTED_LOCALES.length} locales and ${expectedLeaves.length} keys.`);
