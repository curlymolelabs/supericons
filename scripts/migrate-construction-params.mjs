#!/usr/bin/env node
// One-time migration: add structured construction.params (composer input) to
// every agent-pulse design record, translated from the prose recipes.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'data', 'si-registry', 'source', 'design');

const PARAMS = {
  'si:orb-thinking': { parts: [
    { type: 'orb', cx: 12, cy: 12, r: 8.5 },
    { type: 'dot', cx: 8.2, cy: 12, r: 1.15, onFace: true, anim: { name: 'seq' } },
    { type: 'dot', cx: 12, cy: 12, r: 1.15, role: 'accent', onFace: true, anim: { name: 'seq', delay: 0.35 } },
    { type: 'dot', cx: 15.8, cy: 12, r: 1.15, onFace: true, anim: { name: 'seq', delay: 0.7 } }
  ] },
  'si:voice-wave': { parts: [
    { type: 'bars', cy: 12, w: 2, accentIndex: 2, anim: { name: 'eq' }, items: [
      { x: 4.6, h: 5 }, { x: 8.3, h: 10 }, { x: 12, h: 15 }, { x: 15.7, h: 10 }, { x: 19.4, h: 5 } ] }
  ] },
  'si:orb-listening': { parts: [
    { type: 'orb', cx: 12, cy: 14.5, r: 5 },
    { type: 'path', d: 'M5.8 11.5a6.2 6.2 0 0 1 12.4 0', w: 2 },
    { type: 'pill', x: 4.6, y: 11.5, w: 2.4, h: 5.5, rx: 1.2 },
    { type: 'pill', x: 17, y: 11.5, w: 2.4, h: 5.5, rx: 1.2 },
    { type: 'path', d: 'M3.2 12.1A3.4 3.4 0 0 0 3.96 13.7M3.96 14.9A3.4 3.4 0 0 0 3.2 16.5', w: 1.8, renders: ['stroke', 'solid'] },
    { type: 'path', d: 'M20.8 12.1A3.4 3.4 0 0 1 20.04 13.7M20.04 14.9A3.4 3.4 0 0 1 20.8 16.5', w: 1.8, renders: ['stroke', 'solid'] },
    { type: 'path', d: 'M3.2 12.1a3.4 3.4 0 0 0 0 4.4', w: 1.8, role: 'accent', renders: ['elegance'], anim: { name: 'seq' } },
    { type: 'path', d: 'M20.8 12.1a3.4 3.4 0 0 1 0 4.4', w: 1.8, role: 'accent', renders: ['elegance'], anim: { name: 'seq', delay: 0.4 } }
  ] },
  'si:sound-blast': { parts: [
    { type: 'orb', cx: 12, cy: 12, r: 5 },
    { type: 'arc', cx: 12, cy: 12, r: 7.2, a1: 20, a2: 70, w: 2, anim: { name: 'seq' } },
    { type: 'arc', cx: 12, cy: 12, r: 7.2, a1: 110, a2: 160, w: 2, anim: { name: 'seq' } },
    { type: 'arc', cx: 12, cy: 12, r: 7.2, a1: 200, a2: 250, w: 2, anim: { name: 'seq' } },
    { type: 'arc', cx: 12, cy: 12, r: 7.2, a1: 290, a2: 340, w: 2, anim: { name: 'seq' } },
    { type: 'arc', cx: 12, cy: 12, r: 9.8, a1: 20, a2: 70, w: 2, role: 'accent', anim: { name: 'seq', delay: 0.35 } },
    { type: 'arc', cx: 12, cy: 12, r: 9.8, a1: 110, a2: 160, w: 2, role: 'accent', anim: { name: 'seq', delay: 0.35 } },
    { type: 'arc', cx: 12, cy: 12, r: 9.8, a1: 200, a2: 250, w: 2, role: 'accent', anim: { name: 'seq', delay: 0.35 } },
    { type: 'arc', cx: 12, cy: 12, r: 9.8, a1: 290, a2: 340, w: 2, role: 'accent', anim: { name: 'seq', delay: 0.35 } }
  ] },
  'si:orb-idle': { parts: [
    { type: 'orb', cx: 12, cy: 12, r: 6, anim: { name: 'breathe', dur: 4 } },
    { type: 'halo', cx: 12, cy: 12, r: 9, w: 1.8, opacity: 0.4, anim: { name: 'breathe', dur: 4 } }
  ] },
  'si:orb-speaking': { parts: [
    { type: 'orb', cx: 12, cy: 12, r: 5 },
    { type: 'bars', cy: 12, w: 1.8, onFace: true, anim: { name: 'eq' }, items: [
      { x: 10.4, h: 2.8 }, { x: 12, h: 4.2 }, { x: 13.6, h: 2.8 } ] },
    { type: 'path', d: 'M17.6 9.6a3.4 3.4 0 0 1 0 4.8M6.4 9.6a3.4 3.4 0 0 0 0 4.8', w: 1.8, anim: { name: 'seq' } },
    { type: 'path', d: 'M20 8.2a5.4 5.4 0 0 1 0 7.6M4 8.2a5.4 5.4 0 0 0 0 7.6', w: 1.8, role: 'accent', anim: { name: 'seq', delay: 0.45 } }
  ] },
  'si:orb-working': { parts: [
    { type: 'orb', cx: 12, cy: 12, r: 5.5 },
    { type: 'arc', cx: 12, cy: 12, r: 8.5, a1: 5, a2: 95, w: 2, role: 'accent', anim: { name: 'orbit', d: 1.8 } }
  ] },
  'si:orb-waiting-input': { parts: [
    { type: 'orb', cx: 12, cy: 13.5, r: 5 },
    { type: 'dot', cx: 12, cy: 4.6, r: 1.8, role: 'accent', anim: { name: 'blink' } }
  ] },
  'si:orb-done': { parts: [
    { type: 'orb', cx: 12, cy: 12, r: 6.5 },
    { type: 'path', d: 'M8.6 12.2l2.4 2.4 4.6-5', w: 2, role: 'accent', onFace: true, dash: '14', anim: { name: 'draw14' } }
  ] },
  'si:orb-error': { parts: [
    { type: 'orb', cx: 12, cy: 12, r: 6, anim: { name: 'shakes' } },
    { type: 'path', d: 'M12 8.5v4.2', w: 2.2, role: 'white', onFace: true },
    { type: 'dot', cx: 12, cy: 15.4, r: 1.2, role: 'white', onFace: true },
    { type: 'pill', x: 6.6, y: 10.6, w: 10.8, h: 1, rx: 0.5, role: 'accent', renders: ['elegance'], anim: { name: 'glitch' } },
    { type: 'pill', x: 8, y: 13.4, w: 8, h: 0.75, rx: 0.38, renders: ['elegance'], anim: { name: 'glitch', delay: 0.25 } }
  ] },
  'si:orb-blocked': { parts: [
    { type: 'arc', cx: 12, cy: 12, r: 6.5, a1: 120, a2: 240, w: 2 },
    { type: 'arc', cx: 12, cy: 12, r: 6.5, a1: 60, a2: -60, w: 2 },
    { type: 'path', d: 'M12 6l4.5 1.7v3c0 3-2 4.6-4.5 5.4-2.5-.8-4.5-2.4-4.5-5.4v-3z', w: 2, anim: { name: 'breathe', dur: 4.5 } },
    { type: 'pill', x: 9.8, y: 10.7, w: 4.4, h: 1.5, rx: 0.75, role: 'accent', anim: { name: 'breathe', dur: 4.5 } }
  ] },
  'si:orb-retrying': { parts: [
    { type: 'orb', cx: 12, cy: 12, r: 5 },
    { type: 'arc', cx: 12, cy: 12, r: 8.5, a1: 160, a2: 20, w: 2, head: true, role: 'accent', anim: { name: 'orbitRest' } }
  ] },
  'si:orb-handoff': { parts: [
    { type: 'orb', cx: 7, cy: 14.5, r: 4 },
    { type: 'orb', cx: 17, cy: 14.5, r: 4 },
    { type: 'path', d: 'M9.5 10.5q2.5-3.5 5 0', w: 1.8, role: 'dim', dash: '1 2.5' },
    { type: 'dot', cx: 9.8, cy: 8.6, r: 1.5, role: 'accent', anim: { name: 'travel', tx: 5 } }
  ] },
  'si:orb-sleeping': { parts: [
    { type: 'orb', cx: 12, cy: 13, r: 5.5, opacity: 0.55 },
    { type: 'path', d: 'M16.5 5.5h3l-3 3h3', w: 1.8, anim: { name: 'rise' } },
    { type: 'path', d: 'M20.2 2.6h2.2l-2.2 2.2h2.2', w: 1.5, role: 'dim', anim: { name: 'rise', delay: 2.6 } }
  ] }
};

let applied = 0;
for (const file of ['agent-pulse-pilot.json', 'agent-pulse-batch-1-orbs.json']) {
  const path = join(dir, file);
  const doc = JSON.parse(readFileSync(path, 'utf8'));
  for (const record of doc.records) {
    const params = PARAMS[record.icon_id];
    if (!params) { console.error(`no params for ${record.icon_id}`); process.exit(1); }
    record.construction = record.construction || { grid: 24 };
    record.construction.params = params;
    applied += 1;
  }
  writeFileSync(path, JSON.stringify(doc, null, 2) + '\n');
}
console.log(`params applied to ${applied} records`);
