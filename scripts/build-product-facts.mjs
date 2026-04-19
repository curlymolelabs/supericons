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

const productFacts = await buildProductFactsObject();

for (const outputPath of outputPaths) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(productFacts, null, 2)}\n`, 'utf8');
}

console.log(`build-product-facts: wrote ${outputPaths.map((outputPath) => path.relative(repoRoot, outputPath)).join(', ')}`);
