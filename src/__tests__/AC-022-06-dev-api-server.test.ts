// AC-022-06-01 — characterization of the request handler in
// scripts/dev-api-server.mjs (the async arrow passed to http.createServer).
// The script starts listening on import, so it is imported once on a free port
// with every API handler replaced by a stub; requests then go over real HTTP.
import net from 'node:net'

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

const handlers = vi.hoisted(() => ({
  config: vi.fn(),
  availability: vi.fn(),
  bookings: vi.fn(),
  recorded: vi.fn(),
  webhook: vi.fn(),
}))
vi.mock('../../api/config.js', () => ({ default: handlers.config }))
vi.mock('../../api/availability.js', () => ({ default: handlers.availability }))
vi.mock('../../api/bookings.js', () => ({ default: handlers.bookings }))
vi.mock('../../api/bookings/recorded-billing.js', () => ({ default: handlers.recorded }))
vi.mock('../../api/stripe-webhook.js', () => ({ default: handlers.webhook }))

let base = ''
const savedEnv = { PORT: process.env['PORT'], SPA_PORT: process.env['SPA_PORT'] }

function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const probe = net.createServer().listen(0, () => {
      const { port } = probe.address() as net.AddressInfo
      probe.close(() => resolve(port))
    })
  })
}

beforeAll(async () => {
  const port = await freePort()
  process.env['PORT'] = String(port)
  process.env['SPA_PORT'] = '5999'
  base = `http://localhost:${port}`
  vi.spyOn(console, 'log').mockImplementation(() => {})
  await import('../../scripts/dev-api-server.mjs')
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(`${base}/api/none`)
      return
    } catch {
      await new Promise((r) => setTimeout(r, 20))
    }
  }
})

afterAll(() => {
  for (const [k, v] of Object.entries(savedEnv)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
})

describe('AC-022-06-01: dev-api-server request handler is pinned', () => {
  it('AC-022-06-01: a non-/api path with no route redirects 302 to the SPA port, keeping path and query', async () => {
    const res = await fetch(`${base}/booking/success?session=1`, { redirect: 'manual' })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('http://localhost:5999/booking/success?session=1')
  })

  it('AC-022-06-01: an unknown /api path answers 404 with a NOT_FOUND body naming method and path', async () => {
    const res = await fetch(`${base}/api/nope`, { method: 'PUT' })
    expect(res.status).toBe(404)
    expect(res.headers.get('content-type')).toBe('application/json')
    expect(await res.json()).toEqual({ error: { code: 'NOT_FOUND', message: 'PUT /api/nope' } })
  })

  it('AC-022-06-01: a method mismatch on a known path is also a 404', async () => {
    const res = await fetch(`${base}/api/config`, { method: 'POST' })
    expect(res.status).toBe(404)
  })

  it('AC-022-06-01: a routed GET gets query, method, and the res shim (status/json/setHeader)', async () => {
    handlers.config.mockImplementationOnce(async (req, res) => {
      res.setHeader('x-test', 'yes')
      res.status(201).json({ query: req.query, method: req.method, body: req.body })
    })
    const res = await fetch(`${base}/api/config?a=1&b=two`)
    expect(res.status).toBe(201)
    expect(res.headers.get('x-test')).toBe('yes')
    expect(await res.json()).toEqual({ query: { a: '1', b: 'two' }, method: 'GET', body: {} })
  })

  it('AC-022-06-01: a JSON body is parsed and the raw bytes are passed too', async () => {
    handlers.bookings.mockImplementationOnce(async (req, res) => {
      res.json({ body: req.body, raw: req.bodyRaw })
    })
    const res = await fetch(`${base}/api/bookings`, { method: 'POST', body: '{"x":1}' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ body: { x: 1 }, raw: '{"x":1}' })
  })

  it('AC-022-06-01: an invalid JSON body parses to {} but keeps the raw text', async () => {
    handlers.webhook.mockImplementationOnce(async (req, res) => {
      res.json({ body: req.body, raw: req.bodyRaw })
    })
    const res = await fetch(`${base}/api/stripe-webhook`, { method: 'POST', body: '{bad' })
    expect(await res.json()).toEqual({ body: {}, raw: '{bad' })
  })

  it('AC-022-06-01: a throwing handler answers 500 HANDLER_ERROR with the Error message', async () => {
    handlers.availability.mockImplementationOnce(async () => {
      throw new Error('kaput')
    })
    const res = await fetch(`${base}/api/availability`)
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: { code: 'HANDLER_ERROR', message: 'kaput' } })
  })

  it('AC-022-06-01: a non-Error throw is stringified in the 500 message', async () => {
    handlers.recorded.mockImplementationOnce(async () => {
      throw 'plain string'
    })
    const res = await fetch(`${base}/api/bookings/recorded-billing`, { method: 'POST' })
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({
      error: { code: 'HANDLER_ERROR', message: 'plain string' },
    })
  })
})
