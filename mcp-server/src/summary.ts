import { EntropyEntry, TriageItem, Classification } from "./types"

export function buildSummary(
  entropyMap: EntropyEntry[],
  classifications: Classification[],
  triage: TriageItem[]
): string {
  const critical = entropyMap.filter(e => e.severity === "critical")
  const needsAttention = entropyMap.filter(e => e.severity === "needs_attention")
  const totalFiles = classifications.length + triage.length

  const lines: string[] = []

  lines.push(`Analysed ${totalFiles} file(s) across ${entropyMap.length} folder(s).`)

  if (critical.length > 0) {
    lines.push(
      `${critical.length} folder(s) are critically disorganised: ${critical.map(e => e.path).join(", ")}.`
    )
  } else if (needsAttention.length > 0) {
    lines.push(`${needsAttention.length} folder(s) need attention.`)
  } else {
    lines.push("Overall folder health looks good.")
  }

  if (triage.length > 0) {
    lines.push(
      `${triage.length} file(s) could not be classified with confidence and need your review.`
    )
  }

  const archiveCount = classifications.filter(c => c.lifecycle === "archive").length
  if (archiveCount > 0) {
    lines.push(`${archiveCount} file(s) are archive candidates and can be moved out of active folders.`)
  }

  return lines.join(" ")
}
