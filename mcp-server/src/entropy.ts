import { FileNode, EntropyEntry, Severity } from "./types"

const VERSION_SUFFIX = /_v\d+|_final|_copy|\s*\(\d+\)/i
const DATE_PREFIX = /^\d{4}[-_]\d{2}[-_]\d{2}/

function allFiles(node: FileNode): FileNode[] {
  if (node.type === "file") return [node]
  return (node.children ?? []).flatMap(allFiles)
}

function allFolders(node: FileNode): FileNode[] {
  if (node.type === "file") return []
  return [node, ...(node.children ?? []).flatMap(allFolders)]
}

function depth(filePath: string): number {
  return filePath.split("/").filter(Boolean).length
}

function getFileDaysOld(modifiedAt: string, nowMs: number): number {
  return (nowMs - new Date(modifiedAt).getTime()) / 86_400_000
}

export function scatterScore(node: FileNode): number {
  let score = 0

  const rootFiles = (node.children ?? []).filter(c => c.type === "file")
  const rootFilePoints = Math.min(rootFiles.length * 10, 33)
  if (rootFilePoints > 0) score += rootFilePoints

  const allFilesInTree = allFiles(node)
  const avgDepth = allFilesInTree.length > 0
    ? allFilesInTree.reduce((sum, f) => sum + depth(f.path), 0) / allFilesInTree.length
    : 0
  if (avgDepth > 5) score += Math.min((avgDepth - 5) * 5, 15)

  for (const folder of allFolders(node)) {
    const fileCount = (folder.children ?? []).filter(c => c.type === "file").length
    if (fileCount > 50) score += 15
  }

  return Math.min(score, 33)
}

export function namingChaosScore(node: FileNode): number {
  let score = 0
  const allFilesInTree = allFiles(node)

  for (const file of allFilesInTree) {
    if (VERSION_SUFFIX.test(file.name)) score += 5
    if (DATE_PREFIX.test(file.name) && !file.path.toLowerCase().includes("archive")) score += 3
  }

  for (const folder of allFolders(node)) {
    const files = (folder.children ?? []).filter(c => c.type === "file")

    const casings = new Set(files.map(f => {
      if (f.name === f.name.toLowerCase()) return "lower"
      if (f.name === f.name.toUpperCase()) return "upper"
      return "mixed"
    }))
    if (casings.size > 1) score += 8

    const basenames = files.map(f => f.name.replace(/\s*\(\d+\)/, "").replace(/\.[^.]+$/, "").replace(VERSION_SUFFIX, ""))
    const basenameCounts = new Map<string, number>()
    for (const base of basenames) {
      basenameCounts.set(base, (basenameCounts.get(base) ?? 0) + 1)
    }
    for (const count of basenameCounts.values()) {
      if (count > 1) score += 6
    }
  }

  return Math.min(score, 33)
}

export function temporalDecayScore(node: FileNode, archiveAfterDays: number, nowMs: number): number {
  let score = 0

  for (const folder of allFolders(node)) {
    const files = (folder.children ?? []).filter(c => c.type === "file" && c.modifiedAt)
    if (files.length === 0) continue

    const ages = files.map(f => getFileDaysOld(f.modifiedAt!, nowMs))
    const hasActive = ages.some(a => a < archiveAfterDays)
    const hasOld = ages.some(a => a > archiveAfterDays)

    if (hasActive && hasOld) score += 10

    const veryOld = ages.filter(a => a > 1095)
    if (veryOld.length > 0 && !folder.path.toLowerCase().includes("archive")) score += 8
  }

  const rootFiles = allFiles(node).filter(f => f.modifiedAt)
  if (rootFiles.length > 0) {
    const allOld = rootFiles.every(f => getFileDaysOld(f.modifiedAt!, nowMs) > 180)
    if (allOld) score += 16
  }

  return Math.min(score, 34)
}

function severityFromScore(score: number): Severity {
  if (score <= 30) return "healthy"
  if (score <= 60) return "needs_attention"
  return "critical"
}

function buildSignals(
  folder: FileNode,
  scatter: number,
  naming: number,
  temporal: number,
  archiveAfterDays: number,
  nowMs: number
): string[] {
  const signals: string[] = []

  // Scatter signals
  const rootFiles = (folder.children ?? []).filter(c => c.type === "file")
  if (rootFiles.length > 0) {
    signals.push(`${rootFiles.length} file(s) stranded at root`)
  }
  const folderFileCount = rootFiles.length  // files directly in this folder
  if (folderFileCount > 50) {
    signals.push(`${folderFileCount} files in a single folder`)
  }

  // Naming chaos signals
  const filesInFolder = allFiles(folder)
  const versionFiles = filesInFolder.filter(f => VERSION_SUFFIX.test(f.name))
  if (versionFiles.length > 0) {
    signals.push(`${versionFiles.length} file(s) with version suffixes`)
  }
  const datePrefixFiles = filesInFolder.filter(
    f => DATE_PREFIX.test(f.name) && !f.path.toLowerCase().includes("archive")
  )
  if (datePrefixFiles.length > 0) {
    signals.push(`${datePrefixFiles.length} file(s) with date prefixes`)
  }

  // Temporal signals — computed independently (not from cumulative score)
  const filesWithDates = (folder.children ?? []).filter(c => c.type === "file" && c.modifiedAt)
  if (filesWithDates.length > 0) {
    const ages = filesWithDates.map(f => (nowMs - new Date(f.modifiedAt!).getTime()) / 86_400_000)
    const hasActive = ages.some(a => a < archiveAfterDays)
    const hasOld = ages.some(a => a > archiveAfterDays)
    if (hasActive && hasOld) {
      signals.push("archive candidates mixed with active files")
    }

    const veryOldFiles = filesWithDates.filter(
      f => (nowMs - new Date(f.modifiedAt!).getTime()) / 86_400_000 > 1095
    )
    if (veryOldFiles.length > 0 && !folder.path.toLowerCase().includes("archive")) {
      signals.push(`${veryOldFiles.length} file(s) older than 3 years outside Archive`)
    }
  }

  // Root-level inactivity signal
  const allFilesInTree = allFiles(folder)
  const filesWithTimestamps = allFilesInTree.filter(f => f.modifiedAt)
  if (filesWithTimestamps.length > 0) {
    const allOld = filesWithTimestamps.every(
      f => (nowMs - new Date(f.modifiedAt!).getTime()) / 86_400_000 > 180
    )
    if (allOld) {
      signals.push("all files untouched for 6+ months")
    }
  }

  return signals
}

export function scoreEntropy(root: FileNode, archiveAfterDays: number, nowMs: number): EntropyEntry[] {
  return allFolders(root).map(folder => {
    const scatter = scatterScore(folder)
    const naming = namingChaosScore(folder)
    const temporal = temporalDecayScore(folder, archiveAfterDays, nowMs)
    const score = Math.min(scatter + naming + temporal, 100)
    return {
      path: folder.path,
      score,
      severity: severityFromScore(score),
      signals: buildSignals(folder, scatter, naming, temporal, archiveAfterDays, nowMs),
    }
  })
}
