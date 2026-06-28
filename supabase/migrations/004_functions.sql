-- ─────────────────────────────────────────────────────────────────────────────
-- 004 · Database functions (called via supabase.rpc())
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Atomic stat adjustment (increment or decrement) ──────────────────────────
-- p_delta = +1 to increment, -1 to decrement (floors at 0)
CREATE OR REPLACE FUNCTION adjust_stat(
  p_squishy_id UUID,
  p_column     TEXT,
  p_delta      INT DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE format(
    'UPDATE squishy_stats
     SET %I = GREATEST(0, %I + $2), updated_at = NOW()
     WHERE squishy_id = $1',
    p_column, p_column
  ) USING p_squishy_id, p_delta;
END;
$$;

-- ── Top squishies (sorted by play + like count) ───────────────────────────────
-- For true "today" plays you would add a play_events table and filter by date.
-- This initial version sorts by total counters — simple and fast.
CREATE OR REPLACE FUNCTION get_top_today(p_limit INT DEFAULT 20)
RETURNS TABLE (
  id            UUID,
  title         VARCHAR,
  creator_id    UUID,
  creator_name  VARCHAR,
  avatar_url    TEXT,
  thumbnail_url TEXT,
  config_json   JSONB,
  published_at  TIMESTAMPTZ,
  play_count    BIGINT,
  like_count    BIGINT,
  share_count   BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.title,
    s.creator_id,
    c.name          AS creator_name,
    c.avatar_url,
    s.thumbnail_url,
    s.config_json,
    s.published_at,
    st.play_count,
    st.like_count,
    st.share_count
  FROM squishies s
  JOIN creators c        ON c.id  = s.creator_id
  JOIN squishy_stats st  ON st.squishy_id = s.id
  WHERE s.is_published = true
  ORDER BY st.play_count DESC, st.like_count DESC
  LIMIT p_limit;
END;
$$;

-- ── Sync creator aggregate counters ──────────────────────────────────────────
-- Call after publish/unpublish or on a cron to keep totals consistent.
CREATE OR REPLACE FUNCTION sync_creator_stats(p_creator_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE creators SET
    total_squishies = (
      SELECT COUNT(*)
      FROM squishies
      WHERE creator_id = p_creator_id AND is_published = true
    ),
    total_likes = (
      SELECT COALESCE(SUM(st.like_count), 0)
      FROM squishies s
      JOIN squishy_stats st ON st.squishy_id = s.id
      WHERE s.creator_id = p_creator_id AND s.is_published = true
    )
  WHERE id = p_creator_id;
END;
$$;
