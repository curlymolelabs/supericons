// Agentic AI Kit V4: Production-Quality Filled Icons
// Generates TWO formats: Filled (inline, currentColor) and App Icon (gradient squircle)
// Shape sources: Solar Bold, Hugeicons, Lucide (via Iconify API reference)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const filledDir = path.join(__dirname, 'svg-v4', 'filled');
const appIconDir = path.join(__dirname, 'svg-v4', 'app-icon');
fs.mkdirSync(filledDir, { recursive: true });
fs.mkdirSync(appIconDir, { recursive: true });

// ═══════════════════════════════════════════════════════════════════
// 3-PALETTE COLOR SYSTEM
// ═══════════════════════════════════════════════════════════════════
const palettes = {
  blue:   { light: '#93C5FD', dark: '#1D4ED8' },  // Navigation, Prompt, Status
  violet: { light: '#C4B5FD', dark: '#5B21B6' },  // Agent, Model
  coral:  { light: '#F9A8D4', dark: '#BE185D' },  // RAG, Safety
};

// ═══════════════════════════════════════════════════════════════════
// ICON DEFINITIONS: Production-grade filled SVG paths
// Each icon: { path, group, palette }
// ═══════════════════════════════════════════════════════════════════
const icons = {
  // ── CORE NAVIGATION (blue) ──────────────────────────────────────
  'ai-home': {
    group: 'Core Navigation',
    palette: 'blue',
    // Solar-inspired filled home with door and window
    path: `<path d="M2.364 12.958c-.38-2.637-.57-3.956-.029-5.083.54-1.127 1.691-1.813 3.992-3.183l1.385-.825C9.753 2.622 10.773 2 12 2c1.227 0 2.247.622 4.288 1.867l1.385.825c2.3 1.37 3.451 2.056 3.992 3.183.54 1.127.351 2.446-.03 5.083l-.278 1.937c-.487 3.388-.731 5.082-1.906 6.093C18.276 22 16.553 22 13.106 22h-2.212c-3.447 0-5.17 0-6.345-1.012-1.175-1.011-1.419-2.705-1.906-6.093zm8.136 5.292a.75.75 0 001 0l1.5-1.333a.75.75 0 00-1-1.124l-.25.222V14.25a.75.75 0 00-1.5 0v1.765l-.25-.222a.75.75 0 10-1 1.124z"/>`,
  },
  'ai-search': {
    group: 'Core Navigation',
    palette: 'blue',
    // Solar magnifer bold - clean filled search
    path: `<path fill-rule="evenodd" d="M11.5 2.75a8.25 8.25 0 105.262 14.574l3.457 3.457a.75.75 0 101.06-1.06l-3.457-3.458A8.25 8.25 0 0011.5 2.75M5.75 11a5.75 5.75 0 1111.5 0 5.75 5.75 0 01-11.5 0z" clip-rule="evenodd"/>`,
  },
  'ai-settings': {
    group: 'Core Navigation',
    palette: 'blue',
    // Solar settings bold - proper gear
    path: `<path fill-rule="evenodd" d="M14.279 2.152C13.909 2 13.439 2 12.5 2s-1.408 0-1.779.152a2 2 0 00-1.09 1.083c-.094.223-.13.484-.145.863a1.62 1.62 0 01-.796 1.353 1.64 1.64 0 01-1.579.008c-.338-.178-.583-.276-.825-.308a2.03 2.03 0 00-1.49.396c-.318.242-.553.646-1.022 1.453-.47.807-.704 1.21-.757 1.605a2 2 0 00.4 1.479c.148.192.357.353.68.555.477.297.783.803.783 1.361s-.306 1.064-.782 1.36c-.324.203-.533.364-.682.556a2 2 0 00-.399 1.479c.053.394.287.798.757 1.605s.704 1.21 1.022 1.453c.424.323.96.465 1.49.396.242-.032.487-.13.825-.308a1.64 1.64 0 011.58.008c.486.28.774.795.795 1.353.015.38.051.64.145.863.204.49.596.88 1.09 1.083.37.152.84.152 1.779.152s1.409 0 1.779-.152a2 2 0 001.09-1.083c.094-.223.13-.483.145-.863.02-.558.309-1.074.796-1.353a1.64 1.64 0 011.579-.008c.338.178.583.276.825.308.53.07 1.066-.073 1.49-.396.318-.242.553-.646 1.022-1.453.47-.807.704-1.21.757-1.605a2 2 0 00-.4-1.479c-.148-.192-.357-.353-.68-.555-.477-.297-.783-.803-.783-1.361s.306-1.064.782-1.36c.324-.203.533-.364.682-.556a2 2 0 00.399-1.479c-.053-.394-.287-.798-.757-1.605s-.704-1.21-1.022-1.453a2.03 2.03 0 00-1.49-.396c-.242.032-.487.13-.825.308a1.64 1.64 0 01-1.58-.008 1.62 1.62 0 01-.795-1.353c-.015-.38-.051-.64-.145-.863a2 2 0 00-1.09-1.083M12.5 15c1.67 0 3.023-1.343 3.023-3S14.169 9 12.5 9s-3.023 1.343-3.023 3 1.354 3 3.023 3" clip-rule="evenodd"/>`,
  },
  'ai-history': {
    group: 'Core Navigation',
    palette: 'blue',
    // Clock with hands - filled
    path: `<path fill-rule="evenodd" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm.75 5a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V7z" clip-rule="evenodd"/>`,
  },
  'ai-help': {
    group: 'Core Navigation',
    palette: 'blue',
    // Question mark in circle - filled
    path: `<path fill-rule="evenodd" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-.002 6a2 2 0 00-1.753 1.042.75.75 0 01-1.318-.72A3.5 3.5 0 0115.5 10c0 1.614-1.37 2.56-2.395 3.074a6.3 6.3 0 01-.855.393v.783a.75.75 0 01-1.5 0V13a.75.75 0 01.75-.75c.08 0 .278-.07.64-.236.35-.16.745-.384 1.11-.622C13.87 10.868 14 10.386 14 10a2 2 0 00-2.002-2zM12 18a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>`,
  },
  'ai-menu': {
    group: 'Core Navigation',
    palette: 'blue',
    // Three horizontal bars - filled rounded
    path: `<path fill-rule="evenodd" d="M3.25 6A.75.75 0 014 5.25h16a.75.75 0 010 1.5H4A.75.75 0 013.25 6zm0 6a.75.75 0 01.75-.75h16a.75.75 0 010 1.5H4a.75.75 0 01-.75-.75zm0 6a.75.75 0 01.75-.75h10a.75.75 0 010 1.5H4a.75.75 0 01-.75-.75z" clip-rule="evenodd"/>`,
  },

  // ── AGENT & WORKFLOW (violet) ───────────────────────────────────
  'agent': {
    group: 'Agent and Workflow',
    palette: 'violet',
    // Person with antenna dot (AI agent)
    path: `<path d="M12 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0112 2zm0 4a3 3 0 100 6 3 3 0 000-6zM5 20a7 7 0 0114 0 .75.75 0 01-.75.75H5.75A.75.75 0 015 20z"/>`,
  },
  'agent-workflow': {
    group: 'Agent and Workflow',
    palette: 'violet',
    // Three connected nodes forming a flow
    path: `<path d="M5 2a3 3 0 100 6 3 3 0 000-6zm14 0a3 3 0 100 6 3 3 0 000-6zM12 16a3 3 0 100 6 3 3 0 000-6z"/><path fill-rule="evenodd" d="M7.75 5a.75.75 0 01.75-.75h7a.75.75 0 010 1.5h-7A.75.75 0 017.75 5zM5 8.75a.75.75 0 01.75.75v3.69l5.47 3.156a.75.75 0 11-.748 1.3L5 14.31V9.5A.75.75 0 015 8.75zm14 0a.75.75 0 01.75.75v4.81l-5.472 3.345a.75.75 0 11-.778-1.282L19 13.06V9.5a.75.75 0 01.75-.75z" clip-rule="evenodd"/>`,
  },
  'agent-group': {
    group: 'Agent and Workflow',
    palette: 'violet',
    // Two overlapping people
    path: `<path d="M9 4a4 4 0 100 8 4 4 0 000-8zm7.5 1a3.5 3.5 0 100 7 3.5 3.5 0 000-7zM3 20a6 6 0 0112 0 .75.75 0 01-.75.75H3.75A.75.75 0 013 20zm12.04-1.992a.75.75 0 01.932-.51A5 5 0 0121 22a.75.75 0 01-.75.75h-3.5a.75.75 0 010-1.5h2.557a3.5 3.5 0 00-3.778-3.31.75.75 0 01-.489-.932z"/>`,
  },
  'tool-use': {
    group: 'Agent and Workflow',
    palette: 'violet',
    // Wrench - filled bold
    path: `<path fill-rule="evenodd" d="M17.005 2.287a.75.75 0 01.454.094 6 6 0 01-4.452 10.776L6.762 19.4a2.5 2.5 0 11-3.536-3.536l6.244-6.244A6 6 0 0116.58 2.38a.75.75 0 01.424-.093zM14.5 4.05a4.5 4.5 0 00-3.59 7.273.75.75 0 01-.102.977l-6.47 6.47a1 1 0 101.414 1.414l6.47-6.47a.75.75 0 01.977-.103A4.5 4.5 0 0018.5 9.5c0-.29-.027-.573-.08-.849l-2.36 2.36a2 2 0 01-2.828 0l-.243-.244a2 2 0 010-2.828l2.36-2.36A4.5 4.5 0 0014.5 4.05z" clip-rule="evenodd"/>`,
  },
  'chain': {
    group: 'Agent and Workflow',
    palette: 'violet',
    // Solar link bold
    path: `<path d="M15.729 3.884c1.434-1.44 3.532-1.47 4.693-.304 1.164 1.168 1.133 3.28-.303 4.72l-2.423 2.433a.75.75 0 001.062 1.059l2.424-2.433c1.911-1.919 2.151-4.982.303-6.838-1.85-1.857-4.907-1.615-6.82.304L9.819 7.692c-1.911 1.919-2.151 4.982-.303 6.837a.75.75 0 101.063-1.058c-1.164-1.168-1.132-3.28.303-4.72z"/><path d="M14.485 9.47a.75.75 0 00-1.063 1.06c1.164 1.168 1.133 3.279-.303 4.72l-4.847 4.866c-1.435 1.44-3.533 1.47-4.694.304-1.164-1.168-1.132-3.28.303-4.72l2.424-2.433a.75.75 0 00-1.063-1.059l-2.424 2.433c-1.911 1.92-2.151 4.982-.303 6.838 1.85 1.858 4.907 1.615 6.82-.304l4.847-4.867c1.911-1.918 2.151-4.982.303-6.837"/>`,
  },
  'orchestrator': {
    group: 'Agent and Workflow',
    palette: 'violet',
    // Central hub with radiating connections
    path: `<path d="M12 7a5 5 0 100 10 5 5 0 000-10z"/><path fill-rule="evenodd" d="M12 1.25a.75.75 0 01.75.75v3a.75.75 0 01-1.5 0V2a.75.75 0 01.75-.75zM12 18.25a.75.75 0 01.75.75v3a.75.75 0 01-1.5 0v-3a.75.75 0 01.75-.75zM1.25 12a.75.75 0 01.75-.75h3a.75.75 0 010 1.5H2a.75.75 0 01-.75-.75zM18.25 12a.75.75 0 01.75-.75h3a.75.75 0 010 1.5h-3a.75.75 0 01-.75-.75z" clip-rule="evenodd"/>`,
  },
  'agent-loop': {
    group: 'Agent and Workflow',
    palette: 'violet',
    // Solar restart bold - circular arrow
    path: `<path d="M18.258 3.508a.75.75 0 01.463.693v4.243a.75.75 0 01-.75.75h-4.243a.75.75 0 01-.53-1.28L14.8 6.31a7.25 7.25 0 104.393 5.783.75.75 0 011.488-.187A8.75 8.75 0 1115.93 5.18l1.51-1.51a.75.75 0 01.817-.162"/>`,
  },
  'agent-stop': {
    group: 'Agent and Workflow',
    palette: 'violet',
    // Stop square in circle
    path: `<path fill-rule="evenodd" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zM9 8.25a.75.75 0 00-.75.75v6c0 .414.336.75.75.75h6a.75.75 0 00.75-.75V9a.75.75 0 00-.75-.75H9z" clip-rule="evenodd"/>`,
  },

  // ── PROMPT & CONTEXT (blue) ─────────────────────────────────────
  'prompt': {
    group: 'Prompt and Context',
    palette: 'blue',
    // Solar code bold - angle brackets with slash
    path: `<path d="M14.18 4.276a.75.75 0 01.531.918l-3.973 14.83a.75.75 0 01-1.45-.389l3.974-14.83a.75.75 0 01.919-.53m2.262 3.053a.75.75 0 011.059-.056l1.737 1.564c.737.662 1.347 1.212 1.767 1.71.44.525.754 1.088.754 1.784 0 .695-.313 1.258-.754 1.782-.42.499-1.03 1.049-1.767 1.711l-1.737 1.564a.75.75 0 01-1.004-1.115l1.697-1.527c.788-.709 1.319-1.19 1.663-1.598.33-.393.402-.622.402-.818s-.072-.424-.402-.817c-.344-.409-.875-.89-1.663-1.598l-1.697-1.527a.75.75 0 01-.056-1.06m-8.94 1.06a.75.75 0 10-1.004-1.115L4.761 8.836c-.737.662-1.347 1.212-1.767 1.71-.44.525-.754 1.088-.754 1.784 0 .695.313 1.258.754 1.782.42.499 1.03 1.049 1.767 1.711l1.737 1.564a.75.75 0 001.004-1.115l-1.697-1.527c-.788-.709-1.319-1.19-1.663-1.598-.33-.393-.402-.622-.402-.818s.072-.424.402-.817c.344-.409.875-.89 1.663-1.598z"/>`,
  },
  'prompt-template': {
    group: 'Prompt and Context',
    palette: 'blue',
    // Document with placeholder blocks
    path: `<path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8.828a2 2 0 00-.586-1.414l-4.828-4.828A2 2 0 0013.172 2H6zm2 7.25a.75.75 0 000 1.5h4a.75.75 0 000-1.5H8zm-.75 4.5A.75.75 0 018 13h8a.75.75 0 010 1.5H8a.75.75 0 01-.75-.75zM8 16.25a.75.75 0 000 1.5h5a.75.75 0 000-1.5H8z" clip-rule="evenodd"/>`,
  },
  'system-prompt': {
    group: 'Prompt and Context',
    palette: 'blue',
    // Terminal window with command line
    path: `<path fill-rule="evenodd" d="M2 6a3 3 0 013-3h14a3 3 0 013 3v12a3 3 0 01-3 3H5a3 3 0 01-3-3V6zm5.5 1a1 1 0 100 2 1 1 0 000-2zm3 0a1 1 0 100 2 1 1 0 000-2zm-1.97 5.53a.75.75 0 00-1.06-1.06l-2 2a.75.75 0 000 1.06l2 2a.75.75 0 101.06-1.06L7.06 14l1.47-1.47zm4.94-1.06a.75.75 0 10-1.06 1.06L13.94 14l-1.47 1.47a.75.75 0 101.06 1.06l2-2a.75.75 0 000-1.06l-2-2z" clip-rule="evenodd"/>`,
  },
  'context-window': {
    group: 'Prompt and Context',
    palette: 'blue',
    // Grid/table layout
    path: `<path fill-rule="evenodd" d="M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm1.5 4.25V19a.5.5 0 00.5.5h3.75V9.25H4.5zm5.75 10.25V9.25h5.5v10.25h-5.5zM17.25 9.25V19.5H19a.5.5 0 00.5-.5V9.25h-2.25zM19.5 7.75H4.5V5a.5.5 0 01.5-.5h14a.5.5 0 01.5.5v2.75z" clip-rule="evenodd"/>`,
  },
  'conversation': {
    group: 'Prompt and Context',
    palette: 'blue',
    // Chat bubble with dots
    path: `<path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12c0 1.6.376 3.112 1.043 4.453.178.356.237.763.134 1.148l-.595 2.226a1.3 1.3 0 001.591 1.592l2.226-.596a1.63 1.63 0 011.149.133A9.96 9.96 0 0012 22z"/><circle cx="8" cy="12" r="1" fill="var(--icon-hole, #fff)"/><circle cx="12" cy="12" r="1" fill="var(--icon-hole, #fff)"/><circle cx="16" cy="12" r="1" fill="var(--icon-hole, #fff)"/>`,
  },
  'regenerate': {
    group: 'Prompt and Context',
    palette: 'blue',
    // Dual-arrow refresh
    path: `<path d="M18.258 3.508a.75.75 0 01.463.693v4.243a.75.75 0 01-.75.75h-4.243a.75.75 0 01-.53-1.28L14.8 6.31a7.25 7.25 0 104.393 5.783.75.75 0 011.488-.187A8.75 8.75 0 1115.93 5.18l1.51-1.51a.75.75 0 01.817-.162"/>`,
  },
  'streaming': {
    group: 'Prompt and Context',
    palette: 'blue',
    // Three dots - streaming indicator
    path: `<circle cx="5" cy="12" r="2.5"/><circle cx="12" cy="12" r="2.5"/><circle cx="19" cy="12" r="2.5"/>`,
  },

  // ── RAG & DATA (coral) ─────────────────────────────────────────
  'embedding': {
    group: 'RAG and Data',
    palette: 'coral',
    // Crosshair/radar representing vector space
    path: `<path fill-rule="evenodd" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm.75 2.532a7.501 7.501 0 016.718 6.718H17a.75.75 0 000 1.5h2.468a7.501 7.501 0 01-6.718 6.718V17a.75.75 0 00-1.5 0v2.468A7.501 7.501 0 014.532 12.75H7a.75.75 0 000-1.5H4.532a7.501 7.501 0 016.718-6.718V7a.75.75 0 001.5 0V4.532zM12 10a2 2 0 100 4 2 2 0 000-4z" clip-rule="evenodd"/>`,
  },
  'chunk': {
    group: 'RAG and Data',
    palette: 'coral',
    // Document split into horizontal sections
    path: `<path fill-rule="evenodd" d="M4 4a2 2 0 012-2h12a2 2 0 012 2v16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2-.5h12a.5.5 0 01.5.5v5.25H5.5V4a.5.5 0 01.5-.5zm-1 7.25v3.5h14v-3.5H5zm0 5V20a.5.5 0 00.5.5h12a.5.5 0 00.5-.5v-4.25H5z" clip-rule="evenodd"/>`,
  },
  'retrieve': {
    group: 'RAG and Data',
    palette: 'coral',
    // Magnifying glass with plus - search and fetch
    path: `<path fill-rule="evenodd" d="M11 2.75a8.25 8.25 0 105.262 14.574l3.457 3.457a.75.75 0 101.06-1.06l-3.457-3.458A8.25 8.25 0 0011 2.75zM5.25 11a5.75 5.75 0 1111.5 0 5.75 5.75 0 01-11.5 0zM11 7.25a.75.75 0 01.75.75v2.25H14a.75.75 0 010 1.5h-2.25V14a.75.75 0 01-1.5 0v-2.25H8a.75.75 0 010-1.5h2.25V8a.75.75 0 01.75-.75z" clip-rule="evenodd"/>`,
  },
  'rag-pipeline': {
    group: 'RAG and Data',
    palette: 'coral',
    // Three connected shapes forming a pipeline
    path: `<path d="M2 5.5a3 3 0 116 0 3 3 0 01-6 0zm16 0a3 3 0 116 0 3 3 0 01-6 0zM9 17a3 3 0 116 0 3 3 0 01-6 0z"/><path fill-rule="evenodd" d="M8 5.5a.75.75 0 01.75-.75h6.5a.75.75 0 010 1.5h-6.5A.75.75 0 018 5.5zM5 8.75A.75.75 0 015.75 8a.75.75 0 01.75.75v3.44l4.72 2.724a.75.75 0 01-.75 1.3L5.75 13.19V8.75A.75.75 0 015 8.75zm14 0a.75.75 0 01.75.75v4.44l-4.72 2.724a.75.75 0 01-.75-1.3l4.22-2.437V9.5a.75.75 0 01.75-.75z" clip-rule="evenodd"/>`,
  },
  'vector-db': {
    group: 'RAG and Data',
    palette: 'coral',
    // Solar database bold - stacked cylinders
    path: `<path d="M20 18c0 2.21-3.582 4-8 4s-8-1.79-8-4v-4.026c.502.617 1.215 1.129 2.008 1.525C7.58 16.285 9.7 16.75 12 16.75s4.42-.465 5.992-1.25c.793-.397 1.506-.91 2.008-1.526z"/><path d="M12 10.75c2.3 0 4.42-.465 5.992-1.25.793-.397 1.506-.91 2.008-1.526V12c0 .5-1.786 1.591-2.679 2.158-1.323.661-3.203 1.092-5.321 1.092s-3.998-.43-5.321-1.092C5.5 13.568 4 12.5 4 12V7.974c.502.617 1.215 1.129 2.008 1.525C7.58 10.285 9.7 10.75 12 10.75"/><path d="M17.321 8.158C15.998 8.819 14.118 9.25 12 9.25s-3.998-.43-5.321-1.092c-.515-.202-1.673-.843-2.477-1.879a.8.8 0 01-.162-.621c.023-.148.055-.301.096-.396C4.828 3.406 8.086 2 12 2s7.172 1.406 7.864 3.262c.041.095.073.248.096.396a.8.8 0 01-.162.621c-.804 1.036-1.962 1.677-2.477 1.879"/>`,
  },
  'knowledge-base': {
    group: 'RAG and Data',
    palette: 'coral',
    // Book - filled
    path: `<path fill-rule="evenodd" d="M6.5 2A2.5 2.5 0 004 4.5v15A2.5 2.5 0 006.5 22H20a.75.75 0 00.75-.75v-18a.75.75 0 00-.75-.75H6.5zm1.75 5.25a.75.75 0 000 1.5h7a.75.75 0 000-1.5h-7zm-.75 4.5a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75z" clip-rule="evenodd"/><path d="M4 19.5a2.5 2.5 0 012.5-2.5H19v4H6.5A2.5 2.5 0 014 19.5z"/>`,
  },
  'document-index': {
    group: 'RAG and Data',
    palette: 'coral',
    // Document with lines
    path: `<path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H6zm2 5.25a.75.75 0 000 1.5h8a.75.75 0 000-1.5H8zm-.75 4.5A.75.75 0 018 11h8a.75.75 0 010 1.5H8a.75.75 0 01-.75-.75zM8 14.25a.75.75 0 000 1.5h4a.75.75 0 000-1.5H8z" clip-rule="evenodd"/>`,
  },

  // ── MODEL & CONFIG (violet) ─────────────────────────────────────
  'model': {
    group: 'Model and Configuration',
    palette: 'violet',
    // Neural brain / AI mind
    path: `<path d="M12 2a7 7 0 017 7c0 5-7 9-7 13 0-4-7-8-7-13a7 7 0 017-7z"/><circle cx="12" cy="8" r="1.5" fill="var(--icon-hole, #fff)"/>`,
  },
  'model-selector': {
    group: 'Model and Configuration',
    palette: 'violet',
    // Pin with dropdown chevron
    path: `<path d="M12 2a7 7 0 017 7c0 5-7 9-7 13 0-4-7-8-7-13a7 7 0 017-7z"/><path fill-rule="evenodd" d="M8.47 19.47a.75.75 0 011.06 0L12 21.94l2.47-2.47a.75.75 0 111.06 1.06l-3 3a.75.75 0 01-1.06 0l-3-3a.75.75 0 010-1.06z" clip-rule="evenodd"/>`,
  },
  'temperature': {
    group: 'Model and Configuration',
    palette: 'violet',
    // Thermometer - filled
    path: `<path fill-rule="evenodd" d="M14 14.76V3.5a2.5 2.5 0 10-5 0v11.26a4.5 4.5 0 105 0zm-2.5-2.01a.75.75 0 01.75.75V17a2 2 0 11-1.5 0v-3.5a.75.75 0 01.75-.75z" clip-rule="evenodd"/>`,
  },
  'token-counter': {
    group: 'Model and Configuration',
    palette: 'violet',
    // Counter display
    path: `<path fill-rule="evenodd" d="M2 6a3 3 0 013-3h14a3 3 0 013 3v12a3 3 0 01-3 3H5a3 3 0 01-3-3V6zm3.5 4.25a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v5.5a.75.75 0 01-1.5 0v-4.75H6.25a.75.75 0 01-.75-.75zm4.75-.75a.75.75 0 000 1.5h1.5a.75.75 0 000-1.5h-1.5zm-.75 3.75a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75zm-.75 2.25a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75zm5.5-5.25a.75.75 0 000 1.5h2a.75.75 0 000-1.5h-2z" clip-rule="evenodd"/>`,
  },
  'fine-tune': {
    group: 'Model and Configuration',
    palette: 'violet',
    // Solar tuning bold - sliders
    path: `<path d="M9.25 14a3 3 0 110 6 3 3 0 010-6m5-10a3 3 0 100 6 3 3 0 000-6m-5.5 2.209a.75.75 0 010 1.5h-7a.75.75 0 010-1.5zm6 10a.75.75 0 000 1.5h7a.75.75 0 000-1.5zM1 16.959a.75.75 0 01.75-.75h2a.75.75 0 010 1.5h-2a.75.75 0 01-.75-.75m20.75-10.75a.75.75 0 010 1.5h-2a.75.75 0 010-1.5z"/>`,
  },
  'max-tokens': {
    group: 'Model and Configuration',
    palette: 'violet',
    // Progress bar with limit marker
    path: `<path fill-rule="evenodd" d="M3 9a3 3 0 013-3h12a3 3 0 013 3v6a3 3 0 01-3 3H6a3 3 0 01-3-3V9zm1.5 0a1.5 1.5 0 011.5-1.5h8v9H6A1.5 1.5 0 014.5 15V9zm11 7.5V7.5H18a1.5 1.5 0 011.5 1.5v6a1.5 1.5 0 01-1.5 1.5h-2.5z" clip-rule="evenodd"/>`,
  },

  // ── SAFETY & MONITORING (coral) ─────────────────────────────────
  'guardrail': {
    group: 'Safety and Monitoring',
    palette: 'coral',
    // Solar shield check bold
    path: `<path fill-rule="evenodd" d="M3.378 5.082C3 5.62 3 7.22 3 10.417v1.574c0 5.638 4.239 8.375 6.899 9.536.721.315 1.082.473 2.101.473 1.02 0 1.38-.158 2.101-.473C16.761 20.365 21 17.63 21 11.991v-1.574c0-3.198 0-4.797-.378-5.335-.377-.537-1.88-1.052-4.887-2.081l-.573-.196C13.595 2.268 12.812 2 12 2s-1.595.268-3.162.805L8.265 3c-3.007 1.03-4.51 1.545-4.887 2.082M15.06 10.5a.75.75 0 00-1.12-.999l-3.011 3.374-.87-.974a.75.75 0 00-1.118 1l1.428 1.6a.75.75 0 001.119 0z" clip-rule="evenodd"/>`,
  },
  'safety-filter': {
    group: 'Safety and Monitoring',
    palette: 'coral',
    // Funnel - filled
    path: `<path d="M3.792 2.938C4.478 2 5.632 2 7.941 2h8.118c2.309 0 3.463 0 4.149.938.686.937.369 2.254-.266 4.886l-.348 1.452c-.453 1.888-.68 2.832-1.353 3.408S16.838 13.5 14.9 13.5H9.1c-1.938 0-2.907 0-3.58-.576S4.529 11.564 4.076 9.676l-.348-1.452c-.635-2.632-.952-3.949-.266-4.886z"/><path fill-rule="evenodd" d="M9.05 13.5h5.9l-.207 2.264c-.149 1.636-.224 2.454-.65 3.06-.175.246-.39.46-.639.632-.609.42-1.428.42-3.066.42h-.776c-1.638 0-2.457 0-3.066-.42a2.45 2.45 0 01-.639-.632c-.426-.606-.501-1.424-.65-3.06L5.05 13.5z" clip-rule="evenodd"/>`,
  },
  'token-cost': {
    group: 'Safety and Monitoring',
    palette: 'coral',
    // Dollar in circle (cost monitoring)
    path: `<path fill-rule="evenodd" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm.75 4a.75.75 0 00-1.5 0v.688c-1.195.228-2.25 1.053-2.25 2.312 0 1.494 1.395 2.343 2.652 2.803.96.351 1.598.702 1.598 1.197 0 .56-.717 1-1.5 1s-1.465-.368-1.535-.88a.75.75 0 10-1.49.16C9.066 14.748 10.17 15.545 11.25 15.77V16.5a.75.75 0 001.5 0v-.688c1.195-.228 2.25-1.053 2.25-2.312 0-1.494-1.395-2.343-2.652-2.803-.96-.351-1.598-.702-1.598-1.197 0-.56.717-1 1.5-1s1.465.368 1.535.88a.75.75 0 101.492-.16c-.34-1.467-1.445-2.264-2.527-2.488V6z" clip-rule="evenodd"/>`,
  },
  'latency': {
    group: 'Safety and Monitoring',
    palette: 'coral',
    // Speedometer/gauge
    path: `<path fill-rule="evenodd" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm.75 4a.75.75 0 00-1.5 0v5.19l-2.72 2.72a.75.75 0 101.06 1.06l3-3a.75.75 0 00.22-.53V6z" clip-rule="evenodd"/>`,
  },

  // ── STATUS & EMPTY STATES (blue) ────────────────────────────────
  'sparkle': {
    group: 'Status and Empty States',
    palette: 'blue',
    // Four-point star sparkles
    path: `<path d="M12 1.5l1.773 6.477L20.25 9.75l-6.477 1.773L12 18l-1.773-6.477L3.75 9.75l6.477-1.773z"/><path d="M18.75 14.25l.75 2.25 2.25.75-2.25.75-.75 2.25-.75-2.25-2.25-.75 2.25-.75z"/>`,
  },
  'empty-agent': {
    group: 'Status and Empty States',
    palette: 'blue',
    // Dashed person silhouette
    path: `<path d="M12 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0112 2z" opacity="0.3"/><path d="M12 6a3 3 0 100 6 3 3 0 000-6z" opacity="0.3"/><path d="M5 20a7 7 0 0114 0 .75.75 0 01-.75.75H5.75A.75.75 0 015 20z" opacity="0.3"/>`,
  },
};

// ═══════════════════════════════════════════════════════════════════
// GENERATOR: Filled (inline, currentColor)
// ═══════════════════════════════════════════════════════════════════
function generateFilled(name, icon) {
  // Replace any var(--icon-hole, ...) with white for standalone SVGs
  const cleanPath = icon.path.replace(/var\(--icon-hole,\s*#fff\)/g, '#fff');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">\n  ${cleanPath}\n</svg>`;
}

// ═══════════════════════════════════════════════════════════════════
// GENERATOR: App Icon (gradient squircle)
// ═══════════════════════════════════════════════════════════════════
function generateAppIcon(name, icon) {
  const pal = palettes[icon.palette];
  const cleanPath = icon.path
    .replace(/var\(--icon-hole,\s*#fff\)/g, 'rgba(0,0,0,0.15)')
    .replace(/opacity="0\.3"/g, 'opacity="0.55"');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
  <defs>
    <linearGradient id="bg-${name}" x1="60" y1="4" x2="60" y2="116" gradientUnits="userSpaceOnUse">
      <stop stop-color="${pal.light}"/>
      <stop offset="1" stop-color="${pal.dark}"/>
    </linearGradient>
    <linearGradient id="shine-${name}" x1="60" y1="4" x2="60" y2="64" gradientUnits="userSpaceOnUse">
      <stop stop-color="#fff" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="squircle-${name}">
      <rect x="4" y="4" width="112" height="112" rx="26"/>
    </clipPath>
  </defs>

  <!-- Background squircle -->
  <rect x="4" y="4" width="112" height="112" rx="26" fill="url(#bg-${name})"/>

  <!-- Glass highlight -->
  <rect x="4" y="4" width="112" height="56" rx="26" fill="url(#shine-${name})" clip-path="url(#squircle-${name})"/>

  <!-- Inner shadow (subtle) -->
  <rect x="4" y="58" width="112" height="58" rx="4" fill="rgba(0,0,0,0.08)" clip-path="url(#squircle-${name})"/>

  <!-- Icon shape (centered, scaled, white) -->
  <g transform="translate(30, 30) scale(2.5)" fill="#fff" fill-opacity="0.95">
    ${cleanPath}
  </g>
</svg>`;
}

// ═══════════════════════════════════════════════════════════════════
// GENERATE ALL
// ═══════════════════════════════════════════════════════════════════
let filledCount = 0;
let appIconCount = 0;

for (const [name, icon] of Object.entries(icons)) {
  // Filled
  const filledSvg = generateFilled(name, icon);
  fs.writeFileSync(path.join(filledDir, `${name}.svg`), filledSvg, 'utf-8');
  filledCount++;

  // App Icon
  const appIconSvg = generateAppIcon(name, icon);
  fs.writeFileSync(path.join(appIconDir, `${name}.svg`), appIconSvg, 'utf-8');
  appIconCount++;
}

console.log(`V4 Generated: ${filledCount} filled + ${appIconCount} app-icon = ${filledCount + appIconCount} total SVGs`);
console.log(`  Filled: ${filledDir}`);
console.log(`  App Icon: ${appIconDir}`);
