// Agentic AI Kit v3: "Adaptive Spatial Neon" / Holographic Premium Quality
// Applies advanced Apple VisionOS / Linear / Teenage Engineering styling using CSS properties
// Features: Drop shadow, RGB Neon Blur Glow, Soft Duotone Fill, Solid Core, and Thin Rim Light.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Output directory
const outputDir = path.join(__dirname, 'svg-v3');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// V3 Super Premium Wrapper
const wrapV3 = (outline, fill) =>
`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
  <defs>
    <filter id="v3-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2" result="blur" />
    </filter>
    <linearGradient id="v3-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="var(--v3-grad-start, #FF4F00)" />
      <stop offset="100%" stop-color="var(--v3-grad-end, #7928CA)" />
    </linearGradient>
  </defs>

  <!-- Layer 1: Ambient Drop Shadow (Depth) -->
  <g stroke="var(--v3-shadow-col, #000)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" transform="translate(0, 1)" filter="url(#v3-glow)" opacity="0.6">
${outline}
  </g>

  <!-- Layer 2: Neon Bloom (Emission) -->
  <g stroke="url(#v3-grad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" filter="url(#v3-glow)" opacity="var(--v3-glow-opacity, 0.6)">
${outline}
  </g>

  <!-- Layer 3: Glassy Duotone Fill -->
  <g fill="url(#v3-grad)" opacity="var(--v3-fill-opacity, 0.15)">
${fill}
  </g>

  <!-- Layer 4: Solid Core Material (The actual icon structure) -->
  <g stroke="var(--v3-core-col, #ffffff)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
${outline}
  </g>

  <!-- Layer 5: Specular Rim Light (Tactile 3D Plastic/Metal bevel) -->
  <g stroke="var(--v3-rim-col, rgba(255,255,255,0.7))" stroke-width="0.5" stroke-linecap="round" stroke-linejoin="round" transform="translate(-0.35, -0.35)">
${outline}
  </g>
</svg>`;

// High quality V2 paths (same clean geometry)
const icons = {
  // ── CORE NAVIGATION (6) ────────────────────────────────
  'ai-home': {
    outline: `    <path d="M4 11.5l8-7 8 7"/>\n    <path d="M6 10v9a1 1 0 001 1h10a1 1 0 001-1v-9"/>\n    <path d="M10 20v-5a2 2 0 014 0v5"/>`,
    fill: `    <path d="M6 10v9a1 1 0 001 1h10a1 1 0 001-1v-9l-8-7z"/>`
  },
  'ai-search': {
    outline: `    <circle cx="10.5" cy="10.5" r="6.5"/>\n    <path d="M21 21l-4.5-4.5"/>\n    <path d="M8 10.5h5"/>\n    <path d="M10.5 8v5"/>`,
    fill: `    <circle cx="10.5" cy="10.5" r="6.5"/>`
  },
  'ai-settings': {
    outline: `    <path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/>\n    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1.08 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001.08 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.6.77 1.02 1.51 1.08H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/>`,
    fill: `    <circle cx="12" cy="12" r="3"/>`
  },
  'ai-history': {
    outline: `    <path d="M3 12a9 9 0 1018 0 9 9 0 00-18 0z"/>\n    <path d="M12 7v5l3 3"/>`,
    fill: `    <circle cx="12" cy="12" r="9"/>`
  },
  'ai-help': {
    outline: `    <circle cx="12" cy="12" r="9"/>\n    <path d="M9.5 9.5a2.5 2.5 0 015 0c0 1.5-2.5 2-2.5 3.5"/>\n    <circle cx="12" cy="17" r=".5" fill="var(--v3-core-col, #fff)" stroke="none"/>`,
    fill: `    <circle cx="12" cy="12" r="9"/>`
  },
  'ai-menu': {
    outline: `    <path d="M4 6h16"/>\n    <path d="M4 12h16"/>\n    <path d="M4 18h12"/>`,
    fill: `    <rect x="3" y="4" width="18" height="16" rx="2"/>`
  },

  // ── AGENT & WORKFLOW (8) ───────────────────────────────
  'agent': {
    outline: `    <circle cx="12" cy="8" r="4"/>\n    <path d="M5 20a7 7 0 0114 0"/>\n    <circle cx="12" cy="4" r="1" fill="var(--v3-core-col, #fff)" stroke="none"/>`,
    fill: `    <circle cx="12" cy="8" r="4"/>\n    <path d="M5 20a7 7 0 0114 0z"/>`
  },
  'agent-workflow': {
    outline: `    <circle cx="5" cy="5" r="2"/>\n    <circle cx="19" cy="5" r="2"/>\n    <circle cx="12" cy="19" r="2"/>\n    <path d="M7 5h10"/>\n    <path d="M5 7v5l7 5"/>\n    <path d="M19 7v5l-7 5"/>`,
    fill: `    <circle cx="5" cy="5" r="2"/>\n    <circle cx="19" cy="5" r="2"/>\n    <circle cx="12" cy="19" r="2"/>`
  },
  'agent-group': {
    outline: `    <circle cx="9" cy="7" r="3"/>\n    <circle cx="15" cy="7" r="3"/>\n    <path d="M3 20a6 6 0 0112 0"/>\n    <path d="M13 14.5A6 6 0 0121 20"/>`,
    fill: `    <circle cx="9" cy="7" r="3"/>\n    <circle cx="15" cy="7" r="3"/>\n    <path d="M3 20a6 6 0 0112 0z"/>\n    <path d="M13 14.5A6 6 0 0121 20z"/>`
  },
  'tool-use': {
    outline: `    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3-3a5 5 0 01-7 7l-8 8a2 2 0 01-2.8-2.8l8-8a5 5 0 017-7z"/>`,
    fill: `    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3-3a5 5 0 01-7 7l-8 8a2 2 0 01-2.8-2.8l8-8a5 5 0 017-7z"/>`
  },
  'chain': {
    outline: `    <path d="M10 14a3.5 3.5 0 005 0l3-3a3.5 3.5 0 00-5-5l-.5.5"/>\n    <path d="M14 10a3.5 3.5 0 00-5 0l-3 3a3.5 3.5 0 005 5l.5-.5"/>`,
    fill: `    <rect x="5" y="5" width="14" height="14" rx="4" transform="rotate(45 12 12)"/>`
  },
  'orchestrator': {
    outline: `    <circle cx="12" cy="12" r="3"/>\n    <path d="M12 2v4"/>\n    <path d="M12 18v4"/>\n    <path d="M4.93 4.93l2.83 2.83"/>\n    <path d="M16.24 16.24l2.83 2.83"/>\n    <path d="M2 12h4"/>\n    <path d="M18 12h4"/>\n    <path d="M4.93 19.07l2.83-2.83"/>\n    <path d="M16.24 7.76l2.83-2.83"/>`,
    fill: `    <circle cx="12" cy="12" r="5"/>`
  },
  'agent-loop': {
    outline: `    <path d="M17 2l4 4-4 4"/>\n    <path d="M3 11V9a4 4 0 014-4h14"/>\n    <path d="M7 22l-4-4 4-4"/>\n    <path d="M21 13v2a4 4 0 01-4 4H3"/>`,
    fill: `    <rect x="2" y="4" width="20" height="16" rx="4"/>`
  },
  'agent-stop': {
    outline: `    <circle cx="12" cy="8" r="4"/>\n    <path d="M5 20a7 7 0 0114 0"/>\n    <rect x="10" y="6" width="4" height="4" rx="1"/>`,
    fill: `    <circle cx="12" cy="8" r="4"/>\n    <path d="M5 20a7 7 0 0114 0z"/>`
  },

  // ── PROMPT & CONTEXT (7) ──────────────────────────────
  'prompt': {
    outline: `    <path d="M7 8l-3 4 3 4"/>\n    <path d="M17 8l3 4-3 4"/>\n    <path d="M14 4l-4 16"/>`,
    fill: `    <rect x="3" y="3" width="18" height="18" rx="3"/>`
  },
  'prompt-template': {
    outline: `    <rect x="4" y="3" width="16" height="18" rx="2"/>\n    <path d="M8 8h3"/>\n    <path d="M8 12h8"/>\n    <path d="M8 16h5"/>\n    <rect x="14" y="7" width="3" height="3" rx="0.5" fill="none"/>`,
    fill: `    <rect x="4" y="3" width="16" height="18" rx="2"/>`
  },
  'system-prompt': {
    outline: `    <rect x="3" y="4" width="18" height="16" rx="2"/>\n    <path d="M3 9h18"/>\n    <path d="M8 13l2 2 4-4"/>\n    <circle cx="6" cy="6.5" r=".75" fill="var(--v3-core-col, #fff)" stroke="none"/>\n    <circle cx="9" cy="6.5" r=".75" fill="var(--v3-core-col, #fff)" stroke="none"/>\n    <circle cx="12" cy="6.5" r=".75" fill="var(--v3-core-col, #fff)" stroke="none"/>`,
    fill: `    <rect x="3" y="4" width="18" height="16" rx="2"/>`
  },
  'context-window': {
    outline: `    <rect x="3" y="3" width="18" height="18" rx="2"/>\n    <path d="M3 9h18"/>\n    <path d="M3 15h18"/>\n    <path d="M9 3v18"/>`,
    fill: `    <rect x="3" y="3" width="18" height="18" rx="2"/>`
  },
  'conversation': {
    outline: `    <path d="M21 11.5a8.5 8.5 0 01-8.5 8.5 8.4 8.4 0 01-4-.98L3 21l2-5.5A8.5 8.5 0 1121 11.5z"/>\n    <path d="M8 11.5h.01"/>\n    <path d="M12 11.5h.01"/>\n    <path d="M16 11.5h.01"/>`,
    fill: `    <path d="M21 11.5a8.5 8.5 0 01-8.5 8.5 8.4 8.4 0 01-4-.98L3 21l2-5.5A8.5 8.5 0 1121 11.5z"/>`
  },
  'regenerate': {
    outline: `    <path d="M1 4v6h6"/>\n    <path d="M23 20v-6h-6"/>\n    <path d="M20.5 9A9 9 0 005 5.6L1 10"/>\n    <path d="M3.5 15A9 9 0 0019 18.4l4-4.4"/>`,
    fill: `    <circle cx="12" cy="12" r="7"/>`
  },
  'streaming': {
    outline: `    <circle cx="5" cy="12" r="1.5"/>\n    <circle cx="12" cy="12" r="1.5"/>\n    <circle cx="19" cy="12" r="1.5"/>`,
    fill: `    <circle cx="5" cy="12" r="3"/>\n    <circle cx="12" cy="12" r="3"/>\n    <circle cx="19" cy="12" r="3"/>`
  },

  // ── RAG & DATA (7) ────────────────────────────────────
  'embedding': {
    outline: `    <path d="M12 2v20"/>\n    <path d="M2 12h20"/>\n    <path d="M4.93 4.93l14.14 14.14"/>\n    <path d="M19.07 4.93L4.93 19.07"/>\n    <circle cx="12" cy="12" r="3"/>`,
    fill: `    <circle cx="12" cy="12" r="8"/>`
  },
  'chunk': {
    outline: `    <rect x="4" y="3" width="16" height="18" rx="2"/>\n    <path d="M4 9h16"/>\n    <path d="M4 15h16"/>`,
    fill: `    <rect x="4" y="3" width="16" height="18" rx="2"/>`
  },
  'retrieve': {
    outline: `    <circle cx="11" cy="11" r="6"/>\n    <path d="M20 20l-3.5-3.5"/>\n    <path d="M8 11h6"/>\n    <path d="M11 8v6"/>`,
    fill: `    <circle cx="11" cy="11" r="6"/>`
  },
  'rag-pipeline': {
    outline: `    <rect x="2" y="3" width="7" height="8" rx="1.5"/>\n    <circle cx="17.5" cy="7" r="3.5"/>\n    <path d="M9 7h4"/>\n    <path d="M14 14v-2l3.5-1.5"/>\n    <rect x="10" y="14" width="12" height="7" rx="1.5"/>`,
    fill: `    <rect x="2" y="3" width="7" height="8" rx="1.5"/>\n    <circle cx="17.5" cy="7" r="3.5"/>\n    <rect x="10" y="14" width="12" height="7" rx="1.5"/>`
  },
  'vector-db': {
    outline: `    <ellipse cx="12" cy="5.5" rx="8" ry="3.5"/>\n    <path d="M4 5.5v6c0 1.93 3.58 3.5 8 3.5s8-1.57 8-3.5v-6"/>\n    <path d="M4 11.5v6c0 1.93 3.58 3.5 8 3.5s8-1.57 8-3.5v-6"/>`,
    fill: `    <ellipse cx="12" cy="5.5" rx="8" ry="3.5"/>\n    <path d="M4 5.5v6c0 1.93 3.58 3.5 8 3.5s8-1.57 8-3.5v-6z"/>\n    <path d="M4 11.5v6c0 1.93 3.58 3.5 8 3.5s8-1.57 8-3.5v-6z"/>`
  },
  'knowledge-base': {
    outline: `    <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>\n    <path d="M4 4.5A2.5 2.5 0 016.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15z"/>\n    <path d="M8 7h8"/>\n    <path d="M8 11h5"/>`,
    fill: `    <path d="M4 4.5A2.5 2.5 0 016.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15z"/>`
  },
  'document-index': {
    outline: `    <rect x="4" y="3" width="16" height="18" rx="2"/>\n    <path d="M8 7h8"/>\n    <path d="M8 11h8"/>\n    <path d="M8 15h4"/>`,
    fill: `    <rect x="4" y="3" width="16" height="18" rx="2"/>`
  },

  // ── MODEL & CONFIG (6) ────────────────────────────────
  'model': {
    outline: `    <path d="M12 2a7 7 0 017 7c0 5-7 9-7 13 0-4-7-8-7-13a7 7 0 017-7z"/>\n    <path d="M12 12v-2"/>\n    <circle cx="12" cy="8" r="1" fill="var(--v3-core-col, #fff)" stroke="none"/>`,
    fill: `    <path d="M12 2a7 7 0 017 7c0 5-7 9-7 13 0-4-7-8-7-13a7 7 0 017-7z"/>`
  },
  'model-selector': {
    outline: `    <path d="M12 2a7 7 0 017 7c0 5-7 9-7 13 0-4-7-8-7-13a7 7 0 017-7z"/>\n    <path d="M9 20l3 2 3-2"/>`,
    fill: `    <path d="M12 2a7 7 0 017 7c0 5-7 9-7 13 0-4-7-8-7-13a7 7 0 017-7z"/>`
  },
  'temperature': {
    outline: `    <path d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z"/>\n    <circle cx="11.5" cy="17" r="2"/>\n    <path d="M11.5 11v6"/>`,
    fill: `    <path d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z"/>`
  },
  'token-counter': {
    outline: `    <rect x="2" y="4" width="20" height="16" rx="2"/>\n    <path d="M2 10h20"/>\n    <path d="M6 14h2"/>\n    <path d="M11 14h2"/>\n    <path d="M16 14h2"/>`,
    fill: `    <rect x="2" y="4" width="20" height="16" rx="2"/>`
  },
  'fine-tune': {
    outline: `    <path d="M4 8h3"/>\n    <path d="M11 8h9"/>\n    <circle cx="8.5" cy="8" r="2.5"/>\n    <path d="M4 16h9"/>\n    <path d="M17 16h3"/>\n    <circle cx="15.5" cy="16" r="2.5"/>`,
    fill: `    <circle cx="8.5" cy="8" r="2.5"/>\n    <circle cx="15.5" cy="16" r="2.5"/>`
  },
  'max-tokens': {
    outline: `    <rect x="3" y="9" width="18" height="6" rx="2"/>\n    <path d="M3 12h11"/>\n    <path d="M14 7v10"/>\n    <path d="M7 7v2"/>\n    <path d="M10 7v2"/>`,
    fill: `    <rect x="3" y="9" width="18" height="6" rx="2"/>`
  },

  // ── SAFETY & MONITORING (4) ───────────────────────────
  'guardrail': {
    outline: `    <path d="M12 2l8 4v6c0 5.25-3.5 10-8 12-4.5-2-8-6.75-8-12V6z"/>\n    <path d="M9 12l2 2 4-4"/>`,
    fill: `    <path d="M12 2l8 4v6c0 5.25-3.5 10-8 12-4.5-2-8-6.75-8-12V6z"/>`
  },
  'safety-filter': {
    outline: `    <path d="M22 3H2l8 9.5V19l4 2v-8.5z"/>`,
    fill: `    <path d="M22 3H2l8 9.5V19l4 2v-8.5z"/>`
  },
  'token-cost': {
    outline: `    <circle cx="12" cy="12" r="9"/>\n    <path d="M12 6v2"/>\n    <path d="M12 16v2"/>\n    <path d="M9 10a3 3 0 013-2c1.66 0 3 .67 3 2s-1.34 2-3 2-3 .67-3 2 1.34 2 3 2a3 3 0 003-2"/>`,
    fill: `    <circle cx="12" cy="12" r="9"/>`
  },
  'latency': {
    outline: `    <circle cx="12" cy="12" r="9"/>\n    <path d="M12 6v6l4 2"/>`,
    fill: `    <circle cx="12" cy="12" r="9"/>`
  },

  // ── STATUS & EMPTY STATES (2) ─────────────────────────
  'sparkle': {
    outline: `    <path d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5z"/>\n    <path d="M18 14l.75 2.25L21 17l-2.25.75L18 20l-.75-2.25L15 17l2.25-.75z"/>`,
    fill: `    <path d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5z"/>\n    <path d="M18 14l.75 2.25L21 17l-2.25.75L18 20l-.75-2.25L15 17l2.25-.75z"/>`
  },
  'empty-agent': {
    outline: `    <circle cx="12" cy="8" r="4" stroke-dasharray="4 3"/>\n    <path d="M5 20a7 7 0 0114 0" stroke-dasharray="4 3"/>`,
    fill: `    <circle cx="12" cy="8" r="4" opacity="0.06"/>\n    <path d="M5 20a7 7 0 0114 0z" opacity="0.06"/>`
  },
};

let count = 0;
for (const [name, { outline, fill }] of Object.entries(icons)) {
  const v3Svg = wrapV3(outline, fill);
  fs.writeFileSync(path.join(outputDir, `${name}.svg`), v3Svg, 'utf-8');
  count++;
}

console.log(`Generated ${count} V3 Premium SVGs in ${outputDir}`);
