import { createServer } from 'node:http';
import { convertPngToSvgProof } from './service.mjs';

const PORT = Number.parseInt(process.env.PORT || process.env.CONVERTER_PROOF_PORT || '4318', 10);
const HOST = process.env.CONVERTER_PROOF_HOST || (process.env.PORT ? '0.0.0.0' : '127.0.0.1');

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks).toString('utf8');
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error('Invalid JSON body.'));
      }
    });
    req.on('error', reject);
  });
}

const server = createServer(async (req, res) => {
  if (!req.url) {
    sendJson(res, 400, { error: 'Missing request URL.' });
    return;
  }

  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    sendJson(res, 200, {
      ok: true,
      service: 'converter-proof-service',
      endpoint: '/api/convert/png-to-svg',
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/convert/png-to-svg') {
    try {
      const payload = await readJsonBody(req);
      const result = await convertPngToSvgProof(payload);
      sendJson(res, 200, result);
    } catch (error) {
      sendJson(res, 400, {
        error: error instanceof Error ? error.message : 'Conversion failed.',
      });
    }
    return;
  }

  sendJson(res, 404, {
    error: 'Not found.',
    availableRoutes: ['GET /health', 'POST /api/convert/png-to-svg'],
  });
});

server.listen(PORT, HOST, () => {
  console.log(`converter-proof-service listening on http://${HOST}:${PORT}`);
});
