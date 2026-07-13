# Synctropy Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the authenticated Synctropy dashboard — a two-tab React/TypeScript SPA for entropy history and user preferences backed by Supabase.

**Architecture:** Vite SPA with React Router v6 for `/history` and `/settings` routes, TanStack Query for Supabase data fetching with caching, and shadcn/ui components. The MCP server owns all writes to `entropy_scans`; the dashboard only reads that table. `user_preferences` is read/write from the dashboard.

**Tech Stack:** Vite, React 18, TypeScript, React Router v6, TanStack Query v5, shadcn/ui, Tailwind CSS, Recharts, Supabase JS v2, Zod, Vitest, React Testing Library

---

## File Map

| File | Responsibility |
|---|---|
| `supabase/migrations/001_dashboard_schema.sql` | user_preferences + entropy_scans tables + RLS policies |
| `frontend/src/types/index.ts` | TypeScript types for all DB rows |
| `frontend/src/lib/supabase.ts` | Typed Supabase client singleton |
| `frontend/src/lib/score.ts` | Score → Tailwind colour-class utility |
| `frontend/src/lib/queries.ts` | TanStack Query hooks: usePreferences, useScans, useScan |
| `frontend/src/components/AuthGuard.tsx` | Redirects to /login when session is absent |
| `frontend/src/components/EmptyState.tsx` | No-scans-yet placeholder with CTA |
| `frontend/src/components/TrendChart.tsx` | Overall entropy area chart with clickable data points |
| `frontend/src/components/FolderSparklines.tsx` | Per-folder score grid with colour coding |
| `frontend/src/components/ScanDetail.tsx` | Drill-down diff panel for a selected scan |
| `frontend/src/components/PreferencesForm.tsx` | Settings form (exports preferencesSchema for tests) |
| `frontend/src/routes/login.tsx` | Magic-link login page |
| `frontend/src/routes/_layout.tsx` | DashboardLayout: top tabs + sign-out button |
| `frontend/src/routes/history.tsx` | History tab: delta headline + chart + sparklines + drill-down |
| `frontend/src/routes/settings.tsx` | Settings tab: wraps PreferencesForm + Toaster |
| `frontend/src/App.tsx` | Router setup + QueryClientProvider |
| `frontend/src/main.tsx` | React root |

---

### Task 1: Supabase schema migration

**Files:**
- Create: `supabase/migrations/001_dashboard_schema.sql`

- [ ] **Step 1: Create directory and migration file**

```bash
mkdir -p supabase/migrations
```

Create `supabase/migrations/001_dashboard_schema.sql`:

```sql
-- user_preferences: one row per user, written by dashboard
drop table if exists user_preferences;

create table user_preferences (
  id                  uuid        primary key references auth.users on delete cascade,
  root_path           text,
  ignore_paths        text[]      not null default '{}',
  archive_after_days  int         not null default 365,
  taxonomy_domains    text[]      not null default '{projects,finance,admin,media,reference}',
  updated_at          timestamptz not null default now()
);

alter table user_preferences enable row level security;

create policy "Users manage own preferences"
  on user_preferences for all
  using  (auth.uid() = id)
  with check (auth.uid() = id);

-- entropy_scans: append-only, written by MCP server via service-role key
drop table if exists entropy_scans;

create table entropy_scans (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users on delete cascade,
  scanned_at     timestamptz not null default now(),
  overall_score  float       not null,
  folder_scores  jsonb       not null
  -- folder_scores shape: [{ "path": string, "score": number, "file_count": number }]
);

alter table entropy_scans enable row level security;

create policy "Users read own scans"
  on entropy_scans for select
  using (auth.uid() = user_id);

-- Service role bypasses RLS — no insert policy needed on the dashboard side.

create index entropy_scans_user_scanned_at
  on entropy_scans (user_id, scanned_at desc);
```

- [ ] **Step 2: Apply migration to local Supabase**

```bash
supabase start   # if not already running
supabase db reset
```

Expected: Output ends with "Finished supabase db reset" and no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/001_dashboard_schema.sql
git commit -m "feat(supabase): define user_preferences and entropy_scans schema with RLS"
```

---

### Task 2: Vite + React scaffold

**Files:**
- Create: `frontend/` (Vite-generated)
- Modify: `frontend/vite.config.ts`
- Create: `frontend/src/index.css`
- Create: `frontend/src/test/setup.ts`
- Create: `frontend/.env.example`

- [ ] **Step 1: Scaffold with Vite**

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend && npm install
```

- [ ] **Step 2: Install runtime dependencies**

```bash
npm install react-router-dom @tanstack/react-query @supabase/supabase-js zod date-fns recharts
```

- [ ] **Step 3: Install dev dependencies**

```bash
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom tailwindcss @tailwindcss/vite
```

- [ ] **Step 4: Configure Vite + Tailwind + Vitest**

Replace `frontend/vite.config.ts` with:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})
```

Replace `frontend/src/index.css` with:

```css
@import "tailwindcss";
```

- [ ] **Step 5: Init shadcn and add components**

```bash
npx shadcn@latest init
```

When prompted: style = Default, base color = Slate, CSS variables = yes.

```bash
npx shadcn@latest add button input label toast
npx shadcn@latest add chart
```

- [ ] **Step 6: Create test setup**

Create `frontend/src/test/setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 7: Create env example and local env**

Create `frontend/.env.example`:

```
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

```bash
cp .env.example .env.local
supabase status   # copy API URL and anon key into .env.local
```

- [ ] **Step 8: Verify dev server starts**

```bash
npm run dev
```

Expected: Vite dev server on `http://localhost:5173` with no errors.

- [ ] **Step 9: Commit**

```bash
cd .. && git add frontend/
git commit -m "feat(frontend): scaffold Vite + React + shadcn/ui + Tailwind"
```

---

### Task 3: Types and Supabase client

**Files:**
- Create: `frontend/src/types/index.ts`
- Create: `frontend/src/lib/supabase.ts`

- [ ] **Step 1: Write types**

Create `frontend/src/types/index.ts`:

```typescript
export type UserPreferences = {
  id: string
  root_path: string | null
  ignore_paths: string[]
  archive_after_days: number
  taxonomy_domains: string[]
  updated_at: string
}

export type FolderScore = {
  path: string
  score: number
  file_count: number
}

export type EntropyScan = {
  id: string
  user_id: string
  scanned_at: string
  overall_score: number
  folder_scores: FolderScore[]
}

// Lightweight shape returned by useScans() — no folder_scores
export type ScanSummary = Pick<EntropyScan, 'id' | 'scanned_at' | 'overall_score'>
```

- [ ] **Step 2: Write Supabase client**

Create `frontend/src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/lib/supabase.ts
git commit -m "feat(frontend): add DB types and Supabase client"
```

---

### Task 4: Score colour utility (TDD)

**Files:**
- Create: `frontend/src/lib/score.ts`
- Test: `frontend/src/test/lib/score.test.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/test/lib/score.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { scoreColorClass, scoreBorderClass } from '../../lib/score'

describe('scoreColorClass', () => {
  it('returns red for score >= 0.8', () => {
    expect(scoreColorClass(0.8)).toBe('text-red-400')
    expect(scoreColorClass(0.95)).toBe('text-red-400')
    expect(scoreColorClass(1.0)).toBe('text-red-400')
  })

  it('returns orange for score >= 0.5 and < 0.8', () => {
    expect(scoreColorClass(0.5)).toBe('text-orange-400')
    expect(scoreColorClass(0.65)).toBe('text-orange-400')
    expect(scoreColorClass(0.799)).toBe('text-orange-400')
  })

  it('returns green for score < 0.5', () => {
    expect(scoreColorClass(0.0)).toBe('text-green-400')
    expect(scoreColorClass(0.3)).toBe('text-green-400')
    expect(scoreColorClass(0.499)).toBe('text-green-400')
  })
})

describe('scoreBorderClass', () => {
  it('returns red border for score >= 0.8', () => {
    expect(scoreBorderClass(0.8)).toBe('border-red-400/30')
  })

  it('returns orange border for score >= 0.5 and < 0.8', () => {
    expect(scoreBorderClass(0.5)).toBe('border-orange-400/30')
  })

  it('returns green border for score < 0.5', () => {
    expect(scoreBorderClass(0.3)).toBe('border-green-400/30')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run src/test/lib/score.test.ts
```

Expected: FAIL — "Cannot find module '../../lib/score'"

- [ ] **Step 3: Implement score utility**

Create `frontend/src/lib/score.ts`:

```typescript
export function scoreColorClass(score: number): string {
  if (score >= 0.8) return 'text-red-400'
  if (score >= 0.5) return 'text-orange-400'
  return 'text-green-400'
}

export function scoreBorderClass(score: number): string {
  if (score >= 0.8) return 'border-red-400/30'
  if (score >= 0.5) return 'border-orange-400/30'
  return 'border-green-400/30'
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/test/lib/score.test.ts
```

Expected: PASS — 6 tests passing

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/score.ts frontend/src/test/lib/score.test.ts
git commit -m "feat(frontend): add score colour utility with tests"
```

---

### Task 5: TanStack Query hooks

**Files:**
- Create: `frontend/src/lib/queries.ts`

- [ ] **Step 1: Write queries.ts**

Create `frontend/src/lib/queries.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { UserPreferences, ScanSummary, EntropyScan } from '../types'

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
    mutationFn: async (prefs: Omit<UserPreferences, 'id' | 'updated_at'>) => {
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

export function useScans() {
  return useQuery({
    queryKey: ['scans'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data, error } = await supabase
        .from('entropy_scans')
        .select('id, scanned_at, overall_score')
        .eq('user_id', user.id)
        .order('scanned_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as ScanSummary[]
    },
  })
}

export function useScan(id: string | null) {
  return useQuery({
    queryKey: ['scan', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entropy_scans')
        .select('*')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as EntropyScan
    },
    enabled: !!id,
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/lib/queries.ts
git commit -m "feat(frontend): add TanStack Query hooks for preferences and scans"
```

---

### Task 6: Auth — Login page and AuthGuard

**Files:**
- Create: `frontend/src/components/AuthGuard.tsx`
- Create: `frontend/src/routes/login.tsx`

- [ ] **Step 1: Write AuthGuard**

Create `frontend/src/components/AuthGuard.tsx`:

```typescript
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate('/login', { replace: true })
      setChecking(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') navigate('/login', { replace: true })
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  if (checking) return null
  return <>{children}</>
}
```

- [ ] **Step 2: Write login page**

Create `frontend/src/routes/login.tsx`:

```typescript
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/history` },
    })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
      <div className="w-full max-w-sm space-y-6 px-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Synctropy</h1>
          <p className="text-sm text-slate-400 mt-1">Sign in to your dashboard</p>
        </div>
        {sent ? (
          <p className="text-sm text-slate-300">
            Check your email — we sent you a magic link.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email" className="text-slate-300">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="bg-[#13131f] border-[#2a2a3e] text-slate-200"
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-500 hover:bg-violet-600"
            >
              {loading ? 'Sending…' : 'Send magic link'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/AuthGuard.tsx frontend/src/routes/login.tsx
git commit -m "feat(frontend): add magic-link login page and AuthGuard"
```

---

### Task 7: App router and DashboardLayout

**Files:**
- Create: `frontend/src/routes/_layout.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: Write DashboardLayout**

Create `frontend/src/routes/_layout.tsx`:

```typescript
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { AuthGuard } from '../components/AuthGuard'

export default function DashboardLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#0f0f1a] text-slate-200">
        <nav className="border-b border-[#2a2a3e] bg-[#13131f]">
          <div className="flex items-center justify-between px-6">
            <div className="flex">
              <Link
                to="/history"
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  pathname === '/history'
                    ? 'border-violet-400 text-violet-400'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                History
              </Link>
              <Link
                to="/settings"
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  pathname === '/settings'
                    ? 'border-violet-400 text-violet-400'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                Settings
              </Link>
            </div>
            <button
              onClick={handleSignOut}
              className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              Sign out
            </button>
          </div>
        </nav>
        <main className="px-6 py-6 max-w-4xl mx-auto">
          <Outlet />
        </main>
      </div>
    </AuthGuard>
  )
}
```

- [ ] **Step 2: Write App.tsx**

Replace `frontend/src/App.tsx` with:

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import DashboardLayout from './routes/_layout'
import HistoryPage from './routes/history'
import SettingsPage from './routes/settings'
import LoginPage from './routes/login'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<DashboardLayout />}>
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/history" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
```

- [ ] **Step 3: Update main.tsx**

Replace `frontend/src/main.tsx` with:

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] **Step 4: Create route stubs to unblock the dev server**

Create `frontend/src/routes/history.tsx`:

```typescript
export default function HistoryPage() {
  return <div className="text-slate-400">History — coming soon</div>
}
```

Create `frontend/src/routes/settings.tsx`:

```typescript
export default function SettingsPage() {
  return <div className="text-slate-400">Settings — coming soon</div>
}
```

- [ ] **Step 5: Verify dev server starts with no errors**

```bash
cd frontend && npm run dev
```

Open `http://localhost:5173` — expected: redirects to `/login`. Sign in shows the magic-link form.

- [ ] **Step 6: Commit**

```bash
cd .. && git add frontend/src/routes/ frontend/src/App.tsx frontend/src/main.tsx
git commit -m "feat(frontend): add router, dashboard layout, and route stubs"
```

---

### Task 8: EmptyState component

**Files:**
- Create: `frontend/src/components/EmptyState.tsx`

- [ ] **Step 1: Write EmptyState**

Create `frontend/src/components/EmptyState.tsx`:

```typescript
import { Button } from './ui/button'

const DOCS_URL = 'https://docs.getsynctropy.com/first-scan'

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
      <h2 className="text-xl font-semibold text-slate-200">
        Your Drive hasn't been scanned yet.
      </h2>
      <p className="text-sm text-slate-400 max-w-sm">
        Open Claude, connect Synctropy, and run your first scan to see your entropy score.
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
git add frontend/src/components/EmptyState.tsx
git commit -m "feat(frontend): add EmptyState component"
```

---

### Task 9: TrendChart and FolderSparklines

**Files:**
- Create: `frontend/src/components/TrendChart.tsx`
- Create: `frontend/src/components/FolderSparklines.tsx`

- [ ] **Step 1: Write TrendChart**

Create `frontend/src/components/TrendChart.tsx`:

```typescript
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { format } from 'date-fns'
import type { ScanSummary } from '../types'

type Props = {
  scans: ScanSummary[]     // newest-first from useScans
  selectedId: string | null
  onSelect: (id: string) => void
}

type ChartPoint = { id: string; date: string; score: number }

export function TrendChart({ scans, selectedId, onSelect }: Props) {
  const data: ChartPoint[] = [...scans].reverse().map(s => ({
    id: s.id,
    date: format(new Date(s.scanned_at), 'MMM d'),
    score: Math.round(s.overall_score * 100) / 100,
  }))

  return (
    <div className="bg-[#13131f] border border-[#2a2a3e] rounded-lg p-4">
      <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Overall Entropy Score</p>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart
          data={data}
          onClick={e => {
            const point = e?.activePayload?.[0]?.payload as ChartPoint | undefined
            if (point) onSelect(point.id)
          }}
          style={{ cursor: 'pointer' }}
        >
          <defs>
            <linearGradient id="entropy-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tick={{ fill: '#555', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{ background: '#1e1e2e', border: '1px solid #3a3a5c', borderRadius: 6 }}
            labelStyle={{ color: '#888', fontSize: 11 }}
            itemStyle={{ color: '#a78bfa', fontSize: 12 }}
          />
          {selectedId && (
            <ReferenceLine
              x={data.find(d => d.id === selectedId)?.date}
              stroke="#a78bfa"
              strokeDasharray="4 2"
            />
          )}
          <Area
            type="monotone"
            dataKey="score"
            stroke="#a78bfa"
            strokeWidth={2}
            fill="url(#entropy-gradient)"
            dot={{ fill: '#a78bfa', r: 3 }}
            activeDot={{ fill: '#fff', stroke: '#a78bfa', r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-600 mt-2">Click any point to see folder breakdown for that scan</p>
    </div>
  )
}
```

- [ ] **Step 2: Write FolderSparklines**

Create `frontend/src/components/FolderSparklines.tsx`:

```typescript
import type { FolderScore } from '../types'
import { scoreColorClass, scoreBorderClass } from '../lib/score'

type Props = {
  folderScores: FolderScore[]
}

export function FolderSparklines({ folderScores }: Props) {
  return (
    <div>
      <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Folders</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {folderScores.map(folder => (
          <div
            key={folder.path}
            className={`bg-[#13131f] border rounded-lg p-3 ${scoreBorderClass(folder.score)}`}
          >
            <p
              className="text-xs text-slate-300 truncate mb-1 font-mono"
              title={folder.path}
            >
              {folder.path.split('/').slice(-2).join('/')}
            </p>
            <p className={`text-2xl font-semibold tabular-nums ${scoreColorClass(folder.score)}`}>
              {folder.score.toFixed(2)}
            </p>
            <p className="text-xs text-slate-600 mt-0.5">{folder.file_count} files</p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/TrendChart.tsx frontend/src/components/FolderSparklines.tsx
git commit -m "feat(frontend): add TrendChart and FolderSparklines"
```

---

### Task 10: ScanDetail drill-down

**Files:**
- Create: `frontend/src/components/ScanDetail.tsx`

- [ ] **Step 1: Write ScanDetail**

Create `frontend/src/components/ScanDetail.tsx`:

```typescript
import { format } from 'date-fns'
import type { EntropyScan } from '../types'
import { scoreColorClass } from '../lib/score'

type Props = {
  scan: EntropyScan
  previousScan: EntropyScan | null
  onClose: () => void
}

function scoreDelta(current: number, previous: number | undefined): string {
  if (previous === undefined) return '—'
  const diff = current - previous
  return (diff > 0 ? '+' : '') + diff.toFixed(2)
}

function deltaColorClass(current: number, previous: number | undefined): string {
  if (previous === undefined) return 'text-slate-500'
  return current > previous ? 'text-red-400' : 'text-green-400'
}

export function ScanDetail({ scan, previousScan, onClose }: Props) {
  const prevByPath = new Map(
    (previousScan?.folder_scores ?? []).map(f => [f.path, f.score])
  )

  return (
    <div className="bg-[#13131f] border border-[#2a2a3e] rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-slate-200">
            Scan — {format(new Date(scan.scanned_at), 'MMM d, yyyy')}
          </p>
          {previousScan && (
            <p className="text-xs text-slate-500">
              vs {format(new Date(previousScan.scanned_at), 'MMM d')}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
        >
          Close ×
        </button>
      </div>

      <div className="space-y-1">
        {scan.folder_scores.map(folder => (
          <div key={folder.path} className="flex items-center justify-between py-1 border-b border-[#1a1a2e] last:border-0">
            <p
              className="text-xs font-mono text-slate-400 truncate flex-1 mr-4"
              title={folder.path}
            >
              {folder.path}
            </p>
            <div className="flex items-center gap-3 shrink-0">
              <span className={`text-sm font-medium tabular-nums ${scoreColorClass(folder.score)}`}>
                {folder.score.toFixed(2)}
              </span>
              <span className={`text-xs tabular-nums w-12 text-right ${deltaColorClass(folder.score, prevByPath.get(folder.path))}`}>
                {scoreDelta(folder.score, prevByPath.get(folder.path))}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/ScanDetail.tsx
git commit -m "feat(frontend): add ScanDetail drill-down component"
```

---

### Task 11: History page (wire all components)

**Files:**
- Modify: `frontend/src/routes/history.tsx` (replace stub)

- [ ] **Step 1: Write History page**

Replace `frontend/src/routes/history.tsx` with:

```typescript
import { useState } from 'react'
import { useScans, useScan } from '../lib/queries'
import { EmptyState } from '../components/EmptyState'
import { TrendChart } from '../components/TrendChart'
import { FolderSparklines } from '../components/FolderSparklines'
import { ScanDetail } from '../components/ScanDetail'
import type { ScanSummary } from '../types'

function DeltaHeadline({ scans }: { scans: ScanSummary[] }) {
  if (scans.length < 2) return null
  const diff = scans[0].overall_score - scans[1].overall_score
  const improved = diff < 0
  const latestDate = new Date(scans[0].scanned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const prevDate = new Date(scans[1].scanned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return (
    <div className="mb-6">
      <p className={`text-3xl font-bold ${improved ? 'text-green-400' : 'text-red-400'}`}>
        {improved ? '↓' : '↑'} {Math.abs(diff).toFixed(0)} pts{' '}
        <span className="text-sm font-normal text-slate-400">since last scan</span>
      </p>
      <p className="text-xs text-slate-500 mt-1">
        Overall entropy · {latestDate} vs {prevDate}
      </p>
    </div>
  )
}

export default function HistoryPage() {
  const { data: scans, isLoading, isError, refetch } = useScans()
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null)

  const latestScanId = scans?.[0]?.id ?? null
  const selectedIndex = scans?.findIndex(s => s.id === selectedScanId) ?? -1
  const previousScanId = selectedIndex >= 0 ? (scans?.[selectedIndex + 1]?.id ?? null) : null

  // Always load latest scan for folder sparklines
  const { data: latestScan } = useScan(latestScanId)
  // Load selected + previous scan only when a point is clicked
  const { data: selectedScan } = useScan(selectedScanId)
  const { data: previousScan } = useScan(previousScanId)

  if (isLoading) {
    return <p className="text-slate-400 text-sm">Loading…</p>
  }

  if (isError) {
    return (
      <p className="text-slate-400 text-sm">
        Couldn't load history.{' '}
        <button onClick={() => refetch()} className="underline hover:text-slate-200">
          Retry
        </button>
      </p>
    )
  }

  if (!scans || scans.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="space-y-6">
      <DeltaHeadline scans={scans} />
      <TrendChart
        scans={scans}
        selectedId={selectedScanId}
        onSelect={id => setSelectedScanId(prev => (prev === id ? null : id))}
      />
      {selectedScan && (
        <ScanDetail
          scan={selectedScan}
          previousScan={previousScan ?? null}
          onClose={() => setSelectedScanId(null)}
        />
      )}
      {latestScan && latestScan.folder_scores.length > 0 && (
        <FolderSparklines folderScores={latestScan.folder_scores} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify in dev server**

```bash
cd frontend && npm run dev
```

Navigate to `http://localhost:5173/history` (after signing in). Expected: EmptyState if no scans, or full history view if local Supabase has data.

- [ ] **Step 3: Commit**

```bash
cd .. && git add frontend/src/routes/history.tsx
git commit -m "feat(frontend): implement history tab with trend, sparklines, and drill-down"
```

---

### Task 12: PreferencesForm with Zod validation (TDD)

**Files:**
- Create: `frontend/src/components/PreferencesForm.tsx`
- Test: `frontend/src/test/components/PreferencesForm.test.tsx`

- [ ] **Step 1: Write the failing validation test**

Create `frontend/src/test/components/PreferencesForm.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest'
import { preferencesSchema } from '../../components/PreferencesForm'

const valid = {
  root_path: '/Users/test',
  ignore_paths: ['node_modules', '.git'],
  archive_after_days: 180,
  taxonomy_domains: ['projects', 'finance'],
}

describe('preferencesSchema', () => {
  it('accepts valid preferences', () => {
    expect(preferencesSchema.safeParse(valid).success).toBe(true)
  })

  it('accepts null root_path', () => {
    expect(preferencesSchema.safeParse({ ...valid, root_path: null }).success).toBe(true)
  })

  it('rejects archive_after_days below 30', () => {
    expect(preferencesSchema.safeParse({ ...valid, archive_after_days: 29 }).success).toBe(false)
  })

  it('rejects archive_after_days above 730', () => {
    expect(preferencesSchema.safeParse({ ...valid, archive_after_days: 731 }).success).toBe(false)
  })

  it('rejects empty taxonomy_domains', () => {
    expect(preferencesSchema.safeParse({ ...valid, taxonomy_domains: [] }).success).toBe(false)
  })

  it('rejects blank domain name', () => {
    expect(preferencesSchema.safeParse({ ...valid, taxonomy_domains: ['projects', ''] }).success).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run src/test/components/PreferencesForm.test.tsx
```

Expected: FAIL — "Cannot find module '../../components/PreferencesForm'"

- [ ] **Step 3: Write PreferencesForm**

Create `frontend/src/components/PreferencesForm.tsx`:

```typescript
import { useState } from 'react'
import { z } from 'zod'
import { usePreferences } from '../lib/queries'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { useToast } from '../hooks/use-toast'

export const preferencesSchema = z.object({
  root_path: z.string().nullable().optional(),
  ignore_paths: z.array(z.string()).default([]),
  archive_after_days: z.number().int().min(30).max(730),
  taxonomy_domains: z.array(z.string().min(1)).min(1),
})

export type PreferencesFormValues = z.infer<typeof preferencesSchema>

const DEFAULTS: PreferencesFormValues = {
  root_path: null,
  ignore_paths: [],
  archive_after_days: 365,
  taxonomy_domains: ['projects', 'finance', 'admin', 'media', 'reference'],
}

export function PreferencesForm() {
  const { data: saved, isSaving, save } = usePreferences()
  const { toast } = useToast()

  const [values, setValues] = useState<PreferencesFormValues>(() =>
    saved
      ? {
          root_path: saved.root_path,
          ignore_paths: saved.ignore_paths,
          archive_after_days: saved.archive_after_days,
          taxonomy_domains: saved.taxonomy_domains,
        }
      : DEFAULTS
  )
  const [pathInput, setPathInput] = useState('')
  const [domainInput, setDomainInput] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  function handleSave() {
    const result = preferencesSchema.safeParse(values)
    if (!result.success) {
      const errs: Record<string, string> = {}
      result.error.issues.forEach(issue => {
        errs[String(issue.path[0])] = issue.message
      })
      setFieldErrors(errs)
      return
    }
    setFieldErrors({})
    save({
      root_path: result.data.root_path ?? null,
      ignore_paths: result.data.ignore_paths,
      archive_after_days: result.data.archive_after_days,
      taxonomy_domains: result.data.taxonomy_domains,
    }, {
      onSuccess: () => toast({ title: 'Preferences saved' }),
      onError: () => toast({ title: "Couldn't save — try again", variant: 'destructive' }),
    })
  }

  function addIgnorePath() {
    const trimmed = pathInput.trim()
    if (!trimmed || values.ignore_paths.includes(trimmed)) return
    setValues(v => ({ ...v, ignore_paths: [...v.ignore_paths, trimmed] }))
    setPathInput('')
  }

  function removeIgnorePath(path: string) {
    setValues(v => ({ ...v, ignore_paths: v.ignore_paths.filter(p => p !== path) }))
  }

  function addDomain() {
    const trimmed = domainInput.trim()
    if (!trimmed || values.taxonomy_domains.includes(trimmed)) return
    setValues(v => ({ ...v, taxonomy_domains: [...v.taxonomy_domains, trimmed] }))
    setDomainInput('')
  }

  function removeDomain(domain: string) {
    setValues(v => ({ ...v, taxonomy_domains: v.taxonomy_domains.filter(d => d !== domain) }))
  }

  return (
    <div className="space-y-8 max-w-lg">

      {/* Scan root */}
      <div className="space-y-1">
        <Label className="text-slate-300">Scan root</Label>
        <p className="text-xs text-slate-500">The folder Synctropy analyses. Empty means your entire Drive.</p>
        <Input
          value={values.root_path ?? ''}
          onChange={e => setValues(v => ({ ...v, root_path: e.target.value || null }))}
          placeholder="/path/to/folder"
          className="bg-[#13131f] border-[#2a2a3e] text-slate-200 font-mono text-sm"
        />
      </div>

      {/* Ignore paths */}
      <div className="space-y-2">
        <Label className="text-slate-300">Ignore paths</Label>
        <p className="text-xs text-slate-500">Folders excluded from every scan.</p>
        <div className="flex flex-wrap gap-2">
          {values.ignore_paths.map(path => (
            <span
              key={path}
              className="flex items-center gap-1.5 bg-[#1e1e35] border border-[#3a3a5c] rounded px-2 py-0.5 text-xs text-violet-400 font-mono"
            >
              {path}
              <button onClick={() => removeIgnorePath(path)} className="text-slate-500 hover:text-slate-300">×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={pathInput}
            onChange={e => setPathInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addIgnorePath() } }}
            placeholder="node_modules"
            className="bg-[#13131f] border-[#2a2a3e] text-slate-200 font-mono text-sm"
          />
          <Button variant="outline" onClick={addIgnorePath} className="border-[#2a2a3e] text-slate-300 shrink-0">
            Add
          </Button>
        </div>
      </div>

      {/* Archive threshold */}
      <div className="space-y-2">
        <Label className="text-slate-300">
          Archive after{' '}
          <span className="text-violet-400 font-mono">{values.archive_after_days}</span>{' '}
          days
        </Label>
        <p className="text-xs text-slate-500">Files untouched longer than this are flagged as archive candidates.</p>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={30}
            max={730}
            value={values.archive_after_days}
            onChange={e => setValues(v => ({ ...v, archive_after_days: Number(e.target.value) }))}
            className="flex-1 accent-violet-400"
          />
          <span className="text-sm font-mono text-slate-200 w-12 text-right">{values.archive_after_days}</span>
        </div>
        <div className="flex justify-between text-xs text-slate-600">
          <span>30 days</span>
          <span>2 years</span>
        </div>
        {fieldErrors.archive_after_days && (
          <p className="text-xs text-red-400">{fieldErrors.archive_after_days}</p>
        )}
      </div>

      {/* Taxonomy domains */}
      <div className="space-y-2">
        <Label className="text-slate-300">Taxonomy domains</Label>
        <p className="text-xs text-slate-500">Top-level categories Synctropy organises around.</p>
        <div className="grid grid-cols-2 gap-2">
          {values.taxonomy_domains.map(domain => (
            <div
              key={domain}
              className="flex items-center justify-between bg-[#13131f] border border-[#2a2a3e] rounded px-3 py-1.5 font-mono text-sm text-slate-200"
            >
              {domain}
              <button onClick={() => removeDomain(domain)} className="text-slate-600 hover:text-slate-400 ml-2">×</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={domainInput}
            onChange={e => setDomainInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDomain() } }}
            placeholder="matters"
            className="bg-[#13131f] border-[#2a2a3e] text-slate-200 font-mono text-sm"
          />
          <Button variant="outline" onClick={addDomain} className="border-[#2a2a3e] text-slate-300 shrink-0">
            Add
          </Button>
        </div>
        {fieldErrors.taxonomy_domains && (
          <p className="text-xs text-red-400">{fieldErrors.taxonomy_domains}</p>
        )}
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-violet-500 hover:bg-violet-600"
        >
          {isSaving ? 'Saving…' : 'Save preferences'}
        </Button>
        <span className="text-xs text-slate-500">Changes apply to next scan</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd frontend && npx vitest run src/test/components/PreferencesForm.test.tsx
```

Expected: PASS — 6 tests passing

- [ ] **Step 5: Commit**

```bash
cd .. && git add frontend/src/components/PreferencesForm.tsx frontend/src/test/components/PreferencesForm.test.tsx
git commit -m "feat(frontend): add PreferencesForm with Zod validation and tests"
```

---

### Task 13: Settings page and final wiring

**Files:**
- Modify: `frontend/src/routes/settings.tsx` (replace stub)

- [ ] **Step 1: Write Settings page**

Replace `frontend/src/routes/settings.tsx` with:

```typescript
import { PreferencesForm } from '../components/PreferencesForm'
import { Toaster } from '../components/ui/toaster'

export default function SettingsPage() {
  return (
    <>
      <PreferencesForm />
      <Toaster />
    </>
  )
}
```

- [ ] **Step 2: Run all tests**

```bash
cd frontend && npx vitest run
```

Expected: All tests pass — score utility (6) + preferences schema (6) = 12 total.

- [ ] **Step 3: Verify full app in dev server**

```bash
npm run dev
```

Walk through:
1. `http://localhost:5173` → redirects to `/login`
2. Sign in with magic link
3. `/history` → EmptyState (no scans) or trend + sparklines
4. `/settings` → all 4 preference fields render
5. Add an ignore path → tag chip appears
6. Move archive slider → value updates live
7. Save → success toast appears
8. Sign out → redirects to `/login`

- [ ] **Step 4: Commit**

```bash
cd .. && git add frontend/src/routes/settings.tsx
git commit -m "feat(frontend): implement settings tab"
```

---

### Task 14: .gitignore cleanup

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add entries**

Append to `.gitignore`:

```
# Visual companion files
.superpowers/

# Frontend
frontend/.env.local
frontend/dist/
frontend/node_modules/
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: update gitignore for frontend and superpowers"
```
