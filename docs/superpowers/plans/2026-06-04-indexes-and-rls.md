# Supabase RLS + Indexes Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish Supabase CLI migration history from the live schema, then apply a single migration that enables RLS and adds indexes on `waitlist`, `user_preferences`, and `entropy_scores`.

**Architecture:** Pull the live schema as migration 001 (baseline), author migration 002 with RLS policies and indexes, push to production via `supabase db push`. Verify using pg_catalog queries run in the Supabase SQL editor before and after.

**Tech Stack:** Supabase CLI, PostgreSQL (RLS, pg_catalog), SQL

---

## File Map

| File | Status | Purpose |
|------|--------|---------|
| `supabase/config.toml` | Created by `supabase init` | CLI project config |
| `supabase/migrations/<ts1>_remote_schema.sql` | Created by `supabase db pull` | Baseline: current live schema |
| `supabase/migrations/<ts2>_indexes_and_rls.sql` | Authored in Task 4 | RLS policies + indexes |
| `supabase/verification/check_rls_and_indexes.sql` | Authored in Task 3 | Pre/post migration verification queries |

---

### Task 1: Install Supabase CLI and initialize the project

**Files:**
- Create: `supabase/config.toml` (via CLI)

- [ ] **Step 1: Install the Supabase CLI**

  On Windows via Scoop:
  ```powershell
  scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
  scoop install supabase
  ```

  Or via npm (cross-platform):
  ```bash
  npm install -g supabase
  ```

  Verify:
  ```bash
  supabase --version
  ```
  Expected: `2.x.x` or higher printed to stdout.

- [ ] **Step 2: Initialize the supabase directory**

  From the repo root:
  ```bash
  supabase init
  ```
  Expected: `supabase/` directory created containing `config.toml`.

- [ ] **Step 3: Find your project ref**

  Open your Supabase dashboard. The project ref is in the URL:
  `https://supabase.com/dashboard/project/<your-project-ref>`

  Alternatively, list projects via CLI:
  ```bash
  supabase login
  supabase projects list
  ```

- [ ] **Step 4: Link the CLI to your live project**

  ```bash
  supabase link --project-ref <your-project-ref>
  ```
  When prompted for the database password, use the one from Supabase dashboard → Project Settings → Database → Database password.

  Expected output: `Finished supabase link.`

- [ ] **Step 5: Commit**

  ```bash
  git add supabase/
  git commit -m "chore: initialize supabase CLI project"
  ```

---

### Task 2: Pull the live schema (baseline migration)

**Files:**
- Create: `supabase/migrations/<timestamp>_remote_schema.sql` (via CLI)

- [ ] **Step 1: Pull the remote schema**

  ```bash
  supabase db pull
  ```
  Expected: creates `supabase/migrations/<timestamp>_remote_schema.sql` containing the full DDL for all existing tables.

- [ ] **Step 2: Inspect the pulled migration**

  Open the generated file and confirm the following column names (note actuals if they differ — you'll need them in Task 4):

  | Table | Column | Expected type |
  |-------|--------|---------------|
  | `waitlist` | `email` | `text` or `varchar` |
  | `user_preferences` | `user_id` | `uuid` |
  | `entropy_scores` | `user_id` | `uuid` |
  | `entropy_scores` | `created_at` | `timestamptz` |

- [ ] **Step 3: Commit the baseline migration**

  ```bash
  git add supabase/migrations/
  git commit -m "chore: pull remote schema as migrations baseline"
  ```

---

### Task 3: Write verification SQL (run before and after migration)

**Files:**
- Create: `supabase/verification/check_rls_and_indexes.sql`

- [ ] **Step 1: Create the verification file**

  Create `supabase/verification/check_rls_and_indexes.sql`:

  ```sql
  -- ============================================================
  -- Run this in the Supabase SQL Editor BEFORE the migration.
  -- Re-run it AFTER to confirm the migration applied correctly.
  -- ============================================================

  -- 1. RLS enabled check
  -- BEFORE: rowsecurity = false for all three tables
  -- AFTER:  rowsecurity = true for all three tables
  SELECT tablename, rowsecurity
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('waitlist', 'user_preferences', 'entropy_scores')
  ORDER BY tablename;

  -- 2. Policy existence check
  -- BEFORE: 0 rows
  -- AFTER:  exactly 6 rows:
  --   entropy_scores    | user_insert_own_entropy_scores | INSERT  | {authenticated}
  --   entropy_scores    | user_select_own_entropy_scores | SELECT  | {authenticated}
  --   user_preferences  | user_insert_own_preferences    | INSERT  | {authenticated}
  --   user_preferences  | user_select_own_preferences    | SELECT  | {authenticated}
  --   user_preferences  | user_update_own_preferences    | UPDATE  | {authenticated}
  --   waitlist          | anon_insert_waitlist           | INSERT  | {anon}
  SELECT tablename, policyname, cmd, roles
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('waitlist', 'user_preferences', 'entropy_scores')
  ORDER BY tablename, policyname;

  -- 3. Index existence check
  -- BEFORE: 0 rows
  -- AFTER:  exactly 4 rows:
  --   entropy_scores    | idx_entropy_scores_user_id
  --   entropy_scores    | idx_entropy_scores_user_id_created_at
  --   user_preferences  | idx_user_preferences_user_id
  --   waitlist          | idx_waitlist_email
  SELECT indexname, tablename
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename IN ('waitlist', 'user_preferences', 'entropy_scores')
    AND indexname LIKE 'idx_%'
  ORDER BY tablename, indexname;

  -- 4. Duplicate email safety check
  -- BEFORE AND AFTER: must always return 0 rows.
  -- If rows appear before the migration, resolve duplicates first (see Task 5, Step 1).
  SELECT email, COUNT(*) AS count
  FROM public.waitlist
  GROUP BY email
  HAVING COUNT(*) > 1;
  ```

- [ ] **Step 2: Run the verification SQL before the migration**

  Open Supabase dashboard → SQL Editor. Paste and run the file contents.

  Expected results before the migration:
  - Query 1: all three tables show `rowsecurity = false`
  - Query 2: 0 rows
  - Query 3: 0 rows
  - Query 4: **0 rows** — if any rows appear here, stop and do not proceed until duplicates are resolved (see Task 5, Step 1 for the cleanup query)

- [ ] **Step 3: Commit the verification file**

  ```bash
  git add supabase/verification/check_rls_and_indexes.sql
  git commit -m "test: add pre/post verification SQL for RLS and indexes migration"
  ```

---

### Task 4: Write the RLS + indexes migration

**Files:**
- Create: `supabase/migrations/<timestamp>_indexes_and_rls.sql` (via CLI)

- [ ] **Step 1: Generate a new empty migration file**

  ```bash
  supabase migration new indexes_and_rls
  ```
  Expected: creates `supabase/migrations/<timestamp>_indexes_and_rls.sql` (empty file).

- [ ] **Step 2: Write the migration SQL**

  Open the newly created file and replace its contents with:

  ```sql
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
  ```

  > **If column names differ from Task 2 inspection:** replace `email`, `user_id`, and `created_at` with the actual column names found in the pulled schema.

- [ ] **Step 3: Commit the migration**

  ```bash
  git add supabase/migrations/
  git commit -m "feat: enable RLS and add indexes on waitlist, user_preferences, entropy_scores"
  ```

---

### Task 5: Apply the migration to production and verify

**Files:** None new.

- [ ] **Step 1: Resolve duplicate emails if found in Task 3 Step 2**

  Only run this if Query 4 returned rows. It keeps the earliest row per email:
  ```sql
  DELETE FROM public.waitlist
  WHERE id NOT IN (
    SELECT DISTINCT ON (email) id
    FROM public.waitlist
    ORDER BY email, created_at ASC
  );
  ```
  After running, re-confirm Query 4 returns 0 rows before continuing.

- [ ] **Step 2: Push the migration to production**

  ```bash
  supabase db push
  ```
  Expected output:
  ```
  Applying migration <timestamp>_indexes_and_rls.sql...
  Migration successful.
  ```

  If `supabase db push` reports the migration is already applied (because RLS was already enabled via the dashboard), run it with the `--include-all` flag or check migration history with `supabase migration list`.

- [ ] **Step 3: Run verification SQL after the migration**

  In the Supabase SQL editor, re-run `supabase/verification/check_rls_and_indexes.sql`.

  Expected results after the migration:
  - Query 1: all three tables show `rowsecurity = true`
  - Query 2: exactly 6 rows matching the table in Task 3 Step 1
  - Query 3: exactly 4 rows matching the `idx_` names above
  - Query 4: 0 rows

- [ ] **Step 4: Final commit**

  ```bash
  git commit --allow-empty -m "chore: RLS and indexes migration verified in production"
  ```
