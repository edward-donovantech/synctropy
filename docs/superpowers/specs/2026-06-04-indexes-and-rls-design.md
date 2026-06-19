# Supabase Indexes and RLS Migration Design

**Date:** 2026-06-04
**Scope:** Single migration adding RLS policies and indexes to `waitlist`, `user_preferences`, and `entropy_scores`

---

## Context

Tables exist in a live Supabase project. No migrations exist yet — `supabase db pull` establishes the baseline before this migration is applied. This migration is the first hardening step: it enables RLS and defines exactly who can do what to each table.

---

## Migration Structure

Single file: `supabase/migrations/YYYYMMDDHHMMSS_indexes_and_rls.sql`

Operations applied in this order per table:
1. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` — blocks all client access by default
2. `DROP POLICY IF EXISTS ...` — removes any stale auto-generated policies
3. `CREATE POLICY ...` — applies exactly the required policies
4. `CREATE INDEX IF NOT EXISTS ...` — adds indexes

**Service role note:** Supabase grants `BYPASSRLS` to `service_role`. "Service role only" access is achieved by enabling RLS with no permissive policies — the table becomes invisible to `anon` and `authenticated` clients automatically. No explicit service_role policy is needed.

---

## Per-Table Design

### waitlist

**Purpose:** Public pre-signup. Email only. No `user_id`. Rows are a historical record; they are never linked to `auth.users`.

| Operation | Role | Allowed |
|-----------|------|---------|
| INSERT | anon | Yes — open |
| SELECT | anon / authenticated | No |
| UPDATE | anon / authenticated | No |
| DELETE | anon / authenticated | No |

**Policies:**
- `INSERT` for `anon` with `WITH CHECK (true)`
- No SELECT, UPDATE, or DELETE policies

**Indexes:**
- `UNIQUE INDEX` on `email` — prevents duplicate signups; enables fast service-role dedup lookups

---

### user_preferences

**Purpose:** Per-user preferences. One row per user. Inserted on first dashboard visit, upserted on changes.

| Operation | Role | Allowed |
|-----------|------|---------|
| SELECT | authenticated | Own row only (`user_id = auth.uid()`) |
| INSERT | authenticated | Own row only |
| UPDATE | authenticated | Own row only |
| DELETE | authenticated | No |

**Policies:**
- `SELECT` for `authenticated`: `USING (user_id = auth.uid())`
- `INSERT` for `authenticated`: `WITH CHECK (user_id = auth.uid())`
- `UPDATE` for `authenticated`: `USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())`

**Indexes:**
- `UNIQUE INDEX` on `user_id` — enforces one-row-per-user at the DB level; makes owner lookups O(1)

---

### entropy_scans

**Purpose:** Per-scan records. One row per scan per user. Append-only — scan history is immutable from the client.

> **Note:** Table is named `entropy_scans` in the live DB (not `entropy_scores` as initially stated).

| Operation | Role | Allowed |
|-----------|------|---------|
| SELECT | authenticated | Own rows only (`user_id = auth.uid()`) |
| INSERT | authenticated | Own rows only |
| UPDATE | authenticated | No |
| DELETE | authenticated | No |

**Policies:**
- `SELECT` for `authenticated`: `USING (user_id = auth.uid())`
- `INSERT` for `authenticated`: `WITH CHECK (user_id = auth.uid())`

**Indexes:**
- `INDEX` on `user_id` — fast row filtering per user
- `INDEX` on `(user_id, created_at DESC)` — optimizes time-ordered scan history queries (primary dashboard read pattern)

---

## Pre-existing Dashboard Policies

The live DB had two policies created via the Supabase dashboard before CLI migrations were established. The migration explicitly drops them before creating the correct ones:

| Table | Dashboard policy | Problem |
|-------|-----------------|---------|
| `waitlist` | `"Anyone can join waitlist"` (INSERT) | Name mismatch; possibly allows authenticated role too |
| `user_preferences` | `"Users manage own preferences"` (ALL) | ALL includes DELETE — too permissive |

## What This Does Not Cover

- Column definitions — pulled from the live DB via `supabase db pull`
- Waitlist email format validation — can be added as a `CHECK` constraint in a future migration if needed
- Soft-delete or archival patterns — out of scope for v1
