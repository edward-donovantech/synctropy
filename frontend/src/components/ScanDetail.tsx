import { format } from 'date-fns'
import type { EntropyScan } from '../types'
import { scoreColorClass } from '../lib/score'

type Props = {
  scan: EntropyScan
  previousScan: EntropyScan | null
  onClose: () => void
}

function scoreDelta(current: number, previous: number | undefined): string {
  if (previous === undefined) return '—'
  const diff = current - previous
  return (diff > 0 ? '+' : '') + diff.toFixed(2)
}

function deltaColorClass(current: number, previous: number | undefined): string {
  if (previous === undefined) return 'text-slate-500'
  return current > previous ? 'text-red-400' : 'text-green-400'
}

export function ScanDetail({ scan, previousScan, onClose }: Props) {
  const prevByPath = new Map(
    (previousScan?.folder_scores ?? []).map(f => [f.path, f.score])
  )

  return (
    <div className="bg-[#13131f] border border-[#2a2a3e] rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-slate-200">
            Scan — {format(new Date(scan.scanned_at), 'MMM d, yyyy')}
          </p>
          {previousScan && (
            <p className="text-xs text-slate-500">
              vs {format(new Date(previousScan.scanned_at), 'MMM d')}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
        >
          Close ×
        </button>
      </div>

      <div className="space-y-1">
        {scan.folder_scores.map(folder => (
          <div key={folder.path} className="flex items-center justify-between py-1 border-b border-[#1a1a2e] last:border-0">
            <p
              className="text-xs font-mono text-slate-400 truncate flex-1 mr-4"
              title={folder.path}
            >
              {folder.path}
            </p>
            <div className="flex items-center gap-3 shrink-0">
              <span className={`text-sm font-medium tabular-nums ${scoreColorClass(folder.score)}`}>
                {folder.score.toFixed(2)}
              </span>
              <span className={`text-xs tabular-nums w-12 text-right ${deltaColorClass(folder.score, prevByPath.get(folder.path))}`}>
                {scoreDelta(folder.score, prevByPath.get(folder.path))}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
