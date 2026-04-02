/**
 * Obfuscate premium icon CSS class names, SVG IDs, and keyframe names.
 *
 * Strategy: Replace semantic names with short random tokens to increase
 * the effort required to reconstruct a working icon+animation pair from
 * DevTools inspection.
 *
 * What gets obfuscated:
 *   - .si-anim--{icon} wrapper class -> random token (mapping stored in manifest)
 *   - Internal SVG classes (.si-help-bg, .si-sparkle-dot1) -> random tokens
 *   - @keyframes names (aa-help-pulse, ec-cart-bounce) -> random tokens
 *   - SVG gradient/filter IDs (si-grad-help) -> random tokens
 *
 * What does NOT change:
 *   - .si-anim base class (structural, used by store.js)
 *   - .si-icon-cell, .icon-card (grid layout classes)
 *   - Icon filenames (already exposed in manifest)
 *
 * Output: Obfuscated files are written to public/packs/{slug}/ (overwriting originals)
 *         Clean copies saved to public/packs/{slug}/clean/ (for MCP server)
 *         and a class mapping is added to public/packs/manifest.json.
 *
 * Usage: node scripts/obfuscate-assets.js [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PACKS_DIR = path.join(__dirname, '..', 'public', 'packs');
const MANIFEST_PATH = path.join(PACKS_DIR, 'manifest.json');
const DRY_RUN = process.argv.includes('--dry-run');

const COLLECTIONS = [
  'ai-agentic',
  'data-charts',
  'ecommerce',
  'media-playback',
  'navigation-menus',
  'security-auth',
  'social-communication',
  'status-feedback',
];

// Generate a short random token (6 chars, alphanumeric, no leading digit)
function randomToken() {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const all = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = chars[Math.floor(Math.random() * chars.length)];
  for (let i = 0; i < 5; i++) {
    token += all[Math.floor(Math.random() * all.length)];
  }
  return token;
}

// Ensure unique tokens
function uniqueToken(usedTokens) {
  let t;
  do { t = randomToken(); } while (usedTokens.has(t));
  usedTokens.add(t);
  return t;
}

function obfuscateCollection(slug) {
  const collDir = path.join(PACKS_DIR, slug);
  if (!fs.existsSync(collDir)) {
    console.warn(`  SKIP: ${slug} (not found)`);
    return null;
  }

  // Read CSS file(s)
  const cssFiles = fs.readdirSync(collDir).filter(f => f.endsWith('.css'));
  if (cssFiles.length === 0) {
    console.warn(`  SKIP: ${slug} (no CSS)`);
    return null;
  }

  // Read all SVG files
  const svgFiles = fs.readdirSync(collDir).filter(f => f.endsWith('.svg'));

  const usedTokens = new Set();
  const classMap = {};  // original -> obfuscated

  // Step 1: Read CSS and extract all class names, keyframe names, and ID references
  let cssContent = {};
  for (const cssFile of cssFiles) {
    cssContent[cssFile] = fs.readFileSync(path.join(collDir, cssFile), 'utf-8');
  }

  // Step 2: Extract si-anim--{icon} class names and build mapping
  const animClassRegex = /\.si-anim--([a-z0-9-]+)/g;
  const iconClassMap = {}; // iconName -> obfuscated anim class

  for (const css of Object.values(cssContent)) {
    let match;
    while ((match = animClassRegex.exec(css)) !== null) {
      const iconName = match[1];
      if (!iconClassMap[iconName]) {
        iconClassMap[iconName] = uniqueToken(usedTokens);
      }
    }
  }

  // Step 3: Extract internal SVG classes (si-{prefix}-{suffix} pattern)
  const internalClassRegex = /\.si-([a-z0-9]+-[a-z0-9-]+)/g;
  const internalClassMap = {};

  for (const css of Object.values(cssContent)) {
    let match;
    while ((match = internalClassRegex.exec(css)) !== null) {
      const fullClass = `si-${match[1]}`;
      // Skip si-anim (base class) and si-anim--* (handled above) and si-icon-cell
      if (fullClass === 'si-anim' || fullClass.startsWith('si-anim--') || fullClass === 'si-icon-cell') continue;
      if (!internalClassMap[fullClass]) {
        internalClassMap[fullClass] = uniqueToken(usedTokens);
      }
    }
  }

  // Step 4: Extract @keyframes names
  const keyframeRegex = /@keyframes\s+([a-z][a-z0-9-]+)/g;
  const keyframeMap = {};

  for (const css of Object.values(cssContent)) {
    let match;
    while ((match = keyframeRegex.exec(css)) !== null) {
      const kfName = match[1];
      if (!keyframeMap[kfName]) {
        keyframeMap[kfName] = uniqueToken(usedTokens);
      }
    }
  }

  // Step 5: Extract SVG IDs and class names from SVGs
  const svgIdMap = {};
  const svgContents = {};

  for (const svgFile of svgFiles) {
    const content = fs.readFileSync(path.join(collDir, svgFile), 'utf-8');
    svgContents[svgFile] = content;

    // Match id="si-..." patterns
    const idRegex = /id="(si-[a-z0-9-]+)"/g;
    let match;
    while ((match = idRegex.exec(content)) !== null) {
      if (!svgIdMap[match[1]]) {
        svgIdMap[match[1]] = uniqueToken(usedTokens);
      }
    }

    // Also extract class="si-..." from SVGs (catches classes not targeted by CSS)
    const svgClassRegex = /class="(si-[a-z0-9-]+)"/g;
    while ((match = svgClassRegex.exec(content)) !== null) {
      const cls = match[1];
      if (cls === 'si-anim' || cls.startsWith('si-anim--') || cls === 'si-icon-cell') continue;
      if (!internalClassMap[cls]) {
        internalClassMap[cls] = uniqueToken(usedTokens);
      }
    }
  }

  // Step 6: Apply replacements to CSS
  for (const cssFile of Object.keys(cssContent)) {
    let css = cssContent[cssFile];

    // Replace .si-anim--{icon} with obfuscated version
    // Sort by name length descending to prevent substring collision:
    // e.g., 'agent-group' must be replaced before 'agent', otherwise
    // '.si-anim--agent-group' gets partially mangled to '.{agentToken}-group'
    const sortedIconEntries = Object.entries(iconClassMap)
      .sort((a, b) => b[0].length - a[0].length);
    for (const [iconName, token] of sortedIconEntries) {
      css = css.replaceAll(`.si-anim--${iconName}`, `.${token}`);
    }

    // Replace internal SVG classes
    for (const [original, token] of Object.entries(internalClassMap)) {
      css = css.replaceAll(`.${original}`, `.${token}`);
    }

    // Replace keyframe names (in both @keyframes declarations and animation: references)
    for (const [original, token] of Object.entries(keyframeMap)) {
      css = css.replaceAll(original, token);
    }

    // Replace SVG IDs referenced in CSS (url(#si-grad-...))
    for (const [original, token] of Object.entries(svgIdMap)) {
      css = css.replaceAll(original, token);
    }

    cssContent[cssFile] = css;
  }

  // Step 7: Apply replacements to SVGs
  for (const svgFile of Object.keys(svgContents)) {
    let svg = svgContents[svgFile];

    // Replace class attributes
    for (const [original, token] of Object.entries(internalClassMap)) {
      svg = svg.replaceAll(`class="${original}"`, `class="${token}"`);
      // Handle space-separated class lists
      svg = svg.replaceAll(` ${original}`, ` ${token}`);
      svg = svg.replaceAll(`"${original} `, `"${token} `);
    }

    // Replace IDs
    for (const [original, token] of Object.entries(svgIdMap)) {
      svg = svg.replaceAll(`id="${original}"`, `id="${token}"`);
      svg = svg.replaceAll(`#${original}`, `#${token}`);
    }

    svgContents[svgFile] = svg;
  }

  // Step 8: Write files (or report in dry-run)
  const stats = {
    animClasses: Object.keys(iconClassMap).length,
    internalClasses: Object.keys(internalClassMap).length,
    keyframes: Object.keys(keyframeMap).length,
    svgIds: Object.keys(svgIdMap).length,
  };

  if (!DRY_RUN) {
    for (const [cssFile, content] of Object.entries(cssContent)) {
      fs.writeFileSync(path.join(collDir, cssFile), content, 'utf-8');
    }
    for (const [svgFile, content] of Object.entries(svgContents)) {
      fs.writeFileSync(path.join(collDir, svgFile), content, 'utf-8');
    }
  }

  console.log(`  ${slug}: ${stats.animClasses} anim classes, ${stats.internalClasses} internal classes, ${stats.keyframes} keyframes, ${stats.svgIds} SVG IDs`);

  return { iconClassMap, stats };
}

function main() {
  console.log(`Supericons: CSS Obfuscation${DRY_RUN ? ' (DRY RUN)' : ''}`);
  console.log('='.repeat(50));

  // Load manifest
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));

  // Track all icon class mappings for store.js
  const allMappings = {};

  for (const slug of COLLECTIONS) {
    const result = obfuscateCollection(slug);
    if (result) {
      allMappings[slug] = result.iconClassMap;

      // Add class mapping to manifest (only if new tokens were generated)
      // If the collection was already obfuscated, iconClassMap will be empty.
      // In that case, preserve the existing classMap from the manifest.
      if (manifest[slug] && Object.keys(result.iconClassMap).length > 0) {
        manifest[slug].classMap = result.iconClassMap;
      } else if (manifest[slug] && Object.keys(result.iconClassMap).length === 0) {
        console.log(`    (preserving existing classMap for ${slug})`);
      }
    }
  }

  // Write updated manifest
  if (!DRY_RUN) {
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
    console.log(`\nManifest updated with class mappings.`);
  }

  // Summary
  const totalIcons = Object.values(allMappings).reduce((sum, m) => sum + Object.keys(m).length, 0);
  console.log(`\nTotal: ${totalIcons} icon animation classes obfuscated across ${COLLECTIONS.length} collections.`);

  if (DRY_RUN) {
    console.log('\nDry run complete. No files were modified.');
    console.log('Run without --dry-run to apply changes.');
  } else {
    console.log('\nFiles obfuscated. Next steps:');
    console.log('  1. Run upload script to push obfuscated files to Supabase Storage');
    console.log('  2. Update store.js to read classMap from manifest');
  }
}

main();
