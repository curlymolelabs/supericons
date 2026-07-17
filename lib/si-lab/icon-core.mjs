// SI universal icon core: deterministic renderer + lints for ANY icon,
// built directly on the six-source research (docs/si-v2/research-icon-fundamentals-2026-07-14.md).
// No pack semantics, no orbs: pure geometry governed by a SET PROFILE.
//
// Set profile (the documented spec sheet every source demands):
//   { grid: 24, live: 20, stroke: 2, caps: 'round'|'square', join: 'round'|'miter',
//     radius: 2, angles: [15, 30, 45, 90], style: 'outline'|'solid' }
//
// Universal part types (construction.params.parts):
//   circle   { cx, cy, r, fill? }
//   rect     { x, y, w, h, rx?, fill? }
//   line     { x1, y1, x2, y2 }
//   polyline { pts: 'x,y x,y ...', close?, fill? }
//   arc      { cx, cy, r, a1, a2 }          degrees, 0 = east, CCW positive
//   dot      { cx, cy, r }                  always filled
//   path     { d, fill? }                   escape hatch
// Shared: opacity?, w? (stroke override), dash?, renders? ['outline','solid']
//
// Keylines (Material optical parity, on the 24 grid):
//   circle diameter 20, square 18x18, rect-h 20x16, rect-v 16x20

const P = (n) => Math.round(n * 100) / 100;

export const DEFAULT_PROFILE = Object.freeze({
  grid: 24, live: 20, stroke: 2, caps: 'round', join: 'round', radius: 2,
  angles: [15, 30, 45, 90], style: 'outline',
});

export const KEYLINES = Object.freeze({
  circle: { label: 'Circle Ø20', guide: '<circle cx="12" cy="12" r="10"/>' },
  square: { label: 'Square 18', guide: '<rect x="3" y="3" width="18" height="18" rx="2"/>' },
  'rect-h': { label: 'Rect 20x16', guide: '<rect x="2" y="4" width="20" height="16" rx="2"/>' },
  'rect-v': { label: 'Rect 16x20', guide: '<rect x="4" y="2" width="16" height="20" rx="2"/>' },
  free: { label: 'Freeform', guide: '' },
});

const pt = (cx, cy, r, aDeg) => {
  const a = (aDeg * Math.PI) / 180;
  return [P(cx + r * Math.cos(a)), P(cy - r * Math.sin(a))];
};

function arcPath(p) {
  const [x1, y1] = pt(p.cx, p.cy, p.r, p.a1);
  const [x2, y2] = pt(p.cx, p.cy, p.r, p.a2);
  const delta = p.a2 - p.a1;
  return `M${x1} ${y1}A${p.r} ${p.r} 0 ${Math.abs(delta) > 180 ? 1 : 0} ${delta > 0 ? 0 : 1} ${x2} ${y2}`;
}

const inRender = (part, render) => !part.renders || part.renders.includes(render);
const oAttr = (o) => (o !== undefined && o < 1 ? ` opacity="${o}"` : '');

function renderParts(params, profile, render) {
  const solid = render === 'solid';
  const out = [];
  for (const p of params.parts) {
    if (!inRender(p, render)) continue;
    const w = (p.w || profile.stroke) + (solid ? 0.4 : 0);
    const dash = p.dash ? ` stroke-dasharray="${p.dash}"` : '';
    const o = oAttr(p.opacity);
    const strokeAttrs = ` stroke-width="${w}"${dash}`;
    const filled = p.fill || (solid && (p.type === 'circle' || p.type === 'rect' || (p.type === 'polyline' && p.close)));
    if (p.type === 'circle') {
      out.push(filled ? `<circle cx="${p.cx}" cy="${p.cy}" r="${p.r}" fill="currentColor" stroke="none"${o}/>`
        : `<circle cx="${p.cx}" cy="${p.cy}" r="${p.r}" fill="none"${strokeAttrs}${o}/>`);
    } else if (p.type === 'rect') {
      const rx = p.rx !== undefined ? p.rx : profile.radius;
      out.push(filled ? `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="${rx}" fill="currentColor" stroke="none"${o}/>`
        : `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="${rx}" fill="none"${strokeAttrs}${o}/>`);
    } else if (p.type === 'line') {
      out.push(`<path d="M${p.x1} ${p.y1}L${p.x2} ${p.y2}" fill="none"${strokeAttrs}${o}/>`);
    } else if (p.type === 'polyline') {
      const d = 'M' + String(p.pts).trim().split(/\s+/).map((c, i) => (i === 0 ? c.replace(',', ' ') : 'L' + c.replace(',', ' '))).join('') + (p.close ? 'z' : '');
      out.push(filled ? `<path d="${d}" fill="currentColor" stroke="none"${o}/>` : `<path d="${d}" fill="none"${strokeAttrs}${o}/>`);
    } else if (p.type === 'arc') {
      out.push(`<path d="${arcPath(p)}" fill="none"${strokeAttrs}${o}/>`);
    } else if (p.type === 'dot') {
      out.push(`<circle cx="${p.cx}" cy="${p.cy}" r="${p.r + (solid ? 0.2 : 0)}" fill="currentColor" stroke="none"${o}/>`);
    } else if (p.type === 'path') {
      out.push(p.fill ? `<path d="${p.d}" fill="currentColor" stroke="none"${o}/>` : `<path d="${p.d}" fill="none"${strokeAttrs}${o}/>`);
    }
  }
  return out.join('');
}

export function render(record, profileIn) {
  const profile = { ...DEFAULT_PROFILE, ...(profileIn || record.profile || {}) };
  const params = record.construction && record.construction.params;
  if (!params || !Array.isArray(params.parts)) throw new Error(`No construction.params.parts on ${record.icon_id || 'record'}`);
  const wrap = (body, size) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="${profile.caps}" stroke-linejoin="${profile.join}">${body}</svg>`;
  return {
    outlineSvg: (size) => wrap(renderParts(params, profile, 'outline'), size),
    solidSvg: (size) => wrap(renderParts(params, profile, 'solid'), size),
  };
}

// Guide overlay for the creator canvas: grid, live area, center lines, diagonals, keyline.
export function guides(keyline) {
  let g = '';
  for (let i = 1; i < 24; i++) g += `<path d="M${i} 0v24M0 ${i}h24" stroke="rgba(255,255,255,0.04)" stroke-width="0.05"/>`;
  g += '<path d="M6 0v24M12 0v24M18 0v24M0 6h24M0 12h24M0 18h24" stroke="rgba(255,255,255,0.09)" stroke-width="0.07"/>';
  g += '<rect x="2" y="2" width="20" height="20" fill="none" stroke="rgba(96,165,250,0.4)" stroke-width="0.12" stroke-dasharray="0.6 0.6"/>';
  g += '<path d="M0 0L24 24M24 0L0 24" stroke="rgba(255,255,255,0.06)" stroke-width="0.07"/>';
  const k = KEYLINES[keyline];
  if (k && k.guide) g += k.guide.replace('/>', ' fill="none" stroke="rgba(255,79,0,0.45)" stroke-width="0.14" stroke-dasharray="0.8 0.5"/>');
  return g;
}

// ---------------------------------------------------------------- lints
// Grounded in the research: live area, coordinate hygiene, angle vocabulary,
// keyline fit, single stroke weight, small-size/manual checks.
function partExtent(p) {
  if (p.type === 'circle' || p.type === 'arc' || p.type === 'dot') return [p.cx - p.r, p.cy - p.r, p.cx + p.r, p.cy + p.r];
  if (p.type === 'rect') return [p.x, p.y, p.x + p.w, p.y + p.h];
  if (p.type === 'line') return [Math.min(p.x1, p.x2), Math.min(p.y1, p.y2), Math.max(p.x1, p.x2), Math.max(p.y1, p.y2)];
  if (p.type === 'polyline') {
    const c = String(p.pts).trim().split(/\s+/).map((s) => s.split(',').map(Number));
    const xs = c.map((q) => q[0]); const ys = c.map((q) => q[1]);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  }
  return null;
}

export function lint(record, profileIn) {
  const profile = { ...DEFAULT_PROFILE, ...(profileIn || record.profile || {}) };
  const res = [];
  const push = (level, id, msg) => res.push({ level, id, msg });
  const parts = (record.construction && record.construction.params && record.construction.params.parts) || [];

  // live area (2px padding on the 24 grid; optical exceptions are the human's call)
  const pad = (24 - profile.live) / 2;
  let inLive = true; let pathCount = 0;
  const bbox = [Infinity, Infinity, -Infinity, -Infinity];
  const nums = [];
  for (const p of parts) {
    for (const [k, v] of Object.entries(p)) {
      if (typeof v === 'number' && k !== 'opacity' && k !== 'w' && k !== 'a1' && k !== 'a2') nums.push(v);
      if (k === 'pts') String(v).trim().split(/[\s,]+/).forEach((s) => nums.push(Number(s)));
    }
    const ext = partExtent(p);
    if (!ext) { pathCount += 1; continue; }
    if (ext[0] < pad - 0.01 || ext[1] < pad - 0.01 || ext[2] > 24 - pad + 0.01 || ext[3] > 24 - pad + 0.01) inLive = false;
    bbox[0] = Math.min(bbox[0], ext[0]); bbox[1] = Math.min(bbox[1], ext[1]);
    bbox[2] = Math.max(bbox[2], ext[2]); bbox[3] = Math.max(bbox[3], ext[3]);
  }
  push(inLive ? 'pass' : 'warn', 'live-area', inLive ? `inside the ${profile.live} live area` : `crosses the ${profile.live} live area (allowed only as a deliberate optical exception)`);
  if (pathCount) push('info', 'paths', pathCount + ' path part(s) not auto-linted');

  // coordinate hygiene (Hugeicons: decimals blur; half-grid allowed on 24)
  const offGrid = nums.some((n) => Math.abs(n * 2 - Math.round(n * 2)) > 0.02);
  push(offGrid ? 'warn' : 'pass', 'snap', offGrid ? 'off-grid coordinates (snap to 0.5 to avoid raster blur)' : 'coordinates snapped to the half grid');

  // keyline fit (Material optical parity)
  const key = record.keyline || 'free';
  if (key !== 'free' && bbox[0] !== Infinity) {
    const wSpan = P(bbox[2] - bbox[0]); const hSpan = P(bbox[3] - bbox[1]);
    const expect = { circle: [20, 20], square: [18, 18], 'rect-h': [20, 16], 'rect-v': [16, 20] }[key];
    const fits = wSpan <= expect[0] + 0.4 && hSpan <= expect[1] + 0.4 && Math.max(wSpan, hSpan) >= Math.max(...expect) - 4;
    push(fits ? 'pass' : 'warn', 'keyline', fits ? `${wSpan}x${hSpan} sits on the ${key} keyline` : `${wSpan}x${hSpan} vs ${key} keyline ${expect[0]}x${expect[1]} (calibrate for optical parity)`);
  }

  // one stroke weight (the most-violated rule per the research)
  const weights = [...new Set(parts.filter((p) => !p.fill && p.type !== 'dot').map((p) => p.w || profile.stroke))];
  push(weights.length > 1 ? 'warn' : 'pass', 'stroke', weights.length > 1 ? 'mixed stroke weights: ' + weights.join(', ') : `single stroke weight (${weights[0] || profile.stroke})`);

  // angle vocabulary (lines and polylines against the profile's allowed angles)
  const allowed = new Set([0, 90, ...profile.angles]);
  let offAngle = null;
  const checkSeg = (x1, y1, x2, y2) => {
    let a = Math.abs(Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI) % 180;
    if (a > 90) a = 180 - a;
    const okA = [...allowed].some((v) => Math.abs(a - (v % 180 > 90 ? 180 - (v % 180) : v % 90 === 0 ? (v % 180 === 0 ? 0 : 90) : v)) < 0.6 || Math.abs(a - v) < 0.6);
    if (!okA) offAngle = P(a);
  };
  for (const p of parts) {
    if (p.type === 'line') checkSeg(p.x1, p.y1, p.x2, p.y2);
    if (p.type === 'polyline') {
      const c = String(p.pts).trim().split(/\s+/).map((s) => s.split(',').map(Number));
      for (let i = 1; i < c.length; i++) checkSeg(c[i - 1][0], c[i - 1][1], c[i][0], c[i][1]);
    }
  }
  push(offAngle === null ? 'pass' : 'info', 'angles', offAngle === null ? 'angles within the set vocabulary' : `segment at ${offAngle} degrees is outside the vocabulary (${[0, 90, ...profile.angles].join('/')})`);

  // the human checks every source ends with
  push('manual', 'metaphor', record.metaphor ? `confirm the metaphor reads instantly: ${record.metaphor}` : 'no metaphor recorded: what does this icon depict, and will strangers recognize it?');
  push('manual', 'small-size', 'confirm it reads at 16px (squint strip) with one clear focal point');
  return res;
}
