import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { EntropyEntry } from "./types"

export interface ScanRecord {
  user_id: string
  scanned_at: string
  overall_score: number
  folder_scores: EntropyEntry[]
}

let _client: SupabaseClient | null = null

function getClient(): SupabaseClient | null {
  if (_client) return _client
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  _client = createClient(url, key)
  return _client
}

export async function persistScan(record: ScanRecord): Promise<void> {
  const client = getClient()
  if (!client) return
  try {
    const { error } = await client.from("entropy_scans").insert(record)
    if (error) console.error("[synctropy] failed to persist scan:", error.message)
  } catch (err) {
    console.error("[synctropy] unexpected error persisting scan:", err)
  }
}
