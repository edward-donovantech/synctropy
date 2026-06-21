import { useState } from 'react'
import { useScans, useScan } from '../lib/queries'
import { EmptyState } from '../components/EmptyState'
import { TrendChart } from '../components/TrendChart'
import { FolderSparklines } from '../components/FolderSparklines'
import { ScanDetail } from '../components/ScanDetail'
import type { ScanSummary } from '../types'

function DeltaHeadline({ scans }: { scans: ScanSummary[] }) {
  if (scans.length < 2) return null
  const diff = scans[0].overall_score - scans[1].overall_score
  const improved = diff < 0
  const latestDate = new Date(scans[0].scanned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const prevDate = new Date(scans[1].scanned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return (
    <div className="mb-6">
      <p className={`text-3xl font-bold ${improved ? 'text-green-400' : 'text-red-400'}`}>
        {improved ? '↓' : '↑'} {Math.round(Math.abs(diff) * 100)} pts{' '}
        <span className="text-sm font-normal text-slate-400">since last scan</span>
      </p>
      <p className="text-xs text-slate-500 mt-1">
        Overall entropy · {latestDate} vs {prevDate}
      </p>
    </div>
  )
}

export default function HistoryPage() {
  const { data: scans, isLoading, isError, refetch } = useScans()
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null)

  const latestScanId = scans?.[0]?.id ?? null
  const selectedIndex = scans?.findIndex(s => s.id === selectedScanId) ?? -1
  const previousScanId = selectedIndex >= 0 ? (scans?.[selectedIndex + 1]?.id ?? null) : null

  // Always load latest scan for folder sparklines
  const { data: latestScan } = useScan(latestScanId)
  // Load selected + previous scan only when a point is clicked
  const { data: selectedScan } = useScan(selectedScanId)
  const { data: previousScan } = useScan(previousScanId)

  if (isLoading) {
    return <p className="text-slate-400 text-sm">Loading…</p>
  }

  if (isError) {
    return (
      <p className="text-slate-400 text-sm">
        Couldn't load history.{' '}
        <button onClick={() => refetch()} className="underline hover:text-slate-200">
          Retry
        </button>
      </p>
    )
  }

  if (!scans || scans.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="space-y-6">
      <DeltaHeadline scans={scans} />
      <TrendChart
        scans={scans}
        selectedId={selectedScanId}
        onSelect={id => setSelectedScanId(prev => (prev === id ? null : id))}
      />
      {selectedScan && (
        <ScanDetail
          scan={selectedScan}
          previousScan={previousScan ?? null}
          onClose={() => setSelectedScanId(null)}
        />
      )}
      {latestScan && latestScan.folder_scores.length > 0 && (
        <FolderSparklines folderScores={latestScan.folder_scores} />
      )}
    </div>
  )
}
