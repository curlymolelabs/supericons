/**
 * si-premium-motion.js
 *
 * Full-fidelity premium motion previews for si concept icons, sourced from the
 * agentic-motion pack bundle (the same public preview asset the collections
 * page uses; purchasable delivery stays behind serve-premium-asset).
 *
 * Protection model (best effort, zero fidelity loss):
 * - The preview mounts inside a CLOSED shadow root: page scripts, extensions,
 *   and the app's own copy/export paths cannot reach the animated markup via
 *   the document. Copy and export actions keep returning the free static SVG.
 * - Context menu and text selection are disabled on the host element.
 * - Class names in the bundle are already obfuscated per pack build.
 */

export const PREMIUM_MOTION_PACK = Object.freeze({
  slug: 'agentic-motion',
  packLabel: 'Agentic Motion',
  priceLabelIcon: 'Buy icon · $1',
  priceLabelPack: 'Buy pack · $9.99',
  stripePriceId: 'price_1TpW6m35D7agOGFj2SwGhsJc',
  // Single Icon License price, wired in phase two of the premium rollout.
  singleIconStripePriceId: 'price_1TpW8r35D7agOGFj2zmO5fUl',
  // si_products row id for the agentic-motion pack.
  productId: 'f74ed439-f1de-4a15-8c4f-1e272097a088',
});

export function isPremiumMotionPackProvisioned() {
  return Boolean(PREMIUM_MOTION_PACK.stripePriceId && PREMIUM_MOTION_PACK.productId);
}

/**
 * Every si concept icon has an animated counterpart in the agentic-motion
 * pack, so premium motion availability keys off the catalog metadata rather
 * than a hand-maintained list.
 */
export function hasPremiumMotion(icon) {
  return !!(icon && icon.lib === 'si' && icon.assetType === 'concept-icon');
}

/**
 * Extracts the CSS rules and keyframes for a single icon from the pack CSS,
 * identified by the icon's root class in its SVG markup.
 */
export function extractIconCss(bundleCss, svgMarkup) {
  const rootMatch = /class="([a-z0-9]+)"/.exec(svgMarkup || '');
  if (!bundleCss || !rootMatch) return '';
  const rootClass = rootMatch[1];

  const blocks = bundleCss.match(/[^{}]+\{[^{}]*\}|@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g) || [];
  const iconBlocks = blocks.filter((block) => !block.startsWith('@keyframes') && block.includes(`.${rootClass}`));
  const animationNames = new Set();
  for (const block of iconBlocks) {
    for (const match of block.matchAll(/animation:\s*([a-z0-9]+)/g)) {
      animationNames.add(match[1]);
    }
  }
  const keyframeBlocks = blocks.filter((block) => {
    const name = /@keyframes\s+([a-z0-9]+)/.exec(block);
    return name && animationNames.has(name[1]);
  });
  return [...iconBlocks, ...keyframeBlocks].join('\n').trim();
}

let bundlePromise = null;
function loadPackBundle() {
  if (!bundlePromise) {
    bundlePromise = fetch(`/packs/${PREMIUM_MOTION_PACK.slug}/bundle.json`)
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null);
  }
  return bundlePromise;
}

/**
 * Mounts the animated preview into hostEl inside a closed shadow root.
 * Resolves to true when a preview was mounted.
 */
export async function mountPremiumMotionPreview(hostEl, icon) {
  if (!hostEl || !hasPremiumMotion(icon)) return false;
  const bundle = await loadPackBundle();
  const svgMarkup = bundle?.icons?.[icon.id];
  if (!svgMarkup || !hostEl.isConnected || hostEl.shadowRoot !== null || hostEl.dataset.pmMounted) {
    return false;
  }
  hostEl.dataset.pmMounted = '1';

  const shadow = hostEl.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  // The pack CSS triggers on `.si-icon-cell:hover`; a wrapper carrying that
  // class fills the host, so hovering the host plays the animation.
  style.textContent = `
    :host { display: grid; cursor: pointer; }
    .si-icon-cell { display: grid; place-items: center; width: 100%; height: 100%; }
    .si-icon-cell svg { width: 64px; height: 64px; }
    ${bundle.css}
  `;
  const wrap = document.createElement('div');
  wrap.className = 'si-icon-cell';
  wrap.innerHTML = svgMarkup;
  const svgEl = wrap.querySelector('svg');
  if (svgEl) {
    svgEl.removeAttribute('width');
    svgEl.removeAttribute('height');
  }
  shadow.appendChild(style);
  shadow.appendChild(wrap);

  hostEl.addEventListener('contextmenu', (event) => event.preventDefault());
  hostEl.addEventListener('selectstart', (event) => event.preventDefault());
  hostEl.setAttribute('aria-label', `${icon.name} animated preview`);
  hostEl.setAttribute('role', 'img');
  return true;
}
