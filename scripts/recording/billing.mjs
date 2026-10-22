// scripts/recording/billing.mjs — the recorded-billing stage (spec 004 Task 6).
//
// Behavior-for-behavior port of the billing half of scripts/process-recording.mjs
// (probeMinutes over the NEWEST mp4 — findMp4 semantics preserved, decision 5;
// MAX_MINUTES ceiling; POST /api/bookings/recorded-billing with Bearer
// RECORDED_BILLING_TOKEN; .rexi-billed written after 200). The two deltas the
// spec pins: (1) the stage skips via its own marker instead of the whole-dir
// skip (AC-004-39), and (2) missing credentials SKIP fail-closed instead of
// aborting the process (AC-004-40/41, decision 2 — the POST contract itself is
// unchanged; see api/bookings/recorded-billing.ts).

import { existsSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { listMp4Files } from './media.mjs'

export const BILLING_PATH = '/api/bookings/recorded-billing'
export const BILLED_MARKER = '.rexi-billed'
// The endpoint bounds a charge to quotedHours*60 + 15; reject obviously-wild
// durations here too so a corrupt recording never becomes a charge.
// (10-tasks.md decision 6: this ceiling gates BILLING ONLY — a long recording
// still transcribes and analyzes.)
export const MAX_MINUTES = 480

const STRIPE_SESSIONS_URL = 'https://api.stripe.com/v1/checkout/sessions'
const RESERVATION_LOOKUP_MAX_PAGES = 10

// Newest .mp4 in a directory (Jibri writes one recording per session dir).
// Kept behavior-for-behavior compatible with the old entry script: billing
// probes THIS file; the multi-mp4 collection is a transcription-only concern.
export function findMp4(dir) {
  if (!existsSync(dir)) return null
  const st = statSync(dir)
  if (st.isFile()) return dir.endsWith('.mp4') ? dir : null
  const mp4s = listMp4Files(dir)
  mp4s.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
  return mp4s[0] || null
}

// One ffprobe argv shape for every probe: silent logging, chosen entries,
// raw-key stdout, probed file last (harnesses key on the entry token + last arg).
function ffprobe(runner, entries, file) {
  return runner('ffprobe', [
    '-v',
    'error',
    ...entries,
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    file,
  ])
}

// ffprobe → duration in whole minutes (ceil, min 1), via the injected runner.
export async function probeMinutes(runner, file) {
  const { stdout } = await ffprobe(runner, ['-show_entries', 'format=duration'], file)
  const secs = Number.parseFloat(String(stdout).trim())
  if (!Number.isFinite(secs) || secs <= 0)
    throw new Error(`ffprobe returned no duration for ${file}`)
  return Math.max(1, Math.ceil(secs / 60))
}

// Does this recording have a real (non-silent) audio stream? The whole point of
// the pipeline is billable meetings-with-audio, so a silent capture is flagged.
export async function hasAudioStream(runner, file) {
  try {
    const { stdout } = await ffprobe(
      runner,
      ['-select_streams', 'a', '-show_entries', 'stream=codec_type'],
      file
    )
    return String(stdout).includes('audio')
  } catch {
    return false
  }
}

/** One page of Checkout Sessions — deliberately no SDK (module header). */
async function fetchSessionsPage({ fetch, key, startingAfter }) {
  const params = new URLSearchParams({ limit: '100' })
  if (startingAfter) params.set('starting_after', startingAfter)
  const res = await fetch(`${STRIPE_SESSIONS_URL}?${params}`, {
    headers: { Authorization: `Bearer ${key}` },
  })
  if (!res.ok) throw new Error(`Stripe reservation lookup failed: HTTP ${res.status}`)
  return res.json()
}

/** A reservation we issued carries this room's join_url + quoted_hours/reservation. */
function isReservationForRoom(meta, room) {
  const joinUrl = meta['join_url'] || ''
  return joinUrl.includes(room) && (Boolean(meta['quoted_hours']) || meta['reservation'] === '1')
}

function reservationFields(session, meta) {
  const email = meta['email'] || session.customer_email || ''
  const quotedHours = Number.parseInt(meta['quoted_hours'] || '0', 10)
  const joinUrl = meta['join_url'] || ''
  return { bookingId: session.id, email, quotedHours, joinUrl }
}

function reservationFromSession(session, room) {
  const meta = session.metadata || {}
  if (!isReservationForRoom(meta, room)) return null
  return reservationFields(session, meta)
}

function findReservationInSessions(sessions, room) {
  for (const session of sessions) {
    const reservation = reservationFromSession(session, room)
    if (reservation) return reservation
  }
  return null
}

/**
 * room (rexi-<hex>) → the Stripe reservation session — ported unchanged:
 * bookings are Stripe Checkout Sessions (no DB), the room lives in
 * metadata.join_url; bounded newest-first page walk; deliberately no SDK.
 */
export async function findReservationByRoom({ room, env, fetch }) {
  const key = env['STRIPE_SECRET_KEY']
  let startingAfter = null
  for (let page = 0; page < RESERVATION_LOOKUP_MAX_PAGES; page++) {
    const json = await fetchSessionsPage({ fetch, key, startingAfter })
    const sessions = json.data || []
    const found = findReservationInSessions(sessions, room)
    if (found) return found
    if (!json.has_more || sessions.length === 0) break
    startingAfter = sessions[sessions.length - 1].id
  }
  return null
}

export async function postRecordedBilling({ env, fetch, bookingId, email, actualMinutes }) {
  const base = (env['APP_BASE_URL'] || 'http://localhost:3000').replace(/\/+$/, '')
  const token = env['RECORDED_BILLING_TOKEN']
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

/** Why the billing stage must not POST — pure, so the skip order is testable. */
export function billingSkipReason({ alreadyBilled, hasCredentials, attribution, minutes }) {
  if (alreadyBilled) return 'already-billed'
  if (!hasCredentials) return 'no-credentials'
  if (!attribution) return 'unattributed'
  if (minutes > MAX_MINUTES) return 'over-ceiling'
  return null
}

// reason → the exact log line (level + text), one lookup instead of a
// discriminator chain (CODING_CONVENTIONS §SOLID: dispatch on ≥4 cases → lookup).
const SKIP_MESSAGES = {
  'already-billed': {
    level: 'log',
    text: () => '    SKIP billing: .rexi-billed marker (already billed).',
  },
  'no-credentials': {
    level: 'log',
    text: () =>
      '    SKIP billing: no STRIPE_SECRET_KEY/RECORDED_BILLING_TOKEN — fail closed, no POST attempted.',
  },
  unattributed: {
    level: 'error',
    text: ({ room }) =>
      `    Unattributed recording: no Stripe reservation for room ${room} — billing skipped.`,
  },
  'over-ceiling': {
    level: 'error',
    text: ({ minutes }) => `    SKIP: ${minutes} min exceeds the ${MAX_MINUTES} min ceiling.`,
  },
}

function logSkip(reason, ctx, log) {
  const entry = SKIP_MESSAGES[reason]
  log[entry.level](entry.text(ctx))
}

/** Numeric field of the endpoint body with 0 fallback (fields may be absent). */
function billedNum(body, key) {
  return body?.[key] ?? 0
}

/** The BILLED summary line; returns the amount carried into the marker. */
function logBilledSummary(body, log) {
  const amount = billedNum(body, 'amountCents')
  const billable = billedNum(body, 'billableMinutes')
  const free = billedNum(body, 'freeMinutes')
  log.log(`    BILLED: ${amount} cents (${billable} billable min, ${free} free min applied)`)
  return amount
}

/** Which follow-up line the 200 body implies: a link, a disabled bill, or free coverage. */
function logBillingNextStep(body, log) {
  if (body?.checkoutUrl) {
    log.log(`    checkoutUrl: ${body.checkoutUrl}`)
    log.log(
      '    → recorded-billing emails this link to the customer (needs a verified Resend domain); printed here as a record/fallback.'
    )
    return
  }
  if (body?.billingDisabled) {
    log.log('    → billing DISABLED (BILLING_ENABLED=false): session is free, nothing charged.')
    return
  }
  log.log('    → €0 (free hour covered it); no payment link needed.')
}

// Mark processed so a re-run never double-bills (the endpoint is not idempotent).
function markBilled(dir, minutes, amount) {
  try {
    writeFileSync(
      path.join(dir, BILLED_MARKER),
      `${new Date().toISOString()} ${minutes}min ${amount}c\n`
    )
  } catch {
    /* marker is best-effort */
  }
}

/**
 * Run the billing stage for one session directory. Returns a verdict:
 * 'skipped' | 'planned' | 'billed' | 'failed'. A POST failure NEVER throws —
 * the caller maps it to the one-off exit code — and never marks (AC-004-46).
 */
export async function runBillingStage({
  dir,
  minutes,
  room,
  attribution,
  env,
  fetch,
  dryRun,
  log,
}) {
  const alreadyBilled = existsSync(path.join(dir, BILLED_MARKER))
  const hasCredentials = Boolean(env['STRIPE_SECRET_KEY'] && env['RECORDED_BILLING_TOKEN'])
  const reason = billingSkipReason({ alreadyBilled, hasCredentials, attribution, minutes })
  if (reason) {
    logSkip(reason, { room, minutes }, log)
    return 'skipped'
  }

  log.log(
    `    reservation: ${attribution.bookingId} | ${attribution.email} | quoted ${attribution.quotedHours}h`
  )
  if (dryRun) {
    log.log('    DRY-RUN: not calling recorded-billing.')
    return 'planned'
  }

  const { status, body } = await postRecordedBilling({
    env,
    fetch,
    bookingId: attribution.bookingId,
    email: attribution.email,
    actualMinutes: minutes,
  })
  if (status !== 200) {
    log.error(`    BILLING FAILED: HTTP ${status} ${JSON.stringify(body)}`)
    return 'failed'
  }
  const amount = logBilledSummary(body, log)
  logBillingNextStep(body, log)
  markBilled(dir, minutes, amount)
  return 'billed'
}
