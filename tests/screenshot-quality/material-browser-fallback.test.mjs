import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MATERIAL_BROWSER_CAPTURE_FONT_SIZE,
  buildMaterialBrowserCaptureSpec,
  buildMaterialExceptionAssetIdSet,
  readMaterialExceptionManifest,
} from '../../lib/screenshot-capture/material-browser-fallback.js';

test('readMaterialExceptionManifest reads active screenshot capture data', () => {
  const manifest = readMaterialExceptionManifest(process.cwd());

  assert.equal(manifest.library, 'material');
  assert.ok(manifest.entries.length > 0);
  assert.ok(manifest.entries.every((entry) => entry.asset_id));
});

test('buildMaterialExceptionAssetIdSet returns the approved material exception ids', () => {
  const manifest = {
    library: 'material',
    entries: [
      { asset_id: 'delivery_dining' },
      { asset_id: 'tungsten' },
    ],
  };

  const ids = buildMaterialExceptionAssetIdSet(manifest);

  assert.deepEqual([...ids].sort(), ['delivery_dining', 'tungsten']);
});

test('buildMaterialBrowserCaptureSpec matches the standard outline material defaults', () => {
  const spec = buildMaterialBrowserCaptureSpec({
    target: {
      library: 'material',
      asset_id: 'delivery_dining',
      asset_style: 'outline',
      capture_mode: 'catalog_svg_asset',
    },
    exceptionAssetIds: new Set(['delivery_dining']),
  });

  assert.deepEqual(spec, {
    text: 'delivery_dining',
    width: 128,
    height: 128,
    fontSize: MATERIAL_BROWSER_CAPTURE_FONT_SIZE,
    axes: {
      fill: 0,
      wght: 300,
      grad: 0,
      opsz: 24,
    },
  });
});

test('buildMaterialBrowserCaptureSpec matches the standard solid material defaults', () => {
  const spec = buildMaterialBrowserCaptureSpec({
    target: {
      library: 'material',
      asset_id: 'delivery_dining',
      asset_style: 'solid',
      capture_mode: 'material_fill_axis',
      material_fill: 1,
    },
    exceptionAssetIds: new Set(['delivery_dining']),
  });

  assert.deepEqual(spec, {
    text: 'delivery_dining',
    width: 128,
    height: 128,
    fontSize: MATERIAL_BROWSER_CAPTURE_FONT_SIZE,
    axes: {
      fill: 1,
      wght: 400,
      grad: 0,
      opsz: 24,
    },
  });
});

test('buildMaterialBrowserCaptureSpec ignores non-exception targets', () => {
  const spec = buildMaterialBrowserCaptureSpec({
    target: {
      library: 'material',
      asset_id: '10k',
      asset_style: 'outline',
      capture_mode: 'catalog_svg_asset',
    },
    exceptionAssetIds: new Set(['delivery_dining']),
  });

  assert.equal(spec, null);
});
