// Agentic Tools: 10 ORIGINAL icons
// Style: Cute, minimalist, elegant
// All paths are original compositions on 256x256 grid
// NOT sourced from any icon library

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, 'svg-agentic-tools');
fs.mkdirSync(outDir, { recursive: true });

// ═══════════════════════════════════════════════════════════════════
// ORIGINAL ICON DESIGNS
// Each icon is composed from SVG primitives (rect, circle, path)
// for maximum smoothness. Style: cute, rounded, friendly.
// ═══════════════════════════════════════════════════════════════════
const icons = {

  // 1. CODE EDITOR: Rounded window with a blinking text cursor
  'code-editor': {
    desc: 'A cute rounded code window with a text cursor inside',
    elements: `
      <!-- Window frame: extra rounded for cute feel -->
      <rect x="32" y="48" width="192" height="176" rx="24" />
      <!-- Title bar dots (3 little circles) -->
      <circle cx="64" cy="76" r="8" fill="var(--hole, #fff)" />
      <circle cx="88" cy="76" r="8" fill="var(--hole, #fff)" />
      <circle cx="112" cy="76" r="8" fill="var(--hole, #fff)" />
      <!-- Divider line below title bar -->
      <rect x="32" y="92" width="192" height="4" fill="var(--hole, #fff)" opacity="0.3" />
      <!-- Text cursor: blinking bar -->
      <rect x="72" y="116" width="4" height="40" rx="2" fill="var(--hole, #fff)" />
      <!-- Code lines (cute short lines) -->
      <rect x="88" y="120" width="64" height="8" rx="4" fill="var(--hole, #fff)" opacity="0.6" />
      <rect x="88" y="140" width="48" height="8" rx="4" fill="var(--hole, #fff)" opacity="0.4" />
      <rect x="64" y="168" width="80" height="8" rx="4" fill="var(--hole, #fff)" opacity="0.6" />
      <rect x="64" y="188" width="56" height="8" rx="4" fill="var(--hole, #fff)" opacity="0.4" />
    `,
  },

  // 2. COMMAND LINE: Terminal with chunky chevron prompt
  'command-line': {
    desc: 'A cute terminal window with a friendly chevron prompt',
    elements: `
      <!-- Terminal frame -->
      <rect x="28" y="44" width="200" height="180" rx="28" />
      <!-- Title bar -->
      <circle cx="60" cy="72" r="8" fill="var(--hole, #fff)" />
      <circle cx="84" cy="72" r="8" fill="var(--hole, #fff)" />
      <!-- Chevron prompt: chunky > shape -->
      <path d="M72 128 L104 148 L72 168" fill="none" stroke="var(--hole, #fff)" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" />
      <!-- Cursor underscore -->
      <rect x="120" y="156" width="40" height="8" rx="4" fill="var(--hole, #fff)" opacity="0.7" />
    `,
  },

  // 3. FILE TREE: Cascading folder tabs
  'file-tree': {
    desc: 'A cute folder with a smaller nested folder peaking out',
    elements: `
      <!-- Back folder (larger, shifted right) -->
      <path d="M56 72 L56 60 Q56 48 68 48 L108 48 Q116 48 120 56 L128 72 L196 72 Q208 72 208 84 L208 196 Q208 208 196 208 L68 208 Q56 208 56 196 Z" />
      <!-- Tab on back folder -->
      <!-- Front folder (smaller, shifted left+down) -->
      <rect x="48" y="96" width="136" height="96" rx="16" fill="var(--hole, #fff)" opacity="0.35" />
      <!-- Little document icon peaking out -->
      <rect x="80" y="112" width="48" height="56" rx="8" fill="var(--hole, #fff)" opacity="0.6" />
      <rect x="88" y="128" width="32" height="4" rx="2" fill="currentColor" opacity="0.3" />
      <rect x="88" y="140" width="24" height="4" rx="2" fill="currentColor" opacity="0.3" />
    `,
  },

  // 4. WEB FETCH: A cute globe with a small download arrow
  'web-fetch': {
    desc: 'A friendly globe with latitude/longitude lines and a download arrow',
    elements: `
      <!-- Globe circle -->
      <circle cx="120" cy="120" r="80" />
      <!-- Longitude line (vertical ellipse) -->
      <ellipse cx="120" cy="120" rx="32" ry="80" fill="none" stroke="var(--hole, #fff)" stroke-width="8" />
      <!-- Latitude lines -->
      <path d="M42 104 Q120 88 198 104" fill="none" stroke="var(--hole, #fff)" stroke-width="8" stroke-linecap="round" />
      <path d="M42 136 Q120 152 198 136" fill="none" stroke="var(--hole, #fff)" stroke-width="8" stroke-linecap="round" />
      <!-- Equator -->
      <line x1="40" y1="120" x2="200" y2="120" stroke="var(--hole, #fff)" stroke-width="8" stroke-linecap="round" />
      <!-- Download arrow badge (bottom-right) -->
      <circle cx="192" cy="192" r="40" fill="currentColor" />
      <circle cx="192" cy="192" r="36" fill="var(--hole, #fff)" />
      <path d="M192 172 L192 200 M178 190 L192 206 L206 190" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" />
    `,
  },

  // 5. CLIPBOARD: A cute clipboard with a rounded clip mechanism
  'clipboard': {
    desc: 'A friendly clipboard with rounded clip and check mark',
    elements: `
      <!-- Board body -->
      <rect x="48" y="56" width="160" height="176" rx="20" />
      <!-- Clip mechanism (top center) -->
      <rect x="96" y="36" width="64" height="40" rx="12" fill="var(--hole, #fff)" />
      <rect x="104" y="44" width="48" height="24" rx="8" fill="currentColor" />
      <!-- Lines on clipboard -->
      <rect x="80" y="108" width="96" height="8" rx="4" fill="var(--hole, #fff)" opacity="0.5" />
      <rect x="80" y="132" width="72" height="8" rx="4" fill="var(--hole, #fff)" opacity="0.4" />
      <rect x="80" y="156" width="84" height="8" rx="4" fill="var(--hole, #fff)" opacity="0.5" />
      <!-- Check mark -->
      <path d="M104 188 L120 204 L152 172" fill="none" stroke="var(--hole, #fff)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" opacity="0.7" />
    `,
  },

  // 6. NOTEBOOK: A spiral-bound notebook with cute binding dots
  'notebook': {
    desc: 'A cute spiral notebook with binding holes along the left edge',
    elements: `
      <!-- Notebook body -->
      <rect x="64" y="32" width="164" height="192" rx="16" />
      <!-- Spiral binding dots (left edge) -->
      <circle cx="64" cy="64" r="10" fill="var(--hole, #fff)" />
      <circle cx="64" cy="96" r="10" fill="var(--hole, #fff)" />
      <circle cx="64" cy="128" r="10" fill="var(--hole, #fff)" />
      <circle cx="64" cy="160" r="10" fill="var(--hole, #fff)" />
      <circle cx="64" cy="192" r="10" fill="var(--hole, #fff)" />
      <!-- Lines -->
      <rect x="96" y="72" width="100" height="6" rx="3" fill="var(--hole, #fff)" opacity="0.5" />
      <rect x="96" y="100" width="80" height="6" rx="3" fill="var(--hole, #fff)" opacity="0.4" />
      <rect x="96" y="128" width="100" height="6" rx="3" fill="var(--hole, #fff)" opacity="0.5" />
      <rect x="96" y="156" width="64" height="6" rx="3" fill="var(--hole, #fff)" opacity="0.4" />
      <!-- Bookmark ribbon peaking from bottom -->
      <path d="M180 224 L180 204 L192 212 L204 204 L204 224" fill="var(--hole, #fff)" opacity="0.6" />
    `,
  },

  // 7. STOPWATCH: A cute round timer with start button
  'stopwatch': {
    desc: 'A friendly stopwatch with a chunky top button',
    elements: `
      <!-- Top button -->
      <rect x="112" y="20" width="32" height="28" rx="8" />
      <!-- Button connector -->
      <rect x="120" y="44" width="16" height="16" />
      <!-- Watch body -->
      <circle cx="128" cy="140" r="84" />
      <!-- Watch face (cutout) -->
      <circle cx="128" cy="140" r="68" fill="var(--hole, #fff)" opacity="0.15" />
      <!-- Hour marks (12, 3, 6, 9 positions) -->
      <rect x="124" y="64" width="8" height="20" rx="4" fill="var(--hole, #fff)" opacity="0.6" />
      <rect x="192" y="136" width="20" height="8" rx="4" fill="var(--hole, #fff)" opacity="0.6" />
      <rect x="124" y="196" width="8" height="20" rx="4" fill="var(--hole, #fff)" opacity="0.6" />
      <rect x="44" y="136" width="20" height="8" rx="4" fill="var(--hole, #fff)" opacity="0.6" />
      <!-- Hand (pointing to ~2 o'clock) -->
      <line x1="128" y1="140" x2="172" y2="100" stroke="var(--hole, #fff)" stroke-width="8" stroke-linecap="round" />
      <!-- Center dot -->
      <circle cx="128" cy="140" r="8" fill="var(--hole, #fff)" />
    `,
  },

  // 8. LIGHTBULB: A cute lightbulb with filament detail
  'lightbulb': {
    desc: 'A friendly lightbulb with rounded glass and visible filament',
    elements: `
      <!-- Bulb glass (top rounded, tapers to base) -->
      <path d="M128 24 Q188 24 188 96 Q188 144 160 164 L160 184 L96 184 L96 164 Q68 144 68 96 Q68 24 128 24 Z" />
      <!-- Base/screw (bottom rectangle with ridges) -->
      <rect x="96" y="184" width="64" height="16" rx="4" fill="var(--hole, #fff)" opacity="0.3" />
      <rect x="100" y="200" width="56" height="12" rx="4" />
      <rect x="96" y="212" width="64" height="4" rx="2" fill="var(--hole, #fff)" opacity="0.3" />
      <rect x="104" y="216" width="48" height="16" rx="8" />
      <!-- Filament (cute squiggle inside) -->
      <path d="M112 120 Q120 96 128 120 Q136 144 144 120" fill="none" stroke="var(--hole, #fff)" stroke-width="8" stroke-linecap="round" />
      <!-- Rays (small lines radiating outward) -->
      <line x1="128" y1="4" x2="128" y2="16" stroke="var(--hole, #fff)" stroke-width="6" stroke-linecap="round" opacity="0" />
    `,
  },

  // 9. MAGIC WAND: A star-tipped wand with sparkles
  'magic-wand': {
    desc: 'A cute magic wand with a star tip and floating sparkles',
    elements: `
      <!-- Wand stick (diagonal, thick, rounded) -->
      <rect x="36" y="148" width="160" height="20" rx="10" transform="rotate(-45 128 128)" />
      <!-- Handle grip (darker band) -->
      <rect x="36" y="148" width="48" height="20" rx="10" transform="rotate(-45 128 128)" fill="var(--hole, #fff)" opacity="0.2" />
      <!-- Star at tip -->
      <path d="M68 56 L76 40 L84 56 L100 60 L88 72 L92 88 L76 80 L60 88 L64 72 L52 60 Z" />
      <!-- Sparkle 1 (small diamond) -->
      <path d="M164 48 L168 36 L172 48 L184 52 L172 56 L168 68 L164 56 L152 52 Z" />
      <!-- Sparkle 2 (tiny) -->
      <path d="M140 84 L142 78 L144 84 L150 86 L144 88 L142 94 L140 88 L134 86 Z" />
      <!-- Sparkle 3 (mini dot) -->
      <circle cx="192" cy="72" r="6" />
    `,
  },

  // 10. PUZZLE PIECE: An interlocking puzzle piece
  'puzzle-piece': {
    desc: 'A cute rounded puzzle piece representing tool integration',
    elements: `
      <!-- Puzzle piece body: rounded square with tab/slot on each side -->
      <path d="
        M80 56
        L112 56
        Q112 36 128 36 Q144 36 144 56
        L176 56
        Q192 56 192 72
        L192 104
        Q212 104 212 120 Q212 136 192 136
        L192 168
        Q192 184 176 184
        L144 184
        Q144 204 128 204 Q112 204 112 184
        L80 184
        Q64 184 64 168
        L64 136
        Q44 136 44 120 Q44 104 64 104
        L64 72
        Q64 56 80 56
        Z"
      />
    `,
  },
};

// ═══════════════════════════════════════════════════════════════════
// GENERATE SVGs
// ═══════════════════════════════════════════════════════════════════
let count = 0;
for (const [name, icon] of Object.entries(icons)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor">
  <!-- ${icon.desc} -->
  ${icon.elements}
</svg>`;
  fs.writeFileSync(path.join(outDir, `${name}.svg`), svg, 'utf-8');
  count++;
}
console.log(`Agentic Tools: Generated ${count} original SVGs -> ${outDir}`);
