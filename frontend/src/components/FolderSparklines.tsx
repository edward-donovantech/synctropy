import type { FolderScore } from '../types'
import { scoreColorClass, scoreBorderClass } from '../lib/score'

type Props = {
  folderScores: FolderScore[]
}

export function FolderSparklines({ folderScores }: Props) {
  return (
    <div>
      <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Folders</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {folderScores.map(folder => (
          <div
            key={folder.path}
            className={`bg-[#13131f] border rounded-lg p-3 ${scoreBorderClass(folder.score)}`}
          >
            <p
              className="text-xs text-slate-300 truncate mb-1 font-mono"
              title={folder.path}
            >
              {folder.path.split('/').slice(-2).join('/')}
            </p>
            <p className={`text-2xl font-semibold tabular-nums ${scoreColorClass(folder.score)}`}>
              {folder.score.toFixed(2)}
            </p>
            <p className="text-xs text-slate-600 mt-0.5">{folder.file_count} files</p>
          </div>
        ))}
      </div>
    </div>
  )
}
