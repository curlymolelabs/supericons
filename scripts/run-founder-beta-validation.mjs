// Founder beta validation runner for the Search v2 local-first prerelease.
//
// Trigger: run manually with `node scripts/run-founder-beta-validation.mjs`.
// Side effects: spawns the published @supericons/mcp@beta package over stdio and
// performs eligible English search_icons calls. The package sends its normal
// best-effort tool-outcome telemetry. Nothing is written to the repository or
// any service by this script itself.
//
// Evidence class: CONTROLLED founder validation, not organic adoption. Scripted
// runs must never be reported as organic user activity. They count toward the
// beta window only if the owner ratifies a revised gate that accepts labeled
// controlled attempts; until then this script serves the owner quality pass
// (reviewing per-query outcomes and feeding misses into the quality backlog).
//
// Usage:
//   node scripts/run-founder-beta-validation.mjs             # full pass (~70 queries)
//   node scripts/run-founder-beta-validation.mjs --quick     # first 15 queries
//   node scripts/run-founder-beta-validation.mjs --spec beta # package spec (default: beta tag)
//
// Read the results as you go: this doubles as the Appendix A owner quality pass.
// For any disappointing result, note the query, what you expected, and what came
// back, and feed it into the quality backlog.

import { spawn } from 'node:child_process';
import { once } from 'node:events';
import process from 'node:process';

const QUERIES = [
  // Brand logos, exact
  'anthropic logo', 'openai', 'vercel', 'supabase logo', 'cursor logo', 'notion', 'github', 'figma logo',
  // Brand logos, fuzzy
  'ai browser company', 'agent startup', 'code editor with ai', 'vector database company',
  // Concepts, common UI
  'settings', 'user profile', 'delete', 'upload cloud', 'dark mode', 'notification bell',
  'search', 'home', 'menu', 'close', 'checkmark', 'arrow right', 'calendar', 'clock',
  // Concepts, expressive and relatable
  'vibe coding', 'burnout', 'ship it', 'chill', 'ai slop', 'doomscrolling', 'touch grass',
  'brainstorm', 'lightbulb moment', 'celebration',
  // Actions and workflows
  'deploy to production', 'rollback', 'merge branch', 'code review', 'database backup',
  'send email', 'export data', 'import file', 'sync now', 'refresh',
  // Multi-word intent
  'icon for a page where users manage api keys', 'empty state for no search results',
  'agent thinking indicator', 'loading spinner for chat', 'button to copy code snippet',
  // Styles and modes probes
  'settings outline', 'settings solid', 'material home', 'material search',
  // Misspellings and shorthand
  'databse', 'notifcation', 'k8s', 'auth', 'config', 'repo', 'env vars',
  // Developer concepts
  'terminal', 'api endpoint', 'webhook', 'cron job', 'docker container', 'pull request',
  'unit test', 'error log', 'monitoring dashboard', 'feature flag',
];

function parseArgs(argv) {
  const quick = argv.includes('--quick');
  const specIndex = argv.indexOf('--spec');
  const spec = specIndex >= 0 ? argv[specIndex + 1] : 'beta';
  return { quick, spec };
}

function createRpcClient(child) {
  let buffer = '';
  const pending = new Map();
  child.stdout.on('data', (chunk) => {
    buffer += chunk.toString('utf8');
    let newline;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line) continue;
      let message;
      try { message = JSON.parse(line); } catch { continue; }
      if (message.id != null && pending.has(message.id)) {
        pending.get(message.id)(message);
        pending.delete(message.id);
      }
    }
  });
  let nextId = 1;
  return {
    request(method, params, timeoutMs = 30000) {
      const id = nextId++;
      const payload = { jsonrpc: '2.0', id, method, params };
      child.stdin.write(`${JSON.stringify(payload)}\n`);
      return new Promise((resolvePromise, rejectPromise) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          rejectPromise(new Error(`timeout waiting for ${method}`));
        }, timeoutMs);
        pending.set(id, (message) => {
          clearTimeout(timer);
          resolvePromise(message);
        });
      });
    },
    notify(method, params) {
      child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`);
    },
  };
}

function summarizeResult(message) {
  if (message.error) return { outcome: 'error', names: [], detail: message.error.message || 'rpc error' };
  const content = message.result?.content || [];
  const text = content.filter((c) => c.type === 'text').map((c) => c.text).join('\n');
  const names = [...text.matchAll(/"(?:icon_ref|ref|name)"\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
  if (names.length === 0) {
    const listed = [...text.matchAll(/^\s*(?:\d+\.|-)\s*`?([a-z0-9:_-]{2,60})`?/gim)].map((m) => m[1]);
    names.push(...listed);
  }
  const isZero = /no icons|no results|0 results|nothing matched/i.test(text) || names.length === 0;
  return { outcome: isZero ? 'zero' : 'results', names: names.slice(0, 3), detail: null };
}

const { quick, spec } = parseArgs(process.argv.slice(2));
const queries = quick ? QUERIES.slice(0, 15) : QUERIES;

const telemetryFlag = String(process.env.SUPERICONS_TELEMETRY || '').trim().toLowerCase();
const telemetrySuppressed = Boolean(process.env.SUPERICONS_DISABLE_TELEMETRY)
  || Boolean(process.env.DO_NOT_TRACK)
  || ['0', 'false', 'off', 'disabled'].includes(telemetryFlag);
if (telemetrySuppressed) {
  console.error('Telemetry is disabled by environment (SUPERICONS_DISABLE_TELEMETRY, SUPERICONS_TELEMETRY, or DO_NOT_TRACK). This pass would record nothing; unset those first.');
  process.exit(1);
}

console.log(`Launching @supericons/mcp@${spec} over stdio (telemetry on, this pass counts toward the window)...`);
const child = spawn(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['-y', `@supericons/mcp@${spec}`],
  { stdio: ['pipe', 'pipe', 'inherit'], shell: process.platform === 'win32' },
);
child.on('exit', (code) => {
  if (code) console.error(`server exited with code ${code}`);
});

const rpc = createRpcClient(child);
const init = await rpc.request('initialize', {
  protocolVersion: '2024-11-05',
  capabilities: {},
  clientInfo: { name: 'supericons-founder-validation', version: '1.0.0' },
});
const serverVersion = init.result?.serverInfo?.version || 'unknown';
console.log(`Connected. Server version: ${serverVersion}`);
if (!String(serverVersion).includes('beta') && spec === 'beta') {
  console.error('Warning: resolved server version does not look like the beta prerelease.');
}
rpc.notify('notifications/initialized', {});

let attempts = 0;
let zeros = 0;
let errors = 0;
const zeroQueries = [];
for (const query of queries) {
  const started = Date.now();
  let summary;
  try {
    const message = await rpc.request('tools/call', {
      name: 'search_icons',
      arguments: { query, limit: 6 },
    });
    summary = summarizeResult(message);
  } catch (error) {
    summary = { outcome: 'error', names: [], detail: error.message };
  }
  attempts += 1;
  if (summary.outcome === 'zero') { zeros += 1; zeroQueries.push(query); }
  if (summary.outcome === 'error') { errors += 1; }
  const elapsed = Date.now() - started;
  const top = summary.names.length ? summary.names.join(', ') : (summary.detail || 'none');
  console.log(`${String(attempts).padStart(3)}. [${summary.outcome.padEnd(7)}] ${elapsed}ms  ${query}  ->  ${top}`);
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 800));
}

console.log('\nPass complete.');
console.log(`Attempts: ${attempts}, results: ${attempts - zeros - errors}, zero: ${zeros}, errors: ${errors}`);
if (zeroQueries.length) {
  console.log('Zero-result queries (feed these into the quality backlog):');
  for (const q of zeroQueries) console.log(`  - ${q}`);
}
console.log('\nThese are controlled founder-validation attempts, not organic adoption.');
console.log('They close the beta window only under a ratified revised gate that accepts labeled controlled evidence.');
console.log('Telemetry is best-effort; verify recorded totals in mcp_usage_events before reporting any counts.');

child.kill();
process.exit(0);
