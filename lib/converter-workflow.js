import { Buffer } from 'node:buffer';
import { ColorMode, Hierarchical, PathSimplifyMode, vectorize } from '@neplex/vectorizer';
import { Resvg } from '@resvg/resvg-js';
import { sanitizeSvgExportMarkup } from './public-metadata-sanitizer.js';

const SUPPORTED_IMAGE_MIME_TYPES = new Set(['image/png']);
const MAX_CONVERTER_INPUT_BYTES = 5 * 1024 * 1024;

function parseBase64Payload(input = '') {
  if (typeof input !== 'string' || !input.trim()) {
    throw new Error('Input must be a non-empty base64 string or data URL.');
  }

  const trimmed = input.trim();
  const dataUrlMatch = /^data:([^;]+);base64,(.+)$/i.exec(trimmed);
  if (dataUrlMatch) {
    return {
      mimeType: dataUrlMatch[1].toLowerCase(),
      buffer: Buffer.from(dataUrlMatch[2], 'base64'),
    };
  }

  return {
    mimeType: null,
    buffer: Buffer.from(trimmed, 'base64'),
  };
}

function resolveTraceClassForUiMode(traceClass = 'general-color', requestedColorMode = 'color', uiMode = 'logo') {
  const iconClasses = new Set(['tiny-line-icon', 'single-color-mark', 'mono-mask']);
  const logoClasses = new Set(['flat-logo-color', 'tile-icon-color', 'general-color']);

  if (uiMode === 'icon') {
    if (iconClasses.has(traceClass)) return traceClass;
    return requestedColorMode === 'mono' ? 'mono-mask' : 'tiny-line-icon';
  }

  if (logoClasses.has(traceClass)) return traceClass;
  if (requestedColorMode === 'mono') return 'mono-mask';
  return 'flat-logo-color';
}

function getTraceConfig(qualityMode = 'exact', requestedColorMode = 'color', traceClass = 'general-color', uiMode = 'logo') {
  const mode = qualityMode === 'compact' ? 'compact' : 'exact';
  const isBinary = requestedColorMode === 'mono';
  const resolvedTraceClass = resolveTraceClassForUiMode(traceClass, requestedColorMode, uiMode);

  const configByClass = {
    'general-color': {
      compact: {
        colorMode: isBinary ? ColorMode.Binary : ColorMode.Color,
        hierarchical: Hierarchical.Stacked,
        filterSpeckle: isBinary ? 4 : 6,
        colorPrecision: isBinary ? 8 : 6,
        layerDifference: isBinary ? 12 : 8,
        mode: PathSimplifyMode.Spline,
        cornerThreshold: 55,
        lengthThreshold: isBinary ? 5 : 6,
        maxIterations: 2,
        spliceThreshold: 50,
        pathPrecision: 4,
      },
      exact: {
        colorMode: isBinary ? ColorMode.Binary : ColorMode.Color,
        hierarchical: Hierarchical.Stacked,
        filterSpeckle: isBinary ? 3 : 4,
        colorPrecision: isBinary ? 8 : 8,
        layerDifference: isBinary ? 10 : 5,
        mode: PathSimplifyMode.Spline,
        cornerThreshold: 60,
        lengthThreshold: isBinary ? 4 : 4,
        maxIterations: 3,
        spliceThreshold: 45,
        pathPrecision: 5,
      },
    },
    'flat-logo-color': {
      compact: {
        colorMode: ColorMode.Color,
        hierarchical: Hierarchical.Stacked,
        filterSpeckle: 5,
        colorPrecision: 7,
        layerDifference: 7,
        mode: PathSimplifyMode.Spline,
        cornerThreshold: 56,
        lengthThreshold: 5,
        maxIterations: 2,
        spliceThreshold: 48,
        pathPrecision: 4,
      },
      exact: {
        colorMode: ColorMode.Color,
        hierarchical: Hierarchical.Stacked,
        filterSpeckle: 3,
        colorPrecision: 8,
        layerDifference: 5,
        mode: PathSimplifyMode.Spline,
        cornerThreshold: 60,
        lengthThreshold: 4,
        maxIterations: 3,
        spliceThreshold: 42,
        pathPrecision: 5,
      },
    },
    'tile-icon-color': {
      compact: {
        colorMode: ColorMode.Color,
        hierarchical: Hierarchical.Cutout,
        filterSpeckle: 5,
        colorPrecision: 7,
        layerDifference: 8,
        mode: PathSimplifyMode.Spline,
        cornerThreshold: 54,
        lengthThreshold: 5,
        maxIterations: 2,
        spliceThreshold: 48,
        pathPrecision: 4,
      },
      exact: {
        colorMode: ColorMode.Color,
        hierarchical: Hierarchical.Cutout,
        filterSpeckle: 3,
        colorPrecision: 8,
        layerDifference: 6,
        mode: PathSimplifyMode.Spline,
        cornerThreshold: 58,
        lengthThreshold: 4,
        maxIterations: 3,
        spliceThreshold: 42,
        pathPrecision: 5,
      },
    },
    'tiny-line-icon': {
      compact: {
        colorMode: ColorMode.Binary,
        hierarchical: Hierarchical.Stacked,
        filterSpeckle: 0,
        colorPrecision: 8,
        layerDifference: 12,
        mode: PathSimplifyMode.Spline,
        cornerThreshold: 52,
        lengthThreshold: 2,
        maxIterations: 2,
        spliceThreshold: 16,
        pathPrecision: 6,
      },
      exact: {
        colorMode: ColorMode.Binary,
        hierarchical: Hierarchical.Stacked,
        filterSpeckle: 0,
        colorPrecision: 8,
        layerDifference: 10,
        mode: PathSimplifyMode.Spline,
        cornerThreshold: 46,
        lengthThreshold: 1,
        maxIterations: 3,
        spliceThreshold: 12,
        pathPrecision: 7,
      },
    },
    'single-color-mark': {
      compact: {
        colorMode: ColorMode.Binary,
        hierarchical: Hierarchical.Stacked,
        filterSpeckle: 1,
        colorPrecision: 8,
        layerDifference: 12,
        mode: PathSimplifyMode.Spline,
        cornerThreshold: 54,
        lengthThreshold: 2,
        maxIterations: 2,
        spliceThreshold: 18,
        pathPrecision: 6,
      },
      exact: {
        colorMode: ColorMode.Binary,
        hierarchical: Hierarchical.Stacked,
        filterSpeckle: 0,
        colorPrecision: 8,
        layerDifference: 10,
        mode: PathSimplifyMode.Spline,
        cornerThreshold: 48,
        lengthThreshold: 1,
        maxIterations: 3,
        spliceThreshold: 14,
        pathPrecision: 7,
      },
    },
    'mono-mask': {
      compact: {
        colorMode: ColorMode.Binary,
        hierarchical: Hierarchical.Stacked,
        filterSpeckle: 1,
        colorPrecision: 8,
        layerDifference: 12,
        mode: PathSimplifyMode.Spline,
        cornerThreshold: 52,
        lengthThreshold: 2,
        maxIterations: 2,
        spliceThreshold: 18,
        pathPrecision: 6,
      },
      exact: {
        colorMode: ColorMode.Binary,
        hierarchical: Hierarchical.Stacked,
        filterSpeckle: 0,
        colorPrecision: 8,
        layerDifference: 10,
        mode: PathSimplifyMode.Spline,
        cornerThreshold: 46,
        lengthThreshold: 1,
        maxIterations: 3,
        spliceThreshold: 14,
        pathPrecision: 7,
      },
    },
  };

  const traceConfig = configByClass[resolvedTraceClass] || configByClass['general-color'];
  return {
    resolvedMode: mode,
    resolvedTraceClass,
    config: traceConfig[mode] || traceConfig.exact,
  };
}

function countMatches(text = '', pattern) {
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}

function extractViewBox(svg = '') {
  const match = svg.match(/viewBox="([^"]+)"/i);
  return match ? match[1] : null;
}

function validateInputBuffer(buffer, label = 'Input') {
  if (!buffer?.length) {
    throw new Error(`${label} payload is empty.`);
  }
  if (buffer.length > MAX_CONVERTER_INPUT_BYTES) {
    throw new Error(`${label} exceeds the ${Math.round(MAX_CONVERTER_INPUT_BYTES / (1024 * 1024))}MB MCP limit.`);
  }
}

function normalizeBackground(background = 'transparent') {
  if (!background || background === 'transparent') return null;
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(background)) return background;
  throw new Error('Background must be `transparent` or a hex color like `#ffffff`.');
}

export function getConverterMcpOptions() {
  return {
    proOnly: true,
    limits: {
      maxInputBytes: MAX_CONVERTER_INPUT_BYTES,
      maxSvgToPngWidth: 2048,
      minSvgToPngWidth: 16,
    },
    svgToPng: {
      targetWidthRange: { min: 16, max: 2048, default: 512 },
      backgrounds: ['transparent', '#ffffff', '#000000', 'custom-hex'],
      outputs: ['png-base64', 'png-data-url'],
    },
    pngToSvg: {
      qualityModes: ['exact', 'compact'],
      colorModes: ['color', 'mono'],
      traceClasses: ['general-color', 'flat-logo-color', 'tile-icon-color', 'tiny-line-icon', 'single-color-mark', 'mono-mask'],
      uiModes: ['logo', 'icon'],
      outputs: ['svg-text'],
    },
  };
}

export async function convertPngToSvg({ imageBase64, mimeType, qualityMode = 'exact', colorMode = 'color', traceClass = 'general-color', uiMode = 'logo' }) {
  const { mimeType: parsedMimeType, buffer } = parseBase64Payload(imageBase64);
  validateInputBuffer(buffer, 'PNG input');
  const effectiveMimeType = (mimeType || parsedMimeType || 'image/png').toLowerCase();

  if (!SUPPORTED_IMAGE_MIME_TYPES.has(effectiveMimeType)) {
    throw new Error(`Unsupported image type "${effectiveMimeType}". Converter MCP currently accepts PNG only.`);
  }

  const { resolvedMode, resolvedTraceClass, config } = getTraceConfig(qualityMode, colorMode, traceClass, uiMode);
  const startedAt = Date.now();
  const svg = sanitizeSvgExportMarkup(await vectorize(buffer, config), { preserveBranding: false });
  const elapsedMs = Date.now() - startedAt;

  return {
    svg,
    warnings: qualityMode === 'auto'
      ? ['`auto` is not modeled in MCP yet; it currently resolves to `exact` for fidelity-first output.']
      : [],
    metrics: {
      elapsedMs,
      sizeBytes: Buffer.byteLength(svg, 'utf8'),
      pathCount: countMatches(svg, /<path\b/gi),
      shapeCount: countMatches(svg, /<(path|rect|circle|ellipse|polygon|polyline|line)\b/gi),
      viewBox: extractViewBox(svg),
    },
    request: {
      qualityMode: resolvedMode,
      colorMode,
      traceClass: resolvedTraceClass,
      uiMode,
    },
  };
}

export function convertSvgToPng({ svg, targetWidth = 512, background = 'transparent' }) {
  if (typeof svg !== 'string' || !svg.trim()) {
    throw new Error('SVG input must be a non-empty string.');
  }
  if (!Number.isFinite(targetWidth) || targetWidth < 16 || targetWidth > 2048) {
    throw new Error('`targetWidth` must be a number between 16 and 2048.');
  }

  const resolvedBackground = normalizeBackground(background);
  const startedAt = Date.now();
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: Math.round(targetWidth) },
    background: resolvedBackground || undefined,
  });
  const rendered = resvg.render();
  const pngBuffer = rendered.asPng();
  const elapsedMs = Date.now() - startedAt;

  return {
    pngBase64: pngBuffer.toString('base64'),
    pngDataUrl: `data:image/png;base64,${pngBuffer.toString('base64')}`,
    metrics: {
      elapsedMs,
      sizeBytes: pngBuffer.byteLength,
      width: rendered.width,
      height: rendered.height,
    },
    request: {
      targetWidth: Math.round(targetWidth),
      background: resolvedBackground || 'transparent',
    },
  };
}
