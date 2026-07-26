import { readFile } from 'node:fs/promises';

const countryMigration = await readFile(
  'supabase/migrations/20260726170000_link_web_final_country.sql',
  'utf8',
);
const countryRollback = await readFile(
  'supabase/rollbacks/20260726170000_link_web_final_country.down.sql',
  'utf8',
);
const localeMigration = await readFile(
  'supabase/migrations/20260726171000_web_interface_locale.sql',
  'utf8',
);
const localeRollback = await readFile(
  'supabase/rollbacks/20260726171000_web_interface_locale.down.sql',
  'utf8',
);

function requireText(source, value, label) {
  if (!source.includes(value)) {
    throw new Error(`${label} is missing: ${value}`);
  }
}

function forbidText(source, value, label) {
  if (source.includes(value)) {
    throw new Error(`${label} contains an unsafe pattern: ${value}`);
  }
}

[
  "audit.channel = 'web'",
  'final.episode_id = linked.episode_id',
  'final.environment = linked.environment',
  'having count(distinct upper(audit.country_code)) = 1',
  "upper(audit.country_code) not in ('XX', 'ZZ', 'T1')",
  'final.country_code is null',
].forEach((value) => requireText(countryMigration, value, 'Country migration'));

[
  'audit.query_norm',
  'final.query =',
  'created_at between',
  'completed_at',
  'anonymous_client_hash',
].forEach((value) => forbidText(countryMigration, value, 'Country migration'));

requireText(
  countryRollback,
  'leaves this correct',
  'Country rollback',
);

[
  'add column if not exists interface_locale text',
  'search_final_outcomes_interface_locale_valid',
  'interface_locale is null',
  'Effective website interface language',
].forEach((value) => requireText(localeMigration, value, 'Interface-locale migration'));

[
  'drop constraint if exists search_final_outcomes_interface_locale_valid',
  'drop column if exists interface_locale',
].forEach((value) => requireText(localeRollback, value, 'Interface-locale rollback'));

for (const [path, source] of [
  ['country migration', countryMigration],
  ['country rollback', countryRollback],
  ['interface-locale migration', localeMigration],
  ['interface-locale rollback', localeRollback],
]) {
  if (/[\u2013\u2014]/u.test(source)) {
    throw new Error(`${path} contains a forbidden dash character.`);
  }
}

console.log(JSON.stringify({
  status: 'ok',
  country_link: 'exact episode, channel, and environment with country agreement',
  historical_update: 'null Web countries only',
  interface_locale: 'nullable additive field',
  rollback_files: 2,
}, null, 2));
