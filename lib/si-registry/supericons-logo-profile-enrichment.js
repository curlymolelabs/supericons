export const SUPERICONS_LOGO_PACK = 'agentic-ai-tools-logos-001';
export const SUPERICONS_LOGO_ASSET_TYPE = 'brand-logo';
export const SUPERICONS_LOGO_ACCESS = 'free';
export const SUPERICONS_LOGO_QUALITY_STATUS = 'ready';
export const SUPERICONS_LOGO_RIGHTS =
  'Third-party logos belong to their respective owners. Use for identification and UI reference only; no affiliation or endorsement is implied.';
export const SUPERICONS_LOGO_VARIANTS = Object.freeze(['mono-svg']);

function uniqueStrings(values = []) {
  const seen = new Set();
  const output = [];

  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    output.push(trimmed);
  }

  return output;
}

export function buildSupericonsLogoProfileMap(profiles = []) {
  return new Map(
    profiles
      .filter((profile) => profile && typeof profile.icon_id === 'string' && profile.icon_id.trim())
      .map((profile) => [profile.icon_id.trim(), profile]),
  );
}

export function enrichSupericonsLogoRecord(record, profile) {
  if (!record || record.source_library !== 'si') return record;
  if (!profile) return record;

  const aliases = uniqueStrings([
    ...(record.synonyms || []),
    record.label,
    record.source_name,
  ]);
  const searchTerms = uniqueStrings([
    ...(record.semantic_tags || []),
    ...(record.ai_filter_tags || []),
    ...(record.secondary_categories || []),
    record.ai_category,
    record.ai_category_label,
    record.job_category,
    profile.meaning,
  ]);
  const filterTags = uniqueStrings([
    'agentic-ai-tools-pack',
    'brand-logo',
    record.ai_category,
    record.job_category,
    ...(record.ai_filter_tags || []),
  ]);

  return {
    ...record,
    id: record.icon_id,
    name: record.label,
    slug: record.source_name,
    asset_type: profile.asset_type || SUPERICONS_LOGO_ASSET_TYPE,
    pack: profile.pack || SUPERICONS_LOGO_PACK,
    source_url: profile.source_url,
    source_trust: profile.source_trust,
    meaning: profile.meaning || record.purpose,
    aliases,
    search_terms: searchTerms,
    filter_tags: filterTags,
    rights: profile.rights || SUPERICONS_LOGO_RIGHTS,
    variants: uniqueStrings(profile.variants || SUPERICONS_LOGO_VARIANTS),
    quality_status: profile.quality_status || SUPERICONS_LOGO_QUALITY_STATUS,
    access: profile.access || SUPERICONS_LOGO_ACCESS,
  };
}

export function enrichSupericonsLogoRecords(records = [], profiles = []) {
  const profilesByIconId = profiles instanceof Map
    ? profiles
    : buildSupericonsLogoProfileMap(profiles);

  return records.map((record) => (
    enrichSupericonsLogoRecord(record, profilesByIconId.get(record?.icon_id))
  ));
}
