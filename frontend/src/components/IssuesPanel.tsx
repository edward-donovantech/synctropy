import { useState } from 'react'
import type { InventoryItem, IssueType } from '../types/artifacts'

const ISSUE_LABELS: Record<IssueType, string> = {
  vague_name: 'Generic file names',
  duplicate: 'Likely duplicates',
  stale: 'Untouched for 2+ years',
  root_clutter: 'Files at Drive root',
  unreadable: 'Couldn\'t be categorised',
}

const ISSUE_TYPES: IssueType[] = ['vague_name', 'duplicate', 'stale', 'root_clutter', 'unreadable']

type Props = {
  items: InventoryItem[]
  activeCategory: string | null
}

export function IssuesPanel({ items, activeCategory }: Props) {
  const [expanded, setExpanded] = useState<IssueType | null>(null)
  const filtered = activeCategory ? items.filter(i => i.category === activeCategory) : items

  return (
    <div className="bg-[#13131f] border border-[#2a2a3e] rounded-lg p-4">
      <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Issues</p>
      <div className="space-y-1">
        {ISSUE_TYPES.map(issueType => {
          const affected = filtered.filter(i => i.issues.includes(issueType))
          const isExpanded = expanded === issueType
          return (
            <div key={issueType}>
              <button
                onClick={() => setExpanded(isExpanded ? null : issueType)}
                className="w-full flex items-center justify-between text-xs py-2 px-2 rounded hover:bg-[#1a1a2e] transition-colors text-slate-400"
              >
                <span>{ISSUE_LABELS[issueType]}</span>
                <span className="bg-[#2a2a3e] text-slate-300 rounded px-1.5 py-0.5 tabular-nums">
                  {affected.length}
                </span>
              </button>
              {isExpanded && affected.length > 0 && (
                <div className="mt-1 ml-2 space-y-0.5 max-h-40 overflow-y-auto">
                  {affected.slice(0, 20).map(item => (
                    <div key={item.id} className="py-0.5">
                      <p className="text-xs text-slate-300">{item.name}</p>
                      <p className="text-xs font-mono text-slate-600 truncate">{item.path}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
