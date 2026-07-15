/**
 * SuperIcons MCP: Railway-side Material SVG hydration.
 *
 * The stable hosted search engine returns ranked Material rows without SVG
 * payloads. Railway ships the complete validated fixed-preset asset bundle
 * beside this module. The deployed snapshot function remains a fallback when
 * the local bundle is absent, such as an installed npm package.
 *
 * Contract notes:
 * - Fixed MCP presets only: outline (fill 0, wght 300) and solid (fill 1,
 *   wght 400), both grad 0 and opsz 24, per MATERIAL_MCP_PRESETS.
 * - A solid request hydrates the solid preset regardless of the engine-tagged
 *   row style, and the hydrated row reports style "solid".
 * - Fallback hydration failures are counted, logged by the caller, and the affected
 *   rows are excluded from the response; they must never surface as icons
 *   without SVG.
 */

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

import {
  getMaterialMcpPreset,
  MATERIAL_EXPORT_SOURCE,
  MATERIAL_EXPORT_STORAGE,
} from './material-export.js';

const CACHE_LIMIT = 4096;
const svgCache = new Map();
const inFlightSnapshots = new Map();
const snapshotQueue = [];
const BUNDLE_PATH = process.env.SUPERICONS_MATERIAL_BUNDLE_PATH
  || fileURLToPath(new URL('./material-mcp-assets.json.gz', import.meta.url));
const BUNDLE_MANIFEST_PATH = process.env.SUPERICONS_MATERIAL_BUNDLE_MANIFEST_PATH
  || fileURLToPath(new URL('./material-mcp-assets-manifest.json', import.meta.url));
let bundleState = null;
let activeSnapshotFetches = 0;
let processConcurrencyLimit = Math.max(
  1,
  Math.min(16, Number.parseInt(process.env.SUPERICONS_MATERIAL_HYDRATION_CONCURRENCY || '4', 10) || 4),
);

function loadMaterialBundle() {
  if (bundleState) return bundleState;
  if (!existsSync(BUNDLE_PATH) || !existsSync(BUNDLE_MANIFEST_PATH)) {
    bundleState = { available: false, assets: null, reason: 'bundle_missing' };
    return bundleState;
  }

  try {
    const manifest = JSON.parse(readFileSync(BUNDLE_MANIFEST_PATH, 'utf8'));
    const payload = JSON.parse(gunzipSync(readFileSync(BUNDLE_PATH)).toString('utf8'));
    if (payload.schema_version !== 1 || manifest.schema_version !== 1) {
      throw new Error('unsupported schema version');
    }
    if (payload.source_revision !== MATERIAL_EXPORT_SOURCE.ref || manifest.source_revision !== MATERIAL_EXPORT_SOURCE.ref) {
      throw new Error('source revision mismatch');
    }
    if (payload.asset_count !== 8524 || manifest.asset_count !== 8524) {
      throw new Error('asset count mismatch');
    }
    if (!payload.assets || Object.keys(payload.assets).length !== 8524) {
      throw new Error('asset map is incomplete');
    }
    bundleState = { available: true, assets: payload.assets, manifest, reason: null };
  } catch (error) {
    bundleState = {
      available: false,
      assets: null,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
  return bundleState;
}

export function getBundledMaterialSvg(iconId, variant) {
  const bundle = loadMaterialBundle();
  return bundle.available ? bundle.assets[`${variant}:${iconId}`] || null : null;
}

export function getMaterialBundleStatus() {
  const bundle = loadMaterialBundle();
  return {
    available: bundle.available,
    reason: bundle.reason,
    sourceRevision: bundle.manifest?.source_revision || null,
    assetCount: bundle.manifest?.asset_count || 0,
  };
}

function drainSnapshotQueue() {
  while (activeSnapshotFetches < processConcurrencyLimit && snapshotQueue.length > 0) {
    const queued = snapshotQueue.shift();
    activeSnapshotFetches += 1;
    Promise.resolve()
      .then(queued.task)
      .then(queued.resolve, queued.reject)
      .finally(() => {
        activeSnapshotFetches -= 1;
        drainSnapshotQueue();
      });
  }
}

function runWithProcessFetchLimit(task) {
  return new Promise((resolve, reject) => {
    snapshotQueue.push({ task, resolve, reject });
    drainSnapshotQueue();
  });
}

export function getMaterialSnapshotBaseUrl() {
  return (
    process.env.SUPERICONS_MATERIAL_SNAPSHOT_URL
    || MATERIAL_EXPORT_STORAGE.functionBaseUrl
  ).replace(/\/+$/, '');
}

export function resolveMaterialRequestVariant(style = 'any') {
  return style === 'solid' ? 'solid' : 'outline';
}

export function buildMaterialSnapshotRequestUrl(iconId, variant) {
  const preset = getMaterialMcpPreset(variant);
  const params = new URLSearchParams({
    icon: iconId,
    fill: String(preset.fill),
    wght: String(preset.wght),
    grad: String(preset.grad),
    opsz: String(preset.opsz),
  });
  return `${getMaterialSnapshotBaseUrl()}?${params.toString()}`;
}

export function clearMaterialHydrationCache() {
  svgCache.clear();
  inFlightSnapshots.clear();
}

export function setMaterialHydrationConcurrencyForTests(value) {
  if (activeSnapshotFetches > 0 || snapshotQueue.length > 0) {
    throw new Error('Cannot change Material hydration concurrency while fetches are active.');
  }
  processConcurrencyLimit = Math.max(1, Math.min(16, Number.parseInt(String(value), 10) || 1));
}

export async function fetchMaterialSnapshotSvg(iconId, variant, {
  fetchImpl = fetch,
  timeoutMs = 4000,
  assetLookup = getBundledMaterialSvg,
} = {}) {
  const cacheKey = `${iconId}|${variant}`;
  const cached = svgCache.get(cacheKey);
  if (cached) return cached;
  const bundled = typeof assetLookup === 'function' ? assetLookup(iconId, variant) : null;
  if (bundled) {
    svgCache.set(cacheKey, bundled);
    return bundled;
  }

  const pending = inFlightSnapshots.get(cacheKey);
  if (pending) return pending;

  const operation = runWithProcessFetchLimit(async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(buildMaterialSnapshotRequestUrl(iconId, variant), {
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Material snapshot request failed (${response.status}) for ${iconId} ${variant}.`);
      }
      const svg = (await response.text()).trim();
      if (!svg.startsWith('<svg')) {
        throw new Error(`Material snapshot returned non-SVG content for ${iconId} ${variant}.`);
      }
      if (svgCache.size >= CACHE_LIMIT) {
        svgCache.delete(svgCache.keys().next().value);
      }
      svgCache.set(cacheKey, svg);
      return svg;
    } finally {
      clearTimeout(timer);
    }
  });
  inFlightSnapshots.set(cacheKey, operation);
  try {
    return await operation;
  } finally {
    if (inFlightSnapshots.get(cacheKey) === operation) {
      inFlightSnapshots.delete(cacheKey);
    }
  }
}

function materialIdFromRow(row) {
  const fromIconId = String(row.icon_id || '');
  if (fromIconId.includes(':')) {
    const parts = fromIconId.split(':');
    if (parts[0] === 'material') return parts.slice(1).join(':');
  }
  const library = row.library || row.source_library;
  if (library === 'material' && row.id) return String(row.id);
  return null;
}

/**
 * Hydrates SVG-less Material rows in place and returns the rows that remain
 * deliverable. Non-material rows and already-deliverable rows pass through
 * untouched and in their original order.
 */
export async function hydrateMaterialHostedRows(rows, {
  style = 'any',
  fetchImpl = fetch,
  concurrency = 4,
  timeoutMs = 4000,
  onError = null,
  assetLookup = getBundledMaterialSvg,
} = {}) {
  const list = Array.isArray(rows) ? rows : [];
  const variant = resolveMaterialRequestVariant(style);
  const failedRows = new Set();
  const targets = [];

  for (const row of list) {
    if (!row || typeof row !== 'object') continue;
    const materialId = materialIdFromRow(row);
    if (!materialId) continue;
    const hasSvg = typeof row.svg === 'string' && row.svg.length > 0;
    if (hasSvg && variant !== 'solid') continue;
    targets.push({ row, materialId });
  }

  if (targets.length === 0) {
    return { hydrated: 0, failed: 0, kept: list };
  }

  let nextIndex = 0;
  let failed = 0;
  const workerCount = Math.max(1, Math.min(concurrency, targets.length));
  const workers = Array.from({ length: workerCount }, async () => {
    while (nextIndex < targets.length) {
      const target = targets[nextIndex];
      nextIndex += 1;
      try {
        const svg = await fetchMaterialSnapshotSvg(target.materialId, variant, {
          fetchImpl,
          timeoutMs,
          assetLookup,
        });
        target.row.svg = svg;
        target.row.style = variant === 'solid' ? 'solid' : (target.row.style || 'outline');
        target.row.icon_type = 'svg';
      } catch (error) {
        failed += 1;
        failedRows.add(target.row);
        if (typeof onError === 'function') {
          onError(error, target.row);
        }
      }
    }
  });
  await Promise.all(workers);

  return {
    hydrated: targets.length - failed,
    failed,
    kept: list.filter((row) => !failedRows.has(row)),
  };
}
