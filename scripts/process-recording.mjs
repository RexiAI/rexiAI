#!/usr/bin/env node
// Recording processor — the host-side half of the recording→billing pipeline.
//
// WHY THIS IS A SCRIPT AND NOT AN api/ FUNCTION: the booking app's backend is
// Vercel serverless functions (api/*.ts) — request-driven, ephemeral, with no
// access to the Jitsi host's filesystem and no ffprobe. A finished Jibri
// recording is a file on the Jitsi host that appears on Jibri's schedule, not on
// an HTTP request. So this processor runs ON the Jitsi host (co-located with
// Jibri + the recordings + ffprobe) and calls the existing serverless endpoint
// POST /api/bookings/recorded-billing over HTTP. It is the only non-serverless
// component the recording feature needs. See docs/recording-pipeline.md.
//
// Chain: Jibri MP4 → room (rexi-<hex>) → Stripe reservation session (the
// bookingId) → ffprobe minutes → POST recorded-billing → checkoutUrl.
//
// Trigger options (pick one):
//   1. Jibri finalize-script (automatic, once per recording) — set
//      JIBRI_FINALIZE_RECORDING_SCRIPT_PATH to a wrapper that calls:
//        node /path/to/rexiAI/scripts/process-recording.mjs --jibri-dir "$1"
//   2. Cron / manual scan of the recordings directory:
//        node scripts/process-recording.mjs --scan
//   3. Explicit one-off (most reliable for testing):
//        node scripts/process-recording.mjs --room rexi-<hex> --recording <mp4|dir>
//
// Env (loaded from .env): STRIPE_SECRET_KEY, RECORDED_BILLING_TOKEN,
//   APP_BASE_URL (where the api runs: `vercel dev` → http://localhost:3000, or
//   the deployed URL), RECORDINGS_DIR (default ~/.jitsi-meet-cfg/storage/jibri/recordings).
//
// Add --dry-run to ffprobe + resolve the reservation WITHOUT calling billing.

import { execFile } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const BILLING_PATH = '/api/bookings/recorded-billing'
const BILLED_MARKER = '.rexi-billed'
// The endpoint bounds a charge to quotedHours*60 + 15; reject obviously-wild
// durations here too so a corrupt recording never becomes a charge.
const MAX_MINUTES = 480

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env')
  if (process.env['STRIPE_SECRET_KEY'] || !existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
}

function arg(flag) {
  const i = process.argv.indexOf(flag)
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : null
}
function hasFlag(flag) {
  return process.argv.includes(flag)
}

function recordingsDir() {
  return (
    process.env['RECORDINGS_DIR'] ||
    path.join(homedir(), '.jitsi-meet-cfg', 'storage', 'jibri', 'recordings')
  )
}

// Newest .mp4 in a directory (Jibri writes one recording per session dir).
function findMp4(dir) {
  if (!existsSync(dir)) return null
  const st = statSync(dir)
  if (st.isFile()) return dir.endsWith('.mp4') ? dir : null
  const mp4s = readdirSync(dir)
    .filter((f) => f.endsWith('.mp4'))
    .map((f) => path.join(dir, f))
    .filter((f) => statSync(f).isFile())
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
  return mp4s[0] || null
}

// ffprobe → duration in whole minutes (ceil, min 1).
async function probeMinutes(file) {
  const { stdout } = await execFileAsync('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    file,
  ])
  const secs = Number.parseFloat(stdout.trim())
  if (!Number.isFinite(secs) || secs <= 0)
    throw new Error(`ffprobe returned no duration for ${file}`)
  return Math.max(1, Math.ceil(secs / 60))
}

// Does this recording have a real (non-silent) audio stream? The whole point of
// the pipeline is billable meetings-with-audio, so a silent capture is flagged.
async function hasAudioStream(file) {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v',
      'error',
      '-select_streams',
      'a',
      '-show_entries',
      'stream=codec_type',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      file,
    ])
    return stdout.includes('audio')
  } catch {
    return false
  }
}

// room (rexi-<hex>) → the Stripe reservation session. Bookings are Stripe
// Checkout Sessions (no DB); the room lives in metadata.join_url. We list recent
// sessions (newest-first) and filter by the room substring — robust to
// MEETING_BASE_URL differences, needs no Stripe Search query syntax, and
// deliberately no SDK: this script runs standalone on the Jitsi VPS with just
// node + fetch (no repo clone, no node_modules). A bounded page walk; the
// newest booking is always on page one.
const STRIPE_SESSIONS_URL = 'https://api.stripe.com/v1/checkout/sessions'
const RESERVATION_LOOKUP_MAX_PAGES = 10
async function findReservationByRoom(room) {
  const key = process.env['STRIPE_SECRET_KEY']
  let startingAfter = null
  for (let page = 0; page < RESERVATION_LOOKUP_MAX_PAGES; page++) {
    const params = new URLSearchParams({ limit: '100' })
    if (startingAfter) params.set('starting_after', startingAfter)
    const res = await fetch(`${STRIPE_SESSIONS_URL}?${params}`, {
      headers: { Authorization: `Bearer ${key}` },
    })
    if (!res.ok) throw new Error(`Stripe reservation lookup failed: HTTP ${res.status}`)
    const json = await res.json()
    const sessions = json.data || []
    for (const session of sessions) {
      const meta = session.metadata || {}
      const joinUrl = meta['join_url'] || ''
      if (!joinUrl.includes(room)) continue
      // A reservation we issued carries quoted_hours + reservation:'1'.
      if (!meta['quoted_hours'] && meta['reservation'] !== '1') continue
      return {
        bookingId: session.id,
        email: meta['email'] || session.customer_email || '',
        quotedHours: Number.parseInt(meta['quoted_hours'] || '0', 10),
        joinUrl,
      }
    }
    if (!json.has_more || sessions.length === 0) break
    startingAfter = sessions[sessions.length - 1].id
  }
  return null
}

async function postRecordedBilling({ bookingId, email, actualMinutes }) {
  const base = (process.env['APP_BASE_URL'] || 'http://localhost:3000').replace(/\/+$/, '')
  const token = process.env['RECORDED_BILLING_TOKEN']
  if (!token)
    throw new Error('RECORDED_BILLING_TOKEN is not set (endpoint fails closed without it)')
  const res = await fetch(`${base}${BILLING_PATH}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ bookingId, email, actualMinutes }),
  })
  const body = await res.json().catch(() => null)
  return { status: res.status, body }
}

// Authoritative room source: Jibri writes metadata.json beside the MP4 with
// {"meeting_url":"https://<host>/<room>", ...}. Take the last path segment.
function roomFromMetadata(mp4) {
  try {
    const metaPath = path.join(path.dirname(mp4), 'metadata.json')
    if (!existsSync(metaPath)) return null
    const meta = JSON.parse(readFileSync(metaPath, 'utf8'))
    const url = meta['meeting_url'] || meta['callUrl'] || ''
    if (!url) return null
    const seg = url.split('?')[0].replace(/\/+$/, '').split('/').pop()
    return seg || null
  } catch {
    return null
  }
}

function deriveRoom(explicitRoom, mp4) {
  if (explicitRoom) return explicitRoom
  const fromMeta = roomFromMetadata(mp4) // Jibri metadata.json — reliable
  if (fromMeta) return fromMeta
  // Fallback: real bookings use rexi-<hex> in the filename.
  const m = (mp4 || '').match(/rexi-[0-9a-f]{8,}/i)
  return m ? m[0] : null
}

async function processOne({ room, mp4, dryRun }) {
  console.log(`\n--- recording: ${mp4}`)
  const minutes = await probeMinutes(mp4)
  const audio = await hasAudioStream(mp4)
  console.log(`    duration: ${minutes} min | audio stream: ${audio ? 'yes' : 'NO (silent!)'}`)
  if (!audio) console.warn('    WARNING: no audio stream — recording is silent/video-only.')

  const resolvedRoom = deriveRoom(room, mp4)
  if (!resolvedRoom) {
    console.error('    SKIP: could not determine room. Re-run with --room rexi-<hex>.')
    return false
  }
  console.log(`    room: ${resolvedRoom}`)

  const reservation = await findReservationByRoom(resolvedRoom)
  if (!reservation) {
    console.error(`    SKIP: no Stripe reservation found for room ${resolvedRoom}.`)
    console.error(
      '          (Is this a real booking? Test rooms like /rexitest have no reservation.)'
    )
    return false
  }
  console.log(
    `    reservation: ${reservation.bookingId} | ${reservation.email} | quoted ${reservation.quotedHours}h`
  )

  if (minutes > MAX_MINUTES) {
    console.error(`    SKIP: ${minutes} min exceeds the ${MAX_MINUTES} min ceiling.`)
    return false
  }
  if (dryRun) {
    console.log('    DRY-RUN: not calling recorded-billing.')
    return true
  }

  const { status, body } = await postRecordedBilling({
    bookingId: reservation.bookingId,
    email: reservation.email,
    actualMinutes: minutes,
  })
  if (status !== 200) {
    console.error(`    BILLING FAILED: HTTP ${status} ${JSON.stringify(body)}`)
    return false
  }
  const amount = body?.amountCents ?? 0
  const url = body?.checkoutUrl
  console.log(
    `    BILLED: ${amount} cents (${body?.billableMinutes ?? 0} billable min, ${body?.freeMinutes ?? 0} free min applied)`
  )
  if (url) {
    console.log(`    checkoutUrl: ${url}`)
    console.log(
      '    → recorded-billing emails this link to the customer (needs a verified Resend domain); printed here as a record/fallback.'
    )
  } else {
    console.log('    → €0 (free hour covered it); no payment link needed.')
  }
  // Mark processed so --scan never double-bills (the endpoint is not idempotent).
  try {
    writeFileSync(
      path.join(path.dirname(mp4), BILLED_MARKER),
      `${new Date().toISOString()} ${minutes}min ${amount}c\n`
    )
  } catch {
    /* marker is best-effort */
  }
  return true
}

async function scan(dryRun) {
  const dir = recordingsDir()
  console.log(`Scanning ${dir} for unprocessed recordings…`)
  if (!existsSync(dir)) {
    console.error(`Recordings dir not found: ${dir}`)
    return
  }
  const sessions = readdirSync(dir).filter((d) => statSync(path.join(dir, d)).isDirectory())
  let processed = 0
  for (const s of sessions) {
    const sdir = path.join(dir, s)
    if (existsSync(path.join(sdir, BILLED_MARKER))) continue // already billed
    const mp4 = findMp4(sdir)
    if (!mp4) continue
    const ok = await processOne({ room: null, mp4, dryRun })
    if (ok) processed++
  }
  console.log(`\nDone. Processed ${processed} recording(s).`)
}

async function main() {
  loadEnv()
  if (!process.env['STRIPE_SECRET_KEY']) {
    console.error('STRIPE_SECRET_KEY not set (in env or .env). Cannot resolve reservations.')
    process.exit(1)
  }
  const dryRun = hasFlag('--dry-run')

  // Mode 1/3: explicit recording (file or dir) and/or room.
  const recording = arg('--recording')
  const jibriDir = arg('--jibri-dir') // Jibri finalize-script passes the recording dir
  const room = arg('--room')
  if (recording || jibriDir) {
    const target = recording || jibriDir
    const mp4 = findMp4(target)
    if (!mp4) {
      console.error(`No .mp4 found in/at: ${target}`)
      process.exit(1)
    }
    const ok = await processOne({ room, mp4, dryRun })
    process.exit(ok ? 0 : 1)
  }

  // Mode 2: scan.
  if (hasFlag('--scan')) {
    await scan(dryRun)
    return
  }

  console.log(`Usage:
  node scripts/process-recording.mjs --room rexi-<hex> --recording <mp4|dir> [--dry-run]
  node scripts/process-recording.mjs --jibri-dir <recording_dir> [--dry-run]   (Jibri finalize-script)
  node scripts/process-recording.mjs --scan [--dry-run]                        (cron/manual sweep)`)
  process.exit(2)
}

main().catch((e) => {
  console.error(`processor error: ${e instanceof Error ? e.stack : String(e)}`)
  process.exit(1)
})
