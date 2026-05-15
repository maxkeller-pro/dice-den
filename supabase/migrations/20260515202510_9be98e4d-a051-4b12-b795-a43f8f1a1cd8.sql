
-- 1. Roles infrastructure
do $$ begin
  create type public.app_role as enum ('admin', 'moderator', 'user');
exception when duplicate_object then null; end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

drop policy if exists "roles readable by all authed" on public.user_roles;
create policy "roles readable by all authed"
  on public.user_roles for select
  to authenticated using (true);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- 2. Resolve duplicate usernames before adding the unique index
with dups as (
  select user_id, username,
    row_number() over (partition by lower(username) order by created_at) as rn
  from public.profiles
)
update public.profiles p
set username = p.username || '-' || substr(p.user_id::text, 1, 4)
from dups
where dups.user_id = p.user_id and dups.rn > 1;

create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username));

-- 3. Username setter enforces uniqueness with a friendly error
create or replace function public.rpc_set_username(p_username text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := trim(p_username);
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  if length(v_name) < 1 or length(v_name) > 24 then
    raise exception 'Display name must be between 1 and 24 characters';
  end if;

  -- Reserve "Admin" so it cannot be claimed by random users
  if lower(v_name) = 'admin' and not public.has_role(auth.uid(), 'admin') then
    raise exception 'This display name is reserved';
  end if;

  if exists (
    select 1 from public.profiles
    where lower(username) = lower(v_name) and user_id <> auth.uid()
  ) then
    raise exception 'Display name already taken';
  end if;

  insert into public.profiles (user_id, username)
  values (auth.uid(), v_name)
  on conflict (user_id) do update set username = excluded.username;
end;
$$;

-- 4. Auto-grant admin role to anyone whose display name is "Admin"
create or replace function public.sync_admin_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(new.username) = 'admin' then
    insert into public.user_roles (user_id, role)
    values (new.user_id, 'admin')
    on conflict do nothing;
  else
    if tg_op = 'UPDATE' and lower(old.username) = 'admin' then
      delete from public.user_roles
      where user_id = new.user_id and role = 'admin';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_sync_admin_role on public.profiles;
create trigger profiles_sync_admin_role
after insert or update of username on public.profiles
for each row execute function public.sync_admin_role();

-- Backfill: grant admin to any existing Admin profiles
insert into public.user_roles (user_id, role)
select user_id, 'admin'::public.app_role
from public.profiles
where lower(username) = 'admin'
on conflict do nothing;
