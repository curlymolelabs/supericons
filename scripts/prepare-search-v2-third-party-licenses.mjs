import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { basename, join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const packageLock = JSON.parse(readFileSync(join(repoRoot, 'package-lock.json'), 'utf8'));
const outputRoot = join(repoRoot, 'mcp', 'THIRD_PARTY_LICENSES');
const provenancePath = join(repoRoot, 'mcp', 'THIRD_PARTY_PROVENANCE.json');
const materialRevision = '30f8fddd293b1f0189896dc4aaecdfaba1d37ae0';

const npmSources = [
  {
    id: 'lucide',
    display_name: 'Lucide Static',
    package_name: 'lucide-static',
    repository: 'https://github.com/lucide-icons/lucide',
    license_spdx: 'ISC AND MIT',
    license_source_file: 'LICENSE',
  },
  {
    id: 'tabler',
    display_name: 'Tabler Icons',
    package_name: '@tabler/icons',
    repository: 'https://github.com/tabler/tabler-icons',
    license_spdx: 'MIT',
    license_source_file: 'LICENSE',
  },
  {
    id: 'phosphor',
    display_name: 'Phosphor Icons Core',
    package_name: '@phosphor-icons/core',
    repository: 'https://github.com/phosphor-icons/core',
    license_spdx: 'MIT',
    license_source_file: 'LICENSE',
  },
  {
    id: 'heroicons',
    display_name: 'Heroicons',
    package_name: 'heroicons',
    repository: 'https://github.com/tailwindlabs/heroicons',
    license_spdx: 'MIT',
    license_source_file: 'LICENSE',
  },
  {
    id: 'bootstrap-icons',
    display_name: 'Bootstrap Icons',
    package_name: 'bootstrap-icons',
    repository: 'https://github.com/twbs/icons',
    license_spdx: 'MIT',
    license_source_file: 'LICENSE',
  },
  {
    id: 'ionicons',
    display_name: 'Ionicons',
    package_name: 'ionicons',
    repository: 'https://github.com/ionic-team/ionicons',
    license_spdx: 'MIT',
    license_source_file: 'LICENSE',
  },
  {
    id: 'iconoir',
    display_name: 'Iconoir',
    package_name: 'iconoir',
    repository: 'https://github.com/iconoir-icons/iconoir',
    license_spdx: 'MIT',
    license_source_file: 'LICENSE',
  },
  {
    id: 'mingcute',
    display_name: 'MingCute',
    package_name: 'mingcute_icon',
    repository: 'https://github.com/Richard9394/MingCute',
    license_spdx: 'Apache-2.0',
    license_source_file: 'LICENSE',
  },
  {
    id: 'simple-icons',
    display_name: 'Simple Icons',
    package_name: 'simple-icons',
    repository: 'https://github.com/simple-icons/simple-icons',
    license_spdx: 'CC0-1.0',
    license_source_file: 'LICENSE.md',
  },
  {
    id: 'feather',
    display_name: 'Feather Icons',
    package_name: 'feather-icons',
    repository: 'https://github.com/feathericons/feather',
    license_spdx: 'MIT',
    license_source_file: 'LICENSE',
  },
];

function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function sha256TextFile(path) {
  const normalized = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

function licenseOutputName(id, sourceName) {
  return `${id}-${basename(sourceName).replace(/\.md$/i, '')}.txt`;
}

function findNoticeFile(packageRoot) {
  for (const name of ['NOTICE', 'NOTICE.txt', 'NOTICE.md']) {
    const path = join(packageRoot, name);
    if (existsSync(path)) return path;
  }
  return null;
}

rmSync(outputRoot, { recursive: true, force: true });
mkdirSync(outputRoot, { recursive: true });

const materialLicenseUrl =
  `https://raw.githubusercontent.com/google/material-design-icons/${materialRevision}/LICENSE`;
const materialResponse = await fetch(materialLicenseUrl);
assert.equal(materialResponse.ok, true, `Material license download failed with ${materialResponse.status}`);
const materialLicensePath = join(outputRoot, 'material-LICENSE.txt');
writeFileSync(materialLicensePath, await materialResponse.text(), 'utf8');
const materialNoticeUrl =
  `https://raw.githubusercontent.com/google/material-design-icons/${materialRevision}/NOTICE`;
const materialNoticeResponse = await fetch(materialNoticeUrl);
assert.equal(materialNoticeResponse.status, 404, 'Unexpected Material NOTICE state at the pinned revision');

const entries = [{
  id: 'material',
  display_name: 'Material Symbols and Material Design Icons',
  source_kind: 'git',
  repository: 'https://github.com/google/material-design-icons',
  source_revision: materialRevision,
  source_archive_integrity: null,
  license_spdx: 'Apache-2.0',
  license_file: `THIRD_PARTY_LICENSES/${basename(materialLicensePath)}`,
  license_sha256: sha256TextFile(materialLicensePath),
  notice_file: null,
  notice_sha256: null,
  notice_status: 'upstream_notice_not_present_at_pinned_revision',
}];

for (const source of npmSources) {
  const lockEntry = packageLock.packages[`node_modules/${source.package_name}`];
  assert.ok(lockEntry, `Missing package-lock entry for ${source.package_name}`);
  assert.match(lockEntry.version, /^\d+\.\d+\.\d+/);
  assert.match(lockEntry.integrity, /^sha512-/);

  const packageRoot = join(repoRoot, 'node_modules', source.package_name);
  const sourceLicensePath = join(packageRoot, source.license_source_file);
  assert.equal(existsSync(sourceLicensePath), true, `Missing license for ${source.package_name}`);
  const outputName = licenseOutputName(source.id, source.license_source_file);
  const outputPath = join(outputRoot, outputName);
  copyFileSync(sourceLicensePath, outputPath);

  const noticeSourcePath = findNoticeFile(packageRoot);
  let noticeFile = null;
  let noticeSha256 = null;
  let noticeStatus = 'upstream_package_contains_no_notice_file';
  if (noticeSourcePath) {
    const noticeOutputName = `${source.id}-${basename(noticeSourcePath)}`;
    const noticeOutputPath = join(outputRoot, noticeOutputName);
    copyFileSync(noticeSourcePath, noticeOutputPath);
    noticeFile = `THIRD_PARTY_LICENSES/${noticeOutputName}`;
    noticeSha256 = sha256TextFile(noticeOutputPath);
    noticeStatus = 'included';
  }

  entries.push({
    id: source.id,
    display_name: source.display_name,
    source_kind: 'npm',
    repository: source.repository,
    package_name: source.package_name,
    source_version: lockEntry.version,
    source_archive_integrity: lockEntry.integrity,
    license_spdx: source.license_spdx,
    license_file: `THIRD_PARTY_LICENSES/${outputName}`,
    license_sha256: sha256TextFile(outputPath),
    notice_file: noticeFile,
    notice_sha256: noticeSha256,
    notice_status: noticeStatus,
  });
}

const provenance = {
  schema_version: 1,
  purpose: 'Exact source and redistribution terms for icon data bundled with Supericons MCP.',
  entries,
};
writeFileSync(provenancePath, `${JSON.stringify(provenance, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  status: 'ok',
  provenance_path: 'mcp/THIRD_PARTY_PROVENANCE.json',
  provenance_sha256: sha256File(provenancePath),
  source_count: entries.length,
  license_file_count: entries.length,
  notice_file_count: entries.filter((entry) => entry.notice_file).length,
}, null, 2));
