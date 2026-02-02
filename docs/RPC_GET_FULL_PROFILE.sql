-- FUNCTION: get_full_profile
-- Fetches all profile data, counts, and relationship status in a single query.
-- Usage: supabase.rpc('get_full_profile', { p_target_id: '...', p_viewer_id: '...' })

CREATE OR REPLACE FUNCTION get_full_profile(
  p_target_id uuid,
  p_viewer_id uuid
)
RETURNS TABLE (
  id uuid,
  username text,
  avatar_url text,
  is_focusing boolean,
  current_streak integer,
  last_focus_date date,
  followers_count bigint,
  following_count bigint,
  total_focus_minutes numeric,
  total_cycles bigint,
  am_i_following boolean,
  follows_me boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.username,
    p.avatar_url,
    p.is_focusing,
    p.current_streak,
    p.last_focus_date,
    (SELECT COUNT(*) FROM follows WHERE following_id = p.id) as followers_count,
    (SELECT COUNT(*) FROM follows WHERE follower_id = p.id) as following_count,
    COALESCE((SELECT SUM(minutes) FROM focus_sessions WHERE user_id = p.id), 0) as total_focus_minutes,
    (SELECT COUNT(*) FROM focus_sessions WHERE user_id = p.id) as total_cycles,
    EXISTS (SELECT 1 FROM follows WHERE follower_id = p_viewer_id AND following_id = p.id) as am_i_following,
    EXISTS (SELECT 1 FROM follows WHERE follower_id = p.id AND following_id = p_viewer_id) as follows_me
  FROM profiles p
  WHERE p.id = p_target_id;
END;
$$;
