// Generate duotone variants of all 40 Agentic AI Kit icons
// Duotone = outline strokes (primary) + soft fill areas (secondary, 15% opacity)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, 'svg-duotone');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const wrap = (secondary, primary) => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <g class="duotone-secondary" fill="currentColor" opacity="0.15" stroke="none">
${secondary}
  </g>
  <g class="duotone-primary">
${primary}
  </g>
</svg>`;

// Each icon: { secondary: fill shapes, primary: stroke shapes }
const icons = {
  // === Core Navigation ===
  'ai-home': {
    secondary: `    <path d="M5 10v9a1 1 0 001 1h12a1 1 0 001-1v-9l-7-6z"/>`,
    primary: `    <path d="M3 12l9-8 9 8"/>
    <path d="M5 10v9a1 1 0 001 1h12a1 1 0 001-1v-9"/>
    <circle cx="18" cy="5" r="2"/>
    <path d="M17 4l2 2"/>`
  },
  'ai-search': {
    secondary: `    <circle cx="11" cy="11" r="7"/>`,
    primary: `    <circle cx="11" cy="11" r="7"/>
    <path d="M21 21l-4.35-4.35"/>
    <circle cx="9" cy="9" r="1" fill="currentColor" stroke="none"/>
    <circle cx="13" cy="9" r="1" fill="currentColor" stroke="none"/>
    <path d="M9 9l2 2 2-2"/>`
  },
  'ai-settings': {
    secondary: `    <circle cx="12" cy="12" r="5"/>`,
    primary: `    <circle cx="12" cy="12" r="3"/>
    <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41"/>
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>`
  },
  'ai-history': {
    secondary: `    <circle cx="12" cy="12" r="9"/>`,
    primary: `    <circle cx="12" cy="12" r="9"/>
    <path d="M12 7v5l3 3"/>
    <path d="M16.5 5.5l1.5-1.5"/>
    <circle cx="18.5" cy="3.5" r="1.5"/>`
  },
  'ai-help': {
    secondary: `    <circle cx="12" cy="12" r="9"/>`,
    primary: `    <circle cx="12" cy="12" r="9"/>
    <path d="M9.5 9a3 3 0 015 1c0 2-3 3-3 3"/>
    <circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="none"/>`
  },
  'ai-menu': {
    secondary: `    <rect x="3" y="4" width="18" height="16" rx="3"/>`,
    primary: `    <path d="M4 6h16M4 12h16M4 18h16"/>
    <circle cx="20" cy="6" r="1.5"/>
    <circle cx="20" cy="12" r="1.5"/>`
  },

  // === Agent and Workflow ===
  'agent': {
    secondary: `    <circle cx="12" cy="8" r="4"/>
    <path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6z"/>`,
    primary: `    <circle cx="12" cy="8" r="4"/>
    <path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/>
    <circle cx="9" cy="7" r="0.5" fill="currentColor" stroke="none"/>
    <circle cx="15" cy="7" r="0.5" fill="currentColor" stroke="none"/>
    <path d="M12 4V2m-3.5 3.5L7 4m7 1.5L15.5 4"/>`
  },
  'agent-workflow': {
    secondary: `    <circle cx="5" cy="5" r="2.5"/>
    <circle cx="19" cy="5" r="2.5"/>
    <circle cx="12" cy="19" r="2.5"/>`,
    primary: `    <circle cx="5" cy="5" r="2.5"/>
    <circle cx="19" cy="5" r="2.5"/>
    <circle cx="12" cy="19" r="2.5"/>
    <path d="M7.5 5h9M5 7.5l7 9M19 7.5l-7 9"/>`
  },
  'agent-group': {
    secondary: `    <circle cx="8" cy="7" r="3"/>
    <circle cx="16" cy="7" r="3"/>
    <path d="M4 19c0-2.8 1.8-5 4-5s4 2.2 4 5z"/>
    <path d="M12 19c0-2.8 1.8-5 4-5s4 2.2 4 5z"/>`,
    primary: `    <circle cx="8" cy="7" r="3"/>
    <circle cx="16" cy="7" r="3"/>
    <path d="M4 19c0-2.8 1.8-5 4-5s4 2.2 4 5"/>
    <path d="M12 19c0-2.8 1.8-5 4-5s4 2.2 4 5"/>
    <path d="M10 4l2-2 2 2"/>`
  },
  'tool-use': {
    secondary: `    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3-3a5 5 0 01-7 7l-7.4 7.4a2.1 2.1 0 01-3-3L10.7 13a5 5 0 017-7l-3 3z"/>`,
    primary: `    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3-3a5 5 0 01-7 7l-7.4 7.4a2.1 2.1 0 01-3-3L10.7 13a5 5 0 017-7l-3 3z"/>
    <circle cx="17" cy="17" r="1.5"/>
    <path d="M17 15.5v-1m0 5v-1"/>`
  },
  'chain': {
    secondary: `    <rect x="8" y="5" width="8" height="8" rx="4" transform="rotate(45 12 9)"/>`,
    primary: `    <path d="M10 13a5 5 0 007.5.5l1-1a5 5 0 00-7-7l-1 1"/>
    <path d="M14 11a5 5 0 00-7.5-.5l-1 1a5 5 0 007 7l1-1"/>
    <path d="M18 3l3 3m-3 0l3-3"/>`
  },
  'orchestrator': {
    secondary: `    <circle cx="12" cy="12" r="4"/>`,
    primary: `    <circle cx="12" cy="12" r="3"/>
    <circle cx="12" cy="3" r="1.5"/>
    <circle cx="20" cy="8" r="1.5"/>
    <circle cx="20" cy="16" r="1.5"/>
    <circle cx="12" cy="21" r="1.5"/>
    <circle cx="4" cy="16" r="1.5"/>
    <circle cx="4" cy="8" r="1.5"/>
    <path d="M12 4.5v4.5m0 6v4.5M14.6 10.2l4-2.8M14.6 13.8l4 2.8M9.4 10.2l-4-2.8M9.4 13.8l-4 2.8"/>`
  },
  'agent-loop': {
    secondary: `    <circle cx="12" cy="12" r="3"/>`,
    primary: `    <path d="M17 3l4 4-4 4"/>
    <path d="M3 11V9a4 4 0 014-4h14"/>
    <path d="M7 21l-4-4 4-4"/>
    <path d="M21 13v2a4 4 0 01-4 4H3"/>
    <circle cx="12" cy="12" r="2"/>`
  },
  'agent-stop': {
    secondary: `    <circle cx="12" cy="8" r="4"/>
    <path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6z"/>`,
    primary: `    <circle cx="12" cy="8" r="4"/>
    <path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/>
    <rect x="10" y="6" width="4" height="4" rx="0.5"/>`
  },

  // === Prompt and Context ===
  'prompt': {
    secondary: `    <rect x="4" y="3" width="16" height="18" rx="2"/>`,
    primary: `    <path d="M7 4h-1a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1"/>
    <path d="M9 12l2 2 4-4"/>
    <path d="M8 4h8v2a1 1 0 01-1 1H9a1 1 0 01-1-1V4z"/>`
  },
  'prompt-template': {
    secondary: `    <rect x="4" y="3" width="16" height="18" rx="2"/>`,
    primary: `    <rect x="4" y="3" width="16" height="18" rx="2"/>
    <path d="M8 8h3m-3 4h8m-8 4h5"/>
    <path d="M14 8h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1V9a1 1 0 011-1z"/>`
  },
  'system-prompt': {
    secondary: `    <rect x="3" y="4" width="18" height="16" rx="2"/>`,
    primary: `    <rect x="3" y="4" width="18" height="16" rx="2"/>
    <path d="M7 12h4m-4 4h10"/>
    <path d="M3 8h18"/>
    <circle cx="6" cy="6" r="0.75" fill="currentColor" stroke="none"/>
    <circle cx="9" cy="6" r="0.75" fill="currentColor" stroke="none"/>`
  },
  'context-window': {
    secondary: `    <rect x="4" y="3" width="16" height="18" rx="2"/>`,
    primary: `    <rect x="4" y="3" width="16" height="18" rx="2"/>
    <path d="M4 9h16"/>
    <path d="M4 15h16"/>
    <path d="M8 6v12"/>
    <path d="M16 6v12"/>`
  },
  'conversation': {
    secondary: `    <path d="M21 12a9 9 0 01-9 9 9.8 9.8 0 01-4.26-.98L3 21l1.26-3.76A9 9 0 1121 12z"/>`,
    primary: `    <path d="M21 12a9 9 0 01-9 9 9.8 9.8 0 01-4.26-.98L3 21l1.26-3.76A9 9 0 1121 12z"/>
    <circle cx="8" cy="12" r="1" fill="currentColor" stroke="none"/>
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>
    <circle cx="16" cy="12" r="1" fill="currentColor" stroke="none"/>`
  },
  'regenerate': {
    secondary: `    <circle cx="12" cy="12" r="3"/>`,
    primary: `    <path d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74"/>
    <path d="M21 3v6h-6"/>
    <path d="M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74"/>
    <path d="M3 21v-6h6"/>
    <circle cx="12" cy="12" r="2"/>`
  },
  'streaming': {
    secondary: `    <circle cx="4" cy="12" r="2.5"/>
    <circle cx="10" cy="12" r="2.5"/>
    <circle cx="16" cy="12" r="2.5"/>`,
    primary: `    <circle cx="4" cy="12" r="1.5"/>
    <circle cx="10" cy="12" r="1.5"/>
    <circle cx="16" cy="12" r="1.5"/>
    <path d="M19 12h2"/>
    <path d="M20 10v4"/>`
  },

  // === RAG and Data ===
  'embedding': {
    secondary: `    <polygon points="12,3 19,8 19,16 12,21 5,16 5,8"/>`,
    primary: `    <path d="M12 3v18"/>
    <path d="M5 8l7 4 7-4"/>
    <path d="M5 16l7-4 7 4"/>`
  },
  'chunk': {
    secondary: `    <rect x="4" y="3" width="16" height="18" rx="2"/>`,
    primary: `    <rect x="4" y="3" width="16" height="18" rx="2"/>
    <path d="M4 9h16M4 15h16"/>
    <path d="M9 3v18"/>`
  },
  'retrieve': {
    secondary: `    <circle cx="11" cy="11" r="5"/>`,
    primary: `    <circle cx="11" cy="11" r="5"/>
    <path d="M21 21l-4.35-4.35"/>
    <path d="M11 8v6m-3-3h6"/>`
  },
  'rag-pipeline': {
    secondary: `    <rect x="2" y="4" width="6" height="7" rx="1"/>
    <circle cx="14" cy="7.5" r="3"/>
    <rect x="16" y="14" width="6" height="7" rx="1"/>`,
    primary: `    <rect x="2" y="4" width="6" height="7" rx="1"/>
    <path d="M8 7.5h3"/>
    <circle cx="14" cy="7.5" r="3"/>
    <path d="M17 7.5h3"/>
    <rect x="16" y="14" width="6" height="7" rx="1"/>
    <path d="M14 10.5v4l5 3"/>`
  },
  'vector-db': {
    secondary: `    <path d="M4 6c0 1.66 3.58 3 8 3s8-1.34 8-3-3.58-3-8-3-8 1.34-8 3z"/>
    <path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3"/>
    <path d="M4 18c0 1.66 3.58 3 8 3s8-1.34 8-3"/>`,
    primary: `    <ellipse cx="12" cy="6" rx="8" ry="3"/>
    <path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6"/>
    <path d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6"/>
    <path d="M12 9l3 3-3 3"/>`
  },
  'knowledge-base': {
    secondary: `    <path d="M4 4.5A2.5 2.5 0 016.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15z"/>`,
    primary: `    <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
    <path d="M4 4.5A2.5 2.5 0 016.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15z"/>
    <circle cx="12" cy="10" r="3"/>
    <path d="M9 10l1.5 1.5L12 10l1.5 1.5L15 10"/>`
  },
  'document-index': {
    secondary: `    <rect x="4" y="3" width="16" height="18" rx="2"/>`,
    primary: `    <rect x="4" y="3" width="16" height="18" rx="2"/>
    <path d="M8 7h8M8 11h8M8 15h4"/>
    <path d="M16 14l2 2-2 2"/>`
  },

  // === Model and Configuration ===
  'model': {
    secondary: `    <path d="M12 3a6 6 0 016 6c0 4-6 8-6 12-0-4-6-8-6-12a6 6 0 016-6z"/>`,
    primary: `    <path d="M12 3a6 6 0 016 6c0 4-6 8-6 12-0-4-6-8-6-12a6 6 0 016-6z"/>
    <circle cx="10" cy="9" r="0.5" fill="currentColor" stroke="none"/>
    <circle cx="14" cy="9" r="0.5" fill="currentColor" stroke="none"/>
    <path d="M10 12h4"/>`
  },
  'model-selector': {
    secondary: `    <circle cx="12" cy="10" r="6"/>`,
    primary: `    <circle cx="12" cy="10" r="6"/>
    <path d="M10 9h4m-2-2v4"/>
    <path d="M9 19l3 3 3-3"/>`
  },
  'temperature': {
    secondary: `    <circle cx="12" cy="17" r="4"/>`,
    primary: `    <path d="M12 17a4 4 0 100-2.83"/>
    <rect x="10" y="2" width="4" height="14" rx="2"/>
    <path d="M12 6v8"/>
    <path d="M7 7h2m-2 4h2"/>`
  },
  'token-counter': {
    secondary: `    <rect x="3" y="4" width="18" height="16" rx="2"/>`,
    primary: `    <rect x="3" y="4" width="18" height="16" rx="2"/>
    <path d="M7 9h2v6H7M10 9h2v6h-2M13 9h2v6h-2M16 9h1.5"/>
    <path d="M3 14h18"/>`
  },
  'fine-tune': {
    secondary: `    <circle cx="10" cy="8" r="3"/>
    <circle cx="14" cy="16" r="3"/>`,
    primary: `    <path d="M4 8h4m4 0h8"/>
    <path d="M4 16h8m4 0h4"/>
    <circle cx="10" cy="8" r="2"/>
    <circle cx="14" cy="16" r="2"/>
    <path d="M19 3l2 2-2 2"/>`
  },
  'max-tokens': {
    secondary: `    <rect x="3" y="10" width="18" height="4" rx="1"/>`,
    primary: `    <rect x="3" y="10" width="18" height="4" rx="1"/>
    <path d="M3 12h12"/>
    <path d="M15 8v8"/>
    <path d="M7 7v2m5-2v2"/>`
  },

  // === Safety and Monitoring ===
  'guardrail': {
    secondary: `    <path d="M12 2l8 4v6c0 5.25-3.5 10-8 12-4.5-2-8-6.75-8-12V6l8-4z"/>`,
    primary: `    <path d="M12 2l8 4v6c0 5.25-3.5 10-8 12-4.5-2-8-6.75-8-12V6l8-4z"/>
    <path d="M8 12h8M8 9h8"/>`
  },
  'safety-filter': {
    secondary: `    <path d="M4 4h16l-6 7v5l-4 2V11L4 4z"/>`,
    primary: `    <path d="M4 4h16l-6 7v5l-4 2V11L4 4z"/>
    <path d="M14 17l2 2 4-4"/>`
  },
  'token-cost': {
    secondary: `    <circle cx="12" cy="12" r="9"/>`,
    primary: `    <circle cx="12" cy="12" r="9"/>
    <path d="M12 6v2m0 8v2"/>
    <path d="M9 10c0-1.66 1.34-2 3-2s3 .34 3 2-1.34 2-3 2-3 .34-3 2 1.34 2 3 2"/>`
  },
  'latency': {
    secondary: `    <circle cx="12" cy="12" r="9"/>`,
    primary: `    <circle cx="12" cy="12" r="9"/>
    <path d="M12 7v5l-3 3"/>
    <path d="M16.5 7.5l1 1m-11 8l1 1"/>
    <path d="M3.5 12H5m14 0h1.5"/>`
  },

  // === Status and Empty States ===
  'sparkle': {
    secondary: `    <path d="M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>`,
    primary: `    <path d="M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>
    <path d="M5 5l1 3 3 1-3 1-1 3-1-3-3-1 3-1z"/>`
  },
  'empty-agent': {
    secondary: `    <circle cx="12" cy="8" r="4" opacity="0.08"/>
    <path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6z" opacity="0.08"/>`,
    primary: `    <circle cx="12" cy="8" r="4" stroke-dasharray="3 2"/>
    <path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke-dasharray="3 2"/>
    <path d="M12 12v2m-2-1h4"/>`
  },
};

let count = 0;
for (const [name, { secondary, primary }] of Object.entries(icons)) {
  const svg = wrap(secondary, primary);
  fs.writeFileSync(path.join(outDir, `${name}.svg`), svg, 'utf-8');
  count++;
}

console.log(`Generated ${count} duotone SVG icons in ${outDir}`);
