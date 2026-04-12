import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(__dirname);

process.env.SUPERICONS_API_KEY = process.env.SUPERICONS_API_KEY || 'dev-local-key';
process.env.SUPERICONS_MOTION_LAB_BASE_URL = 'http://127.0.0.1:9';
process.env.SUPERICONS_MOTION_LAB_LOCAL_FALLBACK = '1';

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
  duration_ms: 500,
  intensity_percent: 80,
});

if (recipe.preset_id !== 'sweep' || recipe.group !== 'Special') {
  throw new Error('Hosted fallback recipe response did not preserve expected Motion Lab fields.');
}

const css = await renderMotionLabCssHosted({
  preset: 'sweep',
  trigger: 'hover',
  duration_ms: 500,
  intensity_percent: 80,
});

if (css.selector_mode !== 'placeholder' || !css.css.includes('{{ICON_SELECTOR}}')) {
  throw new Error('Hosted fallback CSS response did not return the placeholder selector contract.');
}

const animatedSvg = await renderMotionLabAnimatedSvgHosted({
  svg: '<svg viewBox="0 0 24 24"><path d="M12 2v20"/></svg>',
  preset: 'sweep',
  trigger: 'hover',
  duration_ms: 500,
  intensity_percent: 80,
  color: '#ff5a1f',
});

if (!animatedSvg.animated_svg.includes('<style>') || animatedSvg.applied_color !== '#ff5a1f') {
  throw new Error('Hosted fallback animated SVG response did not include the expected embedded output.');
}

const bundle = await animateMotionLabIconHosted({
  svg: '<svg viewBox="0 0 24 24"><path d="M12 2v20"/></svg>',
  preset: 'sweep',
  trigger: 'hover',
  duration_ms: 500,
  intensity_percent: 80,
  color: '#ff5a1f',
});

if (!bundle.css.includes('{{ICON_SELECTOR}}') || !bundle.animated_svg.includes('<style>')) {
  throw new Error('Hosted fallback bundle response was incomplete.');
}

console.log('Motion Lab hosted fallback verified: recipe, CSS, animated SVG, and bundle all resolve through the repo-local fallback path.');
