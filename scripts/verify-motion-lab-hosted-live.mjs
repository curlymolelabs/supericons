import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(__dirname);

if (!process.env.SUPERICONS_API_KEY) {
  throw new Error('SUPERICONS_API_KEY is required for live Motion Lab hosted verification.');
}

process.env.SUPERICONS_MOTION_LAB_LOCAL_FALLBACK = '0';

await import(pathToFileURL(join(repoRoot, 'scripts', 'build-motion-lab-mcp-artifacts.mjs')).href);

const clientModuleUrl = `${pathToFileURL(join(repoRoot, 'mcp', 'motion-lab-client.js')).href}?t=${Date.now()}`;
const {
  getMotionLabRecipeHosted,
  renderMotionLabCssHosted,
  renderMotionLabAnimatedSvgHosted,
  animateMotionLabIconHosted,
} = await import(clientModuleUrl);

const recipe = await getMotionLabRecipeHosted({
  preset: 'sweep',
  trigger: 'hover',
  duration_ms: 240,
  intensity_percent: 100,
});

if (recipe.preset_id !== 'sweep' || recipe.group !== 'Special' || recipe.trigger !== 'hover') {
  throw new Error('Hosted recipe verification failed to return the expected Motion Lab contract.');
}

const css = await renderMotionLabCssHosted({
  preset: 'sweep',
  trigger: 'hover',
  duration_ms: 240,
  intensity_percent: 100,
});

if (css.selector_mode !== 'placeholder' || css.selector_token !== '{{ICON_SELECTOR}}' || !css.css.includes('{{ICON_SELECTOR}}')) {
  throw new Error('Hosted CSS verification failed to preserve the placeholder selector contract.');
}

const animatedSvg = await renderMotionLabAnimatedSvgHosted({
  svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 12h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 4l8 8-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>',
  preset: 'sweep',
  trigger: 'hover',
  duration_ms: 240,
  intensity_percent: 100,
  color: '#ff6b35',
});

if (!animatedSvg.animated_svg.includes('<style>') || animatedSvg.applied_color !== '#ff6b35') {
  throw new Error('Hosted animated SVG verification failed to return embedded animation output.');
}

const bundle = await animateMotionLabIconHosted({
  svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 12h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 4l8 8-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>',
  preset: 'sweep',
  trigger: 'hover',
  duration_ms: 240,
  intensity_percent: 100,
  color: '#ff6b35',
});

if (!bundle.css.includes('{{ICON_SELECTOR}}') || !bundle.animated_svg.includes('<style>') || bundle.recipe.preset_id !== 'sweep') {
  throw new Error('Hosted bundle verification failed to compose recipe, CSS, and animated SVG correctly.');
}

console.log('Motion Lab hosted live path verified: session exchange, recipe, CSS, animated SVG, and bundle all resolved through the deployed hosted endpoints with local fallback disabled.');
