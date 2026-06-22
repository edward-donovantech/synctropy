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
