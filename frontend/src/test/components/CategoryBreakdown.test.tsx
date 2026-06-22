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
    // ResponsiveContainer may not render SVG in jsdom; check for the chart container
    const chartContainer = container.querySelector('.recharts-responsive-container') || container.querySelector('svg')
    expect(chartContainer).not.toBeNull()
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
