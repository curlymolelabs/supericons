export interface CandidateRow {
  icon_id: string;
  name: string;
  source_library: string;
  style: string;
  icon_type: string;
  svg?: string | null;
  lexical_rank: number;
  registry_rank?: number;
  avoid_rank?: number;
  query_variant?: string;
  query_variant_rank?: number;
  intent_boost?: number;
  intent_penalty?: number;
}

export interface PrivateManifestRow {
  icon_id: string;
  semantic_aliases: string[];
  use_cases: string[];
  contraindications: string[];
  trust_tier: string;
  explanation_short: string | null;
}

export interface PrivateFeatureRow {
  icon_id: string;
  popularity_score: number;
  behavioral_score: number;
  editorial_score: number;
  replace_risk_score: number;
  manual_boost: number;
  manual_penalty: number;
}
