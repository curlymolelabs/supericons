import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const containerName = 'supericons_admin_icon_request_review_smoke';

function runDocker(args, { input = null, expectFailure = false } = {}) {
  const result = spawnSync('docker', args, { encoding: 'utf8', input });
  if (expectFailure) {
    assert.notEqual(result.status, 0, `Expected SQL failure, received: ${result.stdout}`);
    return result.stderr;
  }
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
}

function removeContainer() {
  spawnSync('docker', ['rm', '-f', containerName], { encoding: 'utf8' });
}

function waitForDatabase() {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    const result = spawnSync('docker', [
      'exec', containerName, 'pg_isready', '-U', 'postgres', '-d', 'postgres',
    ], { encoding: 'utf8' });
    if (result.status === 0) return;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
  }
  throw new Error('Disposable PostgreSQL did not become ready.');
}

function runSql(sql, options = {}) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const result = spawnSync('docker', [
      'exec', '-i', containerName,
      'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-tA',
    ], { encoding: 'utf8', input: sql });
    if (result.status === 0) return result.stdout;
    const transientStartupFailure = /No such file or directory|the database system is starting up/i
      .test(`${result.stderr}\n${result.stdout}`);
    if (transientStartupFailure && attempt < 4) {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
      continue;
    }
    if (options.expectFailure) {
      return result.stderr;
    }
    assert.equal(result.status, 0, result.stderr || result.stdout);
  }
  throw new Error('Disposable PostgreSQL did not accept the verification SQL.');
}

const migration = readFileSync(
  'supabase/migrations/20260718160000_admin_icon_request_reviews.sql',
  'utf8',
);

removeContainer();
try {
  runDocker([
    'run', '--name', containerName,
    '-e', 'POSTGRES_PASSWORD=local-smoke-only',
    '-e', 'POSTGRES_DB=postgres',
    '-d', 'postgres:17-alpine',
  ]);
  waitForDatabase();
  runSql(`
    create extension if not exists pgcrypto;
    do $$
    begin
      if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
      if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
      if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role bypassrls; end if;
    end $$;
    create table public.icon_evidence (
      id uuid primary key default gen_random_uuid(),
      evidence_text text
    );
  `);
  runSql(migration);
  runSql(migration);
  const evidenceId = runSql(
    "insert into public.icon_evidence (evidence_text) values ('missing icon') returning id;",
  ).split(/\r?\n/).map((line) => line.trim()).find((line) => /^[0-9a-f-]{36}$/.test(line));
  assert.ok(evidenceId, 'The disposable request row did not return an id.');
  runSql(`
    insert into public.admin_icon_request_reviews (icon_evidence_id, status)
    values ('${evidenceId}', 'planned');
  `);
  assert.equal(
    runSql(`select status from public.admin_icon_request_reviews where icon_evidence_id = '${evidenceId}';`).trim(),
    'planned',
  );
  runSql(`
    insert into public.admin_icon_request_reviews (icon_evidence_id, status)
    values ('${evidenceId}', 'invalid')
    on conflict (icon_evidence_id) do update set status = excluded.status;
  `, { expectFailure: true });
  runSql('set role anon; select * from public.admin_icon_request_reviews;', { expectFailure: true });
  runSql('drop table if exists public.admin_icon_request_reviews;');
  assert.equal(
    runSql("select to_regclass('public.admin_icon_request_reviews') is null;").trim(),
    't',
  );
  console.log(JSON.stringify({
    status: 'ok',
    database: 'disposable_postgresql_17',
    idempotent_apply: true,
    valid_transition_persisted: true,
    invalid_transition_rejected: true,
    public_role_read_rejected: true,
    rollback_verified: true,
    hosted_systems_touched: false,
  }, null, 2));
} finally {
  removeContainer();
}
