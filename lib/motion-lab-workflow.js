const MOTION_LAB_BRAND_COMMENT = '/* Supericons Motion Lab */';
const MOTION_LAB_STANDALONE_CLASS = 'si-animated-icon';

export const MOTION_LAB_PRESETS = {
  pulse: {
    label: 'Pulse',
    category: 'Attention',
    description: 'Scales gently in and out for soft emphasis.',
    easing: 'ease-in-out',
    keyframes: [
      { offset: 0, props: { transform: 'scale(1)', opacity: '1' } },
      { offset: 0.5, props: { transform: 'scale(1.15)', opacity: '1' } },
      { offset: 1, props: { transform: 'scale(1)', opacity: '1' } },
    ],
  },
  bounce: {
    label: 'Bounce',
    category: 'Attention',
    description: 'Lifts the icon with a quick rebound.',
    easing: 'ease-out',
    keyframes: [
      { offset: 0, props: { transform: 'translateY(0px)' } },
      { offset: 0.4, props: { transform: 'translateY(-6px)' } },
      { offset: 0.65, props: { transform: 'translateY(-2px)' } },
      { offset: 0.8, props: { transform: 'translateY(-4px)' } },
      { offset: 1, props: { transform: 'translateY(0px)' } },
    ],
  },
  spin: {
    label: 'Spin',
    category: 'Rotation',
    description: 'Rotates the full icon around its center.',
    easing: 'linear',
    keyframes: [
      { offset: 0, props: { transform: 'rotate(0deg)' } },
      { offset: 1, props: { transform: 'rotate(360deg)' } },
    ],
  },
  shake: {
    label: 'Shake',
    category: 'Attention',
    description: 'Adds a quick side-to-side alert motion.',
    easing: 'ease-out',
    keyframes: [
      { offset: 0, props: { transform: 'translateX(0px)' } },
      { offset: 0.15, props: { transform: 'translateX(-3px)' } },
      { offset: 0.3, props: { transform: 'translateX(3px)' } },
      { offset: 0.45, props: { transform: 'translateX(-3px)' } },
      { offset: 0.6, props: { transform: 'translateX(3px)' } },
      { offset: 0.75, props: { transform: 'translateX(-2px)' } },
      { offset: 1, props: { transform: 'translateX(0px)' } },
    ],
  },
  float: {
    label: 'Float',
    category: 'Ambient',
    description: 'Gives the icon a subtle hovering drift.',
    easing: 'ease-in-out',
    keyframes: [
      { offset: 0, props: { transform: 'translateY(0px)' } },
      { offset: 0.5, props: { transform: 'translateY(-4px)' } },
      { offset: 1, props: { transform: 'translateY(0px)' } },
    ],
  },
  pop: {
    label: 'Pop',
    category: 'Attention',
    description: 'Snaps up with a springy overshoot.',
    easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    keyframes: [
      { offset: 0, props: { transform: 'scale(0.85)' } },
      { offset: 0.55, props: { transform: 'scale(1.1)' } },
      { offset: 0.75, props: { transform: 'scale(0.97)' } },
      { offset: 1, props: { transform: 'scale(1)' } },
    ],
  },
  magneticIn: {
    label: 'Magnetic In',
    category: 'Entrance',
    description: 'Pulls the icon inward with a magnetic snap.',
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    keyframes: [
      { offset: 0, props: { transform: 'translateX(-28px) scale(0.84) rotate(-8deg)', opacity: '0' } },
      { offset: 0.58, props: { transform: 'translateX(5px) scale(1.06) rotate(2deg)', opacity: '1' } },
      { offset: 0.82, props: { transform: 'translateX(-1px) scale(0.985) rotate(-0.5deg)', opacity: '1' } },
      { offset: 1, props: { transform: 'translateX(0px) scale(1) rotate(0deg)', opacity: '1' } },
    ],
  },
  sparkle: {
    label: 'Sparkle',
    category: 'Effects',
    description: 'Adds a glow burst that peaks mid-cycle.',
    easing: 'ease-in-out',
    keyframes: [
      { offset: 0, props: { filter: 'drop-shadow(0 0 0px transparent)', opacity: '1' } },
      { offset: 0.5, props: { filter: 'drop-shadow(0 0 6px rgba(255,215,0,0.8))', opacity: '0.85' } },
      { offset: 1, props: { filter: 'drop-shadow(0 0 0px transparent)', opacity: '1' } },
    ],
  },
  trace: {
    label: 'Trace',
    category: 'Reveal',
    description: 'Reveals the icon with a directional trace.',
    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    keyframes: [
      { offset: 0, props: { 'clip-path': 'inset(0 100% 0 0)', opacity: '0.35', filter: 'drop-shadow(0 0 0px transparent)' } },
      { offset: 0.55, props: { 'clip-path': 'inset(0 0% 0 0)', opacity: '1', filter: 'drop-shadow(0 0 6px rgba(255,107,53,0.35))' } },
      { offset: 1, props: { 'clip-path': 'inset(0 0% 0 0)', opacity: '1', filter: 'drop-shadow(0 0 0px transparent)' } },
    ],
  },
  sweep: {
    label: 'Sweep',
    category: 'Reveal',
    description: 'Sweeps across the icon with a lit edge.',
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    keyframes: [
      { offset: 0, props: { 'clip-path': 'inset(0 100% 0 0)', transform: 'translateX(-8px)', opacity: '0.25', filter: 'drop-shadow(0 0 0px transparent)' } },
      { offset: 0.4, props: { 'clip-path': 'inset(0 0% 0 0)', transform: 'translateX(0px)', opacity: '1', filter: 'drop-shadow(0 0 8px rgba(255,107,53,0.28))' } },
      { offset: 0.7, props: { 'clip-path': 'inset(0 0% 0 0)', transform: 'translateX(6px)', opacity: '0.8', filter: 'drop-shadow(0 0 4px rgba(255,107,53,0.18))' } },
      { offset: 1, props: { 'clip-path': 'inset(0 0% 0 0)', transform: 'translateX(0px)', opacity: '1', filter: 'drop-shadow(0 0 0px transparent)' } },
    ],
  },
  typing: {
    label: 'Typing',
    category: 'Reveal',
    description: 'Stages the icon in with stepped reveal timing.',
    easing: 'steps(5, end)',
    keyframes: [
      { offset: 0, props: { 'clip-path': 'inset(0 100% 0 0)', opacity: '0.2' } },
      { offset: 0.55, props: { 'clip-path': 'inset(0 28% 0 0)', opacity: '1' } },
      { offset: 0.7, props: { 'clip-path': 'inset(0 0% 0 0)', opacity: '1' } },
      { offset: 0.82, props: { 'clip-path': 'inset(0 0% 0 0)', opacity: '0.45' } },
      { offset: 0.9, props: { 'clip-path': 'inset(0 0% 0 0)', opacity: '1' } },
      { offset: 1, props: { 'clip-path': 'inset(0 0% 0 0)', opacity: '1' } },
    ],
  },
  tap: {
    label: 'Tap',
    category: 'Interaction',
    description: 'Presses forward with a quick action glow.',
    easing: 'cubic-bezier(0.2, 0.9, 0.2, 1)',
    keyframes: [
      { offset: 0, props: { transform: 'translateX(0px) rotate(0deg)', filter: 'drop-shadow(0 0 0px transparent)' } },
      { offset: 0.4, props: { transform: 'translateX(12px) rotate(8deg)', filter: 'drop-shadow(0 0 10px rgba(74,222,128,0.35))' } },
      { offset: 0.65, props: { transform: 'translateX(14px) rotate(8deg)', filter: 'drop-shadow(0 0 12px rgba(74,222,128,0.45))' } },
      { offset: 1, props: { transform: 'translateX(0px) rotate(0deg)', filter: 'drop-shadow(0 0 0px transparent)' } },
    ],
  },
};

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
    const supported = Object.keys(MOTION_LAB_PRESETS).join(', ');
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
  const scaledKeyframes = scaleKeyframesByIntensity(preset.keyframes, intensityPercent);
  const animationName = `ml-${presetId}`;
  let css = `${MOTION_LAB_BRAND_COMMENT}\n`;
  css += `/* Preset: ${preset.label} | Trigger: ${trigger} | Duration: ${durationMs}ms | Intensity: ${intensityPercent}% */\n`;
  css += `${buildKeyframesCss(animationName, scaledKeyframes)}\n`;
  css += getAnimationRule(selector, animationName, trigger, durationMs, preset.easing);
  return css.trim();
}

export function listMotionLabPresets() {
  return Object.entries(MOTION_LAB_PRESETS).map(([id, preset]) => ({
    id,
    label: preset.label,
    category: preset.category,
    description: preset.description,
    supportedTriggers: ['loop', 'hover', 'click'],
    defaultDurationMs: 500,
    intensityRange: { min: 25, max: 200, default: 100 },
  }));
}

export function buildMotionLabRecipe({ presetId, trigger = 'loop', durationMs = 500, intensityPercent = 100 }) {
  const preset = getPresetOrThrow(presetId);
  const triggerGuide = {
    loop: 'plays continuously as soon as the icon is rendered',
    hover: 'plays while the user hovers the icon',
    click: 'plays when the icon is pressed or when an `.active` class is applied',
  };
  return {
    preset: preset.label,
    category: preset.category,
    description: preset.description,
    trigger,
    durationMs,
    intensityPercent,
    behavior: triggerGuide[trigger] || triggerGuide.loop,
    notes: [
      'Motion Lab MCP v1 animates the icon root as a whole unit.',
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
