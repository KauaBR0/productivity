-- SECURE RLS POLICIES
-- Run this script to secure your database rows.

-- 1. PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow reading all profiles (Required for Search/Ranking)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by everyone" 
ON profiles FOR SELECT 
TO authenticated 
USING (true);

-- Allow users to update ONLY their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

-- 2. FOCUS SESSIONS
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;

-- Allow reading all sessions (Required for Global Stats/Ranking)
DROP POLICY IF EXISTS "Sessions are viewable by everyone" ON focus_sessions;
CREATE POLICY "Sessions are viewable by everyone" 
ON focus_sessions FOR SELECT 
TO authenticated 
USING (true);

-- Allow users to insert ONLY their own sessions
DROP POLICY IF EXISTS "Users can insert own sessions" ON focus_sessions;
CREATE POLICY "Users can insert own sessions" 
ON focus_sessions FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete ONLY their own sessions (Optional, for history cleanup)
DROP POLICY IF EXISTS "Users can delete own sessions" ON focus_sessions;
CREATE POLICY "Users can delete own sessions" 
ON focus_sessions FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- 3. FOLLOWS
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Allow reading follows (Required to see who follows whom)
DROP POLICY IF EXISTS "Follows are viewable by everyone" ON follows;
CREATE POLICY "Follows are viewable by everyone" 
ON follows FOR SELECT 
TO authenticated 
USING (true);

-- Allow users to Create/Delete follows only where they are the 'follower'
DROP POLICY IF EXISTS "Users can manage their follows" ON follows;
CREATE POLICY "Users can manage their follows" 
ON follows FOR ALL
TO authenticated 
USING (auth.uid() = follower_id)
WITH CHECK (auth.uid() = follower_id);

-- 4. PRIVACY RECOMMENDATION (Manual Action)
-- To hide phone numbers, run:
-- REVOKE SELECT (phone) ON TABLE profiles FROM authenticated;
-- *Note: This will break 'select *' queries. Ensure your app selects specific columns.*
