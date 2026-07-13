# Synctropy Dashboard — Design Spec
_2026-06-04_

## What we're building

An authenticated React/TypeScript/Tailwind single-page app — the "come back to" surface after a user runs `analyze_structure` via the MCP server. Two concerns: entropy history (motivation loop) and preferences (scan configuration). Lovable owns the landing page; this dashboard is the post-auth product.

---

## Stack

| Layer | Choice |
|---|---|
| Build | Vite + React + TypeScript |
| Routing | React Router v6 |
| Data fetching | TanStack Query v5 |
| Components | shadcn/ui (Tailwind-based) |
| Auth + data | Supabase (Auth + Postgres) |
| Charts | Recharts (via shadcn chart primitive) |

---

## Routing

```
/login       → Supabase auth (email magic link)
/            → redirect to /history
/history     → Entropy History tab (default)
/settings    → Preferences tab
```

`AuthGuard` wraps `/history` and `/settings`. Unauthenticated requests redirect to `/login`.

---

## File structure

```
frontend/
  src/
    routes/
      _layout.tsx        ← DashboardLayout (top tabs, user menu)
      history.tsx
      settings.tsx
      login.tsx
    components/
      TrendChart.tsx
      FolderSparklines.tsx
      ScanDetail.tsx         ← drill-down panel
      PreferencesForm.tsx
      EmptyState.tsx
      AuthGuard.tsx
    lib/
      supabase.ts            ← typed Supabase client
      queries.ts             ← TanStack Query hooks
    types/
      index.ts               ← DB row types (generated from schema)
```

---

## Layout

Top-tab navigation. Two tabs: **History** and **Settings**. No sidebar. The active tab is highlighted with a bottom border; the URL updates to `/history` or `/settings` on switch. A minimal user menu (avatar + sign out) sits in the top-right corner.

---

## History tab

### Emotional job
"Is my Drive getting better or worse?" — a motivation loop, not an analytics tool. Mirrors the pattern of fitness apps: the trend line going down (entropy decreasing) is the reward.

### Layout (top to bottom)
1. **Delta headline** — "↓ 12 pts since last scan" with date context (e.g. "Jun 3 vs May 27"). Shown as a large number with direction indicator. Grey if no prior scan to compare.
2. **Overall entropy trend chart** — Recharts LineChart, x = scan date, y = overall_score. Click any data point to open the drill-down panel below the chart.
3. **Folder sparklines grid** — one card per folder: path, current score (large), mini trend line. Cards are colour-coded: red ≥ 0.8, orange ≥ 0.5, green < 0.5.
4. **Drill-down panel** (conditional) — appears below the chart when a scan point is clicked. Shows per-folder scores for that scan vs. the previous scan. A "what changed" diff view.

### Empty state
Shown when the user has no scans yet.

- Headline: "Your Drive hasn't been scanned yet."
- Subhead: "Open Claude, connect Synctropy, and run your first scan to see your entropy score."
- CTA button: "How to run your first scan" — links to docs/explainer.
- No form, no wizard, no preference prompt.

---

## Settings tab

Four MVP preferences. All others are v2+.

| Preference | Type | Default | Notes |
|---|---|---|---|
| `root_path` | text | (empty = full Drive) | Which folder to scan |
| `ignore_paths` | text[] | `[]` | Tag-chip UI, add/remove paths |
| `archive_after_days` | int | 365 | Slider, range 30–730 days |
| `taxonomy_domains` | text[] | `[projects, finance, admin, media, reference]` | Editable grid of domain name inputs |

Single **Save preferences** button. Note below it: "Changes apply to next scan." Save uses an optimistic TanStack mutation; failure shows a shadcn Toast.

**Excluded from v1:** entropy alert threshold, scan schedule, AI model selection, confidence threshold, custom entropy weights.

---

## Data schema

### `user_preferences`
One row per user. Created on first save; upserted on subsequent saves.

```sql
id                  uuid         PRIMARY KEY REFERENCES auth.users
root_path           text
ignore_paths        text[]       DEFAULT '{}'
archive_after_days  int          DEFAULT 365
taxonomy_domains    text[]       DEFAULT '{projects,finance,admin,media,reference}'
updated_at          timestamptz  DEFAULT now()
```

RLS: user reads/writes their own row only.

### `entropy_scans`
Append-only. Written by the MCP server via service-role key. Dashboard never writes to this table.

```sql
id             uuid         PRIMARY KEY DEFAULT gen_random_uuid()
user_id        uuid         REFERENCES auth.users  NOT NULL
scanned_at     timestamptz  DEFAULT now()
overall_score  float        NOT NULL
folder_scores  jsonb        NOT NULL
-- shape: [{ path: string, score: float, file_count: int }]
```

RLS: user reads their own rows only. No dashboard writes.

---

## TanStack Query hooks

```ts
usePreferences()      // fetch + mutate user_preferences
useScans()            // fetch id, scanned_at, overall_score for all user scans (ordered by scanned_at desc) — no folder_scores
useScan(id: string)   // fetch full row including folder_scores for drill-down
```

All hooks live in `src/lib/queries.ts`.

---

## Data flow

```
MCP server (runs inside Claude/Cursor)
  ├─ reads user_preferences  (root_path, ignore_paths, taxonomy_domains)
  └─ writes entropy_scans    (after each analyze_structure run)

Dashboard
  ├─ reads  user_preferences → PreferencesForm
  ├─ writes user_preferences → on Save
  └─ reads  entropy_scans   → TrendChart, FolderSparklines, ScanDetail

Dashboard never touches the file system or user OAuth tokens.
```

---

## Error handling

| Scenario | Behaviour |
|---|---|
| Unauthenticated request | Redirect to `/login`, clear session |
| Fetch error (scans / preferences) | TanStack `isError` state, inline retry button — no full-page error |
| Preferences save failure | shadcn Toast: "Couldn't save — try again" |
| No scans yet | `EmptyState` component — not an error state |
| MCP server unavailable | Dashboard is read-only; no special handling needed |

---

## Testing

- **Unit**: `PreferencesForm` Zod validation, score colour-coding thresholds
- **Integration**: TanStack Query hooks against a local Supabase dev instance
- **E2E**: Out of scope for MVP — integration tests cover the critical paths

---

## Out of scope (v1)

- Landing page (owned by Lovable at getsynctropy.com)
- Entropy alert threshold UI
- Scan schedule configuration
- AI model selection
- File-level history (folder-level snapshots only)
- Dark/light theme toggle (dark only for v1)
