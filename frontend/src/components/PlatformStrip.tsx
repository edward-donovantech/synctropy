import { format } from 'date-fns'
import type { ConnectedPlatform } from '../types/artifacts'

function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  if (mb < 1024) return `${Math.round(mb)} MB`
  return `${(mb / 1024).toFixed(1)} GB`
}

type Props = {
  platforms: ConnectedPlatform[]
}

export function PlatformStrip({ platforms }: Props) {
  return (
    <div className="flex flex-wrap gap-3">
      {platforms.map(p => (
        <div
          key={p.name}
          className="bg-[#13131f] border border-[#2a2a3e] rounded-lg p-4 flex-1 min-w-[200px]"
        >
          <p className="text-sm font-semibold text-slate-200">{p.name}</p>
          {p.email && <p className="text-xs text-slate-500 mt-0.5">{p.email}</p>}
          <div className="mt-3 space-y-1">
            <p className="text-xs text-slate-400">{p.total_files} files</p>
            <p className="text-xs text-slate-400">{p.total_folders} folders</p>
            <p className="text-xs text-slate-400">{formatBytes(p.storage_bytes)}</p>
          </div>
          <p className="text-xs text-slate-600 mt-3">
            {format(new Date(p.last_scanned), 'MMM d, yyyy')}
          </p>
        </div>
      ))}
    </div>
  )
}
