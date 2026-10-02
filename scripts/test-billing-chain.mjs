#!/usr/bin/env node
// Self-contained end-to-end test of the recording → billing chain.
//
// It avoids the fragile background-server dance by doing everything in ONE
// process: mounts the recorded-billing handler on an in-process http server,
// creates a REAL Stripe reservation (€0 Checkout Session) via the actual
// createCheckout code path, then runs scripts/process-recording.mjs against the
// existing Jibri recording. The processor POSTs to the in-process server, which
// creates the pro-rata payment Checkout Session and returns its checkoutUrl.
//
// Run: npx -y tsx scripts/test-billing-chain.mjs [room] [email]
//   room  — must match the recorded room (default: rexitest)
// Requires: .env with STRIPE_SECRET_KEY (sk_test), RECORDED_BILLING_TOKEN,
//   MEETING_BASE_URL; an existing Jibri recording for that room; ffprobe.
// TEST MODE ONLY — creates real objects in Stripe test mode.

import { spawn } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import http from 'node:http'
import { homedir } from 'node:os'
import path from 'node:path'

import Stripe from 'stripe'

import { createCheckout } from '../api/bookings/checkout.js'
import recordedBilling from '../api/bookings/recorded-billing.js'

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
loadEnv()

const room = process.argv[2] || 'rexitest'
const email = process.argv[3] || 'rexi-billing-test@example.com'
const PORT = Number(
  (process.env['APP_BASE_URL'] || 'http://localhost:3000').split(':').pop() || 3000
)

function recordingsDir() {
  return (
    process.env['RECORDINGS_DIR'] ||
    path.join(homedir(), '.jitsi-meet-cfg', 'storage', 'jibri', 'recordings')
  )
}
function findRecordingForRoom(dir, roomName) {
  if (!existsSync(dir)) return null
  for (const sess of readdirSync(dir)) {
    const sdir = path.join(dir, sess)
    if (!statSync(sdir).isDirectory()) continue
    const metaPath = path.join(sdir, 'metadata.json')
    if (existsSync(metaPath)) {
      try {
        const meta = JSON.parse(readFileSync(metaPath, 'utf8'))
        if ((meta['meeting_url'] || '').includes(`/${roomName}`)) {
          const mp4 = readdirSync(sdir).find((f) => f.endsWith('.mp4'))
          if (mp4) return path.join(sdir, mp4)
        }
      } catch {
        /* skip */
      }
    }
  }
  return null
}

// --- in-process api server (recorded-billing) ---
function makeRes(nodeRes) {
  let statusCode = 200
  return {
    status(c) {
      statusCode = c
      return this
    },
    json(o) {
      nodeRes.writeHead(statusCode, { 'content-type': 'application/json' })
      nodeRes.end(JSON.stringify(o))
    },
    setHeader(k, v) {
      nodeRes.setHeader(k, v)
    },
    end(...a) {
      nodeRes.end(...a)
    },
  }
}
const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST' || (req.url || '').split('?')[0] !== '/api/bookings/recorded-billing') {
    res.writeHead(404, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: { code: 'NOT_FOUND' } }))
    return
  }
  let raw = ''
  for await (const c of req) raw += c
  let body
  try {
    body = raw ? JSON.parse(raw) : {}
  } catch {
    body = {}
  }
  try {
    await recordedBilling(
      { method: req.method, headers: req.headers, body, query: {} },
      makeRes(res)
    )
  } catch (e) {
    res.writeHead(500, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: { code: 'HANDLER_ERROR', message: String(e) } }))
  }
})

const mp4 = findRecordingForRoom(recordingsDir(), room)
if (!mp4) {
  console.error(`No recording found for room "${room}" under ${recordingsDir()}`)
  process.exit(1)
}
if (!process.env['STRIPE_SECRET_KEY']?.startsWith('sk_test')) {
  console.error('Refusing: STRIPE_SECRET_KEY is not sk_test. Test-mode only.')
  process.exit(1)
}

const stripe = new Stripe(process.env['STRIPE_SECRET_KEY'])
const base = (process.env['MEETING_BASE_URL'] || 'https://host.docker.internal:8443').replace(
  /\/+$/,
  ''
)
const joinUrl = `${base}/${room}`

await new Promise((r) => server.listen(PORT, r))
console.log(`[e2e] api server on http://localhost:${PORT}`)
console.log(`[e2e] recording: ${mp4}`)
console.log(`[e2e] room=${room} email=${email} join_url=${joinUrl}\n`)

try {
  // 1. Burn the free hour so a short recording bills non-zero.
  const existing = await stripe.customers.list({ email, limit: 100 })
  if (!existing.data.some((c) => (c.metadata || {})['rexi_free_hour_used'] === '1')) {
    await stripe.customers.create({ email, metadata: { rexi_free_hour_used: '1' } })
    console.log('[e2e] burned free hour for', email)
  } else {
    console.log('[e2e] free hour already burned for', email)
  }

  // 2. Create the reservation through the real checkout code path.
  const mockReq = { headers: { host: `localhost:${PORT}` } }
  const mockRes = {
    status() {
      return this
    },
    json(o) {
      console.error('[e2e] checkout error:', JSON.stringify(o))
    },
  }
  const session = await createCheckout(email, '2026-09-20', '10:00', 1, mockReq, mockRes, joinUrl)
  if (!session?.id) {
    console.error('[e2e] FAILED to create reservation — see error above')
    process.exit(1)
  }
  console.log(`[e2e] reservation created: bookingId=${session.id}\n`)

  // 3. Run the real processor against the recording (it POSTs to our server).
  // Async spawn (NOT spawnSync): the in-process server needs the event loop
  // free to answer the processor's POST, so we must not block it.
  console.log('[e2e] --- processor output ---')
  const proc = spawn('node', ['scripts/process-recording.mjs', '--recording', mp4], {
    env: { ...process.env, APP_BASE_URL: `http://localhost:${PORT}` },
  })
  proc.stdout.on('data', (d) => process.stdout.write(d))
  proc.stderr.on('data', (d) => process.stderr.write(d))
  const code = await new Promise((r) => proc.on('close', r))
  console.log(`[e2e] --- processor exit=${code} ---`)
} finally {
  server.close()
}
