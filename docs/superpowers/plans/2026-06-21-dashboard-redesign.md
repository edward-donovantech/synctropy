# Dashboard Redesign — History Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace entropy-score-based history tab components with raw, human-friendly storage metrics derived from the `pipeline_artifacts` Supabase table.

**Architecture:** Four new components (PlatformStrip, CategoryBreakdown, IssuesPanel, RunHistory) replace the three old ones (TrendChart, FolderSparklines, ScanDetail). Four new TanStack Query hooks query `pipeline_artifacts` instead of `entropy_scans`. The history route page is rewritten to compose the new components; old entropy components are deleted.

**Tech Stack:** React 19, TanStack Query v5, shadcn/ui, Tailwind v4, Recharts 2, Vitest + Testing Library, TypeScript 6, Supabase JS v2, Zod v4.

## Global Constraints

- No default exports except React components
- Named exports for all non-component exports (hooks, types, schemas)
- TypeScript everywhere, Zod for all runtime validation
- All tests run with `npx vitest run` from `frontend/` directory
- Test files live in `src/test/components/` or `src/test/lib/`
- `vi.mock('@/lib/supabase')` pattern for mocking Supabase in tests
- Colors: bg `#13131f`, border `#2a2a3e`, text-slate-* palette; no new color values
- User ID for seed data / manual testing: `938cb9b2-55e4-47a6-9e77-348635db5af0`

---

## File Map

**New files — create:**
- `src/types/artifacts.ts` — InventoryArtifact, ConnectorsArtifact, RunSummary, IssueType types + Zod schemas
- `src/lib/artifact-queries.ts` — useLatestRun, useRunInventory, useRunHistory, usePlatformInfo hooks
- `src/components/PlatformStrip.tsx` — platform cards from skill 00 artifact
- `src/components/CategoryBreakdown.tsx` — donut chart by category from skill 04
- `src/components/IssuesPanel.tsx` — expandable issue groups from skill 04 items[]
- `src/components/RunHistory.tsx` — compact run timeline from useRunHistory
- `src/test/lib/artifact-queries.test.ts` — tests for all 4 hooks
- `src/test/components/PlatformStrip.test.tsx`
- `src/test/components/CategoryBreakdown.test.tsx`
- `src/test/components/IssuesPanel.test.tsx`
- `src/test/components/RunHistory.test.tsx`

**Existing files — modify:**
- `src/types/index.ts` — add re-export of artifact types
- `src/routes/history.tsx` — full rewrite to compose new components
- `src/components/EmptyState.tsx` — update copy only

**Existing files — delete (after history.tsx rewrite):**
- `src/components/TrendChart.tsx`
- `src/components/FolderSparklines.tsx`
- `src/components/ScanDetail.tsx`
- `src/lib/score.ts` (only used by deleted components)
- `src/test/lib/score.test.ts`

---

## Task 1: Types and Zod Schemas

**Files:**
- Create: `src/types/artifacts.ts`
- Modify: `src/types/index.ts`

**Interfaces:**
- Produces:
  - `IssueType = 'vague_name' | 'duplicate' | 'stale' | 'root_clutter' | 'unreadable'`
  - `InventoryItem { id, name, path, type, size_bytes, modified_at, category, lifecycle, summary, confidence, issues }`
  - `CategoryStat { name, count, bytes }`
  - `InventoryArtifact { run_id, scanned_at, platform, root, total_files, total_folders, storage_bytes, categories, items }`
  - `ConnectedPlatform { name, icon, email, total_files, total_folders, storage_bytes, last_scanned }`
  - `ConnectorsArtifact { platforms }`
  - `RunSummary { run_id, scanned_at, total_files, issue_count, duration_ms }`
  - `inventoryArtifactSchema` (Zod) — validates the full 04 artifact JSON
  - `connectorsArtifactSchema` (Zod) — validates the 00 artifact JSON

No tests needed for this task (pure types/schema — tested implicitly by hook tests).

- [ ] **Step 1: Create `src/types/artifacts.ts`**

```typescript
import { z } from 'zod'

export type IssueType = 'vague_name' | 'duplicate' | 'stale' | 'root_clutter' | 'unreadable'

export const inventoryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  type: z.enum(['file', 'folder']),
  size_bytes: z.number(),
  modified_at: z.string(),
  category: z.string(),
  lifecycle: z.enum(['active', 'archive', 'triage']),
  summary: z.string().nullable(),
  confidence: z.number(),
  issues: z.array(z.enum(['vague_name', 'duplicate', 'stale', 'root_clutter', 'unreadable'])),
})

export type InventoryItem = z.infer<typeof inventoryItemSchema>

export const categoryStat = z.object({
  name: z.string(),
  count: z.number(),
  bytes: z.number(),
})

export type CategoryStat = z.infer<typeof categoryStat>

export const inventoryArtifactSchema = z.object({
  run_id: z.string(),
  scanned_at: z.string(),
  platform: z.string(),
  root: z.string(),
  total_files: z.number(),
  total_folders: z.number(),
  storage_bytes: z.number(),
  categories: z.array(categoryStat),
  items: z.array(inventoryItemSchema),
})

export type InventoryArtifact = z.infer<typeof inventoryArtifactSchema>

export const connectedPlatformSchema = z.object({
  name: z.string(),
  icon: z.string().optional(),
  email: z.string().optional(),
  total_files: z.number(),
  total_folders: z.number(),
  storage_bytes: z.number(),
  last_scanned: z.string(),
})

export type ConnectedPlatform = z.infer<typeof connectedPlatformSchema>

export const connectorsArtifactSchema = z.object({
  platforms: z.array(connectedPlatformSchema),
})

export type ConnectorsArtifact = z.infer<typeof connectorsArtifactSchema>

export type RunSummary = {
  run_id: string
  scanned_at: string
  total_files: number
  issue_count: number
  duration_ms: number | null
}
```

- [ ] **Step 2: Re-export from `src/types/index.ts`**

Add at the end of the file:
```typescript
export type { IssueType, InventoryItem, CategoryStat, InventoryArtifact, ConnectedPlatform, ConnectorsArtifact, RunSummary } from './artifacts'
```

- [ ] **Step 3: Commit**

```bash
git -C /mnt/c/Users/ejose/dev/synctropy add frontend/src/types/artifacts.ts frontend/src/types/index.ts
git -C /mnt/c/Users/ejose/dev/synctropy commit -m "feat: add artifact types and Zod schemas for pipeline_artifacts"
```

---

## Task 2: TanStack Query Hooks for pipeline_artifacts

**Files:**
- Create: `src/lib/artifact-queries.ts`
- Create: `src/test/lib/artifact-queries.test.ts`

**Interfaces:**
- Consumes: `InventoryArtifact`, `ConnectorsArtifact`, `RunSummary`, `inventoryArtifactSchema`, `connectorsArtifactSchema` from `../types/artifacts`
- Produces:
  - `useLatestRun(): UseQueryResult<string | null>` — latest run_id with a 04-build-inventory artifact
  - `useRunInventory(run_id: string | null): UseQueryResult<InventoryArtifact | null>`
  - `useRunHistory(): UseQueryResult<RunSummary[]>` — newest-first list
  - `usePlatformInfo(run_id: string | null): UseQueryResult<ConnectorsArtifact | null>`

**Supabase query pattern:** All queries select from `pipeline_artifacts` table, filtering by `user_id` (from `supabase.auth.getUser()`), `skill_name`, and optionally `run_id`. The `artifact` column contains the JSON blob.

- [ ] **Step 1: Write failing tests in `src/test/lib/artifact-queries.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useLatestRun, useRunInventory, useRunHistory, usePlatformInfo } from '../../lib/artifact-queries'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  },
}))

import { supabase } from '../../lib/supabase'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  React.createElement(QueryClientProvider, {
    client: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  }, children)
)

const mockUser = { id: '938cb9b2-55e4-47a6-9e77-348635db5af0' }

const mockInventoryArtifact = {
  run_id: 'run-1',
  scanned_at: '2026-06-10T10:00:00Z',
  platform: 'google_drive',
  root: 'My Drive',
  total_files: 210,
  total_folders: 34,
  storage_bytes: 5_200_000_000,
  categories: [{ name: 'Projects', count: 80, bytes: 2_000_000_000 }],
  items: [],
}

const mockConnectorsArtifact = {
  platforms: [{
    name: 'Google Drive',
    email: 'test@example.com',
    total_files: 210,
    total_folders: 34,
    storage_bytes: 5_200_000_000,
    last_scanned: '2026-06-10T10:00:00Z',
  }],
}

beforeEach(() => {
  vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: mockUser } } as any)
})

describe('useLatestRun', () => {
  it('returns the latest run_id with a 04-build-inventory artifact', async () => {
    const select = vi.fn().mockReturnThis()
    const eq = vi.fn().mockReturnThis()
    const order = vi.fn().mockReturnThis()
    const limit = vi.fn().mockResolvedValue({ data: [{ run_id: 'run-1' }], error: null })
    vi.mocked(supabase.from).mockReturnValue({ select, eq, order, limit } as any)

    const { result } = renderHook(() => useLatestRun(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBe('run-1')
  })

  it('returns null when no runs exist', async () => {
    const select = vi.fn().mockReturnThis()
    const eq = vi.fn().mockReturnThis()
    const order = vi.fn().mockReturnThis()
    const limit = vi.fn().mockResolvedValue({ data: [], error: null })
    vi.mocked(supabase.from).mockReturnValue({ select, eq, order, limit } as any)

    const { result } = renderHook(() => useLatestRun(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
  })
})

describe('useRunInventory', () => {
  it('returns parsed InventoryArtifact for a run_id', async () => {
    const select = vi.fn().mockReturnThis()
    const eq = vi.fn().mockReturnThis()
    const single = vi.fn().mockResolvedValue({ data: { artifact: mockInventoryArtifact }, error: null })
    vi.mocked(supabase.from).mockReturnValue({ select, eq, single } as any)

    const { result } = renderHook(() => useRunInventory('run-1'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.total_files).toBe(210)
  })

  it('returns null when run_id is null', async () => {
    const { result } = renderHook(() => useRunInventory(null), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
  })
})

describe('useRunHistory', () => {
  it('returns RunSummary[] derived from 04-build-inventory artifacts', async () => {
    const select = vi.fn().mockReturnThis()
    const eq = vi.fn().mockReturnThis()
    const order = vi.fn().mockResolvedValue({
      data: [{
        run_id: 'run-1',
        artifact: { ...mockInventoryArtifact, items: [{ issues: ['stale', 'duplicate'] }, { issues: ['vague_name'] }] },
        created_at: '2026-06-10T10:00:00Z',
      }],
      error: null,
    })
    vi.mocked(supabase.from).mockReturnValue({ select, eq, order } as any)

    const { result } = renderHook(() => useRunHistory(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.[0].run_id).toBe('run-1')
    expect(result.current.data?.[0].total_files).toBe(210)
    expect(result.current.data?.[0].issue_count).toBe(3)
  })
})

describe('usePlatformInfo', () => {
  it('returns ConnectorsArtifact for a run_id', async () => {
    const select = vi.fn().mockReturnThis()
    const eq = vi.fn().mockReturnThis()
    const single = vi.fn().mockResolvedValue({ data: { artifact: mockConnectorsArtifact }, error: null })
    vi.mocked(supabase.from).mockReturnValue({ select, eq, single } as any)

    const { result } = renderHook(() => usePlatformInfo('run-1'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.platforms[0].name).toBe('Google Drive')
  })

  it('returns null when run_id is null', async () => {
    const { result } = renderHook(() => usePlatformInfo(null), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /mnt/c/Users/ejose/dev/synctropy/frontend && npx vitest run src/test/lib/artifact-queries.test.ts
```

Expected: FAIL — "Cannot find module '../../lib/artifact-queries'"

- [ ] **Step 3: Implement `src/lib/artifact-queries.ts`**

```typescript
import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'
import { inventoryArtifactSchema, connectorsArtifactSchema } from '../types/artifacts'
import type { InventoryArtifact, ConnectorsArtifact, RunSummary } from '../types/artifacts'

async function getUser() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user
}

export function useLatestRun() {
  return useQuery({
    queryKey: ['latestRun'],
    queryFn: async () => {
      const user = await getUser()
      const { data, error } = await supabase
        .from('pipeline_artifacts')
        .select('run_id')
        .eq('user_id', user.id)
        .eq('skill_name', '04-build-inventory')
        .order('created_at', { ascending: false })
        .limit(1)
      if (error) throw error
      return data?.[0]?.run_id ?? null
    },
  })
}

export function useRunInventory(runId: string | null) {
  return useQuery({
    queryKey: ['runInventory', runId],
    queryFn: async (): Promise<InventoryArtifact | null> => {
      if (!runId) return null
      const user = await getUser()
      const { data, error } = await supabase
        .from('pipeline_artifacts')
        .select('artifact')
        .eq('user_id', user.id)
        .eq('run_id', runId)
        .eq('skill_name', '04-build-inventory')
        .single()
      if (error) throw error
      return inventoryArtifactSchema.parse(data.artifact)
    },
    enabled: !!runId,
  })
}

export function useRunHistory() {
  return useQuery({
    queryKey: ['runHistory'],
    queryFn: async (): Promise<RunSummary[]> => {
      const user = await getUser()
      const { data, error } = await supabase
        .from('pipeline_artifacts')
        .select('run_id, artifact, created_at')
        .eq('user_id', user.id)
        .eq('skill_name', '04-build-inventory')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []).map(row => {
        const artifact = inventoryArtifactSchema.parse(row.artifact)
        const issueCount = artifact.items.reduce((sum, item) => sum + item.issues.length, 0)
        return {
          run_id: artifact.run_id,
          scanned_at: artifact.scanned_at,
          total_files: artifact.total_files,
          issue_count: issueCount,
          duration_ms: null,
        }
      })
    },
  })
}

export function usePlatformInfo(runId: string | null) {
  return useQuery({
    queryKey: ['platformInfo', runId],
    queryFn: async (): Promise<ConnectorsArtifact | null> => {
      if (!runId) return null
      const user = await getUser()
      const { data, error } = await supabase
        .from('pipeline_artifacts')
        .select('artifact')
        .eq('user_id', user.id)
        .eq('run_id', runId)
        .eq('skill_name', '00-scan-connectors')
        .single()
      if (error) throw error
      return connectorsArtifactSchema.parse(data.artifact)
    },
    enabled: !!runId,
  })
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd /mnt/c/Users/ejose/dev/synctropy/frontend && npx vitest run src/test/lib/artifact-queries.test.ts
```

Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git -C /mnt/c/Users/ejose/dev/synctropy add frontend/src/lib/artifact-queries.ts frontend/src/test/lib/artifact-queries.test.ts
git -C /mnt/c/Users/ejose/dev/synctropy commit -m "feat: add TanStack Query hooks for pipeline_artifacts"
```

---

## Task 3: PlatformStrip Component

**Files:**
- Create: `src/components/PlatformStrip.tsx`
- Create: `src/test/components/PlatformStrip.test.tsx`

**Interfaces:**
- Consumes: `ConnectedPlatform` from `../types/artifacts`
- Props: `{ platforms: ConnectedPlatform[] }`
- Renders: Row of cards, each showing platform name, email (if present), total_files, total_folders, storage_bytes (formatted), last_scanned date.

**Storage formatting helper** (inline in this file, not exported):
- < 1 GB → "X MB"
- ≥ 1 GB → "X.X GB"

- [ ] **Step 1: Write failing tests in `src/test/components/PlatformStrip.test.tsx`**

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PlatformStrip } from '../../components/PlatformStrip'
import type { ConnectedPlatform } from '../../types/artifacts'

const platform: ConnectedPlatform = {
  name: 'Google Drive',
  email: 'user@example.com',
  total_files: 210,
  total_folders: 34,
  storage_bytes: 5_200_000_000,
  last_scanned: '2026-06-10T10:00:00Z',
}

describe('PlatformStrip', () => {
  it('renders platform name', () => {
    render(<PlatformStrip platforms={[platform]} />)
    expect(screen.getByText('Google Drive')).toBeInTheDocument()
  })

  it('renders email when present', () => {
    render(<PlatformStrip platforms={[platform]} />)
    expect(screen.getByText('user@example.com')).toBeInTheDocument()
  })

  it('formats storage_bytes >= 1 GB as X.X GB', () => {
    render(<PlatformStrip platforms={[platform]} />)
    expect(screen.getByText('4.8 GB')).toBeInTheDocument()
  })

  it('formats storage_bytes < 1 GB as X MB', () => {
    render(<PlatformStrip platforms={[{ ...platform, storage_bytes: 500_000_000 }]} />)
    expect(screen.getByText('476 MB')).toBeInTheDocument()
  })

  it('renders total_files count', () => {
    render(<PlatformStrip platforms={[platform]} />)
    expect(screen.getByText('210 files')).toBeInTheDocument()
  })

  it('renders total_folders count', () => {
    render(<PlatformStrip platforms={[platform]} />)
    expect(screen.getByText('34 folders')).toBeInTheDocument()
  })

  it('renders last_scanned formatted date', () => {
    render(<PlatformStrip platforms={[platform]} />)
    expect(screen.getByText('Jun 10, 2026')).toBeInTheDocument()
  })

  it('renders multiple platform cards', () => {
    const p2 = { ...platform, name: 'Dropbox', email: undefined }
    render(<PlatformStrip platforms={[platform, p2]} />)
    expect(screen.getByText('Google Drive')).toBeInTheDocument()
    expect(screen.getByText('Dropbox')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /mnt/c/Users/ejose/dev/synctropy/frontend && npx vitest run src/test/components/PlatformStrip.test.tsx
```

Expected: FAIL — "Cannot find module '../../components/PlatformStrip'"

- [ ] **Step 3: Implement `src/components/PlatformStrip.tsx`**

```typescript
import { format } from 'date-fns'
import type { ConnectedPlatform } from '../types/artifacts'

function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  if (mb < 1024) return `${Math.round(mb)} MB`
  return `${(mb / 1024).toFixed(1)} GB`
}

type Props = {
  platforms: ConnectedPlatform[]
}

export function PlatformStrip({ platforms }: Props) {
  return (
    <div className="flex flex-wrap gap-3">
      {platforms.map(p => (
        <div
          key={p.name}
          className="bg-[#13131f] border border-[#2a2a3e] rounded-lg p-4 flex-1 min-w-[200px]"
        >
          <p className="text-sm font-semibold text-slate-200">{p.name}</p>
          {p.email && <p className="text-xs text-slate-500 mt-0.5">{p.email}</p>}
          <div className="mt-3 space-y-1">
            <p className="text-xs text-slate-400">{p.total_files} files</p>
            <p className="text-xs text-slate-400">{p.total_folders} folders</p>
            <p className="text-xs text-slate-400">{formatBytes(p.storage_bytes)}</p>
          </div>
          <p className="text-xs text-slate-600 mt-3">
            {format(new Date(p.last_scanned), 'MMM d, yyyy')}
          </p>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd /mnt/c/Users/ejose/dev/synctropy/frontend && npx vitest run src/test/components/PlatformStrip.test.tsx
```

Expected: All 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git -C /mnt/c/Users/ejose/dev/synctropy add frontend/src/components/PlatformStrip.tsx frontend/src/test/components/PlatformStrip.test.tsx
git -C /mnt/c/Users/ejose/dev/synctropy commit -m "feat: add PlatformStrip component"
```

---

## Task 4: CategoryBreakdown Component

**Files:**
- Create: `src/components/CategoryBreakdown.tsx`
- Create: `src/test/components/CategoryBreakdown.test.tsx`

**Interfaces:**
- Consumes: `CategoryStat` from `../types/artifacts`
- Props: `{ categories: CategoryStat[]; activeCategory: string | null; onSelect: (name: string | null) => void }`
- Renders: A horizontal bar chart (Recharts BarChart, layout="vertical") showing file count per category. Clicking a bar calls `onSelect(name)` (or `null` to deselect). The active category bar has a distinct color (`#a78bfa`); others are `#3a3a5c`.

**Note on Recharts in tests:** Recharts renders SVG; use `container.querySelector('svg')` to assert the chart rendered. Mock `ResizeObserver` in setup if needed — but the existing test setup (`jsdom`) handles this.

- [ ] **Step 1: Write failing tests in `src/test/components/CategoryBreakdown.test.tsx`**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CategoryBreakdown } from '../../components/CategoryBreakdown'
import type { CategoryStat } from '../../types/artifacts'

const categories: CategoryStat[] = [
  { name: 'Projects', count: 80, bytes: 2_000_000_000 },
  { name: 'Finance', count: 30, bytes: 500_000_000 },
  { name: 'Media', count: 50, bytes: 1_200_000_000 },
]

describe('CategoryBreakdown', () => {
  it('renders each category label', () => {
    render(<CategoryBreakdown categories={categories} activeCategory={null} onSelect={vi.fn()} />)
    expect(screen.getByText('Projects')).toBeInTheDocument()
    expect(screen.getByText('Finance')).toBeInTheDocument()
    expect(screen.getByText('Media')).toBeInTheDocument()
  })

  it('renders file counts', () => {
    render(<CategoryBreakdown categories={categories} activeCategory={null} onSelect={vi.fn()} />)
    expect(screen.getByText('80')).toBeInTheDocument()
    expect(screen.getByText('30')).toBeInTheDocument()
    expect(screen.getByText('50')).toBeInTheDocument()
  })

  it('renders a chart', () => {
    const { container } = render(
      <CategoryBreakdown categories={categories} activeCategory={null} onSelect={vi.fn()} />
    )
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('calls onSelect with category name when a row is clicked', () => {
    const onSelect = vi.fn()
    render(<CategoryBreakdown categories={categories} activeCategory={null} onSelect={onSelect} />)
    fireEvent.click(screen.getByText('Finance'))
    expect(onSelect).toHaveBeenCalledWith('Finance')
  })

  it('calls onSelect(null) when the active category is clicked again', () => {
    const onSelect = vi.fn()
    render(<CategoryBreakdown categories={categories} activeCategory="Finance" onSelect={onSelect} />)
    fireEvent.click(screen.getByText('Finance'))
    expect(onSelect).toHaveBeenCalledWith(null)
  })

  it('shows percentage for each category', () => {
    render(<CategoryBreakdown categories={categories} activeCategory={null} onSelect={vi.fn()} />)
    // 80/(80+30+50) = 50%
    expect(screen.getByText('50%')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /mnt/c/Users/ejose/dev/synctropy/frontend && npx vitest run src/test/components/CategoryBreakdown.test.tsx
```

Expected: FAIL — "Cannot find module '../../components/CategoryBreakdown'"

- [ ] **Step 3: Implement `src/components/CategoryBreakdown.tsx`**

```typescript
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from 'recharts'
import type { CategoryStat } from '../types/artifacts'

type Props = {
  categories: CategoryStat[]
  activeCategory: string | null
  onSelect: (name: string | null) => void
}

export function CategoryBreakdown({ categories, activeCategory, onSelect }: Props) {
  const total = categories.reduce((sum, c) => sum + c.count, 0)

  return (
    <div className="bg-[#13131f] border border-[#2a2a3e] rounded-lg p-4">
      <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Files by category</p>

      <div className="space-y-1 mb-4">
        {categories.map(c => {
          const pct = total > 0 ? Math.round((c.count / total) * 100) : 0
          const active = activeCategory === c.name
          return (
            <button
              key={c.name}
              onClick={() => onSelect(active ? null : c.name)}
              className={`w-full flex items-center justify-between text-xs py-1 px-2 rounded transition-colors ${
                active ? 'bg-[#2a2a3e] text-slate-100' : 'text-slate-400 hover:bg-[#1a1a2e]'
              }`}
            >
              <span>{c.name}</span>
              <span className="flex gap-3 tabular-nums">
                <span>{c.count}</span>
                <span className="text-slate-600">{pct}%</span>
              </span>
            </button>
          )
        })}
      </div>

      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={categories} layout="vertical" margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" hide />
          <Tooltip
            contentStyle={{ background: '#1e1e2e', border: '1px solid #3a3a5c', borderRadius: 6 }}
            itemStyle={{ color: '#a78bfa', fontSize: 12 }}
            formatter={(v: number) => [v, 'files']}
          />
          <Bar dataKey="count" radius={[0, 3, 3, 0]}>
            {categories.map(c => (
              <Cell
                key={c.name}
                fill={activeCategory === c.name ? '#a78bfa' : '#3a3a5c'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd /mnt/c/Users/ejose/dev/synctropy/frontend && npx vitest run src/test/components/CategoryBreakdown.test.tsx
```

Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git -C /mnt/c/Users/ejose/dev/synctropy add frontend/src/components/CategoryBreakdown.tsx frontend/src/test/components/CategoryBreakdown.test.tsx
git -C /mnt/c/Users/ejose/dev/synctropy commit -m "feat: add CategoryBreakdown component"
```

---

## Task 5: IssuesPanel Component

**Files:**
- Create: `src/components/IssuesPanel.tsx`
- Create: `src/test/components/IssuesPanel.test.tsx`

**Interfaces:**
- Consumes: `InventoryItem`, `IssueType` from `../types/artifacts`
- Props: `{ items: InventoryItem[]; activeCategory: string | null }`
- Renders: Five issue groups (vague_name, duplicate, stale, root_clutter, unreadable), each collapsible. When `activeCategory` is set, only items matching that category are included in the counts and expanded lists.
- Each group shows: issue label, count badge, collapsed by default. Clicking the group header expands a list of up to 20 items (name + path).

**Issue labels:**
- `vague_name` → "Generic file names"
- `duplicate` → "Likely duplicates"
- `stale` → "Untouched for 2+ years"
- `root_clutter` → "Files at Drive root"
- `unreadable` → "Couldn't be categorised"

- [ ] **Step 1: Write failing tests in `src/test/components/IssuesPanel.test.tsx`**

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { IssuesPanel } from '../../components/IssuesPanel'
import type { InventoryItem } from '../../types/artifacts'

const makeItem = (id: string, issues: InventoryItem['issues'], category = 'Projects'): InventoryItem => ({
  id,
  name: `file-${id}.pdf`,
  path: `/Drive/file-${id}.pdf`,
  type: 'file',
  size_bytes: 1000,
  modified_at: '2022-01-01T00:00:00Z',
  category,
  lifecycle: 'archive',
  summary: null,
  confidence: 0.8,
  issues,
})

const items: InventoryItem[] = [
  makeItem('1', ['vague_name', 'stale']),
  makeItem('2', ['duplicate']),
  makeItem('3', ['vague_name']),
  makeItem('4', ['root_clutter'], 'Finance'),
  makeItem('5', [], 'Projects'),
]

describe('IssuesPanel', () => {
  it('shows count for each issue type', () => {
    render(<IssuesPanel items={items} activeCategory={null} />)
    expect(screen.getByText('2')).toBeInTheDocument() // vague_name
    expect(screen.getByText('1')).toBeInTheDocument() // duplicate
  })

  it('shows human-readable labels', () => {
    render(<IssuesPanel items={items} activeCategory={null} />)
    expect(screen.getByText('Generic file names')).toBeInTheDocument()
    expect(screen.getByText('Likely duplicates')).toBeInTheDocument()
    expect(screen.getByText('Untouched for 2+ years')).toBeInTheDocument()
  })

  it('expands a group on click to show file names', () => {
    render(<IssuesPanel items={items} activeCategory={null} />)
    fireEvent.click(screen.getByText('Generic file names'))
    expect(screen.getByText('file-1.pdf')).toBeInTheDocument()
    expect(screen.getByText('file-3.pdf')).toBeInTheDocument()
  })

  it('filters by activeCategory', () => {
    render(<IssuesPanel items={items} activeCategory="Finance" />)
    // Only item 4 (Finance + root_clutter) should appear
    // vague_name count should be 0 (items 1,3 are Projects)
    const vagueGroup = screen.getByText('Generic file names').closest('div')
    expect(vagueGroup?.textContent).toContain('0')
  })

  it('hides groups with 0 items', () => {
    render(<IssuesPanel items={items} activeCategory="Finance" />)
    // duplicate count is 0 for Finance
    fireEvent.click(screen.getByText('Likely duplicates'))
    expect(screen.queryByText('file-2.pdf')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /mnt/c/Users/ejose/dev/synctropy/frontend && npx vitest run src/test/components/IssuesPanel.test.tsx
```

Expected: FAIL — "Cannot find module '../../components/IssuesPanel'"

- [ ] **Step 3: Implement `src/components/IssuesPanel.tsx`**

```typescript
import { useState } from 'react'
import type { InventoryItem, IssueType } from '../types/artifacts'

const ISSUE_LABELS: Record<IssueType, string> = {
  vague_name: 'Generic file names',
  duplicate: 'Likely duplicates',
  stale: 'Untouched for 2+ years',
  root_clutter: 'Files at Drive root',
  unreadable: 'Couldn\'t be categorised',
}

const ISSUE_TYPES: IssueType[] = ['vague_name', 'duplicate', 'stale', 'root_clutter', 'unreadable']

type Props = {
  items: InventoryItem[]
  activeCategory: string | null
}

export function IssuesPanel({ items, activeCategory }: Props) {
  const [expanded, setExpanded] = useState<IssueType | null>(null)
  const filtered = activeCategory ? items.filter(i => i.category === activeCategory) : items

  return (
    <div className="bg-[#13131f] border border-[#2a2a3e] rounded-lg p-4">
      <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Issues</p>
      <div className="space-y-1">
        {ISSUE_TYPES.map(issueType => {
          const affected = filtered.filter(i => i.issues.includes(issueType))
          const isExpanded = expanded === issueType
          return (
            <div key={issueType}>
              <button
                onClick={() => setExpanded(isExpanded ? null : issueType)}
                className="w-full flex items-center justify-between text-xs py-2 px-2 rounded hover:bg-[#1a1a2e] transition-colors text-slate-400"
              >
                <span>{ISSUE_LABELS[issueType]}</span>
                <span className="bg-[#2a2a3e] text-slate-300 rounded px-1.5 py-0.5 tabular-nums">
                  {affected.length}
                </span>
              </button>
              {isExpanded && affected.length > 0 && (
                <div className="mt-1 ml-2 space-y-0.5 max-h-40 overflow-y-auto">
                  {affected.slice(0, 20).map(item => (
                    <div key={item.id} className="py-0.5">
                      <p className="text-xs text-slate-300">{item.name}</p>
                      <p className="text-xs font-mono text-slate-600 truncate">{item.path}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd /mnt/c/Users/ejose/dev/synctropy/frontend && npx vitest run src/test/components/IssuesPanel.test.tsx
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git -C /mnt/c/Users/ejose/dev/synctropy add frontend/src/components/IssuesPanel.tsx frontend/src/test/components/IssuesPanel.test.tsx
git -C /mnt/c/Users/ejose/dev/synctropy commit -m "feat: add IssuesPanel component"
```

---

## Task 6: RunHistory Component

**Files:**
- Create: `src/components/RunHistory.tsx`
- Create: `src/test/components/RunHistory.test.tsx`

**Interfaces:**
- Consumes: `RunSummary` from `../types/artifacts`
- Props: `{ runs: RunSummary[]; selectedRunId: string | null; onSelect: (runId: string) => void }`
- Renders: Compact horizontal-scroll or stacked list of run cards. Each card shows: date, total_files, issue_count, and duration (or "—" if null). Clicking a card calls `onSelect(run_id)`. Selected card has a purple border `border-[#a78bfa]`.

- [ ] **Step 1: Write failing tests in `src/test/components/RunHistory.test.tsx`**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RunHistory } from '../../components/RunHistory'
import type { RunSummary } from '../../types/artifacts'

const runs: RunSummary[] = [
  { run_id: 'run-3', scanned_at: '2026-06-10T10:00:00Z', total_files: 210, issue_count: 12, duration_ms: 45000 },
  { run_id: 'run-2', scanned_at: '2026-05-20T10:00:00Z', total_files: 195, issue_count: 18, duration_ms: 38000 },
  { run_id: 'run-1', scanned_at: '2026-04-15T10:00:00Z', total_files: 180, issue_count: 22, duration_ms: null },
]

describe('RunHistory', () => {
  it('renders all run dates', () => {
    render(<RunHistory runs={runs} selectedRunId={null} onSelect={vi.fn()} />)
    expect(screen.getByText('Jun 10, 2026')).toBeInTheDocument()
    expect(screen.getByText('May 20, 2026')).toBeInTheDocument()
    expect(screen.getByText('Apr 15, 2026')).toBeInTheDocument()
  })

  it('renders file counts', () => {
    render(<RunHistory runs={runs} selectedRunId={null} onSelect={vi.fn()} />)
    expect(screen.getByText('210 files')).toBeInTheDocument()
  })

  it('renders issue counts', () => {
    render(<RunHistory runs={runs} selectedRunId={null} onSelect={vi.fn()} />)
    expect(screen.getByText('12 issues')).toBeInTheDocument()
  })

  it('renders duration when present', () => {
    render(<RunHistory runs={runs} selectedRunId={null} onSelect={vi.fn()} />)
    expect(screen.getByText('45s')).toBeInTheDocument()
  })

  it('renders — when duration_ms is null', () => {
    render(<RunHistory runs={runs} selectedRunId={null} onSelect={vi.fn()} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('calls onSelect with run_id when a card is clicked', () => {
    const onSelect = vi.fn()
    render(<RunHistory runs={runs} selectedRunId={null} onSelect={onSelect} />)
    fireEvent.click(screen.getByText('Jun 10, 2026'))
    expect(onSelect).toHaveBeenCalledWith('run-3')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /mnt/c/Users/ejose/dev/synctropy/frontend && npx vitest run src/test/components/RunHistory.test.tsx
```

Expected: FAIL — "Cannot find module '../../components/RunHistory'"

- [ ] **Step 3: Implement `src/components/RunHistory.tsx`**

```typescript
import { format } from 'date-fns'
import type { RunSummary } from '../types/artifacts'

function formatDuration(ms: number | null): string {
  if (ms === null) return '—'
  return `${Math.round(ms / 1000)}s`
}

type Props = {
  runs: RunSummary[]
  selectedRunId: string | null
  onSelect: (runId: string) => void
}

export function RunHistory({ runs, selectedRunId, onSelect }: Props) {
  return (
    <div>
      <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Run history</p>
      <div className="space-y-2">
        {runs.map(run => {
          const selected = run.run_id === selectedRunId
          return (
            <button
              key={run.run_id}
              onClick={() => onSelect(run.run_id)}
              className={`w-full flex items-center justify-between bg-[#13131f] border rounded-lg px-4 py-3 text-left transition-colors hover:bg-[#1a1a2e] ${
                selected ? 'border-[#a78bfa]' : 'border-[#2a2a3e]'
              }`}
            >
              <span className="text-sm text-slate-200">
                {format(new Date(run.scanned_at), 'MMM d, yyyy')}
              </span>
              <span className="flex gap-4 text-xs text-slate-400 tabular-nums">
                <span>{run.total_files} files</span>
                <span>{run.issue_count} issues</span>
                <span>{formatDuration(run.duration_ms)}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd /mnt/c/Users/ejose/dev/synctropy/frontend && npx vitest run src/test/components/RunHistory.test.tsx
```

Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git -C /mnt/c/Users/ejose/dev/synctropy add frontend/src/components/RunHistory.tsx frontend/src/test/components/RunHistory.test.tsx
git -C /mnt/c/Users/ejose/dev/synctropy commit -m "feat: add RunHistory component"
```

---

## Task 7: Update EmptyState Copy

**Files:**
- Modify: `src/components/EmptyState.tsx`

**Current copy (to replace):**
- Headline: "Your Drive hasn't been scanned yet."
- Subhead: "Open Claude, connect Synctropy, and run your first scan to see your entropy score."
- Button: "How to run your first scan"

**New copy (from spec):**
- Headline: "Your Drive hasn't been organised yet."
- Subhead: "Open Claude, connect Synctropy, and run /00-scan-connectors to get started."
- Button: unchanged

No new tests needed — the existing component structure is unchanged. This is copy-only.

- [ ] **Step 1: Update `src/components/EmptyState.tsx`**

Replace the two text strings (headline and subhead):

```typescript
import { Button } from './ui/button'

const DOCS_URL = 'https://docs.getsynctropy.com/first-scan'

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
      <h2 className="text-xl font-semibold text-slate-200">
        Your Drive hasn't been organised yet.
      </h2>
      <p className="text-sm text-slate-400 max-w-sm">
        Open Claude, connect Synctropy, and run /00-scan-connectors to get started.
      </p>
      <Button
        variant="outline"
        className="border-[#2a2a3e] text-slate-300 hover:bg-[#2a2a3e]"
        onClick={() => window.open(DOCS_URL, '_blank', 'noopener')}
      >
        How to run your first scan
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git -C /mnt/c/Users/ejose/dev/synctropy add frontend/src/components/EmptyState.tsx
git -C /mnt/c/Users/ejose/dev/synctropy commit -m "feat: update EmptyState copy for storage-metrics redesign"
```

---

## Task 8: Rewrite history.tsx and Delete Old Components

**Files:**
- Modify: `src/routes/history.tsx` — full rewrite
- Delete: `src/components/TrendChart.tsx`
- Delete: `src/components/FolderSparklines.tsx`
- Delete: `src/components/ScanDetail.tsx`
- Delete: `src/lib/score.ts`
- Delete: `src/test/lib/score.test.ts`

**No new test file for history.tsx** — it's a page-level composition component; the individual new components are already tested. Integration is validated by running the dev server (Task 9).

- [ ] **Step 1: Rewrite `src/routes/history.tsx`**

```typescript
import { useState } from 'react'
import { useLatestRun, useRunInventory, useRunHistory, usePlatformInfo } from '../lib/artifact-queries'
import { EmptyState } from '../components/EmptyState'
import { PlatformStrip } from '../components/PlatformStrip'
import { CategoryBreakdown } from '../components/CategoryBreakdown'
import { IssuesPanel } from '../components/IssuesPanel'
import { RunHistory } from '../components/RunHistory'

export default function HistoryPage() {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const { data: latestRunId, isLoading: loadingLatest, isError } = useLatestRun()
  const viewRunId = selectedRunId ?? latestRunId ?? null

  const { data: inventory, isLoading: loadingInventory } = useRunInventory(viewRunId)
  const { data: history, isLoading: loadingHistory } = useRunHistory()
  const { data: connectors } = usePlatformInfo(viewRunId)

  if (loadingLatest || loadingHistory) {
    return <p className="text-slate-400 text-sm">Loading…</p>
  }

  if (isError) {
    return <p className="text-slate-400 text-sm">Couldn't load history.</p>
  }

  if (!latestRunId) {
    return <EmptyState />
  }

  return (
    <div className="space-y-6">
      {connectors && <PlatformStrip platforms={connectors.platforms} />}

      {inventory && (
        <>
          <CategoryBreakdown
            categories={inventory.categories}
            activeCategory={activeCategory}
            onSelect={setActiveCategory}
          />
          <IssuesPanel
            items={inventory.items}
            activeCategory={activeCategory}
          />
        </>
      )}

      {loadingInventory && (
        <p className="text-slate-400 text-sm">Loading inventory…</p>
      )}

      {history && (
        <RunHistory
          runs={history}
          selectedRunId={selectedRunId}
          onSelect={id => {
            setSelectedRunId(prev => prev === id ? null : id)
            setActiveCategory(null)
          }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Delete old components and files**

```bash
rm /mnt/c/Users/ejose/dev/synctropy/frontend/src/components/TrendChart.tsx
rm /mnt/c/Users/ejose/dev/synctropy/frontend/src/components/FolderSparklines.tsx
rm /mnt/c/Users/ejose/dev/synctropy/frontend/src/components/ScanDetail.tsx
rm /mnt/c/Users/ejose/dev/synctropy/frontend/src/lib/score.ts
rm /mnt/c/Users/ejose/dev/synctropy/frontend/src/test/lib/score.test.ts
```

- [ ] **Step 3: Remove old type exports from `src/types/index.ts`**

Remove these types (no longer needed):
- `FolderScore`
- `EntropyScan`
- `ScanSummary`

The file should now only contain `UserPreferences`, `StorageMode`, and the re-export line added in Task 1.

```typescript
export type { StorageMode, UserPreferences } from './index'
```

Wait — `index.ts` IS the file. Final content of `src/types/index.ts`:

```typescript
export type { StorageMode } from './artifacts'

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

export type { IssueType, InventoryItem, CategoryStat, InventoryArtifact, ConnectedPlatform, ConnectorsArtifact, RunSummary } from './artifacts'
```

**Note:** `StorageMode` stays here because `UserPreferences` references it.

- [ ] **Step 4: Remove old hook exports from `src/lib/queries.ts`**

Remove `useScans` and `useScan` (they import from `entropy_scans`). Keep `usePreferences` — it's still used by settings.tsx.

Final content of `src/lib/queries.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { UserPreferences } from '../types'

export function usePreferences() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['preferences'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
      if (error) throw error
      return data as UserPreferences | null
    },
  })

  const mutation = useMutation({
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['preferences'] }),
  })

  return {
    ...query,
    save: mutation.mutate,
    isSaving: mutation.isPending,
    saveError: mutation.error,
  }
}
```

- [ ] **Step 5: Run the full test suite to confirm no broken imports**

```bash
cd /mnt/c/Users/ejose/dev/synctropy/frontend && npx vitest run
```

Expected: All tests PASS. If PreferencesForm.test.tsx fails due to removed types, update its mock to no longer reference `ScanSummary` / `EntropyScan`.

- [ ] **Step 6: Commit**

```bash
git -C /mnt/c/Users/ejose/dev/synctropy add -A frontend/src/
git -C /mnt/c/Users/ejose/dev/synctropy commit -m "feat: rewrite history page with storage metrics components, remove entropy components"
```

---

## Task 9: Verify in Browser

**Purpose:** Confirm the new history page renders correctly with the seeded Supabase data.

- [ ] **Step 1: Start dev server**

```bash
cd /mnt/c/Users/ejose/dev/synctropy/frontend && npm run dev
```

Open `http://localhost:5173` in a browser.

- [ ] **Step 2: Log in** with the test user (`ejoseph.donovan@gmail.com` or whatever credentials are available).

- [ ] **Step 3: Navigate to History tab and verify:**
  - Platform strip shows Google Drive card with email, file count, storage size, and date
  - Category breakdown shows a bar chart with category names and counts
  - Issues panel shows 5 issue groups with counts
  - Clicking a category in the breakdown filters the issues panel
  - Run history shows 3 run cards (Jun 10, May 20, Apr 15)
  - Clicking a run card loads that run's snapshot (inventory + platform strip updates)
  - Clicking the same run card again deselects it and returns to latest

- [ ] **Step 4: Verify empty state** by temporarily using a user with no pipeline_artifacts rows — the EmptyState component should render with new copy.

- [ ] **Step 5: TypeScript build passes**

```bash
cd /mnt/c/Users/ejose/dev/synctropy/frontend && npm run build
```

Expected: no type errors, build succeeds.

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Platform strip (from skill 00) | Task 3, Task 8 |
| Category breakdown chart | Task 4, Task 8 |
| Issues panel with expand | Task 5, Task 8 |
| Run history strip | Task 6, Task 8 |
| Empty state updated copy | Task 7 |
| TrendChart → RunHistory | Task 6, Task 8 |
| FolderSparklines → CategoryBreakdown | Task 4, Task 8 |
| ScanDetail → IssuesPanel | Task 5, Task 8 |
| EmptyState copy updated | Task 7 |
| New TanStack Query hooks | Task 2 |
| entropy_scans no longer read | Task 8 |
| Settings tab unchanged | ✓ not touched |

**Placeholder scan:** No TBDs, TODOs, or "similar to" references found.

**Type consistency check:**
- `ConnectedPlatform` defined in Task 1, used in Task 3 ✓
- `CategoryStat` defined in Task 1, used in Task 4 ✓
- `InventoryItem` + `IssueType` defined in Task 1, used in Task 5 ✓
- `RunSummary` defined in Task 1, used in Task 6 ✓
- `useLatestRun`, `useRunInventory`, `useRunHistory`, `usePlatformInfo` defined in Task 2, used in Task 8 ✓
- `activeCategory: string | null` consistent across Task 4 (onSelect), Task 5 (prop), Task 8 (state) ✓
