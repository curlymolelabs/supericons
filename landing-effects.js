const ICON_PATHS = [
  '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
  '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
  '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
  '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>',
  '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
  '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
  '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>',
  '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>',
  '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>',
  '<rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>',
  '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>',
  '<polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>',
  '<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>',
  '<path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>',
  '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  '<line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>',
];

const MOTION_QUERY = '(prefers-reduced-motion: reduce)';

let rainRoot = null;
let resizeTimer = null;
let resizeHandler = null;
let motionMedia = null;
let motionHandler = null;
let active = false;

function getConfig(width, height) {
  if (width < 480) {
    return {
      columns: 7,
      columnGap: 42,
      rowGap: 40,
      iconSize: 18,
      rows: Math.max(8, Math.ceil(height / 58) + 2),
      baseOpacity: 0.06,
      highlightOpacity: 0.14,
      blinkDuration: 5.5,
      driftDuration: 48,
      brightChance: 0.1,
    };
  }

  if (width < 768) {
    return {
      columns: 9,
      columnGap: 48,
      rowGap: 44,
      iconSize: 20,
      rows: Math.max(9, Math.ceil(height / 64) + 2),
      baseOpacity: 0.065,
      highlightOpacity: 0.15,
      blinkDuration: 5.25,
      driftDuration: 46,
      brightChance: 0.1,
    };
  }

  if (width < 1100) {
    return {
      columns: 12,
      columnGap: 52,
      rowGap: 46,
      iconSize: 21,
      rows: Math.max(10, Math.ceil(height / 67) + 2),
      baseOpacity: 0.07,
      highlightOpacity: 0.16,
      blinkDuration: 5,
      driftDuration: 45,
      brightChance: 0.11,
    };
  }

  return {
    columns: 16,
    columnGap: 56,
    rowGap: 48,
    iconSize: 22,
    rows: Math.max(12, Math.ceil(height / 70) + 2),
    baseOpacity: 0.07,
    highlightOpacity: 0.16,
    blinkDuration: 5,
    driftDuration: 45,
    brightChance: 0.12,
  };
}

function createSvg(pathMarkup, opacity) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.5');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.style.color = `rgba(255,255,255,${opacity})`;
  svg.style.fill = 'none';
  svg.style.stroke = svg.style.color;
  svg.innerHTML = pathMarkup;
  return svg;
}

function buildRain({ staticMode = false } = {}) {
  if (!rainRoot) return;

  const width = Math.max(rainRoot.clientWidth || 0, window.innerWidth);
  const height = Math.max(rainRoot.clientHeight || 0, window.innerHeight);
  const config = getConfig(width, height);
  const columns = Math.max(config.columns, Math.ceil(width / config.columnGap) + 3);
  const totalWidth = ((columns - 1) * config.columnGap) + config.iconSize;
  const startX = Math.round((width - totalWidth) / 2);

  rainRoot.replaceChildren();
  rainRoot.classList.toggle('icon-rain--static', staticMode);
  rainRoot.style.setProperty('--landing-rain-icon-size', `${config.iconSize}px`);
  rainRoot.style.setProperty('--landing-rain-row-gap', `${config.rowGap}px`);

  for (let col = 0; col < columns; col++) {
    const columnEl = document.createElement('div');
    columnEl.className = 'icon-rain__column';
    columnEl.style.left = `${startX + (col * config.columnGap)}px`;
    columnEl.style.setProperty('--icon-count', String(config.rows));

    if (!staticMode) {
      const driftVariance = 0.72 + (Math.random() * 0.56);
      columnEl.style.animationDuration = `${config.driftDuration * driftVariance}s`;
      columnEl.style.animationDelay = `${-Math.random() * config.driftDuration}s`;
    }

    const visibleCount = staticMode ? config.rows : config.rows * 2;
    for (let row = 0; row < visibleCount; row++) {
      const cellEl = document.createElement('div');
      cellEl.className = 'icon-rain__cell';

      const isBright = Math.random() < config.brightChance;
      const opacity = isBright ? config.highlightOpacity : config.baseOpacity;
      const iconMarkup = ICON_PATHS[Math.floor(Math.random() * ICON_PATHS.length)];
      cellEl.appendChild(createSvg(iconMarkup, opacity));

      if (staticMode) {
        cellEl.style.opacity = isBright ? '0.7' : '0.28';
      } else {
        const blinkVariance = 0.64 + (Math.random() * 0.72);
        cellEl.style.animationDuration = `${config.blinkDuration * blinkVariance}s`;
        cellEl.style.animationDelay = `${Math.random() * config.blinkDuration * 2}s`;
      }

      columnEl.appendChild(cellEl);
    }

    rainRoot.appendChild(columnEl);
  }
}

function rebuild() {
  buildRain({ staticMode: Boolean(motionMedia?.matches) });
}

export function initLandingEffects({ root = document.getElementById('iconRain') } = {}) {
  if (active || !root) return;

  rainRoot = root;
  motionMedia = window.matchMedia(MOTION_QUERY);

  rebuild();

  resizeHandler = () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(rebuild, 180);
  };
  motionHandler = () => rebuild();

  window.addEventListener('resize', resizeHandler);
  if (typeof motionMedia.addEventListener === 'function') {
    motionMedia.addEventListener('change', motionHandler);
  } else if (typeof motionMedia.addListener === 'function') {
    motionMedia.addListener(motionHandler);
  }

  active = true;
}

export function destroyLandingEffects() {
  clearTimeout(resizeTimer);
  resizeTimer = null;

  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
    resizeHandler = null;
  }

  if (motionMedia && motionHandler) {
    if (typeof motionMedia.removeEventListener === 'function') {
      motionMedia.removeEventListener('change', motionHandler);
    } else if (typeof motionMedia.removeListener === 'function') {
      motionMedia.removeListener(motionHandler);
    }
  }

  motionMedia = null;
  motionHandler = null;
  active = false;

  if (rainRoot) {
    rainRoot.replaceChildren();
    rainRoot.classList.remove('icon-rain--static');
    rainRoot.removeAttribute('style');
  }

  rainRoot = null;
}
