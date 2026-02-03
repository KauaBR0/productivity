-- 1. Add columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS total_focus_minutes numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cycles integer DEFAULT 0;

-- 2. Create a function to update stats
CREATE OR REPLACE FUNCTION update_profile_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE profiles
    SET 
      total_focus_minutes = total_focus_minutes + NEW.minutes,
      total_cycles = total_cycles + 1
    WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE profiles
    SET 
      total_focus_minutes = total_focus_minutes - OLD.minutes,
      total_cycles = total_cycles - 1
    WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger
DROP TRIGGER IF EXISTS on_focus_session_change ON focus_sessions;

CREATE TRIGGER on_focus_session_change
AFTER INSERT OR DELETE ON focus_sessions
FOR EACH ROW
EXECUTE FUNCTION update_profile_stats();

-- 4. Backfill existing data (Run this once)
UPDATE profiles p
SET 
  total_focus_minutes = COALESCE((SELECT SUM(minutes) FROM focus_sessions WHERE user_id = p.id), 0),
  total_cycles = COALESCE((SELECT COUNT(*) FROM focus_sessions WHERE user_id = p.id), 0);
