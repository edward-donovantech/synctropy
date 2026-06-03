# Organization Methodology (analyze_structure) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the `analyze_structure` MCP tool that accepts a file tree, classifies files using a two-axis taxonomy (content domain × lifecycle stage), scores folder-level entropy, and returns classifications, a canonical target structure, actionable operations, and a narrative summary.

**Architecture:** Tree-aware classifier with separate domain and lifecycle signal scoring, a composite entropy rubric, and an MCP server entry point that wires all modules together. All classifier and entropy functions are pure with no side effects, designed to be tested in complete isolation.

**Tech Stack:** Node.js, TypeScript, MCP SDK v1.29, Zod v4, Vitest

**Spec:** `docs/superpowers/specs/2026-06-03-organization-methodology-design.md`

---

## File Structure

```
mcp-server/
  src/
    types.ts            - All Zod schemas and inferred TypeScript types
    taxonomy.ts         - Extension map, name/path patterns, canonical path builder
    classifier.ts       - Signal scorers + classifyFiles()
    entropy.ts          - Sub-scorers + scoreEntropy()
    operations.ts       - buildOperations()
    summary.ts          - buildSummary()
    index.ts            - MCP server entry point
  src/__tests__/
    classifier.test.ts
    entropy.test.ts
    operations.test.ts
    integration.test.ts
  tsconfig.json
  vitest.config.ts
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `mcp-server/tsconfig.json`
- Create: `mcp-server/vitest.config.ts`
- Modify: `mcp-server/package.json`

- [ ] **Step 1: Create `mcp-server/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 2: Create `mcp-server/vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    include: ["src/__tests__/**/*.test.ts"],
  },
})
```

- [ ] **Step 3: Install vitest and update `mcp-server/package.json`**

Run from `mcp-server/`:
```
npm install --save-dev vitest
```

Then update `package.json` — add scripts and update `main`:
```json
{
  "name": "synctropy-mcp-server",
  "version": "1.0.0",
  "main": "dist/index.js",
  "type": "commonjs",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.29.0",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@types/node": "^25.9.1",
    "typescript": "^6.0.3",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 4: Create `src/__tests__/` directory with an empty placeholder**

Create `mcp-server/src/__tests__/.gitkeep` (empty file).

- [ ] **Step 5: Verify test runner works**

Run from `mcp-server/`:
```
npm test
```
Expected: `No test files found` or `0 tests passed`. No errors.

- [ ] **Step 6: Commit**

```bash
git add mcp-server/tsconfig.json mcp-server/vitest.config.ts mcp-server/package.json mcp-server/package-lock.json mcp-server/src/__tests__/.gitkeep
git commit -m "chore: add tsconfig, vitest, and build scripts"
```

---

## Task 2: Type Definitions

**Files:**
- Create: `mcp-server/src/types.ts`

- [ ] **Step 1: Create `mcp-server/src/types.ts`**

```typescript
import { z } from "zod"

export interface FileNode {
  name: string
  path: string
  type: "file" | "folder"
  mimeType?: string
  size?: number
  modifiedAt?: string
  children?: FileNode[]
}

export const FileNodeSchema: z.ZodType<FileNode> = z.lazy(() =>
  z.object({
    name: z.string(),
    path: z.string(),
    type: z.enum(["file", "folder"]),
    mimeType: z.string().optional(),
    size: z.number().optional(),
    modifiedAt: z.string().optional(),
    children: z.array(FileNodeSchema).optional(),
  })
)

export const UserPreferencesSchema = z.object({
  archiveAfterDays: z.number().default(365),
  ignorePaths: z.array(z.string()).default([]),
})
export type UserPreferences = z.infer<typeof UserPreferencesSchema>

export const AnalyzeStructureInputSchema = z.object({
  root: FileNodeSchema,
  userPreferences: UserPreferencesSchema.optional(),
})
export type AnalyzeStructureInput = z.infer<typeof AnalyzeStructureInputSchema>

export const DomainSchema = z.enum([
  "finance", "projects", "reference", "admin", "media", "comms", "inbox",
])
export type Domain = z.infer<typeof DomainSchema>

export const LifecycleSchema = z.enum(["active", "archive", "triage"])
export type Lifecycle = z.infer<typeof LifecycleSchema>

export const SeveritySchema = z.enum(["healthy", "needs_attention", "critical"])
export type Severity = z.infer<typeof SeveritySchema>

export const ClassificationSchema = z.object({
  path: z.string(),
  domain: DomainSchema,
  lifecycle: LifecycleSchema,
  confidence: z.number(),
  suggestedPath: z.string(),
})
export type Classification = z.infer<typeof ClassificationSchema>

export const TriageItemSchema = z.object({
  path: z.string(),
  topCandidates: z.array(z.object({
    domain: z.string(),
    lifecycle: z.string(),
    confidence: z.number(),
  })),
  reason: z.string(),
})
export type TriageItem = z.infer<typeof TriageItemSchema>

export const EntropyEntrySchema = z.object({
  path: z.string(),
  score: z.number(),
  severity: SeveritySchema,
  signals: z.array(z.string()),
})
export type EntropyEntry = z.infer<typeof EntropyEntrySchema>

export const OperationSchema = z.object({
  type: z.enum(["move", "rename", "create_folder"]),
  from: z.string(),
  to: z.string(),
  priority: z.enum(["high", "medium", "low"]),
})
export type Operation = z.infer<typeof OperationSchema>

export const AnalyzeStructureOutputSchema = z.object({
  entropyMap: z.array(EntropyEntrySchema),
  classifications: z.array(ClassificationSchema),
  triage: z.array(TriageItemSchema),
  operations: z.array(OperationSchema),
  summary: z.string(),
})
export type AnalyzeStructureOutput = z.infer<typeof AnalyzeStructureOutputSchema>
```

- [ ] **Step 2: Type-check**

Run from `mcp-server/`:
```
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add mcp-server/src/types.ts
git commit -m "feat: add Zod schemas and TypeScript types"
```

---

## Task 3: Taxonomy Constants

**Files:**
- Create: `mcp-server/src/taxonomy.ts`

- [ ] **Step 1: Create `mcp-server/src/taxonomy.ts`**

```typescript
import { Domain, Lifecycle } from "./types"

export const EXTENSION_DOMAIN_MAP: Record<string, Domain[]> = {
  ".pdf":  ["finance", "reference", "admin", "projects"],
  ".xlsx": ["finance", "projects"],
  ".xls":  ["finance", "projects"],
  ".csv":  ["finance", "projects"],
  ".docx": ["projects", "reference", "admin"],
  ".doc":  ["projects", "reference", "admin"],
  ".pptx": ["projects", "reference"],
  ".ppt":  ["projects", "reference"],
  ".jpg":  ["media"],
  ".jpeg": ["media"],
  ".png":  ["media"],
  ".gif":  ["media"],
  ".mp4":  ["media"],
  ".mov":  ["media"],
  ".mp3":  ["media"],
  ".psd":  ["media"],
  ".ai":   ["media"],
  ".txt":  ["reference", "projects"],
  ".md":   ["reference", "projects"],
}

export const NAME_PATTERNS: Array<{ pattern: RegExp; domain: Domain; weight: number }> = [
  { pattern: /invoice|receipt|statement|payment/i,        domain: "finance",   weight: 0.8 },
  { pattern: /\btax\b|w-?2\b|1099/i,                     domain: "finance",   weight: 0.9 },
  { pattern: /bank|balance|budget/i,                      domain: "finance",   weight: 0.7 },
  { pattern: /contract|agreement|sow|proposal|quote/i,   domain: "projects",  weight: 0.7 },
  { pattern: /brief|deliverable|milestone/i,              domain: "projects",  weight: 0.6 },
  { pattern: /\bresume\b|\bcv\b|curriculum.vitae/i,       domain: "admin",     weight: 0.9 },
  { pattern: /license|insurance|passport|\bida?\b|legal/i, domain: "admin",   weight: 0.8 },
  { pattern: /img_|dsc_|screenshot|photo|pic_/i,          domain: "media",     weight: 0.7 },
  { pattern: /readme|notes|meeting|how.?to|tutorial/i,    domain: "reference", weight: 0.7 },
  { pattern: /email|message|\bchat\b|slack/i,             domain: "comms",     weight: 0.8 },
]

export const PATH_CONTEXT_PATTERNS: Array<{ pattern: RegExp; domain: Domain; weight: number }> = [
  { pattern: /client|clients|project|projects/i,          domain: "projects",  weight: 0.5 },
  { pattern: /tax|taxes|finance|financial|accounting/i,   domain: "finance",   weight: 0.6 },
  { pattern: /legal|admin|insurance|license/i,            domain: "admin",     weight: 0.5 },
  { pattern: /photo|photos|video|videos|media|assets/i,   domain: "media",     weight: 0.5 },
  { pattern: /reference|resources|research|articles/i,    domain: "reference", weight: 0.5 },
  { pattern: /inbox|downloads|unsorted|misc/i,            domain: "inbox",     weight: 0.6 },
]

export const DOMAIN_BASE_PATHS: Record<Domain, { active: string; archive: string }> = {
  finance:   { active: "Active/Finance",  archive: "Archive/Finance"  },
  projects:  { active: "Active/Projects", archive: "Archive/Projects" },
  admin:     { active: "Active/Admin",    archive: "Archive/Admin"    },
  reference: { active: "Reference",       archive: "Reference"        },
  media:     { active: "Media",           archive: "Media"            },
  comms:     { active: "Active/Comms",    archive: "Archive/Comms"    },
  inbox:     { active: "Inbox",           archive: "Inbox"            },
}

export function buildCanonicalPath(domain: Domain, lifecycle: Lifecycle, filename: string): string {
  if (lifecycle === "triage") return `Inbox/${filename}`
  const base = DOMAIN_BASE_PATHS[domain]
  const folder = lifecycle === "archive" ? base.archive : base.active
  return `${folder}/${filename}`
}
```

- [ ] **Step 2: Type-check**

```
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add mcp-server/src/taxonomy.ts
git commit -m "feat: add taxonomy constants and canonical path builder"
```

---

## Task 4: Signal Scorers

**Files:**
- Create: `mcp-server/src/classifier.ts`
- Create: `mcp-server/src/__tests__/classifier.test.ts`

These are pure functions. Write the tests first.

- [ ] **Step 1: Write the failing tests in `mcp-server/src/__tests__/classifier.test.ts`**

```typescript
import { describe, it, expect } from "vitest"
import {
  scoreExtension,
  scoreNamePattern,
  scorePathContext,
  scoreTemporal,
} from "../classifier"
import { FileNode } from "../types"

const makeFile = (overrides: Partial<FileNode>): FileNode => ({
  name: "file.txt",
  path: "/root/file.txt",
  type: "file",
  ...overrides,
})

const NOW_MS = new Date("2026-06-03T00:00:00Z").getTime()

describe("scoreExtension", () => {
  it("returns finance as first domain for .pdf", () => {
    const votes = scoreExtension(makeFile({ name: "doc.pdf" }))
    expect(votes[0].domain).toBe("finance")
    expect(votes[0].weight).toBeGreaterThan(0)
  })

  it("returns media for .jpg", () => {
    const votes = scoreExtension(makeFile({ name: "photo.jpg" }))
    expect(votes.every(v => v.domain === "media")).toBe(true)
  })

  it("returns empty array for unknown extension", () => {
    expect(scoreExtension(makeFile({ name: "file.xyz" }))).toEqual([])
  })
})

describe("scoreNamePattern", () => {
  it("scores invoice filename as finance", () => {
    const votes = scoreNamePattern(makeFile({ name: "invoice_acme_2025.pdf" }))
    expect(votes.some(v => v.domain === "finance")).toBe(true)
  })

  it("scores resume as admin with high weight", () => {
    const votes = scoreNamePattern(makeFile({ name: "my_resume.pdf" }))
    const adminVote = votes.find(v => v.domain === "admin")
    expect(adminVote).toBeDefined()
    expect(adminVote!.weight).toBeGreaterThanOrEqual(0.8)
  })

  it("returns empty for a file with no matching patterns", () => {
    expect(scoreNamePattern(makeFile({ name: "zzz_unknownfile.pdf" }))).toEqual([])
  })
})

describe("scorePathContext", () => {
  it("boosts finance for a file inside a taxes folder", () => {
    const votes = scorePathContext(makeFile({ path: "/Taxes 2025/report.pdf" }))
    expect(votes.some(v => v.domain === "finance")).toBe(true)
  })

  it("boosts projects for a file inside a clients folder", () => {
    const votes = scorePathContext(makeFile({ path: "/Clients/Acme/proposal.docx" }))
    expect(votes.some(v => v.domain === "projects")).toBe(true)
  })

  it("returns empty for a file with no contextual parent signals", () => {
    expect(scorePathContext(makeFile({ path: "/random/file.txt" }))).toEqual([])
  })
})

describe("scoreTemporal", () => {
  it("returns active lifecycle for a recently modified file", () => {
    const recent = new Date(NOW_MS - 30 * 24 * 60 * 60 * 1000).toISOString()
    const votes = scoreTemporal(makeFile({ modifiedAt: recent }), 365, NOW_MS)
    expect(votes.some(v => v.lifecycle === "active")).toBe(true)
  })

  it("returns archive lifecycle for a file modified 2 years ago", () => {
    const old = new Date(NOW_MS - 730 * 24 * 60 * 60 * 1000).toISOString()
    const votes = scoreTemporal(makeFile({ modifiedAt: old }), 365, NOW_MS)
    expect(votes.some(v => v.lifecycle === "archive")).toBe(true)
  })

  it("returns empty array when modifiedAt is absent", () => {
    expect(scoreTemporal(makeFile({ modifiedAt: undefined }), 365, NOW_MS)).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```
npm test
```
Expected: `classifier.ts not found` or import errors — the module doesn't exist yet.

- [ ] **Step 3: Create `mcp-server/src/classifier.ts` with the signal scorers**

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

```
npm test
```
Expected: All 10 tests in `classifier.test.ts` PASS.

- [ ] **Step 5: Commit**

```bash
git add mcp-server/src/classifier.ts mcp-server/src/__tests__/classifier.test.ts
git commit -m "feat: add signal scorers (extension, name, path, temporal)"
```

---

## Task 5: Classifier Aggregator

**Files:**
- Modify: `mcp-server/src/classifier.ts` (add `classifyFile`, `classifyFiles`, `flattenFiles`)
- Create: `mcp-server/src/__tests__/classifier-aggregator.test.ts`

- [ ] **Step 1: Create `mcp-server/src/__tests__/classifier-aggregator.test.ts`**

```typescript
import { describe, it, expect } from "vitest"
import { classifyFile, classifyFiles } from "../classifier"
import { Classification, TriageItem, FileNode } from "../types"

const NOW_MS = new Date("2026-06-03T00:00:00Z").getTime()

const makeFile = (overrides: Partial<FileNode>): FileNode => ({
  name: "file.txt",
  path: "/root/file.txt",
  type: "file",
  ...overrides,
})

describe("classifyFile", () => {
  it("classifies a clear invoice PDF as finance/active", () => {
    const result = classifyFile(
      makeFile({ name: "invoice_acme_jan.pdf", path: "/Clients/Acme/invoice_acme_jan.pdf" }),
      365,
      NOW_MS
    )
    expect((result as Classification).domain).toBe("finance")
    expect((result as Classification).lifecycle).toBe("active")
    expect((result as Classification).confidence).toBeGreaterThanOrEqual(0.6)
  })

  it("classifies a resume PDF as admin/active", () => {
    const result = classifyFile(
      makeFile({ name: "resume_2025.pdf", path: "/resume_2025.pdf" }),
      365,
      NOW_MS
    )
    expect((result as Classification).domain).toBe("admin")
  })

  it("sends an unrecognisable file to triage", () => {
    const result = classifyFile(
      makeFile({ name: "zzz_file_xyz.bin", path: "/zzz_file_xyz.bin" }),
      365,
      NOW_MS
    )
    expect((result as TriageItem).topCandidates).toBeDefined()
    expect((result as TriageItem).reason).toBeTruthy()
  })

  it("generates a suggestedPath for a classified file", () => {
    const result = classifyFile(
      makeFile({ name: "invoice.pdf", path: "/invoice.pdf" }),
      365,
      NOW_MS
    ) as Classification
    expect(result.suggestedPath).toContain("invoice.pdf")
  })

  it("sets lifecycle to archive for an old file", () => {
    const twoYearsAgo = new Date(NOW_MS - 730 * 24 * 60 * 60 * 1000).toISOString()
    const result = classifyFile(
      makeFile({ name: "invoice_old.pdf", path: "/invoice_old.pdf", modifiedAt: twoYearsAgo }),
      365,
      NOW_MS
    ) as Classification
    expect(result.lifecycle).toBe("archive")
  })
})

describe("classifyFiles", () => {
  it("returns separate classifications and triage arrays", () => {
    const tree = {
      name: "root",
      path: "/",
      type: "folder" as const,
      children: [
        { name: "invoice.pdf", path: "/invoice.pdf", type: "file" as const },
        { name: "zzz_unknown.bin", path: "/zzz_unknown.bin", type: "file" as const },
      ],
    }
    const { classifications, triage } = classifyFiles(tree, 365, NOW_MS)
    expect(classifications.length).toBeGreaterThan(0)
    expect(triage.length).toBeGreaterThan(0)
  })

  it("ignores folder nodes in classifications", () => {
    const tree = {
      name: "root",
      path: "/",
      type: "folder" as const,
      children: [
        {
          name: "Clients",
          path: "/Clients",
          type: "folder" as const,
          children: [
            { name: "invoice.pdf", path: "/Clients/invoice.pdf", type: "file" as const },
          ],
        },
      ],
    }
    const { classifications } = classifyFiles(tree, 365, NOW_MS)
    expect(classifications.every(c => !c.path.endsWith("Clients"))).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify new tests fail**

```
npm test
```
Expected: Tests in `classifier-aggregator.test.ts` FAIL with "not a function".

- [ ] **Step 3: Add `classifyFile`, `classifyFiles`, and `flattenFiles` to `mcp-server/src/classifier.ts`**

Append to the existing file:

```typescript
import { Classification, TriageItem } from "./types"
import { buildCanonicalPath } from "./taxonomy"

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

  const domainConfidence = totalDomainWeight > 0 && topDomainEntry
    ? topDomainEntry[1] / totalDomainWeight
    : 0

  const lifecycleConfidence = totalLifecycleWeight > 0 && topLifecycleEntry
    ? topLifecycleEntry[1] / totalLifecycleWeight
    : 0.5

  const confidence = (domainConfidence + lifecycleConfidence) / 2

  if (confidence < 0.6 || totalDomainWeight === 0) {
    const candidates = [...domainTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([domain, score]) => ({
        domain,
        lifecycle: topLifecycle,
        confidence: totalDomainWeight > 0 ? score / totalDomainWeight : 0,
      }))

    return {
      path: file.path,
      topCandidates: candidates.length > 0
        ? candidates
        : [{ domain: "inbox", lifecycle: "active", confidence: 0 }],
      reason: totalDomainWeight === 0
        ? "no classification signals found"
        : `ambiguous between ${candidates.slice(0, 2).map(c => c.domain).join(" and ")}`,
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
```

- [ ] **Step 4: Run all tests**

```
npm test
```
Expected: All tests in `classifier.test.ts` PASS.

- [ ] **Step 5: Commit**

```bash
git add mcp-server/src/classifier.ts mcp-server/src/__tests__/classifier-aggregator.test.ts
git commit -m "feat: add classifier aggregator and classifyFiles"
```

---

## Task 6: Entropy Scorer

**Files:**
- Create: `mcp-server/src/entropy.ts`
- Create: `mcp-server/src/__tests__/entropy.test.ts`

- [ ] **Step 1: Write failing tests in `mcp-server/src/__tests__/entropy.test.ts`**

```typescript
import { describe, it, expect } from "vitest"
import { scatterScore, namingChaosScore, temporalDecayScore, scoreEntropy } from "../entropy"
import { FileNode, EntropyEntry } from "../types"

const NOW_MS = new Date("2026-06-03T00:00:00Z").getTime()

const makeFolder = (path: string, children: FileNode[]): FileNode => ({
  name: path.split("/").at(-1) ?? "root",
  path,
  type: "folder",
  children,
})
const makeFile = (name: string, parentPath: string, modifiedAt?: string): FileNode => ({
  name,
  path: `${parentPath}/${name}`,
  type: "file",
  modifiedAt,
})

describe("scatterScore", () => {
  it("adds 10 points per file stranded at root (capped at 33)", () => {
    const root = makeFolder("/", [
      makeFile("a.pdf", "/"),
      makeFile("b.pdf", "/"),
      makeFile("c.pdf", "/"),
      makeFile("d.pdf", "/"),
    ])
    expect(scatterScore(root)).toBe(33)
  })

  it("adds 15 points for a folder with more than 50 files", () => {
    const manyFiles = Array.from({ length: 51 }, (_, i) =>
      makeFile(`file${i}.txt`, "/folder")
    )
    const root = makeFolder("/", [makeFolder("/folder", manyFiles)])
    expect(scatterScore(root)).toBeGreaterThanOrEqual(15)
  })

  it("returns 0 for a clean, well-structured tree", () => {
    const root = makeFolder("/", [
      makeFolder("/Active", [makeFile("invoice.pdf", "/Active")]),
    ])
    expect(scatterScore(root)).toBe(0)
  })
})

describe("namingChaosScore", () => {
  it("scores version suffixes", () => {
    const root = makeFolder("/", [
      makeFile("report_v2.docx", "/"),
      makeFile("report_FINAL.docx", "/"),
    ])
    expect(namingChaosScore(root)).toBeGreaterThanOrEqual(10)
  })

  it("scores duplicate basenames", () => {
    const root = makeFolder("/", [
      makeFolder("/docs", [
        makeFile("contract.pdf", "/docs"),
        makeFile("contract (1).pdf", "/docs"),
      ]),
    ])
    expect(namingChaosScore(root)).toBeGreaterThanOrEqual(6)
  })

  it("returns 0 for clean naming", () => {
    const root = makeFolder("/", [
      makeFile("invoice-2025-01.pdf", "/"),
      makeFile("proposal-acme.pdf", "/"),
    ])
    expect(namingChaosScore(root)).toBe(0)
  })
})

describe("temporalDecayScore", () => {
  it("penalises old files mixed with active files", () => {
    const oldDate = new Date(NOW_MS - 2 * 365 * 86_400_000).toISOString()
    const newDate = new Date(NOW_MS - 10 * 86_400_000).toISOString()
    const root = makeFolder("/Active", [
      makeFile("current.pdf", "/Active", newDate),
      makeFile("old.pdf", "/Active", oldDate),
    ])
    expect(temporalDecayScore(root, 365, NOW_MS)).toBeGreaterThan(0)
  })

  it("returns 0 for a tree with no modifiedAt data", () => {
    const root = makeFolder("/", [makeFile("file.txt", "/")])
    expect(temporalDecayScore(root, 365, NOW_MS)).toBe(0)
  })
})

describe("scoreEntropy", () => {
  it("returns healthy severity for a clean tree", () => {
    const root = makeFolder("/", [
      makeFolder("/Active", [makeFile("invoice.pdf", "/Active")]),
    ])
    const result: EntropyEntry[] = scoreEntropy(root, 365, NOW_MS)
    expect(result.every(e => e.severity === "healthy")).toBe(true)
  })

  it("returns critical severity for a highly chaotic folder", () => {
    const manyFiles = Array.from({ length: 51 }, (_, i) =>
      makeFile(`file_v${i}_FINAL.txt`, "/chaos")
    )
    const root = makeFolder("/chaos", manyFiles)
    const [entry] = scoreEntropy(root, 365, NOW_MS)
    expect(entry.score).toBeGreaterThan(60)
    expect(entry.severity).toBe("critical")
  })

  it("emits human-readable signal strings", () => {
    const root = makeFolder("/", [makeFile("report_FINAL.docx", "/")])
    const [entry] = scoreEntropy(root, 365, NOW_MS)
    expect(entry.signals.length).toBeGreaterThan(0)
    expect(typeof entry.signals[0]).toBe("string")
  })
})
```

- [ ] **Step 2: Run to verify they fail**

```
npm test
```
Expected: FAIL — `entropy.ts` not found.

- [ ] **Step 3: Create `mcp-server/src/entropy.ts`**

```typescript
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

export function scatterScore(node: FileNode): number {
  let score = 0
  const signals: string[] = []

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

    const basenames = files.map(f => f.name.replace(/\s*\(\d+\)|\.[^.]+$/, "").replace(VERSION_SUFFIX, ""))
    const seen = new Set<string>()
    for (const base of basenames) {
      if (seen.has(base)) score += 6
      seen.add(base)
    }
  }

  return Math.min(score, 33)
}

export function temporalDecayScore(node: FileNode, archiveAfterDays: number, nowMs: number): number {
  let score = 0

  for (const folder of allFolders(node)) {
    const files = (folder.children ?? []).filter(c => c.type === "file" && c.modifiedAt)
    if (files.length === 0) continue

    const ages = files.map(f => (nowMs - new Date(f.modifiedAt!).getTime()) / 86_400_000)
    const hasActive = ages.some(a => a < archiveAfterDays)
    const hasOld = ages.some(a => a > archiveAfterDays)

    if (hasActive && hasOld) score += 10

    const veryOld = ages.filter(a => a > 1095)
    if (veryOld.length > 0 && !folder.path.toLowerCase().includes("archive")) score += 8
  }

  const rootFiles = allFiles(node).filter(f => f.modifiedAt)
  if (rootFiles.length > 0) {
    const allOld = rootFiles.every(f =>
      (nowMs - new Date(f.modifiedAt!).getTime()) / 86_400_000 > 180
    )
    if (allOld) score += 16
  }

  return Math.min(score, 34)
}

function severityFromScore(score: number): Severity {
  if (score <= 30) return "healthy"
  if (score <= 60) return "needs_attention"
  return "critical"
}

function buildSignals(node: FileNode, scatter: number, naming: number, temporal: number): string[] {
  const signals: string[] = []
  const rootFiles = (node.children ?? []).filter(c => c.type === "file")
  if (rootFiles.length > 0) signals.push(`${rootFiles.length} file(s) stranded at root`)

  const versionFiles = allFiles(node).filter(f => VERSION_SUFFIX.test(f.name))
  if (versionFiles.length > 0) signals.push(`${versionFiles.length} file(s) with version suffixes`)

  if (temporal >= 10) signals.push("archive candidates mixed with active files")
  if (temporal >= 16) signals.push("root-level files untouched for 6+ months")

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
      signals: buildSignals(folder, scatter, naming, temporal),
    }
  })
}
```

- [ ] **Step 4: Run all tests**

```
npm test
```
Expected: All tests in `entropy.test.ts` and `classifier.test.ts` PASS.

- [ ] **Step 5: Commit**

```bash
git add mcp-server/src/entropy.ts mcp-server/src/__tests__/entropy.test.ts
git commit -m "feat: add entropy scorer (scatter, naming, temporal)"
```

---

## Task 7: Operations Builder

**Files:**
- Create: `mcp-server/src/operations.ts`
- Create: `mcp-server/src/__tests__/operations.test.ts`

- [ ] **Step 1: Write failing tests in `mcp-server/src/__tests__/operations.test.ts`**

```typescript
import { describe, it, expect } from "vitest"
import { buildOperations } from "../operations"
import { Classification, EntropyEntry } from "../types"

const healthyEntry = (path: string): EntropyEntry => ({
  path,
  score: 10,
  severity: "healthy",
  signals: [],
})

const criticalEntry = (path: string): EntropyEntry => ({
  path,
  score: 80,
  severity: "critical",
  signals: ["many version suffixes"],
})

describe("buildOperations", () => {
  it("emits a move operation for each classified file not already in its suggested path", () => {
    const classifications: Classification[] = [{
      path: "/Desktop/invoice.pdf",
      domain: "finance",
      lifecycle: "active",
      confidence: 0.9,
      suggestedPath: "Active/Finance/invoice.pdf",
    }]
    const ops = buildOperations(classifications, [healthyEntry("/")])
    const move = ops.find(o => o.type === "move")
    expect(move).toBeDefined()
    expect(move!.from).toBe("/Desktop/invoice.pdf")
    expect(move!.to).toBe("Active/Finance/invoice.pdf")
  })

  it("assigns high priority moves for files in critical-entropy folders", () => {
    const classifications: Classification[] = [{
      path: "/chaos/invoice.pdf",
      domain: "finance",
      lifecycle: "active",
      confidence: 0.9,
      suggestedPath: "Active/Finance/invoice.pdf",
    }]
    const ops = buildOperations(classifications, [criticalEntry("/chaos")])
    const move = ops.find(o => o.type === "move")
    expect(move?.priority).toBe("high")
  })

  it("emits create_folder operations for required target folders", () => {
    const classifications: Classification[] = [{
      path: "/invoice.pdf",
      domain: "finance",
      lifecycle: "active",
      confidence: 0.9,
      suggestedPath: "Active/Finance/invoice.pdf",
    }]
    const ops = buildOperations(classifications, [])
    expect(ops.some(o => o.type === "create_folder" && o.to === "Active/Finance")).toBe(true)
  })

  it("does not emit a move if the file is already in the suggested location", () => {
    const classifications: Classification[] = [{
      path: "Active/Finance/invoice.pdf",
      domain: "finance",
      lifecycle: "active",
      confidence: 0.9,
      suggestedPath: "Active/Finance/invoice.pdf",
    }]
    const ops = buildOperations(classifications, [])
    expect(ops.filter(o => o.type === "move").length).toBe(0)
  })
})
```

- [ ] **Step 2: Run to verify they fail**

```
npm test
```
Expected: FAIL — `operations.ts` not found.

- [ ] **Step 3: Create `mcp-server/src/operations.ts`**

```typescript
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
```

- [ ] **Step 4: Run all tests**

```
npm test
```
Expected: All tests in `operations.test.ts` PASS.

- [ ] **Step 5: Commit**

```bash
git add mcp-server/src/operations.ts mcp-server/src/__tests__/operations.test.ts
git commit -m "feat: add operations builder"
```

---

## Task 8: Summary Builder

**Files:**
- Create: `mcp-server/src/summary.ts`

No test for this — it's pure string formatting with no branching logic worth unit testing. Covered by the integration test.

- [ ] **Step 1: Create `mcp-server/src/summary.ts`**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add mcp-server/src/summary.ts
git commit -m "feat: add summary builder"
```

---

## Task 9: MCP Server Entry Point

**Files:**
- Create: `mcp-server/src/index.ts`

- [ ] **Step 1: Create `mcp-server/src/index.ts`**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { AnalyzeStructureInputSchema } from "./types"
import { classifyFiles } from "./classifier"
import { scoreEntropy } from "./entropy"
import { buildOperations } from "./operations"
import { buildSummary } from "./summary"

const server = new McpServer({
  name: "synctropy",
  version: "1.0.0",
})

server.tool(
  "analyze_structure",
  "Analyse a file tree and return entropy scores, file classifications, recommended operations, and a narrative summary.",
  AnalyzeStructureInputSchema.shape,
  async (input) => {
    const prefs = input.userPreferences ?? { archiveAfterDays: 365, ignorePaths: [] }
    const nowMs = Date.now()

    const { classifications, triage } = classifyFiles(input.root, prefs.archiveAfterDays, nowMs)
    const entropyMap = scoreEntropy(input.root, prefs.archiveAfterDays, nowMs)
    const operations = buildOperations(classifications, entropyMap)
    const summary = buildSummary(entropyMap, classifications, triage)

    return {
      content: [{
        type: "text",
        text: JSON.stringify({ entropyMap, classifications, triage, operations, summary }, null, 2),
      }],
    }
  }
)

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch(console.error)
```

- [ ] **Step 2: Type-check**

```
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add mcp-server/src/index.ts
git commit -m "feat: add MCP server entry point wiring analyze_structure"
```

---

## Task 10: Integration Test

**Files:**
- Create: `mcp-server/src/__tests__/integration.test.ts`

- [ ] **Step 1: Write the integration test**

```typescript
import { describe, it, expect } from "vitest"
import { classifyFiles } from "../classifier"
import { scoreEntropy } from "../entropy"
import { buildOperations } from "../operations"
import { buildSummary } from "../summary"
import { FileNode, AnalyzeStructureOutput } from "../types"

const NOW_MS = new Date("2026-06-03T00:00:00Z").getTime()
const ARCHIVE_AFTER = 365

function analyzeStructure(root: FileNode): AnalyzeStructureOutput {
  const { classifications, triage } = classifyFiles(root, ARCHIVE_AFTER, NOW_MS)
  const entropyMap = scoreEntropy(root, ARCHIVE_AFTER, NOW_MS)
  const operations = buildOperations(classifications, entropyMap)
  const summary = buildSummary(entropyMap, classifications, triage)
  return { entropyMap, classifications, triage, operations, summary }
}

const REALISTIC_TREE: FileNode = {
  name: "root",
  path: "/",
  type: "folder",
  children: [
    // Stranded at root — high scatter
    { name: "invoice_acme_jan.pdf", path: "/invoice_acme_jan.pdf", type: "file",
      modifiedAt: new Date(NOW_MS - 10 * 86_400_000).toISOString() },
    { name: "resume_2024.pdf", path: "/resume_2024.pdf", type: "file",
      modifiedAt: new Date(NOW_MS - 5 * 86_400_000).toISOString() },
    { name: "DSC_00123.jpg", path: "/DSC_00123.jpg", type: "file" },
    // Version chaos
    { name: "proposal_v1.docx", path: "/proposal_v1.docx", type: "file",
      modifiedAt: new Date(NOW_MS - 50 * 86_400_000).toISOString() },
    { name: "proposal_v2_FINAL.docx", path: "/proposal_v2_FINAL.docx", type: "file",
      modifiedAt: new Date(NOW_MS - 45 * 86_400_000).toISOString() },
    // Old tax docs outside Archive
    { name: "tax_return_2020.pdf", path: "/tax_return_2020.pdf", type: "file",
      modifiedAt: new Date(NOW_MS - 1500 * 86_400_000).toISOString() },
    // Ambiguous file (should go to triage)
    { name: "zzz_random_thing.bin", path: "/zzz_random_thing.bin", type: "file" },
    // Well-organised subfolder (should be healthy)
    {
      name: "Active",
      path: "/Active",
      type: "folder",
      children: [
        { name: "Projects", path: "/Active/Projects", type: "folder", children: [
          { name: "acme_proposal.docx", path: "/Active/Projects/acme_proposal.docx", type: "file",
            modifiedAt: new Date(NOW_MS - 3 * 86_400_000).toISOString() },
        ]},
      ],
    },
  ],
}

describe("analyzeStructure (integration)", () => {
  it("classifies invoice as finance/active", () => {
    const { classifications } = analyzeStructure(REALISTIC_TREE)
    const invoice = classifications.find(c => c.path.includes("invoice_acme_jan"))
    expect(invoice).toBeDefined()
    expect(invoice!.domain).toBe("finance")
    expect(invoice!.lifecycle).toBe("active")
  })

  it("classifies resume as admin", () => {
    const { classifications } = analyzeStructure(REALISTIC_TREE)
    const resume = classifications.find(c => c.path.includes("resume"))
    expect(resume?.domain).toBe("admin")
  })

  it("classifies old tax doc as finance/archive", () => {
    const { classifications } = analyzeStructure(REALISTIC_TREE)
    const tax = classifications.find(c => c.path.includes("tax_return"))
    expect(tax?.domain).toBe("finance")
    expect(tax?.lifecycle).toBe("archive")
  })

  it("sends the unrecognisable .bin file to triage", () => {
    const { triage } = analyzeStructure(REALISTIC_TREE)
    expect(triage.some(t => t.path.includes("zzz_random_thing"))).toBe(true)
  })

  it("marks the chaotic root folder as needs_attention or critical", () => {
    const { entropyMap } = analyzeStructure(REALISTIC_TREE)
    const rootEntry = entropyMap.find(e => e.path === "/")
    expect(rootEntry).toBeDefined()
    expect(["needs_attention", "critical"]).toContain(rootEntry!.severity)
  })

  it("marks the well-organised Active/Projects subfolder as healthy", () => {
    const { entropyMap } = analyzeStructure(REALISTIC_TREE)
    const projectsEntry = entropyMap.find(e => e.path === "/Active/Projects")
    expect(projectsEntry?.severity).toBe("healthy")
  })

  it("emits move operations for misplaced files", () => {
    const { operations } = analyzeStructure(REALISTIC_TREE)
    expect(operations.filter(o => o.type === "move").length).toBeGreaterThan(0)
  })

  it("emits create_folder operations for required target folders", () => {
    const { operations } = analyzeStructure(REALISTIC_TREE)
    expect(operations.some(o => o.type === "create_folder")).toBe(true)
  })

  it("returns a non-empty summary string", () => {
    const { summary } = analyzeStructure(REALISTIC_TREE)
    expect(summary.length).toBeGreaterThan(20)
  })

  it("golden path: clean tree produces healthy entropy and no operations", () => {
    const cleanTree: FileNode = {
      name: "root",
      path: "/",
      type: "folder",
      children: [{
        name: "Active",
        path: "/Active",
        type: "folder",
        children: [{
          name: "Finance",
          path: "/Active/Finance",
          type: "folder",
          children: [{
            name: "invoice.pdf",
            path: "Active/Finance/invoice.pdf",
            type: "file",
            modifiedAt: new Date(NOW_MS - 5 * 86_400_000).toISOString(),
          }],
        }],
      }],
    }
    const result = analyzeStructure(cleanTree)
    expect(result.operations.filter(o => o.type === "move").length).toBe(0)
    expect(result.entropyMap.every(e => e.severity === "healthy")).toBe(true)
  })

  it("degraded input (no mimeType or modifiedAt) returns valid output", () => {
    const bareTree: FileNode = {
      name: "root",
      path: "/",
      type: "folder",
      children: [
        { name: "invoice.pdf", path: "/invoice.pdf", type: "file" },
        { name: "unknown.bin", path: "/unknown.bin", type: "file" },
      ],
    }
    const result = analyzeStructure(bareTree)
    expect(result.entropyMap).toBeDefined()
    expect(result.classifications.length + result.triage.length).toBe(2)
  })
})
```

- [ ] **Step 2: Run to verify tests fail**

```
npm test
```
Expected: Some or all integration tests FAIL (modules not wired together yet — this verifies the test harness works correctly before implementation is complete).

- [ ] **Step 3: Run the full test suite after all modules exist**

```
npm test
```
Expected: All tests across all 4 test files PASS.

- [ ] **Step 4: Final type-check and build**

```
npx tsc --noEmit
npm run build
```
Expected: No type errors. `dist/` directory created with compiled `.js` files.

- [ ] **Step 5: Commit**

```bash
git add mcp-server/src/__tests__/integration.test.ts mcp-server/dist
git commit -m "feat: add integration tests and verify full analyze_structure pipeline"
```

---

## Verification Checklist

- [ ] `npm test` — all tests pass (classifier, entropy, operations, integration)
- [ ] `npx tsc --noEmit` — no type errors
- [ ] `npm run build` — compiles to `dist/`
- [ ] Golden path test passes (clean tree → 0 move operations, all folders healthy)
- [ ] Degraded input test passes (no mimeType/modifiedAt → valid output)
- [ ] Triage test passes (ambiguous file → triage bucket with reason)
