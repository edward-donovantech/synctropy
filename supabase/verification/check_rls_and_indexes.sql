-- ============================================================
-- Run this in the Supabase SQL Editor BEFORE the migration.
-- Re-run it AFTER to confirm the migration applied correctly.
-- ============================================================

-- 1. RLS enabled check
-- BEFORE: rowsecurity = false for entropy_scans; true for the other two (partial run)
-- AFTER:  rowsecurity = true for all three tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('waitlist', 'user_preferences', 'entropy_scans')
ORDER BY tablename;

-- 2. Policy existence check
-- BEFORE: 0 rows (dashboard policies were dropped by the migration)
-- AFTER:  exactly 6 rows:
--   entropy_scans     | user_insert_own_entropy_scans  | INSERT  | {authenticated}
--   entropy_scans     | user_select_own_entropy_scans  | SELECT  | {authenticated}
--   user_preferences  | user_insert_own_preferences    | INSERT  | {authenticated}
--   user_preferences  | user_select_own_preferences    | SELECT  | {authenticated}
--   user_preferences  | user_update_own_preferences    | UPDATE  | {authenticated}
--   waitlist          | anon_insert_waitlist           | INSERT  | {anon}
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('waitlist', 'user_preferences', 'entropy_scans')
ORDER BY tablename, policyname;

-- 3. Index existence check
-- BEFORE: 0 rows
-- AFTER:  exactly 3 rows:
--   entropy_scans  | idx_entropy_scans_user_id
--   entropy_scans  | idx_entropy_scans_user_id_scanned_at
--   waitlist       | idx_waitlist_email
-- (user_preferences has no extra index — id is the PK and already indexed)
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('waitlist', 'user_preferences', 'entropy_scans')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- 4. Duplicate email safety check
-- BEFORE AND AFTER: must always return 0 rows.
-- If rows appear before the migration, resolve duplicates first (see Task 5, Step 1).
SELECT email, COUNT(*) AS count
FROM public.waitlist
GROUP BY email
HAVING COUNT(*) > 1;
