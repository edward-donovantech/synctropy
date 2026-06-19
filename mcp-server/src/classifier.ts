import path from "path"
import { FileNode, Domain, Lifecycle, Classification, TriageItem } from "./types"
import { EXTENSION_DOMAIN_MAP, NAME_PATTERNS, PATH_CONTEXT_PATTERNS, buildCanonicalPath } from "./taxonomy"

export interface DomainVote {
  domain: Domain
  weight: number
}

export interface LifecycleVote {
  lifecycle: Lifecycle
  weight: number
}

export function scoreExtension(file: FileNode): DomainVote[] {
  const ext = path.extname(file.name).toLowerCase()
  const domains = EXTENSION_DOMAIN_MAP[ext]
  if (!domains) return []
  return domains.map((domain, i) => ({
    domain,
    weight: 0.2 / (i + 1),
  }))
}

export function scoreNamePattern(file: FileNode): DomainVote[] {
  return NAME_PATTERNS
    .filter(({ pattern }) => pattern.test(file.name))
    .map(({ domain, weight }) => ({ domain, weight }))
}

export function scorePathContext(file: FileNode): DomainVote[] {
  const parentPath = file.path.split("/").slice(0, -1).join("/")
  return PATH_CONTEXT_PATTERNS
    .filter(({ pattern }) => pattern.test(parentPath))
    .map(({ domain, weight }) => ({ domain, weight }))
}

export function scoreTemporal(
  file: FileNode,
  archiveAfterDays: number,
  nowMs: number
): LifecycleVote[] {
  if (!file.modifiedAt) return []
  const modifiedMs = new Date(file.modifiedAt).getTime()
  if (isNaN(modifiedMs)) return []
  const ageDays = (nowMs - modifiedMs) / 86_400_000
  if (ageDays > archiveAfterDays) {
    return [{ lifecycle: "archive", weight: ageDays > 1095 ? 0.9 : 0.6 }]
  }
  return [{ lifecycle: "active", weight: 0.5 }]
}

function topEntry<K extends string>(map: Map<K, number>): [K, number] | undefined {
  let top: [K, number] | undefined
  for (const entry of map.entries()) {
    if (!top || entry[1] > top[1]) top = entry as [K, number]
  }
  return top
}

export function classifyFile(
  file: FileNode,
  archiveAfterDays: number,
  nowMs: number
): Classification | TriageItem {
  const domainVotes: DomainVote[] = [
    ...scoreExtension(file),
    ...scoreNamePattern(file),
    ...scorePathContext(file),
  ]
  const lifecycleVotes: LifecycleVote[] = scoreTemporal(file, archiveAfterDays, nowMs)

  const domainTotals = new Map<Domain, number>()
  let totalDomainWeight = 0
  for (const { domain, weight } of domainVotes) {
    domainTotals.set(domain, (domainTotals.get(domain) ?? 0) + weight)
    totalDomainWeight += weight
  }

  const lifecycleTotals = new Map<Lifecycle, number>()
  let totalLifecycleWeight = 0
  for (const { lifecycle, weight } of lifecycleVotes) {
    lifecycleTotals.set(lifecycle, (lifecycleTotals.get(lifecycle) ?? 0) + weight)
    totalLifecycleWeight += weight
  }

  const topDomainEntry = topEntry(domainTotals)
  const topLifecycleEntry = topEntry(lifecycleTotals)

  const topDomain = topDomainEntry?.[0] ?? "inbox"
  const topLifecycle = topLifecycleEntry?.[0] ?? "active"

  // No domain signals at all → triage immediately.
  if (totalDomainWeight === 0 || !topDomainEntry) {
    return {
      path: file.path,
      topCandidates: [{ domain: "inbox" as Domain, lifecycle: "active" as Lifecycle, confidence: 0 }],
      reason: "no classification signals found",
    }
  }

  // Compute pairwise margin confidence: top / (top + second-best).
  // This measures how decisively the top domain beats its nearest competitor,
  // avoiding dilution from many weak signals in unrelated domains.
  const sortedDomains = [...domainTotals.entries()].sort((a, b) => b[1] - a[1])
  const topScore = sortedDomains[0][1]
  const secondScore = sortedDomains[1]?.[1] ?? 0
  const domainConfidence = secondScore === 0 ? 1 : topScore / (topScore + secondScore)

  const lifecycleConfidence = totalLifecycleWeight > 0 && topLifecycleEntry
    ? topLifecycleEntry[1] / totalLifecycleWeight
    : undefined

  // When no temporal signal exists, domain confidence alone determines the result.
  const confidence = lifecycleConfidence !== undefined
    ? (domainConfidence + lifecycleConfidence) / 2
    : domainConfidence

  if (domainConfidence < 0.6 || totalDomainWeight === 0) {
    const candidates = sortedDomains
      .slice(0, 3)
      .map(([domain, score]) => ({
        domain,
        lifecycle: topLifecycle,
        confidence: secondScore === 0 ? 1 : score / (topScore + secondScore),
      }))

    return {
      path: file.path,
      topCandidates: candidates,
      reason: `ambiguous between ${candidates.slice(0, 2).map(c => c.domain).join(" and ")}`,
    }
  }

  return {
    path: file.path,
    domain: topDomain,
    lifecycle: topLifecycle,
    confidence,
    suggestedPath: buildCanonicalPath(topDomain, topLifecycle, file.name),
  }
}

export function flattenFiles(node: FileNode): FileNode[] {
  if (node.type === "file") return [node]
  return (node.children ?? []).flatMap(flattenFiles)
}

export function classifyFiles(
  root: FileNode,
  archiveAfterDays: number,
  nowMs: number
): { classifications: Classification[]; triage: TriageItem[] } {
  const files = flattenFiles(root)
  const classifications: Classification[] = []
  const triage: TriageItem[] = []

  for (const file of files) {
    const result = classifyFile(file, archiveAfterDays, nowMs)
    if ("domain" in result) {
      classifications.push(result)
    } else {
      triage.push(result)
    }
  }

  return { classifications, triage }
}
