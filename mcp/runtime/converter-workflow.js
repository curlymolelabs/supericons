import { Buffer } from 'node:buffer';
import { ColorMode, Hierarchical, PathSimplifyMode, vectorize } from '@neplex/vectorizer';
import { Resvg } from '@resvg/resvg-js';
import { sanitizeSvgExportMarkup } from './public-metadata-sanitizer.js';

const SUPPORTED_IMAGE_MIME_TYPES = new Set(['image/png']);
const MAX_CONVERTER_INPUT_BYTES = 5 * 1024 * 1024;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const TRACE_CLASS_GUIDANCE = {
  'general-color': {
    bestFor: 'full-color artwork and logos when you are unsure which color route to trust first',
    avoidFor: 'tiny mono icons where geometric crispness matters more than broad color preservation',
  },
  'flat-logo-color': {
    bestFor: 'logos with flat fills, separated regions, and no gradients',
    avoidFor: 'photographic, textured, or gradient-heavy inputs',
  },
  'tile-icon-color': {
    bestFor: 'small colored icons, badges, and tile-like UI artwork',
    avoidFor: 'large free-form logos with broad curves or heavy internal detail',
  },
  'tiny-line-icon': {
    bestFor: 'very small interface icons with fine line work',
    avoidFor: 'multi-color artwork or large logo marks',
  },
  'single-color-mark': {
    bestFor: 'single-color logos, marks, and wordmarks',
    avoidFor: 'true black-and-white masks with transparency cutouts',
  },
  'mono-mask': {
    bestFor: 'high-contrast black and white inputs, masks, and silhouette-style artwork',
    avoidFor: 'soft grayscale artwork or colorful logos',
  },
};

const QUALITY_MODE_GUIDANCE = {
  exact: 'Keeps more detail and is the safer default when quality matters more than file size.',
  compact: 'Simplifies paths and reduces file size at the cost of some detail.',
};

const COLOR_MODE_GUIDANCE = {
  color: 'Use when color regions matter and you want the output to preserve more than one tone.',
  mono: 'Use when the source should collapse to a single foreground color or mask-style output.',
};

const UI_MODE_GUIDANCE = {
  logo: 'Bias toward logo-style artwork with broader curves and free-form shapes.',
  icon: 'Bias toward icon-like geometry and smaller UI artwork.',
};

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
  const iconClasses = new Set(['tiny-line-icon', 'tile-icon-color']);
  const logoClasses = new Set(['flat-logo-color', 'general-color', 'single-color-mark', 'mono-mask']);

  if (uiMode === 'icon') {
    if (iconClasses.has(traceClass)) return traceClass;
    return requestedColorMode === 'mono' ? 'tiny-line-icon' : 'tile-icon-color';
  }

  if (logoClasses.has(traceClass)) return traceClass;
  if (requestedColorMode === 'mono') return 'single-color-mark';
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

function readPngHeader(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 33) {
    throw new Error('PNG input is too small to inspect.');
  }

  for (let index = 0; index < PNG_SIGNATURE.length; index += 1) {
    if (buffer[index] !== PNG_SIGNATURE[index]) {
      throw new Error('Input is not a valid PNG file.');
    }
  }

  const chunkType = buffer.toString('ascii', 12, 16);
  if (chunkType !== 'IHDR') {
    throw new Error('PNG header is invalid or missing IHDR.');
  }

  const colorType = buffer.readUInt8(25);
  const colorTypeMap = {
    0: { label: 'grayscale', hasAlpha: false, monochromeFriendly: true },
    2: { label: 'rgb', hasAlpha: false, monochromeFriendly: false },
    3: { label: 'indexed', hasAlpha: false, monochromeFriendly: false },
    4: { label: 'grayscale-alpha', hasAlpha: true, monochromeFriendly: true },
    6: { label: 'rgba', hasAlpha: true, monochromeFriendly: false },
  };
  const colorInfo = colorTypeMap[colorType] || {
    label: `unknown-${colorType}`,
    hasAlpha: false,
    monochromeFriendly: false,
  };

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    bitDepth: buffer.readUInt8(24),
    colorType,
    colorModel: colorInfo.label,
    hasAlpha: colorInfo.hasAlpha,
    monochromeFriendly: colorInfo.monochromeFriendly,
    compressionMethod: buffer.readUInt8(26),
    filterMethod: buffer.readUInt8(27),
    interlaceMethod: buffer.readUInt8(28),
  };
}

function buildConverterInspection(header, sizeBytes) {
  const { width, height, hasAlpha, monochromeFriendly, colorModel } = header;
  const maxDimension = Math.max(width, height);
  const minDimension = Math.min(width, height);

  const isMicro = maxDimension <= 32;
  const isSmall = maxDimension <= 64;
  const isLarge = maxDimension >= 512;
  const isSquareish = Math.abs(width - height) <= Math.max(8, Math.round(maxDimension * 0.1));

  const risks = [];
  const rationale = [];

  let colorMode = monochromeFriendly ? 'mono' : 'color';
  let qualityMode = 'exact';
  let uiMode = isSmall ? 'icon' : 'logo';
  let traceClass = 'general-color';

  if (colorMode === 'mono') {
    if (isSmall) {
      traceClass = 'tiny-line-icon';
      rationale.push('The PNG is structurally small, so the icon-biased mono trace class is the safest starting point.');
    } else if (hasAlpha) {
      traceClass = 'mono-mask';
      rationale.push('The PNG carries alpha with a monochrome-friendly color model, which fits mask-style tracing better than flat logo tracing.');
    } else {
      traceClass = 'single-color-mark';
      rationale.push('The PNG looks monochrome-friendly without transparency, which is a good fit for single-color marks and wordmarks.');
    }
  } else if (isSmall && isSquareish) {
    traceClass = 'tile-icon-color';
    uiMode = 'icon';
    rationale.push('The PNG is small and icon-like, so a tile/icon color route is a safer first pass than a broad logo route.');
  } else {
    traceClass = 'general-color';
    rationale.push('The PNG uses a color model that benefits from the most forgiving full-color starting route.');
  }

  if (isMicro) {
    risks.push('Very small PNG inputs can lose detail quickly during tracing. Expect to compare one or two settings before committing.');
  }
  if (isLarge) {
    risks.push('Large raster inputs often trace into heavier SVG output. Expect larger path counts and a bigger file size.');
  }
  if (!monochromeFriendly) {
    risks.push('Color-rich PNGs are more sensitive to traceClass choice. Start with the recommended settings, then compare if the result feels too noisy or too simplified.');
  }
  if (colorModel === 'indexed') {
    risks.push('Indexed-color PNGs can behave unpredictably when palette boundaries are rough or anti-aliased.');
  }
  if (hasAlpha && !monochromeFriendly) {
    risks.push('Soft transparency edges can produce extra small shapes in the traced SVG.');
  }
  if (!risks.length) {
    risks.push('No structural red flags were detected from the PNG header alone, but this inspection does not see semantic content inside the artwork.');
  }

  return {
    confidence: 'medium',
    scale: isMicro ? 'micro' : isSmall ? 'small' : isLarge ? 'large' : 'medium',
    likelyFit: monochromeFriendly
      ? (isSmall ? 'small mono icon' : 'single-color logo or mark')
      : (isSmall ? 'small colored icon' : 'logo or illustration'),
    structuralNotes: [
      `Header inspection sees a ${width}x${height} PNG using ${colorModel}${hasAlpha ? ' with alpha' : ''}.`,
      'This preflight reads file structure, not semantic image content, so recommendations are strong starting points rather than perfect classifications.',
    ],
    risks,
    recommendedSettings: {
      colorMode,
      qualityMode,
      traceClass,
      uiMode,
    },
    rationale,
  };
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
      guidance: {
        whenToUse: 'Use SVG-to-PNG when you already trust the SVG source and only need raster output at a target width.',
        defaults: {
          targetWidth: '512 is a safe general-purpose default for previews and product documentation.',
          background: 'Keep `transparent` unless the PNG needs to sit on a forced background color.',
        },
      },
    },
    pngToSvg: {
      qualityModes: ['exact', 'compact'],
      colorModes: ['color', 'mono'],
      traceClasses: ['general-color', 'flat-logo-color', 'tile-icon-color', 'tiny-line-icon', 'single-color-mark', 'mono-mask'],
      uiModes: ['logo', 'icon'],
      outputs: ['svg-text'],
      guidance: {
        qualityModes: QUALITY_MODE_GUIDANCE,
        colorModes: COLOR_MODE_GUIDANCE,
        uiModes: UI_MODE_GUIDANCE,
        traceClasses: TRACE_CLASS_GUIDANCE,
      },
      starterCombinations: [
        {
          label: 'Safe full-color default',
          when: 'You have a logo or illustration and do not yet trust a narrower trace class.',
          settings: { colorMode: 'color', qualityMode: 'exact', traceClass: 'general-color', uiMode: 'logo' },
        },
        {
          label: 'Flat logo pass',
          when: 'The PNG is a clean logo with solid fills and no gradients.',
          settings: { colorMode: 'color', qualityMode: 'exact', traceClass: 'flat-logo-color', uiMode: 'logo' },
        },
        {
          label: 'Tiny interface icon',
          when: 'The PNG is a very small UI icon where crisp geometry matters more than color complexity.',
          settings: { colorMode: 'mono', qualityMode: 'exact', traceClass: 'tiny-line-icon', uiMode: 'icon' },
        },
        {
          label: 'Single-color wordmark or brand mark',
          when: 'The PNG is a logo, wordmark, or mark that uses a single foreground color.',
          settings: { colorMode: 'mono', qualityMode: 'exact', traceClass: 'single-color-mark', uiMode: 'logo' },
        },
        {
          label: 'Small colored icon or badge',
          when: 'The PNG is a compact color icon, badge, or tile-style UI asset.',
          settings: { colorMode: 'color', qualityMode: 'exact', traceClass: 'tile-icon-color', uiMode: 'icon' },
        },
        {
          label: 'High-contrast mask or silhouette',
          when: 'The PNG is a black-and-white silhouette, stencil, or alpha-cutout mask.',
          settings: { colorMode: 'mono', qualityMode: 'exact', traceClass: 'mono-mask', uiMode: 'logo' },
        },
      ],
    },
    workflow: {
      recommendedOrder: [
        'inspect_converter_input',
        'inspect_converter_options',
        'convert_png_to_svg or convert_svg_to_png',
      ],
      note: 'Inspect the input first when tracing PNG to SVG so the agent can justify its starting settings before converting.',
    },
  };
}

export function inspectConverterInput({ imageBase64, mimeType }) {
  const { mimeType: parsedMimeType, buffer } = parseBase64Payload(imageBase64);
  validateInputBuffer(buffer, 'PNG input');
  const effectiveMimeType = (mimeType || parsedMimeType || 'image/png').toLowerCase();

  if (!SUPPORTED_IMAGE_MIME_TYPES.has(effectiveMimeType)) {
    throw new Error(`Unsupported image type "${effectiveMimeType}". Converter MCP currently accepts PNG only.`);
  }

  const header = readPngHeader(buffer);
  const assessment = buildConverterInspection(header, buffer.length);

  return {
    format: 'png',
    input: {
      mimeType: effectiveMimeType,
      sizeBytes: buffer.length,
      width: header.width,
      height: header.height,
      bitDepth: header.bitDepth,
      colorType: header.colorType,
      colorModel: header.colorModel,
      hasAlpha: header.hasAlpha,
      interlaced: header.interlaceMethod === 1,
    },
    assessment,
    nextStep: {
      recommendedTool: 'convert_png_to_svg',
      recommendedSettings: assessment.recommendedSettings,
    },
  };
}

export async function convertPngToSvg({ imageBase64, mimeType, qualityMode = 'exact', colorMode, requestedColorMode, traceClass = 'general-color', uiMode = 'logo' }) {
  const { mimeType: parsedMimeType, buffer } = parseBase64Payload(imageBase64);
  validateInputBuffer(buffer, 'PNG input');
  const effectiveMimeType = (mimeType || parsedMimeType || 'image/png').toLowerCase();

  if (!SUPPORTED_IMAGE_MIME_TYPES.has(effectiveMimeType)) {
    throw new Error(`Unsupported image type "${effectiveMimeType}". Converter MCP currently accepts PNG only.`);
  }

  const effectiveColorMode = colorMode || requestedColorMode || 'color';
  const { resolvedMode, resolvedTraceClass, config } = getTraceConfig(qualityMode, effectiveColorMode, traceClass, uiMode);
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
      colorMode: effectiveColorMode,
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
