import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outlineIndexPath = path.join(repoRoot, 'public', 'icon-index.json');
const solidIndexPath = path.join(repoRoot, 'public', 'icon-index-solid.json');

function normalizeRef(icon) {
  const library = String(icon?.lib || '').trim().toLowerCase();
  const id = String(icon?.id || '').trim().toLowerCase();
  const ref = `${library}:${id}`;
  if (!/^[a-z0-9][a-z0-9_-]*:[^\s:]+$/.test(ref)) {
    throw new Error('Icon index contains an invalid library:id reference');
  }
  return ref;
}

function sortedUniqueRefs(index) {
  if (!index || !Array.isArray(index.icons)) {
    throw new Error('Icon index must contain an icons array');
  }
  return [...new Set(index.icons.map(normalizeRef))].sort();
}

function sha256SortedRefs(refs) {
  return crypto
    .createHash('sha256')
    .update(refs.join('\n'), 'utf8')
    .digest('hex');
}

function normalizedGeneratedAt(index) {
  const generatedAt = new Date(index?.generatedAt || '');
  if (!Number.isFinite(generatedAt.getTime())) {
    throw new Error('Icon index generatedAt must be a valid timestamp');
  }
  return generatedAt.toISOString();
}

export function buildWebsiteIconAvailability(outlineIndex, solidIndex) {
  const outlineRefs = sortedUniqueRefs(outlineIndex);
  const solidRefs = sortedUniqueRefs(solidIndex);
  const outlineSet = new Set(outlineRefs);
  const solidSet = new Set(solidRefs);
  const allRefs = [...new Set([...outlineRefs, ...solidRefs])].sort();

  return {
    rows: allRefs.map((iconRef) => ({
      icon_ref: iconRef,
      outline_available: outlineSet.has(iconRef),
      solid_available: solidSet.has(iconRef),
    })),
    outline_ref_count: outlineRefs.length,
    solid_ref_count: solidRefs.length,
    outline_refs_sha256: sha256SortedRefs(outlineRefs),
    solid_refs_sha256: sha256SortedRefs(solidRefs),
    outline_source_generated_at: normalizedGeneratedAt(outlineIndex),
    solid_source_generated_at: normalizedGeneratedAt(solidIndex),
  };
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function requiredEnv(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`${name} is required for database access`);
  return value;
}

function assertHostedMutationAllowed(supabaseUrl) {
  const hostname = new URL(supabaseUrl).hostname.toLowerCase();
  const isHosted = hostname.endsWith('.supabase.co');
  if (
    isHosted
    && process.env.WEBSITE_POPULARITY_ALLOW_HOSTED_DB_MUTATION !== '1'
  ) {
    throw new Error(
      'Refusing hosted database mutation without '
      + 'WEBSITE_POPULARITY_ALLOW_HOSTED_DB_MUTATION=1'
    );
  }
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text)
    ? `"${text.replaceAll('"', '""')}"`
    : text;
}

export async function writeAvailabilityReleaseFiles(
  releaseDirectory,
  availability
) {
  const resolvedDirectory = path.resolve(releaseDirectory);
  await fs.mkdir(resolvedDirectory, { recursive: true });

  const rowLines = [
    'icon_ref,outline_available,solid_available',
    ...availability.rows.map((row) => [
      row.icon_ref,
      row.outline_available,
      row.solid_available,
    ].map(csvCell).join(',')),
  ];
  const stateLines = [
    [
      'outline_ref_count',
      'solid_ref_count',
      'outline_refs_sha256',
      'solid_refs_sha256',
      'outline_source_generated_at',
      'solid_source_generated_at',
    ].join(','),
    [
      availability.outline_ref_count,
      availability.solid_ref_count,
      availability.outline_refs_sha256,
      availability.solid_refs_sha256,
      availability.outline_source_generated_at,
      availability.solid_source_generated_at,
    ].map(csvCell).join(','),
  ];

  await Promise.all([
    fs.writeFile(
      path.join(resolvedDirectory, 'availability.csv'),
      `${rowLines.join('\n')}\n`,
      'utf8'
    ),
    fs.writeFile(
      path.join(resolvedDirectory, 'availability-state.csv'),
      `${stateLines.join('\n')}\n`,
      'utf8'
    ),
  ]);

  return resolvedDirectory;
}

async function postRpc({
  supabaseUrl,
  serviceRoleKey,
  functionName,
  payload,
}) {
  const response = await fetch(
    `${supabaseUrl.replace(/\/+$/, '')}/rest/v1/rpc/${functionName}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    throw new Error(`${functionName} failed with HTTP ${response.status}`);
  }
  return response.json();
}

async function getPrivateRows({
  supabaseUrl,
  serviceRoleKey,
  pathName,
  fetchImpl = globalThis.fetch,
}) {
  const response = await fetchImpl(
    `${supabaseUrl.replace(/\/+$/, '')}/rest/v1/${pathName}`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    }
  );
  if (!response.ok) {
    throw new Error(`availability verification failed with HTTP ${response.status}`);
  }
  return response.json();
}

async function getAllPrivateAvailabilityRows({
  supabaseUrl,
  serviceRoleKey,
  fetchImpl = globalThis.fetch,
}) {
  const pageSize = 1000;
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const response = await fetchImpl(
      `${supabaseUrl.replace(/\/+$/, '')}`
        + '/rest/v1/website_icon_grid_availability'
        + '?select=icon_ref,outline_available,solid_available'
        + '&order=icon_ref.asc',
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          Range: `${offset}-${offset + pageSize - 1}`,
        },
      }
    );
    if (!response.ok) {
      throw new Error(
        `availability row verification failed with HTTP ${response.status}`
      );
    }
    const page = await response.json();
    if (!Array.isArray(page)) {
      throw new Error('availability row response is invalid');
    }
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

export async function verifyLiveAvailability({
  supabaseUrl,
  serviceRoleKey,
  availability,
  fetchImpl = globalThis.fetch,
}) {
  const stateRows = await getPrivateRows({
    supabaseUrl,
    serviceRoleKey,
    fetchImpl,
    pathName:
      'website_icon_grid_availability_state'
      + '?select=outline_ref_count,solid_ref_count,outline_refs_sha256,'
      + 'solid_refs_sha256,outline_source_generated_at,'
      + 'solid_source_generated_at&singleton_key=eq.active',
  });
  if (!Array.isArray(stateRows) || stateRows.length !== 1) {
    throw new Error('availability state must contain one active row');
  }

  const liveRows = await getAllPrivateAvailabilityRows({
    supabaseUrl,
    serviceRoleKey,
    fetchImpl,
  });
  const outlineRefs = liveRows
    .filter((row) => row.outline_available === true)
    .map((row) => String(row.icon_ref || '').trim().toLowerCase())
    .sort();
  const solidRefs = liveRows
    .filter((row) => row.solid_available === true)
    .map((row) => String(row.icon_ref || '').trim().toLowerCase())
    .sort();
  const outlineCount = outlineRefs.length;
  const solidCount = solidRefs.length;
  const outlineHash = sha256SortedRefs(outlineRefs);
  const solidHash = sha256SortedRefs(solidRefs);
  const state = stateRows[0];

  const checks = [
    Number(state.outline_ref_count) === availability.outline_ref_count,
    Number(state.solid_ref_count) === availability.solid_ref_count,
    outlineCount === availability.outline_ref_count,
    solidCount === availability.solid_ref_count,
    state.outline_refs_sha256 === availability.outline_refs_sha256,
    state.solid_refs_sha256 === availability.solid_refs_sha256,
    outlineHash === availability.outline_refs_sha256,
    solidHash === availability.solid_refs_sha256,
    outlineHash === state.outline_refs_sha256,
    solidHash === state.solid_refs_sha256,
    new Date(state.outline_source_generated_at).toISOString()
      === availability.outline_source_generated_at,
    new Date(state.solid_source_generated_at).toISOString()
      === availability.solid_source_generated_at,
  ];
  if (checks.some((check) => !check)) {
    throw new Error(
      'live availability counts, hashes, or source timestamps do not match'
    );
  }

  return {
    status: 'verified',
    outline_ref_count: outlineCount,
    solid_ref_count: solidCount,
  };
}

async function main() {
  const shouldApply = process.argv.includes('--apply');
  const shouldRefresh = process.argv.includes('--refresh');
  const shouldVerify = process.argv.includes('--verify');
  const releaseDirectoryIndex = process.argv.indexOf('--release-dir');
  const releaseDirectory = releaseDirectoryIndex >= 0
    ? process.argv[releaseDirectoryIndex + 1]
    : '';
  if (releaseDirectoryIndex >= 0 && !releaseDirectory) {
    throw new Error('--release-dir requires a directory path');
  }
  if (shouldRefresh && !shouldApply) {
    throw new Error('--refresh requires --apply');
  }

  const [outlineIndex, solidIndex] = await Promise.all([
    readJson(outlineIndexPath),
    readJson(solidIndexPath),
  ]);
  const availability = buildWebsiteIconAvailability(
    outlineIndex,
    solidIndex
  );

  const summary = {
    status: shouldApply ? 'ready_to_apply' : 'plan',
    row_count: availability.rows.length,
    outline_ref_count: availability.outline_ref_count,
    solid_ref_count: availability.solid_ref_count,
    outline_refs_sha256: availability.outline_refs_sha256,
    solid_refs_sha256: availability.solid_refs_sha256,
    outline_source_generated_at:
      availability.outline_source_generated_at,
    solid_source_generated_at:
      availability.solid_source_generated_at,
  };

  if (releaseDirectory) {
    summary.release_directory = await writeAvailabilityReleaseFiles(
      releaseDirectory,
      availability
    );
  }

  if (!shouldApply && !shouldVerify) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const supabaseUrl = requiredEnv('SUPABASE_URL');
  const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (shouldApply) assertHostedMutationAllowed(supabaseUrl);

  let loadResult = null;
  if (shouldApply) {
    loadResult = await postRpc({
      supabaseUrl,
      serviceRoleKey,
      functionName: 'si_replace_website_icon_grid_availability',
      payload: {
        p_rows: availability.rows,
        p_outline_ref_count: availability.outline_ref_count,
        p_solid_ref_count: availability.solid_ref_count,
        p_outline_refs_sha256: availability.outline_refs_sha256,
        p_solid_refs_sha256: availability.solid_refs_sha256,
        p_outline_source_generated_at:
          availability.outline_source_generated_at,
        p_solid_source_generated_at:
          availability.solid_source_generated_at,
      },
    });
  }

  let refreshResult = null;
  if (shouldRefresh) {
    refreshResult = await postRpc({
      supabaseUrl,
      serviceRoleKey,
      functionName: 'si_refresh_website_icon_popularity',
      payload: {},
    });
  }

  const verification = await verifyLiveAvailability({
    supabaseUrl,
    serviceRoleKey,
    availability,
  });

  console.log(JSON.stringify({
    ...summary,
    status: shouldApply ? 'applied' : 'verified',
    load_status: loadResult?.status || null,
    verification_status: verification.status,
    refresh_status: refreshResult?.status || null,
    scored_icons: refreshResult?.scored_icons ?? null,
    qualifying_icons: refreshResult?.qualifying_icons ?? null,
  }, null, 2));
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch((error) => {
    console.error(error?.message || String(error));
    process.exitCode = 1;
  });
}
