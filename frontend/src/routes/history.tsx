import { useState } from 'react'
import { useLatestRun, useRunInventory, useRunHistory, usePlatformInfo } from '../lib/artifact-queries'
import { EmptyState } from '../components/EmptyState'
import { PlatformStrip } from '../components/PlatformStrip'
import { CategoryBreakdown } from '../components/CategoryBreakdown'
import { IssuesPanel } from '../components/IssuesPanel'
import { RunHistory } from '../components/RunHistory'

export default function HistoryPage() {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const { data: latestRunId, isLoading: loadingLatest, isError } = useLatestRun()
  const viewRunId = selectedRunId ?? latestRunId ?? null

  const { data: inventory, isLoading: loadingInventory } = useRunInventory(viewRunId)
  const { data: history, isLoading: loadingHistory } = useRunHistory()
  const { data: connectors } = usePlatformInfo(viewRunId)

  if (loadingLatest || loadingHistory) {
    return <p className="text-slate-400 text-sm">Loading…</p>
  }

  if (isError) {
    return <p className="text-slate-400 text-sm">Couldn't load history.</p>
  }

  if (!latestRunId) {
    return <EmptyState />
  }

  return (
    <div className="space-y-6">
      {connectors && <PlatformStrip platforms={connectors.platforms} />}

      {inventory && (
        <>
          <CategoryBreakdown
            categories={inventory.categories}
            activeCategory={activeCategory}
            onSelect={setActiveCategory}
          />
          <IssuesPanel
            items={inventory.items}
            activeCategory={activeCategory}
          />
        </>
      )}

      {loadingInventory && (
        <p className="text-slate-400 text-sm">Loading inventory…</p>
      )}

      {history && (
        <RunHistory
          runs={history}
          selectedRunId={selectedRunId}
          onSelect={id => {
            setSelectedRunId(prev => prev === id ? null : id)
            setActiveCategory(null)
          }}
        />
      )}
    </div>
  )
}
