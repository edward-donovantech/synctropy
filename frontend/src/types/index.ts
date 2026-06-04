export type UserPreferences = {
  id: string
  root_path: string | null
  ignore_paths: string[]
  archive_after_days: number
  taxonomy_domains: string[]
  updated_at: string
}

export type FolderScore = {
  path: string
  score: number
  file_count: number
}

export type EntropyScan = {
  id: string
  user_id: string
  scanned_at: string
  overall_score: number
  folder_scores: FolderScore[]
}

// Lightweight shape returned by useScans() — no folder_scores
export type ScanSummary = Pick<EntropyScan, 'id' | 'scanned_at' | 'overall_score'>
