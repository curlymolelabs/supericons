import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

test('status command prints screenshot quality state counts', () => {
  const output = execFileSync(
    'node',
    ['scripts/screenshot-quality-workflow.mjs', 'status', '--library', 'mingcute', '--json'],
    { encoding: 'utf8' }
  );

  const parsed = JSON.parse(output);
  assert.equal(parsed.library, 'mingcute');
  assert.equal(typeof parsed.counts.completed_live, 'number');
  assert.equal(typeof parsed.counts.reviewed_pending, 'number');
  assert.equal(typeof parsed.counts.untouched, 'number');
});
