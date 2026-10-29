// scripts/recording/pipeline.mjs — per-session-directory stage orchestration (spec 004 Task 6).
//
// Three INDEPENDENT stages, each with its own marker (decision 4):
//   billing  .rexi-billed      — skipped iff marker (today's whole-dir skip becomes per-stage)
//   transcription .rexi-transcribed — runs even on a billed-only directory (AC-004-39)
//   insight+delivery .rexi-analyzed  — brief write AND issue delivery must both succeed
// Stage failures propagate to the caller; --scan contains them per directory
// (decision 13 — a completed sweep exits 0 even when individual dirs failed).

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { homedir } from 'node:os'

import { assessFreeSpace } from './disk.mjs'
import { organizeSessionDir } from './folder.mjs'
import { collectSessionMp4s } from './media.mjs'
import { transcribe, TRANSCRIBED_MARKER } from './transcribe.mjs'
import { runInsightStage, ANALYZED_MARKER } from './insight.mjs'
import { deliverInsightIssue } from './deliver.mjs'
import {
  BILLED_MARKER,
  findMp4,
  probeMinutes,
  hasAudioStream,
  findReservationByRoom,
  runBillingStage,
} from './billing.mjs'

export const MARKERS = [BILLED_MARKER, TRANSCRIBED_MARKER, ANALYZED_MARKER]

export function recordingsDirFrom(env) {
  return (
    env['RECORDINGS_DIR'] ||
    path.join(homedir(), '.jitsi-meet-cfg', 'storage', 'jibri', 'recordings')
  )
}

// The issue title date is the RECORDING SESSION date, parsed from Jibri's
// <room>_<YYYY-MM-DD-HH-MM-SS>.mp4 name (decision 7) — never the processing
// date, so re-runs produce a stable title the idempotency search can match.
export function sessionDateFromMp4(filePath) {
  const m = path.basename(String(filePath)).match(/_(\d{4}-\d{2}-\d{2})-\d{2}-\d{2}-\d{2}/)
  if (m) return m[1]
  return new Date().toISOString().slice(0, 10) // non-Jibri name (manual import): processing date
}

/** Meeting URL → the room: last path segment, query string and trailing slashes stripped. */
function roomFromMeetingUrl(url) {
  if (!url) return null
  const seg = url.split('?')[0].replace(/\/+$/, '').split('/').pop()
  return seg || null
}

// Authoritative room source: Jibri writes metadata.json beside the MP4 with
// {"meeting_url":"https://<host>/<room>", ...}. Take the last path segment.
function roomFromMetadata(mp4) {
  try {
    const metaPath = path.join(path.dirname(mp4), 'metadata.json')
    if (!existsSync(metaPath)) return null
    const meta = JSON.parse(readFileSync(metaPath, 'utf8'))
    return roomFromMeetingUrl(meta['meeting_url'] || meta['callUrl'] || '')
  } catch {
    return null
  }
}

function deriveRoom(explicitRoom, mp4) {
  if (explicitRoom) return explicitRoom
  const fromMeta = roomFromMetadata(mp4) // Jibri metadata.json — reliable
  if (fromMeta) return fromMeta
  // Fallback: real bookings use rexi-<hex> in the filename.
  const m = String(mp4 || '').match(/rexi-[0-9a-f]{8,}/i)
  return m ? m[0] : null
}

function allStagesComplete(dir) {
  return MARKERS.every((m) => existsSync(path.join(dir, m)))
}

/** Error → message text, tolerating non-Error throws (the containment + best-effort paths). */
function errMessage(err) {
  return err instanceof Error ? err.message : String(err)
}

async function resolveAttribution({ room, env, deps, log }) {
  if (!env['STRIPE_SECRET_KEY']) return null
  try {
    return await findReservationByRoom({ room, env, fetch: deps.fetch })
  } catch (err) {
    // Attribution is best-effort (AC-004-41): a failed lookup is NOT fatal —
    // the recording is unattributed, transcription proceeds, billing fails closed.
    log.error(`    attribution lookup failed: ${errMessage(err)}`)
    return null
  }
}

async function transcriptionStage({ dir, mp4s, env, deps, dryRun, log }) {
  if (existsSync(path.join(dir, TRANSCRIBED_MARKER))) {
    log.log('    SKIP transcription: .rexi-transcribed marker.')
    return
  }
  if (dryRun) {
    log.log(
      `    DRY-RUN: would extract audio from ${mp4s.length} mp4(s) + run bl speech recognize.`
    )
    return
  }
  log.log('    TRANSCRIBE: extracting audio, then bl speech recognize…')
  await transcribe({ sessionDir: dir, mp4s, runner: deps.runner, env })
}

async function insightStage({ dir, context, deps, dryRun, log, env }) {
  if (existsSync(path.join(dir, ANALYZED_MARKER))) {
    log.log('    SKIP insight: .rexi-analyzed marker.')
    return
  }
  if (dryRun) {
    log.log(
      '    DRY-RUN: would run local ollama chat, write customer-brief.md, open the insight issue.'
    )
    return
  }
  log.log('    INSIGHT: local ollama chat → customer-brief.md → GitHub issue…')
  const transcriptPath = path.join(dir, 'transcript.json')
  await runInsightStage({
    sessionDir: dir,
    transcriptPath,
    context,
    fetch: deps.fetch,
    env,
    deliver: (args) => deliverInsightIssue({ ...args, runner: deps.runner }),
  })
}

/** Which MP4 this dir offers, if any: billing's newest probe target, or the first collected. */
function collectSessionFacts(dir) {
  const billingTarget = findMp4(dir)
  const mp4s = collectSessionMp4s(dir)
  const target = billingTarget || mp4s[0]
  if (!target) return null
  return { target, mp4s }
}

/** ffprobe the billing target: duration + audio, with the established log lines. */
async function probeSession({ target, deps, log }) {
  log.log(`\n--- recording: ${target}`)
  const minutes = await probeMinutes(deps.runner, target)
  const audio = await hasAudioStream(deps.runner, target)
  log.log(`    duration: ${minutes} min | audio stream: ${audio ? 'yes' : 'NO (silent!)'}`)
  if (!audio) log.warn('    WARNING: no audio stream — recording is silent/video-only.')
  return { minutes, audio }
}

/** What the brief needs: room + session date + best-effort attribution, never fabricated. */
export function insightContext({ room, mp4s, target, attribution }) {
  return {
    room,
    sessionDate: sessionDateFromMp4(mp4s[0] || target),
    clientEmail: attribution?.email,
    // Spec 008 Task 7: mirrors clientEmail, so a reservation without a name
    // yields undefined here and nothing downstream has to guard for an object
    // that is missing the key.
    clientName: attribution?.name,
    bookingId: attribution?.bookingId,
    unattributed: !attribution,
  }
}

/** Explicit --room, then Jibri metadata, then the filename pattern — abort if none. */
function resolveRoomOrThrow({ dir, room, target, log }) {
  const resolvedRoom = deriveRoom(room, target)
  if (!resolvedRoom) {
    log.error('    SKIP: could not determine room. Re-run with --room rexi-<hex>.')
    throw new Error(`could not determine room for ${dir}`)
  }
  log.log(`    room: ${resolvedRoom}`)
  return resolvedRoom
}

/**
 * Run every stage for one session directory. Returns { ok, dir } where ok=false
 * only when the billing stage was ATTEMPTED and failed (today's exit-code meaning,
 * preserved for the billing-enabled path); all other skip verdicts are success.
 *
 * `dir` is the directory the run ends in: the organise step (spec 008 Task 8)
 * renames the session in place to `<name>_<date>` as the LAST act, so it is
 * returned rather than assumed.
 *
 * @param {{ dir: string, room?: string|null, dryRun?: boolean,
 *   env: Record<string, string|undefined>,
 *   deps: { runner: Function, fetch: Function },
 *   log?: { log: Function, warn: Function, error: Function } }} opts
 */
export async function processSessionDir({ dir, room, dryRun = false, env, deps, log = console }) {
  const facts = collectSessionFacts(dir)
  if (!facts) return { ok: true, dir }
  if (allStagesComplete(dir)) {
    log.log(`  ${dir}: all stages already marked — nothing to do.`)
    return { ok: true, dir }
  }

  const { target, mp4s } = facts
  const { minutes, audio } = await probeSession({ target, deps, log })
  const resolvedRoom = resolveRoomOrThrow({ dir, room, target, log })

  const attribution = await resolveAttribution({ room: resolvedRoom, env, deps, log })
  const billing = await runBillingStage({
    dir,
    minutes,
    room: resolvedRoom,
    attribution,
    env,
    fetch: deps.fetch,
    dryRun,
    log,
  })
  const ok = billing !== 'failed'
  const context = insightContext({ room: resolvedRoom, mp4s, target, attribution })

  // A silent recording never transcribes or analyzes (AC-004-43); the existing
  // warning path and the billing behavior above are unchanged.
  if (audio) {
    await transcriptionStage({ dir, mp4s, env, deps, dryRun, log })
    await insightStage({ dir, context, deps, dryRun, log, env })
  }

  // Organise LAST (spec 008 Task 8): only a recording whose stages have run earns
  // the <name>_<date> rename, and a throw here leaves the directory unmarked —
  // sweepSessionDirs contains it and the next scan retries.
  const organisedDir = organizeSessionDir({
    dir,
    attribution,
    sessionDate: context.sessionDate,
    dryRun,
    log,
  })
  return { ok, dir: organisedDir }
}

/**
 * Sweep the recordings root. Per-directory containment (decision 13): a
 * throwing dir is logged with its path, counted in the failure summary, left
 * unmarked (eligible next scan); the sweep itself returns normally — the CLI
 * scan mode exits 0. Only an unreadable recordings root is fatal (today's
 * behavior, logged and returned).
 *
 * @param {{ rootDir: string, dryRun?: boolean,
 *   env: Record<string, string|undefined>,
 *   deps: { runner: Function, fetch: Function },
 *   log?: { log: Function, warn: Function, error: Function } }} opts
 */
export async function scanAll({ rootDir, dryRun = false, env, deps, log = console }) {
  log.log(`Scanning ${rootDir} for unprocessed recordings…`)
  if (!existsSync(rootDir)) {
    log.error(`Recordings dir not found: ${rootDir}`)
    return { processed: 0, failed: [] }
  }
  // Spec-005 Task 2 disk guard: scan mode ONLY (one-off modes never reach it),
  // after the root-existence check and before any session dir is processed.
  // --dry-run gets the same verdicts (decision 6: dry-run reports what a real
  // run would do). Undeterminable free space fails open (decision 3).
  const guard = await diskGuard({ rootDir, env, deps, log })
  if (guard.skipRun) return { processed: 0, failed: [] }
  const { processed, failed } = await sweepSessionDirs({ rootDir, env, deps, dryRun, log })
  log.log(`\nDone. Processed ${processed} recording(s).`)
  if (failed.length > 0) {
    log.log(`Failures: ${failed.length} recording(s) left unmarked and retried on the next scan.`)
  }
  return { processed, failed }
}

/** Apply one disk-guard verdict to the log; returns whether to skip the run. */
async function diskGuard({ rootDir, env, deps, log }) {
  const verdict = await assessFreeSpace({ dir: rootDir, env, runner: deps.runner })
  if (verdict.level === 'error') {
    log.error(verdict.message)
    return { skipRun: true }
  }
  if (verdict.message) log.warn(verdict.message) // warn verdicts continue (fail-open included)
  return { skipRun: false }
}

async function sweepSessionDirs({ rootDir, env, deps, dryRun, log }) {
  const sessions = readdirSync(rootDir).filter((d) => statSync(path.join(rootDir, d)).isDirectory())
  const failed = []
  let processed = 0
  for (const s of sessions) {
    const dir = path.join(rootDir, s)
    if (!findMp4(dir)) continue // no recording yet (Jibri still writing)
    try {
      await processSessionDir({ dir, env, deps, dryRun, log })
      processed += 1
    } catch (err) {
      failed.push(dir)
      log.error(`  FAILED ${dir}: ${errMessage(err)}`)
    }
  }
  return { processed, failed }
}
