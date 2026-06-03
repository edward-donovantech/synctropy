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

  it("does not assign high priority to files in sibling folders of critical paths", () => {
    const classifications: Classification[] = [{
      path: "/chaos2/invoice.pdf",
      domain: "finance",
      lifecycle: "active",
      confidence: 0.9,
      suggestedPath: "Active/Finance/invoice.pdf",
    }]
    const ops = buildOperations(classifications, [criticalEntry("/chaos")])
    const move = ops.find(o => o.type === "move")
    expect(move?.priority).not.toBe("high")
  })
})
