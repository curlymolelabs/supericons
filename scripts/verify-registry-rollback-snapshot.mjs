import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const snapshotPath = path.join(repoRoot, 'data/si-registry/archive/rollback-snapshots/latest-registry-rollback-snapshot.json');

async function hashFile(relativePath) {
  const bytes = await fs.readFile(path.join(repoRoot, relativePath));
  return {
    path: relativePath.replaceAll(path.sep, '/'),
    bytes: bytes.length,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  };
}

const snapshot = JSON.parse(await fs.readFile(snapshotPath, 'utf8'));
const failures = [];
const currentFiles = [];

for (const expected of snapshot.files || []) {
  try {
    const actual = await hashFile(expected.path);
    currentFiles.push(actual);

    if (actual.bytes !== expected.bytes || actual.sha256 !== expected.sha256) {
      failures.push({
        path: expected.path,
        expectedBytes: expected.bytes,
        actualBytes: actual.bytes,
        expectedSha256: expected.sha256,
        actualSha256: actual.sha256,
      });
    }
  } catch (error) {
    failures.push({
      path: expected.path,
      error: error.message,
    });
  }
}

const aggregateSha256 = crypto.createHash('sha256').update(JSON.stringify(currentFiles)).digest('hex');
if (aggregateSha256 !== snapshot.aggregateSha256) {
  failures.push({
    path: '(aggregate)',
    expectedSha256: snapshot.aggregateSha256,
    actualSha256: aggregateSha256,
  });
}

if (failures.length > 0) {
  console.error('verify-registry-rollback-snapshot: failed');
  console.error(JSON.stringify(failures.slice(0, 20), null, 2));
  if (failures.length > 20) {
    console.error(`... ${failures.length - 20} more failures`);
  }
  process.exit(1);
}

console.log('verify-registry-rollback-snapshot: ok');
console.log(`snapshot: ${path.relative(repoRoot, snapshotPath)}`);
console.log(`files: ${snapshot.fileCount}`);
console.log(`aggregate sha256: ${aggregateSha256}`);
