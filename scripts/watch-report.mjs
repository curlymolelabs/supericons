/* Bridge watch report: ONE fixed command for the scheduled watch task.
   Prints everything the watch needs; the task model interprets stdout and
   runs nothing else. Read-only: never writes, commits, or messages.
   Run via: npm run watch:report */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const mainRepo = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const base = path.dirname(mainRepo);
const bridge = path.join(base, 'supericons-bridge');
const v2 = path.join(base, 'supericons-v2');

const out = [];
const section = (t) => out.push('', '=== ' + t + ' ===');

/* pause state */
const stopFiles = fs.readdirSync(path.join(bridge, 'inbox-auditor'))
  .filter(f => f.includes('STOP'));
const paused = stopFiles.length > 0;
section('PAUSE STATE');
out.push(paused
  ? 'BRIDGE PAUSED by owner (' + stopFiles.join(', ') + '). Watch reports state only; nothing may act.'
  : 'bridge active');

/* bridge activity */
section('BRIDGE LOG TAIL (last 5)');
const log = fs.readFileSync(path.join(bridge, 'log.jsonl'), 'utf8')
  .trim().split('\n').slice(-5);
for (const line of log) {
  try {
    const j = JSON.parse(line);
    out.push(`${j.seq} ${j.from} -> ${j.to || '?'} [${j.type}] ${j.summary.slice(0, 140)}`);
  } catch { out.push('(unparseable line)'); }
}

section('INBOX-COORDINATOR FILES');
for (const f of fs.readdirSync(path.join(bridge, 'inbox-coordinator')).sort()) out.push(f);

/* highest seq vs last coordinator-processed marker: the task model compares */
section('COORDINATOR SENT LEDGER TAIL (last 3)');
out.push(...fs.readFileSync(path.join(bridge, 'coordinator-sent.log'), 'utf8')
  .trim().split('\n').slice(-3));

/* v2 health */
const run = (cmd, args, cwd, useShell = false) => {
  /* shell only where Windows needs it (npm.cmd); git runs shell-free so
     spaced paths survive as real argv entries */
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', shell: useShell });
  return { code: r.status, tail: ((r.stdout || '') + (r.stderr || '')).trim().split('\n').slice(-4).join(' | ') };
};
section('V2 GATES');
const verify = run('npm', ['run', '--silent', 'verify'], v2, true);
out.push('verify: exit ' + verify.code + ' :: ' + verify.tail);
const check = run('npm', ['run', '--silent', 'check:repo'], v2, true);
out.push('check:repo: exit ' + check.code + ' :: ' + check.tail);

section('GIT STATUS');
for (const [label, repo] of [['v2', v2], ['main', mainRepo]]) {
  const s = run('git', ['-C', repo, 'status', '--porcelain'], base);
  const h = run('git', ['-C', repo, 'log', '-1', '--format=%h %s'], base);
  out.push(`${label}: ${s.tail === '' && s.code === 0 ? 'clean' : (s.tail || 'exit ' + s.code)} @ ${h.tail}`);
}

console.log(out.join('\n').trim());
