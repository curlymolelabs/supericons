import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// All 50 icon definitions
const icons = [
  { name: 'circle-check', cat: 'success', purpose: 'Success state indicator' },
  { name: 'circle-x', cat: 'error', purpose: 'Error state indicator' },
  { name: 'alert-triangle', cat: 'warning', purpose: 'Warning state indicator' },
  { name: 'info-circle', cat: 'info', purpose: 'Informational state' },
  { name: 'help-circle', cat: 'help', purpose: 'Help or question state' },
  { name: 'ban', cat: 'blocked', purpose: 'Blocked or forbidden state' },
  { name: 'clock', cat: 'time', purpose: 'Pending or scheduled' },
  { name: 'hourglass', cat: 'waiting', purpose: 'Processing or waiting' },
  { name: 'loader-2', cat: 'loading', purpose: 'Active loading indicator' },
  { name: 'refresh', cat: 'sync', purpose: 'Retry or sync action' },
  { name: 'progress-check', cat: 'progress', purpose: 'Progress completion' },
  { name: 'bell', cat: 'notification', purpose: 'Alert notification' },
  { name: 'eye', cat: 'visible', purpose: 'Visibility on' },
  { name: 'eye-off', cat: 'hidden', purpose: 'Visibility off' },
  { name: 'thumb-up', cat: 'positive', purpose: 'Approve or like' },
  { name: 'thumb-down', cat: 'negative', purpose: 'Reject or dislike' },
  { name: 'star', cat: 'favorite', purpose: 'Favorite or rating' },
  { name: 'shield-check', cat: 'secure', purpose: 'Verified secure' },
  { name: 'trophy', cat: 'achievement', purpose: 'Achievement unlocked' },
  { name: 'sparkles', cat: 'special', purpose: 'New or featured item' },
  { name: 'power', cat: 'power', purpose: 'Power on/off toggle' },
  { name: 'toggle-right', cat: 'toggle', purpose: 'Enabled toggle' },
  { name: 'bookmark', cat: 'bookmark', purpose: 'Saved bookmark' },
  { name: 'pinned', cat: 'pin', purpose: 'Pinned item' },
  { name: 'flag', cat: 'flag', purpose: 'Flagged or reported' },
  { name: 'archive', cat: 'archive', purpose: 'Archived item' },
  { name: 'trash', cat: 'delete', purpose: 'Delete or remove' },
  { name: 'send', cat: 'send', purpose: 'Send or submit' },
  { name: 'cloud-check', cat: 'cloud', purpose: 'Cloud synced' },
  { name: 'wifi', cat: 'connection', purpose: 'Network connected' },
  { name: 'bolt', cat: 'instant', purpose: 'Instant action' },
  { name: 'flame', cat: 'hot', purpose: 'Hot or trending' },
  { name: 'heart', cat: 'love', purpose: 'Loved or hearted' },
  { name: 'link', cat: 'linked', purpose: 'Connected link' },
  { name: 'lock', cat: 'locked', purpose: 'Locked state' },
  { name: 'lock-open', cat: 'unlocked', purpose: 'Unlocked state' },
  { name: 'mail-check', cat: 'email', purpose: 'Email confirmed' },
  { name: 'message-check', cat: 'message', purpose: 'Message delivered' },
  { name: 'mood-smile', cat: 'happy', purpose: 'Positive sentiment' },
  { name: 'mood-sad', cat: 'sad', purpose: 'Negative sentiment' },
  { name: 'arrow-up', cat: 'increase', purpose: 'Increase indicator' },
  { name: 'arrow-down', cat: 'decrease', purpose: 'Decrease indicator' },
  { name: 'trending-up', cat: 'growth', purpose: 'Growth trend' },
  { name: 'trending-down', cat: 'decline', purpose: 'Decline trend' },
  { name: 'list-check', cat: 'checklist', purpose: 'Tasks completed' },
  { name: 'clipboard-check', cat: 'clipboard', purpose: 'Clipboard verified' },
  { name: 'filter', cat: 'filter', purpose: 'Filtered results' },
  { name: 'sort-ascending', cat: 'sort', purpose: 'Sorted data' },
  { name: 'circle-dot', cat: 'active', purpose: 'Active or recording' },
  { name: 'rosette-discount-check', cat: 'badge', purpose: 'Certified badge' },
];

const tablerDir = path.join(__dirname, '..', 'node_modules', '@tabler', 'icons', 'icons', 'outline');
const outDir = path.join(__dirname, '..', 'public', 'packs', 'status-feedback');

// Generate short random class ID
function rid() {
  return Math.random().toString(36).substring(2, 8);
}

// Step 1: Process each SVG, add class names to paths, track them
const iconData = {};

icons.forEach(icon => {
  let svg = fs.readFileSync(path.join(tablerDir, icon.name + '.svg'), 'utf-8');
  
  // Remove width/height, keep viewBox
  svg = svg.replace(/\s*width="24"\s*/g, ' ').replace(/\s*height="24"\s*/g, ' ');
  
  // Remove the invisible bounding-box path (stroke="none" d="M0 0h24v24H0z")
  svg = svg.replace(/<path stroke="none" d="M0 0h24v24H0z" fill="none"\/>/g, '');
  
  // Remove Tabler class attributes from root <svg>
  svg = svg.replace(/\s*class="[^"]*"/g, '');
  
  // Add container class to SVG root
  const containerClass = `sf-${icon.name}`;
  svg = svg.replace('<svg', `<svg class="${containerClass}"`);
  
  // Add unique class to each path/circle/rect/line/polyline element
  const pathClasses = [];
  let pathIdx = 0;
  svg = svg.replace(/<(path|circle|rect|line|polyline|polygon)\s/g, (match, tag) => {
    const cls = `${containerClass}-p${pathIdx}`;
    pathClasses.push(cls);
    pathIdx++;
    return `<${tag} class="${cls}" `;
  });
  
  // Set all strokes to currentColor
  svg = svg.replace(/stroke="[^"]*"/g, 'stroke="currentColor"');
  svg = svg.replace(/fill="none"/g, 'fill="none"');
  
  // Clean up extra whitespace
  svg = svg.replace(/\n\s*\n/g, '\n');
  
  iconData[icon.name] = {
    svg,
    containerClass,
    pathClasses,
    cat: icon.cat,
    purpose: icon.purpose,
  };
  
  // Write SVG file
  fs.writeFileSync(path.join(outDir, icon.name + '.svg'), svg.trim());
});

console.log(`Written ${icons.length} SVGs to ${outDir}`);

// Step 2: Generate CSS animations
// Each animation is designed to be thematically relevant

const animations = {
  // ── 1. CIRCLE-CHECK: Circle draws in, then checkmark draws ──
  'circle-check': (d) => `
.si-anim--circle-check .${d.pathClasses[0]} {
  stroke-dasharray: 57; stroke-dashoffset: 57;
}
.si-icon-cell:hover .si-anim--circle-check .${d.pathClasses[0]},
.icon-card:hover .si-anim--circle-check .${d.pathClasses[0]} {
  animation: sf-draw-circle 0.5s ease forwards;
}
.si-anim--circle-check .${d.pathClasses[1]} {
  stroke-dasharray: 14; stroke-dashoffset: 14;
}
.si-icon-cell:hover .si-anim--circle-check .${d.pathClasses[1]},
.icon-card:hover .si-anim--circle-check .${d.pathClasses[1]} {
  animation: sf-draw-check 0.3s ease 0.4s forwards;
}
@keyframes sf-draw-circle { to { stroke-dashoffset: 0; } }
@keyframes sf-draw-check { to { stroke-dashoffset: 0; } }`,

  // ── 2. CIRCLE-X: Shake then X lines slash in ──
  'circle-x': (d) => `
.si-icon-cell:hover .si-anim--circle-x,
.icon-card:hover .si-anim--circle-x {
  animation: sf-shake-subtle 0.4s ease;
}
.si-anim--circle-x .${d.pathClasses[1]} {
  stroke-dasharray: 12; stroke-dashoffset: 12;
}
.si-icon-cell:hover .si-anim--circle-x .${d.pathClasses[1]},
.icon-card:hover .si-anim--circle-x .${d.pathClasses[1]} {
  animation: sf-slash-in 0.25s ease 0.15s forwards;
}
@keyframes sf-shake-subtle {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-2px); }
  40% { transform: translateX(2px); }
  60% { transform: translateX(-1px); }
  80% { transform: translateX(1px); }
}
@keyframes sf-slash-in { to { stroke-dashoffset: 0; } }`,

  // ── 3. ALERT-TRIANGLE: Pulse exclamation, triangle wobble ──
  'alert-triangle': (d) => `
.si-icon-cell:hover .si-anim--alert-triangle,
.icon-card:hover .si-anim--alert-triangle {
  animation: sf-alert-wobble 0.5s ease;
}
.si-icon-cell:hover .si-anim--alert-triangle .${d.pathClasses[0]},
.icon-card:hover .si-anim--alert-triangle .${d.pathClasses[0]} {
  animation: sf-exclaim-pulse 0.6s ease infinite;
}
@keyframes sf-alert-wobble {
  0%, 100% { transform: rotate(0); }
  15% { transform: rotate(-5deg); }
  30% { transform: rotate(5deg); }
  45% { transform: rotate(-3deg); }
  60% { transform: rotate(2deg); }
}
@keyframes sf-exclaim-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}`,

  // ── 4. INFO-CIRCLE: i-dot bounces, circle fades in ──
  'info-circle': (d) => `
.si-icon-cell:hover .si-anim--info-circle .${d.pathClasses[1]},
.icon-card:hover .si-anim--info-circle .${d.pathClasses[1]} {
  animation: sf-dot-bounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform-origin: 12px 9px;
}
.si-icon-cell:hover .si-anim--info-circle .${d.pathClasses[2]},
.icon-card:hover .si-anim--info-circle .${d.pathClasses[2]} {
  animation: sf-info-line-draw 0.4s ease 0.2s both;
}
@keyframes sf-dot-bounce {
  0% { transform: scale(1); }
  40% { transform: scale(1.8); }
  100% { transform: scale(1); }
}
@keyframes sf-info-line-draw {
  0% { opacity: 0; transform: translateY(2px); }
  100% { opacity: 1; transform: translateY(0); }
}`,

  // ── 5. HELP-CIRCLE: Question mark wobbles curiously ──
  'help-circle': (d) => `
.si-icon-cell:hover .si-anim--help-circle .${d.pathClasses[2]},
.icon-card:hover .si-anim--help-circle .${d.pathClasses[2]} {
  animation: sf-question-wobble 0.6s ease;
  transform-origin: 12px 13px;
}
.si-icon-cell:hover .si-anim--help-circle .${d.pathClasses[1]},
.icon-card:hover .si-anim--help-circle .${d.pathClasses[1]} {
  animation: sf-dot-bounce 0.3s ease 0.3s both;
  transform-origin: 12px 16px;
}
@keyframes sf-question-wobble {
  0%, 100% { transform: rotate(0); }
  25% { transform: rotate(10deg); }
  50% { transform: rotate(-8deg); }
  75% { transform: rotate(4deg); }
}`,

  // ── 6. BAN: Strike-through line sweeps across, circle pulses red ──
  'ban': (d) => `
.si-icon-cell:hover .si-anim--ban .${d.pathClasses[0]},
.icon-card:hover .si-anim--ban .${d.pathClasses[0]} {
  animation: sf-ban-pulse 0.6s ease;
}
.si-anim--ban .${d.pathClasses[1]} {
  stroke-dasharray: 18; stroke-dashoffset: 18;
}
.si-icon-cell:hover .si-anim--ban .${d.pathClasses[1]},
.icon-card:hover .si-anim--ban .${d.pathClasses[1]} {
  animation: sf-ban-strike 0.4s ease 0.1s forwards;
}
@keyframes sf-ban-pulse {
  0%, 100% { transform: scale(1); }
  30% { transform: scale(1.08); }
}
@keyframes sf-ban-strike { to { stroke-dashoffset: 0; } }`,

  // ── 7. CLOCK: Hour hand ticks around, minute hand moves ──
  'clock': (d) => `
.si-icon-cell:hover .si-anim--clock .${d.pathClasses[1]},
.icon-card:hover .si-anim--clock .${d.pathClasses[1]} {
  animation: sf-clock-tick 1s steps(4) infinite;
  transform-origin: 12px 12px;
}
@keyframes sf-clock-tick {
  from { transform: rotate(0); }
  to { transform: rotate(360deg); }
}`,

  // ── 8. HOURGLASS: Flip animation ──
  'hourglass': (d) => `
.si-icon-cell:hover .si-anim--hourglass,
.icon-card:hover .si-anim--hourglass {
  animation: sf-hourglass-flip 1.2s ease infinite;
  transform-origin: center;
}
@keyframes sf-hourglass-flip {
  0% { transform: rotate(0); }
  40% { transform: rotate(180deg); }
  100% { transform: rotate(180deg); }
}`,

  // ── 9. LOADER-2: Smooth continuous spin ──
  'loader-2': (d) => `
.si-icon-cell:hover .si-anim--loader-2,
.icon-card:hover .si-anim--loader-2 {
  animation: sf-spin 0.8s linear infinite;
  transform-origin: center;
}
@keyframes sf-spin { to { transform: rotate(360deg); } }`,

  // ── 10. REFRESH: Spin once with bounce ──
  'refresh': (d) => `
.si-icon-cell:hover .si-anim--refresh,
.icon-card:hover .si-anim--refresh {
  animation: sf-refresh-spin 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform-origin: center;
}
@keyframes sf-refresh-spin {
  0% { transform: rotate(0); }
  100% { transform: rotate(360deg); }
}`,

  // ── 11. PROGRESS-CHECK: Arcs draw sequentially, check appears ──
  'progress-check': (d) => {
    let css = '';
    const arcPaths = d.pathClasses.slice(0, -1); // all except checkmark
    arcPaths.forEach((cls, i) => {
      css += `
.si-anim--progress-check .${cls} { stroke-dasharray: 8; stroke-dashoffset: 8; }
.si-icon-cell:hover .si-anim--progress-check .${cls},
.icon-card:hover .si-anim--progress-check .${cls} {
  animation: sf-arc-draw 0.3s ease ${i * 0.1}s forwards;
}`;
    });
    const checkCls = d.pathClasses[d.pathClasses.length - 1];
    css += `
.si-anim--progress-check .${checkCls} { opacity: 0; }
.si-icon-cell:hover .si-anim--progress-check .${checkCls},
.icon-card:hover .si-anim--progress-check .${checkCls} {
  animation: sf-check-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s forwards;
}
@keyframes sf-arc-draw { to { stroke-dashoffset: 0; } }
@keyframes sf-check-pop { to { opacity: 1; transform: scale(1.1); } }`;
    return css;
  },

  // ── 12. BELL: Ring side to side ──
  'bell': (d) => `
.si-icon-cell:hover .si-anim--bell .${d.pathClasses[0]},
.icon-card:hover .si-anim--bell .${d.pathClasses[0]} {
  animation: sf-bell-ring 0.6s ease;
  transform-origin: 12px 3px;
}
.si-icon-cell:hover .si-anim--bell .${d.pathClasses[1]},
.icon-card:hover .si-anim--bell .${d.pathClasses[1]} {
  animation: sf-clapper-swing 0.6s ease 0.1s;
  transform-origin: 12px 17px;
}
@keyframes sf-bell-ring {
  0%, 100% { transform: rotate(0); }
  15% { transform: rotate(14deg); }
  30% { transform: rotate(-12deg); }
  45% { transform: rotate(8deg); }
  60% { transform: rotate(-4deg); }
}
@keyframes sf-clapper-swing {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(1.5px); }
  40% { transform: translateX(-1.5px); }
  60% { transform: translateX(0.5px); }
}`,

  // ── 13. EYE: Pupil focuses (scales), lids blink ──
  'eye': (d) => `
.si-icon-cell:hover .si-anim--eye .${d.pathClasses[0]},
.icon-card:hover .si-anim--eye .${d.pathClasses[0]} {
  animation: sf-pupil-focus 0.5s ease;
  transform-origin: 12px 12px;
}
.si-icon-cell:hover .si-anim--eye .${d.pathClasses[1]},
.icon-card:hover .si-anim--eye .${d.pathClasses[1]} {
  animation: sf-eye-blink 0.4s ease;
  transform-origin: 12px 12px;
}
@keyframes sf-pupil-focus {
  0% { transform: scale(1); }
  30% { transform: scale(0.6); }
  100% { transform: scale(1); }
}
@keyframes sf-eye-blink {
  0%, 100% { transform: scaleY(1); }
  30% { transform: scaleY(0.1); }
  60% { transform: scaleY(1); }
}`,

  // ── 14. EYE-OFF: Slash draws, eye fades ──
  'eye-off': (d) => `
.si-icon-cell:hover .si-anim--eye-off .${d.pathClasses[0]},
.icon-card:hover .si-anim--eye-off .${d.pathClasses[0]} {
  animation: sf-pupil-shrink 0.4s ease forwards;
  transform-origin: 12px 12px;
}
.si-anim--eye-off .${d.pathClasses[2]} { stroke-dasharray: 26; stroke-dashoffset: 26; }
.si-icon-cell:hover .si-anim--eye-off .${d.pathClasses[2]},
.icon-card:hover .si-anim--eye-off .${d.pathClasses[2]} {
  animation: sf-slash-draw 0.3s ease 0.1s forwards;
}
@keyframes sf-pupil-shrink {
  to { opacity: 0.3; transform: scale(0.5); }
}
@keyframes sf-slash-draw { to { stroke-dashoffset: 0; } }`,

  // ── 15. THUMB-UP: Thumb pops up with bounce ──
  'thumb-up': (d) => `
.si-icon-cell:hover .si-anim--thumb-up,
.icon-card:hover .si-anim--thumb-up {
  animation: sf-thumb-pop-up 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform-origin: center bottom;
}
@keyframes sf-thumb-pop-up {
  0% { transform: scale(1) rotate(0); }
  30% { transform: scale(1.15) rotate(-8deg); }
  60% { transform: scale(1.05) rotate(2deg); }
  100% { transform: scale(1) rotate(0); }
}`,

  // ── 16. THUMB-DOWN: Drops down with gravity ──
  'thumb-down': (d) => `
.si-icon-cell:hover .si-anim--thumb-down,
.icon-card:hover .si-anim--thumb-down {
  animation: sf-thumb-drop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform-origin: center top;
}
@keyframes sf-thumb-drop {
  0% { transform: scale(1) rotate(0); }
  30% { transform: scale(1.15) rotate(8deg); }
  60% { transform: scale(1.05) rotate(-2deg); }
  100% { transform: scale(1) rotate(0); }
}`,

  // ── 17. STAR: Spin and sparkle ──
  'star': (d) => `
.si-icon-cell:hover .si-anim--star,
.icon-card:hover .si-anim--star {
  animation: sf-star-sparkle 0.6s ease;
  transform-origin: center;
}
@keyframes sf-star-sparkle {
  0% { transform: scale(1) rotate(0); opacity: 1; }
  25% { transform: scale(1.2) rotate(-15deg); opacity: 0.8; }
  50% { transform: scale(0.9) rotate(10deg); opacity: 1; }
  100% { transform: scale(1) rotate(0); }
}`,

  // ── 18. SHIELD-CHECK: Shield solidifies, check draws ──
  'shield-check': (d) => `
.si-anim--shield-check .${d.pathClasses[0]} { stroke-dasharray: 42; stroke-dashoffset: 42; }
.si-icon-cell:hover .si-anim--shield-check .${d.pathClasses[0]},
.icon-card:hover .si-anim--shield-check .${d.pathClasses[0]} {
  animation: sf-shield-draw 0.5s ease forwards;
}
.si-anim--shield-check .${d.pathClasses[1]} { stroke-dasharray: 10; stroke-dashoffset: 10; }
.si-icon-cell:hover .si-anim--shield-check .${d.pathClasses[1]},
.icon-card:hover .si-anim--shield-check .${d.pathClasses[1]} {
  animation: sf-shield-check-draw 0.3s ease 0.4s forwards;
}
@keyframes sf-shield-draw { to { stroke-dashoffset: 0; } }
@keyframes sf-shield-check-draw { to { stroke-dashoffset: 0; } }`,

  // ── 19. TROPHY: Rises up with glow ──
  'trophy': (d) => `
.si-icon-cell:hover .si-anim--trophy,
.icon-card:hover .si-anim--trophy {
  animation: sf-trophy-rise 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform-origin: center bottom;
}
@keyframes sf-trophy-rise {
  0% { transform: translateY(0) scale(1); }
  40% { transform: translateY(-4px) scale(1.1); }
  100% { transform: translateY(0) scale(1); }
}`,

  // ── 20. SPARKLES: Stars twinkle at different times ──
  'sparkles': (d) => `
.si-icon-cell:hover .si-anim--sparkles,
.icon-card:hover .si-anim--sparkles {
  animation: sf-sparkle-twinkle 0.8s ease infinite;
  transform-origin: center;
}
@keyframes sf-sparkle-twinkle {
  0%, 100% { transform: scale(1); opacity: 1; }
  25% { transform: scale(1.1) rotate(5deg); opacity: 0.7; }
  50% { transform: scale(0.95) rotate(-3deg); opacity: 1; }
  75% { transform: scale(1.05) rotate(2deg); opacity: 0.8; }
}`,

  // ── 21. POWER: Button press with pulse ring ──
  'power': (d) => `
.si-icon-cell:hover .si-anim--power,
.icon-card:hover .si-anim--power {
  animation: sf-power-press 0.5s ease;
  transform-origin: center;
}
@keyframes sf-power-press {
  0% { transform: scale(1); }
  20% { transform: scale(0.88); }
  50% { transform: scale(1.08); }
  100% { transform: scale(1); }
}`,

  // ── 22. TOGGLE-RIGHT: Slide right motion ──
  'toggle-right': (d) => `
.si-icon-cell:hover .si-anim--toggle-right,
.icon-card:hover .si-anim--toggle-right {
  animation: sf-toggle-slide 0.4s ease;
}
@keyframes sf-toggle-slide {
  0% { transform: translateX(-3px); opacity: 0.7; }
  50% { transform: translateX(1px); }
  100% { transform: translateX(0); opacity: 1; }
}`,

  // ── 23. BOOKMARK: Drops into place from top ──
  'bookmark': (d) => `
.si-icon-cell:hover .si-anim--bookmark,
.icon-card:hover .si-anim--bookmark {
  animation: sf-bookmark-drop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform-origin: center top;
}
@keyframes sf-bookmark-drop {
  0% { transform: translateY(-6px) scaleY(0.8); opacity: 0.5; }
  60% { transform: translateY(1px) scaleY(1.02); }
  100% { transform: translateY(0) scaleY(1); opacity: 1; }
}`,

  // ── 24. PINNED: Pin pushes down ──
  'pinned': (d) => `
.si-icon-cell:hover .si-anim--pinned,
.icon-card:hover .si-anim--pinned {
  animation: sf-pin-push 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform-origin: center;
}
@keyframes sf-pin-push {
  0% { transform: translateY(-4px) rotate(-10deg); }
  50% { transform: translateY(1px) rotate(2deg); }
  100% { transform: translateY(0) rotate(0); }
}`,

  // ── 25. FLAG: Wave in the wind ──
  'flag': (d) => `
.si-icon-cell:hover .si-anim--flag,
.icon-card:hover .si-anim--flag {
  animation: sf-flag-wave 0.8s ease infinite;
  transform-origin: left center;
}
@keyframes sf-flag-wave {
  0%, 100% { transform: skewX(0); }
  25% { transform: skewX(-3deg); }
  75% { transform: skewX(2deg); }
}`,

  // ── 26. ARCHIVE: Slides down into box ──
  'archive': (d) => `
.si-icon-cell:hover .si-anim--archive,
.icon-card:hover .si-anim--archive {
  animation: sf-archive-slide 0.5s ease;
  transform-origin: center;
}
@keyframes sf-archive-slide {
  0% { transform: translateY(0); }
  30% { transform: translateY(-3px); }
  60% { transform: translateY(1px) scale(0.97); }
  100% { transform: translateY(0) scale(1); }
}`,

  // ── 27. TRASH: Lid lifts, bin shakes ──
  'trash': (d) => `
.si-icon-cell:hover .si-anim--trash,
.icon-card:hover .si-anim--trash {
  animation: sf-trash-shake 0.5s ease;
  transform-origin: center bottom;
}
@keyframes sf-trash-shake {
  0%, 100% { transform: rotate(0); }
  15% { transform: rotate(-8deg); }
  30% { transform: rotate(6deg); }
  45% { transform: rotate(-4deg); }
  60% { transform: rotate(2deg); }
}`,

  // ── 28. SEND: Paper plane launches ──
  'send': (d) => `
.si-icon-cell:hover .si-anim--send,
.icon-card:hover .si-anim--send {
  animation: sf-send-launch 0.5s ease;
  transform-origin: center;
}
@keyframes sf-send-launch {
  0% { transform: translate(0, 0) scale(1); }
  40% { transform: translate(3px, -3px) scale(0.9); }
  70% { transform: translate(-1px, 1px) scale(1.05); }
  100% { transform: translate(0, 0) scale(1); }
}`,

  // ── 29. CLOUD-CHECK: Cloud floats, check appears ──
  'cloud-check': (d) => `
.si-icon-cell:hover .si-anim--cloud-check .${d.pathClasses[0]},
.icon-card:hover .si-anim--cloud-check .${d.pathClasses[0]} {
  animation: sf-cloud-float 1s ease infinite;
}
.si-anim--cloud-check .${d.pathClasses[1]} { stroke-dasharray: 10; stroke-dashoffset: 10; }
.si-icon-cell:hover .si-anim--cloud-check .${d.pathClasses[1]},
.icon-card:hover .si-anim--cloud-check .${d.pathClasses[1]} {
  animation: sf-cloud-check-draw 0.3s ease 0.3s forwards;
}
@keyframes sf-cloud-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2px); }
}
@keyframes sf-cloud-check-draw { to { stroke-dashoffset: 0; } }`,

  // ── 30. WIFI: Signal waves pulse outward ──
  'wifi': (d) => {
    let css = '';
    d.pathClasses.forEach((cls, i) => {
      css += `
.si-icon-cell:hover .si-anim--wifi .${cls},
.icon-card:hover .si-anim--wifi .${cls} {
  animation: sf-wifi-pulse 0.8s ease ${i * 0.15}s infinite;
}`;
    });
    css += `
@keyframes sf-wifi-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}`;
    return css;
  },

  // ── 31. BOLT: Lightning flash ──
  'bolt': (d) => `
.si-icon-cell:hover .si-anim--bolt,
.icon-card:hover .si-anim--bolt {
  animation: sf-bolt-flash 0.4s ease;
  transform-origin: center;
}
@keyframes sf-bolt-flash {
  0% { transform: scale(1); opacity: 1; }
  15% { transform: scale(1.3); opacity: 0.5; }
  30% { transform: scale(0.9); opacity: 1; }
  50% { transform: scale(1.15); opacity: 0.6; }
  100% { transform: scale(1); opacity: 1; }
}`,

  // ── 32. FLAME: Flickering fire ──
  'flame': (d) => `
.si-icon-cell:hover .si-anim--flame,
.icon-card:hover .si-anim--flame {
  animation: sf-flame-flicker 0.4s ease infinite;
  transform-origin: center bottom;
}
@keyframes sf-flame-flicker {
  0%, 100% { transform: scaleY(1) scaleX(1); }
  25% { transform: scaleY(1.08) scaleX(0.96); }
  50% { transform: scaleY(0.95) scaleX(1.04); }
  75% { transform: scaleY(1.05) scaleX(0.98); }
}`,

  // ── 33. HEART: Heart beat pulse ──
  'heart': (d) => `
.si-icon-cell:hover .si-anim--heart,
.icon-card:hover .si-anim--heart {
  animation: sf-heartbeat 0.8s ease infinite;
  transform-origin: center;
}
@keyframes sf-heartbeat {
  0%, 100% { transform: scale(1); }
  15% { transform: scale(1.15); }
  30% { transform: scale(1); }
  45% { transform: scale(1.1); }
  60% { transform: scale(1); }
}`,

  // ── 34. LINK: Chain links connect ──
  'link': (d) => `
.si-icon-cell:hover .si-anim--link,
.icon-card:hover .si-anim--link {
  animation: sf-link-connect 0.5s ease;
  transform-origin: center;
}
@keyframes sf-link-connect {
  0% { transform: rotate(0) scale(1); }
  30% { transform: rotate(8deg) scale(1.05); }
  60% { transform: rotate(-4deg); }
  100% { transform: rotate(0) scale(1); }
}`,

  // ── 35. LOCK: Shackle shakes (locked tight) ──
  'lock': (d) => `
.si-icon-cell:hover .si-anim--lock,
.icon-card:hover .si-anim--lock {
  animation: sf-lock-rattle 0.4s ease;
  transform-origin: center;
}
@keyframes sf-lock-rattle {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-1.5px) rotate(-2deg); }
  40% { transform: translateX(1.5px) rotate(2deg); }
  60% { transform: translateX(-1px) rotate(-1deg); }
  80% { transform: translateX(0.5px); }
}`,

  // ── 36. LOCK-OPEN: Shackle pops up ──
  'lock-open': (d) => `
.si-icon-cell:hover .si-anim--lock-open .${d.pathClasses[0]},
.icon-card:hover .si-anim--lock-open .${d.pathClasses[0]} {
  animation: sf-shackle-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform-origin: center bottom;
}
@keyframes sf-shackle-pop {
  0% { transform: translateY(0); }
  40% { transform: translateY(-3px); }
  100% { transform: translateY(0); }
}`,

  // ── 37. MAIL-CHECK: Envelope opens, check appears ──
  'mail-check': (d) => `
.si-icon-cell:hover .si-anim--mail-check .${d.pathClasses[0]},
.icon-card:hover .si-anim--mail-check .${d.pathClasses[0]} {
  animation: sf-envelope-open 0.5s ease;
  transform-origin: center bottom;
}
.si-icon-cell:hover .si-anim--mail-check .${d.pathClasses[d.pathClasses.length - 1]},
.icon-card:hover .si-anim--mail-check .${d.pathClasses[d.pathClasses.length - 1]} {
  animation: sf-mail-check-pop 0.3s ease 0.3s both;
  transform-origin: center;
}
@keyframes sf-envelope-open {
  0%, 100% { transform: scaleY(1); }
  40% { transform: scaleY(0.9); }
}
@keyframes sf-mail-check-pop {
  0% { opacity: 0; transform: scale(0.5); }
  100% { opacity: 1; transform: scale(1); }
}`,

  // ── 38. MESSAGE-CHECK: Bubble pops, check draws ──
  'message-check': (d) => `
.si-icon-cell:hover .si-anim--message-check,
.icon-card:hover .si-anim--message-check {
  animation: sf-bubble-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform-origin: center;
}
@keyframes sf-bubble-pop {
  0% { transform: scale(0.9); }
  50% { transform: scale(1.06); }
  100% { transform: scale(1); }
}`,

  // ── 39. MOOD-SMILE: Smile widens ──
  'mood-smile': (d) => `
.si-icon-cell:hover .si-anim--mood-smile .${d.pathClasses[2]},
.icon-card:hover .si-anim--mood-smile .${d.pathClasses[2]} {
  animation: sf-smile-widen 0.5s ease;
  transform-origin: 12px 15px;
}
.si-icon-cell:hover .si-anim--mood-smile .${d.pathClasses[0]},
.icon-card:hover .si-anim--mood-smile .${d.pathClasses[0]} {
  animation: sf-face-nod 0.5s ease;
  transform-origin: center;
}
@keyframes sf-smile-widen {
  0% { transform: scaleX(1); }
  40% { transform: scaleX(1.15); }
  100% { transform: scaleX(1); }
}
@keyframes sf-face-nod {
  0%, 100% { transform: rotate(0); }
  30% { transform: rotate(5deg); }
  60% { transform: rotate(-3deg); }
}`,

  // ── 40. MOOD-SAD: Head drops down ──
  'mood-sad': (d) => `
.si-icon-cell:hover .si-anim--mood-sad,
.icon-card:hover .si-anim--mood-sad {
  animation: sf-sad-droop 0.6s ease;
  transform-origin: center top;
}
@keyframes sf-sad-droop {
  0%, 100% { transform: translateY(0) rotate(0); }
  40% { transform: translateY(2px) rotate(-3deg); }
  70% { transform: translateY(1px) rotate(1deg); }
}`,

  // ── 41. ARROW-UP: Bounces upward ──
  'arrow-up': (d) => `
.si-icon-cell:hover .si-anim--arrow-up,
.icon-card:hover .si-anim--arrow-up {
  animation: sf-bounce-up 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes sf-bounce-up {
  0% { transform: translateY(0); }
  40% { transform: translateY(-5px); }
  100% { transform: translateY(0); }
}`,

  // ── 42. ARROW-DOWN: Drops downward ──
  'arrow-down': (d) => `
.si-icon-cell:hover .si-anim--arrow-down,
.icon-card:hover .si-anim--arrow-down {
  animation: sf-drop-down 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes sf-drop-down {
  0% { transform: translateY(0); }
  40% { transform: translateY(5px); }
  100% { transform: translateY(0); }
}`,

  // ── 43. TRENDING-UP: Line traces upward path ──
  'trending-up': (d) => `
.si-anim--trending-up .${d.pathClasses[0]} { stroke-dasharray: 20; stroke-dashoffset: 20; }
.si-icon-cell:hover .si-anim--trending-up .${d.pathClasses[0]},
.icon-card:hover .si-anim--trending-up .${d.pathClasses[0]} {
  animation: sf-trend-trace 0.6s ease forwards;
}
.si-icon-cell:hover .si-anim--trending-up .${d.pathClasses[1]},
.icon-card:hover .si-anim--trending-up .${d.pathClasses[1]} {
  animation: sf-arrow-head-pop 0.3s ease 0.4s both;
}
@keyframes sf-trend-trace { to { stroke-dashoffset: 0; } }
@keyframes sf-arrow-head-pop { 0% { opacity: 0; } 100% { opacity: 1; } }`,

  // ── 44. TRENDING-DOWN: Line traces downward ──
  'trending-down': (d) => `
.si-anim--trending-down .${d.pathClasses[0]} { stroke-dasharray: 20; stroke-dashoffset: 20; }
.si-icon-cell:hover .si-anim--trending-down .${d.pathClasses[0]},
.icon-card:hover .si-anim--trending-down .${d.pathClasses[0]} {
  animation: sf-trend-down-trace 0.6s ease forwards;
}
.si-icon-cell:hover .si-anim--trending-down .${d.pathClasses[1]},
.icon-card:hover .si-anim--trending-down .${d.pathClasses[1]} {
  animation: sf-arrow-head-pop 0.3s ease 0.4s both;
}
@keyframes sf-trend-down-trace { to { stroke-dashoffset: 0; } }`,

  // ── 45. LIST-CHECK: Checkmarks cascade in ──
  'list-check': (d) => {
    let css = '';
    d.pathClasses.forEach((cls, i) => {
      css += `
.si-anim--list-check .${cls} { opacity: 0; }
.si-icon-cell:hover .si-anim--list-check .${cls},
.icon-card:hover .si-anim--list-check .${cls} {
  animation: sf-list-item 0.25s ease ${i * 0.08}s forwards;
}`;
    });
    css += `
@keyframes sf-list-item {
  0% { opacity: 0; transform: translateX(-4px); }
  100% { opacity: 1; transform: translateX(0); }
}`;
    return css;
  },

  // ── 46. CLIPBOARD-CHECK: Board bounces, check draws ──
  'clipboard-check': (d) => `
.si-icon-cell:hover .si-anim--clipboard-check,
.icon-card:hover .si-anim--clipboard-check {
  animation: sf-clipboard-stamp 0.4s ease;
  transform-origin: center;
}
@keyframes sf-clipboard-stamp {
  0% { transform: scale(1); }
  30% { transform: scale(0.92); }
  60% { transform: scale(1.05); }
  100% { transform: scale(1); }
}`,

  // ── 47. FILTER: Funnel narrows ──
  'filter': (d) => `
.si-icon-cell:hover .si-anim--filter,
.icon-card:hover .si-anim--filter {
  animation: sf-filter-narrow 0.5s ease;
  transform-origin: center top;
}
@keyframes sf-filter-narrow {
  0%, 100% { transform: scaleX(1); }
  40% { transform: scaleX(0.85); }
}`,

  // ── 48. SORT-ASCENDING: Bars shuffle and sort ──
  'sort-ascending': (d) => {
    let css = '';
    d.pathClasses.forEach((cls, i) => {
      const delay = (d.pathClasses.length - 1 - i) * 0.08;
      css += `
.si-icon-cell:hover .si-anim--sort-ascending .${cls},
.icon-card:hover .si-anim--sort-ascending .${cls} {
  animation: sf-sort-slide 0.3s ease ${delay}s both;
}`;
    });
    css += `
@keyframes sf-sort-slide {
  0% { transform: translateX(3px); opacity: 0.5; }
  100% { transform: translateX(0); opacity: 1; }
}`;
    return css;
  },

  // ── 49. CIRCLE-DOT: Pulsing radar ──
  'circle-dot': (d) => `
.si-icon-cell:hover .si-anim--circle-dot .${d.pathClasses[0]},
.icon-card:hover .si-anim--circle-dot .${d.pathClasses[0]} {
  animation: sf-radar-ring 1s ease infinite;
  transform-origin: center;
}
.si-icon-cell:hover .si-anim--circle-dot .${d.pathClasses[1]},
.icon-card:hover .si-anim--circle-dot .${d.pathClasses[1]} {
  animation: sf-dot-pulse 0.8s ease infinite;
  transform-origin: center;
}
@keyframes sf-radar-ring {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.08); opacity: 0.6; }
}
@keyframes sf-dot-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.3); }
}`,

  // ── 50. ROSETTE-DISCOUNT-CHECK: Badge spins and glows ──
  'rosette-discount-check': (d) => `
.si-icon-cell:hover .si-anim--rosette-discount-check,
.icon-card:hover .si-anim--rosette-discount-check {
  animation: sf-badge-spin 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform-origin: center;
}
@keyframes sf-badge-spin {
  0% { transform: rotate(0) scale(1); }
  50% { transform: rotate(15deg) scale(1.1); }
  100% { transform: rotate(0) scale(1); }
}`,
};

// Generate CSS file
let cssContent = `/* Status & Feedback Collection - CSS Animations
   50 icons curated from Tabler, each with unique hover animation
   ======================================================== */\n\n`;

icons.forEach(icon => {
  const data = iconData[icon.name];
  const animFn = animations[icon.name];
  if (animFn) {
    cssContent += `/* ── ${icon.name.toUpperCase()}: ${icon.purpose} ── */`;
    cssContent += animFn(data);
    cssContent += '\n\n';
  } else {
    console.warn(`No animation defined for: ${icon.name}`);
  }
});

fs.writeFileSync(path.join(outDir, 'status-feedback.css'), cssContent);
console.log(`Written CSS with ${Object.keys(animations).length} animation sets`);

// Clean up old files that don't belong to the new curation
const newFileSet = new Set(icons.map(i => i.name + '.svg'));
newFileSet.add('status-feedback.css');
newFileSet.add('bundle.json');

const existing = fs.readdirSync(outDir);
let removed = 0;
existing.forEach(file => {
  if (!newFileSet.has(file)) {
    fs.unlinkSync(path.join(outDir, file));
    removed++;
  }
});
console.log(`Cleaned up ${removed} old files`);
console.log('Done!');
