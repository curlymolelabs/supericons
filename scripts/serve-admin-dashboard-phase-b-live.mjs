import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 4178;
const ADMIN_API_URL = 'https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/admin-api';
const RUNTIME_SCRIPT = '<script>window.__SI_ADMIN_RUNTIME__=Object.freeze({apiBase:"/api/admin",managedAuth:true});</script>';
const SCRIPT_MARKER = '<script src="/admin-app.js"></script>';
const CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(payload));
}

function staticPathFor(root, pathname) {
  if (pathname === '/' || pathname === '/admin' || pathname === '/admin.html') return resolve(root, 'admin.html');
  if (pathname === '/admin-app.js') return resolve(root, 'public', 'admin-app.js');
  if (!pathname.startsWith('/assets/')) return null;
  const candidate = resolve(root, pathname.replace(/^\/+/, ''));
  const assetsPrefix = `${resolve(root, 'assets')}${sep}`;
  return candidate.startsWith(assetsPrefix) ? candidate : null;
}

async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

async function proxyAdminRequest(request, response, secret, requestUrl) {
  const targetPath = requestUrl.pathname.replace(/^\/api\/admin/, '') || '/';
  const target = new URL(`${ADMIN_API_URL}${targetPath}${requestUrl.search}`);
  const body = request.method === 'GET' || request.method === 'HEAD'
    ? undefined
    : await readRequestBody(request);

  let upstream;
  try {
    upstream = await fetch(target, {
      method: request.method,
      body,
      cache: 'no-store',
      headers: {
        Accept: request.headers.accept || 'application/json',
        'Content-Type': request.headers['content-type'] || 'application/json',
        'x-admin-secret': secret,
      },
      signal: AbortSignal.timeout(60000),
    });
  } catch {
    sendJson(response, 502, { error: 'The live admin API could not be reached.' });
    return;
  }

  const payload = Buffer.from(await upstream.arrayBuffer());
  response.writeHead(upstream.status, {
    'Cache-Control': 'no-store',
    'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream',
  });
  response.end(payload);
}

async function serveStaticFile(response, root, pathname, managedAuth) {
  const filePath = staticPathFor(root, pathname);
  if (!filePath) {
    sendJson(response, 404, { error: 'Not found.' });
    return;
  }

  try {
    let payload = await readFile(filePath);
    const extension = extname(filePath).toLowerCase();
    if (extension === '.html' && managedAuth) {
      const html = payload.toString('utf8');
      if (!html.includes(SCRIPT_MARKER)) {
        throw new Error('The admin script marker is missing.');
      }
      payload = Buffer.from(html.replace(SCRIPT_MARKER, `${RUNTIME_SCRIPT}\n${SCRIPT_MARKER}`));
    }
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': CONTENT_TYPES[extension] || 'application/octet-stream',
    });
    response.end(payload);
  } catch {
    sendJson(response, 404, { error: 'Not found.' });
  }
}

export async function startAdminDashboardPhaseBLiveServer({
  adminSecret = process.env.ADMIN_SECRET || '',
  host = DEFAULT_HOST,
  managedAuth = true,
  port = Number(process.env.ADMIN_PHASE_B_PORT || DEFAULT_PORT),
  root = process.cwd(),
} = {}) {
  const secret = String(adminSecret || '').trim();
  if (!secret) {
    throw new Error('ADMIN_SECRET is required in the process environment.');
  }

  const server = createServer(async (request, response) => {
    const requestUrl = new URL(request.url || '/', `http://${request.headers.host || host}`);
    const requestOrigin = String(request.headers.origin || '');
    if (requestOrigin && requestOrigin !== requestUrl.origin) {
      sendJson(response, 403, { error: 'Cross-site requests are not allowed.' });
      return;
    }
    if (requestUrl.pathname === '/api/admin' || requestUrl.pathname.startsWith('/api/admin/')) {
      await proxyAdminRequest(request, response, secret, requestUrl);
      return;
    }
    await serveStaticFile(response, root, requestUrl.pathname, managedAuth);
  });

  await new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(port, host, resolveListen);
  });

  const address = server.address();
  const activePort = typeof address === 'object' && address ? address.port : port;
  return {
    close: () => new Promise((resolveClose, rejectClose) => {
      server.close((error) => (error ? rejectClose(error) : resolveClose()));
    }),
    host,
    port: activePort,
    url: `http://${host}:${activePort}/admin`,
  };
}

const isMain = process.argv[1]
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMain) {
  const dashboard = await startAdminDashboardPhaseBLiveServer();
  console.log(`Admin dashboard ready at ${dashboard.url}`);
}
