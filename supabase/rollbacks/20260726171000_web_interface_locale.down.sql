begin;

alter table public.search_final_outcomes
  drop constraint if exists search_final_outcomes_interface_locale_valid;

alter table public.search_final_outcomes
  drop column if exists interface_locale;

commit;
