import { describe, it, expect, vi, beforeEach } from "vitest"
import { classifyFiles } from "../classifier"
import { scoreEntropy } from "../entropy"
import { buildOperations } from "../operations"
import { buildSummary } from "../summary"
import { FileNode, AnalyzeStructureOutput } from "../types"
import { analyzeStructureHandler } from "../handler"
import * as persistence from "../persistence"

vi.mock("../persistence", () => ({
  persistScan: vi.fn().mockResolvedValue(undefined),
}))

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

  it("golden path: clean tree produces healthy entropy and no move operations", () => {
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

describe("analyzeStructureHandler — persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("calls persistScan with correct payload when userId is provided", async () => {
    const result = await analyzeStructureHandler({ root: REALISTIC_TREE, userId: "user-123" })
    expect(persistence.persistScan).toHaveBeenCalledOnce()
    expect(persistence.persistScan).toHaveBeenCalledWith(expect.objectContaining({
      user_id: "user-123",
      folder_scores: result.entropyMap,
    }))
  })

  it("passes a valid ISO scanned_at timestamp", async () => {
    await analyzeStructureHandler({ root: REALISTIC_TREE, userId: "user-123" })
    const call = vi.mocked(persistence.persistScan).mock.calls[0][0]
    expect(() => new Date(call.scanned_at).toISOString()).not.toThrow()
  })

  it("overall_score matches the root entropy entry", async () => {
    const result = await analyzeStructureHandler({ root: REALISTIC_TREE, userId: "user-123" })
    const rootEntry = result.entropyMap.find(e => e.path === "/")
    const call = vi.mocked(persistence.persistScan).mock.calls[0][0]
    expect(call.overall_score).toBe(rootEntry!.score)
  })

  it("does not call persistScan when userId is absent", async () => {
    await analyzeStructureHandler({ root: REALISTIC_TREE })
    expect(persistence.persistScan).not.toHaveBeenCalled()
  })

  it("still returns a valid analysis result when persistScan rejects", async () => {
    vi.mocked(persistence.persistScan).mockRejectedValueOnce(new Error("DB down"))
    const result = await analyzeStructureHandler({ root: REALISTIC_TREE, userId: "user-123" })
    expect(result.entropyMap.length).toBeGreaterThan(0)
    expect(result.summary.length).toBeGreaterThan(20)
  })
})
