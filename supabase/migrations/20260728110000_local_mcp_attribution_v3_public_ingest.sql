-- Public Local MCP v3 telemetry ingestion.
--
-- This wrapper keeps the raw installation UUID in memory only. It stores a
-- server-keyed hash and reads country only from the Supabase-provided
-- cf-ipcountry request header. The caller cannot provide country as a field.

begin;

do $$
begin
  if to_regprocedure(
    'public.si_log_mcp_search_outcome_v2(text,integer,text,text,text,text,text,text,text,text,text,integer,timestamptz)'
  ) is null then
    raise exception 'Required Local MCP v2 telemetry RPC is missing';
  end if;
  if to_regprocedure(
    'public.si_ingest_local_mcp_search_outcome_v3(text,integer,uuid,uuid,uuid,text,integer,text,text,text,text,text,text,text,text,integer,text,text,text,text,text,text)'
  ) is null then
    raise exception 'Required internal Local MCP v3 ingest RPC is missing';
  end if;
  if not exists (
    select 1
    from vault.decrypted_secrets
    where name = 'supericons_local_install_hash_v1'
      and char_length(decrypted_secret) >= 64
  ) then
    raise exception 'Required Local MCP installation hash secret is missing';
  end if;
end;
$$;

create or replace function public.si_log_local_mcp_search_outcome_v3(
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed_keys constant text[] := array[
    'contract_version',
    'install_id',
    'episode_id',
    'attempt_id',
    'recovery_chain_id',
    'query',
    'result_count',
    'library_filter',
    'library_mode',
    'search_outcome',
    'tool_name',
    'locale',
    'confidence_label',
    'beta_cohort',
    'mcp_server_version',
    'latency_ms',
    'client_family',
    'client_version',
    'os_platform',
    'session_hash'
  ];
  v_unknown_key text;
  v_install_id uuid;
  v_episode_id uuid;
  v_attempt_id uuid;
  v_recovery_chain_id uuid;
  v_secret text;
  v_install_hash text;
  v_rate_subject_hash text;
  v_allowed boolean;
  v_headers jsonb;
  v_country_code text;
  v_geo_source text;
  v_query text;
  v_client_family text;
  v_result jsonb;
begin
  if jsonb_typeof(p_payload) <> 'object'
     or octet_length(p_payload::text) > 8192 then
    raise exception 'payload must be a JSON object no larger than 8192 bytes'
      using errcode = '22023';
  end if;
  if (p_payload->>'contract_version')::integer <> 3 then
    raise exception 'unsupported telemetry contract version'
      using errcode = '22023';
  end if;

  select key
  into v_unknown_key
  from jsonb_object_keys(p_payload) as keys(key)
  where not (key = any(v_allowed_keys))
  limit 1;
  if v_unknown_key is not null then
    raise exception 'unsupported telemetry field'
      using errcode = '22023';
  end if;

  v_install_id := (p_payload->>'install_id')::uuid;
  v_episode_id := (p_payload->>'episode_id')::uuid;
  v_attempt_id := (p_payload->>'attempt_id')::uuid;
  v_recovery_chain_id := (p_payload->>'recovery_chain_id')::uuid;

  if v_install_id::text !~
       '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
     or v_episode_id::text !~
       '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
     or v_attempt_id::text !~
       '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
     or v_recovery_chain_id::text !~
       '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception 'installation and event identities must be random UUIDs'
      using errcode = '22023';
  end if;

  v_query := trim(coalesce(p_payload->>'query', ''));
  v_client_family := lower(trim(coalesce(p_payload->>'client_family', '')));
  if v_query = '' or char_length(v_query) > 500 then
    raise exception 'query is outside the supported range'
      using errcode = '22023';
  end if;
  if v_client_family !~ '^[a-z0-9][a-z0-9._-]{0,63}$' then
    raise exception 'client_family is invalid'
      using errcode = '22023';
  end if;
  if char_length(coalesce(p_payload->>'library_filter', '')) > 80
     or char_length(coalesce(p_payload->>'library_mode', '')) > 20
     or char_length(coalesce(p_payload->>'search_outcome', '')) > 20
     or char_length(coalesce(p_payload->>'tool_name', '')) > 40
     or char_length(coalesce(p_payload->>'locale', '')) > 32
     or char_length(coalesce(p_payload->>'confidence_label', '')) > 20
     or char_length(coalesce(p_payload->>'beta_cohort', '')) > 80
     or char_length(coalesce(p_payload->>'mcp_server_version', '')) > 40
     or char_length(coalesce(p_payload->>'client_version', '')) > 40
     or char_length(coalesce(p_payload->>'os_platform', '')) > 20
     or char_length(coalesce(p_payload->>'session_hash', '')) > 64 then
    raise exception 'telemetry field is outside the supported range'
      using errcode = '22023';
  end if;

  select decrypted_secret
  into v_secret
  from vault.decrypted_secrets
  where name = 'supericons_local_install_hash_v1'
  limit 1;
  if char_length(coalesce(v_secret, '')) < 64 then
    raise exception 'telemetry is unavailable';
  end if;

  v_install_hash := encode(
    extensions.hmac(
      'install|v1|' || v_install_id::text,
      v_secret,
      'sha256'
    ),
    'hex'
  );
  v_rate_subject_hash := encode(
    extensions.hmac(
      'rate|v1|' || v_install_id::text,
      v_secret,
      'sha256'
    ),
    'hex'
  );

  select rate.allowed
  into v_allowed
  from public.si_take_web_search_telemetry_rate_limit(
    v_rate_subject_hash,
    120,
    60
  ) as rate;
  if v_allowed is not true then
    raise exception 'telemetry rate limit reached'
      using errcode = '54000';
  end if;

  begin
    v_headers := coalesce(
      nullif(current_setting('request.headers', true), '')::jsonb,
      '{}'::jsonb
    );
  exception
    when others then
      v_headers := '{}'::jsonb;
  end;
  v_country_code := upper(trim(coalesce(v_headers->>'cf-ipcountry', '')));
  if v_country_code !~ '^[A-Z]{2}$'
     or v_country_code in ('XX', 'ZZ', 'T1') then
    v_country_code := null;
  end if;
  v_geo_source := case
    when v_country_code is not null then 'supabase_postgrest_cf'
    else null
  end;

  select public.si_ingest_local_mcp_search_outcome_v3(
    v_install_hash,
    1,
    v_episode_id,
    v_attempt_id,
    v_recovery_chain_id,
    v_query,
    (p_payload->>'result_count')::integer,
    p_payload->>'library_filter',
    p_payload->>'library_mode',
    p_payload->>'search_outcome',
    p_payload->>'tool_name',
    p_payload->>'locale',
    p_payload->>'confidence_label',
    p_payload->>'beta_cohort',
    p_payload->>'mcp_server_version',
    nullif(p_payload->>'latency_ms', '')::integer,
    v_client_family,
    p_payload->>'client_version',
    p_payload->>'os_platform',
    v_country_code,
    v_geo_source,
    p_payload->>'session_hash'
  )
  into v_result;

  return v_result;
end;
$$;

revoke all on function public.si_log_local_mcp_search_outcome_v3(jsonb)
  from public;
grant execute on function public.si_log_local_mcp_search_outcome_v3(jsonb)
  to anon, authenticated, service_role;

comment on function public.si_log_local_mcp_search_outcome_v3(jsonb) is
  'Public Local MCP v3 telemetry endpoint. Stores only a server-keyed installation hash.';

commit;
