#!/usr/bin/env node
// Icon Lab save-back server (PRD Phase A2).
// Serves the generated Lab page and writes tuned records straight back into
// the design JSON files, then re-verifies. Local tool only.
// Usage: node scripts/icon-lab-serve.mjs   ->  http://127.0.0.1:5199
import http from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { validateDesignRecord } from '../lib/si-registry/design-record-shape.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const designDir = join(root, 'data', 'si-registry', 'source', 'design');
const draftsDir = join(designDir, 'drafts');
const setsDir = join(designDir, 'sets');
const PORT = 5199;

const rebuild = () => execFileSync(process.execPath, [join(root, 'scripts', 'build-icon-lab.mjs')], { stdio: 'pipe' });
const rebuildCreator = () => execFileSync(process.execPath, [join(root, 'scripts', 'build-icon-creator.mjs')], { stdio: 'pipe' });
const verify = () => {
  try {
    execFileSync(process.execPath, [join(root, 'scripts', 'verify-design-records.mjs')], { stdio: 'pipe' });
    return true;
  } catch { return false; }
};

function saveRecord(file, record) {
  delete record.__file;
  if (file === 'local') {
    // drafts are incomplete by design (soul pending); stored outside the verified dir
    if (!existsSync(draftsDir)) mkdirSync(draftsDir, { recursive: true });
    const path = join(draftsDir, 'agent-pulse-lab-drafts.json');
    const doc = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : { pack_id: 'agent-pulse', note: 'Icon Lab drafts: complete souls, then move into a batch file.', records: [] };
    const i = doc.records.findIndex((r) => r.icon_id === record.icon_id);
    if (i >= 0) doc.records[i] = record; else doc.records.push(record);
    writeFileSync(path, JSON.stringify(doc, null, 2) + '\n');
    return { ok: true, verified: 'drafts are not schema-verified', file: 'drafts/agent-pulse-lab-drafts.json' };
  }
  const path = join(designDir, file);
  const doc = JSON.parse(readFileSync(path, 'utf8'));
  const i = doc.records.findIndex((r) => r.icon_id === record.icon_id);
  if (i < 0) return { ok: false, error: `${record.icon_id} not found in ${file}` };
  validateDesignRecord(record); // throws with a useful message on shape problems
  doc.records[i] = record;
  writeFileSync(path, JSON.stringify(doc, null, 2) + '\n');
  const verified = verify();
  return { ok: true, verified, file };
}

const server = http.createServer((req, res) => {
  const done = (code, body) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
  if (req.method === 'GET' && (req.url === '/' || req.url.startsWith('/index'))) {
    // the universal creator is the front door
    try { rebuildCreator(); } catch (e) { return done(500, { error: 'creator rebuild failed: ' + e.message }); }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(readFileSync(join(root, 'mockups', 'si-icon-creator.html'), 'utf8'));
  }
  if (req.method === 'GET' && req.url.startsWith('/pack')) {
    // the Agent Pulse record lab stays reachable for pack 2 gating
    try { rebuild(); } catch (e) { return done(500, { error: 'lab rebuild failed: ' + e.message }); }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(readFileSync(join(root, 'mockups', 'si-icon-lab.html'), 'utf8'));
  }
  if (req.method === 'POST' && req.url === '/api/save-set') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      try {
        const { set, record, profile } = JSON.parse(body);
        const setId = (set === 'examples' ? 'my-set' : set) || 'my-set';
        if (!existsSync(setsDir)) mkdirSync(setsDir, { recursive: true });
        const path = join(setsDir, setId + '.json');
        const doc = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : { set_id: setId, profile: profile || {}, records: [] };
        if (profile) doc.profile = profile;
        delete record.__set;
        const i = doc.records.findIndex((r) => r.icon_id === record.icon_id);
        if (i >= 0) doc.records[i] = record; else doc.records.push(record);
        writeFileSync(path, JSON.stringify(doc, null, 2) + '\n');
        console.log(`save-set ${record.icon_id} -> sets/${setId}.json`);
        done(200, { ok: true, file: setId + '.json' });
      } catch (e) { done(400, { ok: false, error: e.message }); }
    });
    return;
  }
  if (req.method === 'POST' && req.url === '/api/save') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      try {
        const { file, record } = JSON.parse(body);
        const result = saveRecord(file, record);
        console.log(`save ${record.icon_id} -> ${result.file || file} verified=${result.verified}`);
        done(result.ok ? 200 : 400, result);
      } catch (e) { done(400, { ok: false, error: e.message }); }
    });
    return;
  }
  done(404, { error: 'not found' });
});

server.listen(PORT, '127.0.0.1', () => console.log(`Icon Lab: http://127.0.0.1:${PORT} (records save directly to data/si-registry/source/design)`));
