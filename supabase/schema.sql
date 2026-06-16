create table if not exists public.app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "Users can read own app state" on public.app_state;
create policy "Users can read own app state"
on public.app_state
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own app state" on public.app_state;
create policy "Users can insert own app state"
on public.app_state
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own app state" on public.app_state;
create policy "Users can update own app state"
on public.app_state
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
