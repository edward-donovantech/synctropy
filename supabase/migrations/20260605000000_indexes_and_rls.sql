-- ============================================================
-- Enable RLS on all three tables.
-- RLS blocks all client access by default.
-- service_role bypasses RLS automatically (BYPASSRLS privilege).
-- ============================================================

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entropy_scores ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- waitlist
-- Policy: anon INSERT only. No SELECT/UPDATE/DELETE for any
-- client role. service_role can still read/modify via BYPASSRLS.
-- ============================================================

DROP POLICY IF EXISTS "anon_insert_waitlist" ON public.waitlist;

CREATE POLICY "anon_insert_waitlist"
  ON public.waitlist
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- ============================================================
-- user_preferences
-- Policy: authenticated users read/write only their own row.
-- No delete from client. One row per user enforced by unique index.
-- ============================================================

DROP POLICY IF EXISTS "user_select_own_preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "user_insert_own_preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "user_update_own_preferences" ON public.user_preferences;

CREATE POLICY "user_select_own_preferences"
  ON public.user_preferences
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_insert_own_preferences"
  ON public.user_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_update_own_preferences"
  ON public.user_preferences
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- entropy_scores
-- Policy: authenticated users read and insert only their own rows.
-- No update, no delete — scan history is immutable from the client.
-- ============================================================

DROP POLICY IF EXISTS "user_select_own_entropy_scores" ON public.entropy_scores;
DROP POLICY IF EXISTS "user_insert_own_entropy_scores" ON public.entropy_scores;

CREATE POLICY "user_select_own_entropy_scores"
  ON public.entropy_scores
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_insert_own_entropy_scores"
  ON public.entropy_scores
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- Indexes
-- ============================================================

-- waitlist: unique email prevents duplicate signups at the DB level
CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_email
  ON public.waitlist (email);

-- user_preferences: unique user_id enforces one-row-per-user at the DB level
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_preferences_user_id
  ON public.user_preferences (user_id);

-- entropy_scores: user_id for filtering all rows belonging to one user
CREATE INDEX IF NOT EXISTS idx_entropy_scores_user_id
  ON public.entropy_scores (user_id);

-- entropy_scores: composite index for time-ordered scan history (primary dashboard read)
CREATE INDEX IF NOT EXISTS idx_entropy_scores_user_id_created_at
  ON public.entropy_scores (user_id, created_at DESC);
