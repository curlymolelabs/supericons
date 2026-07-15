import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

import {
  MATERIAL_EXPORT_SOURCE,
  MATERIAL_MCP_PRESETS,
  buildMaterialUpstreamSnapshotUrl,
} from '../material-export.js';
import {
  checksumMaterialSvg,
  normalizeAndValidateMaterialSvg,
} from '../lib/material-asset-pipeline.js';
import { buildMaterialGstaticFallbackUrl } from '../lib/material-gstatic-fallbacks.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const REPORT_PATH = join(ROOT, 'references', 'verification', 'material-full-asset-validation-2026-07-14.json');
const BUNDLE_PATH = join(ROOT, 'mcp', 'material-mcp-assets.json.gz');
const MANIFEST_PATH = join(ROOT, 'mcp', 'material-mcp-assets-manifest.json');
const CONCURRENCY = 20;
const REQUEST_TIMEOUT_MS = 15000;
const RETRIES = 3;

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function fetchWithRetries(url) {
  let lastError = null;
  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
      if (response.ok) return response;
      lastError = new Error(`Asset source returned ${response.status}`);
      if (response.status < 500 && response.status !== 429) break;
    } catch (error) {
      lastError = error;
    }
    if (attempt < RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, Math.min(250 * (2 ** (attempt - 1)), 2000)));
    }
  }
  throw lastError || new Error('Asset source request failed');
}

function buildSourceUrl(asset) {
  const iconId = String(asset.icon_id).replace(/^material:/, '');
  if (asset.source_kind === 'checksum_pinned_gstatic') {
    return buildMaterialGstaticFallbackUrl(iconId, asset.variant);
  }
  return buildMaterialUpstreamSnapshotUrl(
    asset.source_icon_id || iconId,
    MATERIAL_MCP_PRESETS[asset.variant],
  );
}

async function mapConcurrent(items, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function runWorker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, () => runWorker()));
  return results;
}

const retained = JSON.parse(await readFile(REPORT_PATH, 'utf8'));
if (retained.source_revision !== MATERIAL_EXPORT_SOURCE.ref) {
  throw new Error('Retained validation report source revision does not match the runtime contract.');
}
if (retained.successful_assets !== 8524 || retained.failed_assets !== 0 || retained.assets?.length !== 8524) {
  throw new Error('Retained validation report does not contain the complete 8,524-asset set.');
}

let completed = 0;
const entries = await mapConcurrent(retained.assets, async (asset) => {
  const response = await fetchWithRetries(buildSourceUrl(asset));
  const svg = normalizeAndValidateMaterialSvg(await response.text());
  const checksum = checksumMaterialSvg(svg);
  if (checksum !== asset.checksum) {
    throw new Error(`Checksum mismatch for ${asset.icon_id}:${asset.variant}.`);
  }
  completed += 1;
  if (completed % 250 === 0 || completed === retained.assets.length) {
    console.log(`Material bundle assets verified: ${completed}/${retained.assets.length}`);
  }
  return [`${asset.variant}:${String(asset.icon_id).replace(/^material:/, '')}`, svg];
});

entries.sort(([left], [right]) => left.localeCompare(right));
const payload = {
  schema_version: 1,
  source_repo: retained.source_repo,
  source_revision: retained.source_revision,
  license: 'Apache-2.0',
  presets: MATERIAL_MCP_PRESETS,
  asset_count: entries.length,
  assets: Object.fromEntries(entries),
};
const serialized = Buffer.from(`${JSON.stringify(payload)}\n`, 'utf8');
const compressed = gzipSync(serialized, { level: 9, mtime: 0 });
const manifest = {
  schema_version: 1,
  source_repo: payload.source_repo,
  source_revision: payload.source_revision,
  license: payload.license,
  icon_count: new Set(entries.map(([key]) => key.slice(key.indexOf(':') + 1))).size,
  outline_count: entries.filter(([key]) => key.startsWith('outline:')).length,
  solid_count: entries.filter(([key]) => key.startsWith('solid:')).length,
  asset_count: entries.length,
  uncompressed_bytes: serialized.length,
  compressed_bytes: compressed.length,
  uncompressed_sha256: sha256(serialized),
  bundle_sha256: sha256(compressed),
  validation_report: 'references/verification/material-full-asset-validation-2026-07-14.json',
};

await mkdir(dirname(BUNDLE_PATH), { recursive: true });
await writeFile(BUNDLE_PATH, compressed);
await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ status: 'ok', bundle: BUNDLE_PATH, manifest: MANIFEST_PATH, ...manifest }, null, 2));
