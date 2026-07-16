import {
  buildHostedAnimatedSvgResponse,
  buildHostedCssRenderResponse,
  parseHostedAnimatedSvgRequest,
} from '../supabase/functions/_shared/motion-lab/runtime.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function expectInvalidSvg(svg: string) {
  try {
    parseHostedAnimatedSvgRequest({
      svg,
      preset: 'shockwave',
      trigger: 'hover',
      duration_ms: 700,
      intensity_percent: 125,
    });
    throw new Error(`Hosted runtime unexpectedly accepted malformed SVG: ${svg}`);
  } catch (error) {
    const err = error as { code?: string; message?: string };
    assert(err.code === 'motion_lab_invalid_request', `Malformed SVG returned ${err.code} instead of motion_lab_invalid_request.`);
    assert(String(err.message || '').includes('valid inline SVG markup'), 'Malformed SVG error did not explain the SVG markup requirement.');
  }
}

const strokeSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" vector-effect="non-scaling-stroke"><path d="M4 12h16" vector-effect="non-scaling-stroke"/><circle cx="12" cy="12" r="4"/></svg>';
const ioniconsSvg = '<svg stroke="currentColor" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><circle cx="256" cy="56" r="40" fill="none" stroke="currentColor"/><path fill="none" stroke="currentColor" d="M204.23 274.44 208 476.18"/></svg>';
const noViewBoxSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path fill="currentColor" d="M5 3h14v2H5z"/></svg>';

const cssResponse = buildHostedCssRenderResponse({
  preset: 'shockwave',
  trigger: 'hover',
  duration_ms: 700,
  intensity_percent: 125,
  selector: '{{ICON_SELECTOR}}',
});

assert(cssResponse.css.includes('[data-ml-stroke-compensate="true"]'), 'Hosted CSS response is missing stroke compensation selector.');
assert(cssResponse.css.includes('--ml-stroke-comp:'), 'Hosted CSS response is missing scale keyframe stroke compensation.');
assert(!cssResponse.css.includes('vector-effect'), 'Hosted CSS response should not emit vector-effect.');

const animatedSvg = buildHostedAnimatedSvgResponse({
  svg: strokeSvg,
  preset: 'shockwave',
  trigger: 'click',
  duration_ms: 700,
  intensity_percent: 125,
  color: '#ff5c00',
});

assert(animatedSvg.animated_svg.includes('data-ml-stroke-compensate="true"'), 'Hosted animated SVG is missing stroke compensation markers.');
assert(animatedSvg.animated_svg.includes('--ml-base-stroke-width:2'), 'Hosted animated SVG is missing the original base stroke width.');
assert(animatedSvg.animated_svg.includes('--ml-stroke-comp:'), 'Hosted animated SVG is missing scale keyframe stroke compensation.');
assert(!animatedSvg.animated_svg.includes('vector-effect'), 'Hosted animated SVG should strip vector-effect.');
assert(animatedSvg.animated_svg.includes('svg.si-animated-icon:active'), 'Hosted click SVG should animate on :active.');
assert(animatedSvg.animated_svg.includes('svg.si-animated-icon.active'), 'Hosted click SVG should still support .active.');

const ioniconsAnimatedSvg = buildHostedAnimatedSvgResponse({
  svg: ioniconsSvg,
  preset: 'shockwave',
  trigger: 'loop',
  duration_ms: 700,
  intensity_percent: 125,
  color: null,
});

assert(ioniconsAnimatedSvg.animated_svg.includes('--ml-base-stroke-width:32'), 'Hosted Ionicons SVG did not infer a readable large-viewBox stroke width.');

const noViewBoxAnimatedSvg = buildHostedAnimatedSvgResponse({
  svg: noViewBoxSvg,
  preset: 'pulse',
  trigger: 'loop',
  duration_ms: 700,
  intensity_percent: 100,
  color: null,
});

assert(noViewBoxAnimatedSvg.animated_svg.includes('viewBox="0 0 24 24"'), 'Hosted no-viewBox SVG did not receive a fallback viewBox.');

for (const malformedSvg of ['not svg', '<svg><path', '<div></div>']) {
  expectInvalidSvg(malformedSvg);
}

console.log('Motion Lab hosted runtime smoke passed.');
