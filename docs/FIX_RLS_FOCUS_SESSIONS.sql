-- FIX RLS POLICY FOR FOCUS SESSIONS
-- Currently, users can only see their own sessions. This prevents viewing other users' stats and history.
-- Run this script in the Supabase SQL Editor.

-- 1. Drop the restrictive policy
DROP POLICY IF EXISTS focus_sessions_select_own ON public.focus_sessions;

-- 2. Create a new policy allowing any authenticated user to view sessions
-- This enables the Public Profile screen to calculate totals and show history.
CREATE POLICY focus_sessions_select_auth
ON public.focus_sessions
FOR SELECT
USING (auth.role() = 'authenticated');
