// Web-preview only. This module is not used by the MCP, CLI, registry exports,
// or SVG assets, so partner links cannot affect icon search or agent responses.
const ICON_PREVIEW_COMMERCE_PROFILES = Object.freeze({
  'si:base44': Object.freeze({
    url: 'https://base44.pxf.io/c/7419860/2049275/25619?trafcat=base',
    ctaLabel: 'Build with Base44',
    ariaLabel: 'Build with Base44. Opens the Base44 website in a new tab.',
    rel: 'sponsored noopener noreferrer',
  }),
  'simpleicons:railway': Object.freeze({
    url: 'https://railway.com?referralCode=H0klSF',
    ctaLabel: 'Deploy with Railway',
    ariaLabel: 'Deploy with Railway. Opens the Railway website in a new tab.',
    rel: 'sponsored noopener noreferrer',
  }),
});

function iconKeyFromValue(value) {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  return `${value.lib}:${value.id}`;
}

export function getIconPreviewCommerceProfile(iconOrKey) {
  return ICON_PREVIEW_COMMERCE_PROFILES[iconKeyFromValue(iconOrKey)] || null;
}

export function listIconPreviewCommerceProfileIds() {
  return Object.keys(ICON_PREVIEW_COMMERCE_PROFILES);
}
