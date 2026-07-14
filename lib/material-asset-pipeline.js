import { createHash } from 'node:crypto';

const FORBIDDEN_ELEMENT = /<(script|foreignObject|iframe|object|embed|image)\b/i;
const EVENT_HANDLER = /\son[a-z]+\s*=/i;
const EXTERNAL_REFERENCE = /\s(?:href|xlink:href|src)\s*=\s*["'](?!#)[^"']+["']/i;

export function validateMaterialSvg(rawSvg) {
  const svg = String(rawSvg || '').trim();
  const failures = [];

  if (!svg) failures.push('empty_svg');
  if (!/^<svg\b[^>]*>[\s\S]*<\/svg>$/i.test(svg)) failures.push('invalid_svg_root');
  if (!/\bviewBox\s*=\s*["'][^"']+["']/i.test(svg)) failures.push('missing_viewbox');
  if (FORBIDDEN_ELEMENT.test(svg)) failures.push('forbidden_element');
  if (EVENT_HANDLER.test(svg)) failures.push('event_handler');
  if (EXTERNAL_REFERENCE.test(svg)) failures.push('external_reference');

  return {
    valid: failures.length === 0,
    failures,
  };
}

export function normalizeAndValidateMaterialSvg(rawSvg) {
  const normalized = String(rawSvg || '')
    .trim()
    .replace(/<svg([^>]*)\sfill=["'][^"']*["']([^>]*)>/i, '<svg$1$2 fill="currentColor">')
    .replace(/<svg((?:(?!\sfill=)[^>])*)>/i, '<svg$1 fill="currentColor">');
  const validation = validateMaterialSvg(normalized);
  if (!validation.valid) {
    throw new Error(`Invalid Material SVG: ${validation.failures.join(', ')}`);
  }
  return normalized;
}

export function checksumMaterialSvg(svg) {
  return createHash('sha256').update(svg).digest('hex');
}
