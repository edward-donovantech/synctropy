import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'
import { inventoryArtifactSchema, connectorsArtifactSchema } from '../types/artifacts'
import type { InventoryArtifact, ConnectorsArtifact, RunSummary } from '../types/artifacts'

async function getUser() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user
}

export function useLatestRun() {
  return useQuery({
    queryKey: ['latestRun'],
    queryFn: async () => {
      const user = await getUser()
      const { data, error } = await supabase
        .from('pipeline_artifacts')
        .select('run_id')
        .eq('user_id', user.id)
        .eq('skill_name', '04-build-inventory')
        .order('created_at', { ascending: false })
        .limit(1)
      if (error) throw error
      return data?.[0]?.run_id ?? null
    },
  })
}

export function useRunInventory(runId: string | null) {
  return useQuery({
    queryKey: ['runInventory', runId],
    queryFn: async (): Promise<InventoryArtifact | null> => {
      if (!runId) return null
      const user = await getUser()
      const { data, error } = await supabase
        .from('pipeline_artifacts')
        .select('artifact')
        .eq('user_id', user.id)
        .eq('run_id', runId)
        .eq('skill_name', '04-build-inventory')
        .single()
      if (error) throw error
      return inventoryArtifactSchema.parse(data.artifact)
    },
    enabled: !!runId,
  })
}

export function useRunHistory() {
  return useQuery({
    queryKey: ['runHistory'],
    queryFn: async (): Promise<RunSummary[]> => {
      const user = await getUser()
      const { data, error } = await supabase
        .from('pipeline_artifacts')
        .select('run_id, artifact, created_at')
        .eq('user_id', user.id)
        .eq('skill_name', '04-build-inventory')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []).map(row => {
        const artifact = inventoryArtifactSchema.parse(row.artifact)
        const issueCount = artifact.items.reduce((sum, item) => sum + item.issues.length, 0)
        return {
          run_id: artifact.run_id,
          scanned_at: artifact.scanned_at,
          total_files: artifact.total_files,
          issue_count: issueCount,
          duration_ms: null,
        }
      })
    },
  })
}

export function usePlatformInfo(runId: string | null) {
  return useQuery({
    queryKey: ['platformInfo', runId],
    queryFn: async (): Promise<ConnectorsArtifact | null> => {
      if (!runId) return null
      const user = await getUser()
      const { data, error } = await supabase
        .from('pipeline_artifacts')
        .select('artifact')
        .eq('user_id', user.id)
        .eq('run_id', runId)
        .eq('skill_name', '00-scan-connectors')
        .single()
      if (error) throw error
      return connectorsArtifactSchema.parse(data.artifact)
    },
    enabled: !!runId,
  })
}
