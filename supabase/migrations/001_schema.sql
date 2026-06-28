-- ─────────────────────────────────────────────────────────────────────────────
-- 001 · Initial schema
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── creators ─────────────────────────────────────────────────────────────────
CREATE TABLE creators (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(100)  NOT NULL CHECK (char_length(name) >= 1),
  avatar_url      TEXT,
  bio             TEXT          CHECK (char_length(bio) <= 500),
  total_squishies INTEGER       NOT NULL DEFAULT 0,
  total_likes     INTEGER       NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── squishies ─────────────────────────────────────────────────────────────────
CREATE TABLE squishies (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  title         VARCHAR(200)  NOT NULL CHECK (char_length(title) >= 1),
  creator_id    UUID          NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  thumbnail_url TEXT,
  config_json   JSONB         NOT NULL DEFAULT '{}',
  is_published  BOOLEAN       NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  published_at  TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── squishy_stats (1:1 with squishies) ───────────────────────────────────────
CREATE TABLE squishy_stats (
  squishy_id  UUID    PRIMARY KEY REFERENCES squishies(id) ON DELETE CASCADE,
  play_count  BIGINT  NOT NULL DEFAULT 0,
  like_count  BIGINT  NOT NULL DEFAULT 0,
  share_count BIGINT  NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── likes (anonymous, one per session) ───────────────────────────────────────
CREATE TABLE likes (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  squishy_id   UUID          NOT NULL REFERENCES squishies(id) ON DELETE CASCADE,
  anonymous_id VARCHAR(128)  NOT NULL,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT likes_unique UNIQUE (squishy_id, anonymous_id)
);

-- ── Triggers: updated_at ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION _set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER creators_updated_at
  BEFORE UPDATE ON creators FOR EACH ROW EXECUTE FUNCTION _set_updated_at();

CREATE TRIGGER squishies_updated_at
  BEFORE UPDATE ON squishies FOR EACH ROW EXECUTE FUNCTION _set_updated_at();

-- ── Trigger: auto-create stats row on squishy insert ─────────────────────────
CREATE OR REPLACE FUNCTION _create_squishy_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO squishy_stats (squishy_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_squishy_created
  AFTER INSERT ON squishies FOR EACH ROW EXECUTE FUNCTION _create_squishy_stats();
