# Premium Skill Artifact Storage — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let premium users persist every pipeline skill artifact to Supabase instead of (or in addition to) Google Drive, controlled by `is_premium` and `storage_mode` on their user preferences.

**Architecture:** A Supabase migration adds two columns to `user_preferences` and creates `pipeline_artifacts`. The MCP server gains two new tools (`get_user_config`, `save_pipeline_artifact`). A shared skill document defines the premium-storage pattern; all 12 pipeline skill SKILL.md files reference it and add three output sub-steps. The frontend settings page adds a read-only premium badge and a storage mode selector.

**Tech Stack:** TypeScript, Zod 4, `@modelcontextprotocol/sdk`, `@supabase/supabase-js`, React 18, TanStack Query, Vitest

## Global Constraints

- Supabase service role key (`SUPABASE_SERVICE_ROLE_KEY`) is already present in MCP server env — never expose it to the frontend.
- MCP server tools use `server.tool(name, description, ZodSchema.shape, handler)` pattern — match existing `analyze_structure` registration exactly.
- All new MCP tools must be silent (no console output) on success; `console.error("[synctropy] ...")` on failure, matching `persistence.ts` convention.
- Skill SKILL.md files live at `~/.claude/skills/<skill-name>/SKILL.md`.
- `run_id` is an ISO 8601 string, e.g. `"2026-06-19T19:00:00.000Z"`.
- Premium gate: `storage_mode` is only respected when `is_premium = true`. If `is_premium = false`, always write to Drive/local regardless of `storage_mode`.

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/002_premium_features.sql`

**Interfaces:**
- Produces: `user_preferences.is_premium` (boolean), `user_preferences.storage_mode` (text), `pipeline_artifacts` table

- [ ] **Step 1: Write migration file**

```sql
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
```

- [ ] **Step 2: Apply migration via Supabase MCP**

Use the `mcp__claude_ai_Supabase__apply_migration` tool with:
```
project_id: ukslyhpeuqkfusyvghzi
name: 002_premium_features
query: <contents of the SQL file above>
```

- [ ] **Step 3: Verify schema**

Use `mcp__claude_ai_Supabase__list_tables` with `project_id: ukslyhpeuqkfusyvghzi, schemas: ["public"], verbose: true`.

Expected: `user_preferences` has `is_premium` and `storage_mode` columns; `pipeline_artifacts` table exists with 7 columns.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/002_premium_features.sql
git commit -m "feat: add premium columns and pipeline_artifacts table"
```

---

### Task 2: MCP Server — New Tools

**Files:**
- Create: `mcp-server/src/user-config.ts`
- Modify: `mcp-server/src/index.ts`
- Create: `mcp-server/src/test/user-config.test.ts`

**Interfaces:**
- Consumes: `getClient()` pattern from `persistence.ts` (copy, don't import — different concerns)
- Produces:
  - `getUserConfig(userId: string): Promise<{ is_premium: boolean; storage_mode: 'drive' | 'supabase' | 'both' }>`
  - `savePipelineArtifact(input: SaveArtifactInput): Promise<{ id: string }>`
  - Zod schemas: `GetUserConfigInputSchema`, `SavePipelineArtifactInputSchema`

- [ ] **Step 1: Write failing tests**

Create `mcp-server/src/test/user-config.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase client
const mockFrom = vi.fn()
const mockClient = { from: mockFrom }
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockClient),
}))

// Set env before importing module
process.env.SUPABASE_URL = 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'

const { getUserConfig, savePipelineArtifact } = await import('../user-config.js')

describe('getUserConfig', () => {
  beforeEach(() => { mockFrom.mockReset() })

  it('returns defaults when no row found', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
    })
    const result = await getUserConfig('00000000-0000-0000-0000-000000000001')
    expect(result).toEqual({ is_premium: false, storage_mode: 'drive' })
  })

  it('returns stored values when row exists', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { is_premium: true, storage_mode: 'both' }, error: null }) }) }),
    })
    const result = await getUserConfig('00000000-0000-0000-0000-000000000001')
    expect(result).toEqual({ is_premium: true, storage_mode: 'both' })
  })
})

describe('savePipelineArtifact', () => {
  beforeEach(() => { mockFrom.mockReset() })

  it('inserts and returns inserted id', async () => {
    mockFrom.mockReturnValue({
      insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'abc-123' }, error: null }) }) }),
    })
    const result = await savePipelineArtifact({
      userId: '00000000-0000-0000-0000-000000000001',
      run_id: '2026-06-19T19:00:00.000Z',
      skill_name: '01-scan-surface',
      pipeline_pos: 1,
      artifact: { items: [] },
    })
    expect(result).toEqual({ id: 'abc-123' })
  })

  it('throws on supabase error', async () => {
    mockFrom.mockReturnValue({
      insert: () => ({ select: () => ({ single: async () => ({ data: null, error: { message: 'fail' } }) }) }),
    })
    await expect(
      savePipelineArtifact({
        userId: '00000000-0000-0000-0000-000000000001',
        run_id: '2026-06-19T19:00:00.000Z',
        skill_name: '01-scan-surface',
        pipeline_pos: 1,
        artifact: {},
      })
    ).rejects.toThrow('fail')
  })
})
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
cd mcp-server && npm test -- --reporter=verbose 2>&1 | head -40
```

Expected: FAIL with "Cannot find module '../user-config.js'"

- [ ] **Step 3: Implement `mcp-server/src/user-config.ts`**

```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

let _client: SupabaseClient | null = null

function getClient(): SupabaseClient | null {
  if (_client) return _client
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  _client = createClient(url, key)
  return _client
}

export const GetUserConfigInputSchema = z.object({
  userId: z.string().uuid(),
})
export type GetUserConfigInput = z.infer<typeof GetUserConfigInputSchema>

export const StorageModeSchema = z.enum(['drive', 'supabase', 'both'])
export type StorageMode = z.infer<typeof StorageModeSchema>

export interface UserConfig {
  is_premium: boolean
  storage_mode: StorageMode
}

const DEFAULT_CONFIG: UserConfig = { is_premium: false, storage_mode: 'drive' }

export async function getUserConfig(userId: string): Promise<UserConfig> {
  const client = getClient()
  if (!client) return DEFAULT_CONFIG
  const { data, error } = await client
    .from('user_preferences')
    .select('is_premium, storage_mode')
    .eq('id', userId)
    .maybeSingle()
  if (error || !data) return DEFAULT_CONFIG
  return {
    is_premium: data.is_premium ?? false,
    storage_mode: StorageModeSchema.catch('drive').parse(data.storage_mode),
  }
}

export const SavePipelineArtifactInputSchema = z.object({
  userId:       z.string().uuid(),
  run_id:       z.string().min(1),
  skill_name:   z.string().min(1),
  pipeline_pos: z.number().int().min(0).max(11),
  artifact:     z.record(z.unknown()),
})
export type SaveArtifactInput = z.infer<typeof SavePipelineArtifactInputSchema>

export async function savePipelineArtifact(input: SaveArtifactInput): Promise<{ id: string }> {
  const client = getClient()
  if (!client) throw new Error('[synctropy] Supabase client not configured')
  const { data, error } = await client
    .from('pipeline_artifacts')
    .insert({
      user_id:      input.userId,
      run_id:       input.run_id,
      skill_name:   input.skill_name,
      pipeline_pos: input.pipeline_pos,
      artifact:     input.artifact,
    })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  return { id: data.id }
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
cd mcp-server && npm test -- --reporter=verbose 2>&1 | head -40
```

Expected: all tests PASS

- [ ] **Step 5: Register tools in `mcp-server/src/index.ts`**

Add after the existing `analyze_structure` registration:

```typescript
import {
  GetUserConfigInputSchema,
  SavePipelineArtifactInputSchema,
  getUserConfig,
  savePipelineArtifact,
} from './user-config.js'

server.tool(
  'get_user_config',
  'Returns is_premium flag and storage_mode for a given user. Returns defaults if user not found.',
  GetUserConfigInputSchema.shape,
  async (input) => {
    const result = await getUserConfig(input.userId)
    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
    }
  }
)

server.tool(
  'save_pipeline_artifact',
  'Persists a pipeline skill artifact to Supabase for premium users. Returns the inserted row id.',
  SavePipelineArtifactInputSchema.shape,
  async (input) => {
    try {
      const result = await savePipelineArtifact(input)
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
      }
    } catch (err) {
      console.error('[synctropy] save_pipeline_artifact failed:', err)
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: String(err) }) }],
        isError: true,
      }
    }
  }
)
```

- [ ] **Step 6: Build MCP server**

```bash
cd mcp-server && npm run build 2>&1
```

Expected: no TypeScript errors, `dist/` updated

- [ ] **Step 7: Commit**

```bash
git add mcp-server/src/user-config.ts mcp-server/src/index.ts mcp-server/src/test/user-config.test.ts
git commit -m "feat: add get_user_config and save_pipeline_artifact MCP tools"
```

---

### Task 3: Frontend Types + Queries

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/lib/queries.ts`
- Modify: `frontend/src/test/lib/score.test.ts` (add type-check guard — see note)

**Interfaces:**
- Consumes: `user_preferences` table now has `is_premium` and `storage_mode` columns (Task 1)
- Produces:
  - `UserPreferences.is_premium: boolean`
  - `UserPreferences.storage_mode: 'drive' | 'supabase' | 'both'`
  - `usePreferences().save()` accepts and persists `storage_mode`

- [ ] **Step 1: Update `frontend/src/types/index.ts`**

Replace the `UserPreferences` type:

```typescript
export type StorageMode = 'drive' | 'supabase' | 'both'

export type UserPreferences = {
  id: string
  root_path: string | null
  ignore_paths: string[]
  archive_after_days: number
  taxonomy_domains: string[]
  is_premium: boolean
  storage_mode: StorageMode
  updated_at: string
}
```

Leave `FolderScore`, `EntropyScan`, `ScanSummary` unchanged.

- [ ] **Step 2: Write failing type test in `frontend/src/test/lib/score.test.ts`**

Append at the end of the existing file:

```typescript
import type { UserPreferences, StorageMode } from '../../types'

describe('UserPreferences type', () => {
  it('includes is_premium and storage_mode fields', () => {
    const pref: UserPreferences = {
      id: 'abc',
      root_path: null,
      ignore_paths: [],
      archive_after_days: 365,
      taxonomy_domains: ['projects'],
      is_premium: false,
      storage_mode: 'drive',
      updated_at: new Date().toISOString(),
    }
    expect(pref.is_premium).toBe(false)
    expect(pref.storage_mode).toBe('drive')
  })

  it('accepts all three storage_mode values', () => {
    const modes: StorageMode[] = ['drive', 'supabase', 'both']
    expect(modes).toHaveLength(3)
  })
})
```

- [ ] **Step 3: Run test — confirm it fails**

```bash
cd frontend && npm test -- --reporter=verbose 2>&1 | grep -A5 "UserPreferences type"
```

Expected: type error or FAIL (field doesn't exist on type yet)

- [ ] **Step 4: Update `frontend/src/lib/queries.ts`**

In `usePreferences`, the `mutationFn` currently accepts `Omit<UserPreferences, 'id' | 'updated_at'>`. With the new fields, this automatically includes `is_premium` and `storage_mode` — no signature change needed.

Update the UPSERT to include `storage_mode` (it passes `...prefs` already, so it will include the new fields automatically). However, `is_premium` must NOT be upserted from the client (it's server-set only). Add a pick to the mutationFn:

Replace the existing `mutationFn`:

```typescript
mutationFn: async (prefs: Omit<UserPreferences, 'id' | 'updated_at' | 'is_premium'>) => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('user_preferences')
    .upsert({ id: user.id, ...prefs, updated_at: new Date().toISOString() })
    .select()
    .single()
  if (error) throw error
  return data as UserPreferences
},
```

- [ ] **Step 5: Run tests — confirm they pass**

```bash
cd frontend && npm test -- --reporter=verbose 2>&1 | tail -20
```

Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/lib/queries.ts frontend/src/test/lib/score.test.ts
git commit -m "feat: add is_premium and storage_mode to UserPreferences type and queries"
```

---

### Task 4: Frontend Settings UI

**Files:**
- Modify: `frontend/src/components/PreferencesForm.tsx`
- Modify: `frontend/src/test/components/PreferencesForm.test.tsx`

**Interfaces:**
- Consumes: `UserPreferences.is_premium`, `UserPreferences.storage_mode` (Task 3)
- Produces: Premium badge (read-only), storage mode selector (enabled only for premium users)

- [ ] **Step 1: Write failing tests**

Open `frontend/src/test/components/PreferencesForm.test.tsx` and add:

```typescript
describe('Premium section', () => {
  it('shows Free badge when is_premium is false', async () => {
    // mock usePreferences to return is_premium: false
    vi.mocked(usePreferences).mockReturnValue({
      data: {
        id: '1', root_path: null, ignore_paths: [], archive_after_days: 365,
        taxonomy_domains: ['projects'], is_premium: false, storage_mode: 'drive',
        updated_at: '2026-01-01',
      },
      isSaving: false, save: vi.fn(), saveError: null,
      isLoading: false, isError: false, error: null, refetch: vi.fn(),
    } as any)
    render(<PreferencesForm />)
    expect(screen.getByText('Free')).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: /storage mode/i })).not.toBeInTheDocument()
  })

  it('shows Premium badge and storage mode selector when is_premium is true', async () => {
    vi.mocked(usePreferences).mockReturnValue({
      data: {
        id: '1', root_path: null, ignore_paths: [], archive_after_days: 365,
        taxonomy_domains: ['projects'], is_premium: true, storage_mode: 'both',
        updated_at: '2026-01-01',
      },
      isSaving: false, save: vi.fn(), saveError: null,
      isLoading: false, isError: false, error: null, refetch: vi.fn(),
    } as any)
    render(<PreferencesForm />)
    expect(screen.getByText('Premium')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /storage mode/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
cd frontend && npm test -- --reporter=verbose 2>&1 | grep -A5 "Premium section"
```

Expected: FAIL — "Free" and "Premium" text not found

- [ ] **Step 3: Update `PreferencesForm.tsx`**

Add to the `preferencesSchema` (the `storage_mode` field — `is_premium` is read-only and not in the form schema):

```typescript
export const preferencesSchema = z.object({
  root_path: z.string().nullable().optional(),
  ignore_paths: z.array(z.string()).default([]),
  archive_after_days: z.number().int().min(30).max(730),
  taxonomy_domains: z.array(z.string().min(1)).min(1),
  storage_mode: z.enum(['drive', 'supabase', 'both']).default('drive'),
})
export type PreferencesFormValues = z.infer<typeof preferencesSchema>
```

Update `DEFAULTS`:
```typescript
const DEFAULTS: PreferencesFormValues = {
  root_path: null,
  ignore_paths: [],
  archive_after_days: 365,
  taxonomy_domains: ['projects', 'finance', 'admin', 'media', 'reference'],
  storage_mode: 'drive',
}
```

Update `useState` initializer and `useEffect` to include `storage_mode`:
```typescript
const [values, setValues] = useState<PreferencesFormValues>(() =>
  saved
    ? {
        root_path: saved.root_path,
        ignore_paths: saved.ignore_paths,
        archive_after_days: saved.archive_after_days,
        taxonomy_domains: saved.taxonomy_domains,
        storage_mode: saved.storage_mode ?? 'drive',
      }
    : DEFAULTS
)
useEffect(() => {
  if (saved) {
    setValues({
      root_path: saved.root_path,
      ignore_paths: saved.ignore_paths,
      archive_after_days: saved.archive_after_days,
      taxonomy_domains: saved.taxonomy_domains,
      storage_mode: saved.storage_mode ?? 'drive',
    })
  }
}, [saved])
```

Update `handleSave` to pass `storage_mode`:
```typescript
save({
  root_path: result.data.root_path ?? null,
  ignore_paths: result.data.ignore_paths,
  archive_after_days: result.data.archive_after_days,
  taxonomy_domains: result.data.taxonomy_domains,
  storage_mode: result.data.storage_mode,
}, {
  onSuccess: () => toast('Preferences saved'),
  onError: () => toast.error("Couldn't save — try again"),
})
```

Add the premium section to the JSX **before** the Save button section:

```tsx
{/* Premium plan */}
<div className="space-y-3">
  <Label className="text-slate-300">Plan</Label>
  <div className="flex items-center gap-3">
    <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
      saved?.is_premium
        ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
        : 'bg-slate-700/40 text-slate-400 border border-slate-600/40'
    }`}>
      {saved?.is_premium ? 'Premium' : 'Free'}
    </span>
    {!saved?.is_premium && (
      <span className="text-xs text-slate-500">Upgrade for cloud artifact storage</span>
    )}
  </div>

  {saved?.is_premium && (
    <div className="space-y-1">
      <Label htmlFor="storage_mode" className="text-slate-300">Storage mode</Label>
      <p className="text-xs text-slate-500">Where pipeline skill artifacts are written.</p>
      <select
        id="storage_mode"
        aria-label="Storage mode"
        value={values.storage_mode}
        onChange={e => setValues(v => ({ ...v, storage_mode: e.target.value as 'drive' | 'supabase' | 'both' }))}
        className="w-full bg-[#13131f] border border-[#2a2a3e] text-slate-200 text-sm rounded px-3 py-2"
      >
        <option value="drive">Drive only (default)</option>
        <option value="supabase">Supabase only</option>
        <option value="both">Both Drive and Supabase</option>
      </select>
    </div>
  )}
</div>
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
cd frontend && npm test -- --reporter=verbose 2>&1 | tail -20
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/PreferencesForm.tsx frontend/src/test/components/PreferencesForm.test.tsx
git commit -m "feat: add premium badge and storage mode selector to settings"
```

---

### Task 5: Shared Skill Document

**Files:**
- Create: `~/.claude/skills/_shared/premium-storage.md`

**Interfaces:**
- Produces: The canonical premium storage pattern referenced by all 12 skills

- [ ] **Step 1: Write `~/.claude/skills/_shared/premium-storage.md`**

```markdown
# Premium Storage Pattern

Used by all pipeline skills (00–11). Reference this document in each skill's output step rather than duplicating this logic.

---

## Overview

For premium users, skill artifacts are persisted to Supabase via the `save_pipeline_artifact` MCP tool. Free users always write to Drive or local. Storage destination is controlled by `storage_mode` on the user's preferences.

---

## Step Na — Resolve storage targets

At the start of the output step, determine where this artifact will be written.

**If Synctropy MCP is connected (`synctropy_connected = true`) AND `userId` is known:**

Call the `get_user_config` MCP tool:
```
tool: get_user_config
input: { userId: "<uuid>" }
```

Response: `{ "is_premium": true|false, "storage_mode": "drive"|"supabase"|"both" }`

Derive write targets:
```
write_supabase = is_premium AND storage_mode IN ("supabase", "both")
write_drive    = (storage_mode IN ("drive", "both")) OR (NOT is_premium)
```

**If Synctropy MCP is not connected OR userId is unknown:**
```
write_supabase = false
write_drive    = true
```

---

## Step Nb — Write to Supabase (premium only)

Execute only if `write_supabase = true`.

Call `save_pipeline_artifact`:
```
tool: save_pipeline_artifact
input: {
  "userId":       "<uuid>",
  "run_id":       "<run_id>",
  "skill_name":   "<e.g. 01-scan-surface>",
  "pipeline_pos": <0–11>,
  "artifact":     <full skill JSON output object>
}
```

On success: output `✓ Artifact saved to Synctropy cloud (premium)`

On failure: log `⚠ Cloud save failed: <error>. Falling back to Drive/local.` then set `write_drive = true` and continue.

**This step is non-blocking.** Never halt the pipeline because of a Supabase write failure.

---

## Step Nc — Write to Drive / local

Execute if `write_drive = true`.

Follow the existing Drive write logic for this skill (create `_Synctropy/` folder if needed, upload JSON and MD files, fall back to local on Drive failure).

---

## run_id resolution

`run_id` is an ISO 8601 string shared across a pipeline run.

- **Skill 00:** Generate `run_id = new Date().toISOString()` and embed it in `connectors.json` under the key `"run_id"`.
- **Skills 01–11:** Read `run_id` from the prior skill's output JSON (`connectors.json` or the previous skill's artifact file). If not found (e.g. mid-pipeline resume without prior artifacts), generate a new `run_id`.

---

## Quick reference

| Condition | write_supabase | write_drive |
|---|---|---|
| Free user, any storage_mode | false | true |
| Premium, storage_mode = "drive" | false | true |
| Premium, storage_mode = "supabase" | true | false |
| Premium, storage_mode = "both" | true | true |
| Synctropy MCP disconnected | false | true |
| Supabase write failed | false (retry on next run) | true (fallback) |
```

- [ ] **Step 2: Commit**

```bash
git add ~/.claude/skills/_shared/premium-storage.md
# Note: this is outside the repo — use Write tool, no git commit needed
```

(The `_shared/` directory is not under the Synctropy git repo; write the file directly with the Write tool.)

---

### Task 6: Update Skills 00–05

**Files:**
- Modify: `~/.claude/skills/00-scan-connectors/SKILL.md`
- Modify: `~/.claude/skills/01-scan-surface/SKILL.md`
- Modify: `~/.claude/skills/02-scan-deep/SKILL.md`
- Modify: `~/.claude/skills/03-read-unknowns/SKILL.md`
- Modify: `~/.claude/skills/04-build-inventory/SKILL.md`
- Modify: `~/.claude/skills/05-propose-structure/SKILL.md`

**Interfaces:**
- Consumes: `~/.claude/skills/_shared/premium-storage.md` (Task 5)
- Produces: Each skill's output step includes premium storage sub-steps Na/Nb/Nc

For each skill, make two edits:

**Edit A — Add `run_id` to output schema / connectors.json (skill 00 only):**

In skill 00's Step 3 JSON schema, add:
```json
"run_id": "<ISO 8601 timestamp — same value as scanned_at>"
```

**Edit B — Replace or augment the existing write step with Na/Nb/Nc pattern:**

Find each skill's "Write files" or "Log to Synctropy MCP" step (exact step numbers vary per skill). Before the existing Drive write logic, insert:

```markdown
> **Premium storage:** See `~/.claude/skills/_shared/premium-storage.md` for full pattern.
> Execute Steps Na, Nb, Nc before writing to Drive.
>
> **Step Na** — Call `get_user_config` if Synctropy MCP connected, derive `write_supabase` and `write_drive`.
> **Step Nb** — If `write_supabase`: call `save_pipeline_artifact` with `{ userId, run_id, skill_name: "<this-skill-name>", pipeline_pos: <N>, artifact: <full JSON output> }`.
> **Step Nc** — If `write_drive`: proceed with Drive write below.
```

- [ ] **Step 1: Update skill 00 — add `run_id` to `connectors.json` schema and add premium steps**

Find the `connectors.json` schema block in `~/.claude/skills/00-scan-connectors/SKILL.md` and add `"run_id"` field. Then add premium steps before the existing file write.

Key values for skill 00:
- `skill_name`: `"00-scan-connectors"`
- `pipeline_pos`: `0`
- artifact: full `connectors.json` object

- [ ] **Step 2: Update skill 01 — add premium steps to Step 7**

Key values:
- `skill_name`: `"01-scan-surface"`
- `pipeline_pos`: `1`
- artifact: full `scan-surface.json` object (all normalized items + metadata)
- `run_id`: read from `connectors.json` → `run_id`

- [ ] **Step 3: Update skill 02**

Key values:
- `skill_name`: `"02-scan-deep"`
- `pipeline_pos`: `2`
- artifact: full `scan-deep.json` object
- `run_id`: from prior skill's artifact

- [ ] **Step 4: Update skill 03**

Key values:
- `skill_name`: `"03-read-unknowns"`
- `pipeline_pos`: `3`
- artifact: full `read-unknowns.json` object

- [ ] **Step 5: Update skill 04**

Key values:
- `skill_name`: `"04-build-inventory"`
- `pipeline_pos`: `4`
- artifact: full `inventory.json` object

- [ ] **Step 6: Update skill 05**

Key values:
- `skill_name`: `"05-propose-structure"`
- `pipeline_pos`: `5`
- artifact: full `proposed-structure.json` object

---

### Task 7: Update Skills 06–11

**Files:**
- Modify: `~/.claude/skills/06-plan-moves/SKILL.md`
- Modify: `~/.claude/skills/07-dry-run/SKILL.md`
- Modify: `~/.claude/skills/08-execute/SKILL.md`
- Modify: `~/.claude/skills/09-verify/SKILL.md`
- Modify: `~/.claude/skills/10-revert/SKILL.md`
- Modify: `~/.claude/skills/11-maintain/SKILL.md`

**Interfaces:**
- Consumes: `~/.claude/skills/_shared/premium-storage.md` (Task 5)
- Produces: Each skill's output step includes premium storage sub-steps Na/Nb/Nc

Apply the same pattern as Task 6. Specific key values per skill:

- [ ] **Step 1: Update skill 06**

Key values:
- `skill_name`: `"06-plan-moves"`
- `pipeline_pos`: `6`
- artifact: full `move-plan.json` object

- [ ] **Step 2: Update skill 07**

Key values:
- `skill_name`: `"07-dry-run"`
- `pipeline_pos`: `7`
- artifact: full `dry-run-report.json` object

- [ ] **Step 3: Update skill 08**

Key values:
- `skill_name`: `"08-execute"`
- `pipeline_pos`: `8`
- artifact: full `move-log.json` object

- [ ] **Step 4: Update skill 09**

Key values:
- `skill_name`: `"09-verify"`
- `pipeline_pos`: `9`
- artifact: full `verify-report.json` object

- [ ] **Step 5: Update skill 10**

Key values:
- `skill_name`: `"10-revert"`
- `pipeline_pos`: `10`
- artifact: full `revert-manifest.json` object

- [ ] **Step 6: Update skill 11**

Key values:
- `skill_name`: `"11-maintain"`
- `pipeline_pos`: `11`
- artifact: full `maintenance-report.json` object

---

## Spec Coverage Check

| Spec requirement | Task |
|---|---|
| `is_premium` column on `user_preferences` | Task 1 |
| `storage_mode` column on `user_preferences` | Task 1 |
| `pipeline_artifacts` table with RLS | Task 1 |
| `get_user_config` MCP tool | Task 2 |
| `save_pipeline_artifact` MCP tool | Task 2 |
| Frontend `UserPreferences` type updated | Task 3 |
| `usePreferences` hook accepts `storage_mode` | Task 3 |
| Premium badge in settings | Task 4 |
| Storage mode selector (premium only) | Task 4 |
| `_shared/premium-storage.md` pattern doc | Task 5 |
| `run_id` in `connectors.json` (skill 00) | Task 6 |
| Skills 00–05 output steps updated | Task 6 |
| Skills 06–11 output steps updated | Task 7 |
| `is_premium` not writable from client | Task 3 (excluded from mutationFn) |
| Supabase write failure is non-blocking | Task 5 (shared doc), Task 2 (error handling) |
