-- Correct high-confidence controlled traffic that was recorded as live usage.
--
-- Rollback plan:
-- 1. Remove metadata.traffic_class only from rows whose beta_cohort is
--    controlled-run:historical-validation.
-- 2. Set that beta_cohort value back to null.
-- 3. Leave rows with an existing founder_controlled cohort unchanged.

begin;

update public.mcp_usage_events
set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
  'traffic_class',
  'controlled_test'
)
where beta_cohort like '%:founder_controlled'
   or beta_cohort like 'controlled-run:%';

update public.mcp_usage_events
set
  beta_cohort = 'controlled-run:historical-validation',
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'traffic_class',
    'controlled_test'
  )
where event_type = 'search_outcome'
  and channel = 'local_mcp'
  and client_family = 'mcp_stdio'
  and tool_name = 'recommend_icons'
  and created_at >= timestamptz '2026-07-20 00:00:00+00'
  and created_at < timestamptz '2026-07-23 00:00:00+00'
  and (
    query_norm in (
      'choose an icon for application settings.',
      'choose icons for application settings.',
      'choose icons for a running application.',
      'choose navigation icons for a fitness application.',
      'choose navigation and feature icons for a fitness application.'
    )
    or md5(query_norm) = '86e2af108cb51f212d849298b57a2244'
  );

commit;
