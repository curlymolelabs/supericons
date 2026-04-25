import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

test('capture dry run lists MingCute targets', () => {
  const output = execFileSync(
    'node',
    ['scripts/capture-icon-screenshots.mjs', '--library', 'mingcute', '--dry-run', '--limit', '2'],
    { encoding: 'utf8' }
  );

  const parsed = JSON.parse(output);
  assert.equal(parsed.library, 'mingcute');
  assert.equal(parsed.targets.length, 2);
});
