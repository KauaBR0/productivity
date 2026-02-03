-- Optimize get_full_profile to use denormalized columns
-- We drop it first because changing return types (bigint to integer) requires a full replacement
DROP FUNCTION IF EXISTS get_full_profile(uuid, uuid);

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
  total_cycles integer, -- Changed from bigint to integer to match column type
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
    p.total_focus_minutes, -- Direct access!
    p.total_cycles,        -- Direct access!
    EXISTS (SELECT 1 FROM follows WHERE follower_id = p_viewer_id AND following_id = p.id) as am_i_following,
    EXISTS (SELECT 1 FROM follows WHERE follower_id = p.id AND following_id = p_viewer_id) as follows_me
  FROM profiles p
  WHERE p.id = p_target_id;
END;
$$;
