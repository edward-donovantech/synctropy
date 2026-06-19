import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { AnalyzeStructureOutput } from "./types"

let _client: SupabaseClient | null = null

function getClient(): SupabaseClient | null {
  if (_client) return _client
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  _client = createClient(url, key)
  return _client
}

export async function persistScan(userId: string, result: AnalyzeStructureOutput): Promise<void> {
  const client = getClient()
  if (!client) return
  const record = {
    user_id: userId,
    scanned_at: new Date().toISOString(),
    overall_score: result.entropyMap[0]?.score ?? 0,
    folder_scores: result.entropyMap,
  }
  try {
    const { error } = await client.from("entropy_scans").insert(record)
    if (error) console.error("[synctropy] failed to persist scan:", error.message)
  } catch (err) {
    console.error("[synctropy] unexpected error persisting scan:", err)
  }
}
