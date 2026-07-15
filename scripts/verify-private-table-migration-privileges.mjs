import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const migrationsDirectory = 'supabase/migrations';
const enforcementTimestamp = '20260714223000';

function normalizedTimestamp(fileName) {
  const match = fileName.match(/^(\d{8})(\d{6})?/);
  assert.ok(match, `Migration filename has no date prefix: ${fileName}`);
  return `${match[1]}${match[2] || '000000'}`;
}

function tableNamesCreated(sql) {
  return [...sql.matchAll(/\bcreate\s+table\s+(?:if\s+not\s+exists\s+)?((?:[a-z_][a-z0-9_]*\.)?[a-z_][a-z0-9_]*)/gi)]
    .map((match) => match[1].toLowerCase());
}

function tableAccessMarkers(sql) {
  return new Map(
    [...sql.matchAll(/^\s*--\s*table-access:\s*(private|public)\s+((?:[a-z_][a-z0-9_]*\.)?[a-z_][a-z0-9_]*)\s*$/gim)]
      .map((match) => [match[2].toLowerCase(), match[1].toLowerCase()]),
  );
}

function hasPrivateRoleRevocation(sql, tableName) {
  const escapedTable = tableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    `\\brevoke\\s+all\\s+on\\s+table\\s+${escapedTable}\\s+from\\s+anon\\s*,\\s*authenticated\\s*;`,
    'i',
  ).test(sql);
}

function verifyMigration(fileName, sql) {
  const createdTables = tableNamesCreated(sql);
  const markers = tableAccessMarkers(sql);

  for (const tableName of createdTables) {
    const access = markers.get(tableName);
    assert.ok(
      access,
      `${fileName} creates ${tableName} without "-- table-access: private ${tableName}" or "-- table-access: public ${tableName}"`,
    );

    if (access === 'private') {
      assert.ok(
        hasPrivateRoleRevocation(sql, tableName),
        `${fileName} creates private table ${tableName} without revoking anon and authenticated in the same migration`,
      );
    }
  }

  for (const tableName of markers.keys()) {
    assert.ok(
      createdTables.includes(tableName),
      `${fileName} declares table access for ${tableName}, but does not create that table`,
    );
  }

  return createdTables.length;
}

assert.equal(
  verifyMigration(
    'private-pass.sql',
    '-- table-access: private public.private_items\ncreate table public.private_items (id bigint);\nrevoke all on table public.private_items from anon, authenticated;',
  ),
  1,
);
assert.equal(
  verifyMigration(
    'public-pass.sql',
    '-- table-access: public public.public_items\ncreate table public.public_items (id bigint);',
  ),
  1,
);
assert.throws(
  () => verifyMigration('private-fail.sql', '-- table-access: private public.private_items\ncreate table public.private_items (id bigint);'),
  /without revoking anon and authenticated/,
);
assert.throws(
  () => verifyMigration('unclassified-fail.sql', 'create table public.unclassified_items (id bigint);'),
  /without "-- table-access:/,
);

const checkedMigrations = [];
let createdTableCount = 0;

for (const fileName of readdirSync(migrationsDirectory).filter((name) => name.endsWith('.sql')).sort()) {
  if (normalizedTimestamp(fileName) <= enforcementTimestamp) continue;
  const sql = readFileSync(`${migrationsDirectory}/${fileName}`, 'utf8');
  createdTableCount += verifyMigration(fileName, sql);
  checkedMigrations.push(fileName);
}

const recovery = readFileSync(
  `${migrationsDirectory}/20260714223000_material_icon_assets_private_roles.sql`,
  'utf8',
);
assert.ok(
  hasPrivateRoleRevocation(recovery, 'public.material_icon_assets'),
  'The Material private-role recovery must keep its direct anon and authenticated revocation',
);

console.log(JSON.stringify({
  status: 'ok',
  enforcement_after: enforcementTimestamp,
  checked_migrations: checkedMigrations,
  created_tables_checked: createdTableCount,
  material_recovery_pinned: true,
  self_tests: 4,
}, null, 2));
