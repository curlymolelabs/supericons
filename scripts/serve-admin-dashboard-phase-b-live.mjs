import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 4178;
const ADMIN_API_URL = 'https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/admin-api';
const RUNTIME_SCRIPT = '<script>window.__SI_ADMIN_RUNTIME__=Object.freeze({apiBase:"/api/admin",managedAuth:true});</script>';
const SCRIPT_MARKER = '<script src="/admin-app.js"></script>';
const MAX_SESSION_BODY_BYTES = 8192;
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
  if (pathname === '/brand/supericons-logo.svg') return resolve(root, 'brand', 'supericons-logo.svg');
  if (!pathname.startsWith('/assets/')) return null;
  const candidate = resolve(root, pathname.replace(/^\/+/, ''));
  const assetsPrefix = `${resolve(root, 'assets')}${sep}`;
  return candidate.startsWith(assetsPrefix) ? candidate : null;
}

async function readRequestBody(request, maxBytes = Number.POSITIVE_INFINITY) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > maxBytes) {
      const error = new Error('Request body is too large.');
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

async function validateAdminSecret(secret, adminApiUrl) {
  let upstream;
  try {
    upstream = await fetch(new URL('_local-auth-check', `${adminApiUrl}/`), {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'x-admin-secret': secret,
      },
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error('The live admin API could not be reached.');
  }

  if (upstream.status === 401 || upstream.status === 403) return false;
  if (upstream.ok || upstream.status === 404) return true;
  throw new Error('The live admin API could not confirm the secret.');
}

async function handleAdminSession(request, response, session, adminApiUrl) {
  if (request.method === 'GET') {
    sendJson(response, 200, { authenticated: Boolean(session.secret) });
    return;
  }

  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'Method not allowed.' });
    return;
  }

  if (!String(request.headers['content-type'] || '').toLowerCase().startsWith('application/json')) {
    sendJson(response, 415, { error: 'Send the admin secret as JSON.' });
    return;
  }

  let body;
  try {
    const payload = await readRequestBody(request, MAX_SESSION_BODY_BYTES);
    body = JSON.parse(payload?.toString('utf8') || '{}');
  } catch (error) {
    sendJson(response, Number(error?.status) || 400, {
      error: Number(error?.status) === 413 ? error.message : 'The sign-in request is not valid.',
    });
    return;
  }

  const candidate = String(body?.secret || '').trim();
  if (!candidate) {
    sendJson(response, 400, { error: 'Enter the current admin secret.' });
    return;
  }

  try {
    if (!(await validateAdminSecret(candidate, adminApiUrl))) {
      session.secret = '';
      sendJson(response, 403, { error: 'That admin secret was rejected.' });
      return;
    }
  } catch (error) {
    sendJson(response, 502, { error: error.message });
    return;
  }

  session.secret = candidate;
  sendJson(response, 200, { authenticated: true });
}

async function proxyAdminRequest(request, response, session, requestUrl, adminApiUrl) {
  if (!session.secret) {
    sendJson(response, 401, { error: 'Enter the current admin secret to continue.' });
    return;
  }

  const targetPath = requestUrl.pathname.replace(/^\/api\/admin/, '') || '/';
  const target = new URL(`${adminApiUrl}${targetPath}${requestUrl.search}`);
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
        'x-admin-secret': session.secret,
      },
      signal: AbortSignal.timeout(60000),
    });
  } catch {
    sendJson(response, 502, { error: 'The live admin API could not be reached.' });
    return;
  }

  if (upstream.status === 401 || upstream.status === 403) session.secret = '';
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
  adminApiUrl = ADMIN_API_URL,
  adminSecret = '',
  host = DEFAULT_HOST,
  managedAuth = true,
  port = Number(process.env.ADMIN_PHASE_B_PORT || DEFAULT_PORT),
  root = process.cwd(),
} = {}) {
  const session = { secret: String(adminSecret || '').trim() };
  const resolvedAdminApiUrl = String(adminApiUrl || ADMIN_API_URL).replace(/\/+$/, '');

  const server = createServer(async (request, response) => {
    const requestUrl = new URL(request.url || '/', `http://${request.headers.host || host}`);
    const requestOrigin = String(request.headers.origin || '');
    if (requestOrigin && requestOrigin !== requestUrl.origin) {
      sendJson(response, 403, { error: 'Cross-site requests are not allowed.' });
      return;
    }
    if (requestUrl.pathname === '/api/admin/session') {
      if (!managedAuth) {
        sendJson(response, 404, { error: 'Not found.' });
        return;
      }
      await handleAdminSession(request, response, session, resolvedAdminApiUrl);
      return;
    }
    if (requestUrl.pathname === '/api/admin' || requestUrl.pathname.startsWith('/api/admin/')) {
      await proxyAdminRequest(request, response, session, requestUrl, resolvedAdminApiUrl);
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
