import fs from 'node:fs/promises';
import path from 'node:path';

import { buildSemanticSearchDocuments } from '../lib/semantic-search-documents.js';
import {
  buildEmbeddingWorkPlan,
  normalizeEmbeddingRunnerMode,
  validateEmbeddingCandidates,
} from '../lib/search-v2-embedding-plan.js';

const repoRoot = path.join(import.meta.dirname, '..');

function parseArgs(argv) {
  const args = { mode: 'plan', candidateIds: [], batchSize: 100 };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--mode') {
      args.mode = argv[index + 1];
      index += 1;
    } else if (arg === '--candidate') {
      args.candidateIds.push(...String(argv[index + 1] || '').split(',').filter(Boolean));
      index += 1;
    } else if (arg === '--batch-size') {
      args.batchSize = Number(argv[index + 1]);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  args.mode = normalizeEmbeddingRunnerMode(args.mode);
  return args;
}

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(repoRoot, relativePath), 'utf8'));
}

const args = parseArgs(process.argv.slice(2));
const [iconIndex, registry, candidateConfig] = await Promise.all([
  readJson('public/icon-index.json'),
  readJson('public/registry/records.json'),
  readJson('data/semantic-search-v2/embedding-candidates.json'),
]);
const semanticPayload = buildSemanticSearchDocuments(iconIndex, registry);
const candidates = validateEmbeddingCandidates(candidateConfig);
const plan = buildEmbeddingWorkPlan({
  documents: semanticPayload.documents,
  candidates,
  mode: args.mode,
  candidateIds: args.candidateIds,
  batchSize: args.batchSize,
});

console.log(JSON.stringify({
  ...plan,
  skipped_document_count: semanticPayload.skipped.length,
}, null, 2));
