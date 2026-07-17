#!/usr/bin/env node
// Generate the paper-stage review page for a design-record batch.
// The records are the source of truth; this page is a build artifact.
// Usage: node scripts/build-batch-review.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const batch = JSON.parse(readFileSync(join(root, 'data/si-registry/source/design/agent-pulse-batch-1-orbs.json'), 'utf8'));
const packDoc = JSON.parse(readFileSync(join(root, 'data/si-registry/source/design/agent-pulse-pack.json'), 'utf8'));
const pack = packDoc.pack;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const verdictColors = { chosen: 'var(--success)', candidate: 'var(--accent-soft)', rejected: 'var(--text-dim)', reserved: '#60a5fa' };

const cards = batch.records.map((r, i) => {
  const chosen = r.soul.mindmap.metaphor_candidates.find((c) => c.verdict === 'chosen');
  const others = r.soul.mindmap.metaphor_candidates.filter((c) => c.verdict !== 'chosen');
  return `
  <article class="card" id="${r.icon_id.replace('si:', '')}">
    <header>
      <span class="num">${String(i + 1).padStart(2, '0')}</span>
      <h2>${esc(r.label)}</h2>
      <code>${esc(r.icon_id)}</code>
      <span class="state">${esc(r.design_state.replace('_', ' '))}</span>
    </header>
    <p class="purpose">${esc(r.soul.purpose)}</p>
    <div class="chosen">
      <div class="chosen__label">Recommended metaphor</div>
      <div class="chosen__idea">${esc(chosen.idea)}</div>
      <div class="chosen__depicts">${esc(r.face.depicts)}</div>
      <div class="chosen__reason">${esc(chosen.reason)}</div>
    </div>
    <details>
      <summary>Alternatives considered (${others.length}) · anti-associations · distinctness · motion</summary>
      <ul class="alts">
        ${others.map((c) => `<li><b style="color:${verdictColors[c.verdict]}">${esc(c.verdict)}</b> · ${esc(c.idea)} <span class="why">${esc(c.reason)}</span></li>`).join('')}
      </ul>
      <div class="row"><b>Must never read as</b> ${r.soul.mindmap.anti_associations.map((a) => `<span class="chip">${esc(a)}</span>`).join('')}</div>
      <div class="row"><b>Distinct from</b> ${r.soul.distinct_from.map((d) => `<span class="chip">${esc(d.icon_id.replace('si:', ''))}: ${esc(d.differentiator)}</span>`).join('')}</div>
      <div class="row"><b>Motion</b> <span class="motion">${esc(r.pulse.motion.behavior)}</span></div>
    </details>
    <div class="verdict-row">
      <span class="verdict-hint">Your verdict:</span>
      <span class="v approve">approve as recommended</span>
      <span class="v redirect">redirect (say how)</span>
    </div>
  </article>`;
}).join('\n');

const grammar = pack.design_language.grammar.tokens.map((t) => `<li><b>${esc(t.rule)}</b> · ${esc(t.meaning)}</li>`).join('');
const rules = pack.design_language.craft_rules.map((r) => `<li><b>${esc(r.id)}</b> ${esc(r.rule)} <span class="why">${esc(r.origin)}</span></li>`).join('');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Agent Pulse · Batch 1 paper review</title>
<style>
  :root {
    --accent: #FF4F00; --accent-soft: #ff906c; --bg: #0e0e0e; --surface: #131313;
    --surface-2: #1a1919; --text: #ffffff; --text-muted: #cccaca; --text-dim: #767575;
    --outline-ghost: rgba(72, 72, 71, 0.25); --success: #4ade80;
    --font-head: "Space Grotesk", "Segoe UI", system-ui, sans-serif;
    --font-body: "Manrope", "Segoe UI", system-ui, sans-serif;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: var(--bg); color: var(--text); font-family: var(--font-body); line-height: 1.6; }
  main { max-width: 880px; margin: 0 auto; padding: 2.4rem 1.4rem 6rem; }
  h1 { font-family: var(--font-head); font-size: 1.5rem; font-weight: 600; letter-spacing: -0.02em; }
  .sub { color: var(--text-dim); font-size: 0.85rem; margin-top: 0.4rem; max-width: 700px; }
  .sub b { color: var(--accent-soft); }
  .lawbox { margin-top: 1.4rem; border: 1px solid var(--outline-ghost); border-radius: 12px; background: var(--surface); padding: 1rem 1.2rem; font-size: 0.78rem; color: var(--text-muted); }
  .lawbox summary { cursor: pointer; font-family: var(--font-head); font-weight: 600; font-size: 0.85rem; }
  .lawbox ul { margin: 0.6rem 0 0 1.1rem; display: flex; flex-direction: column; gap: 0.3rem; }
  .lawbox .why { color: var(--text-dim); font-size: 0.7rem; }
  .card { margin-top: 1.2rem; border: 1px solid var(--outline-ghost); border-radius: 14px; background: var(--surface); padding: 1.2rem 1.3rem; }
  .card header { display: flex; align-items: baseline; gap: 0.7rem; flex-wrap: wrap; }
  .card .num { font-family: var(--font-head); color: var(--text-dim); font-size: 0.85rem; }
  .card h2 { font-family: var(--font-head); font-size: 1.1rem; font-weight: 600; }
  .card code { font-size: 0.68rem; color: var(--text-dim); background: var(--surface-2); border-radius: 4px; padding: 0.1rem 0.4rem; }
  .card .state { margin-left: auto; font-size: 0.58rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent-soft); background: rgba(255,79,0,0.1); border-radius: 4px; padding: 0.12rem 0.4rem; }
  .purpose { color: var(--text-muted); font-size: 0.85rem; margin-top: 0.4rem; }
  .chosen { margin-top: 0.8rem; border-left: 3px solid var(--accent); background: rgba(255, 79, 0, 0.05); border-radius: 0 10px 10px 0; padding: 0.7rem 0.9rem; }
  .chosen__label { font-size: 0.6rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--accent-soft); }
  .chosen__idea { font-family: var(--font-head); font-weight: 600; font-size: 0.95rem; margin-top: 0.2rem; }
  .chosen__depicts { color: var(--text-muted); font-size: 0.8rem; margin-top: 0.3rem; }
  .chosen__reason { color: var(--text-dim); font-size: 0.75rem; margin-top: 0.35rem; }
  details { margin-top: 0.7rem; font-size: 0.78rem; color: var(--text-muted); }
  summary { cursor: pointer; color: var(--text-dim); font-size: 0.74rem; }
  .alts { margin: 0.5rem 0 0 1.1rem; display: flex; flex-direction: column; gap: 0.3rem; }
  .alts .why { color: var(--text-dim); font-size: 0.7rem; }
  .row { margin-top: 0.55rem; display: flex; flex-wrap: wrap; gap: 0.3rem; align-items: baseline; }
  .row b { font-size: 0.62rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-dim); margin-right: 0.2rem; }
  .chip { font-size: 0.66rem; color: var(--text-dim); background: var(--surface-2); border-radius: 4px; padding: 0.1rem 0.4rem; }
  .motion { font-size: 0.74rem; }
  .verdict-row { margin-top: 0.8rem; display: flex; gap: 0.5rem; align-items: center; }
  .verdict-hint { font-size: 0.66rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.08em; }
  .v { font-size: 0.7rem; border-radius: 999px; padding: 0.18rem 0.6rem; border: 1px solid var(--outline-ghost); color: var(--text-dim); }
  .v.approve { border-color: rgba(74, 222, 128, 0.4); color: var(--success); }
  .v.redirect { border-color: rgba(255, 79, 0, 0.4); color: var(--accent-soft); }
  footer { margin-top: 2.5rem; color: var(--text-dim); font-size: 0.7rem; letter-spacing: 0.05em; display: flex; justify-content: space-between; }
</style>
</head>
<body>
<main>
  <h1>Agent Pulse · Batch 1: the 10 orb states</h1>
  <p class="sub">Paper-stage review. <b>No shapes are drawn yet, on purpose</b>: approve or redirect each metaphor in words, and only approved ones get geometry. Generated from <code style="font-size:0.75rem">agent-pulse-batch-1-orbs.json</code> by <code style="font-size:0.75rem">scripts/build-batch-review.mjs</code>; the records are the source of truth.</p>

  <details class="lawbox">
    <summary>The pack law these were authored under (from the agent-pulse pack record)</summary>
    <ul>${grammar}</ul>
    <ul style="margin-top:0.8rem">${rules}</ul>
  </details>

  ${cards}

  <footer><span>CURLY MOLE LABS</span><span>AGENT PULSE · BATCH 1 · METAPHOR GATE · GENERATED FROM RECORDS</span></footer>
</main>
</body>
</html>`;

const out = join(root, 'mockups', 'si-pack-2-batch-1-review.html');
writeFileSync(out, html);
console.log(`written ${out} · ${batch.records.length} records`);
