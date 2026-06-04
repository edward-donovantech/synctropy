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
