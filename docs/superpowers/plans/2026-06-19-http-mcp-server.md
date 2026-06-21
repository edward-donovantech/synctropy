# HTTP MCP Server Transport — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an HTTP transport to the MCP server so it can be hosted remotely and connected to by Claude Desktop/Code over HTTPS, with Supabase JWT authentication.

**Architecture:** A new `http-server.ts` entry point wraps the existing tool definitions in an Express app using `StreamableHTTPServerTransport` (stateless mode). Each request is authenticated by validating the Supabase JWT from the `Authorization` header; the extracted `userId` is stored in a request-scoped map and injected into tool calls so callers don't need to pass it explicitly. The existing `index.ts` (stdio) is untouched — both entry points share the same tool registration logic via a new `create-server.ts` factory.

**Tech Stack:** Express 4, `@modelcontextprotocol/sdk` StreamableHTTPServerTransport, `@supabase/supabase-js` auth.getUser(), Vitest, Railway (deployment)

## Global Constraints

- `"type": "commonjs"` in `mcp-server/package.json` — all imports use `require`-compatible CJS syntax with `.js` extensions
- MCP SDK import paths: `@modelcontextprotocol/sdk/server/streamableHttp.js`, `@modelcontextprotocol/sdk/server/mcp.js`
- Never throw unhandled errors to the transport — catch and return `isError: true`
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` env vars already present; add `PORT` (default 3000) and `SUPABASE_ANON_KEY` (for auth.getUser validation)
- Tool handlers in HTTP mode must extract `userId` from the validated JWT, NOT from tool input parameters — this is the key security difference from stdio mode
- Stateless transport mode (`sessionIdGenerator: undefined`) — no in-memory session state
- TypeScript strict mode, ES2022 target, Node16 module resolution

---

### Task 1: Extract shared server factory

**Files:**
- Create: `mcp-server/src/create-server.ts`
- Modify: `mcp-server/src/index.ts`

**Interfaces:**
- Produces: `createMcpServer(getUserId?: () => string | undefined): McpServer` — factory that registers all three tools; `getUserId` is an optional per-call context function used only in HTTP mode

- [ ] **Step 1: Create `mcp-server/src/create-server.ts`**

```typescript
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
```

- [ ] **Step 2: Update `mcp-server/src/index.ts` to use factory**

Replace the entire file:

```typescript
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { createMcpServer } from "./create-server.js"

async function main() {
  const server = createMcpServer()
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch(console.error)
```

- [ ] **Step 3: Build to verify no TypeScript errors**

```bash
cd mcp-server && npm run build 2>&1
```

Expected: clean output, `dist/` updated with `create-server.js`

- [ ] **Step 4: Run existing tests — confirm still passing**

```bash
cd mcp-server && npm test 2>&1 | tail -10
```

Expected: 58 tests pass

- [ ] **Step 5: Commit**

```bash
git add mcp-server/src/create-server.ts mcp-server/src/index.ts
git commit -m "refactor: extract shared McpServer factory for stdio/http reuse"
```

---

### Task 2: HTTP server entry point with JWT auth

**Files:**
- Create: `mcp-server/src/http-server.ts`
- Modify: `mcp-server/package.json`

**Interfaces:**
- Consumes: `createMcpServer(getUserId)` from `./create-server.js` (Task 1)
- Produces: Express app listening on `PORT` env var (default 3000), POST `/mcp` endpoint requiring `Authorization: Bearer <supabase-jwt>`

- [ ] **Step 1: Install dependencies**

```bash
cd mcp-server && npm install express cors
npm install --save-dev @types/express @types/cors
```

Expected: packages added to `node_modules/`, `package.json` updated

- [ ] **Step 2: Write failing integration test**

Create `mcp-server/src/__tests__/http-server.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import request from 'supertest'

// Mock supabase before importing http-server
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(async (token: string) => {
        if (token === 'valid-token') {
          return { data: { user: { id: 'user-uuid-123' } }, error: null }
        }
        return { data: { user: null }, error: { message: 'Invalid token' } }
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: null, error: null })) })) })),
    })),
  })),
}))

process.env.SUPABASE_URL = 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'

const { buildApp } = await import('../http-server.js')

describe('HTTP MCP server', () => {
  let app: Express.Application

  beforeEach(async () => {
    app = await buildApp()
  })

  it('rejects requests without Authorization header', async () => {
    const res = await request(app).post('/mcp').send({})
    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/missing/i)
  })

  it('rejects requests with invalid token', async () => {
    const res = await request(app)
      .post('/mcp')
      .set('Authorization', 'Bearer invalid-token')
      .send({})
    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/unauthorized/i)
  })

  it('accepts requests with valid token and passes to MCP transport', async () => {
    // A valid JSON-RPC initialize request
    const res = await request(app)
      .post('/mcp')
      .set('Authorization', 'Bearer valid-token')
      .set('Content-Type', 'application/json')
      .send({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0' },
        },
      })
    // MCP transport handles it — expect 200 (not 401)
    expect(res.status).toBe(200)
  })

  it('GET /health returns 200', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })
})
```

- [ ] **Step 3: Install supertest**

```bash
cd mcp-server && npm install --save-dev supertest @types/supertest
```

- [ ] **Step 4: Run tests — confirm they fail**

```bash
cd mcp-server && npm test -- --reporter=verbose 2>&1 | grep -A5 "HTTP MCP"
```

Expected: FAIL with "Cannot find module '../http-server.js'"

- [ ] **Step 5: Create `mcp-server/src/http-server.ts`**

```typescript
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
```

- [ ] **Step 6: Run tests — confirm they pass**

```bash
cd mcp-server && npm test -- --reporter=verbose 2>&1 | tail -15
```

Expected: all tests pass (including 4 new HTTP server tests)

- [ ] **Step 7: Add build scripts to `mcp-server/package.json`**

Add to the `"scripts"` section:

```json
"start": "node dist/index.js",
"start:http": "node dist/http-server.js",
```

- [ ] **Step 8: Update `tsconfig.json` to include http-server in build**

The current config already includes all of `src/**/*`, so `http-server.ts` is automatically compiled. Verify the build output includes it:

```bash
cd mcp-server && npm run build 2>&1 && ls dist/http-server.js
```

Expected: `dist/http-server.js` exists

- [ ] **Step 9: Commit**

```bash
git add mcp-server/src/http-server.ts mcp-server/src/__tests__/http-server.test.ts mcp-server/package.json mcp-server/package-lock.json
git commit -m "feat: add Express HTTP transport for hosted MCP server"
```

---

### Task 3: Railway deployment config

**Files:**
- Create: `mcp-server/Dockerfile`
- Create: `mcp-server/.env.example`
- Create: `railway.json` (repo root)

**Interfaces:**
- Consumes: `dist/http-server.js` built in Task 2
- Produces: Deployable Railway service running `node dist/http-server.js`

- [ ] **Step 1: Create `mcp-server/Dockerfile`**

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY dist/ ./dist/

ENV PORT=3000
EXPOSE 3000

CMD ["node", "dist/http-server.js"]
```

- [ ] **Step 2: Create `mcp-server/.env.example`**

```bash
# Supabase project credentials
SUPABASE_URL=https://ukslyhpeuqkfusyvghzi.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_ANON_KEY=your-anon-key-here

# Server port (Railway sets this automatically)
PORT=3000
```

- [ ] **Step 3: Create `railway.json` at repo root**

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "mcp-server/Dockerfile",
    "buildCommand": "cd mcp-server && npm ci && npm run build"
  },
  "deploy": {
    "startCommand": "node dist/http-server.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

- [ ] **Step 4: Add `.dockerignore` to mcp-server**

Create `mcp-server/.dockerignore`:

```
node_modules
src
*.test.*
tsconfig.json
.env
.env.local
```

- [ ] **Step 5: Verify Docker build locally (optional — skip if Docker unavailable)**

```bash
cd mcp-server && npm run build
docker build -t synctropy-mcp . 2>&1 | tail -5
```

Expected: Successfully built image

- [ ] **Step 6: Commit**

```bash
git add mcp-server/Dockerfile mcp-server/.dockerignore mcp-server/.env.example railway.json
git commit -m "feat: add Railway deployment config for HTTP MCP server"
```

---

## Deployment (post-implementation)

After the plan tasks are complete:

1. **Push commits** to `origin/main`
2. **Create Railway project** at railway.app → New Project → Deploy from GitHub → select `edward-donovantech/synctropy`
3. **Set root directory** to `mcp-server/` in Railway service settings
4. **Set env vars** in Railway dashboard:
   - `SUPABASE_URL` = `https://ukslyhpeuqkfusyvghzi.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = (from Supabase dashboard → Settings → API)
   - `SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (already in frontend/.env.local)
5. **Add custom domain** (e.g. `mcp.yourdomain.com`) in Railway → Settings → Domains
6. **Connect from Claude Desktop** — add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "synctropy": {
      "type": "http",
      "url": "https://mcp.yourdomain.com/mcp",
      "headers": {
        "Authorization": "Bearer <user-supabase-jwt>"
      }
    }
  }
}
```

The JWT can be retrieved from the browser after login: `localStorage.getItem('sb-ukslyhpeuqkfusyvghzi-auth-token')` → parse → `access_token`.

---

## Spec Coverage Check

| Requirement | Task |
|---|---|
| HTTP transport via StreamableHTTPServerTransport | Task 2 |
| Supabase JWT auth on every request | Task 2 |
| userId extracted from JWT, not tool params | Task 1 + Task 2 |
| Existing stdio transport untouched | Task 1 |
| Shared tool definitions (no duplication) | Task 1 |
| Health check endpoint | Task 2 |
| Railway deployment config | Task 3 |
| Environment variable documentation | Task 3 |
| 401 on missing/invalid token | Task 2 (tested) |
| Stateless transport (no in-memory sessions) | Task 2 |
