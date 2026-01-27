-- Groups (MVP)
-- Tabelas
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  join_code text not null unique,
  member_limit int not null default 20,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index if not exists idx_group_members_user_id on public.group_members(user_id);
create index if not exists idx_group_members_group_id on public.group_members(group_id);

-- RLS
alter table public.groups enable row level security;
alter table public.group_members enable row level security;

-- Helpers (avoid recursion in RLS)
create or replace function public.is_group_member(
  p_group_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = p_group_id and gm.user_id = p_user_id
  );
$$;

create or replace function public.is_group_admin(
  p_group_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = p_group_id and gm.user_id = p_user_id
      and gm.role in ('owner','admin')
  );
$$;

create or replace function public.is_group_owner(
  p_group_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = p_group_id and gm.user_id = p_user_id
      and gm.role = 'owner'
  );
$$;

-- Groups: select only if member
drop policy if exists "groups_select_member" on public.groups;
create policy "groups_select_member" on public.groups
  for select using (public.is_group_member(id, auth.uid()));

-- Groups: insert only for self owner (fallback if not using RPC)
drop policy if exists "groups_insert_owner" on public.groups;
create policy "groups_insert_owner" on public.groups
  for insert with check (owner_id = auth.uid());

-- Groups: update only owner/admin
drop policy if exists "groups_update_admin" on public.groups;
create policy "groups_update_admin" on public.groups
  for update using (public.is_group_admin(id, auth.uid()));

-- Groups: delete only owner
drop policy if exists "groups_delete_owner" on public.groups;
create policy "groups_delete_owner" on public.groups
  for delete using (public.is_group_owner(id, auth.uid()));

-- Group members: select only if member of group
drop policy if exists "group_members_select_member" on public.group_members;
create policy "group_members_select_member" on public.group_members
  for select using (public.is_group_member(group_id, auth.uid()));

-- Group members: insert only for self (fallback if not using RPC)
drop policy if exists "group_members_insert_self" on public.group_members;
create policy "group_members_insert_self" on public.group_members
  for insert with check (user_id = auth.uid());

-- Group members: delete self or admin/owner
drop policy if exists "group_members_delete_self_or_admin" on public.group_members;
create policy "group_members_delete_self_or_admin" on public.group_members
  for delete using (
    user_id = auth.uid()
    or public.is_group_admin(group_id, auth.uid())
  );

-- Functions (RPC)
create or replace function public.create_group(
  p_name text,
  p_description text default null,
  p_member_limit int default 20
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_group_id uuid;
  v_code text;
  v_limit int;
begin
  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Group name is required';
  end if;

  v_limit := coalesce(p_member_limit, 20);
  if v_limit > 20 then
    v_limit := 20;
  elsif v_limit < 1 then
    v_limit := 1;
  end if;

  loop
    v_code := upper(substr(md5(gen_random_uuid()::text), 1, 6));
    exit when not exists (select 1 from public.groups where join_code = v_code);
  end loop;

  insert into public.groups (name, description, owner_id, join_code, member_limit)
  values (p_name, p_description, auth.uid(), v_code, v_limit)
  returning id into v_group_id;

  insert into public.group_members (group_id, user_id, role)
  values (v_group_id, auth.uid(), 'owner');

  return v_group_id;
end;
$$;

create or replace function public.join_group_by_code(
  p_code text
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_group_id uuid;
  v_limit int;
  v_count int;
begin
  select id, member_limit
    into v_group_id, v_limit
  from public.groups
  where join_code = p_code;

  if v_group_id is null then
    raise exception 'Group not found';
  end if;

  select count(*) into v_count
  from public.group_members
  where group_id = v_group_id;

  if v_count >= v_limit then
    raise exception 'Group full';
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (v_group_id, auth.uid(), 'member')
  on conflict do nothing;

  return v_group_id;
end;
$$;

-- Permitir execução das funções para authenticated
grant execute on function public.create_group(text, text, int) to authenticated;
grant execute on function public.join_group_by_code(text) to authenticated;
