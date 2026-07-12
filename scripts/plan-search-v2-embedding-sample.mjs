import fs from 'node:fs/promises';
import path from 'node:path';

import { buildEmbeddingSamplePlan } from '../lib/search-v2-embedding-sample.js';

const repoRoot = path.join(import.meta.dirname, '..');

function parseArgs(argv) {
  const candidateIds = [];
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument !== '--candidate') throw new Error(`Unknown argument: ${argument}`);
    candidateIds.push(...String(argv[index + 1] || '').split(',').filter(Boolean));
    index += 1;
  }
  return { candidateIds };
}

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(repoRoot, relativePath), 'utf8'));
}

const args = parseArgs(process.argv.slice(2));
const [sampleSet, candidateConfig] = await Promise.all([
  readJson('data/semantic-search-v2/embedding-sample-set.json'),
  readJson('data/semantic-search-v2/embedding-candidates.json'),
]);

const plan = buildEmbeddingSamplePlan({
  sampleSet,
  candidates: candidateConfig,
  candidateIds: args.candidateIds,
});

console.log(JSON.stringify(plan, null, 2));
