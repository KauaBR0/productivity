-- Productivy - Supabase indexes + RLS starter policies (idempotent)
-- Run in Supabase SQL editor.

-- Extensions
create extension if not exists pg_trgm;

-- Indexes
create index if not exists focus_sessions_user_completed_idx
  on public.focus_sessions (user_id, completed_at desc);

create index if not exists focus_sessions_user_started_idx
  on public.focus_sessions (user_id, started_at desc);

create unique index if not exists follows_unique_edge_idx
  on public.follows (follower_id, following_id);

create index if not exists follows_follower_idx
  on public.follows (follower_id);

create index if not exists follows_following_idx
  on public.follows (following_id);

create unique index if not exists group_members_unique_idx
  on public.group_members (group_id, user_id);

create index if not exists group_members_user_idx
  on public.group_members (user_id);

create index if not exists group_members_group_idx
  on public.group_members (group_id);

create unique index if not exists groups_join_code_unique_idx
  on public.groups (join_code);

create index if not exists groups_owner_idx
  on public.groups (owner_id);

create index if not exists profiles_username_trgm_idx
  on public.profiles using gin (username gin_trgm_ops);

create index if not exists profiles_phone_idx
  on public.profiles (phone);

-- RLS: enable
alter table public.profiles enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.follows enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;

-- RLS: policies (guarded with IF NOT EXISTS)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
      and policyname = 'profiles_select_auth'
  ) then
    create policy profiles_select_auth
      on public.profiles for select
      using (auth.role() = 'authenticated');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
      and policyname = 'profiles_insert_own'
  ) then
    create policy profiles_insert_own
      on public.profiles for insert
      with check (id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
      and policyname = 'profiles_update_own'
  ) then
    create policy profiles_update_own
      on public.profiles for update
      using (id = auth.uid())
      with check (id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'focus_sessions'
      and policyname = 'focus_sessions_select_own'
  ) then
    create policy focus_sessions_select_own
      on public.focus_sessions for select
      using (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'focus_sessions'
      and policyname = 'focus_sessions_insert_own'
  ) then
    create policy focus_sessions_insert_own
      on public.focus_sessions for insert
      with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'follows'
      and policyname = 'follows_select_auth'
  ) then
    create policy follows_select_auth
      on public.follows for select
      using (auth.role() = 'authenticated');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'follows'
      and policyname = 'follows_insert_own'
  ) then
    create policy follows_insert_own
      on public.follows for insert
      with check (follower_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'follows'
      and policyname = 'follows_delete_own'
  ) then
    create policy follows_delete_own
      on public.follows for delete
      using (follower_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'groups'
      and policyname = 'groups_select_member'
  ) then
    create policy groups_select_member
      on public.groups for select
      using (
        owner_id = auth.uid()
        or exists (
          select 1 from public.group_members gm
          where gm.group_id = groups.id and gm.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'groups'
      and policyname = 'groups_insert_owner'
  ) then
    create policy groups_insert_owner
      on public.groups for insert
      with check (owner_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'groups'
      and policyname = 'groups_update_owner'
  ) then
    create policy groups_update_owner
      on public.groups for update
      using (owner_id = auth.uid())
      with check (owner_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'groups'
      and policyname = 'groups_delete_owner'
  ) then
    create policy groups_delete_owner
      on public.groups for delete
      using (owner_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'group_members'
      and policyname = 'group_members_select_member'
  ) then
    create policy group_members_select_member
      on public.group_members for select
      using (
        exists (
          select 1 from public.group_members gm
          where gm.group_id = group_members.group_id and gm.user_id = auth.uid()
        )
        or exists (
          select 1 from public.groups g
          where g.id = group_members.group_id and g.owner_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'group_members'
      and policyname = 'group_members_insert_self_or_owner'
  ) then
    create policy group_members_insert_self_or_owner
      on public.group_members for insert
      with check (
        user_id = auth.uid()
        or exists (
          select 1 from public.groups g
          where g.id = group_members.group_id and g.owner_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'group_members'
      and policyname = 'group_members_delete_self_or_owner'
  ) then
    create policy group_members_delete_self_or_owner
      on public.group_members for delete
      using (
        user_id = auth.uid()
        or exists (
          select 1 from public.groups g
          where g.id = group_members.group_id and g.owner_id = auth.uid()
        )
      );
  end if;
end $$;

-- Notes:
-- - If create_group/join_group_by_code RPCs are not SECURITY DEFINER, they may need
--   their own policies or explicit grants.
