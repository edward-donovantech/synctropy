import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { format } from 'date-fns'
import type { ScanSummary } from '../types'

type Props = {
  scans: ScanSummary[]     // newest-first from useScans
  selectedId: string | null
  onSelect: (id: string) => void
}

type ChartPoint = { id: string; date: string; score: number }

export function TrendChart({ scans, selectedId, onSelect }: Props) {
  const data: ChartPoint[] = [...scans].reverse().map(s => ({
    id: s.id,
    date: format(new Date(s.scanned_at), 'MMM d'),
    score: Math.round(s.overall_score * 100) / 100,
  }))

  return (
    <div className="bg-[#13131f] border border-[#2a2a3e] rounded-lg p-4">
      <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Overall Entropy Score</p>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart
          data={data}
          onClick={e => {
            const point = e?.activePayload?.[0]?.payload as ChartPoint | undefined
            if (point) onSelect(point.id)
          }}
          style={{ cursor: 'pointer' }}
        >
          <defs>
            <linearGradient id="entropy-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tick={{ fill: '#555', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{ background: '#1e1e2e', border: '1px solid #3a3a5c', borderRadius: 6 }}
            labelStyle={{ color: '#888', fontSize: 11 }}
            itemStyle={{ color: '#a78bfa', fontSize: 12 }}
          />
          {selectedId && (
            <ReferenceLine
              x={data.find(d => d.id === selectedId)?.date}
              stroke="#a78bfa"
              strokeDasharray="4 2"
            />
          )}
          <Area
            type="monotone"
            dataKey="score"
            stroke="#a78bfa"
            strokeWidth={2}
            fill="url(#entropy-gradient)"
            dot={{ fill: '#a78bfa', r: 3 }}
            activeDot={{ fill: '#fff', stroke: '#a78bfa', r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-600 mt-2">Click any point to see folder breakdown for that scan</p>
    </div>
  )
}
