import { classifyFiles } from "./classifier"
import { scoreEntropy } from "./entropy"
import { buildOperations } from "./operations"
import { buildSummary } from "./summary"
import { AnalyzeStructureInput, AnalyzeStructureOutput } from "./types"

export function analyzeStructureHandler(input: AnalyzeStructureInput): AnalyzeStructureOutput {
  const { root, userPreferences } = input
  const prefs = userPreferences ?? { archiveAfterDays: 365, ignorePaths: [] }
  const nowMs = Date.now()

  const { classifications, triage } = classifyFiles(root, prefs.archiveAfterDays, nowMs)
  const entropyMap = scoreEntropy(root, prefs.archiveAfterDays, nowMs)
  const operations = buildOperations(classifications, entropyMap)
  const summary = buildSummary(entropyMap, classifications, triage)

  return { entropyMap, classifications, triage, operations, summary }
}
