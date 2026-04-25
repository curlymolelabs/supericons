import { PUBLIC_FIELDS } from './state.js';

export function mergeFinalRecordsIntoApprovedRecords({ approvedRecords, finalRecords }) {
  const finalBySourceName = new Map(finalRecords.map((record) => [record.source_name, record]));
  let replaced = 0;

  const merged = approvedRecords.map((record) => {
    const final = finalBySourceName.get(record.source_name);
    if (!final) {
      return record;
    }

    replaced += 1;
    const next = { ...record };
    for (const field of PUBLIC_FIELDS) {
      next[field] = final[field];
    }
    return next;
  });

  if (replaced !== finalRecords.length) {
    throw new Error(`Expected to replace ${finalRecords.length} records, replaced ${replaced}`);
  }

  return merged;
}
