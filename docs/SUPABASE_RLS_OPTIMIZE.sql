-- Productivy - RLS optimization + policy consolidation
-- Apply after SUPABASE_INDEXES_RLS.sql

-- Replace auth.* calls with (select auth.*) to avoid per-row eval.
-- Consolidate permissive policies so each action has a single policy.

-- PROFILES
drop policy if exists profiles_select_auth on public.profiles;
create policy profiles_select_auth
  on public.profiles for select
  using ((select auth.role()) = 'authenticated');

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
  on public.profiles for insert
  with check (id = (select auth.uid()));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles for update
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- FOCUS SESSIONS
drop policy if exists focus_sessions_select_own on public.focus_sessions;
create policy focus_sessions_select_own
  on public.focus_sessions for select
  using (user_id = (select auth.uid()));

drop policy if exists focus_sessions_insert_own on public.focus_sessions;
create policy focus_sessions_insert_own
  on public.focus_sessions for insert
  with check (user_id = (select auth.uid()));

-- FOLLOWS (consolidate)
drop policy if exists "User can follow" on public.follows;
drop policy if exists "User can unfollow" on public.follows;
drop policy if exists "Follows are public" on public.follows;
drop policy if exists follows_select_auth on public.follows;
drop policy if exists follows_insert_own on public.follows;
drop policy if exists follows_delete_own on public.follows;

create policy follows_select_auth
  on public.follows for select
  using ((select auth.role()) = 'authenticated');

create policy follows_insert_own
  on public.follows for insert
  with check (follower_id = (select auth.uid()));

create policy follows_delete_own
  on public.follows for delete
  using (follower_id = (select auth.uid()));

-- GROUPS
drop policy if exists groups_select_member on public.groups;
create policy groups_select_member
  on public.groups for select
  using (
    owner_id = (select auth.uid())
    or exists (
      select 1 from public.group_members gm
      where gm.group_id = groups.id
        and gm.user_id = (select auth.uid())
    )
  );

drop policy if exists groups_insert_owner on public.groups;
create policy groups_insert_owner
  on public.groups for insert
  with check (owner_id = (select auth.uid()));

-- Allow owner OR admin to update
drop policy if exists groups_update_owner on public.groups;
drop policy if exists groups_update_admin on public.groups;
create policy groups_update_owner_or_admin
  on public.groups for update
  using (
    owner_id = (select auth.uid())
    or exists (
      select 1 from public.group_members gm
      where gm.group_id = groups.id
        and gm.user_id = (select auth.uid())
        and gm.role in ('owner', 'admin')
    )
  )
  with check (
    owner_id = (select auth.uid())
    or exists (
      select 1 from public.group_members gm
      where gm.group_id = groups.id
        and gm.user_id = (select auth.uid())
        and gm.role in ('owner', 'admin')
    )
  );

drop policy if exists groups_delete_owner on public.groups;
create policy groups_delete_owner
  on public.groups for delete
  using (owner_id = (select auth.uid()));

-- GROUP MEMBERS
drop policy if exists group_members_select_member on public.group_members;
create policy group_members_select_member
  on public.group_members for select
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_members.group_id
        and gm.user_id = (select auth.uid())
    )
    or exists (
      select 1 from public.groups g
      where g.id = group_members.group_id
        and g.owner_id = (select auth.uid())
    )
  );

drop policy if exists group_members_insert_self on public.group_members;
drop policy if exists group_members_insert_self_or_owner on public.group_members;
create policy group_members_insert_self_or_owner
  on public.group_members for insert
  with check (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.groups g
      where g.id = group_members.group_id
        and g.owner_id = (select auth.uid())
    )
  );

drop policy if exists group_members_delete_self_or_admin on public.group_members;
drop policy if exists group_members_delete_self_or_owner on public.group_members;
create policy group_members_delete_self_or_admin
  on public.group_members for delete
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.groups g
      where g.id = group_members.group_id
        and g.owner_id = (select auth.uid())
    )
    or exists (
      select 1 from public.group_members gm
      where gm.group_id = group_members.group_id
        and gm.user_id = (select auth.uid())
        and gm.role in ('owner', 'admin')
    )
  );

-- Cleanup duplicate indexes created by the starter script
drop index if exists public.follows_unique_edge_idx;
drop index if exists public.group_members_unique_idx;
drop index if exists public.idx_group_members_group_id;
drop index if exists public.idx_group_members_user_id;
drop index if exists public.groups_join_code_unique_idx;
