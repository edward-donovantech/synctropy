import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { preferencesSchema, PreferencesForm } from '../../components/PreferencesForm'
import { usePreferences } from '../../lib/queries'

vi.mock('../../lib/queries', () => ({
  usePreferences: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: vi.fn(),
  Toaster: () => null,
}))

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
