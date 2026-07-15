// Verifies the Railway-side Material hydration module without any network or
// production contact. All fetches are mocked.
//
// Usage: node scripts/verify-material-railway-hydration.mjs

import assert from 'node:assert/strict';

import {
  buildMaterialSnapshotRequestUrl,
  clearMaterialHydrationCache,
  fetchMaterialSnapshotSvg,
  getBundledMaterialSvg,
  getMaterialBundleStatus,
  hydrateMaterialHostedRows,
  resolveMaterialRequestVariant,
  setMaterialHydrationConcurrencyForTests,
} from '../mcp/material-hydration.js';

const checks = [];
function check(name, fn) {
  checks.push([name, fn]);
}

const SVG = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>';

function mockFetch(recorder, { status = 200, body = SVG, failFor = new Set() } = {}) {
  return async (url) => {
    recorder.push(String(url));
    const iconParam = new URL(String(url)).searchParams.get('icon');
    if (failFor.has(iconParam)) {
      return { ok: false, status: 502, text: async () => 'bad gateway' };
    }
    return { ok: status === 200, status, text: async () => body };
  };
}

check('variant resolution maps styles to fixed presets', () => {
  assert.equal(resolveMaterialRequestVariant('any'), 'outline');
  assert.equal(resolveMaterialRequestVariant('outline'), 'outline');
  assert.equal(resolveMaterialRequestVariant('solid'), 'solid');
});

check('snapshot URL carries the exact preset axes', () => {
  const outline = new URL(buildMaterialSnapshotRequestUrl('settings', 'outline'));
  assert.equal(outline.searchParams.get('icon'), 'settings');
  assert.equal(outline.searchParams.get('fill'), '0');
  assert.equal(outline.searchParams.get('wght'), '300');
  assert.equal(outline.searchParams.get('grad'), '0');
  assert.equal(outline.searchParams.get('opsz'), '24');
  const solid = new URL(buildMaterialSnapshotRequestUrl('settings', 'solid'));
  assert.equal(solid.searchParams.get('fill'), '1');
  assert.equal(solid.searchParams.get('wght'), '400');
});

check('bundled serving asset set is complete and usable in both styles', () => {
  const status = getMaterialBundleStatus();
  assert.equal(status.available, true, status.reason || 'bundle unavailable');
  assert.equal(status.assetCount, 8524);
  assert.ok(getBundledMaterialSvg('settings', 'outline')?.startsWith('<svg'));
  assert.ok(getBundledMaterialSvg('settings', 'solid')?.startsWith('<svg'));
  assert.notEqual(
    getBundledMaterialSvg('settings', 'outline'),
    getBundledMaterialSvg('settings', 'solid'),
  );
});

check('fetch validates SVG content and caches by icon and variant', async () => {
  clearMaterialHydrationCache();
  const urls = [];
  const fetchImpl = mockFetch(urls);
  const options = { fetchImpl, assetLookup: () => null };
  const first = await fetchMaterialSnapshotSvg('settings', 'outline', options);
  const second = await fetchMaterialSnapshotSvg('settings', 'outline', options);
  const solid = await fetchMaterialSnapshotSvg('settings', 'solid', options);
  assert.equal(first, SVG);
  assert.equal(second, SVG);
  assert.equal(solid, SVG);
  assert.equal(urls.length, 2, 'outline cached; solid fetched separately');
  await assert.rejects(
    fetchMaterialSnapshotSvg('broken', 'outline', {
      fetchImpl: async () => ({ ok: true, status: 200, text: async () => 'not svg' }),
      assetLookup: () => null,
    }),
    /non-SVG content/,
  );
});

check('hydration fills SVG-less material rows and leaves others untouched', async () => {
  clearMaterialHydrationCache();
  const urls = [];
  const rows = [
    { icon_id: 'lucide:calendar', library: 'lucide', svg: '<svg>lucide</svg>', style: 'outline' },
    { icon_id: 'material:settings', library: 'material', svg: null, style: 'outline' },
    { icon_id: 'material:home', library: 'material', svg: null, style: 'outline' },
  ];
  const result = await hydrateMaterialHostedRows(rows, {
    style: 'any', fetchImpl: mockFetch(urls), assetLookup: () => null,
  });
  assert.equal(result.hydrated, 2);
  assert.equal(result.failed, 0);
  assert.equal(result.kept.length, 3);
  assert.equal(rows[0].svg, '<svg>lucide</svg>', 'non-material row untouched');
  assert.equal(rows[1].svg, SVG);
  assert.equal(rows[2].svg, SVG);
  assert.ok(urls.every((u) => u.includes('fill=0')), 'outline preset used for style any');
});

check('solid requests hydrate the solid preset and retag row style', async () => {
  clearMaterialHydrationCache();
  const urls = [];
  const rows = [{ icon_id: 'material:settings', library: 'material', svg: null, style: 'outline' }];
  await hydrateMaterialHostedRows(rows, {
    style: 'solid', fetchImpl: mockFetch(urls), assetLookup: () => null,
  });
  assert.equal(rows[0].style, 'solid');
  assert.ok(urls[0].includes('fill=1') && urls[0].includes('wght=400'));
});

check('failed hydration drops only the affected rows and reports counts', async () => {
  clearMaterialHydrationCache();
  const urls = [];
  const errors = [];
  const rows = [
    { icon_id: 'material:settings', library: 'material', svg: null },
    { icon_id: 'material:doesnotexist', library: 'material', svg: null },
    { icon_id: 'tabler:star', library: 'tabler', svg: '<svg>t</svg>' },
  ];
  const result = await hydrateMaterialHostedRows(rows, {
    style: 'any',
    fetchImpl: mockFetch(urls, { failFor: new Set(['doesnotexist']) }),
    assetLookup: () => null,
    onError: (error) => errors.push(error.message),
  });
  assert.equal(result.hydrated, 1);
  assert.equal(result.failed, 1);
  assert.equal(result.kept.length, 2);
  assert.ok(result.kept.some((r) => r.icon_id === 'material:settings'));
  assert.ok(result.kept.some((r) => r.icon_id === 'tabler:star'));
  assert.equal(errors.length, 1);
});

check('concurrency never exceeds the configured cap', async () => {
  clearMaterialHydrationCache();
  setMaterialHydrationConcurrencyForTests(3);
  let inFlight = 0;
  let peak = 0;
  const rows = Array.from({ length: 12 }, (_, i) => ({
    icon_id: `material:icon_${i}`,
    library: 'material',
    svg: null,
  }));
  await hydrateMaterialHostedRows(rows, {
    style: 'any',
    concurrency: 3,
    assetLookup: () => null,
    fetchImpl: async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return { ok: true, status: 200, text: async () => SVG };
    },
  });
  assert.ok(peak <= 3, `peak in-flight was ${peak}`);
  assert.ok(rows.every((r) => r.svg === SVG));
});

check('process-wide concurrency applies across simultaneous hydration calls', async () => {
  clearMaterialHydrationCache();
  setMaterialHydrationConcurrencyForTests(2);
  let inFlight = 0;
  let peak = 0;
  const fetchImpl = async () => {
    inFlight += 1;
    peak = Math.max(peak, inFlight);
    await new Promise((resolve) => setTimeout(resolve, 5));
    inFlight -= 1;
    return { ok: true, status: 200, text: async () => SVG };
  };
  const makeRows = (prefix) => Array.from({ length: 6 }, (_, index) => ({
    icon_id: `material:${prefix}_${index}`,
    library: 'material',
    svg: null,
  }));
  await Promise.all([
    hydrateMaterialHostedRows(makeRows('left'), { fetchImpl, concurrency: 6, assetLookup: () => null }),
    hydrateMaterialHostedRows(makeRows('right'), { fetchImpl, concurrency: 6, assetLookup: () => null }),
  ]);
  assert.ok(peak <= 2, `process-wide peak in-flight was ${peak}`);
});

check('concurrent requests for one asset share a single fallback fetch', async () => {
  clearMaterialHydrationCache();
  setMaterialHydrationConcurrencyForTests(4);
  let fetches = 0;
  const fetchImpl = async () => {
    fetches += 1;
    await new Promise((resolve) => setTimeout(resolve, 5));
    return { ok: true, status: 200, text: async () => SVG };
  };
  const results = await Promise.all(Array.from({ length: 8 }, () => (
    fetchMaterialSnapshotSvg('coalesced', 'outline', { fetchImpl, assetLookup: () => null })
  )));
  assert.equal(fetches, 1);
  assert.ok(results.every((svg) => svg === SVG));
});

check('rows already carrying SVG are skipped for outline requests', async () => {
  clearMaterialHydrationCache();
  const urls = [];
  const rows = [{ icon_id: 'material:settings', library: 'material', svg: '<svg>already</svg>' }];
  const result = await hydrateMaterialHostedRows(rows, {
    style: 'any', fetchImpl: mockFetch(urls), assetLookup: () => null,
  });
  assert.equal(result.hydrated, 0);
  assert.equal(urls.length, 0);
  assert.equal(rows[0].svg, '<svg>already</svg>');
});

let failures = 0;
for (const [name, fn] of checks) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL - ${name}: ${error.message}`);
  }
}
console.log(JSON.stringify({ status: failures === 0 ? 'ok' : 'failed', checks: checks.length, failures }));
if (failures > 0) process.exit(1);
