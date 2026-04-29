import premiumCollectionMap from '../../data/si-registry/source-maps/premium-collection-map.json' with { type: 'json' };

function humanizeSlug(value) {
  return value
    .split('-')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function dedupeStrings(values) {
  const uniqueValues = [];
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmedValue = value.trim();
    if (!trimmedValue || uniqueValues.includes(trimmedValue)) continue;
    uniqueValues.push(trimmedValue);
  }
  return uniqueValues;
}

function buildUseWhen(rule, icon) {
  const signal = dedupeStrings(icon.tags || []).slice(0, 3).join(', ');
  if (signal) {
    return `Use when ${rule.useWhenContext} and the icon should communicate ${signal}.`;
  }
  return `Use when ${rule.useWhenContext}.`;
}

function buildAvoidWhen(rule) {
  return `Do not use when ${rule.avoidWhenContext}.`;
}

export function normalizePremiumManifest(manifest) {
  const normalizedRecords = [];

  for (const [slug, pack] of Object.entries(manifest || {})) {
    const rule = premiumCollectionMap[slug];

    if (!rule) {
      throw new Error(`Missing premium normalization rule for collection: ${slug}`);
    }

    for (const icon of pack.icons || []) {
      const sourceName = `${rule.idPrefix}-${icon.name}`;
      normalizedRecords.push({
        icon_id: `si:${sourceName}`,
        source_group: 'premium',
        source_library: 'si',
        source_name: sourceName,
        source_asset_name: icon.name,
        label: humanizeSlug(icon.name),
        purpose: icon.purpose,
        category: rule.category,
        semantic_tags: dedupeStrings([...(icon.tags || []), rule.domain, rule.category, slug]),
        use_when: buildUseWhen(rule, icon),
        avoid_when: buildAvoidWhen(rule),
        version: '1.0.0',
        status: 'draft',
        access_tier: 'protected_premium_record',
        projection_policy: 'internal_only',
        collection_id: slug,
        collection_title: pack.title || humanizeSlug(slug),
        is_premium: true,
        raw_category: icon.category,
        depicts: `Premium ${humanizeSlug(icon.name)} icon from the ${pack.title || humanizeSlug(slug)} collection.`,
        review_state: 'source_mapped',
        evidence: [
          'premium_pack_manifest',
          'premium_collection_map'
        ],
        editorialNotes: 'Source-mapped premium record. Keep protected until premium read surfaces and review flow are productized.'
      });
    }
  }

  return normalizedRecords;
}
