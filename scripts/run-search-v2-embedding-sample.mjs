import { readFileSync } from 'node:fs';

import { executeEmbeddingSample } from '../lib/search-v2-embedding-executor.js';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function readArgument(name) {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) throw new Error(`Required argument missing: ${name}`);
  return process.argv[index + 1];
}

const result = await executeEmbeddingSample({
  sampleSet: readJson('data/semantic-search-v2/embedding-sample-set.json'),
  candidates: readJson('data/semantic-search-v2/embedding-candidates.json').candidates,
  authorization: readJson('data/semantic-search-v2/embedding-sample-authorization.json'),
  pricing: readJson('data/semantic-search-v2/embedding-sample-pricing.json'),
  suppliedFingerprint: readArgument('--authorization-fingerprint'),
  suppliedSpendCapUsd: Number(readArgument('--spend-cap-usd')),
  environment: process.env,
  fetchImpl: globalThis.fetch,
});

console.log(JSON.stringify(result, null, 2));
