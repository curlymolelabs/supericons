import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { buildAdminSearchQualityScorecard } from '../lib/admin-search-quality-scorecard.js';

function argument(name) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((value) => value.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : null;
}

const inputPath = argument('input');
if (!inputPath) {
  throw new Error('Use --input <path> with an Events JSON export from the admin dashboard.');
}

const parsed = JSON.parse(await readFile(resolve(inputPath), 'utf8'));
const scorecard = buildAdminSearchQualityScorecard(parsed);
const output = `${JSON.stringify(scorecard, null, 2)}\n`;
const outputPath = argument('output');
if (outputPath) await writeFile(resolve(outputPath), output, 'utf8');
process.stdout.write(output);
