import path from "path"
import { FileNode, Domain, Lifecycle } from "./types"
import { EXTENSION_DOMAIN_MAP, NAME_PATTERNS, PATH_CONTEXT_PATTERNS } from "./taxonomy"

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
