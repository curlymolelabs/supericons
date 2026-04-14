import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const workspaceRoot = process.cwd();
const adminSourcePath = resolve(workspaceRoot, 'admin.html');
const publicDir = resolve(workspaceRoot, 'public');
const publicAdminPath = resolve(publicDir, 'admin.html');
const publicHeadersPath = resolve(publicDir, '_headers');
const basicAuthPassword = process.env.NETLIFY_ADMIN_BASIC_AUTH_PASS?.trim() || '';

async function ensureDir(path) {
  await mkdir(dirname(path), { recursive: true });
}

async function buildAdminHtml() {
  const html = await readFile(adminSourcePath, 'utf8');
  await ensureDir(publicAdminPath);
  await writeFile(publicAdminPath, html, 'utf8');
}

async function buildAdminHeaders() {
  if (!basicAuthPassword) {
    try {
      await rm(publicHeadersPath, { force: true });
    } catch {
      // Ignore cleanup failure when the file was not present.
    }
    console.warn('[admin-build] NETLIFY_ADMIN_BASIC_AUTH_PASS not set. Skipping admin Basic-Auth headers.');
    return;
  }

  const headers = [
    '/admin',
    `  Basic-Auth: admin:${basicAuthPassword}`,
    '  X-Robots-Tag: noindex',
    '',
    '/admin.html',
    `  Basic-Auth: admin:${basicAuthPassword}`,
    '  X-Robots-Tag: noindex',
    '',
  ].join('\n');

  await ensureDir(publicHeadersPath);
  await writeFile(publicHeadersPath, headers, 'utf8');
}

await buildAdminHtml();
await buildAdminHeaders();

console.log('Admin page prepared for public/dist publish output.');
