import purposeChipCategoryMap from '../../data/si-registry/source-maps/purpose-chip-category-map.json' with { type: 'json' };
import { JOB_ICON_TAXONOMY_SEED } from '../icon-taxonomy-seed.js';

export const PURPOSE_CHIP_CATEGORY_MAP = purposeChipCategoryMap;
export const PURPOSE_CHIP_LANE_ORDER = [...purposeChipCategoryMap.lane_order];

function cloneStrings(values) {
  return Array.isArray(values) ? values.filter((value) => typeof value === 'string').map((value) => value.trim()).filter(Boolean) : [];
}

export function getPurposeChipLaneConfig(laneId) {
  const laneConfig = purposeChipCategoryMap.lanes[laneId];
  if (!laneConfig) {
    throw new Error(`Unknown purpose-chip lane: ${laneId}`);
  }
  return laneConfig;
}

export function buildPurposeChipWorklist(seed = JOB_ICON_TAXONOMY_SEED) {
  if (!Array.isArray(seed)) {
    throw new Error('Purpose-chip seed must be an array');
  }

  return seed.map((entry) => {
    const laneConfig = getPurposeChipLaneConfig(entry.jobCategory);

    return {
      icon_id: entry.iconId,
      source_library: entry.sourceLibrary,
      purpose_chip_category_id: laneConfig.id,
      purpose_chip_category_label: laneConfig.label,
      rank: entry.rank,
      secondary_categories: cloneStrings(entry.secondaryCategories),
    };
  });
}

export function groupPurposeChipWorklistByLane(worklist) {
  const grouped = {};

  for (const laneId of PURPOSE_CHIP_LANE_ORDER) {
    grouped[laneId] = [];
  }

  for (const item of worklist) {
    if (!grouped[item.purpose_chip_category_id]) {
      grouped[item.purpose_chip_category_id] = [];
    }
    grouped[item.purpose_chip_category_id].push(item);
  }

  return grouped;
}

export function summarizePurposeChipWorklist(worklist) {
  const grouped = groupPurposeChipWorklistByLane(worklist);
  return PURPOSE_CHIP_LANE_ORDER.reduce((summary, laneId) => {
    summary[laneId] = grouped[laneId]?.length || 0;
    return summary;
  }, {});
}
