#!/usr/bin/env node
// Verify all design-record source files (icon records and pack records)
// against the design-record shapes, plus cross-file consistency checks.
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDesignRecord, validatePackRecord, DESIGN_STATES } from '../lib/si-registry/design-record-shape.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const designDir = join(root, 'data', 'si-registry', 'source', 'design');

let files = [];
try {
  files = readdirSync(designDir).filter((f) => f.endsWith('.json'));
} catch {
  console.error(`No design directory at ${designDir}`);
  process.exit(1);
}

let total = 0;
let failed = 0;
const stateCounts = Object.fromEntries(DESIGN_STATES.map((s) => [s, 0]));
const packs = new Map();
const iconRecords = [];

// pass 1: packs
for (const file of files) {
  const doc = JSON.parse(readFileSync(join(designDir, file), 'utf8'));
  if (!doc.pack) continue;
  total += 1;
  try {
    validatePackRecord(doc.pack);
    packs.set(doc.pack.pack_id, doc.pack);
    console.log(`ok   pack ${doc.pack.pack_id} [${doc.pack.status}] · ${doc.pack.member_ids.length} members · ${doc.pack.design_language.craft_rules.length} craft rules · ${doc.pack.design_language.territory_map.claims.length} territory claims`);
  } catch (err) {
    failed += 1;
    console.error(`FAIL pack ${doc.pack.pack_id || file}: ${err.message}`);
  }
}

// pass 2: icon records
for (const file of files) {
  const doc = JSON.parse(readFileSync(join(designDir, file), 'utf8'));
  if (!Array.isArray(doc.records)) continue;
  const seen = new Set();
  for (const record of doc.records) {
    total += 1;
    try {
      validateDesignRecord(record);
      if (seen.has(record.icon_id)) throw new Error(`Duplicate icon_id in ${file}: ${record.icon_id}`);
      seen.add(record.icon_id);
      if (record.pack_id !== doc.pack_id) throw new Error(`pack_id mismatch for ${record.icon_id}`);
      const pack = packs.get(record.pack_id);
      if (pack && !pack.member_ids.includes(record.icon_id)) {
        throw new Error(`${record.icon_id} not in pack member_ids of ${record.pack_id}`);
      }
      stateCounts[record.design_state] += 1;
      iconRecords.push(record);
      console.log(`ok   ${record.icon_id} [${record.design_state}]`);
    } catch (err) {
      failed += 1;
      console.error(`FAIL ${record.icon_id || '(no id)'}: ${err.message}`);
    }
  }
}

// pass 3: cross-checks
const knownIds = new Set(iconRecords.map((r) => r.icon_id));
for (const pack of packs.values()) {
  for (const claim of pack.design_language.territory_map.claims) {
    if (!pack.member_ids.includes(claim.owner_si_id)) {
      failed += 1;
      console.error(`FAIL territory claim owner not a pack member: ${claim.owner_si_id}`);
    }
  }
}
for (const record of iconRecords) {
  for (const d of record.soul.distinct_from) {
    if (d.icon_id.startsWith('si:') && !knownIds.has(d.icon_id)) {
      console.log(`note ${record.icon_id}: distinct_from ${d.icon_id} has no record yet (ok pre-batch)`);
    }
  }
}

console.log(`\n${total} records checked, ${failed} failures`);
console.log('states:', Object.entries(stateCounts).filter(([, n]) => n > 0).map(([s, n]) => `${s}=${n}`).join(' '));
process.exit(failed ? 1 : 0);
