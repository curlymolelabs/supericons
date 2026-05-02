import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');

const archiveId = '2026-05-01-pre-supabase-cutover';
const archiveRoot = path.join(repoRoot, 'data/si-registry/archive', archiveId);

const MOVE_CANDIDATES = [
  {
    from: 'data/si-registry/manual-redo',
    to: `data/si-registry/archive/${archiveId}/manual-redo`,
    reason: 'Manual redo files are staging/review evidence and are not manifest-listed source.',
  },
];

const KEEP_ACTIVE = [
  'data/si-registry/source',
  'data/si-registry/registry-manifest.json',
  'data/si-registry/staging/library-workbench',
  'data/si-registry/generated',
  'public/registry',
  'mcp/public',
];

async function exists(relativePath) {
  try {
    await fs.access(path.join(repoRoot, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function countFilesAndBytes(absolutePath) {
  const stat = await fs.stat(absolutePath);
  if (stat.isFile()) return { files: 1, bytes: stat.size };

  let files = 0;
  let bytes = 0;
  const entries = await fs.readdir(absolutePath, { withFileTypes: true });
  for (const entry of entries) {
    const child = path.join(absolutePath, entry.name);
    const result = await countFilesAndBytes(child);
    files += result.files;
    bytes += result.bytes;
  }
  return { files, bytes };
}

const actions = [];

for (const candidate of MOVE_CANDIDATES) {
  const sourcePath = path.join(repoRoot, candidate.from);
  const destinationPath = path.join(repoRoot, candidate.to);
  const sourceExists = await exists(candidate.from);
  const destinationExists = await exists(candidate.to);

  const size = sourceExists ? await countFilesAndBytes(sourcePath) : { files: 0, bytes: 0 };

  actions.push({
    ...candidate,
    action: sourceExists && !destinationExists ? 'move' : sourceExists && destinationExists ? 'skip_destination_exists' : 'skip_missing_source',
    files: size.files,
    bytes: size.bytes,
  });

  if (apply && sourceExists && !destinationExists) {
    await fs.mkdir(path.dirname(destinationPath), { recursive: true });
    await fs.rename(sourcePath, destinationPath);
  }
}

const manifest = {
  archiveId,
  generatedAt: new Date().toISOString(),
  mode: apply ? 'apply' : 'dry-run',
  purpose: 'Archive non-source SI registry workflow evidence after Supabase-shaped export has matched current public and MCP registry outputs.',
  activePathsKeptInPlace: KEEP_ACTIVE,
  actions,
};

await fs.mkdir(archiveRoot, { recursive: true });
await fs.writeFile(path.join(archiveRoot, 'archive-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log('archive-si-registry-workflow-artifacts');
console.log(`mode: ${manifest.mode}`);
console.log(`manifest: ${path.relative(repoRoot, path.join(archiveRoot, 'archive-manifest.json'))}`);
for (const action of actions) {
  console.log(`${action.action}: ${action.from} -> ${action.to} (${action.files} files, ${action.bytes} bytes)`);
}
