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
      .set('Accept', 'application/json, text/event-stream')
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
