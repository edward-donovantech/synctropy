# Premium Skill Artifact Storage — Design Spec

**Date:** 2026-06-19
**Status:** Approved

## Context

The Synctropy 12-skill pipeline (skills 00–11) currently writes its per-step JSON and Markdown artifacts to Google Drive (`_Synctropy/` folder) or local filesystem as fallback. There is no cloud-backed storage for these artifacts.

This spec adds a premium tier: users who pay can have every skill artifact persisted to Supabase in addition to, or instead of, Google Drive. The storage destination is user-configurable per pipeline run.

---

## Data Layer (Supabase)

### 1. Schema changes to `user_preferences`

```sql
ALTER TABLE user_preferences
  ADD COLUMN is_premium     boolean NOT NULL DEFAULT false,
  ADD COLUMN storage_mode   text    NOT NULL DEFAULT 'drive'
    CHECK (storage_mode IN ('drive', 'supabase', 'both'));
```

- `is_premium`: set manually or by a future billing webhook.
- `storage_mode`: controls where skill artifacts are written.
  - `'drive'` (default) — Google Drive only (free and premium)
  - `'supabase'` — Supabase only (premium)
  - `'both'` — Drive + Supabase (premium)

### 2. New `pipeline_artifacts` table

```sql
CREATE TABLE pipeline_artifacts (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  run_id        text        NOT NULL,
  skill_name    text        NOT NULL,
  pipeline_pos  int         NOT NULL,
  artifact      jsonb       NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pipeline_artifacts_user_run
  ON pipeline_artifacts (user_id, run_id, pipeline_pos);
```

**RLS:**
- `SELECT`: authenticated users can read their own rows (`user_id = auth.uid()`).
- `INSERT/UPDATE/DELETE`: blocked from client. MCP server writes via `service_role` key only.

**`run_id` convention:**  
ISO 8601 timestamp of when the first skill in the run executed (e.g. `"2026-06-19T19:00:00Z"`). Mid-pipeline skills inherit the `run_id` from the prior skill's artifact or output file header.

---

## MCP Server — Two New Tools

**File:** `mcp-server/src/` — add `user-config.ts` and extend `handler.ts` / `index.ts` for tool registration.

### Tool 1: `get_user_config`

```typescript
// Input
{ userId: string }  // UUID

// Output
{
  is_premium: boolean,
  storage_mode: 'drive' | 'supabase' | 'both'
}
```

Queries `user_preferences` via Supabase service role key. Returns defaults if no row found.

### Tool 2: `save_pipeline_artifact`

```typescript
// Input
{
  userId:       string,   // UUID
  run_id:       string,   // ISO timestamp string
  skill_name:   string,   // e.g. "01-scan-surface"
  pipeline_pos: number,   // 0–11
  artifact:     object    // full skill JSON output
}

// Output
{ id: string }  // inserted row UUID
```

Inserts into `pipeline_artifacts` via service role key. Same pattern as existing `persistScan` in `persistence.ts`.

Both tools use `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` env vars (already present).

---

## Skill Updates — Pattern Applied to All 12 Skills

### New shared document

`~/.claude/skills/_shared/premium-storage.md` — defines the pattern once. Each skill references it rather than duplicating logic.

### Pattern added to every skill's output step

Each skill's "Write files" step gains three sub-steps:

```markdown
### Step N: Write output

**Step Na — Resolve storage targets**
If Synctropy MCP is connected (synctropy_connected = true) AND userId is known:
  Call `get_user_config` with userId.
  Derive:
    write_supabase = is_premium AND storage_mode IN ('supabase', 'both')
    write_drive    = storage_mode IN ('drive', 'both') OR NOT is_premium
Else (no MCP or no userId):
    write_supabase = false
    write_drive    = true

**Step Nb — Write to Supabase (premium)**
If write_supabase:
  Call `save_pipeline_artifact` with:
    { userId, run_id, skill_name, pipeline_pos, artifact: <full skill JSON> }
  On success: "✓ Artifact saved to Synctropy cloud (premium)"
  On failure: log warning, fall back to write_drive = true, continue.

**Step Nc — Write to Drive / local**
If write_drive:
  [existing Drive write logic — unchanged]
```

**`run_id` resolution per skill:**
- Skill 00: generate `run_id = new Date().toISOString()`, write into `connectors.json` header.
- Skills 01–11: read `run_id` from the prior skill's artifact or from the `_Synctropy/` Drive folder if resuming mid-pipeline. If not found, generate a new one.

### Files to update

All 12 SKILL.md files in `~/.claude/skills/`:
- `00-scan-connectors`, `01-scan-surface`, `02-scan-deep`, `03-read-unknowns`
- `04-build-inventory`, `05-propose-structure`, `06-plan-moves`, `07-dry-run`
- `08-execute`, `09-verify`, `10-revert`, `11-maintain`

Pattern is identical in each — reference `_shared/premium-storage.md` and add Steps Na/Nb/Nc to the output section.

---

## Frontend

No new pages required. Existing `/settings` route (PreferencesForm) should expose two new fields:

- **Premium status** (`is_premium`): read-only badge ("Premium" / "Free") — set server-side only.
- **Storage mode** (`storage_mode`): dropdown select with options Drive / Supabase / Both. Only visible/enabled when `is_premium = true`.

These map to the two new columns in `user_preferences`. The existing `usePreferences()` React Query hook and UPSERT logic in `queries.ts` need the two new fields added.

---

## Migration File

`supabase/migrations/002_premium_features.sql`

Contains:
1. `ALTER TABLE user_preferences` for `is_premium` + `storage_mode`.
2. `CREATE TABLE pipeline_artifacts` + index + RLS policies.

---

## Verification

1. Apply migration → confirm columns on `user_preferences`, confirm `pipeline_artifacts` table exists.
2. Set `is_premium = true`, `storage_mode = 'supabase'` for test user via Supabase dashboard.
3. Run `get_user_config` MCP tool → expect `{ is_premium: true, storage_mode: 'supabase' }`.
4. Run `save_pipeline_artifact` with test data → confirm row in `pipeline_artifacts`.
5. Run skill `01-scan-surface` with Synctropy MCP connected → confirm artifact appears in Supabase, no Drive write.
6. Switch `storage_mode = 'both'` → confirm artifact in Supabase AND Drive.
7. Switch `is_premium = false` → confirm Drive-only write regardless of `storage_mode`.
