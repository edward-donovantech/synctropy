export type StorageMode = 'drive' | 'supabase' | 'both'

export type UserPreferences = {
  id: string
  root_path: string | null
  ignore_paths: string[]
  archive_after_days: number
  taxonomy_domains: string[]
  is_premium: boolean
  storage_mode: StorageMode
  updated_at: string
}

export type { IssueType, InventoryItem, CategoryStat, InventoryArtifact, ConnectedPlatform, ConnectorsArtifact, RunSummary } from './artifacts'
