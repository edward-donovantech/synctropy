import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { AnalyzeStructureInputSchema } from "./types"
import { analyzeStructureHandler } from "./handler"
import {
  GetUserConfigInputSchema,
  SavePipelineArtifactInputSchema,
  getUserConfig,
  savePipelineArtifact,
} from './user-config.js'

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

server.tool(
  'get_user_config',
  'Returns is_premium flag and storage_mode for a given user. Returns defaults if user not found.',
  GetUserConfigInputSchema.shape,
  async (input) => {
    const result = await getUserConfig(input.userId)
    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
    }
  }
)

server.tool(
  'save_pipeline_artifact',
  'Persists a pipeline skill artifact to Supabase for premium users. Returns the inserted row id.',
  SavePipelineArtifactInputSchema.shape,
  async (input) => {
    try {
      const result = await savePipelineArtifact(input)
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
      }
    } catch (err) {
      console.error('[synctropy] save_pipeline_artifact failed:', err)
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: String(err) }) }],
        isError: true,
      }
    }
  }
)

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch(console.error)
