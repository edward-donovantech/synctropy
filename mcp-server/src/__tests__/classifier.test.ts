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

  it("scores underscore-prefixed tax filename as finance", () => {
    const votes = scoreNamePattern(makeFile({ name: "tax_return_2024.pdf" }))
    expect(votes.some(v => v.domain === "finance")).toBe(true)
  })

  it("scores underscore-prefixed id filename as admin", () => {
    const votes = scoreNamePattern(makeFile({ name: "id_card.pdf" }))
    expect(votes.some(v => v.domain === "admin")).toBe(true)
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
