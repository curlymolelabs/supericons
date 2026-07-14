import type { CandidateRow } from './types.ts';

export type MaterialVariant = 'outline' | 'solid';

export interface MaterialAssetRow {
  icon_id: string;
  variant: MaterialVariant;
  svg?: string | null;
}

export function isMaterialCandidate(row: Pick<CandidateRow, 'source_library'>) {
  return row.source_library === 'material';
}

export function resolveMaterialVariant(style: string): MaterialVariant {
  return style === 'solid' ? 'solid' : 'outline';
}

export function uniqueMaterialCandidateIds(rows: CandidateRow[]) {
  return [...new Set(rows.filter(isMaterialCandidate).map((row) => row.icon_id))];
}

export function filterEligibleMaterialCandidates(rows: CandidateRow[], eligibleIconIds: Set<string>) {
  return rows.filter((row) => !isMaterialCandidate(row) || eligibleIconIds.has(row.icon_id));
}

export function materialStyleMatches(row: CandidateRow, requestedStyle: string) {
  return requestedStyle === 'any' || isMaterialCandidate(row) || row.style === requestedStyle;
}
