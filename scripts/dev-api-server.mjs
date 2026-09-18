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
// tsx resolves the .ts handlers (and their .js→.ts internal imports).

import { existsSync, readFileSync } from 'node:fs'
import http from 'node:http'
import path from 'node:path'

import recordedBilling from '../api/bookings/recorded-billing.js'

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

// "METHOD /path" → handler. Add more api/ routes here as needed.
const routes = {
  'POST /api/bookings/recorded-billing': recordedBilling,
}

async function readBody(req) {
  let raw = ''
  for await (const chunk of req) raw += chunk
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
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
  const urlPath = (req.url || '/').split('?')[0]
  const handler = routes[`${req.method} ${urlPath}`]
  if (!handler) {
    res.writeHead(404, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: `${req.method} ${urlPath}` } }))
    return
  }
  const mockReq = { method: req.method, headers: req.headers, body: await readBody(req), query: {} }
  try {
    await handler(mockReq, makeRes(res))
  } catch (e) {
    res.writeHead(500, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: { code: 'HANDLER_ERROR', message: e instanceof Error ? e.message : String(e) } }))
  }
})

const PORT = Number(process.env.PORT || 3000)
server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[dev-api] http://localhost:${PORT}  routes: ${Object.keys(routes).join(', ')}`)
})
