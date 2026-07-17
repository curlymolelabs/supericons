import { convertPngToSvg as convertProofPngToSvg } from '../lib/converter-workflow.js';
import { convertPngToSvg, convertSvgToPng, inspectConverterInput } from '../mcp/runtime/converter-workflow.js';

const FIXTURES = [
  {
    id: 'flat-logo',
    description: 'Flat two-color logo with clean separated regions.',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 64"><rect x="8" y="8" width="52" height="48" rx="10" fill="#111827"/><rect x="68" y="8" width="84" height="20" rx="10" fill="#2563eb"/><rect x="68" y="36" width="60" height="20" rx="10" fill="#2563eb"/></svg>',
    render: { targetWidth: 320, background: 'transparent' },
    trace: { colorMode: 'color', qualityMode: 'exact', traceClass: 'flat-logo-color', uiMode: 'logo' },
    expect: { minPathCount: 2, minShapeCount: 2 },
  },
  {
    id: 'tiny-interface-icon',
    description: 'Small monochrome icon with simple UI geometry.',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" rx="3" fill="#111111"/><rect x="11" y="7" width="2" height="10" fill="#ffffff"/><rect x="7" y="11" width="10" height="2" fill="#ffffff"/></svg>',
    render: { targetWidth: 48, background: 'transparent' },
    trace: { colorMode: 'mono', qualityMode: 'exact', traceClass: 'tiny-line-icon', uiMode: 'icon' },
    expect: { minPathCount: 1, minShapeCount: 1 },
  },
  {
    id: 'single-color-mark',
    description: 'Single-color brand mark with broad curves.',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 64"><circle cx="36" cy="32" r="24" fill="#111111"/><rect x="70" y="18" width="78" height="12" rx="6" fill="#111111"/><rect x="70" y="34" width="56" height="12" rx="6" fill="#111111"/></svg>',
    render: { targetWidth: 320, background: 'transparent' },
    trace: { colorMode: 'mono', qualityMode: 'exact', traceClass: 'single-color-mark', uiMode: 'logo' },
    expect: { minPathCount: 1, minShapeCount: 1 },
  },
  {
    id: 'small-colored-badge',
    description: 'Compact colored badge with icon-like proportions.',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect x="4" y="4" width="32" height="32" rx="8" fill="#22c55e"/><circle cx="20" cy="20" r="9" fill="#facc15"/><rect x="18" y="12" width="4" height="16" fill="#166534"/><rect x="12" y="18" width="16" height="4" fill="#166534"/></svg>',
    render: { targetWidth: 80, background: 'transparent' },
    trace: { colorMode: 'color', qualityMode: 'exact', traceClass: 'tile-icon-color', uiMode: 'icon' },
    expect: { minPathCount: 2, minShapeCount: 2 },
  },
  {
    id: 'mono-mask',
    description: 'High-contrast silhouette with transparency around the subject.',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><path d="M48 12c-14 0-24 10-24 24 0 12 8 19 14 24 5 4 7 7 10 12 3-5 5-8 10-12 6-5 14-12 14-24 0-14-10-24-24-24z" fill="#000000"/></svg>',
    render: { targetWidth: 192, background: 'transparent' },
    trace: { colorMode: 'mono', qualityMode: 'exact', traceClass: 'mono-mask', uiMode: 'logo' },
    expect: { minPathCount: 1, minShapeCount: 1 },
  },
  {
    id: 'general-color-artwork',
    description: 'Harder full-color artwork with gradients and transparency.',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 96"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#8b5cf6"/><stop offset="100%" stop-color="#ec4899"/></linearGradient></defs><rect x="8" y="8" width="144" height="80" rx="20" fill="url(#g)"/><circle cx="56" cy="44" r="22" fill="#fbbf24" opacity="0.9"/><circle cx="98" cy="52" r="18" fill="#38bdf8" opacity="0.75"/><rect x="42" y="62" width="72" height="10" rx="5" fill="#ffffff" opacity="0.65"/></svg>',
    render: { targetWidth: 320, background: 'transparent' },
    trace: { colorMode: 'color', qualityMode: 'exact', traceClass: 'general-color', uiMode: 'logo' },
    expect: { minPathCount: 3, minShapeCount: 3, compareHeavierThan: 'flat-logo' },
  },
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function hasValidSvgFrame(svg = '', viewBox = null) {
  if (typeof viewBox === 'string' && /^\s*-?\d+(\.\d+)?\s+-?\d+(\.\d+)?\s+\d+(\.\d+)?\s+\d+(\.\d+)?\s*$/.test(viewBox)) {
    return true;
  }
  return /<svg\b[^>]*\bwidth="[^"]+"[^>]*\bheight="[^"]+"/i.test(svg);
}

const results = [];

for (const fixture of FIXTURES) {
  const pngResult = convertSvgToPng({
    svg: fixture.svg,
    targetWidth: fixture.render.targetWidth,
    background: fixture.render.background,
  });

  assert(typeof pngResult?.pngBase64 === 'string' && pngResult.pngBase64.length > 0, `${fixture.id}: SVG-to-PNG did not return pngBase64.`);
  assert(typeof pngResult?.pngDataUrl === 'string' && pngResult.pngDataUrl.startsWith('data:image/png;base64,'), `${fixture.id}: SVG-to-PNG did not return a PNG data URL.`);
  assert(pngResult?.metrics?.width === fixture.render.targetWidth, `${fixture.id}: SVG-to-PNG width did not match target width.`);
  assert(pngResult?.request?.background === fixture.render.background, `${fixture.id}: SVG-to-PNG request background was not preserved.`);

  const inspection = inspectConverterInput({
    imageBase64: pngResult.pngBase64,
  });
  assert(inspection?.format === 'png', `${fixture.id}: inspection did not identify PNG format.`);
  assert(typeof inspection?.input?.width === 'number' && typeof inspection?.input?.height === 'number', `${fixture.id}: inspection did not return PNG dimensions.`);
  assert(typeof inspection?.assessment?.recommendedSettings?.traceClass === 'string', `${fixture.id}: inspection did not return recommended settings.`);
  assert(Array.isArray(inspection?.assessment?.risks) && inspection.assessment.risks.length > 0, `${fixture.id}: inspection did not return any risk notes.`);

  const svgResult = await convertPngToSvg({
    imageBase64: pngResult.pngBase64,
    ...fixture.trace,
  });

  assert(typeof svgResult?.svg === 'string' && svgResult.svg.includes('<svg'), `${fixture.id}: PNG-to-SVG did not return SVG text.`);
  assert(Array.isArray(svgResult?.warnings), `${fixture.id}: PNG-to-SVG did not return warnings array.`);
  assert(svgResult?.request?.traceClass === fixture.trace.traceClass, `${fixture.id}: traceClass was not preserved.`);
  assert(svgResult?.request?.uiMode === fixture.trace.uiMode, `${fixture.id}: uiMode was not preserved.`);
  assert(svgResult?.request?.colorMode === fixture.trace.colorMode, `${fixture.id}: colorMode was not preserved.`);
  assert(svgResult?.metrics?.pathCount >= fixture.expect.minPathCount, `${fixture.id}: pathCount was lower than expected.`);
  assert(svgResult?.metrics?.shapeCount >= fixture.expect.minShapeCount, `${fixture.id}: shapeCount was lower than expected.`);
  assert(hasValidSvgFrame(svgResult?.svg, svgResult?.metrics?.viewBox), `${fixture.id}: SVG frame metadata was missing or invalid.`);

  results.push({
    id: fixture.id,
    description: fixture.description,
    pngMetrics: pngResult.metrics,
    inspection: {
      likelyFit: inspection.assessment.likelyFit,
      recommendedSettings: inspection.assessment.recommendedSettings,
    },
    svgMetrics: svgResult.metrics,
    request: svgResult.request,
  });
}

const aliasFixture = FIXTURES.find((fixture) => fixture.id === 'tiny-interface-icon');
const aliasPngResult = convertSvgToPng({
  svg: aliasFixture.svg,
  targetWidth: aliasFixture.render.targetWidth,
  background: aliasFixture.render.background,
});
const aliasTrace = {
  imageBase64: aliasPngResult.pngBase64,
  qualityMode: 'exact',
  requestedColorMode: 'mono',
  traceClass: 'tiny-line-icon',
  uiMode: 'icon',
};
const runtimeAliasResult = await convertPngToSvg(aliasTrace);
const proofAliasResult = await convertProofPngToSvg(aliasTrace);
assert(runtimeAliasResult?.request?.colorMode === 'mono', 'runtime converter did not honor requestedColorMode alias.');
assert(proofAliasResult?.request?.colorMode === 'mono', 'proof service converter did not honor requestedColorMode alias.');

for (const fixture of FIXTURES) {
  if (!fixture.expect.compareHeavierThan) continue;
  const current = results.find((entry) => entry.id === fixture.id);
  const baseline = results.find((entry) => entry.id === fixture.expect.compareHeavierThan);
  assert(current && baseline, `${fixture.id}: comparison baseline was missing.`);
  assert(current.svgMetrics.pathCount > baseline.svgMetrics.pathCount, `${fixture.id}: expected a heavier path count than ${fixture.expect.compareHeavierThan}.`);
}

console.log(JSON.stringify({
  fixtureCount: results.length,
  verified: results.map((entry) => ({
    id: entry.id,
    traceClass: entry.request.traceClass,
    pathCount: entry.svgMetrics.pathCount,
    shapeCount: entry.svgMetrics.shapeCount,
    likelyFit: entry.inspection.likelyFit,
  })),
}, null, 2));
