// Agentic AI Kit: FROST Theme (Glassmorphism)
// Base shapes: Phosphor Icons (MIT, 256x256 grid)
// Visual style: Frosted glass with layered gradients, inner glow, soft shadows
// This is ORIGINAL STYLING applied to MIT-licensed icon geometry

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, 'svg-frost');
fs.mkdirSync(outDir, { recursive: true });

// ═══════════════════════════════════════════════════════════════════
// COLOR PALETTE: Cool blues + purples for "frost" feel
// ═══════════════════════════════════════════════════════════════════
const groups = {
  'Core Navigation':         { bg1: '#1e3a5f', bg2: '#0d1b2a', accent: '#64B5F6', glow: '#90CAF9' },
  'Agent and Workflow':      { bg1: '#2d1b4e', bg2: '#1a0e2e', accent: '#B39DDB', glow: '#CE93D8' },
  'Prompt and Context':      { bg1: '#1a3347', bg2: '#0d1f30', accent: '#4FC3F7', glow: '#81D4FA' },
  'RAG and Data':            { bg1: '#1b3c3f', bg2: '#0d2224', accent: '#4DB6AC', glow: '#80CBC4' },
  'Model and Configuration': { bg1: '#2e1f4d', bg2: '#1a1030', accent: '#9575CD', glow: '#B39DDB' },
  'Safety and Monitoring':   { bg1: '#3e1f2d', bg2: '#240f1a', accent: '#F48FB1', glow: '#F8BBD0' },
  'Status and Empty States': { bg1: '#1e3a5f', bg2: '#0d1b2a', accent: '#64B5F6', glow: '#90CAF9' },
};

// ═══════════════════════════════════════════════════════════════════
// PHOSPHOR ICON PATHS (MIT licensed, 256x256 viewBox)
// ═══════════════════════════════════════════════════════════════════
const icons = {
  'ai-home':         { group: 'Core Navigation', path: `M224 120v96a8 8 0 0 1-8 8h-56a8 8 0 0 1-8-8v-52a4 4 0 0 0-4-4h-40a4 4 0 0 0-4 4v52a8 8 0 0 1-8 8H40a8 8 0 0 1-8-8v-96a16 16 0 0 1 4.69-11.31l80-80a16 16 0 0 1 22.62 0l80 80A16 16 0 0 1 224 120` },
  'ai-search':       { group: 'Core Navigation', path: `M232.49 215.51L185 168a92.12 92.12 0 1 0-17 17l47.53 47.54a12 12 0 0 0 17-17ZM44 112a68 68 0 1 1 68 68a68.07 68.07 0 0 1-68-68` },
  'ai-settings':     { group: 'Core Navigation', path: `M216 130.16q.06-2.16 0-4.32l14.92-18.64a8 8 0 0 0 1.48-7.06a107.6 107.6 0 0 0-10.88-26.25a8 8 0 0 0-6-3.93l-23.72-2.64q-1.48-1.56-3-3L186 40.54a8 8 0 0 0-3.94-6a107.3 107.3 0 0 0-26.25-10.86a8 8 0 0 0-7.06 1.48L130.16 40h-4.32L107.2 25.11a8 8 0 0 0-7.06-1.48a107.6 107.6 0 0 0-26.25 10.88a8 8 0 0 0-3.93 6l-2.64 23.76q-1.56 1.49-3 3L40.54 70a8 8 0 0 0-6 3.94a107.7 107.7 0 0 0-10.87 26.25a8 8 0 0 0 1.49 7.06L40 125.84v4.32L25.11 148.8a8 8 0 0 0-1.48 7.06a107.6 107.6 0 0 0 10.88 26.25a8 8 0 0 0 6 3.93l23.72 2.64q1.49 1.56 3 3L70 215.46a8 8 0 0 0 3.94 6a107.7 107.7 0 0 0 26.25 10.87a8 8 0 0 0 7.06-1.49L125.84 216q2.16.06 4.32 0l18.64 14.92a8 8 0 0 0 7.06 1.48a107.2 107.2 0 0 0 26.25-10.88a8 8 0 0 0 3.93-6l2.64-23.72q1.56-1.48 3-3l23.78-2.8a8 8 0 0 0 6-3.94a107.7 107.7 0 0 0 10.87-26.25a8 8 0 0 0-1.49-7.06ZM128 168a40 40 0 1 1 40-40a40 40 0 0 1-40 40` },
  'ai-history':      { group: 'Core Navigation', path: `M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24m56 112h-56a8 8 0 0 1-8-8V72a8 8 0 0 1 16 0v48h48a8 8 0 0 1 0 16` },
  'agent':           { group: 'Agent and Workflow', path: `M200 48h-64V16a8 8 0 0 0-16 0v32H56a32 32 0 0 0-32 32v112a32 32 0 0 0 32 32h144a32 32 0 0 0 32-32V80a32 32 0 0 0-32-32m-28 48a12 12 0 1 1-12 12a12 12 0 0 1 12-12m-76 88H80a16 16 0 0 1 0-32h16Zm-12-64a12 12 0 1 1 12-12a12 12 0 0 1-12 12m60 64h-32v-32h32Zm32 0h-16v-32h16a16 16 0 0 1 0 32` },
  'tool-use':        { group: 'Agent and Workflow', path: `M232 96a72 72 0 0 1-100.94 66L79 222.22c-.12.14-.26.29-.39.42a32 32 0 0 1-45.26-45.26c.14-.13.28-.27.43-.39L94 124.94a72.07 72.07 0 0 1 83.54-98.78a8 8 0 0 1 3.93 13.19L144 80l5.66 26.35L176 112l40.65-37.52a8 8 0 0 1 13.19 3.93A72.6 72.6 0 0 1 232 96` },
  'chain':           { group: 'Agent and Workflow', path: `M117.18 188.74a12 12 0 0 1 0 17l-5.12 5.12A58.26 58.26 0 0 1 70.6 228a58.62 58.62 0 0 1-41.46-100.08l34.75-34.75a58.64 58.64 0 0 1 98.56 28.11a12 12 0 1 1-23.37 5.44a34.65 34.65 0 0 0-58.22-16.58l-34.75 34.75A34.62 34.62 0 0 0 70.57 204a34.4 34.4 0 0 0 24.49-10.14l5.11-5.12a12 12 0 0 1 17.01 0M226.83 45.17a58.65 58.65 0 0 0-82.93 0l-5.11 5.11a12 12 0 0 0 17 17l5.12-5.12a34.63 34.63 0 1 1 49 49l-34.81 34.7A34.4 34.4 0 0 1 150.61 156a34.63 34.63 0 0 1-33.69-26.72a12 12 0 0 0-23.38 5.44A58.64 58.64 0 0 0 150.56 180h.05a58.28 58.28 0 0 0 41.47-17.17l34.75-34.75a58.62 58.62 0 0 0 0-82.91` },
  'orchestrator':    { group: 'Agent and Workflow', path: `M232 120h-8.34A96.14 96.14 0 0 0 136 32.34V24a8 8 0 0 0-16 0v8.34A96.14 96.14 0 0 0 32.34 120H24a8 8 0 0 0 0 16h8.34A96.14 96.14 0 0 0 120 223.66V232a8 8 0 0 0 16 0v-8.34A96.14 96.14 0 0 0 223.66 136H232a8 8 0 0 0 0-16m-32 16h7.6a80.15 80.15 0 0 1-71.6 71.6V200a8 8 0 0 0-16 0v7.6A80.15 80.15 0 0 1 48.4 136H56a8 8 0 0 0 0-16h-7.6A80.15 80.15 0 0 1 120 48.4V56a8 8 0 0 0 16 0v-7.6a80.15 80.15 0 0 1 71.6 71.6H200a8 8 0 0 0 0 16m-32-8a40 40 0 1 1-40-40a40 40 0 0 1 40 40` },
  'prompt':          { group: 'Prompt and Context', path: `M71.68 97.22L34.74 128l36.94 30.78a12 12 0 1 1-15.36 18.44l-48-40a12 12 0 0 1 0-18.44l48-40a12 12 0 0 1 15.36 18.44m176 21.56l-48-40a12 12 0 1 0-15.36 18.44L221.26 128l-36.94 30.78a12 12 0 1 0 15.36 18.44l48-40a12 12 0 0 0 0-18.44M164.1 28.72a12 12 0 0 0-15.38 7.18l-64 176a12 12 0 0 0 7.18 15.37a11.8 11.8 0 0 0 4.1.73a12 12 0 0 0 11.28-7.9l64-176a12 12 0 0 0-7.18-15.38` },
  'conversation':    { group: 'Prompt and Context', path: `M128 24a104 104 0 0 0-91.82 152.88l-11.35 34.05a16 16 0 0 0 20.24 20.24l34.05-11.35A104 104 0 1 0 128 24M84 140a12 12 0 1 1 12-12a12 12 0 0 1-12 12m44 0a12 12 0 1 1 12-12a12 12 0 0 1-12 12m44 0a12 12 0 1 1 12-12a12 12 0 0 1-12 12` },
  'system-prompt':   { group: 'Prompt and Context', path: `M216 40H40a16 16 0 0 0-16 16v144a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V56a16 16 0 0 0-16-16m-91 94.25l-40 32a8 8 0 1 1-10-12.5L107.19 128L75 102.25a8 8 0 1 1 10-12.5l40 32a8 8 0 0 1 0 12.5M176 168h-40a8 8 0 0 1 0-16h40a8 8 0 0 1 0 16` },
  'embedding':       { group: 'RAG and Data', path: `M232 120h-8.34A96.14 96.14 0 0 0 136 32.34V24a8 8 0 0 0-16 0v8.34A96.14 96.14 0 0 0 32.34 120H24a8 8 0 0 0 0 16h8.34A96.14 96.14 0 0 0 120 223.66V232a8 8 0 0 0 16 0v-8.34A96.14 96.14 0 0 0 223.66 136H232a8 8 0 0 0 0-16m-32 16h7.6a80.15 80.15 0 0 1-71.6 71.6V200a8 8 0 0 0-16 0v7.6A80.15 80.15 0 0 1 48.4 136H56a8 8 0 0 0 0-16h-7.6A80.15 80.15 0 0 1 120 48.4V56a8 8 0 0 0 16 0v-7.6a80.15 80.15 0 0 1 71.6 71.6H200a8 8 0 0 0 0 16m-32-8a40 40 0 1 1-40-40a40 40 0 0 1 40 40` },
  'vector-db':       { group: 'RAG and Data', path: `M128 24c-53.83 0-96 24.6-96 56v96c0 31.4 42.17 56 96 56s96-24.6 96-56V80c0-31.4-42.17-56-96-56m80 104c0 9.62-7.88 19.43-21.61 26.92C170.93 163.35 150.19 168 128 168s-42.93-4.65-58.39-13.08C55.88 147.43 48 137.62 48 128v-16.64c17.06 15 46.23 24.64 80 24.64s62.94-9.68 80-24.64Zm-21.61 74.92C170.93 211.35 150.19 216 128 216s-42.93-4.65-58.39-13.08C55.88 195.43 48 185.62 48 176v-16.64c17.06 15 46.23 24.64 80 24.64s62.94-9.68 80-24.64V176c0 9.62-7.88 19.43-21.61 26.92` },
  'knowledge-base':  { group: 'RAG and Data', path: `M240 56v144a8 8 0 0 1-8 8h-72a24 24 0 0 0-24 23.94a7.9 7.9 0 0 1-5.12 7.55A8 8 0 0 1 120 232a24 24 0 0 0-24-24H24a8 8 0 0 1-8-8V56a8 8 0 0 1 8-8h64a32 32 0 0 1 32 32v87.73a8.17 8.17 0 0 0 7.47 8.25a8 8 0 0 0 8.53-8V80a32 32 0 0 1 32-32h64a8 8 0 0 1 8 8` },
  'model':           { group: 'Model and Configuration', path: `M212 76v-4a44 44 0 0 0-74.86-31.31a3.93 3.93 0 0 0-1.14 2.8v88.72a4 4 0 0 0 6.2 3.33a47.67 47.67 0 0 1 25.48-7.54a8.18 8.18 0 0 1 8.31 7.58a8 8 0 0 1-8 8.42a32 32 0 0 0-32 32v33.88a4 4 0 0 0 1.49 3.12a47.92 47.92 0 0 0 74.21-17.16a4 4 0 0 0-4.49-5.56A68 68 0 0 1 192 192h-7.73a8.18 8.18 0 0 1-8.25-7.47a8 8 0 0 1 8-8.53h8a51.6 51.6 0 0 0 24-5.88A52 52 0 0 0 212 76m-12 36h-4a36 36 0 0 1-36-36v-4a8 8 0 0 1 16 0v4a20 20 0 0 0 20 20h4a8 8 0 0 1 0 16M88 28a44.05 44.05 0 0 0-44 44v4a52 52 0 0 0-4 94.12A51.6 51.6 0 0 0 64 176h7.73a8.18 8.18 0 0 1 8.27 7.47a8 8 0 0 1-8 8.53h-8a67.5 67.5 0 0 1-15.21-1.73a4 4 0 0 0-4.5 5.55A47.93 47.93 0 0 0 118.51 213a4 4 0 0 0 1.49-3.12V176a32 32 0 0 0-32-32a8 8 0 0 1-8-8.42a8.18 8.18 0 0 1 8.32-7.58a47.67 47.67 0 0 1 25.48 7.54a4 4 0 0 0 6.2-3.33V43.49a4 4 0 0 0-1.14-2.81A43.85 43.85 0 0 0 88 28m8 48a36 36 0 0 1-36 36h-4a8 8 0 0 1 0-16h4a20 20 0 0 0 20-20v-4a8 8 0 0 1 16 0Z` },
  'sparkle':         { group: 'Model and Configuration', path: `M208 144a15.78 15.78 0 0 1-10.42 14.94L146 178l-19 51.62a15.92 15.92 0 0 1-29.88 0L78 178l-51.62-19a15.92 15.92 0 0 1 0-29.88L78 110l19-51.62a15.92 15.92 0 0 1 29.88 0L146 110l51.62 19A15.78 15.78 0 0 1 208 144m-56-96h16v16a8 8 0 0 0 16 0V48h16a8 8 0 0 0 0-16h-16V16a8 8 0 0 0-16 0v16h-16a8 8 0 0 0 0 16m88 32h-8v-8a8 8 0 0 0-16 0v8h-8a8 8 0 0 0 0 16h8v8a8 8 0 0 0 16 0v-8h8a8 8 0 0 0 0-16` },
  'guardrail':       { group: 'Safety and Monitoring', path: `M208 40H48a16 16 0 0 0-16 16v56c0 52.72 25.52 84.67 46.93 102.19c23.06 18.86 46 25.26 47 25.53a8 8 0 0 0 4.2 0c1-.27 23.91-6.67 47-25.53C198.48 196.67 224 164.72 224 112V56a16 16 0 0 0-16-16m-34.32 69.66l-56 56a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L112 148.69l50.34-50.35a8 8 0 0 1 11.32 11.32Z` },
  'latency':         { group: 'Safety and Monitoring', path: `M221.87 90.86a4 4 0 0 0-6.17-.62l-75.42 75.42A8 8 0 0 1 129 154.35l92.7-92.69a8 8 0 0 0-11.32-11.32L197 63.73A112.05 112.05 0 0 0 22.34 189.25A16.09 16.09 0 0 0 37.46 200h181.07a16 16 0 0 0 15.11-10.71a112.28 112.28 0 0 0-11.77-98.43M57.44 166.41a8 8 0 0 1-6.25 9.43a8 8 0 0 1-1.6.16a8 8 0 0 1-7.83-6.41A88.06 88.06 0 0 1 143.59 65.38a8 8 0 0 1-2.82 15.75a72.07 72.07 0 0 0-83.33 85.28` },
};

// ═══════════════════════════════════════════════════════════════════
// FROST THEME SVG GENERATOR
// 5-layer glassmorphism: shadow -> glass bg -> inner glow -> icon -> specular
// ═══════════════════════════════════════════════════════════════════
function generateFrost(name, icon) {
  const g = groups[icon.group];
  const uid = name.replace(/[^a-z0-9]/g, '');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
  <defs>
    <!-- Glass background gradient -->
    <linearGradient id="${uid}_bg" x1="20" y1="8" x2="100" y2="112" gradientUnits="userSpaceOnUse">
      <stop stop-color="${g.bg1}" stop-opacity="0.85"/>
      <stop offset="1" stop-color="${g.bg2}" stop-opacity="0.95"/>
    </linearGradient>
    <!-- Border gradient (frosted edge) -->
    <linearGradient id="${uid}_border" x1="60" y1="4" x2="60" y2="116" gradientUnits="userSpaceOnUse">
      <stop stop-color="#fff" stop-opacity="0.2"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0.05"/>
    </linearGradient>
    <!-- Inner glow -->
    <radialGradient id="${uid}_glow" cx="60" cy="50" r="50" gradientUnits="userSpaceOnUse">
      <stop stop-color="${g.glow}" stop-opacity="0.15"/>
      <stop offset="1" stop-color="${g.glow}" stop-opacity="0"/>
    </radialGradient>
    <!-- Specular highlight (top shine) -->
    <linearGradient id="${uid}_shine" x1="60" y1="4" x2="60" y2="64" gradientUnits="userSpaceOnUse">
      <stop stop-color="#fff" stop-opacity="0.12"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <!-- Clip for squircle -->
    <clipPath id="${uid}_clip">
      <rect x="4" y="4" width="112" height="112" rx="26"/>
    </clipPath>
    <!-- Drop shadow filter -->
    <filter id="${uid}_shadow" x="-20%" y="-10%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="${g.accent}" flood-opacity="0.25"/>
    </filter>
  </defs>

  <!-- Layer 1: Ambient shadow -->
  <rect x="4" y="4" width="112" height="112" rx="26" fill="transparent" filter="url(#${uid}_shadow)"/>

  <!-- Layer 2: Glass background -->
  <rect x="4" y="4" width="112" height="112" rx="26" fill="url(#${uid}_bg)"/>

  <!-- Layer 3: Frosted border -->
  <rect x="4" y="4" width="112" height="112" rx="26" fill="none" stroke="url(#${uid}_border)" stroke-width="1"/>

  <!-- Layer 4: Inner glow -->
  <circle cx="60" cy="50" r="50" fill="url(#${uid}_glow)" clip-path="url(#${uid}_clip)"/>

  <!-- Layer 5: Specular top shine -->
  <rect x="4" y="4" width="112" height="56" fill="url(#${uid}_shine)" clip-path="url(#${uid}_clip)"/>

  <!-- Layer 6: Icon (scaled from 256x256 to 64x64, centered in glass) -->
  <g transform="translate(28, 28) scale(0.25)" fill="${g.accent}" fill-opacity="0.9">
    <path d="${icon.path}"/>
  </g>
</svg>`;
}

// ═══════════════════════════════════════════════════════════════════
// GENERATE ALL
// ═══════════════════════════════════════════════════════════════════
let count = 0;
for (const [name, icon] of Object.entries(icons)) {
  fs.writeFileSync(path.join(outDir, `${name}.svg`), generateFrost(name, icon), 'utf-8');
  count++;
}
console.log(`FROST theme: ${count} glassmorphism icons -> ${outDir}`);
