#!/usr/bin/env node
// Build the universal SI Icon Creator page. Redesigned from scratch on the
// six-source research: keyline system, set profile, universal geometric
// primitives, metaphor-first flow, visual gates. No pack semantics, no orbs.
// Usage: node scripts/build-icon-creator.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const coreSrc = readFileSync(join(root, 'lib/si-lab/icon-core.mjs'), 'utf8')
  .replace(/^export const /gm, 'const ')
  .replace(/^export function /gm, 'function ')
  + '\nwindow.SICore = { render, lint, guides, KEYLINES, DEFAULT_PROFILE };';

// load saved sets (creator output lives in design/sets/)
const setsDir = join(root, 'data', 'si-registry', 'source', 'design', 'sets');
let savedRecords = [];
if (existsSync(setsDir)) {
  for (const f of readdirSync(setsDir).filter((x) => x.endsWith('.json'))) {
    const doc = JSON.parse(readFileSync(join(setsDir, f), 'utf8'));
    for (const r of doc.records || []) savedRecords.push({ ...r, __set: doc.set_id || f.replace('.json', '') });
  }
}

// research-grounded example icons (universal subjects, so the page is never empty)
const EXAMPLES = [
  { icon_id: 'si:search', label: 'Search', metaphor: 'magnifying glass (recognizable reference)', keyline: 'circle', design_state: 'shape_drawn', __set: 'examples',
    construction: { grid: 24, params: { parts: [ { type: 'circle', cx: 10.5, cy: 10.5, r: 6.5 }, { type: 'line', x1: 15.5, y1: 15.5, x2: 20.5, y2: 20.5 } ] } } },
  { icon_id: 'si:document', label: 'Document', metaphor: 'paper sheet with text lines (literal)', keyline: 'rect-v', design_state: 'shape_drawn', __set: 'examples',
    construction: { grid: 24, params: { parts: [ { type: 'rect', x: 5, y: 2.5, w: 14, h: 19, rx: 2 }, { type: 'line', x1: 9, y1: 9, x2: 15, y2: 9 }, { type: 'line', x1: 9, y1: 13, x2: 15, y2: 13 }, { type: 'line', x1: 9, y1: 17, x2: 12.5, y2: 17 } ] } } },
  { icon_id: 'si:notifications', label: 'Notifications', metaphor: 'container with corner badge (convention)', keyline: 'square', design_state: 'shape_drawn', __set: 'examples',
    construction: { grid: 24, params: { parts: [ { type: 'rect', x: 3, y: 3, w: 18, h: 18, rx: 2.5 }, { type: 'dot', cx: 18.5, cy: 5.5, r: 2.5 } ] } } },
];
const RECORDS = [...EXAMPLES, ...savedRecords];

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SI Icon Creator | universal</title>
<style>
  :root {
    --accent: #FF4F00; --accent-soft: #ff906c; --bg: #0e0e0e; --surface: #131313;
    --surface-2: #1a1919; --surface-3: #201f1f; --text: #ffffff; --text-muted: #cccaca;
    --text-dim: #767575; --outline-ghost: rgba(72, 72, 71, 0.25); --success: #4ade80; --info: #60a5fa;
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
  .hbtn.mini { height: 24px; padding: 0 0.5rem; font-size: 0.64rem; }

  .layout { flex: 1; display: flex; min-height: 0; }
  .queue { width: 210px; flex: 0 0 auto; overflow-y: auto; border-right: 1px solid var(--outline-ghost); padding: 0.8rem 0.5rem 2rem; }
  .queue h3 { font-family: var(--font-head); font-size: 0.6rem; letter-spacing: 0.13em; text-transform: uppercase; color: var(--text-dim); padding: 0.5rem 0.5rem 0.3rem; }
  .newbtn { width: 100%; margin-bottom: 0.5rem; }
  .qitem { display: flex; align-items: center; gap: 0.55rem; padding: 0.4rem 0.5rem; border-radius: 8px; cursor: pointer; }
  .qitem:hover { background: var(--surface-2); }
  .qitem.active { background: var(--surface-3); }
  .qitem .thumb { width: 26px; height: 26px; display: grid; place-items: center; color: #dfdcd8; flex: 0 0 auto; }
  .qitem .nm { font-size: 0.72rem; color: var(--text-muted); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .qitem .st { width: 7px; height: 7px; border-radius: 50%; }
  .st.shape_drawn { background: var(--accent-soft); }
  .st.shape_approved, .st.render_approved { background: var(--success); }

  .stage { flex: 1; overflow-y: auto; padding: 1.1rem 1.4rem 3rem; min-width: 0; }
  .stage-head { display: flex; align-items: baseline; gap: 0.7rem; flex-wrap: wrap; }
  .stage-head h1 { font-family: var(--font-head); font-size: 1.2rem; font-weight: 600; }
  .stage-head code { font-family: var(--font-mono); font-size: 0.68rem; color: var(--text-dim); background: var(--surface-2); border-radius: 4px; padding: 0.1rem 0.4rem; }
  .chip { font-size: 0.56rem; letter-spacing: 0.09em; text-transform: uppercase; border-radius: 4px; padding: 0.12rem 0.4rem; }
  .chip.shape_drawn { color: var(--accent-soft); background: rgba(255,79,0,0.12); }
  .chip.shape_approved, .chip.render_approved { color: var(--success); background: rgba(74,222,128,0.12); }
  .metaline { color: var(--text-dim); font-size: 0.76rem; margin-top: 0.25rem; }
  .metaline input { background: var(--surface-2); border: 1px solid var(--outline-ghost); border-radius: 6px; color: var(--text); font-size: 0.74rem; padding: 0.25rem 0.5rem; width: min(480px, 90%); }

  .workbench { margin-top: 1rem; display: flex; gap: 1rem; flex-wrap: wrap; align-items: flex-start; }
  .canvas-card { border: 1px solid var(--outline-ghost); border-radius: 12px; background: var(--surface); padding: 0.8rem; }
  .canvas-card .plabel { font-size: 0.58rem; letter-spacing: 0.11em; text-transform: uppercase; color: var(--text-dim); margin-bottom: 0.5rem; display: flex; gap: 0.6rem; align-items: center; }
  .canvas-wrap { position: relative; width: 288px; height: 288px; color: #e9e6e2; }
  .canvas-wrap svg { position: absolute; inset: 0; }
  .sizes-card { border: 1px solid var(--outline-ghost); border-radius: 12px; background: var(--surface); padding: 0.8rem 1rem; }
  .prow { display: flex; align-items: center; gap: 1rem; color: #e9e6e2; flex-wrap: wrap; }
  .prow .sz { display: flex; flex-direction: column; align-items: center; gap: 0.3rem; }
  .prow .sz span { font-size: 0.56rem; color: var(--text-dim); }
  .squint { filter: blur(1px) contrast(0.9); }

  .lints { margin-top: 1rem; display: flex; gap: 0.35rem; flex-wrap: wrap; }
  .lint { font-size: 0.6rem; letter-spacing: 0.04em; border-radius: 5px; padding: 0.16rem 0.45rem; }
  .lint.pass { color: var(--success); background: rgba(74,222,128,0.09); }
  .lint.warn { color: var(--accent-soft); background: rgba(255,79,0,0.1); }
  .lint.info { color: var(--text-dim); background: var(--surface-2); }
  .lint.manual { color: var(--info); background: rgba(96,165,250,0.1); flex-basis: 100%; }

  .gate { margin-top: 1.1rem; border: 1px solid rgba(255,79,0,0.35); border-radius: 12px; background: rgba(255,79,0,0.05); padding: 0.8rem 1rem; display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap; }
  .gate.locked { border-color: rgba(74,222,128,0.4); background: rgba(74,222,128,0.05); }
  .gate .gq { font-family: var(--font-head); font-size: 0.82rem; font-weight: 600; }
  .gate .gs { font-size: 0.68rem; color: var(--text-dim); flex-basis: 100%; }

  .gallery { margin-top: 1rem; display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 0.8rem; }
  .tpl { border: 1px solid var(--outline-ghost); border-radius: 12px; background: var(--surface); padding: 0.9rem; cursor: pointer; transition: all 140ms; }
  .tpl:hover { border-color: var(--accent); transform: translateY(-2px); }
  .tpl .tprev { display: grid; place-items: center; height: 56px; color: #e9e6e2; }
  .tpl h4 { font-family: var(--font-head); font-size: 0.8rem; margin-top: 0.4rem; }
  .tpl p { font-size: 0.64rem; color: var(--text-dim); line-height: 1.45; margin-top: 0.15rem; }
  .namerow { margin-top: 1rem; display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
  .namerow input { background: var(--surface-2); border: 1px solid var(--outline-ghost); border-radius: 8px; color: var(--text); font-size: 0.8rem; padding: 0.45rem 0.7rem; width: 240px; }

  .panel { width: 330px; flex: 0 0 auto; overflow-y: auto; border-left: 1px solid var(--outline-ghost); padding: 0.9rem 0.9rem 3rem; }
  .panel h3 { font-family: var(--font-head); font-size: 0.62rem; letter-spacing: 0.13em; text-transform: uppercase; color: var(--text-dim); margin: 0.6rem 0.2rem 0.4rem; }
  .profile { border: 1px solid var(--outline-ghost); border-radius: 10px; padding: 0.6rem 0.65rem; margin-bottom: 0.7rem; display: flex; flex-direction: column; gap: 0.45rem; }
  .addrow { display: flex; gap: 0.3rem; flex-wrap: wrap; margin-bottom: 0.6rem; }
  .part { border: 1px solid var(--outline-ghost); border-radius: 10px; margin-bottom: 0.55rem; overflow: hidden; }
  .part-head { display: flex; align-items: center; gap: 0.45rem; padding: 0.45rem 0.6rem; background: var(--surface); cursor: pointer; font-size: 0.72rem; color: var(--text-muted); }
  .part-head .t { font-family: var(--font-mono); color: var(--accent-soft); font-size: 0.66rem; }
  .part-head .acts { margin-left: auto; display: flex; gap: 0.25rem; }
  .part-head .acts button { background: none; border: none; color: var(--text-dim); cursor: pointer; font-size: 0.7rem; }
  .part-head .acts button:hover { color: var(--accent-soft); }
  .part-body { padding: 0.55rem 0.6rem 0.65rem; display: none; flex-direction: column; gap: 0.45rem; }
  .part.open .part-body { display: flex; }
  .ctl { display: grid; grid-template-columns: 46px 1fr 44px; align-items: center; gap: 0.45rem; }
  .ctl label { font-family: var(--font-mono); font-size: 0.62rem; color: var(--text-dim); }
  .ctl input[type=range] { width: 100%; accent-color: var(--accent); }
  .ctl .val { font-family: var(--font-mono); font-size: 0.62rem; color: var(--text-muted); text-align: right; }
  .ctl input[type=text], .ctl select { grid-column: 2 / 4; background: var(--surface-2); border: 1px solid var(--outline-ghost); border-radius: 6px; color: var(--text); font-family: var(--font-mono); font-size: 0.62rem; padding: 0.3rem 0.4rem; width: 100%; }
  .ctl.wide { grid-template-columns: 46px 1fr; }
  .ctl input[type=checkbox] { accent-color: var(--accent); justify-self: start; }
  .footer-note { font-size: 0.62rem; color: var(--text-dim); margin-top: 0.8rem; line-height: 1.5; }

  .toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%) translateY(90px); background: var(--surface-3); border: 1px solid var(--outline-ghost); border-radius: 10px; padding: 0.55rem 1rem; font-size: 0.75rem; z-index: 60; transition: transform 240ms cubic-bezier(0.22,0.61,0.36,1); }
  .toast.show { transform: translateX(-50%) translateY(0); }
  @media (max-width: 1000px) { .panel { display: none; } }
</style>
</head>
<body>
<header>
  <div class="logo"><span class="mark">S</span> Icon Creator</div>
  <span class="badge">universal · research-grounded</span>
  <span style="font-size:0.68rem;color:var(--text-dim)" id="countLine"></span>
  <div class="spacer"></div>
  <button class="hbtn ok" id="saveBtn" style="display:none">Save</button>
  <button class="hbtn" id="copyBtn">Copy record</button>
  <button class="hbtn" id="downloadBtn">Download set</button>
</header>

<div class="layout">
  <aside class="queue">
    <button class="hbtn primary newbtn" id="newBtn">+ New icon</button>
    <div id="queueList"></div>
  </aside>
  <main class="stage" id="stageMain"></main>
  <aside class="panel">
    <h3>Set profile · the spec sheet</h3>
    <div class="profile" id="profileBox"></div>
    <h3>Parts</h3>
    <div class="addrow" id="addRow"></div>
    <div id="parts"></div>
    <div class="footer-note">Universal primitives on the 24 grid, governed by the set profile. Keylines: circle 20, square 18, rect 20x16 / 16x20 (optical parity). Generated by scripts/build-icon-creator.mjs.</div>
  </aside>
</div>

<div class="toast" id="toast">ok</div>

<script>
${coreSrc}
</script>
<script>
  const SIC = window.SICore;
  const RECORDS = ${JSON.stringify(RECORDS)};
  const PROFILE = Object.assign({}, SIC.DEFAULT_PROFILE);

  const TEMPLATES = [
    { id: 'circle', name: 'Circle keyline', keyline: 'circle', hint: 'Round subjects: dials, globes, lenses, badges.', parts: [ { type: 'circle', cx: 12, cy: 12, r: 10 } ] },
    { id: 'square', name: 'Square keyline', keyline: 'square', hint: 'Boxy subjects at 18x18: cards, apps, containers.', parts: [ { type: 'rect', x: 3, y: 3, w: 18, h: 18 } ] },
    { id: 'rect-h', name: 'Wide keyline', keyline: 'rect-h', hint: '20x16 horizontal: trays, mail, media, meters.', parts: [ { type: 'rect', x: 2, y: 4, w: 20, h: 16 } ] },
    { id: 'rect-v', name: 'Tall keyline', keyline: 'rect-v', hint: '16x20 vertical: documents, phones, bookmarks.', parts: [ { type: 'rect', x: 4, y: 2, w: 16, h: 20 } ] },
    { id: 'container-element', name: 'Container + element', keyline: 'square', hint: 'The commonest icon anatomy: a frame plus one focal mark.', parts: [ { type: 'rect', x: 3, y: 3, w: 18, h: 18 }, { type: 'dot', cx: 12, cy: 12, r: 1.8 } ] },
    { id: 'badge', name: 'Corner badge', keyline: 'square', hint: 'Status convention: container with a corner dot.', parts: [ { type: 'rect', x: 3, y: 3, w: 18, h: 18 }, { type: 'dot', cx: 18.5, cy: 5.5, r: 2.5 } ] },
    { id: 'negation', name: 'Negation slash', keyline: 'circle', hint: 'Circle + 45 degree slash: off, muted, forbidden.', parts: [ { type: 'circle', cx: 12, cy: 12, r: 10 }, { type: 'line', x1: 5, y1: 19, x2: 19, y2: 5 } ] },
    { id: 'direction', name: 'Direction', keyline: 'free', hint: 'Chevron on the 45 vocabulary: next, forward, growth.', parts: [ { type: 'polyline', pts: '8,5 15,12 8,19' } ] },
    { id: 'magnifier', name: 'Lens + handle', keyline: 'circle', hint: 'Two-part anatomy: primary shape plus a diagonal accessory.', parts: [ { type: 'circle', cx: 10.5, cy: 10.5, r: 6.5 }, { type: 'line', x1: 15.5, y1: 15.5, x2: 20.5, y2: 20.5 } ] },
    { id: 'freeform', name: 'Blank canvas', keyline: 'free', hint: 'Just the grid and guides. Add parts from the panel.', parts: [] }
  ];

  const PART_DEFAULTS = {
    circle: { type: 'circle', cx: 12, cy: 12, r: 6 },
    rect: { type: 'rect', x: 6, y: 6, w: 12, h: 12 },
    line: { type: 'line', x1: 6, y1: 18, x2: 18, y2: 6 },
    polyline: { type: 'polyline', pts: '6,18 12,6 18,18' },
    arc: { type: 'arc', cx: 12, cy: 12, r: 8, a1: 0, a2: 180 },
    dot: { type: 'dot', cx: 12, cy: 12, r: 1.8 },
    path: { type: 'path', d: 'M6 12h12' }
  };

  let sel = RECORDS[0];
  let startMode = false;
  let pickedTemplate = null;
  let showGuides = true;
  const openParts = new Set([0]);

  /* ---------- queue ---------- */
  function renderQueue() {
    const host = document.getElementById('queueList');
    document.getElementById('countLine').textContent = RECORDS.length + ' icons';
    const groups = [...new Set(RECORDS.map((r) => r.__set))];
    host.innerHTML = '';
    for (const g of groups) {
      const h = document.createElement('h3');
      h.textContent = g;
      host.appendChild(h);
      for (const r of RECORDS.filter((x) => x.__set === g)) {
        const el = document.createElement('div');
        el.className = 'qitem' + (r === sel && !startMode ? ' active' : '');
        let thumb = '?';
        try { thumb = SIC.render(r, PROFILE).outlineSvg(22); } catch (e) {}
        el.innerHTML = '<span class="thumb">' + thumb + '</span><span class="nm">' + r.label + '</span><span class="st ' + r.design_state + '"></span>';
        el.addEventListener('click', () => { sel = r; startMode = false; renderAll(); });
        host.appendChild(el);
      }
    }
  }

  /* ---------- stage ---------- */
  function renderStage() {
    const main = document.getElementById('stageMain');
    if (startMode) return renderStart(main);
    let r;
    try { r = SIC.render(sel, PROFILE); } catch (e) {
      main.innerHTML = '<div style="color:var(--accent-soft)">render error: ' + e.message + '</div>';
      return;
    }
    const locked = sel.design_state !== 'shape_drawn';
    const canvasSvg = '<svg viewBox="0 0 24 24">' + (showGuides ? SIC.guides(sel.keyline || 'free') : '') + '</svg>' + r.outlineSvg(288);
    const szRow = (fn, cls) => [48, 24, 16].map((s) => '<span class="sz ' + (cls || '') + '">' + fn(s) + '<span>' + s + '</span></span>').join('');
    const lints = SIC.lint(sel, PROFILE);
    main.innerHTML =
      '<div class="stage-head"><h1>' + sel.label + '</h1><code>' + sel.icon_id + '</code>' +
      '<code>keyline: ' + (sel.keyline || 'free') + '</code>' +
      '<span class="chip ' + sel.design_state + '">' + sel.design_state.replace(/_/g, ' ') + '</span></div>' +
      '<div class="metaline">metaphor: <input id="metaphorInput" value="' + (sel.metaphor || '').replace(/"/g, '&quot;') + '" placeholder="what does this depict, in words a stranger would use?"' + (locked ? ' disabled' : '') + '></div>' +
      '<div class="workbench">' +
      '<div class="canvas-card"><div class="plabel">Canvas · 24 grid <button class="hbtn mini" id="guidesBtn">' + (showGuides ? 'hide guides' : 'show guides') + '</button></div><div class="canvas-wrap">' + canvasSvg + '</div></div>' +
      '<div>' +
      '<div class="sizes-card"><div class="plabel" style="font-size:0.58rem;letter-spacing:0.11em;text-transform:uppercase;color:var(--text-dim);margin-bottom:0.5rem">Outline · Solid · Squint</div>' +
      '<div class="prow">' + szRow(r.outlineSvg) + '</div>' +
      '<div class="prow" style="margin-top:0.7rem">' + szRow(r.solidSvg) + '</div>' +
      '<div class="prow" style="margin-top:0.7rem"><span class="sz squint">' + r.outlineSvg(24) + '<span>24 blurred</span></span><span class="sz squint">' + r.solidSvg(16) + '<span>16 blurred</span></span></div></div>' +
      '<div class="lints">' + lints.map((l) => '<span class="lint ' + l.level + '">' + l.id + ' · ' + l.msg + '</span>').join('') + '</div>' +
      '</div></div>' +
      (locked
        ? '<div class="gate locked"><span class="gq">Shape locked.</span><button class="hbtn" id="unlockBtn">Unlock and iterate</button>' +
          '<button class="hbtn" data-copy="outline">Copy outline SVG</button><button class="hbtn" data-copy="solid">Copy solid SVG</button>' +
          '<span class="gs">Exports render from the record with the set profile applied.</span></div>'
        : '<div class="gate"><span class="gq">Visual preview gate · does it meet your taste and read instantly?</span>' +
          '<button class="hbtn" id="iterateBtn">Not yet, keep tuning</button>' +
          '<button class="hbtn ok" id="lockBtn">Yes, lock shape →</button>' +
          '<span class="gs">Check the blue manual chips first: metaphor recognizability and the 16px squint.</span></div>');
    wireStage();
  }

  function renderStart(main) {
    main.innerHTML = '<div class="stage-head"><h1>New icon</h1><span class="chip shape_drawn">start</span></div>' +
      '<p class="metaline" style="max-width:640px">Pick a keyline or anatomy starter. Keylines carry Material optical parity (circle 20, square 18, rect 20x16) so different shapes read as the same size. Then name it and record the metaphor: recognizability is the paramount fundamental.</p>' +
      '<div class="gallery">' + TEMPLATES.map((t, i) => {
        let prev = '';
        try { prev = SIC.render({ construction: { params: { parts: t.parts } } }, PROFILE).outlineSvg(38); } catch (e) {}
        return '<div class="tpl" data-tpl="' + i + '"><div class="tprev">' + prev + '</div><h4>' + t.name + '</h4><p>' + t.hint + '</p></div>';
      }).join('') + '</div>' +
      '<div class="namerow" id="nameRow" style="display:none">' +
      '<input type="text" id="newName" placeholder="icon name, e.g. inbox">' +
      '<input type="text" id="newMetaphor" placeholder="metaphor, e.g. tray with incoming arrow" style="width:300px">' +
      '<button class="hbtn primary" id="createBtn">Create →</button><span style="font-size:0.68rem;color:var(--text-dim)" id="tplPicked"></span></div>';
    main.querySelectorAll('.tpl').forEach((el) => el.addEventListener('click', () => {
      pickedTemplate = TEMPLATES[parseInt(el.dataset.tpl, 10)];
      main.querySelector('#nameRow').style.display = 'flex';
      main.querySelector('#tplPicked').textContent = 'starter: ' + pickedTemplate.name;
      main.querySelector('#newName').focus();
    }));
    const create = () => {
      const name = (main.querySelector('#newName').value || '').trim();
      if (!name || !pickedTemplate) { toast('Pick a starter and a name'); return; }
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const rec = {
        icon_id: 'si:' + slug, label: name.replace(/\\b\\w/g, (c) => c.toUpperCase()),
        metaphor: (main.querySelector('#newMetaphor').value || '').trim(),
        keyline: pickedTemplate.keyline, design_state: 'shape_drawn',
        construction: { grid: 24, params: { parts: JSON.parse(JSON.stringify(pickedTemplate.parts)) } },
        __set: 'my-set'
      };
      RECORDS.push(rec);
      sel = rec; startMode = false; pickedTemplate = null;
      renderAll();
      toast('Created ' + name + '. Compose, then gate.');
    };
    main.querySelector('#createBtn').addEventListener('click', create);
    main.querySelector('#newName').addEventListener('keydown', (e) => { if (e.key === 'Enter') create(); });
  }

  function wireStage() {
    const q = (id) => document.getElementById(id);
    if (q('guidesBtn')) q('guidesBtn').addEventListener('click', () => { showGuides = !showGuides; renderStage(); });
    if (q('metaphorInput')) q('metaphorInput').addEventListener('change', (e) => { sel.metaphor = e.target.value; renderStage(); });
    if (q('lockBtn')) q('lockBtn').addEventListener('click', () => { sel.design_state = 'shape_approved'; renderAll(); toast('Shape locked.'); persist(true); });
    if (q('unlockBtn')) q('unlockBtn').addEventListener('click', () => { sel.design_state = 'shape_drawn'; renderAll(); toast('Unlocked for iteration.'); persist(true); });
    if (q('iterateBtn')) q('iterateBtn').addEventListener('click', () => toast('Tune parts on the right, or start over from a different keyline.'));
    document.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', () => {
      const r = SIC.render(sel, PROFILE);
      const out = b.dataset.copy === 'outline' ? r.outlineSvg(24) : r.solidSvg(24);
      if (navigator.clipboard) navigator.clipboard.writeText(out).catch(() => {});
      toast('Copied ' + b.dataset.copy + ' SVG');
    }));
  }

  /* ---------- profile + parts panel ---------- */
  const RANGES = { r: [0.5, 12, 0.5], w: [1, 24, 0.5], h: [1, 24, 0.5], rx: [0, 6, 0.5], x: [0, 24, 0.5], y: [0, 24, 0.5], cx: [0, 24, 0.5], cy: [0, 24, 0.5], x1: [0, 24, 0.5], y1: [0, 24, 0.5], x2: [0, 24, 0.5], y2: [0, 24, 0.5], a1: [-360, 360, 5], a2: [-360, 360, 5], opacity: [0, 1, 0.05], stroke: [1, 3, 0.1], radius: [0, 4, 0.5] };

  function renderProfile() {
    const box = document.getElementById('profileBox');
    box.innerHTML = '';
    const addNum = (key) => {
      const [min, max, step] = RANGES[key] || [0, 24, 0.5];
      const row = document.createElement('div');
      row.className = 'ctl';
      row.innerHTML = '<label>' + key + '</label><input type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + PROFILE[key] + '"><span class="val">' + PROFILE[key] + '</span>';
      const s = row.querySelector('input');
      s.addEventListener('input', () => { PROFILE[key] = parseFloat(s.value); row.querySelector('.val').textContent = s.value; renderStage(); renderQueue(); });
      box.appendChild(row);
    };
    addNum('stroke'); addNum('radius');
    const caps = document.createElement('div');
    caps.className = 'ctl wide';
    caps.innerHTML = '<label>caps</label><select><option>round</option><option>square</option></select>';
    const cs = caps.querySelector('select'); cs.value = PROFILE.caps;
    cs.addEventListener('change', () => { PROFILE.caps = cs.value; PROFILE.join = cs.value === 'round' ? 'round' : 'miter'; renderStage(); renderQueue(); });
    box.appendChild(caps);
    const ang = document.createElement('div');
    ang.className = 'ctl wide';
    ang.innerHTML = '<label>angles</label><input type="text" value="' + PROFILE.angles.join(', ') + '">';
    ang.querySelector('input').addEventListener('change', (e) => {
      PROFILE.angles = e.target.value.split(/[\s,]+/).map(Number).filter((n) => !isNaN(n));
      renderStage();
    });
    box.appendChild(ang);
  }

  function renderParts() {
    const addRow = document.getElementById('addRow');
    const host = document.getElementById('parts');
    addRow.innerHTML = '';
    host.innerHTML = '';
    if (startMode) return;
    const locked = sel.design_state !== 'shape_drawn';
    const parts = sel.construction.params.parts;
    for (const t of Object.keys(PART_DEFAULTS)) {
      const b = document.createElement('button');
      b.className = 'hbtn mini';
      b.textContent = '+ ' + t;
      b.disabled = locked;
      b.addEventListener('click', () => { parts.push(JSON.parse(JSON.stringify(PART_DEFAULTS[t]))); openParts.add(parts.length - 1); renderAll(); });
      addRow.appendChild(b);
    }
    parts.forEach((part, pi) => {
      const box = document.createElement('div');
      box.className = 'part' + (openParts.has(pi) ? ' open' : '');
      const head = document.createElement('div');
      head.className = 'part-head';
      head.innerHTML = '<span class="t">' + part.type + '</span>' +
        '<span class="acts">' +
        '<button data-a="up" title="move up">↑</button><button data-a="down" title="move down">↓</button><button data-a="del" title="delete">✕</button>' +
        '</span>';
      head.addEventListener('click', (e) => {
        if (e.target.dataset && e.target.dataset.a) {
          if (locked) { toast('Unlock the shape first'); return; }
          const a = e.target.dataset.a;
          if (a === 'del') parts.splice(pi, 1);
          if (a === 'up' && pi > 0) { parts.splice(pi - 1, 0, parts.splice(pi, 1)[0]); }
          if (a === 'down' && pi < parts.length - 1) { parts.splice(pi + 1, 0, parts.splice(pi, 1)[0]); }
          renderAll();
          return;
        }
        openParts.has(pi) ? openParts.delete(pi) : openParts.add(pi);
        renderParts();
      });
      box.appendChild(head);
      const body = document.createElement('div');
      body.className = 'part-body';
      for (const [key, v] of Object.entries(part)) {
        if (key === 'type') continue;
        const row = document.createElement('div');
        if (typeof v === 'number') {
          const [min, max, step] = RANGES[key] || [0, 24, 0.5];
          row.className = 'ctl';
          row.innerHTML = '<label>' + key + '</label><input type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + v + '"' + (locked ? ' disabled' : '') + '><span class="val">' + v + '</span>';
          const s = row.querySelector('input');
          s.addEventListener('input', () => { part[key] = parseFloat(s.value); row.querySelector('.val').textContent = s.value; renderStage(); renderQueue(); });
        } else if (typeof v === 'boolean') {
          row.className = 'ctl';
          row.innerHTML = '<label>' + key + '</label><input type="checkbox"' + (v ? ' checked' : '') + (locked ? ' disabled' : '') + '>';
          row.querySelector('input').addEventListener('change', (e) => { part[key] = e.target.checked; renderStage(); renderQueue(); });
        } else {
          row.className = 'ctl wide';
          row.innerHTML = '<label>' + key + '</label><input type="text" value="' + String(v).replace(/"/g, '&quot;') + '"' + (locked ? ' disabled' : '') + '>';
          row.querySelector('input').addEventListener('change', (e) => { part[key] = e.target.value; renderStage(); renderQueue(); });
        }
        body.appendChild(row);
      }
      if (!('fill' in part) && (part.type === 'circle' || part.type === 'rect' || part.type === 'polyline' || part.type === 'path')) {
        const row = document.createElement('div');
        row.className = 'ctl';
        row.innerHTML = '<label>fill</label><input type="checkbox"' + (locked ? ' disabled' : '') + '>';
        row.querySelector('input').addEventListener('change', (e) => { part.fill = e.target.checked; renderStage(); renderQueue(); });
        body.appendChild(row);
      }
      box.appendChild(body);
      host.appendChild(box);
    });
  }

  /* ---------- persistence ---------- */
  const CAN_SAVE = location.protocol.indexOf('http') === 0;
  async function persist(quiet) {
    if (!CAN_SAVE) { if (!quiet) toast('Serve via scripts/icon-lab-serve.mjs to save'); return; }
    const clean = JSON.parse(JSON.stringify(sel)); const set = sel.__set; delete clean.__set;
    try {
      const res = await fetch('/api/save-set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ set, record: clean, profile: PROFILE }) });
      const out = await res.json();
      toast(out.ok ? 'Saved to sets/' + out.file : 'Save failed: ' + out.error);
    } catch (e) { toast('Save failed: ' + e.message); }
  }

  const toast = (m) => {
    const t = document.getElementById('toast');
    t.textContent = m; t.classList.add('show');
    clearTimeout(window.__tt); window.__tt = setTimeout(() => t.classList.remove('show'), 2200);
  };
  document.getElementById('newBtn').addEventListener('click', () => { startMode = true; pickedTemplate = null; renderAll(); });
  if (CAN_SAVE) document.getElementById('saveBtn').style.display = 'flex';
  document.getElementById('saveBtn').addEventListener('click', () => persist(false));
  document.getElementById('copyBtn').addEventListener('click', () => {
    const clean = JSON.parse(JSON.stringify(sel)); delete clean.__set;
    if (navigator.clipboard) navigator.clipboard.writeText(JSON.stringify(clean, null, 2)).catch(() => {});
    toast('Record copied');
  });
  document.getElementById('downloadBtn').addEventListener('click', () => {
    const mine = RECORDS.filter((r) => r.__set !== 'examples').map((r) => { const c = { ...r }; delete c.__set; return c; });
    const blob = new Blob([JSON.stringify({ set_id: 'my-set', profile: PROFILE, records: mine }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'icon-set.json';
    a.click();
    toast('Downloaded set');
  });

  function renderAll() { renderQueue(); renderStage(); renderProfile(); renderParts(); }
  renderAll();
</script>
</body>
</html>`;

const out = join(root, 'mockups', 'si-icon-creator.html');
writeFileSync(out, html);
console.log(`written ${out} · ${RECORDS.length} records · universal, zero orbs`);
