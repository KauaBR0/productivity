-- FIX INFINITE RECURSION IN RLS POLICIES
-- Run this script in the Supabase SQL Editor.

-- 1. Create a secure helper function to check group membership
-- This function runs as the definer (admin privileges) to bypass RLS recursion
CREATE OR REPLACE FUNCTION get_my_group_ids()
RETURNS setof uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT group_id FROM group_members WHERE user_id = auth.uid();
$$;

-- 2. Drop the problematic recursive policies
DROP POLICY IF EXISTS group_members_select_member ON public.group_members;
DROP POLICY IF EXISTS groups_select_member ON public.groups;

-- 3. Re-create Optimized Policies

-- Policy for Groups: Visible if I am the owner OR if I am a member
CREATE POLICY groups_select_member
ON public.groups
FOR SELECT
USING (
  owner_id = auth.uid()
  OR id IN (SELECT get_my_group_ids())
);

-- Policy for Group Members: Visible if it's ME, OR if I'm in the group, OR if I own the group
CREATE POLICY group_members_select_member
ON public.group_members
FOR SELECT
USING (
  user_id = auth.uid()
  OR group_id IN (SELECT get_my_group_ids())
  OR exists (
    SELECT 1 FROM groups WHERE id = group_members.group_id AND owner_id = auth.uid()
  )
);
