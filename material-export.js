export const MATERIAL_EXPORT_SOURCE = {
  ref: 'master',
  baseUrl: 'https://raw.githubusercontent.com/google/material-design-icons/master/symbols/web',
  styleDir: 'materialsymbolsoutlined',
};

export const MATERIAL_EXPORT_STORAGE = {
  mode: 'owned-static-and-cache',
  localBasePath: '/material-export',
  functionBaseUrl: 'https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/serve-material-snapshot',
  bucket: 'material-icons',
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

function formatMaterialGradToken(grad) {
  if (grad === 200) return 'grad200';
  if (grad === -25) return 'gradN25';
  return '';
}

function formatMaterialOwnedGradSegment(grad) {
  return grad < 0 ? `grad-neg${Math.abs(grad)}` : `grad-${grad}`;
}

export function buildMaterialUpstreamSnapshotFilename(iconId, axes) {
  let suffix = '';

  if (axes.wght !== 400) suffix += `wght${axes.wght}`;
  const gradToken = formatMaterialGradToken(axes.grad);
  if (gradToken) suffix += gradToken;
  if (axes.fill === 1) suffix += 'fill1';

  return `${iconId}${suffix ? `_${suffix}` : ''}_${axes.opsz}px.svg`;
}

export function buildMaterialUpstreamSnapshotUrl(iconId, axes, source = MATERIAL_EXPORT_SOURCE) {
  const filename = buildMaterialUpstreamSnapshotFilename(iconId, axes);
  return `${source.baseUrl}/${encodeURIComponent(iconId)}/${source.styleDir}/${filename}`;
}

export function buildMaterialCacheKey(iconId, axes) {
  return `material:${iconId}:f${axes.fill}:w${axes.wght}:g${axes.grad}:o${axes.opsz}`;
}

export function buildMaterialOwnedStoragePath(iconId, axes, storage = MATERIAL_EXPORT_STORAGE) {
  return [
    storage.styleDir || MATERIAL_EXPORT_STORAGE.styleDir,
    iconId,
    `fill-${axes.fill}`,
    `wght-${axes.wght}`,
    formatMaterialOwnedGradSegment(axes.grad),
    `opsz-${axes.opsz}.svg`,
  ].join('/');
}

export function parseMaterialOwnedStoragePath(path) {
  const normalized = String(path || '').replace(/\\/g, '/').replace(/^\/+/, '');
  const match = normalized.match(
    /^([^/]+)\/([^/]+)\/fill-(0|1)\/wght-(100|200|300|400|500|600|700)\/(grad-(?:0|200)|grad-neg25)\/opsz-(20|24|40|48)\.svg$/
  );

  if (!match) return null;

  const [, styleDir, iconId, fill, wght, gradSegment, opsz] = match;
  const grad = gradSegment === 'grad-neg25' ? -25 : Number(gradSegment.replace('grad-', ''));

  return {
    styleDir,
    iconId,
    axes: {
      fill: Number(fill),
      wght: Number(wght),
      grad,
      opsz: Number(opsz),
      snapped: false,
    },
  };
}

export function normalizeMaterialSnapshotSvg(rawSvg) {
  if (!rawSvg) return null;
  if (/\bfill="/.test(rawSvg)) return rawSvg;
  return rawSvg.replace(/<svg([^>]*)>/, '<svg$1 fill="currentColor">');
}

export function resolveMaterialExportStorage(manifest = {}) {
  return {
    ...MATERIAL_EXPORT_STORAGE,
    ...(manifest?.storage || {}),
  };
}

export function getMaterialManifestEntry(manifest, iconId, axes) {
  if (!manifest?.entries) return null;
  return manifest.entries[buildMaterialCacheKey(iconId, axes)] || null;
}

export function buildMaterialOwnedSnapshotUrl(iconId, axes, manifest = {}) {
  const storage = resolveMaterialExportStorage(manifest);
  const entry = getMaterialManifestEntry(manifest, iconId, axes);

  if (entry?.url) return entry.url;

  if (entry?.path) {
    const basePath = String(storage.localBasePath || '/material-export').replace(/\/$/, '');
    const path = String(entry.path).replace(/^\/+/, '');
    return `${basePath}/${path}`;
  }

  const params = new URLSearchParams({
    icon: iconId,
    fill: String(axes.fill),
    wght: String(axes.wght),
    grad: String(axes.grad),
    opsz: String(axes.opsz),
  });

  return `${storage.functionBaseUrl}?${params.toString()}`;
}
