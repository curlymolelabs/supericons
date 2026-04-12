const SIDEBAR_ICON_MARKUP = {
  all: `
    <svg viewBox="0 0 24 24" fill="none" class="sidebar-icon sidebar-icon--all v41-appgrid" aria-hidden="true">
      <rect class="app-tile app-tile--1" x="3" y="3" width="4" height="4" rx="1"></rect>
      <rect class="app-tile app-tile--2 app-tile--core" x="10" y="3" width="4" height="4" rx="1"></rect>
      <rect class="app-tile app-tile--3" x="17" y="3" width="4" height="4" rx="1"></rect>
      <rect class="app-tile app-tile--4 app-tile--core" x="3" y="10" width="4" height="4" rx="1"></rect>
      <rect class="app-tile app-tile--5" x="10" y="10" width="4" height="4" rx="1"></rect>
      <rect class="app-tile app-tile--6 app-tile--core" x="17" y="10" width="4" height="4" rx="1"></rect>
      <rect class="app-tile app-tile--7" x="3" y="17" width="4" height="4" rx="1"></rect>
      <rect class="app-tile app-tile--8 app-tile--core" x="10" y="17" width="4" height="4" rx="1"></rect>
      <rect class="app-tile app-tile--9" x="17" y="17" width="4" height="4" rx="1"></rect>
    </svg>
  `,
  favorites: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="sidebar-icon sidebar-icon--favorites v3-heart" aria-hidden="true">
      <g class="heart-pulse-1"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0"/></g>
      <g class="heart-body"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/></g>
    </svg>
  `,
  recent: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="sidebar-icon sidebar-icon--recent v3-clock" aria-hidden="true">
      <g class="clock-face"><circle cx="12" cy="12" r="10"/></g>
      <g class="clock-minute"><line x1="12" y1="12" x2="12" y2="6"/></g>
      <g class="clock-second"><line x1="12" y1="12" x2="16" y2="12"/></g>
    </svg>
  `,
  mingcute: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="sidebar-icon sidebar-icon--mingcute v41-mingcute" aria-hidden="true">
      <g fill="none" fill-rule="evenodd"><path d="M24 0v24H0V0z" fill="none"/></g>
      <g class="mc-inner"><path fill="currentColor" d="M19.96 3.65a1.1 1.1 0 0 1 1.54.822l.013.12.817 15.194a1.1 1.1 0 0 1-1.419 1.112l-.107-.04-4.897-2.067-3.257 1.983a1.25 1.25 0 0 1-1.163.072l-.137-.072-3.257-1.983-4.897 2.067A1.1 1.1 0 0 1 1.67 19.9v-.114l.817-15.194a1.1 1.1 0 0 1 1.441-.986l.112.044L9.4 6.083 12 7.166l2.601-1.084zm-5.904 4.826-1.575.657a1.25 1.25 0 0 1-.828.047l-.134-.047-1.575-.657-.342 8.892L12 18.828l2.398-1.46zm5.53-2.46-3.56 1.616.368 9.193 3.862 1.631zm-15.173 0-.668 12.44 3.861-1.63.368-9.194-3.56-1.617Z"/></g>
    </svg>
  `,
  simpleicons: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" class="sidebar-icon sidebar-icon--simpleicons v4-simpleicons" aria-hidden="true">
      <g data-anim-root="true"><path d="M246.66,123.56,201,55.13A15.94,15.94,0,0,0,187.72,48H40A16,16,0,0,0,24,64V192a16,16,0,0,0,16,16H187.72A16,16,0,0,0,201,200.88l45.63-68.44A8,8,0,0,0,246.66,123.56ZM187.72,192H40V64H187.72l42.66,64Z"></path></g>
    </svg>
  `,
  lucide: `
    <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="sidebar-icon sidebar-icon--lucide v3-lucide" aria-hidden="true">
      <g class="lucide-left"><path d="M9.818 2.15C4.408 2.151 0 6.561 0 11.97a14.16 14.16 0 0 0 4.8 10.637 1.09 1.09 0 0 0 1.54-.096 1.09 1.09 0 0 0-.095-1.54 11.957 11.957 0 0 1-4.063-9 7.62 7.62 0 0 1 7.636-7.637 7.62 7.62 0 0 1 7.637 7.636 3.256 3.256 0 0 1-3.273 3.273 3.256 3.256 0 0 1-3.273-3.273 1.09 1.09 0 0 0-1.09-1.09 1.09 1.09 0 0 0-1.092 1.09c0 3 2.455 5.455 5.455 5.455s5.454-2.455 5.454-5.455c0-5.408-4.408-9.818-9.818-9.818z"/></g>
      <g class="lucide-right"><path d="M18.483 1.123a1.09 1.09 0 0 0-.752.362 1.09 1.09 0 0 0 .088 1.54 11.956 11.956 0 0 1 4 8.946 7.62 7.62 0 0 1-7.637 7.636 7.62 7.62 0 0 1-7.637-7.636 3.255 3.255 0 0 1 3.273-3.273c1.82 0 3.273 1.45 3.273 3.273a1.09 1.09 0 0 0 1.09 1.09 1.09 1.09 0 0 0 1.092-1.09c0-3-2.455-5.455-5.455-5.455s-5.454 2.455-5.454 5.455c0 5.408 4.408 9.818 9.818 9.818 5.41 0 9.818-4.41 9.818-9.818A14.16 14.16 0 0 0 19.272 1.4a1.09 1.09 0 0 0-.789-.277Z"/></g>
    </svg>
  `,
  tabler: `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" class="sidebar-icon sidebar-icon--tabler v3-tabler" aria-hidden="true">
      <g class="tabler-border"><path d="M3 7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g>
      <g class="tabler-prompt"><path d="M8 9l3 3-3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g>
      <g class="tabler-cursor"><path d="M13 15h3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g>
    </svg>
  `,
  phosphor: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" class="sidebar-icon sidebar-icon--phosphor v4-phosphor" aria-hidden="true">
      <g data-anim-root="true"><path d="M152,32H72a8,8,0,0,0-8,8V168a80.09,80.09,0,0,0,80,80,8,8,0,0,0,8-8V176a72,72,0,0,0,0-144ZM80,70.54,130.32,160H80Zm56,66.92L85.68,48H136ZM80.51,176H136v55.5A64.14,64.14,0,0,1,80.51,176ZM152,160V48a56,56,0,0,1,0,112Z"></path></g>
    </svg>
  `,
  heroicons: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="sidebar-icon sidebar-icon--heroicons v3-shield" aria-hidden="true">
      <g class="shield-body"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></g>
      <g class="shield-emblem"><path d="M9 12l2 2 4-4" stroke-width="2"/></g>
    </svg>
  `,
  bootstrap: `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="sidebar-icon sidebar-icon--bootstrap v4-bootstrap" viewBox="0 0 16 16" aria-hidden="true">
      <g class="bs-outer"><path d="M0 4a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4zm4-3a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V4a3 3 0 0 0-3-3z"/></g>
      <g class="bs-inner"><path d="M6.375 7.125h1.78c.973 0 1.542-.457 1.542-1.237 0-.802-.604-1.23-1.764-1.23h-1.558v2.467z"/><path d="M6.375 8.162h1.822c1.236 0 1.887.463 1.887 1.348 0 .896-.627 1.377-1.811 1.377h-1.898V8.162z"/><path d="M5.062 12h3.475c1.804 0 2.888-.908 2.888-2.396 0-1.102-.761-1.916-1.904-2.034v-.1c.832-.14 1.482-.93 1.482-1.816 0-1.3-.955-2.11-2.542-2.11H5.062z"/></g>
    </svg>
  `,
  iconoir: `
    <svg width="24" height="24" stroke-width="1.5" viewBox="0 0 24 24" fill="none" class="sidebar-icon sidebar-icon--iconoir v3-iconoir" aria-hidden="true">
      <g class="oir-line"><path d="M19 3L5 3C3.89543 3 3 3.89543 3 5L3 19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/></g>
      <g class="oir-circle"><path d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/></g>
    </svg>
  `,
  ionicons: `
    <svg fill="currentColor" viewBox="0 0 24 24" class="sidebar-icon sidebar-icon--ionicons v3-ionic" aria-hidden="true">
      <g class="ion-orbit"><path d="M22.922 7.027l-.103-.23-.169.188c-.408.464-.928.82-1.505 1.036l-.159.061.066.155a9.745 9.745 0 0 1 .75 3.759c0 5.405-4.397 9.806-9.806 9.806-5.409 0-9.802-4.397-9.802-9.802 0-5.405 4.402-9.806 9.806-9.806 1.467 0 2.883.319 4.2.947l.155.075.066-.155a3.767 3.767 0 0 1 1.106-1.453l.197-.159-.225-.117A11.905 11.905 0 0 0 12.001.001c-6.619 0-12 5.381-12 12s5.381 12 12 12 12-5.381 12-12c0-1.73-.361-3.403-1.078-4.973zM12 6.53A5.476 5.476 0 0 0 6.53 12 5.476 5.476 0 0 0 12 17.47 5.476 5.476 0 0 0 17.47 12 5.479 5.479 0 0 0 12 6.53z"/></g>
      <g class="ion-dot"><path d="M22.345 4.523a2.494 2.494 0 1 1-4.988 0 2.494 2.494 0 0 1 4.988 0z"/></g>
    </svg>
  `,
  material: `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sidebar-icon sidebar-icon--material v3-matgrid" aria-hidden="true">
      <g class="mat-circ"><circle cx="6.5" cy="6.5" r="3.5"/></g>
      <g class="mat-tri"><path d="M14 3l7 7-7 7z"/></g>
      <g class="mat-rect"><rect x="3" y="14" width="7" height="7" rx="1"/></g>
    </svg>
  `,
  collections: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="sidebar-icon sidebar-icon--collections v3-layers" aria-hidden="true">
      <g class="layer-bottom"><rect x="4" y="14" width="16" height="6" rx="1.5"/></g>
      <g class="layer-mid"><rect x="6" y="9" width="12" height="6" rx="1.5"/></g>
      <g class="layer-top"><rect x="8" y="4" width="8" height="6" rx="1.5"/></g>
    </svg>
  `,
  motionlab: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="sidebar-icon sidebar-icon--motionlab v41-motionlab" aria-hidden="true">
      <g class="ring ring-back">
        <ellipse cx="8.1" cy="15.4" rx="3.15" ry="4.7" transform="rotate(-39 8.1 15.4)"></ellipse>
      </g>
      <g class="ring ring-mid">
        <ellipse cx="12" cy="12" rx="3.15" ry="4.7" transform="rotate(-39 12 12)"></ellipse>
      </g>
      <g class="ring ring-front">
        <ellipse cx="15.9" cy="8.6" rx="3.15" ry="4.7" transform="rotate(-39 15.9 8.6)"></ellipse>
      </g>
    </svg>
  `,
  converter: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="sidebar-icon sidebar-icon--converter v3-converter" aria-hidden="true">
      <g class="arrow-a"><path d="M7 10l-3 3 3 3"/><line x1="4" y1="13" x2="15" y2="13"/></g>
      <g class="arrow-b"><path d="M17 8l3-3-3-3"/><line x1="20" y1="5" x2="9" y2="5"/></g>
    </svg>
  `,
  pricing: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="sidebar-icon sidebar-icon--pricing v3-tag" aria-hidden="true">
      <g class="tag-body"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/></g>
      <g class="tag-hole"><circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none"/></g>
    </svg>
  `,
  'my-downloads': `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="sidebar-icon sidebar-icon--my-collection" aria-hidden="true">
      <g class="v1-folder-body">
        <path d="M4 9L4 19Q4 20 5 20L19 20Q20 20 20 19L20 9Q20 8 19 8L12.5 8Q12 8 11.5 7.5L10.5 6Q10 5 9.5 5L5 5Q4 5 4 6L4 9Z"/>
      </g>
      <g class="v1-spark-1">
        <line x1="6" y1="3.5" x2="6" y2="7" stroke-width="1.2"/>
        <line x1="4.25" y1="5.25" x2="7.75" y2="5.25" stroke-width="1.2"/>
        <line x1="4.8" y1="3.8" x2="7.2" y2="6.7" stroke-width="0.7" opacity="0.5"/>
        <line x1="7.2" y1="3.8" x2="4.8" y2="6.7" stroke-width="0.7" opacity="0.5"/>
      </g>
      <g class="v1-spark-2">
        <line x1="12" y1="1.5" x2="12" y2="5.5" stroke-width="1.3"/>
        <line x1="10" y1="3.5" x2="14" y2="3.5" stroke-width="1.3"/>
        <line x1="10.5" y1="2" x2="13.5" y2="5" stroke-width="0.75" opacity="0.5"/>
        <line x1="13.5" y1="2" x2="10.5" y2="5" stroke-width="0.75" opacity="0.5"/>
      </g>
      <g class="v1-spark-3">
        <line x1="18" y1="3.5" x2="18" y2="7" stroke-width="1.2"/>
        <line x1="16.25" y1="5.25" x2="19.75" y2="5.25" stroke-width="1.2"/>
        <line x1="16.8" y1="3.8" x2="19.2" y2="6.7" stroke-width="0.7" opacity="0.5"/>
        <line x1="19.2" y1="3.8" x2="16.8" y2="6.7" stroke-width="0.7" opacity="0.5"/>
      </g>
    </svg>
  `,
};

export function getSidebarIconMarkup(key, fallbackGlyph = 'folder') {
  return SIDEBAR_ICON_MARKUP[key] || `<span class="material-symbols-outlined sidebar__item-glyph">${fallbackGlyph}</span>`;
}

export function renderSidebarIconSlot(key, options = {}) {
  const { fallbackGlyph = 'folder' } = options;
  return `<span class="sidebar__item-icon sidebar__item-icon--svg" data-sidebar-icon="${key}" aria-hidden="true">${getSidebarIconMarkup(key, fallbackGlyph)}</span>`;
}

export function hydrateSidebarIconSlot(el, key, options = {}) {
  if (!el) return;
  const { fallbackGlyph = 'folder' } = options;
  el.dataset.sidebarIcon = key;
  el.setAttribute('aria-hidden', 'true');
  el.classList.add('sidebar__item-icon--svg');
  el.classList.remove('material-symbols-outlined');
  el.innerHTML = getSidebarIconMarkup(key, fallbackGlyph);
}
