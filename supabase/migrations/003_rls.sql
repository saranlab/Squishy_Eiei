-- ─────────────────────────────────────────────────────────────────────────────
-- 003 · Row Level Security
-- API routes run with service_role key (bypasses RLS).
-- anon key (frontend direct queries) is restricted below.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE creators      ENABLE ROW LEVEL SECURITY;
ALTER TABLE squishies     ENABLE ROW LEVEL SECURITY;
ALTER TABLE squishy_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes         ENABLE ROW LEVEL SECURITY;

-- ── creators ─────────────────────────────────────────────────────────────────
CREATE POLICY "creators_anon_read"    ON creators FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "creators_service_all"  ON creators FOR ALL    TO service_role         USING (true);

-- ── squishies ─────────────────────────────────────────────────────────────────
-- Public may only read published squishies; service_role can do everything
CREATE POLICY "squishies_anon_read"   ON squishies FOR SELECT TO anon, authenticated USING (is_published = true);
CREATE POLICY "squishies_service_all" ON squishies FOR ALL    TO service_role         USING (true);

-- ── squishy_stats ─────────────────────────────────────────────────────────────
CREATE POLICY "stats_anon_read"       ON squishy_stats FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "stats_service_all"     ON squishy_stats FOR ALL    TO service_role         USING (true);

-- ── likes ─────────────────────────────────────────────────────────────────────
CREATE POLICY "likes_anon_read"       ON likes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "likes_service_all"     ON likes FOR ALL    TO service_role         USING (true);
