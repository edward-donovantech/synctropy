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
    const root = makeFolder("/folder", manyFiles)
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
