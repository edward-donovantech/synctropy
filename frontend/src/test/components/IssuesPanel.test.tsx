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
    // vague_name has 2 items (file-1, file-3)
    const vagueButton = screen.getByText('Generic file names').closest('button')
    expect(vagueButton).toHaveTextContent('2')
    // duplicate has 1 item (file-2)
    const duplicateButton = screen.getByText('Likely duplicates').closest('button')
    expect(duplicateButton).toHaveTextContent('1')
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
