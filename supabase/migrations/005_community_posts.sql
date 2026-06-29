-- ─────────────────────────────────────────────────────────────────────────────
-- 005 · Community posts (simple, name-only sharing)
-- Run this in the Supabase SQL Editor before deploying the share feature.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS community_posts (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_name VARCHAR(30)  NOT NULL CHECK (char_length(trim(creator_name)) >= 1),
  toy_data     JSONB        NOT NULL,
  likes        INTEGER      NOT NULL DEFAULT 0 CHECK (likes >= 0),
  plays        INTEGER      NOT NULL DEFAULT 0 CHECK (plays >= 0),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS community_posts_created_idx ON community_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS community_posts_likes_idx   ON community_posts (likes DESC);

ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can read posts (anon key from browser)
CREATE POLICY "community_posts_public_read"
  ON community_posts FOR SELECT USING (true);

-- Only service_role (API routes) can write
CREATE POLICY "community_posts_service_write"
  ON community_posts FOR ALL TO service_role USING (true) WITH CHECK (true);
