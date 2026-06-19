import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { AnalyzeStructureInputSchema } from "./types"
import { analyzeStructureHandler } from "./handler"

const server = new McpServer({
  name: "synctropy",
  version: "1.0.0",
})

server.tool(
  "analyze_structure",
  "Analyse a file tree and return entropy scores, file classifications, recommended operations, and a narrative summary.",
  AnalyzeStructureInputSchema.shape,
  async (input) => {
    const result = await analyzeStructureHandler(input)
    return {
      content: [{
        type: "text",
        text: JSON.stringify(result, null, 2),
      }],
    }
  }
)

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch(console.error)
