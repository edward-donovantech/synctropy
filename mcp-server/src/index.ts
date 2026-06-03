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
