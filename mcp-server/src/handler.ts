import { classifyFiles } from "./classifier"
import { scoreEntropy } from "./entropy"
import { buildOperations } from "./operations"
import { buildSummary } from "./summary"
import { persistScan } from "./persistence"
import { AnalyzeStructureInput, AnalyzeStructureOutput } from "./types"

export async function analyzeStructureHandler(input: AnalyzeStructureInput): Promise<AnalyzeStructureOutput> {
  const prefs = input.userPreferences ?? { archiveAfterDays: 365, ignorePaths: [] }
  const nowMs = Date.now()

  const { classifications, triage } = classifyFiles(input.root, prefs.archiveAfterDays, nowMs)
  const entropyMap = scoreEntropy(input.root, prefs.archiveAfterDays, nowMs)
  const operations = buildOperations(classifications, entropyMap)
  const summary = buildSummary(entropyMap, classifications, triage)

  if (input.userId) {
    void persistScan({
      user_id: input.userId,
      scanned_at: new Date().toISOString(),
      overall_score: entropyMap.find(e => e.path === input.root.path)?.score ?? 0,
      folder_scores: entropyMap,
    })
  }

  return { entropyMap, classifications, triage, operations, summary }
}
