import { format } from 'date-fns'
import type { RunSummary } from '../types/artifacts'

function formatDuration(ms: number | null): string {
  if (ms === null) return '—'
  return `${Math.round(ms / 1000)}s`
}

type Props = {
  runs: RunSummary[]
  selectedRunId: string | null
  onSelect: (runId: string) => void
}

export function RunHistory({ runs, selectedRunId, onSelect }: Props) {
  return (
    <div>
      <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Run history</p>
      <div className="space-y-2">
        {runs.map(run => {
          const selected = run.run_id === selectedRunId
          return (
            <button
              key={run.run_id}
              onClick={() => onSelect(run.run_id)}
              className={`w-full flex items-center justify-between bg-[#13131f] border rounded-lg px-4 py-3 text-left transition-colors hover:bg-[#1a1a2e] ${
                selected ? 'border-[#a78bfa]' : 'border-[#2a2a3e]'
              }`}
            >
              <span className="text-sm text-slate-200">
                {format(new Date(run.scanned_at), 'MMM d, yyyy')}
              </span>
              <span className="flex gap-4 text-xs text-slate-400 tabular-nums">
                <span>{run.total_files} files</span>
                <span>{run.issue_count} issues</span>
                <span>{formatDuration(run.duration_ms)}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
