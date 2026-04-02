-- Supericons Auth: si_profiles table and auto-creation trigger
-- Run this in Supabase SQL Editor

-- 1. Profiles table (namespaced with si_ to avoid conflicts)
create table if not exists si_profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  display_name text,
  avatar_url   text,
  created_at   timestamptz default now()
);

-- 2. Enable RLS
alter table si_profiles enable row level security;

-- 3. Policies: users can only read/update their own profile
create policy "si_profiles_select_own"
  on si_profiles for select
  using (auth.uid() = id);

create policy "si_profiles_update_own"
  on si_profiles for update
  using (auth.uid() = id);

-- 4. Auto-create profile on new user signup
create or replace function si_handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into si_profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

-- 5. Trigger: fires after insert on auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure si_handle_new_user();
