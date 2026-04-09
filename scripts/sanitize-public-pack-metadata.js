import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sanitizeCssCommentMetadata } from '../lib/public-metadata-sanitizer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PACKS_DIR = path.join(__dirname, '..', 'public', 'packs');

function walk(dir, collected = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, collected);
    } else {
      collected.push(fullPath);
    }
  }
  return collected;
}

function sanitizeCssFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  const sanitized = sanitizeCssCommentMetadata(original, { preserveBranding: false });
  if (sanitized !== original) {
    fs.writeFileSync(filePath, sanitized, 'utf8');
    return 1;
  }
  return 0;
}

function sanitizeBundleFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(original);
  if (typeof parsed.css !== 'string') return 0;

  const sanitizedCss = sanitizeCssCommentMetadata(parsed.css, { preserveBranding: false });
  if (sanitizedCss === parsed.css) return 0;

  parsed.css = sanitizedCss;
  fs.writeFileSync(filePath, JSON.stringify(parsed), 'utf8');
  return 1;
}

const files = walk(PACKS_DIR);
let cssUpdates = 0;
let bundleUpdates = 0;

for (const filePath of files) {
  if (filePath.endsWith('.css')) {
    cssUpdates += sanitizeCssFile(filePath);
  } else if (filePath.endsWith('bundle.json')) {
    bundleUpdates += sanitizeBundleFile(filePath);
  }
}

console.log(`Sanitized ${cssUpdates} CSS files and ${bundleUpdates} bundle files.`);
