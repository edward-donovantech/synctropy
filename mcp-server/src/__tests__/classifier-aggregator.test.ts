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
