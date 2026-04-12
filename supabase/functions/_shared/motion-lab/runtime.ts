import {
  MOTION_LAB_HOSTED_PRESET_IDS,
  MOTION_LAB_HOSTED_PRESET_METADATA,
  MOTION_LAB_HOSTED_PRESETS,
  MOTION_LAB_HOSTED_VERSION,
  MOTION_LAB_SUPPORTED_TRIGGERS,
} from './generated.ts';
import { MotionLabHttpError } from './errors.ts';

const TRIGGER_BEHAVIOR: Record<string, string> = {
  loop: 'plays continuously as soon as the icon is rendered',
  hover: 'plays while the user hovers the icon',
  click: 'plays when the icon is pressed or when an `.active` class is applied',
};

const RECIPE_NOTES = [
  'Motion Lab MCP animates the icon root as a whole unit.',
  'Use the standalone SVG output when you want one self-contained asset.',
  'Use the CSS export when you want to keep SVG markup and animation CSS separate.',
];

export const MOTION_LAB_SELECTOR_TOKEN = '{{ICON_SELECTOR}}';

function formatNumber(value: number, digits = 3) {
  return parseFloat(Number(value).toFixed(digits)).toString();
}

function ensureRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new MotionLabHttpError('Motion Lab request body must be a JSON object.', {
      status: 422,
      code: 'motion_lab_invalid_request',
      hint: 'Send a JSON object with the required Motion Lab fields.',
      retryable: false,
    });
  }
  return value as Record<string, unknown>;
}

function parseOptionalString(value: unknown, fieldName: string) {
  if (value == null) return null;
  if (typeof value !== 'string') {
    throw new MotionLabHttpError(`Motion Lab field "${fieldName}" must be a string.`, {
      status: 422,
      code: 'motion_lab_invalid_request',
      hint: `Send "${fieldName}" as a string.`,
      retryable: false,
    });
  }
  const trimmed = value.trim();
  return trimmed || null;
}

function parseBoundedNumber(value: unknown, fieldName: string, defaultValue: number, min: number, max: number) {
  const candidate = value == null ? defaultValue : Number(value);
  if (!Number.isFinite(candidate) || candidate < min || candidate > max) {
    throw new MotionLabHttpError(`Motion Lab field "${fieldName}" must be between ${min} and ${max}.`, {
      status: 422,
      code: 'motion_lab_invalid_request',
      hint: `Send "${fieldName}" as a number between ${min} and ${max}.`,
      retryable: false,
    });
  }
  return Math.round(candidate);
}

function parseTrigger(value: unknown) {
  const trigger = typeof value === 'string' && value.trim() ? value.trim() : 'loop';
  if (!MOTION_LAB_SUPPORTED_TRIGGERS.includes(trigger)) {
    throw new MotionLabHttpError(`Unsupported Motion Lab trigger "${trigger}".`, {
      status: 422,
      code: 'motion_lab_unsupported_trigger',
      hint: `Use one of: ${MOTION_LAB_SUPPORTED_TRIGGERS.join(', ')}.`,
      retryable: false,
    });
  }
  return trigger;
}

function getHostedPresetOrThrow(presetId: string) {
  const preset = MOTION_LAB_HOSTED_PRESETS[presetId];
  if (!preset) {
    throw new MotionLabHttpError(`Unsupported Motion Lab preset "${presetId}".`, {
      status: 422,
      code: 'motion_lab_unsupported_preset',
      hint: `Use one of: ${MOTION_LAB_HOSTED_PRESET_IDS.join(', ')}.`,
      retryable: false,
    });
  }
  return preset;
}

function getHostedMetadataOrThrow(presetId: string) {
  const metadata = MOTION_LAB_HOSTED_PRESET_METADATA[presetId];
  if (!metadata) {
    throw new MotionLabHttpError(`Motion Lab metadata is unavailable for "${presetId}".`, {
      status: 503,
      code: 'motion_lab_service_unavailable',
      hint: 'Retry when the Motion Lab service is available.',
      retryable: true,
    });
  }
  return metadata;
}

function cloneExportCompatibility(value: any) {
  return {
    css: Boolean(value?.css),
    animated_svg: Boolean(value?.animated_svg),
    notes: [...(value?.notes || [])],
  };
}

function summarizeRecipe(recipe: ReturnType<typeof buildHostedMotionLabRecipe>) {
  return {
    preset_id: recipe.preset_id,
    preset: recipe.preset,
    group: recipe.group,
  };
}

function scaleKeyframesByIntensity(keyframes: Array<{ offset: number; props: Record<string, string> }>, intensityPercent = 100) {
  const factor = intensityPercent / 100;
  if (factor === 1) {
    return keyframes.map((frame) => ({ offset: frame.offset, props: { ...frame.props } }));
  }

  return keyframes.map((frame) => {
    const props: Record<string, string> = {};
    for (const [prop, value] of Object.entries(frame.props)) {
      if (prop === 'transform') {
        props[prop] = value
          .replace(/(translateX|translateY|rotate)\((-?[\d.]+)(px|deg)\)/g, (match, fn, rawNumber, unit) => {
            const numeric = Number.parseFloat(rawNumber);
            if (numeric === 0) return match;
            return `${fn}(${formatNumber(numeric * factor, 2)}${unit})`;
          })
          .replace(/translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/g, (match, rawX, rawY) => {
            const nextX = formatNumber(Number.parseFloat(rawX) * factor, 2);
            const nextY = formatNumber(Number.parseFloat(rawY) * factor, 2);
            return `translate(${nextX}px, ${nextY}px)`;
          })
          .replace(/scale\(([\d.]+)\)/g, (match, rawNumber) => {
            const scale = Number.parseFloat(rawNumber);
            if (scale === 1) return match;
            return `scale(${formatNumber(1 + ((scale - 1) * factor))})`;
          });
      } else if (prop === 'opacity') {
        const opacity = Number.parseFloat(value);
        props[prop] = opacity === 0 ? formatNumber(Math.max(0, 1 - factor), 2) : value;
      } else if (prop === 'stroke-dashoffset') {
        const dashOffset = Number.parseFloat(value);
        props[prop] = dashOffset === 0 ? '0' : String(Math.round(dashOffset * factor));
      } else if (prop === 'filter') {
        props[prop] = value.replace(/(-?[\d.]+)px/g, (match, rawNumber) => (
          `${formatNumber(Math.max(0, Number.parseFloat(rawNumber) * factor), 2)}px`
        ));
      } else {
        props[prop] = value;
      }
    }
    return { offset: frame.offset, props };
  });
}

function buildKeyframesCss(name: string, keyframes: Array<{ offset: number; props: Record<string, string> }>) {
  let css = `@keyframes ${name} {\n`;
  for (const frame of keyframes) {
    css += `  ${Math.round(frame.offset * 100)}% {\n`;
    for (const [prop, value] of Object.entries(frame.props)) {
      css += `    ${prop}: ${value};\n`;
    }
    css += '  }\n';
  }
  css += '}\n';
  return css;
}

function getAnimationRule(selector: string, name: string, trigger: string, durationMs: number, easing: string) {
  const iterations = trigger === 'click' ? '3' : 'infinite';
  if (trigger === 'hover') {
    return `${selector}:hover {\n  animation: ${name} ${durationMs}ms ${easing} ${iterations};\n}\n`;
  }
  if (trigger === 'click') {
    return `${selector}:active,\n${selector}.active {\n  animation: ${name} ${durationMs}ms ${easing} ${iterations};\n}\n`;
  }
  return `${selector} {\n  animation: ${name} ${durationMs}ms ${easing} ${iterations};\n}\n`;
}

function buildMotionCss(selector: string, presetId: string, trigger: string, durationMs: number, intensityPercent: number) {
  const preset = getHostedPresetOrThrow(presetId);
  const metadata = getHostedMetadataOrThrow(presetId);
  const animationName = `ml-${presetId}`;
  const scaledKeyframes = scaleKeyframesByIntensity(preset.keyframes, intensityPercent);

  let css = '/* Supericons Motion Lab */\n';
  css += `/* Preset: ${metadata.label} | Trigger: ${trigger} | Duration: ${durationMs}ms | Intensity: ${intensityPercent}% */\n`;
  css += `${buildKeyframesCss(animationName, scaledKeyframes)}\n`;
  css += getAnimationRule(selector, animationName, trigger, durationMs, preset.easing);
  return css.trim();
}

function mergeSvgClass(svg: string, nextClass: string) {
  return svg.replace(/<svg\b([^>]*)>/i, (match, attrs) => {
    if (/class\s*=\s*"/i.test(attrs)) {
      return `<svg${attrs.replace(/class\s*=\s*"([^"]*)"/i, (full, current) => ` class="${`${current} ${nextClass}`.trim()}"`)}>`;
    }
    return `<svg${attrs} class="${nextClass}">`;
  });
}

function mergeSvgInlineStyle(svg: string, styleFragment: string) {
  return svg.replace(/<svg\b([^>]*)>/i, (match, attrs) => {
    if (/style\s*=\s*"/i.test(attrs)) {
      return `<svg${attrs.replace(/style\s*=\s*"([^"]*)"/i, (full, current) => {
        const currentValue = current.trim();
        const merged = currentValue ? `${currentValue}${currentValue.endsWith(';') ? '' : ';'} ${styleFragment}` : styleFragment;
        return ` style="${merged}"`;
      })}>`;
    }
    return `<svg${attrs} style="${styleFragment}">`;
  });
}

function injectSvgStyle(svg: string, css: string) {
  return svg.replace(/<svg\b([^>]*)>/i, `<svg$1><style>${css}</style>`);
}

export function parseHostedRecipeRequest(body: unknown) {
  const record = ensureRecord(body);
  const preset = parseOptionalString(record.preset, 'preset');
  if (!preset) {
    throw new MotionLabHttpError('Motion Lab field "preset" is required.', {
      status: 422,
      code: 'motion_lab_invalid_request',
      hint: 'Send a preset id such as "sweep" or "pulse".',
      retryable: false,
    });
  }

  return {
    preset,
    trigger: parseTrigger(record.trigger),
    duration_ms: parseBoundedNumber(record.duration_ms, 'duration_ms', 500, 100, 4000),
    intensity_percent: parseBoundedNumber(record.intensity_percent, 'intensity_percent', 100, 25, 200),
  };
}

export function parseHostedCssRequest(body: unknown) {
  const base = parseHostedRecipeRequest(body);
  const record = ensureRecord(body);
  return {
    ...base,
    selector: parseOptionalString(record.selector, 'selector'),
  };
}

export function parseHostedAnimatedSvgRequest(body: unknown) {
  const base = parseHostedRecipeRequest(body);
  const record = ensureRecord(body);
  const svg = parseOptionalString(record.svg, 'svg');
  if (!svg) {
    throw new MotionLabHttpError('Motion Lab animated SVG render requires a non-empty "svg" string.', {
      status: 422,
      code: 'motion_lab_invalid_request',
      hint: 'Send inline SVG markup in the "svg" field.',
      retryable: false,
    });
  }

  return {
    ...base,
    svg,
    color: parseOptionalString(record.color, 'color'),
  };
}

export function buildHostedMotionLabRecipe(request: ReturnType<typeof parseHostedRecipeRequest>) {
  getHostedPresetOrThrow(request.preset);
  const metadata = getHostedMetadataOrThrow(request.preset);
  return {
    preset_id: request.preset,
    preset: metadata.label,
    group: metadata.group,
    description: metadata.description,
    trigger: request.trigger,
    duration_ms: request.duration_ms,
    intensity_percent: request.intensity_percent,
    default_duration_ms: metadata.default_duration_ms,
    duration_range_ms: { ...metadata.duration_range_ms },
    default_intensity_percent: metadata.default_intensity_percent,
    intensity_range_percent: { ...metadata.intensity_range_percent },
    export_compatibility: cloneExportCompatibility(metadata.export_compatibility),
    technical_output_notes: [...metadata.technical_output_notes],
    visual_character: metadata.visual_character,
    emotional_tone: [...metadata.emotional_tone],
    recommended_contexts: [...metadata.recommended_contexts],
    avoid_for: [...metadata.avoid_for],
    behavior: TRIGGER_BEHAVIOR[request.trigger] || TRIGGER_BEHAVIOR.loop,
    notes: [...RECIPE_NOTES],
  };
}

export function buildHostedRecipeResponse(request: ReturnType<typeof parseHostedRecipeRequest>) {
  return {
    recipe: buildHostedMotionLabRecipe(request),
    source: {
      kind: 'hosted-motion-lab',
      version: MOTION_LAB_HOSTED_VERSION,
    },
  };
}

export function buildHostedCssRenderResponse(request: ReturnType<typeof parseHostedCssRequest>) {
  const selector = request.selector || MOTION_LAB_SELECTOR_TOKEN;
  const css = [
    buildMotionCss(selector, request.preset, request.trigger, request.duration_ms, request.intensity_percent),
    `${selector} {`,
    '  overflow: visible;',
    '  transform-box: fill-box;',
    '  transform-origin: center;',
    '}',
    `${selector} * {`,
    '  transform-box: fill-box;',
    '  transform-origin: center;',
    '}',
  ].join('\n').trim();
  const recipe = buildHostedMotionLabRecipe(request);

  return {
    recipe: summarizeRecipe(recipe),
    css,
    selector_mode: request.selector ? 'literal' : 'placeholder',
    ...(request.selector ? {} : { selector_token: MOTION_LAB_SELECTOR_TOKEN }),
  };
}

export function buildHostedAnimatedSvgResponse(request: ReturnType<typeof parseHostedAnimatedSvgRequest>) {
  const recipe = buildHostedMotionLabRecipe(request);
  let svg = mergeSvgClass(request.svg.trim(), 'si-animated-icon');
  if (request.color) {
    svg = mergeSvgInlineStyle(svg, `color:${request.color};`);
  }

  const selector = 'svg.si-animated-icon';
  const css = [
    buildMotionCss(selector, request.preset, request.trigger, request.duration_ms, request.intensity_percent),
    `${selector} {`,
    '  overflow: visible;',
    '  transform-box: fill-box;',
    '  transform-origin: center;',
    '}',
    `${selector} * {`,
    '  transform-box: fill-box;',
    '  transform-origin: center;',
    '}',
  ].join('\n').trim();

  return {
    recipe: summarizeRecipe(recipe),
    animated_svg: injectSvgStyle(svg, css),
    applied_color: request.color || null,
  };
}
