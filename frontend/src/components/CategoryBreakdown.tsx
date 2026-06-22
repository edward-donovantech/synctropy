import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from 'recharts'
import type { CategoryStat } from '../types/artifacts'

type Props = {
  categories: CategoryStat[]
  activeCategory: string | null
  onSelect: (name: string | null) => void
}

export function CategoryBreakdown({ categories, activeCategory, onSelect }: Props) {
  const total = categories.reduce((sum, c) => sum + c.count, 0)

  return (
    <div className="bg-[#13131f] border border-[#2a2a3e] rounded-lg p-4">
      <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Files by category</p>

      <div className="space-y-1 mb-4">
        {categories.map(c => {
          const pct = total > 0 ? Math.round((c.count / total) * 100) : 0
          const active = activeCategory === c.name
          return (
            <button
              key={c.name}
              onClick={() => onSelect(active ? null : c.name)}
              className={`w-full flex items-center justify-between text-xs py-1 px-2 rounded transition-colors ${
                active ? 'bg-[#2a2a3e] text-slate-100' : 'text-slate-400 hover:bg-[#1a1a2e]'
              }`}
            >
              <span>{c.name}</span>
              <span className="flex gap-3 tabular-nums">
                <span>{c.count}</span>
                <span className="text-slate-600">{pct}%</span>
              </span>
            </button>
          )
        })}
      </div>

      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={categories} layout="vertical" margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" hide />
          <Tooltip
            contentStyle={{ background: '#1e1e2e', border: '1px solid #3a3a5c', borderRadius: 6 }}
            itemStyle={{ color: '#a78bfa', fontSize: 12 }}
            formatter={(v: number) => [v, 'files']}
          />
          <Bar dataKey="count" radius={[0, 3, 3, 0]}>
            {categories.map(c => (
              <Cell
                key={c.name}
                fill={activeCategory === c.name ? '#a78bfa' : '#3a3a5c'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
