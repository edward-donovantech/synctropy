# Synctropy Dashboard Redesign — Design Spec
_2026-06-21_

## What changed and why

The original dashboard (2026-06-04) was built around entropy scores — an abstract 0–100 rating. User testing direction: scores are hard to interpret and don't motivate action. Replacing with **raw, human-readable storage metrics** derived directly from pipeline skill artifacts.

Data source shifts from `entropy_scans` → `pipeline_artifacts` (skill 04-build-inventory artifact is the primary source).

---

## History tab — new layout

### Emotional job
"What's actually in my Drive, and what needs attention?" — an inventory view, not a score card.

### Layout (top to bottom)

**1. Platform strip**
Row of connected platform cards (from skill 00 artifact):
- Icon + name (Google Drive, Dropbox, local)
- Total files · Total folders · Storage used
- Last scanned timestamp

**2. Category breakdown**
Horizontal bar or donut chart showing files by category:
- Projects · Finance · Admin · Media · Reference · Comms · Inbox
- Count + percentage per category
- Click a category to filter the issues list below

**3. Issues panel**
Scannable list of actionable problems (from skill 04 `issues[]` array):
- `vague_name` — "23 files with generic names (Final, Copy, Untitled...)"
- `duplicate` — "8 likely duplicates found"
- `stale` — "47 files untouched for 2+ years"
- `root_clutter` — "14 files sitting at Drive root"
- `unreadable` — "3 files couldn't be categorised"
Each issue type shows count + a "View files" expand to see the list.

**4. Run history strip**
Compact timeline of past pipeline runs:
- Date · Files scanned · Issues found · Duration
- Click to see that run's snapshot

### Empty state
- Headline: "Your Drive hasn't been organised yet."
- Subhead: "Open Claude, connect Synctropy, and run /00-scan-connectors to get started."
- No score, no wizard.

---

## Settings tab — unchanged

Existing preferences form is correct. Add two new fields (already in schema):
- Storage mode selector (Drive / Supabase / Both) — premium only
- Premium badge (read-only)

---

## Data model

### Primary source: `pipeline_artifacts`

The frontend queries the most recent complete run (latest `run_id` with a `04-build-inventory` artifact) and derives all display metrics from its `artifact` JSON.

```ts
// Shape of 04-build-inventory artifact (from skill spec)
type InventoryArtifact = {
  run_id: string
  scanned_at: string
  platform: string
  root: string
  total_files: number
  total_folders: number
  storage_bytes: number
  categories: { name: string; count: number; bytes: number }[]
  items: InventoryItem[]
}

type InventoryItem = {
  id: string
  name: string
  path: string
  type: 'file' | 'folder'
  size_bytes: number
  modified_at: string
  category: string
  lifecycle: 'active' | 'archive' | 'triage'
  summary: string | null
  confidence: number
  issues: IssueType[]
}

type IssueType = 'vague_name' | 'duplicate' | 'stale' | 'root_clutter' | 'unreadable'
```

### New TanStack Query hooks

```ts
useLatestRun()        // latest run_id with a complete 04-build-inventory artifact
useRunInventory(run_id) // fetch 04-build-inventory artifact for a run
useRunHistory()       // list of run_ids with timestamps and summary stats
usePlatformInfo(run_id) // fetch 00-scan-connectors artifact for platform cards
```

### `entropy_scans` table
Kept in schema for backward compat but no longer read by the frontend. The `analyze_structure` MCP tool still writes to it. May be removed in a future migration once fully replaced.

---

## Seed data shape

Realistic `pipeline_artifacts` rows needed for frontend development:
- 3 runs, each ~2 weeks apart
- Each run has artifacts for skills 00, 01, 02, 03, 04
- `04-build-inventory` artifact has ~200 items, realistic category distribution, plausible issues

See `scripts/seed_artifacts.ts` for the seed script.

---

## Components to build / replace

| Old component | New component | Notes |
|---|---|---|
| `TrendChart.tsx` | `RunHistory.tsx` | Timeline of runs, no score axis |
| `FolderSparklines.tsx` | `CategoryBreakdown.tsx` | Donut/bar chart by category |
| `ScanDetail.tsx` | `IssuesPanel.tsx` | Expandable issue groups |
| — | `PlatformStrip.tsx` | Platform cards from skill 00 artifact |
| `EmptyState.tsx` | `EmptyState.tsx` | Updated copy only |

`PreferencesForm.tsx`, `AuthGuard.tsx`, `_layout.tsx`, `login.tsx` — unchanged.

---

## Out of scope
- Entropy scores (removed entirely)
- File-level move/rename actions from the dashboard (execution stays in skills)
- Real-time Drive sync (pipeline runs are point-in-time snapshots)
