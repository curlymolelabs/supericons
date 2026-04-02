/**
 * Canvas2D renderer for the agent-workflow icon.
 * Replicates the exact CSS animation (si-wf-pulse + si2-link-draw)
 * using requestAnimationFrame. No SVG, no CSS, no DOM paths.
 *
 * Usage:
 *   const renderer = new IconCanvasRenderer(canvas, { bg: '#1a1919' });
 *   renderer.hover();   // start animation
 *   renderer.reset();   // return to resting state
 */
class IconCanvasRenderer {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.bg = opts.bg || '#1a1919';

    // HiDPI setup
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    this.ctx = canvas.getContext('2d');
    this.ctx.scale(dpr, dpr);
    this.w = rect.width;
    this.h = rect.height;

    // Animation state
    this.animating = false;
    this.startTime = 0;
    this.rafId = null;

    // Icon data: coordinates in SVG viewBox 0-24, mapped to canvas size
    // Nodes: [cx, cy, r, fillColor, baseOpacity, delayMs, durationMs]
    this.nodes = [
      { cx: 4,  cy: 12, r: 2.5, fill: '#00D4FF', baseOp: 1.0, delay: 0,   dur: 400 },
      { cx: 12, cy: 6,  r: 2.5, fill: '#6E9AFF', baseOp: 0.9, delay: 200, dur: 400 },
      { cx: 12, cy: 18, r: 2.5, fill: '#7B61FF', baseOp: 0.9, delay: 350, dur: 400 },
      { cx: 20, cy: 12, r: 2.5, fill: '#00D4FF', baseOp: 0.9, delay: 500, dur: 400 },
    ];

    // Links: [x1, y1, x2, y2, strokeColor, delayMs, durationMs]
    this.links = [
      { x1: 6, y1: 11, x2: 10, y2: 7,  stroke: '#00D4FF', delay: 150, dur: 200 },
      { x1: 6, y1: 13, x2: 10, y2: 17, stroke: '#7B61FF', delay: 250, dur: 200 },
      { x1: 14, y1: 7, x2: 18, y2: 11, stroke: '#00D4FF', delay: 400, dur: 200 },
      { x1: 14, y1: 17, x2: 18, y2: 13, stroke: '#7B61FF', delay: 450, dur: 200 },
    ];

    // Draw resting state
    this.drawFrame(null);
  }

  // Map SVG viewBox coord (0-24) to canvas pixel coord
  sx(v) { return (v / 24) * this.w; }
  sy(v) { return (v / 24) * this.h; }
  sr(v) { return (v / 24) * Math.min(this.w, this.h); }

  // Ease function matching CSS "ease" (approximation of cubic-bezier(0.25, 0.1, 0.25, 1))
  ease(t) {
    // Attempt the CSS "ease" curve
    return t < 0.5
      ? 2 * t * t
      : -1 + (4 - 2 * t) * t;
  }

  // si-wf-pulse keyframes:
  //   0%:   opacity 0.3, scale 0.8
  //   50%:  opacity 1.0, scale 1.2
  //   100%: opacity 0.8, scale 1.0
  pulseAt(t) {
    const et = this.ease(Math.min(1, Math.max(0, t)));
    let opacity, scale;
    if (et <= 0.5) {
      const p = et / 0.5;
      opacity = 0.3 + (1.0 - 0.3) * p;
      scale = 0.8 + (1.2 - 0.8) * p;
    } else {
      const p = (et - 0.5) / 0.5;
      opacity = 1.0 + (0.8 - 1.0) * p;
      scale = 1.2 + (1.0 - 1.2) * p;
    }
    return { opacity, scale };
  }

  // si2-link-draw keyframes:
  //   0%:   opacity 0
  //   100%: opacity 0.7
  linkFadeAt(t) {
    const et = this.ease(Math.min(1, Math.max(0, t)));
    return 0.7 * et;
  }

  drawFrame(elapsed) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);

    // Background
    ctx.fillStyle = this.bg;
    ctx.fillRect(0, 0, this.w, this.h);

    // Draw links
    for (const link of this.links) {
      let opacity = 0.6; // resting opacity
      if (elapsed !== null) {
        const localT = (elapsed - link.delay) / link.dur;
        if (localT < 0) {
          opacity = 0; // not started yet (animation fill: both, starts at 0%)
        } else {
          opacity = this.linkFadeAt(localT);
        }
      }
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = link.stroke;
      ctx.lineWidth = this.sr(1);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(this.sx(link.x1), this.sy(link.y1));
      ctx.lineTo(this.sx(link.x2), this.sy(link.y2));
      ctx.stroke();
    }

    // Draw nodes
    for (const node of this.nodes) {
      let opacity = node.baseOp;
      let scale = 1;

      if (elapsed !== null) {
        const localT = (elapsed - node.delay) / node.dur;
        if (localT < 0) {
          // fill: both means start at 0% state
          opacity = 0.3;
          scale = 0.8;
        } else {
          const p = this.pulseAt(localT);
          opacity = p.opacity * node.baseOp;
          scale = p.scale;
        }
      }

      ctx.globalAlpha = opacity;
      ctx.fillStyle = node.fill;
      ctx.beginPath();
      const cx = this.sx(node.cx);
      const cy = this.sy(node.cy);
      const r = this.sr(node.r) * scale;
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  hover() {
    if (this.animating) return;
    this.animating = true;
    this.startTime = performance.now();
    this._loop();
  }

  _loop() {
    if (!this.animating) return;
    const elapsed = performance.now() - this.startTime;
    this.drawFrame(elapsed);

    // Total animation duration: last node starts at 500ms + 400ms = 900ms
    if (elapsed < 3000) {
      this.rafId = requestAnimationFrame(() => this._loop());
    } else {
      // Hold final frame
      this.drawFrame(3000);
    }
  }

  reset() {
    this.animating = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.drawFrame(null);
  }
}
