#!/usr/bin/env node
// Build the Icon Lab page (v0.5): staged pipeline with visual preview gates.
//   Start (templates) -> Shape (tune + taste gate) -> Motion (anim + gate) -> Production (formats + finalize)
// Inlines the composer module and all design records into a self-contained HTML file.
// Records are the source of truth; the Lab is a generated view with live tuning.
// Usage: node scripts/build-icon-lab.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const composerSrc = readFileSync(join(root, 'lib/si-lab/composer.mjs'), 'utf8')
  .replace(/^export \{[^}]+\};?\s*$/m, 'window.SIComposer = { compose, CFG, ANIM_CSS, GRADIENT_DEFS, lintRecord };');

const dir = join(root, 'data', 'si-registry', 'source', 'design');
const docs = ['agent-pulse-pilot.json', 'agent-pulse-batch-1-orbs.json']
  .map((f) => ({ file: f, doc: JSON.parse(readFileSync(join(dir, f), 'utf8')) }));
const records = docs.flatMap(({ file, doc }) => doc.records.map((r) => ({ ...r, __file: file })));

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SI Icon Lab · record-first v0.5</title>
<style>
  :root {
    --accent: #FF4F00; --accent-soft: #ff906c; --bg: #0e0e0e; --surface: #131313;
    --surface-2: #1a1919; --surface-3: #201f1f; --text: #ffffff; --text-muted: #cccaca;
    --text-dim: #767575; --outline-ghost: rgba(72, 72, 71, 0.25); --success: #4ade80;
    --font-head: "Space Grotesk", "Segoe UI", system-ui, sans-serif;
    --font-body: "Manrope", "Segoe UI", system-ui, sans-serif;
    --font-mono: "Cascadia Code", Consolas, monospace;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: var(--bg); color: var(--text); font-family: var(--font-body); height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
  header { flex: 0 0 auto; display: flex; align-items: center; gap: 0.8rem; height: 52px; padding: 0 1.1rem; border-bottom: 1px solid var(--outline-ghost); }
  .logo { display: flex; align-items: center; gap: 0.5rem; font-family: var(--font-head); font-weight: 700; }
  .logo .mark { width: 24px; height: 24px; border-radius: 7px; background: linear-gradient(135deg, var(--accent), #ff7345); display: grid; place-items: center; font-size: 0.85rem; }
  .badge { font-size: 0.62rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--accent-soft); border: 1px solid rgba(255,79,0,0.4); border-radius: 999px; padding: 0.14rem 0.55rem; }
  .spacer { flex: 1; }
  .hbtn { display: flex; align-items: center; gap: 0.35rem; height: 32px; padding: 0 0.8rem; border-radius: 8px; border: 1px solid var(--outline-ghost); background: var(--surface-2); color: var(--text-muted); font-family: var(--font-body); font-size: 0.74rem; cursor: pointer; }
  .hbtn:hover { border-color: var(--accent); color: var(--accent-soft); }
  .hbtn.primary { background: linear-gradient(135deg, var(--accent), #ff7345); color: #fff; border: none; font-weight: 600; }
  .hbtn.ok { border-color: rgba(74,222,128,0.5); color: var(--success); }
  .hbtn:disabled { opacity: 0.4; cursor: not-allowed; }

  /* pipeline stepper */
  .stepper { flex: 0 0 auto; display: flex; align-items: center; gap: 0.4rem; padding: 0.55rem 1.1rem; border-bottom: 1px solid var(--outline-ghost); background: var(--surface); }
  .step { display: flex; align-items: center; gap: 0.45rem; font-family: var(--font-head); font-size: 0.72rem; color: var(--text-dim); padding: 0.25rem 0.7rem; border-radius: 999px; border: 1px solid transparent; }
  .step .n { width: 17px; height: 17px; border-radius: 50%; display: grid; place-items: center; font-size: 0.6rem; background: var(--surface-3); color: var(--text-dim); }
  .step.active { color: var(--accent-soft); border-color: rgba(255,79,0,0.4); background: rgba(255,79,0,0.07); }
  .step.active .n { background: var(--accent); color: #fff; }
  .step.done { color: var(--success); }
  .step.done .n { background: rgba(74,222,128,0.18); color: var(--success); }
  .step-arrow { color: var(--text-dim); font-size: 0.7rem; }
  .stage-hint { margin-left: auto; font-size: 0.66rem; color: var(--text-dim); }

  .layout { flex: 1; display: flex; min-height: 0; }
  .queue { width: 220px; flex: 0 0 auto; overflow-y: auto; border-right: 1px solid var(--outline-ghost); padding: 0.8rem 0.5rem 2rem; }
  .queue h3 { font-family: var(--font-head); font-size: 0.6rem; letter-spacing: 0.13em; text-transform: uppercase; color: var(--text-dim); padding: 0.5rem 0.5rem 0.3rem; }
  .newbtn { width: 100%; margin: 0 0 0.5rem; }
  .qitem { display: flex; align-items: center; gap: 0.55rem; padding: 0.4rem 0.5rem; border-radius: 8px; cursor: pointer; }
  .qitem:hover { background: var(--surface-2); }
  .qitem.active { background: var(--surface-3); }
  .qitem .thumb { width: 26px; height: 26px; display: grid; place-items: center; color: #dfdcd8; flex: 0 0 auto; }
  .qitem .nm { font-size: 0.72rem; color: var(--text-muted); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .qitem .st { width: 7px; height: 7px; border-radius: 50%; flex: 0 0 auto; }
  .st.shape_drawn, .st.metaphor_approved, .st.metaphor_proposed { background: var(--accent-soft); }
  .st.shape_approved { background: #60a5fa; }
  .st.render_approved, .st.production { background: var(--success); }

  .stage { flex: 1; overflow-y: auto; padding: 1.1rem 1.4rem 3rem; min-width: 0; }
  .stage-head { display: flex; align-items: baseline; gap: 0.7rem; flex-wrap: wrap; }
  .stage-head h1 { font-family: var(--font-head); font-size: 1.2rem; font-weight: 600; }
  .stage-head code { font-family: var(--font-mono); font-size: 0.68rem; color: var(--text-dim); background: var(--surface-2); border-radius: 4px; padding: 0.1rem 0.4rem; }
  .chip { font-size: 0.56rem; letter-spacing: 0.09em; text-transform: uppercase; border-radius: 4px; padding: 0.12rem 0.4rem; }
  .chip.shape_drawn, .chip.metaphor_approved, .chip.metaphor_proposed { color: var(--accent-soft); background: rgba(255,79,0,0.12); }
  .chip.shape_approved { color: #60a5fa; background: rgba(96,165,250,0.12); }
  .chip.render_approved, .chip.production { color: var(--success); background: rgba(74,222,128,0.12); }
  .purpose { color: var(--text-dim); font-size: 0.78rem; margin-top: 0.25rem; max-width: 660px; }

  .previews { margin-top: 1rem; display: flex; gap: 0.9rem; flex-wrap: wrap; }
  .pcard { border: 1px solid var(--outline-ghost); border-radius: 12px; background: var(--surface); padding: 0.8rem 1rem; }
  .pcard .plabel { font-size: 0.58rem; letter-spacing: 0.11em; text-transform: uppercase; color: var(--text-dim); margin-bottom: 0.6rem; }
  .prow { display: flex; align-items: center; gap: 1rem; color: #e9e6e2; }
  .prow .sz { display: flex; flex-direction: column; align-items: center; gap: 0.3rem; }
  .prow .sz span { font-size: 0.56rem; color: var(--text-dim); }
  .squint { filter: blur(1px) contrast(0.9); }

  /* visual preview gate bar */
  .gate { margin-top: 1.1rem; border: 1px solid rgba(255,79,0,0.35); border-radius: 12px; background: rgba(255,79,0,0.05); padding: 0.8rem 1rem; display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap; }
  .gate.locked { border-color: rgba(74,222,128,0.4); background: rgba(74,222,128,0.05); }
  .gate .gq { font-family: var(--font-head); font-size: 0.82rem; font-weight: 600; }
  .gate .gs { font-size: 0.68rem; color: var(--text-dim); flex-basis: 100%; }

  .mcp { margin-top: 1rem; background: var(--surface-2); border-radius: 8px; padding: 0.55rem 0.75rem; font-family: var(--font-mono); font-size: 0.64rem; color: var(--text-dim); }
  .mcp b { color: var(--accent-soft); font-weight: 400; }

  /* QA lints */
  .lints { margin-top: 1rem; display: flex; gap: 0.35rem; flex-wrap: wrap; align-items: center; }
  .lint { font-family: var(--font-label, Inter, sans-serif); font-size: 0.6rem; letter-spacing: 0.04em; border-radius: 5px; padding: 0.16rem 0.45rem; border: 1px solid transparent; }
  .lint.pass { color: var(--success); background: rgba(74,222,128,0.09); }
  .lint.warn { color: var(--accent-soft); background: rgba(255,79,0,0.1); }
  .lint.info { color: var(--text-dim); background: var(--surface-2); }
  .lint.manual { color: #60a5fa; background: rgba(96,165,250,0.1); flex-basis: 100%; text-align: left; }

  /* template gallery */
  .gallery { margin-top: 1rem; display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 0.8rem; }
  .tpl { border: 1px solid var(--outline-ghost); border-radius: 12px; background: var(--surface); padding: 0.9rem; cursor: pointer; transition: all 140ms; position: relative; }
  .tpl:hover { border-color: var(--accent); transform: translateY(-2px); }
  .tpl .tprev { display: grid; place-items: center; height: 60px; color: #e9e6e2; }
  .tpl h4 { font-family: var(--font-head); font-size: 0.82rem; margin-top: 0.4rem; }
  .tpl p { font-size: 0.66rem; color: var(--text-dim); line-height: 1.45; margin-top: 0.15rem; }
  .tpl .win { position: absolute; top: 8px; right: 8px; font-size: 0.52rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--success); background: rgba(74,222,128,0.12); border-radius: 4px; padding: 0.08rem 0.3rem; }
  .namerow { margin-top: 1rem; display: flex; gap: 0.5rem; align-items: center; }
  .namerow input { background: var(--surface-2); border: 1px solid var(--outline-ghost); border-radius: 8px; color: var(--text); font-family: var(--font-body); font-size: 0.8rem; padding: 0.45rem 0.7rem; width: 260px; }

  /* production formats */
  .formats { margin-top: 1rem; display: flex; gap: 0.8rem; flex-wrap: wrap; }
  .fmt { border: 1px solid var(--outline-ghost); border-radius: 12px; background: var(--surface); padding: 0.8rem 1rem; width: 230px; }
  .fmt.selected { border-color: var(--accent); }
  .fmt.disabled { opacity: 0.45; }
  .fmt h4 { font-family: var(--font-head); font-size: 0.82rem; display: flex; align-items: center; gap: 0.5rem; }
  .fmt p { font-size: 0.66rem; color: var(--text-dim); margin-top: 0.2rem; line-height: 1.45; }
  .fmt .acts { margin-top: 0.6rem; display: flex; gap: 0.4rem; flex-wrap: wrap; }
  .fmt input { accent-color: var(--accent); }

  .panel { width: 340px; flex: 0 0 auto; overflow-y: auto; border-left: 1px solid var(--outline-ghost); padding: 0.9rem 0.9rem 3rem; }
  .panel h3 { font-family: var(--font-head); font-size: 0.62rem; letter-spacing: 0.13em; text-transform: uppercase; color: var(--text-dim); margin: 0.6rem 0.2rem 0.4rem; }
  .locknote { font-size: 0.64rem; color: var(--success); padding: 0.4rem 0.55rem; border: 1px solid rgba(74,222,128,0.3); border-radius: 8px; margin-bottom: 0.55rem; }
  .part { border: 1px solid var(--outline-ghost); border-radius: 10px; margin-bottom: 0.55rem; overflow: hidden; }
  .part-head { display: flex; align-items: center; gap: 0.5rem; padding: 0.45rem 0.65rem; background: var(--surface); cursor: pointer; font-size: 0.72rem; color: var(--text-muted); }
  .part-head .t { font-family: var(--font-mono); color: var(--accent-soft); font-size: 0.66rem; }
  .part-head .caret { margin-left: auto; color: var(--text-dim); font-size: 0.65rem; }
  .part-body { padding: 0.55rem 0.65rem 0.7rem; display: none; flex-direction: column; gap: 0.45rem; }
  .part.open .part-body { display: flex; }
  .ctl { display: grid; grid-template-columns: 52px 1fr 44px; align-items: center; gap: 0.5rem; }
  .ctl label { font-family: var(--font-mono); font-size: 0.62rem; color: var(--text-dim); }
  .ctl input[type=range] { width: 100%; accent-color: var(--accent); }
  .ctl input[type=range]:disabled { accent-color: var(--text-dim); }
  .ctl .val { font-family: var(--font-mono); font-size: 0.62rem; color: var(--text-muted); text-align: right; }
  .ctl input[type=text], .ctl select { grid-column: 2 / 4; background: var(--surface-2); border: 1px solid var(--outline-ghost); border-radius: 6px; color: var(--text); font-family: var(--font-mono); font-size: 0.62rem; padding: 0.3rem 0.4rem; width: 100%; }
  .ctl.wide { grid-template-columns: 52px 1fr; }
  .footer-note { font-size: 0.62rem; color: var(--text-dim); margin-top: 0.8rem; line-height: 1.5; padding: 0 0.2rem; }

  .toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%) translateY(90px); background: var(--surface-3); border: 1px solid var(--outline-ghost); border-radius: 10px; padding: 0.55rem 1rem; font-size: 0.75rem; z-index: 60; transition: transform 240ms cubic-bezier(0.22,0.61,0.36,1); }
  .toast.show { transform: translateX(-50%) translateY(0); }
  @media (max-width: 1000px) { .panel { display: none; } }
</style>
<style id="animCss"></style>
</head>
<body>
<svg width="0" height="0" style="position:absolute" aria-hidden="true" id="defsHost"></svg>

<header>
  <div class="logo"><span class="mark">S</span> Icon Lab</div>
  <span class="badge">record-first v0.5</span>
  <span style="font-size:0.68rem;color:var(--text-dim)" id="countLine"></span>
  <div class="spacer"></div>
  <button class="hbtn ok" id="saveBtn" style="display:none">Save to records</button>
  <button class="hbtn" id="copyBtn">Copy record JSON</button>
  <button class="hbtn" id="downloadBtn">Download records</button>
</header>

<div class="stepper" id="stepper"></div>

<div class="layout">
  <aside class="queue">
    <button class="hbtn primary newbtn" id="newBtn">+ New icon</button>
    <div id="queueList"></div>
  </aside>
  <main class="stage" id="stageMain"></main>
  <aside class="panel">
    <h3>Construction parameters</h3>
    <div id="lockNote"></div>
    <div id="parts"></div>
    <div class="footer-note">Controls edit <span style="font-family:var(--font-mono)">construction.params</span> live. Locked stages freeze geometry. Copy or download to persist; the record stays the source of truth. Generated by scripts/build-icon-lab.mjs.</div>
  </aside>
</div>

<div class="toast" id="toast">ok</div>

<script>
${composerSrc}
</script>
<script>
  const RECORDS = ${JSON.stringify(records)};
  const SIC = window.SIComposer;
  document.getElementById('animCss').textContent = SIC.ANIM_CSS;
  document.getElementById('defsHost').innerHTML = SIC.GRADIENT_DEFS;

  /* ---------- winning templates (seeded from approved shapes + archetypes) ---------- */
  const TEMPLATES = [
    { id: 'orb-state', name: 'Orb state', win: true, hint: 'The naked agent orb. Start of every state icon.',
      parts: [ { type: 'orb', cx: 12, cy: 12, r: 6, anim: { name: 'breathe', dur: 4 } } ] },
    { id: 'orb-mark', name: 'Orb + face mark', win: true, hint: 'Orb carrying a mark on its face (dots, check, glyph).',
      parts: [ { type: 'orb', cx: 12, cy: 12, r: 8.5 }, { type: 'dot', cx: 12, cy: 12, r: 1.15, role: 'accent', onFace: true, anim: { name: 'seq' } } ] },
    { id: 'orb-satellite', name: 'Orb + satellite', win: false, hint: 'Orb with one element hovering outside (dot above, badge, spark).',
      parts: [ { type: 'orb', cx: 12, cy: 13.5, r: 5 }, { type: 'dot', cx: 12, cy: 4.6, r: 1.8, role: 'accent', anim: { name: 'blink' } } ] },
    { id: 'orb-sidewaves', name: 'Orb + side waves', win: true, hint: 'Communication grammar: inbound or outbound side elements.',
      parts: [ { type: 'orb', cx: 12, cy: 12, r: 5 }, { type: 'path', d: 'M17.6 9.6a3.4 3.4 0 0 1 0 4.8M6.4 9.6a3.4 3.4 0 0 0 0 4.8', w: 1.8, anim: { name: 'seq' } } ] },
    { id: 'orb-arc', name: 'Orb + orbit arc', win: false, hint: 'Activity around the core: working, retrying, progress.',
      parts: [ { type: 'orb', cx: 12, cy: 12, r: 5.5 }, { type: 'arc', cx: 12, cy: 12, r: 8.5, a1: 5, a2: 95, w: 2, role: 'accent', anim: { name: 'orbit', d: 1.8 } } ] },
    { id: 'equalizer', name: 'Equalizer', win: true, hint: 'The approved voice-wave rhythm: symmetric center-aligned bars.',
      parts: [ { type: 'bars', cy: 12, w: 2, accentIndex: 2, anim: { name: 'eq' }, items: [ { x: 4.6, h: 5 }, { x: 8.3, h: 10 }, { x: 12, h: 15 }, { x: 15.7, h: 10 }, { x: 19.4, h: 5 } ] } ] },
    { id: 'radiating', name: 'Radiating corners', win: true, hint: 'The approved sound-blast pattern: corner arc pairs around a core.',
      parts: [ { type: 'orb', cx: 12, cy: 12, r: 5 },
        { type: 'arc', cx: 12, cy: 12, r: 7.2, a1: 20, a2: 70, w: 2, anim: { name: 'seq' } }, { type: 'arc', cx: 12, cy: 12, r: 7.2, a1: 110, a2: 160, w: 2, anim: { name: 'seq' } },
        { type: 'arc', cx: 12, cy: 12, r: 7.2, a1: 200, a2: 250, w: 2, anim: { name: 'seq' } }, { type: 'arc', cx: 12, cy: 12, r: 7.2, a1: 290, a2: 340, w: 2, anim: { name: 'seq' } } ] },
    { id: 'duo', name: 'Two-orb relation', win: false, hint: 'Delegation, sync, and transfer between agents.',
      parts: [ { type: 'orb', cx: 7, cy: 14.5, r: 4 }, { type: 'orb', cx: 17, cy: 14.5, r: 4 }, { type: 'path', d: 'M9.5 10.5q2.5-3.5 5 0', w: 1.8, role: 'dim', dash: '1 2.5' }, { type: 'dot', cx: 9.8, cy: 8.6, r: 1.5, role: 'accent', anim: { name: 'travel', tx: 5 } } ] },
    { id: 'square-keyline', name: 'Square keyline', win: false, hint: 'Full-frame square subject at the 18x18 keyline (cards, panels, containers). Not everything is an orb.',
      parts: [ { type: 'path', d: 'M3 5.5A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5z', w: 2 }, { type: 'dot', cx: 12, cy: 12, r: 1.7, role: 'accent', onFace: true, anim: { name: 'blink' } } ] },
    { id: 'rect-keyline', name: 'Rect keyline', win: false, hint: 'Horizontal 20x16 keyline subject (trays, docs, meters), sized for optical parity with the circle 20.',
      parts: [ { type: 'path', d: 'M2 6.5A2.5 2.5 0 0 1 4.5 4h15A2.5 2.5 0 0 1 22 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 17.5z', w: 2 }, { type: 'bars', cy: 12, w: 1.8, onFace: true, accentIndex: 1, anim: { name: 'eq' }, items: [ { x: 8, h: 5 }, { x: 12, h: 8 }, { x: 16, h: 5 } ] } ] }
  ];

  /* ---------- state ---------- */
  let sel = RECORDS.find((r) => r.icon_id === 'si:orb-idle') || RECORDS[0];
  let startMode = false;
  let pickedTemplate = null;
  const finalized = new Set();
  const openParts = new Set([0]);
  const STAGES = ['start', 'shape', 'motion', 'production'];

  function stageOf(r) {
    if (finalized.has(r.icon_id)) return 'production';
    if (r.design_state === 'render_approved') return 'production';
    if (r.design_state === 'shape_approved') return 'motion';
    return 'shape';
  }

  /* ---------- stepper ---------- */
  const STAGE_META = {
    start: ['1', 'Start', 'pick a winning template or brief the agent'],
    shape: ['2', 'Shape', 'tune until the visual preview meets your taste, then lock'],
    motion: ['3', 'Motion', 'review the animated states, then lock'],
    production: ['4', 'Production', 'choose formats and finalize']
  };
  function renderStepper() {
    const cur = startMode ? 'start' : stageOf(sel);
    const idx = STAGES.indexOf(cur);
    const el = document.getElementById('stepper');
    el.innerHTML = STAGES.map((s, i) => {
      const [n, name] = STAGE_META[s];
      const cls = s === cur ? 'active' : i < idx ? 'done' : '';
      return '<span class="step ' + cls + '"><span class="n">' + (i < idx ? '✓' : n) + '</span>' + name + '</span>' + (i < 3 ? '<span class="step-arrow">→</span>' : '');
    }).join('') + '<span class="stage-hint">' + STAGE_META[cur][2] + '</span>';
  }

  /* ---------- queue ---------- */
  function renderQueue() {
    const host = document.getElementById('queueList');
    document.getElementById('countLine').textContent = RECORDS.length + ' records · agent-pulse';
    const groups = [...new Set(RECORDS.map((r) => r.__file))];
    host.innerHTML = '';
    for (const g of groups) {
      const h = document.createElement('h3');
      h.textContent = g === 'local' ? 'New in this session' : g.includes('pilot') ? 'Pilot' : 'Batch 1 · orb states';
      host.appendChild(h);
      for (const r of RECORDS.filter((x) => x.__file === g)) {
        const el = document.createElement('div');
        el.className = 'qitem' + (r === sel && !startMode ? ' active' : '');
        let thumb = '?';
        try { thumb = SIC.compose(r).strokeSvg(22); } catch (e) {}
        el.innerHTML = '<span class="thumb">' + thumb + '</span><span class="nm">' + r.label + '</span><span class="st ' + (finalized.has(r.icon_id) ? 'production' : r.design_state) + '"></span>';
        el.addEventListener('click', () => { sel = r; startMode = false; renderAll(); });
        host.appendChild(el);
      }
    }
  }

  /* ---------- stage views ---------- */
  const szRow = (fn, cls) => [48, 24, 16].map((s) => '<span class="sz ' + (cls || '') + '">' + fn(s) + '<span>' + s + '</span></span>').join('');

  function headHtml(extraChip) {
    return '<div class="stage-head"><h1>' + sel.label + '</h1><code>' + sel.icon_id + '</code><code>v' + sel.version + '</code>' +
      '<span class="chip ' + (finalized.has(sel.icon_id) ? 'production' : sel.design_state) + '">' + (finalized.has(sel.icon_id) ? 'production ready' : sel.design_state.replace(/_/g, ' ')) + '</span>' + (extraChip || '') + '</div>' +
      '<p class="purpose">' + (sel.soul && sel.soul.purpose || '') + ' · ' + (sel.face && sel.face.depicts || '') + '</p>';
  }

  function renderStage() {
    const main = document.getElementById('stageMain');
    if (startMode) return renderStart(main);
    let c;
    try { c = SIC.compose(sel); } catch (e) {
      main.innerHTML = headHtml() + '<div style="margin-top:1rem;color:var(--accent-soft);font-size:0.8rem">compose error: ' + e.message + '</div>';
      return;
    }
    const stage = stageOf(sel);
    if (stage === 'shape') {
      main.innerHTML = headHtml() +
        '<div class="previews">' +
        '<div class="pcard"><div class="plabel">Stroke</div><div class="prow">' + szRow(c.strokeSvg) + '</div></div>' +
        '<div class="pcard"><div class="plabel">Solid</div><div class="prow">' + szRow(c.solidSvg) + '</div></div>' +
        '<div class="pcard"><div class="plabel">Elegance · animated</div><div class="prow"><span class="sz">' + c.elegSvg(116) + '<span>tile</span></span></div></div>' +
        '<div class="pcard"><div class="plabel">Squint test</div><div class="prow"><span class="sz squint">' + c.strokeSvg(24) + '<span>24 blurred</span></span><span class="sz squint">' + c.solidSvg(16) + '<span>16 blurred</span></span></div></div>' +
        '</div>' +
        lintsHtml() +
        '<div class="gate"><span class="gq">Visual preview gate 1 · does the shape meet your taste?</span>' +
        '<button class="hbtn" id="iterateBtn">Not yet, keep tuning</button>' +
        '<button class="hbtn ok" id="lockShapeBtn">Yes, lock shape →</button>' +
        '<span class="gs">Locking freezes geometry and advances to Motion. Everything before this gate can be automated; nothing passes it without your eyes.</span></div>' +
        mcpHtml('tune');
    } else if (stage === 'motion') {
      main.innerHTML = headHtml() +
        '<div class="previews">' +
        '<div class="pcard"><div class="plabel">Ambient motion</div><div class="prow"><span class="sz">' + c.elegSvg(140) + '<span>animated</span></span></div></div>' +
        '<div class="pcard"><div class="plabel">Reduced motion · static frame</div><div class="prow"><span class="sz" style="animation:none">' + c.elegSvg(116).replace(/class="a-[^"]*"/g, '') + '<span>must read complete</span></span></div></div>' +
        '<div class="pcard"><div class="plabel">Small animated</div><div class="prow"><span class="sz">' + c.elegSvg(56) + '<span>56</span></span><span class="sz">' + c.elegSvg(32) + '<span>32</span></span></div></div>' +
        '</div>' +
        '<div class="gate"><span class="gq">Visual preview gate 2 · does the motion carry the meaning?</span>' +
        '<button class="hbtn" id="unlockShapeBtn">← Back to shape</button>' +
        '<button class="hbtn ok" id="lockMotionBtn">Yes, lock motion →</button>' +
        '<span class="gs">Timing and delay stay editable here; geometry is frozen. Locking advances to Production.</span></div>' +
        mcpHtml('motion');
    } else {
      const staticSel = true;
      main.innerHTML = headHtml() +
        '<div class="previews">' +
        '<div class="pcard"><div class="plabel">Final</div><div class="prow">' + szRow(c.strokeSvg) + '<span class="sz">' + c.elegSvg(96) + '<span>tile</span></span></div></div>' +
        '</div>' +
        '<div class="formats">' +
        '<div class="fmt selected"><h4><input type="checkbox" checked disabled> Static</h4><p>Stroke and solid SVG, currentColor, ready for any UI.</p><div class="acts"><button class="hbtn" data-copy="stroke">Copy stroke</button><button class="hbtn" data-copy="solid">Copy solid</button></div></div>' +
        '<div class="fmt selected"><h4><input type="checkbox" checked disabled> Dynamic · animated</h4><p>Layered tile with the pack motion language, CSS keyframes included.</p><div class="acts"><button class="hbtn" data-copy="eleg">Copy animated SVG+CSS</button></div></div>' +
        '<div class="fmt disabled"><h4><input type="checkbox" disabled> Interactive · states</h4><p>Per-state parameter deltas bound to --si-state (hover, loading, error). Ships in v1.</p></div>' +
        '</div>' +
        '<div class="gate ' + (finalized.has(sel.icon_id) ? 'locked' : '') + '"><span class="gq">' + (finalized.has(sel.icon_id) ? 'Finalized for production.' : 'Finalize this icon for production?') + '</span>' +
        '<button class="hbtn" id="unlockMotionBtn">← Back to motion</button>' +
        (finalized.has(sel.icon_id) ? '' : '<button class="hbtn primary" id="finalizeBtn">Finalize ✓</button>') +
        '<span class="gs">Finalizing marks render_approved; the record then flows to the registry promotion pipeline. Persist via Download records.</span></div>' +
        mcpHtml('export');
    }
    wireStage(c);
  }

  function lintsHtml() {
    let lints = [];
    try { lints = SIC.lintRecord(sel); } catch (e) { return ''; }
    return '<div class="lints">' + lints.map((l) => '<span class="lint ' + l.level + '">' + l.id + ' · ' + l.msg + '</span>').join('') + '</div>';
  }

  const CAN_SAVE = location.protocol.indexOf('http') === 0;
  async function persist(quiet) {
    if (!CAN_SAVE) { if (!quiet) toast('Serve via scripts/icon-lab-serve.mjs to save directly'); return; }
    const clean = JSON.parse(JSON.stringify(sel)); const file = sel.__file; delete clean.__file;
    try {
      const res = await fetch('/api/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file, record: clean }) });
      const out = await res.json();
      if (out.ok) toast('Saved to ' + out.file + (out.verified === true ? ' · verify passed' : out.verified === false ? ' · VERIFY FAILED, check console' : ''));
      else toast('Save failed: ' + out.error);
    } catch (e) { toast('Save failed: ' + e.message); }
  }

  function mcpHtml(mode) {
    const lines = {
      tune: 'si_lab.compose(<b>"' + sel.icon_id + '"</b>) → { stroke, solid, elegance }<br>si_lab.tune(<b>"' + sel.icon_id + '"</b>, { path: "parts[0].r", value: 6.5 }) → proposal for gate 1',
      motion: 'si_lab.set_motion(<b>"' + sel.icon_id + '"</b>, { part: 1, name: "seq", delay: 0.4 }) → proposal for gate 2',
      export: 'si_lab.export(<b>"' + sel.icon_id + '"</b>, { formats: ["static", "animated"] }) → production assets'
    };
    return '<div class="mcp">// agent parity, same composer, same record, same gates<br>' + lines[mode] + '</div>';
  }

  function renderStart(main) {
    main.innerHTML = '<div class="stage-head"><h1>New icon</h1><span class="chip shape_drawn">start</span></div>' +
      '<p class="purpose">Pick a winning template to seed the construction, then name it. Templates carry the pack grammar, so anything you start from is already on-grid and territory-aware. The agent brief box (type what you want, get soul + 3 variants) ships in v1; today the soul is drafted in chat.</p>' +
      '<div class="gallery">' + TEMPLATES.map((t, i) => {
        let prev = '';
        try { prev = SIC.compose({ icon_id: 'tpl', construction: { params: { parts: t.parts } } }).strokeSvg(40); } catch (e) {}
        return '<div class="tpl" data-tpl="' + i + '">' + (t.win ? '<span class="win">winning</span>' : '') + '<div class="tprev">' + prev + '</div><h4>' + t.name + '</h4><p>' + t.hint + '</p></div>';
      }).join('') + '</div>' +
      '<div class="namerow" id="nameRow" style="display:none"><input type="text" id="newName" placeholder="icon name, e.g. orb focusing"><button class="hbtn primary" id="createBtn">Create draft →</button><span style="font-size:0.68rem;color:var(--text-dim)" id="tplPicked"></span></div>';
    main.querySelectorAll('.tpl').forEach((el) => el.addEventListener('click', () => {
      pickedTemplate = TEMPLATES[parseInt(el.dataset.tpl, 10)];
      main.querySelector('#nameRow').style.display = 'flex';
      main.querySelector('#tplPicked').textContent = 'template: ' + pickedTemplate.name;
      main.querySelector('#newName').focus();
    }));
    const create = () => {
      const name = (main.querySelector('#newName').value || '').trim();
      if (!name || !pickedTemplate) { toast('Pick a template and a name'); return; }
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const rec = {
        icon_id: 'si:' + slug, label: name.replace(/\\b\\w/g, (ch) => ch.toUpperCase()), pack_id: 'agent-pulse',
        version: '0.1.0', design_state: 'shape_drawn',
        face: { depicts: 'Draft from template: ' + pickedTemplate.name + '. Complete the soul (mind map, anti-associations) with the agent before merge.', style_renders: ['stroke', 'solid', 'elegance'] },
        soul: { purpose: '(draft) ' + name },
        pulse: { motion: { has_motion: true, behavior: '(draft)' } },
        construction: { grid: 24, params: { parts: JSON.parse(JSON.stringify(pickedTemplate.parts)) } },
        __file: 'local'
      };
      RECORDS.push(rec);
      sel = rec; startMode = false; pickedTemplate = null;
      renderAll();
      toast('Draft created from ' + name + '. Tune, gate, then download to persist.');
    };
    main.querySelector('#createBtn').addEventListener('click', create);
    main.querySelector('#newName').addEventListener('keydown', (e) => { if (e.key === 'Enter') create(); });
  }

  function wireStage(c) {
    const q = (id) => document.getElementById(id);
    if (q('lockShapeBtn')) q('lockShapeBtn').addEventListener('click', () => { sel.design_state = 'shape_approved'; renderAll(); toast('Shape locked. Geometry frozen; motion stage unlocked.'); persist(true); });
    if (q('iterateBtn')) q('iterateBtn').addEventListener('click', () => toast('Keep tuning in the panel on the right, or ask the agent for variants.'));
    if (q('unlockShapeBtn')) q('unlockShapeBtn').addEventListener('click', () => { sel.design_state = 'shape_drawn'; renderAll(); toast('Shape unlocked for iteration.'); persist(true); });
    if (q('lockMotionBtn')) q('lockMotionBtn').addEventListener('click', () => { sel.design_state = 'render_approved'; renderAll(); toast('Motion locked. Production stage unlocked.'); persist(true); });
    if (q('unlockMotionBtn')) q('unlockMotionBtn').addEventListener('click', () => { sel.design_state = 'shape_approved'; finalized.delete(sel.icon_id); renderAll(); toast('Back to motion.'); persist(true); });
    if (q('finalizeBtn')) q('finalizeBtn').addEventListener('click', () => { finalized.add(sel.icon_id); renderAll(); toast(sel.label + ' finalized for production.'); persist(true); });
    document.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', () => {
      let out = '';
      if (b.dataset.copy === 'stroke') out = c.strokeSvg(24);
      if (b.dataset.copy === 'solid') out = c.solidSvg(24);
      if (b.dataset.copy === 'eleg') out = '<style>' + SIC.ANIM_CSS + '</style>' + c.elegSvg(96).replace('fill="none">', 'fill="none">' + SIC.GRADIENT_DEFS);
      if (navigator.clipboard) navigator.clipboard.writeText(out).catch(() => {});
      toast('Copied ' + b.dataset.copy + ' export');
    }));
  }

  /* ---------- parameter panel ---------- */
  const RANGES = { r: [0.5, 12, 0.1], w: [0.5, 4, 0.1], cx: [0, 24, 0.1], cy: [0, 24, 0.1], x: [0, 24, 0.1], y: [0, 24, 0.1], h: [0.5, 24, 0.1], rx: [0, 6, 0.05], opacity: [0, 1, 0.05], a1: [-360, 360, 5], a2: [-360, 360, 5], delay: [0, 4, 0.05], dur: [0.2, 8, 0.1], tx: [0, 12, 0.5], d: [0.2, 6, 0.1] };
  const GEOM_KEYS = ['r', 'w', 'cx', 'cy', 'x', 'y', 'h', 'rx', 'opacity', 'a1', 'a2', 'd'];
  function renderParts() {
    const host = document.getElementById('parts');
    const note = document.getElementById('lockNote');
    host.innerHTML = '';
    if (startMode) { note.innerHTML = ''; return; }
    const stage = stageOf(sel);
    const geomLocked = stage !== 'shape';
    const motionLocked = stage === 'production';
    note.innerHTML = geomLocked ? '<div class="locknote">' + (motionLocked ? 'Finalized: all parameters frozen. Unlock via the gate bars.' : 'Shape locked: geometry frozen, motion timing editable.') + '</div>' : '';
    const parts = sel.construction && sel.construction.params && sel.construction.params.parts || [];
    parts.forEach((part, pi) => {
      const box = document.createElement('div');
      box.className = 'part' + (openParts.has(pi) ? ' open' : '');
      const head = document.createElement('div');
      head.className = 'part-head';
      head.innerHTML = '<span class="t">' + part.type + '</span><span>' + (part.role || 'ink') + (part.anim ? ' · ' + part.anim.name : '') + '</span><span class="caret">' + (openParts.has(pi) ? '▾' : '▸') + '</span>';
      head.addEventListener('click', () => { openParts.has(pi) ? openParts.delete(pi) : openParts.add(pi); renderParts(); });
      box.appendChild(head);
      const body = document.createElement('div');
      body.className = 'part-body';
      const addCtl = (obj, key, label, locked) => {
        const v = obj[key];
        const row = document.createElement('div');
        if (typeof v === 'number') {
          const [min, max, step] = RANGES[key] || [0, 24, 0.1];
          row.className = 'ctl';
          row.innerHTML = '<label>' + label + '</label><input type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + v + '"' + (locked ? ' disabled' : '') + '><span class="val">' + v + '</span>';
          const slider = row.querySelector('input');
          slider.addEventListener('input', () => { obj[key] = parseFloat(slider.value); row.querySelector('.val').textContent = slider.value; renderStage(); renderQueue(); });
        } else if (typeof v === 'string' && key === 'role') {
          row.className = 'ctl wide';
          row.innerHTML = '<label>role</label><select' + (locked ? ' disabled' : '') + '><option>ink</option><option>dim</option><option>accent</option><option>white</option></select>';
          const s = row.querySelector('select');
          s.value = v;
          s.addEventListener('change', () => { obj[key] = s.value; renderStage(); renderQueue(); });
        } else if (typeof v === 'string') {
          row.className = 'ctl wide';
          row.innerHTML = '<label>' + label + '</label><input type="text" value="' + v.replace(/"/g, '&quot;') + '"' + (locked ? ' disabled' : '') + '>';
          row.querySelector('input').addEventListener('change', (e) => { obj[key] = e.target.value; renderStage(); renderQueue(); });
        } else return;
        body.appendChild(row);
      };
      for (const key of Object.keys(part)) {
        if (['type', 'items', 'anim', 'renders', 'onFace', 'head', 'accentIndex'].includes(key)) continue;
        addCtl(part, key, key, geomLocked);
      }
      if (!('role' in part)) { part.role = 'ink'; addCtl(part, 'role', 'role', geomLocked); }
      if (part.items) part.items.forEach((b, i) => { addCtl(b, 'x', 'bar' + i + ' x', geomLocked); addCtl(b, 'h', 'bar' + i + ' h', geomLocked); });
      if (part.anim) { addCtl(part.anim, 'delay', 'delay', motionLocked); if (part.anim.dur !== undefined) addCtl(part.anim, 'dur', 'dur', motionLocked); if (part.anim.tx !== undefined) addCtl(part.anim, 'tx', 'tx', motionLocked); }
      box.appendChild(body);
      host.appendChild(box);
    });
  }

  /* ---------- header actions ---------- */
  const toast = (m) => {
    const t = document.getElementById('toast');
    t.textContent = m; t.classList.add('show');
    clearTimeout(window.__tt); window.__tt = setTimeout(() => t.classList.remove('show'), 2200);
  };
  document.getElementById('newBtn').addEventListener('click', () => { startMode = true; pickedTemplate = null; renderAll(); });
  if (CAN_SAVE) document.getElementById('saveBtn').style.display = 'flex';
  document.getElementById('saveBtn').addEventListener('click', () => persist(false));
  document.getElementById('copyBtn').addEventListener('click', () => {
    const clean = { ...sel }; delete clean.__file;
    if (navigator.clipboard) navigator.clipboard.writeText(JSON.stringify(clean, null, 2)).catch(() => {});
    toast('Record JSON copied' + (sel.__file === 'local' ? ' (new draft)' : ', paste into ' + sel.__file));
  });
  document.getElementById('downloadBtn').addEventListener('click', () => {
    const byFile = {};
    for (const r of RECORDS) { (byFile[r.__file] = byFile[r.__file] || []).push(r); }
    for (const [file, recs] of Object.entries(byFile)) {
      const cleaned = recs.map((r) => { const cc = { ...r }; delete cc.__file; return cc; });
      const blob = new Blob([JSON.stringify({ note: file === 'local' ? 'new drafts from icon lab, complete souls then add to a batch file' : 'tuned in icon lab, merge records[] back into ' + file, records: cleaned }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (file === 'local' ? 'new-drafts.json' : 'tuned-' + file);
      a.click();
    }
    toast('Downloaded record files');
  });

  function renderAll() { renderStepper(); renderQueue(); renderStage(); renderParts(); }
  renderAll();
</script>
</body>
</html>`;

const out = join(root, 'mockups', 'si-icon-lab.html');
writeFileSync(out, html);
console.log(`written ${out} · ${records.length} records inlined · ${8} templates`);
