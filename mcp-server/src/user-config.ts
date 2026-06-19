import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

let _client: SupabaseClient | null = null

function getClient(): SupabaseClient | null {
  if (_client) return _client
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  _client = createClient(url, key)
  return _client
}

export const GetUserConfigInputSchema = z.object({
  userId: z.string().uuid(),
})
export type GetUserConfigInput = z.infer<typeof GetUserConfigInputSchema>

export const StorageModeSchema = z.enum(['drive', 'supabase', 'both'])
export type StorageMode = z.infer<typeof StorageModeSchema>

export interface UserConfig {
  is_premium: boolean
  storage_mode: StorageMode
}

const DEFAULT_CONFIG: UserConfig = { is_premium: false, storage_mode: 'drive' }

export async function getUserConfig(userId: string): Promise<UserConfig> {
  const client = getClient()
  if (!client) return DEFAULT_CONFIG
  const { data, error } = await client
    .from('user_preferences')
    .select('is_premium, storage_mode')
    .eq('id', userId)
    .maybeSingle()
  if (error || !data) return DEFAULT_CONFIG
  return {
    is_premium: data.is_premium ?? false,
    storage_mode: StorageModeSchema.safeParse(data.storage_mode).success
      ? (data.storage_mode as StorageMode)
      : 'drive',
  }
}

export const SavePipelineArtifactInputSchema = z.object({
  userId:       z.string().uuid(),
  run_id:       z.string().min(1),
  skill_name:   z.string().min(1),
  pipeline_pos: z.number().int().min(0).max(11),
  artifact:     z.record(z.string(), z.unknown()),
})
export type SaveArtifactInput = z.infer<typeof SavePipelineArtifactInputSchema>

export async function savePipelineArtifact(input: SaveArtifactInput): Promise<{ id: string }> {
  const client = getClient()
  if (!client) throw new Error('[synctropy] Supabase client not configured')
  const { data, error } = await client
    .from('pipeline_artifacts')
    .insert({
      user_id:      input.userId,
      run_id:       input.run_id,
      skill_name:   input.skill_name,
      pipeline_pos: input.pipeline_pos,
      artifact:     input.artifact,
    })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  return { id: data.id }
}
