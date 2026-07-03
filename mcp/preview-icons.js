import { Resvg } from '@resvg/resvg-js';

function escapeXml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function truncate(value = '', maxLength = 80) {
  const text = String(value || '').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
}

function extractSvgParts(svg = '') {
  const raw = String(svg || '')
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!doctype[\s\S]*?>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .trim();
  const openTag = raw.match(/<svg\b([^>]*)>/i);
  const closeIndex = raw.toLowerCase().lastIndexOf('</svg>');
  if (!openTag || closeIndex < 0) return null;
  const attrs = openTag[1] || '';
  const viewBox = attrs.match(/\bviewBox=["']([^"']+)["']/i)?.[1] || '0 0 24 24';
  const body = raw.slice(openTag.index + openTag[0].length, closeIndex);
  return { viewBox, body };
}

function getReason(icon = {}) {
  const semantic = icon.semantic || {};
  return truncate(
    icon.why_it_fits
      || icon.reason
      || semantic.purpose
      || semantic.use_when
      || semantic.depicts
      || 'Visual candidate from Supericons search.',
    88,
  );
}

function iconSvgForSheet(icon, x, y, size) {
  const parts = extractSvgParts(icon.svg);
  if (!parts) {
    return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="10" fill="#2a2a2a"/>`;
  }

  return `
    <svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="${escapeXml(parts.viewBox)}" color="#f4f4f5" fill="none">
      <g>${parts.body}</g>
    </svg>
  `;
}

export function buildIconContactSheetSvg(icons = [], {
  title = 'Supericons visual preview',
  subtitle = 'Visual preview generated from MCP results',
} = {}) {
  const safeIcons = icons.slice(0, 12);
  const columns = 3;
  const cardWidth = 360;
  const cardHeight = 164;
  const gap = 20;
  const margin = 36;
  const headerHeight = 96;
  const rows = Math.max(1, Math.ceil(safeIcons.length / columns));
  const width = margin * 2 + columns * cardWidth + (columns - 1) * gap;
  const height = headerHeight + margin + rows * cardHeight + (rows - 1) * gap;

  const cards = safeIcons.map((icon, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = margin + col * (cardWidth + gap);
    const y = headerHeight + row * (cardHeight + gap);
    const iconSize = 76;
    const iconX = x + 24;
    const iconY = y + 34;
    const labelX = x + 122;
    const libraryLabel = icon.library_label || icon.libraryName || icon.library_name || icon.library || 'Unknown library';
    const iconRef = icon.icon_ref || `${icon.library || icon.lib}:${icon.id}`;
    const reason = getReason(icon);

    return `
      <g>
        <rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" rx="14" fill="#191919" stroke="#3a3a3a"/>
        <rect x="${iconX - 10}" y="${iconY - 10}" width="${iconSize + 20}" height="${iconSize + 20}" rx="14" fill="#111111" stroke="#2f2f2f"/>
        ${iconSvgForSheet(icon, iconX, iconY, iconSize)}
        <text x="${labelX}" y="${y + 42}" fill="#f4f4f5" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="700">${escapeXml(truncate(iconRef, 28))}</text>
        <text x="${labelX}" y="${y + 72}" fill="#ff5a1f" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="700">${escapeXml(truncate(libraryLabel, 30))}</text>
        <text x="${labelX}" y="${y + 103}" fill="#c8c8c8" font-family="Inter, Arial, sans-serif" font-size="15">${escapeXml(reason.slice(0, 44))}</text>
        <text x="${labelX}" y="${y + 126}" fill="#c8c8c8" font-family="Inter, Arial, sans-serif" font-size="15">${escapeXml(reason.slice(44, 88))}</text>
      </g>
    `;
  }).join('');

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="#0e0e0e"/>
      <text x="${margin}" y="46" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="800">${escapeXml(truncate(title, 64))}</text>
      <text x="${margin}" y="76" fill="#9ca3af" font-family="Inter, Arial, sans-serif" font-size="17">${escapeXml(truncate(subtitle, 96))}</text>
      ${cards}
    </svg>
  `;
}

export function buildIconContactSheetPng(icons = [], options = {}) {
  const svg = buildIconContactSheetSvg(icons, options);
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: 1200,
    },
    font: {
      loadSystemFonts: true,
    },
  });
  return resvg.render().asPng();
}

export function buildPreviewTextPayload({
  query = null,
  icons = [],
  previewUrl,
  imageIncluded = false,
} = {}) {
  return {
    query,
    preview_url: previewUrl,
    image_included: imageIncluded,
    client_display_note: imageIncluded
      ? 'If your MCP client does not render image content inline, open preview_url in a browser.'
      : 'Open preview_url in a browser to visually inspect these icons.',
    results: icons.map((icon) => ({
      id: icon.id,
      name: icon.name,
      library: icon.library || icon.lib,
      library_key: icon.library_key || icon.library || icon.lib,
      library_name: icon.library_name || icon.libraryName,
      library_label: icon.library_label,
      icon_ref: icon.icon_ref || `${icon.library || icon.lib}:${icon.id}`,
      icon_preview_url: icon.icon_preview_url,
      style: icon.style,
      semantic: icon.semantic || null,
    })),
  };
}
