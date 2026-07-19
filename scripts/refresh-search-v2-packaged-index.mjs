import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const generatedAtFlag = process.argv.indexOf('--generated-at');
const generatedAt = generatedAtFlag >= 0 ? process.argv[generatedAtFlag + 1] : '';

assert.ok(generatedAt, 'Pass --generated-at with a pinned ISO timestamp.');
assert.equal(
  new Date(generatedAt).toISOString(),
  generatedAt,
  'The pinned timestamp must use the exact ISO UTC format.',
);

const pairs = [
  {
    label: 'outline',
    publicPath: join(repoRoot, 'public', 'icon-index.json'),
    packagePath: join(repoRoot, 'mcp', 'public', 'icon-index.json'),
  },
  {
    label: 'solid',
    publicPath: join(repoRoot, 'public', 'icon-index-solid.json'),
    packagePath: join(repoRoot, 'mcp', 'public', 'icon-index-solid.json'),
  },
];

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function payloadJson(index) {
  const payload = { ...index };
  delete payload.generatedAt;
  return JSON.stringify(payload);
}

const results = [];

for (const pair of pairs) {
  const publicBytes = readFileSync(pair.publicPath);
  const packageBytes = readFileSync(pair.packagePath);
  assert.deepEqual(
    packageBytes,
    publicBytes,
    `${pair.label} public and packaged indexes must match before refresh.`,
  );

  const before = JSON.parse(publicBytes.toString('utf8'));
  const beforePayload = payloadJson(before);
  const beforePayloadHash = hash(beforePayload);
  const refreshed = {
    ...before,
    generatedAt,
  };
  const refreshedBytes = Buffer.from(JSON.stringify(refreshed));

  writeFileSync(pair.publicPath, refreshedBytes);
  writeFileSync(pair.packagePath, refreshedBytes);

  const afterPublicBytes = readFileSync(pair.publicPath);
  const afterPackageBytes = readFileSync(pair.packagePath);
  const after = JSON.parse(afterPublicBytes.toString('utf8'));

  assert.deepEqual(
    afterPackageBytes,
    afterPublicBytes,
    `${pair.label} public and packaged indexes must match after refresh.`,
  );
  assert.equal(after.generatedAt, generatedAt);
  assert.equal(
    hash(payloadJson(after)),
    beforePayloadHash,
    `${pair.label} icon payload changed during timestamp refresh.`,
  );

  results.push({
    index: pair.label,
    icon_count: Array.isArray(after.icons) ? after.icons.length : 0,
    previous_generated_at: before.generatedAt,
    generated_at: after.generatedAt,
    payload_sha256: beforePayloadHash,
    output_sha256: hash(afterPublicBytes),
    public_path: relative(repoRoot, pair.publicPath).replaceAll('\\', '/'),
    package_path: relative(repoRoot, pair.packagePath).replaceAll('\\', '/'),
  });
}

console.log(JSON.stringify({
  status: 'ok',
  operation: 'timestamp_only_index_refresh',
  generated_at: generatedAt,
  indexes: results,
}, null, 2));
