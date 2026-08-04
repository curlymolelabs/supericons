import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  fetchWebsitePopularIcons,
  normalizeWebsitePopularityResponse,
  promoteWebsitePopularIcons,
} from '../lib/website-popularity.js';
import {
  buildWebsiteIconAvailability,
  verifyLiveAvailability,
  writeAvailabilityReleaseFiles,
} from './sync-website-icon-grid-availability.mjs';

const migrationPath =
  'supabase/migrations/20260805120000_website_icon_popularity.sql';
const schedulePath =
  'docs/si-v2/search/website-popularity-schedule-activation-2026-08-05.sql';

function icon(ref) {
  const [lib, id] = ref.split(':');
  return { lib, id, name: id };
}

const sourceIcons = [
  'lucide:a',
  'lucide:b',
  'lucide:c',
  'lucide:d',
  'lucide:e',
  'lucide:f',
  'lucide:g',
  'lucide:h',
].map(icon);
const sourceOrder = sourceIcons.map((item) => `${item.lib}:${item.id}`);

const promoted = promoteWebsitePopularIcons(
  sourceIcons,
  [
    'lucide:c',
    'lucide:a',
    'lucide:f',
    'lucide:h',
    'lucide:g',
    'lucide:d',
  ]
);
assert.deepEqual(
  promoted.icons.map((item) => `${item.lib}:${item.id}`),
  [
    'lucide:c',
    'lucide:a',
    'lucide:f',
    'lucide:h',
    'lucide:g',
    'lucide:d',
    'lucide:b',
    'lucide:e',
  ],
  'popular refs move first and the remaining tail keeps its relative order'
);
assert.deepEqual(
  sourceIcons.map((item) => `${item.lib}:${item.id}`),
  sourceOrder,
  'prefix promotion must not mutate its input array'
);

const insufficientPromotion = promoteWebsitePopularIcons(
  sourceIcons,
  ['lucide:c', 'lucide:a']
);
assert.deepEqual(
  insufficientPromotion.icons.map((item) => `${item.lib}:${item.id}`),
  sourceOrder,
  'fewer than six resolved refs keeps the existing order'
);
assert.deepEqual(insufficientPromotion.appliedRefs, []);

const normalizedFresh = normalizeWebsitePopularityResponse({
  status: 'fresh',
  calculated_at: '2026-07-26T00:05:00Z',
  stale_after: '2026-07-28T00:05:00Z',
  icon_refs: [
    'lucide:a',
    'lucide:b',
    'lucide:c',
    'lucide:d',
    'lucide:e',
    'lucide:f',
    'lucide:f',
    'bad ref',
  ],
});
assert.equal(normalizedFresh.status, 'fresh');
assert.equal(normalizedFresh.iconRefs.length, 6);
assert.equal(normalizedFresh.calculatedAt, '2026-07-26T00:05:00.000Z');

const normalizedStale = normalizeWebsitePopularityResponse({
  status: 'stale',
  calculated_at: '2026-07-26T00:05:00Z',
  stale_after: '2026-07-28T00:05:00Z',
  icon_refs: sourceOrder,
});
assert.equal(normalizedStale.status, 'stale');
assert.deepEqual(normalizedStale.iconRefs, []);

let capturedRequest = null;
const fetched = await fetchWebsitePopularIcons('outline', {
  supabaseUrl: 'https://example.supabase.co/',
  publishableKey: 'public-test-key',
  fetchImpl: async (url, options) => {
    capturedRequest = { url, options };
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          status: 'fresh',
          calculated_at: '2026-07-26T00:05:00Z',
          stale_after: '2026-07-28T00:05:00Z',
          icon_refs: sourceOrder,
        };
      },
    };
  },
});
assert.equal(fetched.status, 'fresh');
assert.equal(
  capturedRequest.url,
  'https://example.supabase.co/rest/v1/rpc/si_get_website_popular_icons'
);
assert.equal(capturedRequest.options.method, 'POST');
assert.equal(capturedRequest.options.headers.apikey, 'public-test-key');
assert.equal(
  capturedRequest.options.headers.Authorization,
  'Bearer public-test-key'
);
assert.deepEqual(
  JSON.parse(capturedRequest.options.body),
  { p_style: 'outline' }
);
await assert.rejects(
  fetchWebsitePopularIcons('any', {
    fetchImpl: async () => ({ ok: true, json: async () => ({}) }),
  }),
  /outline or solid/
);

const [outlineIndex, solidIndex] = await Promise.all([
  fs.readFile('public/icon-index.json', 'utf8').then(JSON.parse),
  fs.readFile('public/icon-index-solid.json', 'utf8').then(JSON.parse),
]);
const availability = buildWebsiteIconAvailability(
  outlineIndex,
  solidIndex
);
assert.equal(availability.outline_ref_count, 21468);
assert.equal(availability.solid_ref_count, 6059);
assert.equal(availability.rows.length, 25862);
assert.equal(
  availability.outline_refs_sha256,
  '6626763265e1a111331901de387a5a858818407284c24fea584079d4e81a8a76'
);
assert.equal(
  availability.solid_refs_sha256,
  '26a3ac9b7b59a5490ef32f855c86643f379a5afe86b8e757d99acfa450be7054'
);

const verificationFixture = buildWebsiteIconAvailability(
  {
    generatedAt: '2026-07-26T00:00:00Z',
    icons: sourceIcons,
  },
  {
    generatedAt: '2026-07-26T00:00:00Z',
    icons: sourceIcons.slice(0, 6),
  }
);

const releaseFixtureDirectory = await fs.mkdtemp(
  path.join(os.tmpdir(), 'website-popularity-release-')
);
try {
  await writeAvailabilityReleaseFiles(
    releaseFixtureDirectory,
    verificationFixture
  );
  const [releaseRows, releaseState] = await Promise.all([
    fs.readFile(
      path.join(releaseFixtureDirectory, 'availability.csv'),
      'utf8'
    ),
    fs.readFile(
      path.join(releaseFixtureDirectory, 'availability-state.csv'),
      'utf8'
    ),
  ]);
  assert.equal(releaseRows.split('\n').length, 10);
  assert.match(
    releaseRows,
    /^icon_ref,outline_available,solid_available/m
  );
  assert.match(releaseState, /outline_refs_sha256/);
  assert.match(
    releaseState,
    new RegExp(verificationFixture.outline_refs_sha256)
  );
} finally {
  await fs.rm(releaseFixtureDirectory, {
    recursive: true,
    force: true,
  });
}

function availabilityVerificationFetch(rows = verificationFixture.rows) {
  return async (url, options = {}) => {
    if (String(url).includes('website_icon_grid_availability_state')) {
      return {
        ok: true,
        status: 200,
        async json() {
          return [{
            outline_ref_count: verificationFixture.outline_ref_count,
            solid_ref_count: verificationFixture.solid_ref_count,
            outline_refs_sha256:
              verificationFixture.outline_refs_sha256,
            solid_refs_sha256: verificationFixture.solid_refs_sha256,
            outline_source_generated_at:
              verificationFixture.outline_source_generated_at,
            solid_source_generated_at:
              verificationFixture.solid_source_generated_at,
          }];
        },
      };
    }

    const [startText, endText] = String(options.headers?.Range || '0-999')
      .split('-');
    const start = Number(startText);
    const end = Number(endText);
    return {
      ok: true,
      status: 200,
      async json() {
        return rows.slice(start, end + 1);
      },
    };
  };
}

const verifiedFixture = await verifyLiveAvailability({
  supabaseUrl: 'https://example.supabase.co',
  serviceRoleKey: 'private-test-key',
  availability: verificationFixture,
  fetchImpl: availabilityVerificationFetch(),
});
assert.equal(verifiedFixture.status, 'verified');

const alteredRows = verificationFixture.rows.map((row, index) => (
  index === 0
    ? { ...row, outline_available: false }
    : row
));
await assert.rejects(
  verifyLiveAvailability({
    supabaseUrl: 'https://example.supabase.co',
    serviceRoleKey: 'private-test-key',
    availability: verificationFixture,
    fetchImpl: availabilityVerificationFetch(alteredRows),
  }),
  /do not match/
);

const [migration, schedule, mainSource, releaseRunner] = await Promise.all([
  fs.readFile(migrationPath, 'utf8'),
  fs.readFile(schedulePath, 'utf8'),
  fs.readFile('main.js', 'utf8'),
  fs.readFile('scripts/run-website-popularity-hosted-release.ps1', 'utf8'),
]);

const privateTables = [
  'website_icon_popularity_snapshots',
  'website_icon_popularity_scores',
  'website_icon_grid_availability',
  'website_icon_grid_availability_state',
  'website_icon_popularity_refresh_state',
];
for (const table of privateTables) {
  assert.match(
    migration,
    new RegExp(`-- table-access: private public\\.${table}`)
  );
  assert.match(
    migration,
    new RegExp(
      `revoke all on table public\\.${table} from anon, authenticated;`
    )
  );
  assert.doesNotMatch(
    migration,
    new RegExp(
      `grant select on table public\\.${table} to (?:anon|authenticated)`
    )
  );
}

assert.match(
  migration,
  /create or replace function public\.si_refresh_website_icon_popularity\(\)/
);
assert.match(
  migration,
  /create or replace function public\.si_get_website_popular_icons\(\s*p_style text\s*\)/
);
assert.match(
  migration,
  /usage\.channel = 'hosted_mcp'/
);
assert.match(
  migration,
  /usage\.tool_name = 'get_icon'/
);
assert.match(migration, /usage\.result_count = 1/);
assert.match(migration, /from public\.icon_evidence as evidence/);
assert.match(migration, /evidence\.signal_type = 'copy'/);
assert.match(migration, /'supericons\.dev'/);
assert.match(migration, /'www\.supericons\.dev'/);
assert.match(migration, /confirmed_source as/);
assert.match(
  migration,
  /count\(distinct \(\s*source\.created_at at time zone 'UTC'/
);
assert.match(migration, /scores\.active_days_30d >= 3/);
assert.match(migration, /limit 50/);
assert.match(
  migration,
  /grant execute on function public\.si_get_website_popular_icons\(text\)\s+to anon, authenticated, service_role;/
);
assert.doesNotMatch(
  migration,
  /\b(from|into|update|truncate table)\s+public\.icon_scores\b/i
);
assert.doesNotMatch(
  migration,
  /create or replace function public\.si_rebuild_icon_scores/i
);
assert.doesNotMatch(
  migration,
  /create or replace function public\.si_refresh_icon_search_private_features/i
);
assert.doesNotMatch(migration, /cron\.schedule/);

assert.match(
  schedule,
  /si-refresh-website-icon-popularity-daily/
);
assert.match(
  schedule,
  /select public\.si_refresh_website_icon_popularity\(\);/
);
assert.equal(
  schedulePath.includes('supabase/migrations/'),
  false,
  'schedule activation must stay outside automatic migrations'
);

assert.match(releaseRunner, /\$ProjectRef = 'kcjmkakdhsqplvasgkjv'/);
assert.match(releaseRunner, /\$MigrationVersion = '20260805120000'/);
assert.match(
  releaseRunner,
  /migration',\s*'repair',\s*\$MigrationVersion,\s*'--status',\s*'applied'/
);
assert.doesNotMatch(releaseRunner, /db',\s*'push'/);
assert.match(releaseRunner, /Assert-CleanReleaseCommit/);

const oldBrowseSortIndex = mainSource.indexOf(
  'icons.sort((a, b) => compareBrowseIconsByPopularity'
);
const newPrefixIndex = mainSource.indexOf(
  'icons = applyWebsitePopularityPrefix'
);
assert.ok(oldBrowseSortIndex >= 0);
assert.ok(
  newPrefixIndex > oldBrowseSortIndex,
  'the new prefix must be applied after the existing tail order is produced'
);
assert.match(mainSource, /websitePopularIconRefs:/);
assert.doesNotMatch(
  mainSource,
  /state\.popularityMap\s*=\s*.*websitePopular/i
);

console.log(JSON.stringify({
  status: 'ok',
  helper_tests: 13,
  migration_tables_checked: privateTables.length,
  availability_rows: availability.rows.length,
  outline_ref_count: availability.outline_ref_count,
  solid_ref_count: availability.solid_ref_count,
}, null, 2));
