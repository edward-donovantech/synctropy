import express, { Express, Request, Response } from "express"
import cors from "cors"
import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import { createMcpServer } from "./create-server.js"

let _authClient: SupabaseClient | null = null

function getAuthClient(): SupabaseClient {
  if (_authClient) return _authClient
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY required")
  _authClient = createClient(url, key)
  return _authClient
}

async function validateApiKey(key: string): Promise<string | null> {
  const serverKey = process.env.MCP_API_KEY
  if (!serverKey || key !== serverKey) return null
  // API key auth: userId stored in env (single-user personal server)
  return process.env.MCP_USER_ID ?? null
}

async function validateJwt(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null
  const token = authHeader.slice(7)
  const { data: { user }, error } = await getAuthClient().auth.getUser(token)
  if (error || !user) return null
  return user.id
}

async function authenticate(req: Request): Promise<string | null> {
  // API key via query param (for connector UI that can't set headers)
  const queryKey = typeof req.query.key === "string" ? req.query.key : null
  if (queryKey) return validateApiKey(queryKey)
  // JWT Bearer token (for Claude Code / direct API use)
  return validateJwt(req.headers.authorization)
}

export async function buildApp(): Promise<Express> {
  const app = express()
  app.use(cors())
  app.use(express.json())

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" })
  })

  app.post("/mcp", async (req: Request, res: Response) => {
    const userId = await authenticate(req)

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" })
      return
    }

    // Create a stateless transport + fresh server per request
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
    const server = createMcpServer(() => userId)

    try {
      await server.connect(transport)
      await transport.handleRequest(req, res, req.body)
    } catch (err) {
      console.error("[synctropy] MCP request error:", err)
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" })
      }
    }
  })

  return app
}

// Only start the server when this file is the entry point
if (require.main === module) {
  const PORT = parseInt(process.env.PORT ?? "3000", 10)
  buildApp().then((app) => {
    app.listen(PORT, () => {
      console.log(`[synctropy] HTTP MCP server listening on port ${PORT}`)
    })
  }).catch(console.error)
}
