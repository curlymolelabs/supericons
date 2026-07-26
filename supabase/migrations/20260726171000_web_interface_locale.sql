begin;

alter table public.search_final_outcomes
  add column if not exists interface_locale text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.search_final_outcomes'::regclass
      and conname = 'search_final_outcomes_interface_locale_valid'
  ) then
    alter table public.search_final_outcomes
      add constraint search_final_outcomes_interface_locale_valid
      check (
        interface_locale is null
        or (
          char_length(interface_locale) between 2 and 32
          and interface_locale ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{2,8})*$'
        )
      );
  end if;
end
$$;

comment on column public.search_final_outcomes.interface_locale is
  'Effective website interface language. This is separate from the query-language locale field.';

commit;
