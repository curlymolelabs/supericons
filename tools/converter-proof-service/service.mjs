import { Buffer } from 'node:buffer';
import { ColorMode, Hierarchical, PathSimplifyMode, vectorize } from '@neplex/vectorizer';

const SUPPORTED_MIME_TYPES = new Set(['image/png']);

function parseBase64Payload(input = '') {
  if (typeof input !== 'string' || !input.trim()) {
    throw new Error('`imageBase64` must be a non-empty base64 string or data URL.');
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

function getModeConfig(qualityMode = 'exact', requestedColorMode = 'color', traceClass = 'general-color', uiMode = 'logo') {
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
  const baseConfig = traceConfig[mode] || traceConfig.exact;

  return {
    resolvedMode: mode,
    resolvedTraceClass,
    config: baseConfig,
  };
}

function extractViewBox(svg = '') {
  const match = svg.match(/viewBox="([^"]+)"/i);
  return match ? match[1] : null;
}

function countMatches(svg = '', pattern) {
  const matches = svg.match(pattern);
  return matches ? matches.length : 0;
}

function buildMetrics(svg) {
  const sizeBytes = Buffer.byteLength(svg, 'utf8');
  const pathCount = countMatches(svg, /<path\b/gi);
  const shapeCount = countMatches(svg, /<(path|rect|circle|ellipse|polygon|polyline|line)\b/gi);

  return {
    sizeBytes,
    sizeKb: Math.round(sizeBytes / 1024),
    pathCount,
    shapeCount,
    viewBox: extractViewBox(svg),
  };
}

export async function convertPngToSvgProof(payload = {}) {
  const {
    imageBase64,
    mimeType,
    qualityMode = 'exact',
    requestedColorMode = 'color',
    traceClass = 'general-color',
    uiMode = 'logo',
  } = payload;
  const { mimeType: parsedMimeType, buffer } = parseBase64Payload(imageBase64);
  const effectiveMimeType = (mimeType || parsedMimeType || 'image/png').toLowerCase();

  if (!SUPPORTED_MIME_TYPES.has(effectiveMimeType)) {
    throw new Error(`Unsupported mime type: ${effectiveMimeType}. This proof service currently accepts PNG only.`);
  }

  const { resolvedMode, resolvedTraceClass, config } = getModeConfig(
    qualityMode,
    requestedColorMode,
    traceClass,
    uiMode,
  );
  const startedAt = Date.now();
  const svg = await vectorize(buffer, config);
  const elapsedMs = Date.now() - startedAt;

  return {
    svg,
    engine: {
      name: '@neplex/vectorizer',
      family: 'VTracer',
      runtime: 'node-native',
      requestedMode: qualityMode,
      resolvedMode,
      uiMode,
      traceClass: resolvedTraceClass,
      colorMode: requestedColorMode === 'mono' ? 'binary' : 'color',
    },
    metrics: {
      ...buildMetrics(svg),
      elapsedMs,
    },
    warnings: qualityMode === 'auto'
      ? ['`auto` is not modeled in this proof service yet; it currently resolves to `exact` for fidelity-first evaluation.']
      : [],
  };
}
