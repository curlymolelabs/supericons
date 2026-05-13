import {
  DOCS_PAGE_GROUPS,
  DOCS_PAGE_ORDER,
  getDocsPageConfig,
} from '../docs-pages.js';

export function renderDocsSidebar(view) {
  return DOCS_PAGE_GROUPS.map((group) => {
    const groupKey = group.label
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const links = group.pages
      .map((pageView) => {
        const config = getDocsPageConfig(pageView);
        const isActive = pageView === view;
        return `<a class="docs-shell__nav-link${isActive ? ' is-active' : ''}" href="/?view=${pageView}" data-docs-view="${pageView}"${isActive ? ' aria-current="page"' : ''}>${getDocsPageText(pageView, 'navLabel', config.navLabel)}</a>`;
      })
      .join('');

    return `
      <section class="docs-shell__nav-group" data-docs-group="${groupKey}">
        <button class="docs-shell__nav-trigger" type="button" data-docs-group-toggle="${groupKey}" aria-expanded="true">
          <span class="docs-shell__nav-title">${getDocsGroupLabel(groupKey, group.label)}</span>
          <span class="material-symbols-outlined docs-shell__nav-chevron" aria-hidden="true">expand_more</span>
        </button>
        <div class="docs-shell__nav-list">
          ${links}
        </div>
      </section>`;
  }).join('');
}

export function renderDocsPagination(view) {
  const index = DOCS_PAGE_ORDER.indexOf(view);
  if (index === -1) return '';

  const prevView = DOCS_PAGE_ORDER[index - 1] || null;
  const nextView = DOCS_PAGE_ORDER[index + 1] || null;
  const prevConfig = prevView ? getDocsPageConfig(prevView) : null;
  const nextConfig = nextView ? getDocsPageConfig(nextView) : null;

  if (!prevConfig && !nextConfig) return '';

  return `
    <nav class="docs-shell__pager" aria-label="${t('docs.pageNavigation', {}, 'Docs page navigation')}">
      ${prevConfig ? `<a class="docs-shell__pager-link" href="/?view=${prevView}" data-docs-view="${prevView}">
        <span class="docs-shell__pager-label">${t('docs.previous', {}, 'Previous')}</span>
        <strong>${getDocsPageText(prevView, 'navLabel', prevConfig.navLabel)}</strong>
      </a>` : '<span></span>'}
      ${nextConfig ? `<a class="docs-shell__pager-link docs-shell__pager-link--next" href="/?view=${nextView}" data-docs-view="${nextView}">
        <span class="docs-shell__pager-label">${t('docs.next', {}, 'Next')}</span>
        <strong>${getDocsPageText(nextView, 'navLabel', nextConfig.navLabel)}</strong>
      </a>` : ''}
    </nav>`;
}

export function renderDocsSiteShellMarkup(view) {
  return `
    <div class="docs-shell">
      <div class="docs-shell__backdrop" aria-hidden="true" hidden></div>

      <aside class="docs-shell__sidebar" id="docsSidebarNav" aria-label="${t('docs.navigation', {}, 'Docs navigation')}" tabindex="-1">
        <div class="docs-shell__sidebar-head">
          <h2 class="docs-shell__sidebar-brand">
            <a class="docs-shell__sidebar-home" href="/?view=docs" data-docs-view="docs" aria-label="${t('docs.goHome', {}, 'Go to Documentation home')}">
              <span class="docs-shell__sidebar-home-icon" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path d="M24 0v24H0V0zM12.593 23.258l-.011.002-.071.035-.02.004-.014-.004-.071-.035c-.01-.004-.019-.001-.024.005l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.017-.018m.265-.113-.013.002-.185.093-.01.01-.003.011.018.43.005.012.008.007.201.093c.012.004.023 0 .029-.008l.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022m-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l.015-.002.201-.093.01-.008.004-.011.017-.43-.003-.012-.01-.01z" fill="none"/>
                  <path class="docs-shell__sidebar-home-frame" d="M13.228 2.688a2 2 0 0 0-2.456 0l-8.384 6.52C1.636 9.795 2.05 11 3.003 11h1.092l.82 8.199A2 2 0 0 0 6.905 21h10.19a2 2 0 0 0 1.99-1.801l.82-8.199h1.092c.952 0 1.368-1.205.615-1.791l-8.384-6.52ZM5.996 9.91a1.008 1.008 0 0 0-.37-.684L12 4.267l6.374 4.958a1.008 1.008 0 0 0-.37.684L17.095 19H6.905z"/>
                  <g class="docs-shell__sidebar-home-core">
                    <circle class="docs-shell__sidebar-home-core-ring" cx="12" cy="13" r="3.5"/>
                  </g>
                </svg>
              </span>
              <span>${t('docs.documentation', {}, 'Documentation')}</span>
            </a>
          </h2>
        </div>
        <div class="docs-shell__sidebar-nav">
          ${renderDocsSidebar(view)}
        </div>
      </aside>

      <div class="docs-shell__content">
        <article class="docs-shell__page"></article>
      </div>

      <div class="docs-scroll-actions" aria-label="${t('docs.pageNavigation', {}, 'Page navigation')}">
        <button class="docs-scroll-btn" id="docsScrollDown" aria-label="${t('docs.nextSection', {}, 'Go to next section')}" hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        <button class="docs-scroll-btn" id="docsScrollTop" aria-label="${t('docs.backToTop', {}, 'Back to top')}" hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
        </button>
      </div>
    </div>`;
}

export function renderDocsArticleMarkup(view) {
  const config = getDocsPageConfig(view);
  const localizedBodyHtml = getDocsPageText(view, 'bodyHtml', '');
  const bodyHtml = isDefaultLocale() || !localizedBodyHtml ? config.bodyHtml : localizedBodyHtml;
  const pillsMarkup = Array.isArray(config.pills) && config.pills.length
    ? `<div class="docs-pill-list docs-pill-list--hero">${config.pills.map((pill) => `<span class="docs-pill docs-pill--static">${pill}</span>`).join('')}</div>`
    : '';
  const verifiedNote = config.verifiedNote
    ? getDocsPageText(view, 'verifiedNote', config.verifiedNote)
    : '';
  const verifiedMarkup = verifiedNote
    ? `<p class="docs-shell__verified">${verifiedNote}</p>`
    : '';

  return `
    <header class="docs-hero docs-hero--page${config.summary ? '' : ' docs-hero--compact'}">
      <span class="docs-shell__kicker">${getDocsPageText(view, 'kicker', config.kicker)}</span>
      <h1 class="docs-hero__title">${getDocsPageText(view, 'pageTitle', config.pageTitle)}</h1>
      ${config.summary ? `<p class="docs-hero__copy">${getDocsPageText(view, 'summary', config.summary)}</p>` : ''}
      ${verifiedMarkup}
      ${pillsMarkup}
    </header>

    ${bodyHtml}
    ${renderDocsPagination(view)}`;
}

function t(key, params = {}, fallback = key) {
  const value = getSupericonsRuntime()?.t?.(key, params);
  return value && value !== key ? value : fallback;
}

function getDocsGroupLabel(groupKey, fallback) {
  return t(`docs.groups.${groupKey}`, {}, fallback);
}

function getDocsPageText(view, field, fallback) {
  return t(`docs.pages.${view}.${field}`, {}, fallback);
}

function isDefaultLocale() {
  const locale = getSupericonsRuntime()?.getActiveLocale?.();
  return !locale || locale === 'en';
}

function getSupericonsRuntime() {
  return typeof window === 'undefined' ? globalThis.__supericons : window.__supericons;
}
