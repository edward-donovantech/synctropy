import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { AnalyzeStructureInputSchema } from "./types.js"
import { analyzeStructureHandler } from "./handler.js"
import {
  GetUserConfigInputSchema,
  SavePipelineArtifactInputSchema,
  getUserConfig,
  savePipelineArtifact,
} from "./user-config.js"

/**
 * Creates a configured McpServer with all tools registered.
 * @param getUserId Optional function returning the authenticated user's UUID for the
 *   current request. When provided (HTTP mode), tool handlers use this instead of
 *   the userId parameter from the tool call. When absent (stdio mode), tools use
 *   their input parameters as-is.
 */
export function createMcpServer(getUserId?: () => string | undefined): McpServer {
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
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      }
    }
  )

  server.tool(
    "get_user_config",
    "Returns is_premium flag and storage_mode for the authenticated user.",
    // In HTTP mode userId is injected; keep schema for stdio compat
    GetUserConfigInputSchema.shape,
    async (input) => {
      const userId = getUserId?.() ?? input.userId
      if (!userId) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: "userId required" }) }],
          isError: true,
        }
      }
      const result = await getUserConfig(userId)
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
      }
    }
  )

  server.tool(
    "save_pipeline_artifact",
    "Persists a pipeline skill artifact to Supabase for premium users. Returns the inserted row id.",
    SavePipelineArtifactInputSchema.shape,
    async (input) => {
      try {
        const userId = getUserId?.() ?? input.userId
        if (!userId) throw new Error("userId required")
        const result = await savePipelineArtifact({ ...input, userId })
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        }
      } catch (err) {
        console.error("[synctropy] save_pipeline_artifact failed:", err)
        return {
          content: [{ type: "text", text: JSON.stringify({ error: String(err) }) }],
          isError: true,
        }
      }
    }
  )

  return server
}
