import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildSemanticSearchDocuments,
  summarizeSemanticSearchDocuments,
} from '../lib/semantic-search-documents.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

function parseArgs(argv) {
  const args = {
    out: null,
    pretty: false,
    summaryOnly: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--out') {
      args.out = argv[index + 1] || null;
      args.summaryOnly = false;
      index += 1;
      continue;
    }
    if (arg === '--pretty') {
      args.pretty = true;
      continue;
    }
    if (arg === '--summary') {
      args.summaryOnly = true;
    }
  }

  return args;
}

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(repoRoot, relativePath), 'utf8'));
}

const args = parseArgs(process.argv.slice(2));
const iconIndex = await readJson('public/icon-index.json');
const registry = await readJson('public/registry/records.json');
const payload = buildSemanticSearchDocuments(iconIndex, registry);
const summary = summarizeSemanticSearchDocuments(payload);

if (args.out) {
  const outputPath = path.resolve(repoRoot, args.out);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(
    outputPath,
    JSON.stringify(payload, null, args.pretty ? 2 : 0) + '\n',
    'utf8',
  );
  console.log(`build-semantic-search-documents: wrote ${payload.documents.length} documents to ${path.relative(repoRoot, outputPath)}`);
}

console.log(JSON.stringify({
  schema_version: payload.schema_version,
  source: payload.source,
  summary,
}, null, 2));
