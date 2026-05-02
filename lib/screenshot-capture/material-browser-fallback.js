import fs from 'node:fs';
import path from 'node:path';

import { MATERIAL_EXPORT_DEFAULT_AXES } from '../../material-export.js';

export const MATERIAL_BROWSER_CAPTURE_WIDTH = 128;
export const MATERIAL_BROWSER_CAPTURE_HEIGHT = 128;
export const MATERIAL_BROWSER_CAPTURE_FONT_SIZE = 124;
export const MATERIAL_BROWSER_CAPTURE_CSS_URL =
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block';

export function readMaterialExceptionManifest(repoRoot) {
  const filePath = path.join(
    repoRoot,
    'data',
    'screenshot-capture',
    'material-screenshot-capture-exceptions.json'
  );
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function buildMaterialExceptionAssetIdSet(manifest) {
  return new Set((manifest?.entries || []).map((entry) => entry.asset_id).filter(Boolean));
}

function resolveMaterialBrowserAxes(target) {
  if (target.capture_mode === 'material_fill_axis' && target.material_fill === 1) {
    return {
      fill: 1,
      wght: 400,
      grad: 0,
      opsz: 24,
    };
  }

  return {
    fill: MATERIAL_EXPORT_DEFAULT_AXES.fill,
    wght: MATERIAL_EXPORT_DEFAULT_AXES.wght,
    grad: MATERIAL_EXPORT_DEFAULT_AXES.grad,
    opsz: MATERIAL_EXPORT_DEFAULT_AXES.opsz,
  };
}

export function buildMaterialBrowserCaptureSpec({ target, exceptionAssetIds }) {
  if (target.library !== 'material') return null;
  if (!exceptionAssetIds?.has(target.asset_id)) return null;

  return {
    text: target.asset_id,
    width: MATERIAL_BROWSER_CAPTURE_WIDTH,
    height: MATERIAL_BROWSER_CAPTURE_HEIGHT,
    fontSize: MATERIAL_BROWSER_CAPTURE_FONT_SIZE,
    axes: resolveMaterialBrowserAxes(target),
  };
}

export function buildMaterialBrowserCaptureHtml(spec) {
  const { width, height, fontSize, text, axes } = spec;
  const fontVars = `'FILL' ${axes.fill}, 'wght' ${axes.wght}, 'GRAD' ${axes.grad}, 'opsz' ${axes.opsz}`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${MATERIAL_BROWSER_CAPTURE_CSS_URL}" rel="stylesheet">
  <style>
    html, body {
      margin: 0;
      width: ${width}px;
      height: ${height}px;
      background: transparent;
      overflow: hidden;
    }

    body {
      display: grid;
      place-items: center;
    }

    .material-icon {
      color: #000;
      display: inline-block;
      font-family: 'Material Symbols Outlined';
      font-size: ${fontSize}px;
      font-variation-settings: ${fontVars};
      line-height: 1;
    }
  </style>
</head>
<body>
  <span class="material-icon">${text}</span>
</body>
</html>`;
}
