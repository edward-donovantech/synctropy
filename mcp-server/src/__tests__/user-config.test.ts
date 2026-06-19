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
