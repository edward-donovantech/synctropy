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

async function validateToken(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null
  const token = authHeader.slice(7)
  const { data: { user }, error } = await getAuthClient().auth.getUser(token)
  if (error || !user) return null
  return user.id
}

export async function buildApp(): Promise<Express> {
  const app = express()
  app.use(cors())
  app.use(express.json())

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" })
  })

  app.post("/mcp", async (req: Request, res: Response) => {
    const userId = await validateToken(req.headers.authorization)

    if (!userId) {
      const missing = !req.headers.authorization
      res.status(401).json({ error: missing ? "Missing Authorization header" : "Unauthorized" })
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
