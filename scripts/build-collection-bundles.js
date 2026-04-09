/**
 * Build Collection Bundles
 * 
 * Generates a single bundle.json per premium collection containing
 * all obfuscated SVGs + CSS in one file. This eliminates the need
 * for 50+ individual Edge Function calls when loading a collection grid.
 * 
 * Usage: node scripts/build-collection-bundles.js
 * 
 * Input:  public/packs/{slug}/*.svg + {slug}.css (obfuscated)
 * Output: public/packs/{slug}/bundle.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sanitizeCssCommentMetadata } from '../lib/public-metadata-sanitizer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PACKS_DIR = path.join(__dirname, '..', 'public', 'packs');

// Read manifest to get collection slugs and CSS filenames
const manifest = JSON.parse(
  fs.readFileSync(path.join(PACKS_DIR, 'manifest.json'), 'utf-8')
);

const collections = Object.keys(manifest).filter(
  slug => manifest[slug].icons && manifest[slug].css
);

console.log('Supericons: Build Collection Bundles');
console.log('====================================\n');

let totalBundles = 0;

for (const slug of collections) {
  const collDir = path.join(PACKS_DIR, slug);
  if (!fs.existsSync(collDir)) {
    console.warn(`  SKIP: ${slug} (directory not found)`);
    continue;
  }

  const cssFilename = manifest[slug].css;
  const cssPath = path.join(collDir, cssFilename);

  if (!fs.existsSync(cssPath)) {
    console.warn(`  SKIP: ${slug} (CSS file ${cssFilename} not found)`);
    continue;
  }

  // Read CSS
  const css = sanitizeCssCommentMetadata(fs.readFileSync(cssPath, 'utf-8'), {
    preserveBranding: false,
  });

  // Read all SVGs
  const svgFiles = fs.readdirSync(collDir).filter(f => f.endsWith('.svg'));
  const icons = {};

  for (const svgFile of svgFiles) {
    const iconName = svgFile.replace('.svg', '');
    icons[iconName] = fs.readFileSync(path.join(collDir, svgFile), 'utf-8');
  }

  // Build bundle
  const bundle = { css, icons };
  const bundlePath = path.join(collDir, 'bundle.json');
  const bundleContent = JSON.stringify(bundle);

  fs.writeFileSync(bundlePath, bundleContent, 'utf-8');

  const sizeKB = (Buffer.byteLength(bundleContent) / 1024).toFixed(1);
  console.log(`  ${slug}: ${svgFiles.length} icons, ${sizeKB} KB`);
  totalBundles++;
}

console.log(`\n${totalBundles} bundles generated.`);
