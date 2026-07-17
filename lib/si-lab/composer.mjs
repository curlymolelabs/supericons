// SI Icon Lab composer v0: deterministically renders an icon from the
// structured construction params in an SI design record.
// Runs in Node (build scripts, tests) and the browser (the Lab page inlines it).
//
// A record's construction.params is { parts: [...] }. Part types:
//   orb   { cx, cy, r, opacity? }                      the agent body
//   halo  { cx, cy, r, w?, opacity? }                  outline ring
//   arc   { cx, cy, r, a1, a2, w?, head? }             angles in degrees, 0 = east, CCW positive
//   dot   { cx, cy, r }                                filled circle
//   pill  { x, y, w, h, rx? }                          filled rounded rect
//   bars  { cy, w?, items: [{ x, h }], accentIndex? }  equalizer bars centered on cy
//   path  { d, w?, fill? }                             escape hatch, any geometry
// Shared part fields:
//   role: 'ink' | 'dim' | 'accent' | 'white'   (default ink)
//   onFace: true    part sits on the filled base (solid render switches base to heavy outline)
//   renders: ['stroke','solid','elegance']     limit part to specific renders
//   dash: '1 2.5'   stroke-dasharray
//   anim: { name, delay?, dur?, tx? }           elegance-only motion (seq, eq, blink, breathe,
//                                               orbit, orbitRest, draw14, shakes, glitch, travel, rise)

const CFG = {
  strokePrimary: 2,
  solidExtra: 0.4,
  solidBaseOutline: 2.6,
  elegWScale: 0.45,
  dimOpacity: 0.4,
  glassRx: 0.42,
  glassRy: 0.24,
  glassDx: -0.31,
  glassDy: -0.38,
};

const P = (n) => Math.round(n * 100) / 100;
const pt = (cx, cy, r, aDeg) => {
  const a = (aDeg * Math.PI) / 180;
  return [P(cx + r * Math.cos(a)), P(cy - r * Math.sin(a))];
};

function arcPath(p) {
  const [x1, y1] = pt(p.cx, p.cy, p.r, p.a1);
  const [x2, y2] = pt(p.cx, p.cy, p.r, p.a2);
  const delta = p.a2 - p.a1;
  const large = Math.abs(delta) > 180 ? 1 : 0;
  const sweep = delta > 0 ? 0 : 1;
  return `M${x1} ${y1}A${p.r} ${p.r} 0 ${large} ${sweep} ${x2} ${y2}`;
}

function arrowHead(p) {
  const a = (p.a2 * Math.PI) / 180;
  const dir = p.a2 - p.a1 > 0 ? -1 : 1; // travel direction at the end of the arc
  const u = [dir * Math.sin(a), dir * Math.cos(a)];
  const v = [u[1], -u[0]];
  const [ex, ey] = pt(p.cx, p.cy, p.r, p.a2);
  const tip = [P(ex + u[0] * 2.6), P(ey + u[1] * 2.6)];
  const b1 = [P(ex + v[0] * 1.6 - u[0] * 0.4), P(ey + v[1] * 1.6 - u[1] * 0.4)];
  const b2 = [P(ex - v[0] * 1.6 - u[0] * 0.4), P(ey - v[1] * 1.6 - u[1] * 0.4)];
  return `M${tip[0]} ${tip[1]}L${b1[0]} ${b1[1]}L${b2[0]} ${b2[1]}z`;
}

const inRender = (part, render) => !part.renders || part.renders.includes(render);
const opacityAttr = (o) => (o !== undefined && o < 1 ? ` opacity="${o}"` : '');

// ---------------------------------------------------------------- monochrome
// stroke and solid renders: currentColor, role maps to opacity only.
function monoParts(params, render) {
  const solid = render === 'solid';
  const heavyBase = solid && params.parts.some((p) => p.onFace && inRender(p, 'solid'));
  const out = [];
  for (const p of params.parts) {
    if (!inRender(p, render)) continue;
    const dimO = p.role === 'dim' ? CFG.dimOpacity : undefined;
    const o = p.opacity !== undefined ? p.opacity : dimO;
    const w = (p.w || CFG.strokePrimary) + (solid ? CFG.solidExtra : 0);
    const dash = p.dash ? ` stroke-dasharray="${p.dash}"` : '';
    if (p.type === 'orb') {
      if (solid && !heavyBase) out.push(`<circle cx="${p.cx}" cy="${p.cy}" r="${p.r + 0.5}" fill="currentColor"${opacityAttr(o)}/>`);
      else if (solid) out.push(`<circle cx="${p.cx}" cy="${p.cy}" r="${p.r + 0.5}" stroke="currentColor" stroke-width="${CFG.solidBaseOutline}" fill="none"${opacityAttr(o)}/>`);
      else out.push(`<circle cx="${p.cx}" cy="${p.cy}" r="${p.r}"${opacityAttr(o)}/>`);
    } else if (p.type === 'halo') {
      out.push(`<circle cx="${p.cx}" cy="${p.cy}" r="${p.r}" ${solid ? `stroke="currentColor" fill="none" ` : ''}stroke-width="${w}"${opacityAttr(o !== undefined ? o : CFG.dimOpacity)}/>`);
    } else if (p.type === 'arc') {
      const s = solid ? ` stroke="currentColor" fill="none" stroke-linecap="round"` : '';
      out.push(`<path d="${arcPath(p)}"${s} stroke-width="${w}"${dash}${opacityAttr(o)}/>`);
      if (p.head) out.push(`<path d="${arrowHead(p)}" fill="currentColor" stroke="none"${opacityAttr(o)}/>`);
    } else if (p.type === 'dot') {
      out.push(`<circle cx="${p.cx}" cy="${p.cy}" r="${p.r + (solid ? 0.2 : 0)}" fill="currentColor" stroke="none"${opacityAttr(o)}/>`);
    } else if (p.type === 'pill') {
      out.push(`<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="${p.rx !== undefined ? p.rx : p.h / 2}" fill="currentColor" stroke="none"${opacityAttr(o)}/>`);
    } else if (p.type === 'bars') {
      for (const b of p.items) {
        const bw = (p.w || CFG.strokePrimary) + (solid ? CFG.solidExtra : 0);
        if (solid) out.push(`<rect x="${P(b.x - bw / 2)}" y="${P(p.cy - b.h / 2)}" width="${bw}" height="${b.h}" rx="${bw / 2}" fill="currentColor"${opacityAttr(o)}/>`);
        else out.push(`<path d="M${b.x} ${P(p.cy - b.h / 2)}v${b.h}" stroke-width="${bw}"${opacityAttr(o)}/>`);
      }
    } else if (p.type === 'path') {
      const fillAttr = p.fill ? ` fill="currentColor" stroke="none"` : solid ? ` stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"` : '';
      out.push(`<path d="${p.d}"${fillAttr} stroke-width="${w}"${dash}${opacityAttr(o)}/>`);
    }
  }
  return out.join('');
}

// ---------------------------------------------------------------- elegance
const ELEG_COLOR = { ink: 'url(#gInk)', dim: 'rgba(255,255,255,0.25)', accent: 'url(#gAccS)', white: '#ffffff' };

function animAttrs(p) {
  if (!p.anim) return { cls: '', style: '' };
  const st = [];
  if (p.anim.delay) st.push(`animation-delay:${p.anim.delay}s`);
  if (p.anim.dur) st.push(`animation-duration:${p.anim.dur}s`);
  if (p.anim.tx) st.push(`--tx:${p.anim.tx}px`);
  if (p.anim.d) st.push(`--d:${p.anim.d}s`);
  return { cls: ` class="a-${p.anim.name}"`, style: st.length ? ` style="${st.join(';')}"` : '' };
}

function elegParts(params) {
  const out = [];
  for (const p of params.parts) {
    if (!inRender(p, 'elegance')) continue;
    const color = ELEG_COLOR[p.role || 'ink'];
    const w = P((p.w || CFG.strokePrimary) * CFG.elegWScale);
    const { cls, style } = animAttrs(p);
    const dash = p.dash ? ` stroke-dasharray="${p.dash}"` : '';
    const o = opacityAttr(p.opacity);
    if (p.type === 'orb') {
      const glass = `<ellipse cx="${P(p.cx + p.r * CFG.glassDx)}" cy="${P(p.cy + p.r * CFG.glassDy)}" rx="${P(p.r * CFG.glassRx)}" ry="${P(p.r * CFG.glassRy)}" fill="url(#gGlass)"/>`;
      out.push(`<g${cls}${style}${o}><circle cx="${p.cx}" cy="${p.cy}" r="${p.r}" fill="url(#gOrb)" stroke="rgba(255,255,255,0.22)" stroke-width="0.35"/>${glass}</g>`);
    } else if (p.type === 'halo') {
      out.push(`<circle${cls} cx="${p.cx}" cy="${p.cy}" r="${P(p.r * 1.05)}" fill="url(#gAcc)" opacity="${p.opacity !== undefined ? p.opacity : 0.22}"${style}/>`);
    } else if (p.type === 'arc') {
      const seg = `<path d="${arcPath(p)}" stroke="${color}" stroke-width="${w}" stroke-linecap="round" fill="none"${dash}/>`;
      const glow = p.role === 'accent' ? `<path d="${arcPath(p)}" stroke="rgba(255,79,0,0.3)" stroke-width="${P(w * 2)}" stroke-linecap="round" fill="none"/>` : '';
      const head = p.head ? `<path d="${arrowHead(p)}" fill="${color}"/>` : '';
      out.push(`<g${cls}${style}${o}>${glow}${seg}${head}</g>`);
    } else if (p.type === 'dot') {
      const glow = p.role === 'accent' ? `<circle cx="${p.cx}" cy="${p.cy}" r="${P(p.r * 1.75)}" fill="url(#gAcc)"/>` : '';
      out.push(`<g${cls}${style}${o}>${glow}<circle cx="${p.cx}" cy="${p.cy}" r="${p.r}" fill="${color}"/></g>`);
    } else if (p.type === 'pill') {
      out.push(`<rect${cls} x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="${p.rx !== undefined ? p.rx : p.h / 2}" fill="${color}"${style}${o}/>`);
    } else if (p.type === 'bars') {
      p.items.forEach((b, i) => {
        const role = i === p.accentIndex ? 'accent' : p.role || 'ink';
        const bw = P((p.w || CFG.strokePrimary) * CFG.elegWScale * 1.3);
        const delay = p.anim ? ` style="animation-delay:${P((p.anim.delay || 0) + i * 0.15)}s"` : '';
        const cls2 = p.anim ? ` class="a-${p.anim.name}"` : '';
        out.push(`<rect${cls2} x="${P(b.x - bw / 2)}" y="${P(p.cy - b.h / 2)}" width="${bw}" height="${b.h}" rx="${P(bw / 2)}" fill="${ELEG_COLOR[role]}"${delay}${o}/>`);
      });
    } else if (p.type === 'path') {
      if (p.fill) out.push(`<path${cls} d="${p.d}" fill="${color}"${style}${o}/>`);
      else out.push(`<path${cls} d="${p.d}" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"${dash}${style}${o}/>`);
    }
  }
  return out.join('');
}

// ---------------------------------------------------------------- public api
const TILE = '<rect x="6" y="6" width="84" height="84" rx="21" fill="url(#gTile)"/>'
           + '<rect x="6.7" y="6.7" width="82.6" height="82.6" rx="20.3" fill="none" stroke="url(#gRim)" stroke-width="1.4"/>';

function compose(record) {
  const params = record.construction && record.construction.params;
  if (!params || !Array.isArray(params.parts)) throw new Error(`No construction.params.parts on ${record.icon_id}`);
  return {
    strokeSvg: (size) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${monoParts(params, 'stroke')}</svg>`,
    solidSvg: (size) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">${monoParts(params, 'solid')}</svg>`,
    elegSvg: (size) => `<svg width="${size}" height="${size}" viewBox="0 0 96 96" fill="none">${TILE}<g transform="translate(12 12) scale(3)">${elegParts(params)}</g></svg>`,
  };
}

// keyframes the elegance render's anim names rely on; the Lab page injects this once.
const ANIM_CSS = `
[class*="a-"] { transform-box: fill-box; transform-origin: center; }
.a-orbit, .a-orbitRest { transform-box: view-box; transform-origin: 48px 48px; }
@keyframes k-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
@keyframes k-eq { 0%, 100% { transform: scaleY(0.45); } 50% { transform: scaleY(1); } }
@keyframes k-seq { 0%, 60%, 100% { opacity: 0.3; } 14%, 44% { opacity: 1; } }
@keyframes k-blink { 0%, 46% { opacity: 1; } 52%, 94% { opacity: 0.15; } 100% { opacity: 1; } }
@keyframes k-orbit { to { transform: rotate(360deg); } }
@keyframes k-orbitRest { 0% { transform: rotate(0deg); } 66%, 100% { transform: rotate(360deg); } }
@keyframes k-draw14 { 0% { stroke-dashoffset: 14; opacity: 1; } 40%, 75% { stroke-dashoffset: 0; opacity: 1; } 92%, 100% { stroke-dashoffset: 0; opacity: 0; } }
@keyframes k-shakes { 0%, 86%, 100% { transform: translateX(0); } 89% { transform: translateX(-0.6px); } 93% { transform: translateX(0.6px); } 97% { transform: translateX(-0.4px); } }
@keyframes k-glitch { 0%, 84%, 100% { transform: translateX(0); opacity: 0; } 86% { transform: translateX(-1px); opacity: 1; } 90% { transform: translateX(0.8px); opacity: 1; } 95% { transform: translateX(-0.3px); opacity: 0; } }
@keyframes k-travel { 0% { transform: translateX(0); opacity: 0; } 14% { opacity: 1; } 78% { opacity: 1; } 100% { transform: translateX(var(--tx, 5px)); opacity: 0; } }
@keyframes k-rise { 0% { transform: translateY(2px); opacity: 0; } 35% { opacity: 1; } 72% { transform: translateY(-2px); opacity: 1; } 100% { transform: translateY(-3.4px); opacity: 0; } }
.a-breathe { animation: k-breathe 3.4s ease-in-out infinite; }
.a-eq { animation: k-eq 1.1s ease-in-out infinite; }
.a-seq { animation: k-seq 2.4s ease infinite; }
.a-blink { animation: k-blink 1.6s ease infinite; }
.a-orbit { animation: k-orbit var(--d, 2s) linear infinite; }
.a-orbitRest { animation: k-orbitRest 3.2s ease-in-out infinite; }
.a-draw14 { animation: k-draw14 3s ease infinite; }
.a-shakes { animation: k-shakes 2.6s linear infinite; }
.a-glitch { animation: k-glitch 2.6s linear infinite; }
.a-travel { animation: k-travel 2.4s ease-in-out infinite; }
.a-rise { animation: k-rise 5.2s ease infinite; }
@media (prefers-reduced-motion: reduce) { [class*="a-"] { animation: none !important; } }`;

// ---------------------------------------------------------------- lints (A3)
// Record-native QA checks shown beside gate 1. Conservative: warn, never block.
function lintRecord(record) {
  const res = [];
  const push = (level, id, msg) => res.push({ level, id, msg });
  const parts = (record.construction && record.construction.params && record.construction.params.parts) || [];

  // L1 canvas bounds within the 1.5 safety margin (paths skipped honestly)
  const M = 1.5;
  let pathCount = 0;
  let inBounds = true;
  const bbox = [Infinity, Infinity, -Infinity, -Infinity];
  for (const p of parts) {
    let ext = null;
    if (p.type === 'orb' || p.type === 'halo' || p.type === 'dot' || p.type === 'arc') {
      ext = [p.cx - p.r, p.cy - p.r, p.cx + p.r, p.cy + p.r];
    } else if (p.type === 'pill') {
      ext = [p.x, p.y, p.x + p.w, p.y + p.h];
    } else if (p.type === 'bars') {
      const xs = p.items.map((b) => b.x);
      const hs = p.items.map((b) => b.h);
      ext = [Math.min(...xs) - 1, p.cy - Math.max(...hs) / 2, Math.max(...xs) + 1, p.cy + Math.max(...hs) / 2];
    } else { pathCount += 1; continue; }
    if (ext[0] < M - 0.01 || ext[1] < M - 0.01 || ext[2] > 24 - M + 0.01 || ext[3] > 24 - M + 0.01) inBounds = false;
    bbox[0] = Math.min(bbox[0], ext[0]); bbox[1] = Math.min(bbox[1], ext[1]);
    bbox[2] = Math.max(bbox[2], ext[2]); bbox[3] = Math.max(bbox[3], ext[3]);
  }
  push(inBounds ? 'pass' : 'warn', 'bounds', inBounds ? 'inside 1.5 safety margin' : 'crosses the 1.5 safety margin');
  if (pathCount) push('info', 'paths', pathCount + ' path part(s) not auto-linted');

  // L8 optical footprint vs the keyline table (R12): compositions should not fill the grid
  if (bbox[0] !== Infinity) {
    const span = Math.max(bbox[2] - bbox[0], bbox[3] - bbox[1]);
    if (span > 21.2) push('warn', 'optical', `footprint ${P(span)} fills the live area; calibrate to keyline weight (circle 20, square 18, rect 20x16)`);
    else if (span < 13) push('info', 'optical', `small footprint (${P(span)}); check optical weight beside keyline-sized siblings`);
    else push('pass', 'optical', `footprint ${P(span)} within keyline weight range`);
  }

  // L2 concentric gap vs the base orb (gap between strokes >= stroke rule)
  const base = parts.filter((p) => p.type === 'orb').sort((a, b) => b.r - a.r)[0];
  if (base) {
    let tight = null;
    for (const p of parts) {
      if ((p.type !== 'halo' && p.type !== 'arc') || Math.abs(p.cx - base.cx) > 0.6 || Math.abs(p.cy - base.cy) > 0.6) continue;
      const gap = (p.r - (p.w || 2) / 2) - (base.r + 1);
      if (gap < (p.w || 2) - 0.01) tight = p;
    }
    push(tight ? 'warn' : 'pass', 'gap', tight ? `ring at r${tight.r} sits tight against the orb (gap under stroke width)` : 'ring gaps clear the stroke rule');
  }

  // L3 weight hierarchy: nothing heavier than the 2px primary (onFace marks exempt)
  const heavy = parts.find((p) => !p.onFace && p.type !== 'orb' && p.type !== 'pill' && (p.w || 2) > 2.05);
  push(heavy ? 'warn' : 'pass', 'weights', heavy ? `part heavier than primary weight (${heavy.w})` : 'weight hierarchy respected');

  // L4 accent discipline: accent means active, keep it scarce
  const accents = parts.filter((p) => p.role === 'accent').length;
  push(accents > 4 ? 'warn' : 'pass', 'accent', accents > 4 ? accents + ' accent parts (accent should mean one thing)' : 'accent used sparingly (' + accents + ')');

  // L5 reduced-motion fallback declared
  const rm = record.pulse && record.pulse.motion && (!record.pulse.motion.has_motion || (record.pulse.motion.spec && record.pulse.motion.spec.reduced_motion));
  push(rm ? 'pass' : 'warn', 'reduced-motion', rm ? 'reduced-motion fallback declared' : 'no reduced-motion fallback in motion spec');

  // L6 distinctness declared
  const dn = record.soul && Array.isArray(record.soul.distinct_from) && record.soul.distinct_from.length > 0;
  push(dn ? 'pass' : 'warn', 'distinct', dn ? 'distinct_from constraints present' : 'no distinct_from constraints (draft?)');

  // L7 anti-association checklist is a human check at the gate
  const anti = (record.soul && record.soul.mindmap && record.soul.mindmap.anti_associations) || [];
  push('manual', 'anti', anti.length ? 'confirm it does not read as: ' + anti.join(', ') : 'no anti-associations recorded (draft?)');

  // L9 shared-silhouette families (R10): sibling distinguishability is a human check at 16px
  if (parts.some((p) => p.type === 'orb')) {
    push('manual', 'siblings', 'confirm this state is distinguishable from its sibling orb states at 16px by interior contrast alone');
  }

  return res;
}

const GRADIENT_DEFS = `<defs>
<linearGradient id="gTile" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#272625"/><stop offset="100%" stop-color="#0f0f0f"/></linearGradient>
<linearGradient id="gRim" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.3"/><stop offset="45%" stop-color="#ffffff" stop-opacity="0.02"/><stop offset="100%" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
<radialGradient id="gOrb" cx="38%" cy="30%" r="78%"><stop offset="0%" stop-color="#4a4846"/><stop offset="55%" stop-color="#242322"/><stop offset="100%" stop-color="#141313"/></radialGradient>
<radialGradient id="gAcc" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#FF4F00" stop-opacity="0.8"/><stop offset="100%" stop-color="#FF4F00" stop-opacity="0"/></radialGradient>
<linearGradient id="gAccS" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ff8a4d"/><stop offset="100%" stop-color="#e03e00"/></linearGradient>
<linearGradient id="gInk" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f7f5f2"/><stop offset="100%" stop-color="#c4bfb9"/></linearGradient>
<linearGradient id="gGlass" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.55"/><stop offset="100%" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
</defs>`;

export { compose, CFG, ANIM_CSS, GRADIENT_DEFS, lintRecord };
