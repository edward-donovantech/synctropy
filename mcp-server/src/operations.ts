import { Classification, EntropyEntry, Operation } from "./types"

export function buildOperations(
  classifications: Classification[],
  entropyMap: EntropyEntry[]
): Operation[] {
  const ops: Operation[] = []
  const foldersToCreate = new Set<string>()
  const criticalPaths = new Set(
    entropyMap
      .filter(e => e.severity === "critical")
      .map(e => e.path)
  )

  for (const c of classifications) {
    if (c.path === c.suggestedPath) continue

    const targetFolder = c.suggestedPath.split("/").slice(0, -1).join("/")
    foldersToCreate.add(targetFolder)

    const isCritical = [...criticalPaths].some(cp => c.path.startsWith(cp))
    ops.push({
      type: "move",
      from: c.path,
      to: c.suggestedPath,
      priority: isCritical ? "high" : c.lifecycle === "archive" ? "low" : "medium",
    })
  }

  for (const folder of foldersToCreate) {
    ops.unshift({ type: "create_folder", from: "", to: folder, priority: "high" })
  }

  return ops
}
