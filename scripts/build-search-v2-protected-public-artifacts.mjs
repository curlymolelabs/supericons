import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { minify } from 'terser';

const args = process.argv.slice(2);
const repoRoot = resolve(import.meta.dirname, '..');
const defaultPrivateRecord = process.env.LOCALAPPDATA
  ? join(process.env.LOCALAPPDATA, 'Supericons', 'private', 'search-v2-engine-canaries.json')
  : join(homedir(), '.supericons', 'private', 'search-v2-engine-canaries.json');

function getArgument(name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}

function sha256Buffer(value) {
  return createHash('sha256').update(value).digest('hex');
}

function sha256File(path) {
  return sha256Buffer(readFileSync(path));
}

function normalizePrivateRecord(value) {
  assert.equal(value.schema_version, 1);
  assert.match(value.record_id, /^[0-9a-f-]{36}$/i);
  assert.match(value.commitment_nonce, /^[a-f0-9]{64}$/);
  assert.ok(Array.isArray(value.entries) && value.entries.length >= 3);
  const aliases = new Set();
  for (const entry of value.entries) {
    assert.match(entry.surface, /^(npm_and_web)$/);
    assert.match(entry.target, /^[a-z][a-z0-9_-]{1,40}$/);
    assert.match(entry.alias, /^[a-z][a-z0-9 ]{8,80}$/);
    assert.equal(aliases.has(entry.alias), false);
    aliases.add(entry.alias);
  }
  return value;
}

function readPrivateRecord(path) {
  if (!existsSync(path)) {
    throw new Error(`Private canary record is missing at ${path}. Release verification fails closed.`);
  }
  return normalizePrivateRecord(JSON.parse(readFileSync(path, 'utf8')));
}

function createPrivateRecord(path) {
  if (existsSync(path)) {
    throw new Error(`Private canary record already exists at ${path}. Refusing to replace it.`);
  }
  const words = [
    'amber', 'atlas', 'cedar', 'cobalt', 'coral', 'drift', 'ember', 'fern',
    'harbor', 'lantern', 'lilac', 'meadow', 'orbit', 'pebble', 'quiet',
    'ripple', 'signal', 'silver', 'velvet', 'willow',
  ];
  const targets = ['settings', 'database', 'star'];
  const randomWord = () => words[randomBytes(1)[0] % words.length];
  const used = new Set();
  const entries = targets.map((target) => {
    let alias;
    do {
      alias = `${randomWord()} ${randomWord()} ${randomWord()}`;
    } while (used.has(alias));
    used.add(alias);
    return { surface: 'npm_and_web', target, alias };
  });
  const record = {
    schema_version: 1,
    record_id: randomUUID(),
    commitment_nonce: randomBytes(32).toString('hex'),
    created_at_utc: new Date().toISOString(),
    entries,
  };
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
  });
  return {
    status: 'created',
    private_record_path: path,
    private_record_sha256: sha256File(path),
    canary_count: entries.length,
  };
}

function copyPackageSource(sourceRoot, targetRoot) {
  cpSync(join(sourceRoot, 'mcp'), targetRoot, {
    recursive: true,
    filter: (source) => !source.split(sep).includes('node_modules'),
  });
}

function injectCanaries(path, record) {
  const synonyms = JSON.parse(readFileSync(path, 'utf8'));
  for (const entry of record.entries) {
    assert.ok(Array.isArray(synonyms[entry.target]), `Canary target ${entry.target} is absent.`);
    assert.equal(synonyms[entry.target].includes(entry.alias), false);
    synonyms[entry.target].push(entry.alias);
  }
  writeFileSync(path, JSON.stringify(synonyms), 'utf8');
}

function normalizeTimestamps(root) {
  const fixedTime = new Date('2000-01-01T00:00:00.000Z');
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) normalizeTimestamps(path);
    utimesSync(path, fixedTime, fixedTime);
  }
  utimesSync(root, fixedTime, fixedTime);
}

async function minifyGeneratedModules(sourceRoot, packageRoot, webRoot, policy) {
  const reports = [];
  for (const relativePath of policy.minified_generated_modules) {
    const packagePath = join(packageRoot, relativePath);
    const packageSource = readFileSync(packagePath, 'utf8');
    const packageResult = await minify(packageSource, {
      module: true,
      compress: true,
      mangle: true,
      format: { comments: false },
      sourceMap: false,
    });
    assert.ok(packageResult.code);
    writeFileSync(packagePath, `${packageResult.code}\n`, 'utf8');

    const sourceName = relativePath.replace(/^runtime\//, '');
    const webSourcePath = join(sourceRoot, 'lib', sourceName);
    const webTargetPath = join(webRoot, 'runtime', sourceName);
    const webSource = readFileSync(webSourcePath, 'utf8');
    const webResult = await minify(webSource, {
      module: true,
      compress: true,
      mangle: true,
      format: { comments: false },
      sourceMap: false,
    });
    assert.ok(webResult.code);
    mkdirSync(dirname(webTargetPath), { recursive: true });
    writeFileSync(webTargetPath, `${webResult.code}\n`, 'utf8');
    reports.push({
      path: relativePath,
      package_source_bytes: Buffer.byteLength(packageSource),
      package_staged_bytes: Buffer.byteLength(packageResult.code),
      web_source_bytes: Buffer.byteLength(webSource),
      web_staged_bytes: Buffer.byteLength(webResult.code),
    });
  }
  return reports;
}

async function build() {
  const sourceRoot = resolve(getArgument('--source-root', repoRoot));
  const outputRoot = resolve(getArgument('--output-root'));
  const privateRecordPath = resolve(getArgument('--private-record', defaultPrivateRecord));
  const expectedRecordHash = getArgument('--expected-record-sha256');
  assert.ok(outputRoot, '--output-root is required.');
  const record = readPrivateRecord(privateRecordPath);
  const recordHash = sha256File(privateRecordPath);
  if (expectedRecordHash) assert.equal(recordHash, expectedRecordHash);
  const policy = JSON.parse(readFileSync(
    join(sourceRoot, 'data', 'search-intent-graph', 'public-bundle-policy.json'),
    'utf8',
  ));

  rmSync(outputRoot, { recursive: true, force: true });
  const packageRoot = join(outputRoot, 'npm');
  const webRoot = join(outputRoot, 'web');
  mkdirSync(packageRoot, { recursive: true });
  mkdirSync(webRoot, { recursive: true });
  copyPackageSource(sourceRoot, packageRoot);

  injectCanaries(join(packageRoot, 'public', 'synonyms.json'), record);
  cpSync(join(sourceRoot, 'public', 'synonyms.json'), join(webRoot, 'synonyms.json'));
  injectCanaries(join(webRoot, 'synonyms.json'), record);
  cpSync(join(sourceRoot, 'public', 'search-engine-license.txt'), join(webRoot, 'search-engine-license.txt'));
  cpSync(join(sourceRoot, 'public', 'third-party-notices.md'), join(webRoot, 'third-party-notices.md'));

  const minification = await minifyGeneratedModules(
    sourceRoot,
    packageRoot,
    webRoot,
    policy,
  );
  normalizeTimestamps(packageRoot);
  normalizeTimestamps(webRoot);
  const report = {
    schema_version: 1,
    status: 'ok',
    source_root_commit: getArgument('--source-commit', null),
    private_record_sha256: recordHash,
    canary_count: record.entries.length,
    npm_root: relative(outputRoot, packageRoot).replaceAll(sep, '/'),
    web_root: relative(outputRoot, webRoot).replaceAll(sep, '/'),
    minification,
  };
  writeFileSync(join(outputRoot, 'protected-build-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

if (args.includes('--init-private-record')) {
  console.log(JSON.stringify(createPrivateRecord(
    resolve(getArgument('--private-record', defaultPrivateRecord)),
  ), null, 2));
} else {
  await build();
}
