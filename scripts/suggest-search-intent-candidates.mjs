import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const terms = process.argv.slice(2).map((term) => term.trim()).filter(Boolean);
if (terms.length === 0) {
  console.error('Usage: node scripts/suggest-search-intent-candidates.mjs stupid smart broken');
  process.exit(1);
}

async function getDatamuseSuggestions(term) {
  const url = `https://api.datamuse.com/words?ml=${encodeURIComponent(term)}&max=20`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Datamuse request failed for ${term}: ${response.status}`);
  const rows = await response.json();
  return rows.map((row) => row.word).filter(Boolean);
}

const output = {
  generated_at: new Date().toISOString(),
  source: 'datamuse_ml_suggestions',
  note: 'Suggestion-only file. Do not use directly in production search.',
  terms: [],
};

for (const term of terms) {
  const suggestions = await getDatamuseSuggestions(term);
  output.terms.push({ term, suggestions });
}

const outputDir = resolve('output/search-intent-suggestions');
mkdirSync(outputDir, { recursive: true });
const outputPath = resolve(outputDir, `suggestions-${Date.now()}.json`);
writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(`suggest-search-intent-candidates: ${outputPath}`);
