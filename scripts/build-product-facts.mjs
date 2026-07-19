import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildProductFactsObject } from './product-facts-core.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const outputPaths = [
  path.join(repoRoot, 'data', 'product-facts.json'),
  path.join(repoRoot, 'mcp', 'public', 'product-facts.json'),
];

const generatedAtFlag = process.argv.indexOf('--generated-at');
const generatedAt = generatedAtFlag >= 0 ? process.argv[generatedAtFlag + 1] : new Date().toISOString();
if (new Date(generatedAt).toISOString() !== generatedAt) {
  throw new Error('The product facts timestamp must use the exact ISO UTC format.');
}
const productFacts = await buildProductFactsObject({ generatedAt });

for (const outputPath of outputPaths) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(productFacts, null, 2)}\n`, 'utf8');
}

console.log(`build-product-facts: wrote ${outputPaths.map((outputPath) => path.relative(repoRoot, outputPath)).join(', ')}`);
