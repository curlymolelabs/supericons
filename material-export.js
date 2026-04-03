export const MATERIAL_EXPORT_SOURCE = {
  provider: 'google-material-design-icons',
  repo: 'google/material-design-icons',
  ref: 'master',
  baseUrl: 'https://raw.githubusercontent.com/google/material-design-icons/master/symbols/web',
  styleDir: 'materialsymbolsoutlined',
};

export const MATERIAL_EXPORT_SUPPORTED_AXES = {
  fill: [0, 1],
  wght: [100, 200, 300, 400, 500, 600, 700],
  grad: [-25, 0, 200],
  opsz: [20, 24, 40, 48],
};

export const MATERIAL_EXPORT_DEFAULT_AXES = {
  fill: 0,
  wght: 300,
  grad: 0,
  opsz: 24,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function nearest(value, supported) {
  let best = supported[0];
  let bestDistance = Math.abs(value - best);
  for (const candidate of supported) {
    const distance = Math.abs(value - candidate);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}

export function normalizeMaterialExportAxes(customize = {}) {
  const raw = {
    fill: Number.isFinite(customize.materialFill) ? customize.materialFill : MATERIAL_EXPORT_DEFAULT_AXES.fill,
    wght: Number.isFinite(customize.materialWeight) ? customize.materialWeight : MATERIAL_EXPORT_DEFAULT_AXES.wght,
    grad: Number.isFinite(customize.materialGrade) ? customize.materialGrade : MATERIAL_EXPORT_DEFAULT_AXES.grad,
    opsz: Number.isFinite(customize.materialOpticalSize) ? customize.materialOpticalSize : MATERIAL_EXPORT_DEFAULT_AXES.opsz,
  };

  const normalized = {
    fill: nearest(clamp(raw.fill, 0, 1), MATERIAL_EXPORT_SUPPORTED_AXES.fill),
    wght: nearest(clamp(raw.wght, 100, 700), MATERIAL_EXPORT_SUPPORTED_AXES.wght),
    grad: nearest(clamp(raw.grad, -25, 200), MATERIAL_EXPORT_SUPPORTED_AXES.grad),
    opsz: nearest(clamp(raw.opsz, 20, 48), MATERIAL_EXPORT_SUPPORTED_AXES.opsz),
  };

  const snapped =
    normalized.fill !== raw.fill ||
    normalized.wght !== raw.wght ||
    normalized.grad !== raw.grad ||
    normalized.opsz !== raw.opsz;

  return { ...normalized, snapped };
}

function formatMaterialGrad(grad) {
  if (grad === 200) return 'grad200';
  if (grad === -25) return 'gradN25';
  return '';
}

export function buildMaterialSnapshotFilename(iconId, axes) {
  let suffix = '';

  if (axes.wght !== 400) suffix += `wght${axes.wght}`;
  const gradToken = formatMaterialGrad(axes.grad);
  if (gradToken) suffix += gradToken;
  if (axes.fill === 1) suffix += 'fill1';

  return `${iconId}${suffix ? `_${suffix}` : ''}_${axes.opsz}px.svg`;
}

export function buildMaterialSnapshotUrl(iconId, axes, source = MATERIAL_EXPORT_SOURCE) {
  const filename = buildMaterialSnapshotFilename(iconId, axes);
  return `${source.baseUrl}/${encodeURIComponent(iconId)}/${source.styleDir}/${filename}`;
}

export function buildMaterialCacheKey(iconId, axes) {
  return `${iconId}|f${axes.fill}|w${axes.wght}|g${axes.grad}|o${axes.opsz}`;
}

