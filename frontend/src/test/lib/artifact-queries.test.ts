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
    expect(result.current.data).toBeUndefined()
  })
})

describe('useRunHistory', () => {
  it('returns RunSummary[] derived from 04-build-inventory artifacts', async () => {
    const mockItem1 = { id: 'i1', name: 'f1', path: '/f1', type: 'file' as const, size_bytes: 100, modified_at: '2026-06-10T10:00:00Z', category: 'Projects', lifecycle: 'active' as const, summary: null, confidence: 0.9, issues: ['stale', 'duplicate'] }
    const mockItem2 = { id: 'i2', name: 'f2', path: '/f2', type: 'file' as const, size_bytes: 100, modified_at: '2026-06-10T10:00:00Z', category: 'Projects', lifecycle: 'active' as const, summary: null, confidence: 0.9, issues: ['vague_name'] }

    const select = vi.fn().mockReturnThis()
    const eq = vi.fn().mockReturnThis()
    const order = vi.fn().mockResolvedValue({
      data: [{
        run_id: 'run-1',
        artifact: { ...mockInventoryArtifact, items: [mockItem1, mockItem2] },
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
    expect(result.current.data).toBeUndefined()
  })
})
