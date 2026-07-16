import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { gunzipSync } from 'node:zlib';

const repoRoot = resolve(import.meta.dirname, '..');
const mcpRoot = join(repoRoot, 'mcp');
const scriptPath = resolve(import.meta.filename);
const STARTUP_RUNS = 5;

function memorySnapshot() {
  globalThis.gc?.();
  const memory = process.memoryUsage();
  return {
    rss_bytes: memory.rss,
    heap_used_bytes: memory.heapUsed,
    external_bytes: memory.external,
  };
}

function percentile(values, fraction) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1);
  return sorted[index];
}

function summarize(values) {
  return {
    samples: values.length,
    p50: percentile(values, 0.5),
    p95: percentile(values, 0.95),
    maximum: values.length > 0 ? Math.max(...values) : 0,
  };
}

function delta(after, before) {
  return Object.fromEntries(
    Object.keys(after).map((key) => [key, after[key] - before[key]]),
  );
}

async function runStartupChild() {
  const before = memorySnapshot();
  const startedAt = performance.now();
  await import('../mcp/search.js');
  const outline = JSON.parse(readFileSync(join(mcpRoot, 'public', 'icon-index.json'), 'utf8'));
  const solid = JSON.parse(readFileSync(join(mcpRoot, 'public', 'icon-index-solid.json'), 'utf8'));
  JSON.parse(readFileSync(join(mcpRoot, 'public', 'synonyms.json'), 'utf8'));
  const afterIndexes = memorySnapshot();
  const indexesLoadedMs = Number((performance.now() - startedAt).toFixed(3));

  let materialJson = gunzipSync(readFileSync(join(mcpRoot, 'material-mcp-assets.json.gz')))
    .toString('utf8');
  const materialBundle = JSON.parse(materialJson);
  materialJson = null;
  const afterMaterial = memorySnapshot();

  console.log(JSON.stringify({
    status: 'ok',
    outline_icons: outline.icons.length,
    solid_icons: solid.icons.length,
    material_assets: Object.keys(materialBundle.assets).length,
    indexes_loaded_ms: indexesLoadedMs,
    before,
    after_indexes: afterIndexes,
    index_delta: delta(afterIndexes, before),
    after_material: afterMaterial,
    material_delta: delta(afterMaterial, afterIndexes),
  }));
}

async function runQualityChild() {
  const { searchIcons } = await import('../mcp/search.js');
  const evaluationSet = JSON.parse(readFileSync(
    join(repoRoot, 'data', 'semantic-search-v2', 'evaluation-set.json'),
    'utf8',
  ));
  const icons = JSON.parse(readFileSync(join(mcpRoot, 'public', 'icon-index.json'), 'utf8')).icons;
  const synonyms = JSON.parse(readFileSync(join(mcpRoot, 'public', 'synonyms.json'), 'utf8'));
  const cases = evaluationSet.query_groups.flatMap((group) => group.queries || []);
  const startedAt = performance.now();
  const observations = cases.map((entry) => {
    const query = String(entry.query || entry.slot || entry.task || '').trim();
    const caseStartedAt = performance.now();
    const results = searchIcons(query, icons, synonyms, {
      library: entry.requested_library || null,
      libraryMode: entry.library_mode || 'all',
      locale: entry.locale || null,
      limit: 8,
    });
    return {
      case_id: entry.case_id,
      locale: entry.locale || null,
      duration_ms: Number((performance.now() - caseStartedAt).toFixed(3)),
      result_refs: results.map((icon) => `${icon.lib}:${icon.id}`),
    };
  });
  const elapsedMs = Number((performance.now() - startedAt).toFixed(3));
  const contractObservations = observations.map((observation, index) => {
    if (!observation.locale) return observation;
    const entry = cases[index];
    const query = String(entry.query || entry.slot || entry.task || '').trim();
    const results = searchIcons(query, icons, synonyms, {
      library: entry.requested_library || null,
      libraryMode: entry.library_mode || 'all',
      limit: 8,
    });
    return {
      case_id: entry.case_id,
      result_refs: results.map((icon) => `${icon.lib}:${icon.id}`),
    };
  });
  const multilingual = observations.filter((entry) => entry.locale);
  const english = observations.filter((entry) => !entry.locale);
  const localeSummary = {};
  for (const entry of multilingual) {
    const locale = entry.locale;
    localeSummary[locale] ||= { cases: 0, zero_results: 0 };
    localeSummary[locale].cases += 1;
    if (entry.result_refs.length === 0) localeSummary[locale].zero_results += 1;
  }

  console.log(JSON.stringify({
    status: 'ok',
    cases: observations.length,
    elapsed_ms: elapsedMs,
    per_case_latency_ms: summarize(observations.map((entry) => entry.duration_ms)),
    fixed_contract_fingerprint: createHash('sha256').update(JSON.stringify(
      contractObservations.map(({ case_id, result_refs }) => ({ case_id, result_refs })),
    )).digest('hex'),
    locale_aware_fingerprint: createHash('sha256').update(JSON.stringify(
      observations.map(({ case_id, result_refs }) => ({ case_id, result_refs })),
    )).digest('hex'),
    english: {
      cases: english.length,
      zero_results: english.filter((entry) => entry.result_refs.length === 0).length,
      zero_case_ids: english
        .filter((entry) => entry.result_refs.length === 0)
        .map((entry) => entry.case_id),
    },
    multilingual: {
      cases: multilingual.length,
      zero_results: multilingual.filter((entry) => entry.result_refs.length === 0).length,
      by_locale: localeSummary,
    },
  }));
}

function runChild(mode) {
  const result = spawnSync(process.execPath, ['--expose-gc', scriptPath, mode], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `Child evaluation failed: ${mode}`);
  }
  return JSON.parse(result.stdout);
}

function packSummary(directory) {
  const npmArgs = ['pack', '--dry-run', '--json', '--ignore-scripts'];
  const command = process.platform === 'win32' ? process.env.ComSpec || 'cmd.exe' : 'npm';
  const commandArgs = process.platform === 'win32'
    ? ['/d', '/s', '/c', 'npm', ...npmArgs]
    : npmArgs;
  const output = execFileSync(
    command,
    commandArgs,
    { cwd: directory, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
  );
  const parsed = JSON.parse(output);
  const pack = parsed[0];
  return {
    name: pack.name,
    version: pack.version,
    files: pack.entryCount,
    packed_bytes: pack.size,
    unpacked_bytes: pack.unpackedSize,
  };
}

function measurePackageWithMaterial() {
  const directory = mkdtempSync(join(tmpdir(), 'supericons-local-first-pack-'));
  try {
    cpSync(mcpRoot, directory, {
      recursive: true,
      filter: (source) => !source.split(/[\\/]/).includes('node_modules'),
    });
    const packagePath = join(directory, 'package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
    if (!packageJson.files.includes('material-mcp-assets.json.gz')
      || !packageJson.files.includes('material-mcp-assets-manifest.json')) {
      packageJson.files = [...new Set([
        ...packageJson.files,
        'material-mcp-assets.json.gz',
        'material-mcp-assets-manifest.json',
      ])];
      writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
    }
    return packSummary(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

async function main() {
  if (process.argv[2] === '--startup-child') return runStartupChild();
  if (process.argv[2] === '--quality-child') return runQualityChild();

  const startupRuns = Array.from({ length: STARTUP_RUNS }, () => runChild('--startup-child'));
  const quality = runChild('--quality-child');
  const currentPackage = packSummary(mcpRoot);
  const packageWithMaterial = measurePackageWithMaterial();
  const packageJson = JSON.parse(readFileSync(join(mcpRoot, 'package.json'), 'utf8'));
  const indexSource = readFileSync(join(mcpRoot, 'index.js'), 'utf8');
  const materialManifest = JSON.parse(readFileSync(
    join(mcpRoot, 'material-mcp-assets-manifest.json'),
    'utf8',
  ));
  const indexMetadata = JSON.parse(readFileSync(
    join(mcpRoot, 'public', 'icon-index.json'),
    'utf8',
  ));

  const report = {
    status: 'ok',
    route_changed: false,
    serving_systems_touched: false,
    startup: {
      samples: STARTUP_RUNS,
      index_load_ms: summarize(startupRuns.map((entry) => entry.indexes_loaded_ms)),
      index_rss_delta_bytes: summarize(startupRuns.map((entry) => entry.index_delta.rss_bytes)),
      index_heap_delta_bytes: summarize(startupRuns.map((entry) => entry.index_delta.heap_used_bytes)),
      material_rss_delta_bytes: summarize(startupRuns.map((entry) => entry.material_delta.rss_bytes)),
      material_heap_delta_bytes: summarize(startupRuns.map((entry) => entry.material_delta.heap_used_bytes)),
      combined_rss_delta_bytes: summarize(startupRuns.map((entry) => (
        entry.after_material.rss_bytes - entry.before.rss_bytes
      ))),
      combined_heap_delta_bytes: summarize(startupRuns.map((entry) => (
        entry.after_material.heap_used_bytes - entry.before.heap_used_bytes
      ))),
    },
    quality,
    package: {
      current: currentPackage,
      with_material_bundle: packageWithMaterial,
      packed_delta_bytes: packageWithMaterial.packed_bytes - currentPackage.packed_bytes,
      unpacked_delta_bytes: packageWithMaterial.unpacked_bytes - currentPackage.unpacked_bytes,
    },
    freshness: {
      package_version: packageJson.version,
      icon_index_generated_at: indexMetadata.generatedAt || null,
      material_source_revision: materialManifest.source_revision,
      update_requires_new_package_release: true,
    },
    known_contract_limits: {
      material_bundle_in_package_manifest: packageJson.files.includes('material-mcp-assets.json.gz'),
      multilingual_zero_result_cases: quality.multilingual.zero_results,
      recommendation_local_first_evaluated: false,
      local_only_telemetry_implemented: indexSource.includes('void logMcpSearchAttempt({'),
      telemetry_can_be_disabled_by_user: true,
    },
  };

  console.log(JSON.stringify(report, null, 2));
}

await main();
