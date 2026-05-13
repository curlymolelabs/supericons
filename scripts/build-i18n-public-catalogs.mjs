import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SUPPORTED_LOCALES } from '../lib/i18n/locales.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const sourceDir = path.join(rootDir, 'data/i18n/messages');
const outputDirs = [
  path.join(rootDir, 'public/i18n/messages'),
  path.join(rootDir, 'mcp/public/i18n/messages'),
];

for (const outputDir of outputDirs) {
  await fs.mkdir(outputDir, { recursive: true });
}

for (const locale of SUPPORTED_LOCALES) {
  const raw = await fs.readFile(path.join(sourceDir, `${locale}.json`), 'utf8');
  JSON.parse(raw);

  for (const outputDir of outputDirs) {
    await fs.writeFile(path.join(outputDir, `${locale}.json`), raw.endsWith('\n') ? raw : `${raw}\n`, 'utf8');
  }
}

console.log(`build-i18n-public-catalogs: copied ${SUPPORTED_LOCALES.length} locales`);
