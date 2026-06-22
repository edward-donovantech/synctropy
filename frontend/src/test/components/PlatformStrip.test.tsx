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
    expect(screen.getByText('477 MB')).toBeInTheDocument()
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
