import { Button } from './ui/button'

const DOCS_URL = 'https://docs.getsynctropy.com/first-scan'

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
      <h2 className="text-xl font-semibold text-slate-200">
        Your Drive hasn't been scanned yet.
      </h2>
      <p className="text-sm text-slate-400 max-w-sm">
        Open Claude, connect Synctropy, and run your first scan to see your entropy score.
      </p>
      <Button
        variant="outline"
        className="border-[#2a2a3e] text-slate-300 hover:bg-[#2a2a3e]"
        onClick={() => window.open(DOCS_URL, '_blank', 'noopener')}
      >
        How to run your first scan
      </Button>
    </div>
  )
}
