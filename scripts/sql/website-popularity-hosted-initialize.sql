\set ON_ERROR_STOP on

create temp table website_icon_availability_release_rows (
  icon_ref text primary key,
  outline_available boolean not null,
  solid_available boolean not null
) on commit drop;

create temp table website_icon_availability_release_state (
  outline_ref_count integer not null,
  solid_ref_count integer not null,
  outline_refs_sha256 text not null,
  solid_refs_sha256 text not null,
  outline_source_generated_at timestamptz not null,
  solid_source_generated_at timestamptz not null
) on commit drop;

\copy website_icon_availability_release_rows from '/release/availability.csv' with (format csv, header true)
\copy website_icon_availability_release_state from '/release/availability-state.csv' with (format csv, header true)

do $$
declare
  v_state website_icon_availability_release_state%rowtype;
  v_load_result jsonb;
  v_refresh_result jsonb;
begin
  select * into strict v_state
  from website_icon_availability_release_state;

  select public.si_replace_website_icon_grid_availability(
    (
      select jsonb_agg(
        jsonb_build_object(
          'icon_ref', rows.icon_ref,
          'outline_available', rows.outline_available,
          'solid_available', rows.solid_available
        )
        order by rows.icon_ref
      )
      from website_icon_availability_release_rows as rows
    ),
    v_state.outline_ref_count,
    v_state.solid_ref_count,
    v_state.outline_refs_sha256,
    v_state.solid_refs_sha256,
    v_state.outline_source_generated_at,
    v_state.solid_source_generated_at
  ) into v_load_result;

  if v_load_result ->> 'status' <> 'ok' then
    raise exception 'Availability load failed';
  end if;

  select public.si_refresh_website_icon_popularity()
  into v_refresh_result;

  if v_refresh_result ->> 'status' <> 'success' then
    raise exception 'Initial popularity refresh failed';
  end if;
end
$$;
