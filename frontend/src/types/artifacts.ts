import { z } from 'zod'

export type IssueType = 'vague_name' | 'duplicate' | 'stale' | 'root_clutter' | 'unreadable'

export const inventoryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  type: z.enum(['file', 'folder']),
  size_bytes: z.number(),
  modified_at: z.string(),
  category: z.string(),
  lifecycle: z.enum(['active', 'archive', 'triage']),
  summary: z.string().nullable(),
  confidence: z.number(),
  issues: z.array(z.enum(['vague_name', 'duplicate', 'stale', 'root_clutter', 'unreadable'])),
})

export type InventoryItem = z.infer<typeof inventoryItemSchema>

export const categoryStat = z.object({
  name: z.string(),
  count: z.number(),
  bytes: z.number(),
})

export type CategoryStat = z.infer<typeof categoryStat>

export const inventoryArtifactSchema = z.object({
  run_id: z.string(),
  scanned_at: z.string(),
  platform: z.string(),
  root: z.string(),
  total_files: z.number(),
  total_folders: z.number(),
  storage_bytes: z.number(),
  categories: z.array(categoryStat),
  items: z.array(inventoryItemSchema),
})

export type InventoryArtifact = z.infer<typeof inventoryArtifactSchema>

export const connectedPlatformSchema = z.object({
  name: z.string(),
  icon: z.string().optional(),
  email: z.string().optional(),
  total_files: z.number(),
  total_folders: z.number(),
  storage_bytes: z.number(),
  last_scanned: z.string(),
})

export type ConnectedPlatform = z.infer<typeof connectedPlatformSchema>

export const connectorsArtifactSchema = z.object({
  platforms: z.array(connectedPlatformSchema),
})

export type ConnectorsArtifact = z.infer<typeof connectorsArtifactSchema>

export type RunSummary = {
  run_id: string
  scanned_at: string
  total_files: number
  issue_count: number
  duration_ms: number | null
}
