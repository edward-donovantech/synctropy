-- supabase/migrations/002_premium_features.sql

-- 1. Extend user_preferences
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS is_premium   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS storage_mode text    NOT NULL DEFAULT 'drive'
    CHECK (storage_mode IN ('drive', 'supabase', 'both'));

-- 2. Pipeline artifacts table
CREATE TABLE IF NOT EXISTS public.pipeline_artifacts (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  run_id        text        NOT NULL,
  skill_name    text        NOT NULL,
  pipeline_pos  int         NOT NULL,
  artifact      jsonb       NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_artifacts_user_run
  ON public.pipeline_artifacts (user_id, run_id, pipeline_pos);

-- 3. RLS on pipeline_artifacts
ALTER TABLE public.pipeline_artifacts ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read their own rows
CREATE POLICY "Users can view own artifacts"
  ON public.pipeline_artifacts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- No client INSERT/UPDATE/DELETE — service_role writes only
