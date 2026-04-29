function normalizeCandidate(candidate) {
  if (typeof candidate !== 'string' || candidate.trim().length === 0) {
    return null;
  }
  return candidate.includes(':') ? candidate.split(':').slice(1).join(':') : candidate;
}

function buildSourceNameMaps(records, library) {
  const exact = new Map();
  const lower = new Map();

  for (const record of records.filter((item) => item.source_library === library)) {
    const sourceName = record.source_name;
    if (!exact.has(sourceName)) {
      exact.set(sourceName, []);
    }
    exact.get(sourceName).push(record);

    const lowerKey = sourceName.toLowerCase();
    if (!lower.has(lowerKey)) {
      lower.set(lowerKey, []);
    }
    lower.get(lowerKey).push(record);
  }

  return { exact, lower };
}

function buildCrossLibrarySourceNameMap(records, library) {
  const map = new Map();

  for (const record of records.filter((item) => item.source_library !== library)) {
    const key = record.source_name.toLowerCase();
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(record);
  }

  return map;
}

function buildConceptCandidates(concept) {
  const candidates = new Set();
  for (const sourceName of concept.registry_source_name_candidates || []) {
    const normalized = normalizeCandidate(sourceName);
    if (normalized) candidates.add(normalized);
  }
  for (const candidate of concept.registry_lookup_candidates || []) {
    const normalized = normalizeCandidate(candidate);
    if (normalized) candidates.add(normalized);
  }
  for (const baseConceptId of concept.base_concept_ids || []) {
    const normalized = normalizeCandidate(baseConceptId);
    if (normalized) candidates.add(normalized);
  }
  return [...candidates];
}

function uniqueCountForCandidates(candidates, map) {
  const matches = new Map();
  for (const candidate of candidates) {
    const key = candidate.toLowerCase();
    const records = map.get(key) || [];
    if (records.length > 0) {
      matches.set(key, records);
    }
  }
  return matches;
}

function getUnderscoreHyphenVariants(candidate) {
  const variants = new Set([candidate]);
  variants.add(candidate.replace(/-/g, '_'));
  variants.add(candidate.replace(/_/g, '-'));
  return [...variants];
}

function diagnoseConcept({
  concept,
  library,
  liveMaps,
  approvedMaps,
  crossLibraryLiveLower,
}) {
  const candidates = buildConceptCandidates(concept);
  const exactLiveMatches = [];
  const exactApprovedMatches = [];
  const crossLibraryMatches = [];

  for (const candidate of candidates) {
    for (const variant of getUnderscoreHyphenVariants(candidate)) {
      if (liveMaps.exact.has(variant)) {
        exactLiveMatches.push(...liveMaps.exact.get(variant));
      }
      if (approvedMaps.exact.has(variant)) {
        exactApprovedMatches.push(...approvedMaps.exact.get(variant));
      }
      if (crossLibraryLiveLower.has(variant.toLowerCase())) {
        crossLibraryMatches.push(...crossLibraryLiveLower.get(variant.toLowerCase()));
      }
    }
  }

  const lowerLiveMatches = uniqueCountForCandidates(candidates, liveMaps.lower);
  const lowerApprovedMatches = uniqueCountForCandidates(candidates, approvedMaps.lower);
  const lowerLiveAmbiguous = [...lowerLiveMatches.values()].some((records) => records.length > 1);
  const lowerApprovedAmbiguous = [...lowerApprovedMatches.values()].some((records) => records.length > 1);
  const hasHyphenUnderscoreNormalization =
    candidates.some((candidate) => candidate.includes('-') || candidate.includes('_')) &&
    (exactLiveMatches.length > 0 || exactApprovedMatches.length > 0);

  let bucket = 'no_registry_candidate_match';
  let reason = 'No verified registry match could be found for the concept candidates.';

  if (lowerLiveAmbiguous || lowerApprovedAmbiguous) {
    bucket = 'ambiguous_multi_match';
    reason = 'Lowercase candidate matching produced multiple possible records.';
  } else if (hasHyphenUnderscoreNormalization) {
    bucket = 'hyphen_underscore_mismatch';
    reason = 'A current library record exists under a hyphen/underscore variant of the candidate name.';
  } else if (crossLibraryMatches.length > 0) {
    bucket = 'ownership_conflict';
    reason = 'A similar source name already exists in another live library group and needs ownership review.';
  } else if ((concept.styles || []).includes('outline') && (concept.styles || []).includes('solid')) {
    bucket = 'variant_pair_gap';
    reason = 'The concept appears as an outline/solid pair but still has no resolved shared registry record.';
  } else if (candidates.length > 0) {
    bucket = 'missing_approved_record';
    reason = 'The concept has deterministic lookup candidates, but no current library approved record matches them.';
  }

  return {
    icon_id: concept.icon_id,
    base_concept_ids: concept.base_concept_ids || [],
    screenshot_files: concept.screenshot_files || [],
    styles: concept.styles || [],
    registry_source_name_candidates: concept.registry_source_name_candidates || [],
    registry_lookup_candidates: concept.registry_lookup_candidates || [],
    diagnosis_bucket: bucket,
    reason,
    evidence: {
      live_exact_matches: exactLiveMatches.map((record) => record.icon_id),
      approved_exact_matches: exactApprovedMatches.map((record) => record.icon_id),
      cross_library_live_matches: crossLibraryMatches.map((record) => `${record.source_library}:${record.source_name}`),
    },
  };
}

export function diagnoseUnmappedConcepts({ library, unresolvedConcepts, liveRecords, approvedRecords }) {
  const liveMaps = buildSourceNameMaps(liveRecords, library);
  const approvedMaps = buildSourceNameMaps(approvedRecords, library);
  const crossLibraryLiveLower = buildCrossLibrarySourceNameMap(liveRecords, library);
  const diagnosedConcepts = (unresolvedConcepts || []).map((concept) =>
    diagnoseConcept({
      concept,
      library,
      liveMaps,
      approvedMaps,
      crossLibraryLiveLower,
    })
  );

  const bucketCounts = diagnosedConcepts.reduce((counts, concept) => {
    counts[concept.diagnosis_bucket] = (counts[concept.diagnosis_bucket] || 0) + 1;
    return counts;
  }, {});

  const bucketSamples = Object.keys(bucketCounts)
    .sort()
    .reduce((samples, bucket) => {
      samples[bucket] = diagnosedConcepts
        .filter((concept) => concept.diagnosis_bucket === bucket)
        .slice(0, 10);
      return samples;
    }, {});

  return {
    library,
    unresolved_unmapped_count: diagnosedConcepts.length,
    bucket_counts: bucketCounts,
    bucket_samples: bucketSamples,
    concepts: diagnosedConcepts,
  };
}
