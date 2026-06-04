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
