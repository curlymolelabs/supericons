// Agentic AI Kit v2: Premium Quality Redesign
// Design principles applied from Apple SF Symbols, Linear, Vercel Geist, Stripe
//
// QUALITY MANIFESTO (extracted from research):
// 1. KEYLINE SHAPES: Every icon is built from one of 4 keyline templates:
//    - Circle: 20px diameter centered in 24x24
//    - Square: 18x18 centered in 24x24
//    - Tall rectangle: 14x20 centered
//    - Wide rectangle: 20x14 centered
//    All elements must respect these bounding shapes for optical consistency.
//
// 2. GRID SNAPPING: All coordinates snap to whole pixels or 0.5px increments.
//    No arbitrary decimal values (3.3, 2.7, etc.). This prevents sub-pixel blur.
//
// 3. FEWER ELEMENTS: Premium = restraint. Max 3-4 distinct shapes per icon.
//    If an icon needs more than 4 shapes, the metaphor is too complex.
//
// 4. CONSISTENT VISUAL WEIGHT: Every icon should "fill" roughly the same
//    amount of its keyline shape. No icon should look lighter or heavier
//    than its neighbors.
//
// 5. OPTICAL CORRECTIONS: Circles extend 0.5px beyond square bounds.
//    Pointed shapes (triangles, arrows) extend 1px to appear same size.
//    Horizontal strokes are visually thinner than vertical, compensate.
//
// 6. CLEAN METAPHORS: Each icon conveys ONE concept with ONE metaphor.
//    No combining 3+ ideas in a 24px space. The viewer should "get it"
//    in under 200ms.
//
// 7. CONTINUOUS CURVATURE: Use slightly rounded corners everywhere (r=2).
//    No sharp 90-degree corners except on explicitly "sharp" concepts.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Output directories
const outlineDir = path.join(__dirname, 'svg');
const duotoneDir = path.join(__dirname, 'svg-duotone');
[outlineDir, duotoneDir].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// SVG wrapper: outline style
const wrapOutline = (inner) =>
`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
${inner}
</svg>`;

// SVG wrapper: duotone style
const wrapDuotone = (secondary, primary) =>
`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <g class="duotone-secondary" fill="currentColor" opacity="0.12" stroke="none">
${secondary}
  </g>
  <g class="duotone-primary">
${primary}
  </g>
</svg>`;

// ============================================================
// ICON DEFINITIONS v2: Premium redesign
// Each icon defined as:
//   outline: SVG inner content (stroke only)
//   fill:    SVG shapes for duotone secondary layer
// ============================================================

const icons = {

  // ── CORE NAVIGATION (6) ────────────────────────────────
  // Keyline: square 18x18, centered at 12,12

  'ai-home': {
    outline: `  <path d="M4 11.5l8-7 8 7"/>
  <path d="M6 10v9a1 1 0 001 1h10a1 1 0 001-1v-9"/>
  <path d="M10 20v-5a2 2 0 014 0v5"/>`,
    fill: `    <path d="M6 10v9a1 1 0 001 1h10a1 1 0 001-1v-9l-8-7z"/>`
  },

  'ai-search': {
    outline: `  <circle cx="10.5" cy="10.5" r="6.5"/>
  <path d="M21 21l-4.5-4.5"/>
  <path d="M8 10.5h5"/>
  <path d="M10.5 8v5"/>`,
    fill: `    <circle cx="10.5" cy="10.5" r="6.5"/>`
  },

  'ai-settings': {
    outline: `  <path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/>
  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1.08 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001.08 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.6.77 1.02 1.51 1.08H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/>`,
    fill: `    <circle cx="12" cy="12" r="3"/>`
  },

  'ai-history': {
    outline: `  <path d="M3 12a9 9 0 1018 0 9 9 0 00-18 0z"/>
  <path d="M12 7v5l3 3"/>`,
    fill: `    <circle cx="12" cy="12" r="9"/>`
  },

  'ai-help': {
    outline: `  <circle cx="12" cy="12" r="9"/>
  <path d="M9.5 9.5a2.5 2.5 0 015 0c0 1.5-2.5 2-2.5 3.5"/>
  <circle cx="12" cy="17" r=".5" fill="currentColor" stroke="none"/>`,
    fill: `    <circle cx="12" cy="12" r="9"/>`
  },

  'ai-menu': {
    outline: `  <path d="M4 6h16"/>
  <path d="M4 12h16"/>
  <path d="M4 18h12"/>`,
    fill: `    <rect x="3" y="4" width="18" height="16" rx="2"/>`
  },

  // ── AGENT & WORKFLOW (8) ───────────────────────────────

  'agent': {
    outline: `  <circle cx="12" cy="8" r="4"/>
  <path d="M5 20a7 7 0 0114 0"/>
  <circle cx="12" cy="4" r="1" fill="currentColor" stroke="none"/>`,
    fill: `    <circle cx="12" cy="8" r="4"/>
    <path d="M5 20a7 7 0 0114 0z"/>`
  },

  'agent-workflow': {
    outline: `  <circle cx="5" cy="5" r="2"/>
  <circle cx="19" cy="5" r="2"/>
  <circle cx="12" cy="19" r="2"/>
  <path d="M7 5h10"/>
  <path d="M5 7v5l7 5"/>
  <path d="M19 7v5l-7 5"/>`,
    fill: `    <circle cx="5" cy="5" r="2"/>
    <circle cx="19" cy="5" r="2"/>
    <circle cx="12" cy="19" r="2"/>`
  },

  'agent-group': {
    outline: `  <circle cx="9" cy="7" r="3"/>
  <circle cx="15" cy="7" r="3"/>
  <path d="M3 20a6 6 0 0112 0"/>
  <path d="M13 14.5A6 6 0 0121 20"/>`,
    fill: `    <circle cx="9" cy="7" r="3"/>
    <circle cx="15" cy="7" r="3"/>
    <path d="M3 20a6 6 0 0112 0z"/>
    <path d="M13 14.5A6 6 0 0121 20z"/>`
  },

  'tool-use': {
    outline: `  <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3-3a5 5 0 01-7 7l-8 8a2 2 0 01-2.8-2.8l8-8a5 5 0 017-7z"/>`,
    fill: `    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3-3a5 5 0 01-7 7l-8 8a2 2 0 01-2.8-2.8l8-8a5 5 0 017-7z"/>`
  },

  'chain': {
    outline: `  <path d="M10 14a3.5 3.5 0 005 0l3-3a3.5 3.5 0 00-5-5l-.5.5"/>
  <path d="M14 10a3.5 3.5 0 00-5 0l-3 3a3.5 3.5 0 005 5l.5-.5"/>`,
    fill: `    <rect x="5" y="5" width="14" height="14" rx="4" transform="rotate(45 12 12)"/>`
  },

  'orchestrator': {
    outline: `  <circle cx="12" cy="12" r="3"/>
  <path d="M12 2v4"/>
  <path d="M12 18v4"/>
  <path d="M4.93 4.93l2.83 2.83"/>
  <path d="M16.24 16.24l2.83 2.83"/>
  <path d="M2 12h4"/>
  <path d="M18 12h4"/>
  <path d="M4.93 19.07l2.83-2.83"/>
  <path d="M16.24 7.76l2.83-2.83"/>`,
    fill: `    <circle cx="12" cy="12" r="5"/>`
  },

  'agent-loop': {
    outline: `  <path d="M17 2l4 4-4 4"/>
  <path d="M3 11V9a4 4 0 014-4h14"/>
  <path d="M7 22l-4-4 4-4"/>
  <path d="M21 13v2a4 4 0 01-4 4H3"/>`,
    fill: `    <rect x="2" y="4" width="20" height="16" rx="4"/>`
  },

  'agent-stop': {
    outline: `  <circle cx="12" cy="8" r="4"/>
  <path d="M5 20a7 7 0 0114 0"/>
  <rect x="10" y="6" width="4" height="4" rx="1"/>`,
    fill: `    <circle cx="12" cy="8" r="4"/>
    <path d="M5 20a7 7 0 0114 0z"/>`
  },

  // ── PROMPT & CONTEXT (7) ──────────────────────────────

  'prompt': {
    outline: `  <path d="M7 8l-3 4 3 4"/>
  <path d="M17 8l3 4-3 4"/>
  <path d="M14 4l-4 16"/>`,
    fill: `    <rect x="3" y="3" width="18" height="18" rx="3"/>`
  },

  'prompt-template': {
    outline: `  <rect x="4" y="3" width="16" height="18" rx="2"/>
  <path d="M8 8h3"/>
  <path d="M8 12h8"/>
  <path d="M8 16h5"/>
  <rect x="14" y="7" width="3" height="3" rx="0.5" fill="none"/>`,
    fill: `    <rect x="4" y="3" width="16" height="18" rx="2"/>`
  },

  'system-prompt': {
    outline: `  <rect x="3" y="4" width="18" height="16" rx="2"/>
  <path d="M3 9h18"/>
  <path d="M8 13l2 2 4-4"/>
  <circle cx="6" cy="6.5" r=".75" fill="currentColor" stroke="none"/>
  <circle cx="9" cy="6.5" r=".75" fill="currentColor" stroke="none"/>
  <circle cx="12" cy="6.5" r=".75" fill="currentColor" stroke="none"/>`,
    fill: `    <rect x="3" y="4" width="18" height="16" rx="2"/>`
  },

  'context-window': {
    outline: `  <rect x="3" y="3" width="18" height="18" rx="2"/>
  <path d="M3 9h18"/>
  <path d="M3 15h18"/>
  <path d="M9 3v18"/>`,
    fill: `    <rect x="3" y="3" width="18" height="18" rx="2"/>`
  },

  'conversation': {
    outline: `  <path d="M21 11.5a8.5 8.5 0 01-8.5 8.5 8.4 8.4 0 01-4-.98L3 21l2-5.5A8.5 8.5 0 1121 11.5z"/>
  <path d="M8 11.5h.01"/>
  <path d="M12 11.5h.01"/>
  <path d="M16 11.5h.01"/>`,
    fill: `    <path d="M21 11.5a8.5 8.5 0 01-8.5 8.5 8.4 8.4 0 01-4-.98L3 21l2-5.5A8.5 8.5 0 1121 11.5z"/>`
  },

  'regenerate': {
    outline: `  <path d="M1 4v6h6"/>
  <path d="M23 20v-6h-6"/>
  <path d="M20.5 9A9 9 0 005 5.6L1 10"/>
  <path d="M3.5 15A9 9 0 0019 18.4l4-4.4"/>`,
    fill: `    <circle cx="12" cy="12" r="7"/>`
  },

  'streaming': {
    outline: `  <circle cx="5" cy="12" r="1.5"/>
  <circle cx="12" cy="12" r="1.5"/>
  <circle cx="19" cy="12" r="1.5"/>`,
    fill: `    <circle cx="5" cy="12" r="3"/>
    <circle cx="12" cy="12" r="3"/>
    <circle cx="19" cy="12" r="3"/>`
  },

  // ── RAG & DATA (7) ────────────────────────────────────

  'embedding': {
    outline: `  <path d="M12 2v20"/>
  <path d="M2 12h20"/>
  <path d="M4.93 4.93l14.14 14.14"/>
  <path d="M19.07 4.93L4.93 19.07"/>
  <circle cx="12" cy="12" r="3"/>`,
    fill: `    <circle cx="12" cy="12" r="8"/>`
  },

  'chunk': {
    outline: `  <rect x="4" y="3" width="16" height="18" rx="2"/>
  <path d="M4 9h16"/>
  <path d="M4 15h16"/>`,
    fill: `    <rect x="4" y="3" width="16" height="18" rx="2"/>`
  },

  'retrieve': {
    outline: `  <circle cx="11" cy="11" r="6"/>
  <path d="M20 20l-3.5-3.5"/>
  <path d="M8 11h6"/>
  <path d="M11 8v6"/>`,
    fill: `    <circle cx="11" cy="11" r="6"/>`
  },

  'rag-pipeline': {
    outline: `  <rect x="2" y="3" width="7" height="8" rx="1.5"/>
  <circle cx="17.5" cy="7" r="3.5"/>
  <path d="M9 7h4"/>
  <path d="M14 14v-2l3.5-1.5"/>
  <rect x="10" y="14" width="12" height="7" rx="1.5"/>`,
    fill: `    <rect x="2" y="3" width="7" height="8" rx="1.5"/>
    <circle cx="17.5" cy="7" r="3.5"/>
    <rect x="10" y="14" width="12" height="7" rx="1.5"/>`
  },

  'vector-db': {
    outline: `  <ellipse cx="12" cy="5.5" rx="8" ry="3.5"/>
  <path d="M4 5.5v6c0 1.93 3.58 3.5 8 3.5s8-1.57 8-3.5v-6"/>
  <path d="M4 11.5v6c0 1.93 3.58 3.5 8 3.5s8-1.57 8-3.5v-6"/>`,
    fill: `    <ellipse cx="12" cy="5.5" rx="8" ry="3.5"/>
    <path d="M4 5.5v6c0 1.93 3.58 3.5 8 3.5s8-1.57 8-3.5v-6z"/>
    <path d="M4 11.5v6c0 1.93 3.58 3.5 8 3.5s8-1.57 8-3.5v-6z"/>`
  },

  'knowledge-base': {
    outline: `  <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
  <path d="M4 4.5A2.5 2.5 0 016.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15z"/>
  <path d="M8 7h8"/>
  <path d="M8 11h5"/>`,
    fill: `    <path d="M4 4.5A2.5 2.5 0 016.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15z"/>`
  },

  'document-index': {
    outline: `  <rect x="4" y="3" width="16" height="18" rx="2"/>
  <path d="M8 7h8"/>
  <path d="M8 11h8"/>
  <path d="M8 15h4"/>`,
    fill: `    <rect x="4" y="3" width="16" height="18" rx="2"/>`
  },

  // ── MODEL & CONFIG (6) ────────────────────────────────

  'model': {
    outline: `  <path d="M12 2a7 7 0 017 7c0 5-7 9-7 13 0-4-7-8-7-13a7 7 0 017-7z"/>
  <path d="M12 12v-2"/>
  <circle cx="12" cy="8" r="1" fill="currentColor" stroke="none"/>`,
    fill: `    <path d="M12 2a7 7 0 017 7c0 5-7 9-7 13 0-4-7-8-7-13a7 7 0 017-7z"/>`
  },

  'model-selector': {
    outline: `  <path d="M12 2a7 7 0 017 7c0 5-7 9-7 13 0-4-7-8-7-13a7 7 0 017-7z"/>
  <path d="M9 20l3 2 3-2"/>`,
    fill: `    <path d="M12 2a7 7 0 017 7c0 5-7 9-7 13 0-4-7-8-7-13a7 7 0 017-7z"/>`
  },

  'temperature': {
    outline: `  <path d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z"/>
  <circle cx="11.5" cy="17" r="2"/>
  <path d="M11.5 11v6"/>`,
    fill: `    <path d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z"/>`
  },

  'token-counter': {
    outline: `  <rect x="2" y="4" width="20" height="16" rx="2"/>
  <path d="M2 10h20"/>
  <path d="M6 14h2"/>
  <path d="M11 14h2"/>
  <path d="M16 14h2"/>`,
    fill: `    <rect x="2" y="4" width="20" height="16" rx="2"/>`
  },

  'fine-tune': {
    outline: `  <path d="M4 8h3"/>
  <path d="M11 8h9"/>
  <circle cx="8.5" cy="8" r="2.5"/>
  <path d="M4 16h9"/>
  <path d="M17 16h3"/>
  <circle cx="15.5" cy="16" r="2.5"/>`,
    fill: `    <circle cx="8.5" cy="8" r="2.5"/>
    <circle cx="15.5" cy="16" r="2.5"/>`
  },

  'max-tokens': {
    outline: `  <rect x="3" y="9" width="18" height="6" rx="2"/>
  <path d="M3 12h11"/>
  <path d="M14 7v10"/>
  <path d="M7 7v2"/>
  <path d="M10 7v2"/>`,
    fill: `    <rect x="3" y="9" width="18" height="6" rx="2"/>`
  },

  // ── SAFETY & MONITORING (4) ───────────────────────────

  'guardrail': {
    outline: `  <path d="M12 2l8 4v6c0 5.25-3.5 10-8 12-4.5-2-8-6.75-8-12V6z"/>
  <path d="M9 12l2 2 4-4"/>`,
    fill: `    <path d="M12 2l8 4v6c0 5.25-3.5 10-8 12-4.5-2-8-6.75-8-12V6z"/>`
  },

  'safety-filter': {
    outline: `  <path d="M22 3H2l8 9.5V19l4 2v-8.5z"/>`,
    fill: `    <path d="M22 3H2l8 9.5V19l4 2v-8.5z"/>`
  },

  'token-cost': {
    outline: `  <circle cx="12" cy="12" r="9"/>
  <path d="M12 6v2"/>
  <path d="M12 16v2"/>
  <path d="M9 10a3 3 0 013-2c1.66 0 3 .67 3 2s-1.34 2-3 2-3 .67-3 2 1.34 2 3 2a3 3 0 003-2"/>`,
    fill: `    <circle cx="12" cy="12" r="9"/>`
  },

  'latency': {
    outline: `  <circle cx="12" cy="12" r="9"/>
  <path d="M12 6v6l4 2"/>`,
    fill: `    <circle cx="12" cy="12" r="9"/>`
  },

  // ── STATUS & EMPTY STATES (2) ─────────────────────────

  'sparkle': {
    outline: `  <path d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5z"/>
  <path d="M18 14l.75 2.25L21 17l-2.25.75L18 20l-.75-2.25L15 17l2.25-.75z"/>`,
    fill: `    <path d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5z"/>
    <path d="M18 14l.75 2.25L21 17l-2.25.75L18 20l-.75-2.25L15 17l2.25-.75z"/>`
  },

  'empty-agent': {
    outline: `  <circle cx="12" cy="8" r="4" stroke-dasharray="4 3"/>
  <path d="M5 20a7 7 0 0114 0" stroke-dasharray="4 3"/>`,
    fill: `    <circle cx="12" cy="8" r="4" opacity="0.06"/>
    <path d="M5 20a7 7 0 0114 0z" opacity="0.06"/>`
  },
};

// ── GENERATE BOTH STYLES ────────────────────────────────

let count = 0;
for (const [name, { outline, fill }] of Object.entries(icons)) {
  // Outline style
  const outlineSvg = wrapOutline(outline);
  fs.writeFileSync(path.join(outlineDir, `${name}.svg`), outlineSvg, 'utf-8');

  // Duotone style
  const duotoneSvg = wrapDuotone(fill, outline);
  fs.writeFileSync(path.join(duotoneDir, `${name}.svg`), duotoneSvg, 'utf-8');

  count++;
}

console.log(`Generated ${count} icons x 2 styles = ${count * 2} SVGs`);
console.log(`  Outline: ${outlineDir}`);
console.log(`  Duotone: ${duotoneDir}`);
