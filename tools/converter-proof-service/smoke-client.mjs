import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const sourcePath = path.join(repoRoot, 'dc_verify.png');
const outputDir = path.join(__dirname, 'artifacts');
const outputPath = path.join(outputDir, 'dc_verify.exact.svg');
const endpoint = process.env.CONVERTER_PROOF_URL || 'http://127.0.0.1:4318/api/convert/png-to-svg';

const source = await readFile(sourcePath);
const response = await fetch(endpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    imageBase64: source.toString('base64'),
    mimeType: 'image/png',
    qualityMode: 'exact',
  }),
});

if (!response.ok) {
  const errorText = await response.text();
  throw new Error(`Smoke request failed (${response.status}): ${errorText}`);
}

const result = await response.json();
await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, result.svg, 'utf8');

console.log(JSON.stringify({
  endpoint,
  outputPath,
  engine: result.engine,
  metrics: result.metrics,
  warnings: result.warnings,
}, null, 2));
