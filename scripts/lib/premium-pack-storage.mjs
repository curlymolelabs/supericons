import { access, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export const DEFAULT_SUPABASE_URL = 'https://kcjmkakdhsqplvasgkjv.supabase.co';
export const DEFAULT_STORAGE_BUCKET = 'premium-icons';
export const DEFAULT_PACK_SLUG = 'agentic-motion';

export function repoPath(...segments) {
  return path.join(REPO_ROOT, ...segments);
}

export function normalizeSupabaseUrl(value = DEFAULT_SUPABASE_URL) {
  return String(value || DEFAULT_SUPABASE_URL).replace(/\/+$/, '');
}

export function encodeStoragePath(...segments) {
  return segments.map((segment) => encodeURIComponent(segment)).join('/');
}

export function storageObjectUrl({ supabaseUrl, bucket, slug, file }) {
  const baseUrl = normalizeSupabaseUrl(supabaseUrl);
  return `${baseUrl}/storage/v1/object/${encodeStoragePath(bucket, slug, file)}`;
}

export function contentTypeFor(file) {
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  if (file.endsWith('.json')) return 'application/json; charset=utf-8';
  if (file.endsWith('.svg')) return 'image/svg+xml; charset=utf-8';
  return 'application/octet-stream';
}

export async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function buildPackInventory({
  slug = DEFAULT_PACK_SLUG,
  packDir = repoPath('public', 'packs', slug),
} = {}) {
  const manifestPath = repoPath('public', 'packs', 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const manifestEntry = manifest?.[slug] || {};
  const cssFile = manifestEntry.css || `${slug}.css`;

  const bundlePath = path.join(packDir, 'bundle.json');
  const bundle = JSON.parse(await readFile(bundlePath, 'utf8'));
  const iconNames = Object.keys(bundle.icons || {}).sort();

  const files = ['bundle.json', cssFile, ...iconNames.map((iconName) => `${iconName}.svg`)];
  const uniqueFiles = [...new Set(files)];

  return {
    slug,
    packDir,
    cssFile,
    iconNames,
    files: uniqueFiles.map((file) => ({
      name: file,
      localPath: path.join(packDir, file),
      contentType: contentTypeFor(file),
    })),
  };
}

export async function checkLocalInventory(inventory) {
  const results = [];
  for (const file of inventory.files) {
    const exists = await pathExists(file.localPath);
    const size = exists ? (await stat(file.localPath)).size : 0;
    results.push({ ...file, exists, size });
  }
  return results;
}
