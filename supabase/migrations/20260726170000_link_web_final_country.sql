begin;

with linked_country as (
  select
    audit.episode_id,
    audit.environment,
    min(upper(audit.country_code)) as country_code,
    case
      when count(distinct audit.geo_source) filter (
        where audit.geo_source is not null and trim(audit.geo_source) <> ''
      ) = 1
        then min(audit.geo_source) filter (
          where audit.geo_source is not null and trim(audit.geo_source) <> ''
        )
      else null
    end as geo_source
  from public.search_request_audit as audit
  where audit.channel = 'web'
    and audit.episode_id is not null
    and upper(audit.country_code) ~ '^[A-Z]{2}$'
    and upper(audit.country_code) not in ('XX', 'ZZ', 'T1')
  group by audit.episode_id, audit.environment
  having count(distinct upper(audit.country_code)) = 1
)
update public.search_final_outcomes as final
set
  country_code = linked.country_code,
  geo_source = linked.geo_source
from linked_country as linked
where final.channel = 'web'
  and final.country_code is null
  and final.episode_id = linked.episode_id
  and final.environment = linked.environment;

commit;
