import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildHostedSearchCatalogRows } from '../lib/hosted-search-core.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

const iconIndexPath = path.join(repoRoot, 'public', 'icon-index.json');
const schemaPath = path.join(repoRoot, 'supabase', 'migrations', '20260418_hosted_search_engine_schema.sql');

const raw = JSON.parse(await fs.readFile(iconIndexPath, 'utf8'));

assert.ok(raw.totalCount > 20000, 'public icon index should remain the coarse catalog source');
assert.ok(Array.isArray(raw.icons), 'icon index should expose icons[]');

const rows = buildHostedSearchCatalogRows(raw.icons);
assert.equal(rows.length, raw.icons.length, 'catalog rows should match public icon index row count');
assert.ok(rows.every((row) => row.icon_id.includes(':')), 'every catalog row should use lib:id');
assert.ok(rows.every((row) => row.search_text.length > 0), 'every catalog row should have search text');

const schemaSql = await fs.readFile(schemaPath, 'utf8');
assert.match(schemaSql, /create table if not exists public\.icon_catalog/i, 'schema should create icon_catalog');
assert.match(schemaSql, /create table if not exists public\.icon_search_private_manifest/i, 'schema should create icon_search_private_manifest');
assert.match(schemaSql, /create table if not exists public\.icon_search_private_features/i, 'schema should create icon_search_private_features');
assert.match(schemaSql, /create table if not exists public\.search_request_audit/i, 'schema should create search_request_audit');

console.log('verify-search-catalog-sync: ok');
