import {
  MOTION_LAB_PRESETS,
  MOTION_LAB_PRESET_IDS,
  getMotionLabPresetMeta,
} from './motion-lab-presets.js';

const MOTION_LAB_BRAND_COMMENT = '/* Supericons Motion Lab */';
const MOTION_LAB_STANDALONE_CLASS = 'si-animated-icon';
const MOTION_LAB_SUPPORTED_TRIGGERS = Object.freeze(['loop', 'hover', 'click']);

function formatNumber(value, digits = 3) {
  return parseFloat(Number(value).toFixed(digits)).toString();
}

function scaleKeyframesByIntensity(keyframes, intensityPercent = 100) {
  const factor = intensityPercent / 100;
  if (factor === 1) return keyframes.map((kf) => ({ offset: kf.offset, props: { ...kf.props } }));

  return keyframes.map((kf) => {
    const props = {};
    for (const [prop, value] of Object.entries(kf.props)) {
      if (prop === 'transform') {
        props[prop] = value
          .replace(/(translateX|translateY|rotate)\((-?[\d.]+)(px|deg)\)/g, (match, fn, num, unit) => {
            const numeric = Number.parseFloat(num);
            if (numeric === 0) return match;
            return `${fn}(${formatNumber(numeric * factor, 2)}${unit})`;
          })
          .replace(/translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/g, (match, x, y) => {
            const nextX = formatNumber(Number.parseFloat(x) * factor, 2);
            const nextY = formatNumber(Number.parseFloat(y) * factor, 2);
            return `translate(${nextX}px, ${nextY}px)`;
          })
          .replace(/scale\(([\d.]+)\)/g, (match, num) => {
            const scale = Number.parseFloat(num);
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
        props[prop] = value.replace(/(-?[\d.]+)px/g, (match, num) => `${formatNumber(Math.max(0, Number.parseFloat(num) * factor), 2)}px`);
      } else {
        props[prop] = value;
      }
    }
    return { offset: kf.offset, props };
  });
}

function getPresetOrThrow(presetId) {
  const preset = MOTION_LAB_PRESETS[presetId];
  if (!preset) {
    const supported = MOTION_LAB_PRESET_IDS.join(', ');
    throw new Error(`Unsupported preset "${presetId}". Supported presets: ${supported}.`);
  }
  return preset;
}

function buildKeyframesCss(name, keyframes) {
  let css = `@keyframes ${name} {\n`;
  keyframes.forEach((kf) => {
    css += `  ${Math.round(kf.offset * 100)}% {\n`;
    Object.entries(kf.props).forEach(([prop, value]) => {
      css += `    ${prop}: ${value};\n`;
    });
    css += '  }\n';
  });
  css += '}\n';
  return css;
}

function getAnimationRule(selector, name, trigger, durationMs, easing) {
  const iterations = trigger === 'click' ? '3' : 'infinite';
  if (trigger === 'hover') {
    return `${selector}:hover {\n  animation: ${name} ${durationMs}ms ${easing} ${iterations};\n}\n`;
  }
  if (trigger === 'click') {
    return `${selector}:active,\n${selector}.active {\n  animation: ${name} ${durationMs}ms ${easing} ${iterations};\n}\n`;
  }
  return `${selector} {\n  animation: ${name} ${durationMs}ms ${easing} ${iterations};\n}\n`;
}

function mergeSvgClass(svg, nextClass) {
  return svg.replace(/<svg\b([^>]*)>/i, (match, attrs) => {
    if (/class\s*=\s*"/i.test(attrs)) {
      return `<svg${attrs.replace(/class\s*=\s*"([^"]*)"/i, (full, current) => ` class="${`${current} ${nextClass}`.trim()}"`)}>`;
    }
    return `<svg${attrs} class="${nextClass}">`;
  });
}

function mergeSvgInlineStyle(svg, styleFragment) {
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

function injectSvgStyle(svg, css) {
  return svg.replace(/<svg\b([^>]*)>/i, `<svg$1><style>${css}</style>`);
}

function buildMotionCss({ selector, presetId, trigger = 'loop', durationMs = 500, intensityPercent = 100 }) {
  const preset = getPresetOrThrow(presetId);
  const meta = getMotionLabPresetMeta(presetId);
  const scaledKeyframes = scaleKeyframesByIntensity(preset.keyframes, intensityPercent);
  const animationName = `ml-${presetId}`;
  let css = `${MOTION_LAB_BRAND_COMMENT}\n`;
  css += `/* Preset: ${meta?.label || presetId} | Trigger: ${trigger} | Duration: ${durationMs}ms | Intensity: ${intensityPercent}% */\n`;
  css += `${buildKeyframesCss(animationName, scaledKeyframes)}\n`;
  css += getAnimationRule(selector, animationName, trigger, durationMs, preset.easing);
  return css.trim();
}

export function listMotionLabPresets() {
  return MOTION_LAB_PRESET_IDS.map((presetId) => {
    const meta = getMotionLabPresetMeta(presetId);
    const supportedTriggers = [...MOTION_LAB_SUPPORTED_TRIGGERS];
    const intensityRange = { min: 25, max: 200, default: 100 };
    const exportCompatibility = {
      css: true,
      animatedSvg: true,
      animated_svg: true,
      notes: [],
    };
    return {
      id: presetId,
      preset: presetId,
      label: meta?.label || presetId,
      group: meta?.group || 'Motion',
      category: meta?.group || 'Motion',
      description: meta?.description || `${presetId} Motion Lab preset.`,
      supportedTriggers,
      supported_triggers: supportedTriggers,
      defaultDurationMs: 500,
      default_duration_ms: 500,
      intensityRange,
      intensity_range_percent: intensityRange,
      exportCompatibility,
      export_compatibility: exportCompatibility,
    };
  });
}

export function buildMotionLabRecipe({ presetId, trigger = 'loop', durationMs = 500, intensityPercent = 100 }) {
  getPresetOrThrow(presetId);
  const meta = getMotionLabPresetMeta(presetId);
  const exportCompatibility = {
    css: true,
    animatedSvg: true,
    animated_svg: true,
    notes: [],
  };
  const triggerGuide = {
    loop: 'plays continuously as soon as the icon is rendered',
    hover: 'plays while the user hovers the icon',
    click: 'plays when the icon is pressed or when an `.active` class is applied',
  };
  return {
    presetId,
    preset_id: presetId,
    preset: meta?.label || presetId,
    group: meta?.group || 'Motion',
    category: meta?.group || 'Motion',
    description: meta?.description || `${presetId} Motion Lab preset.`,
    trigger,
    durationMs,
    duration_ms: durationMs,
    intensityPercent,
    intensity_percent: intensityPercent,
    exportCompatibility,
    export_compatibility: exportCompatibility,
    behavior: triggerGuide[trigger] || triggerGuide.loop,
    notes: [
      'Motion Lab MCP animates the icon root as a whole unit.',
      'Use the standalone SVG output when you want one self-contained asset.',
      'Use the CSS export when you want to keep SVG markup and animation CSS separate.',
    ],
  };
}

export function buildMotionLabExternalCss({ presetId, trigger = 'loop', durationMs = 500, intensityPercent = 100 }) {
  const selector = '#icon-container svg';
  return [
    buildMotionCss({ selector, presetId, trigger, durationMs, intensityPercent }),
    '#icon-container svg {',
    '  overflow: visible;',
    '  transform-box: fill-box;',
    '  transform-origin: center;',
    '}',
    '#icon-container svg * {',
    '  transform-box: fill-box;',
    '  transform-origin: center;',
    '}',
  ].join('\n').trim();
}

export function buildMotionLabAnimatedSvg({
  svg,
  presetId,
  trigger = 'loop',
  durationMs = 500,
  intensityPercent = 100,
  color = null,
}) {
  if (typeof svg !== 'string' || !svg.trim()) {
    throw new Error('Animated SVG export requires a non-empty SVG string.');
  }

  let nextSvg = mergeSvgClass(svg.trim(), MOTION_LAB_STANDALONE_CLASS);
  if (color) {
    nextSvg = mergeSvgInlineStyle(nextSvg, `color:${color};`);
  }

  const selector = `svg.${MOTION_LAB_STANDALONE_CLASS}`;
  const css = [
    buildMotionCss({ selector, presetId, trigger, durationMs, intensityPercent }),
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

  return injectSvgStyle(nextSvg, css);
}

export function buildMotionLabBundle({ svg, presetId, trigger = 'loop', durationMs = 500, intensityPercent = 100, color = null }) {
  return {
    preset: buildMotionLabRecipe({ presetId, trigger, durationMs, intensityPercent }),
    css: buildMotionLabExternalCss({ presetId, trigger, durationMs, intensityPercent }),
    animatedSvg: buildMotionLabAnimatedSvg({ svg, presetId, trigger, durationMs, intensityPercent, color }),
  };
}
