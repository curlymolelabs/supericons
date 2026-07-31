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
  const presentation = {};
  const allowedAttrs = new Set([
    'fill',
    'stroke',
    'stroke-width',
    'stroke-linecap',
    'stroke-linejoin',
    'stroke-miterlimit',
    'fill-rule',
    'clip-rule',
  ]);
  for (const match of attrs.matchAll(/\s([a-zA-Z:-]+)=["']([^"']*)["']/g)) {
    const name = match[1];
    if (!allowedAttrs.has(name)) continue;
    presentation[name] = match[2];
  }
  return { viewBox, body, presentation };
}

function parseViewBox(viewBox = '') {
  const parts = String(viewBox || '')
    .trim()
    .split(/[\s,]+/)
    .map(Number)
    .filter(Number.isFinite);
  if (parts.length !== 4 || parts[2] <= 0 || parts[3] <= 0) {
    return { minX: 0, minY: 0, width: 24, height: 24 };
  }
  return {
    minX: parts[0],
    minY: parts[1],
    width: parts[2],
    height: parts[3],
  };
}

function fitViewBoxTransform(viewBox, x, y, size) {
  const box = parseViewBox(viewBox);
  const scale = Math.min(size / box.width, size / box.height);
  const fittedWidth = box.width * scale;
  const fittedHeight = box.height * scale;
  const translateX = x + (size - fittedWidth) / 2 - box.minX * scale;
  const translateY = y + (size - fittedHeight) / 2 - box.minY * scale;
  return `translate(${translateX.toFixed(3)} ${translateY.toFixed(3)}) scale(${scale.toFixed(6)})`;
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
    return `
      <rect x="${x}" y="${y}" width="${size}" height="${size}" rx="18" fill="#27272a" stroke="#52525b"/>
      <path d="M${x + size * 0.28} ${y + size * 0.28} L${x + size * 0.72} ${y + size * 0.72} M${x + size * 0.72} ${y + size * 0.28} L${x + size * 0.28} ${y + size * 0.72}" stroke="#a1a1aa" stroke-width="4" stroke-linecap="round"/>
    `;
  }

  const transform = fitViewBoxTransform(parts.viewBox, x, y, size);
  const inheritedAttrs = {
    fill: 'currentColor',
    ...parts.presentation,
  };
  const inheritedAttrText = Object.entries(inheritedAttrs)
    .map(([name, value]) => `${name}="${escapeXml(value)}"`)
    .join(' ');
  return `
    <g transform="${transform}" color="#f8fafc" ${inheritedAttrText}>
      ${parts.body}
    </g>
  `;
}

export function buildIconContactSheetSvg(icons = [], {
  title = 'Supericons visual preview',
  subtitle = 'Visual preview generated from MCP results',
} = {}) {
  const safeIcons = icons.slice(0, 12);
  const columns = 3;
  const cardWidth = 360;
  const cardHeight = 184;
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
    const iconSize = 108;
    const iconX = x + 24;
    const iconY = y + 38;
    const labelX = x + 156;
    const libraryLabel = icon.library_label || icon.libraryName || icon.library_name || icon.library || 'Unknown library';
    const iconRef = icon.icon_ref || `${icon.library || icon.lib}:${icon.id}`;
    const reason = getReason(icon);

    return `
      <g>
        <rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" rx="14" fill="#18181b" stroke="#3f3f46"/>
        <rect x="${iconX - 14}" y="${iconY - 14}" width="${iconSize + 28}" height="${iconSize + 28}" rx="20" fill="#09090b" stroke="#3f3f46"/>
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
  imageUrl,
  markdownImage,
  imageIncluded = false,
  truncatedFrom = null,
  browserPreviewCount = null,
  warnings = [],
} = {}) {
  const renderedCount = icons.length;
  const acceptedBrowserCount = Number.isInteger(browserPreviewCount)
    ? browserPreviewCount
    : renderedCount;
  const iconRefs = icons
    .map((icon) => icon.icon_ref || `${icon.library || icon.lib}:${icon.id}`)
    .filter(Boolean);
  const suggestedLines = renderedCount > 0
    ? [
        `Previewed ${renderedCount} verified icon${renderedCount === 1 ? '' : 's'}:`,
        ...(markdownImage ? ['', markdownImage] : []),
        '',
        ...iconRefs.map((ref) => `- \`${ref}\``),
        '',
        `[Open the visual preview](${previewUrl})`,
        '',
        'If this client cannot display the image inline, use the visual preview link above.',
      ]
    : [
        'No icons were available for this preview.',
        '',
        `[Open the visual preview](${previewUrl})`,
      ];
  return {
    query,
    preview_url: previewUrl,
    image_url: imageUrl || null,
    markdown_image: markdownImage || null,
    image_included: imageIncluded,
    rendered_count: renderedCount,
    browser_preview_count: acceptedBrowserCount,
    ...(truncatedFrom ? { truncated_from: truncatedFrom } : {}),
    ...(warnings.length ? { warnings } : {}),
    next_step: renderedCount > 0
      ? acceptedBrowserCount > renderedCount
        ? `The inline preview shows ${renderedCount} icons. Open preview_url to view all ${acceptedBrowserCount} accepted icon refs, then call get_icon for the exact SVG.`
        : 'Choose an icon ref from the preview, then call get_icon when you need the exact SVG.'
      : 'Try a broader query or provide different icon refs.',
    suggested_response_markdown: suggestedLines.join('\n'),
    client_display_note: imageIncluded
      ? 'If your MCP client does not render image content inline, use markdown_image in the final answer or open image_url/preview_url in a browser.'
      : 'Use markdown_image in the final answer when supported, or open image_url/preview_url in a browser.',
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
