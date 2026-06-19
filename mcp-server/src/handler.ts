import { classifyFiles } from "./classifier"
import { scoreEntropy } from "./entropy"
import { buildOperations } from "./operations"
import { buildSummary } from "./summary"
import { persistScan } from "./persistence"
import { AnalyzeStructureInput, AnalyzeStructureOutput } from "./types"

export async function analyzeStructureHandler(input: AnalyzeStructureInput): Promise<AnalyzeStructureOutput> {
  const { root, userPreferences, userId } = input
  const prefs = userPreferences ?? { archiveAfterDays: 365, ignorePaths: [] }
  const nowMs = Date.now()

  const { classifications, triage } = classifyFiles(root, prefs.archiveAfterDays, nowMs)
  const entropyMap = scoreEntropy(root, prefs.archiveAfterDays, nowMs)
  const operations = buildOperations(classifications, entropyMap)
  const summary = buildSummary(entropyMap, classifications, triage)
  const result: AnalyzeStructureOutput = { entropyMap, classifications, triage, operations, summary }

  if (userId) {
    void persistScan(userId, result)
  }

  return result
}
