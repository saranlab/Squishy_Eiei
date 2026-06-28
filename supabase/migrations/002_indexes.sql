-- ─────────────────────────────────────────────────────────────────────────────
-- 002 · Performance indexes
-- ─────────────────────────────────────────────────────────────────────────────

-- Squishies by creator
CREATE INDEX idx_squishies_creator    ON squishies(creator_id);

-- Published feed (partial index — only rows that qualify)
CREATE INDEX idx_squishies_published  ON squishies(published_at DESC)
  WHERE is_published = true;

-- Stats leaderboard
CREATE INDEX idx_stats_play_count     ON squishy_stats(play_count DESC);
CREATE INDEX idx_stats_like_count     ON squishy_stats(like_count DESC);

-- Composite: top published by plays (used by get_top_today)
CREATE INDEX idx_squishies_stats_top
  ON squishies(id) WHERE is_published = true;

-- Likes deduplication check
CREATE INDEX idx_likes_lookup         ON likes(squishy_id, anonymous_id);
CREATE INDEX idx_likes_squishy        ON likes(squishy_id);

-- Creator name search
CREATE INDEX idx_creators_name        ON creators(lower(name));
