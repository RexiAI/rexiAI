#!/usr/bin/env node
// Minimal local runner for the Vercel-style serverless handlers in api/.
//
// WHY: the app's backend is api/*.ts (Vercel serverless, `export default
// handler(req,res)`). `vite dev` serves only the SPA, and the Vercel CLI isn't
// installed — so locally there is nothing to answer /api/*. This adapter mounts
// the handlers on a plain Node http server so the recording processor (and
// manual curl tests) can reach them. It is dev/test tooling, not for production
// (production runs the real Vercel serverless functions).
//
// Run: npx -y tsx scripts/dev-api-server.mjs   [PORT=3000]
// Then `npm run dev` (Vite) proxies /api/* here — see vite.config.ts. Open the
// Vite URL (http://localhost:5173) to browse the SPA against these handlers.
// tsx resolves the .ts handlers (and their .js→.ts internal imports).

import { existsSync, readFileSync } from 'node:fs'
import http from 'node:http'
import path from 'node:path'

import availabilityHandler from '../api/availability.js'
import bookingsHandler from '../api/bookings.js'
import recordedBilling from '../api/bookings/recorded-billing.js'
import configHandler from '../api/config.js'
import webhookHandler from '../api/stripe-webhook.js'

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
}
loadEnv()

// "METHOD /path" → handler. These are the endpoints the SPA and the recording
// processor call, so `vite dev` (proxied) and the processor both run against this.
const routes = {
  'GET /api/config': configHandler,
  'GET /api/availability': availabilityHandler,
  'POST /api/bookings': bookingsHandler,
  'POST /api/bookings/recorded-billing': recordedBilling,
  // Stripe webhook (forwarded by `stripe listen --forward-to localhost:3000/api/stripe-webhook`).
  // Needs the RAW body for signature verification — see bodyRaw below.
  'POST /api/stripe-webhook': webhookHandler,
}

// Returns both the raw body string (the Stripe webhook verifies its signature
// over the exact bytes) and the JSON-parsed form (every other handler).
async function readBody(req) {
  let raw = ''
  for await (const chunk of req) raw += chunk
  let parsed = {}
  if (raw) {
    try {
      parsed = JSON.parse(raw)
    } catch {
      parsed = {}
    }
  }
  return { raw, parsed }
}

// Express/Vercel-shaped res shim: the handlers use res.status(n).json(o) and
// res.setHeader(k,v).
function makeRes(nodeRes) {
  let statusCode = 200
  return {
    status(code) {
      statusCode = code
      return this
    },
    json(obj) {
      nodeRes.writeHead(statusCode, { 'content-type': 'application/json' })
      nodeRes.end(JSON.stringify(obj))
    },
    setHeader(k, v) {
      nodeRes.setHeader(k, v)
    },
    end(...args) {
      nodeRes.end(...args)
    },
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost')
  const urlPath = url.pathname
  const handler = routes[`${req.method} ${urlPath}`]
  if (!handler) {
    // Non-/api paths (e.g. the post-payment /booking/success redirect) belong to
    // the SPA on the Vite port — bounce the browser there so the success/cancel
    // view renders instead of 404ing on the API server.
    if (!urlPath.startsWith('/api')) {
      const spa = `http://localhost:${process.env.SPA_PORT || 5173}${urlPath}${url.search}`
      res.writeHead(302, { location: spa })
      res.end()
      return
    }
    res.writeHead(404, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: `${req.method} ${urlPath}` } }))
    return
  }
  const query = Object.fromEntries(url.searchParams)
  const { raw, parsed } = await readBody(req)
  const mockReq = {
    method: req.method,
    headers: req.headers,
    body: parsed,
    bodyRaw: raw,
    query,
  }
  try {
    await handler(mockReq, makeRes(res))
  } catch (e) {
    res.writeHead(500, { 'content-type': 'application/json' })
    res.end(
      JSON.stringify({
        error: { code: 'HANDLER_ERROR', message: e instanceof Error ? e.message : String(e) },
      })
    )
  }
})

const PORT = Number(process.env.PORT || 3000)
server.listen(PORT, () => {
  console.log(`[dev-api] http://localhost:${PORT}  routes: ${Object.keys(routes).join(', ')}`)
})
