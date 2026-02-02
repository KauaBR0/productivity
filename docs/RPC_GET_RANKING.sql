-- FUNCTION: get_ranking_data
-- Calculates ranking aggregates server-side to avoid fetching thousands of rows.
-- Usage: supabase.rpc('get_ranking_data', { p_start_date: '...', p_user_ids: [...] })

CREATE OR REPLACE FUNCTION get_ranking_data(
  p_start_date timestamptz,
  p_end_date timestamptz DEFAULT now(),
  p_user_ids uuid[] DEFAULT null -- Array of IDs. If NULL, returns Global ranking.
)
RETURNS TABLE (
  id uuid,
  username text,
  avatar_url text,
  is_focusing boolean,
  minutes numeric
)
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with admin privileges to bypass row-level security for aggregation
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.username,
    p.avatar_url,
    p.is_focusing,
    COALESCE(SUM(fs.minutes), 0) as minutes
  FROM profiles p
  JOIN focus_sessions fs ON fs.user_id = p.id
  WHERE
    fs.completed_at >= p_start_date
    AND fs.completed_at <= p_end_date
    AND (p_user_ids IS NULL OR p.id = ANY(p_user_ids)) -- Native array filtering
  GROUP BY p.id, p.username, p.avatar_url, p.is_focusing
  ORDER BY minutes DESC
  LIMIT 100; -- Cap result to top 100 for performance
END;
$$;
