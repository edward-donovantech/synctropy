import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { AnalyzeStructureInputSchema } from "./types.js"
import { analyzeStructureHandler } from "./handler.js"

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "synctropy",
    version: "0.1.0",
  })

  server.tool(
    "analyze_structure",
    "Analyse a file tree and return entropy scores, file classifications, recommended operations, and a narrative summary. Runs fully offline — no data leaves the machine.",
    AnalyzeStructureInputSchema.shape,
    async (input) => {
      const result = analyzeStructureHandler(input)
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      }
    }
  )

  return server
}
