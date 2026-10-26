#!/usr/bin/env node
// scripts/recording-bot.mjs — host-side entry point for the local recording bot
// (spec 006 Tasks 3-7).
//
// WHY A HOST SCRIPT: the bot runs on the Jitsi host (behind carrier NAT), like the
// processor — outbound only, no listening socket. The units it drives live in
// scripts/recording/bot/.
//
//   --run --room rexi-<16hex> [--base <jitsi-url>]
//       JOIN the room as a participant, wait for two non-bot humans, record them,
//       and finalize into RECORDINGS_DIR (per-session directory, muxed .mp4,
//       metadata.json). Exits 1 when nothing was recorded.
//
//   --watch [--schedule <file>]
//       Long-running: follow the schedule file, and run one recording session per
//       active booked window. SIGTERM stops the sessions gracefully (the capture is
//       finalized, not truncated).
//
//   --finalize <audio-file> --room rexi-<16hex>
//       Mux an already-captured audio file into the pipeline-ready layout. The
//       contract the capture adapter feeds; kept as a manual/recovery entry point.
//
//   --decide <participants.json>
//       Print the recording action for a participant list: start | continue |
//       stop | idle. Reproduces a live decision from a captured snapshot.
//
//   --missed <schedule.json>
//       Evaluate booked windows against RECORDINGS_DIR and write a durable missed
//       record (plus a log line) for every elapsed window with no recording.
//       Schedule entries: [{"room":"rexi-...","startsAt":"<ISO instant>","hours":1}]
//       `startsAt` is the booking's wall time resolved to an instant by whoever
//       produced the schedule; the unit itself is timezone-free.
//
// Config: RECORDINGS_DIR (the single recordings knob, shared with the processor —
// see scripts/recording/bot/config.mjs), BOT_JITSI_BASE_URL (defaults to
// meet.jit.si), BOT_SCHEDULE_FILE, BOT_CHROME_PATH. No secret is read or emitted.

import { execFile } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

import { DEFAULT_JITSI_BASE_URL, JITSI_BASE_URL_ENV, recordRoom } from './recording/bot/capture.mjs'
import {
  findMissedMeetings,
  recordMissedMeetings,
  recordingExistsForRoom,
} from './recording/bot/missed.mjs'
import { finalizeRecording } from './recording/bot/output.mjs'
import { BOT_IDENTITY, recordingAction } from './recording/bot/participants.mjs'
import { activeWindows, readSchedule, scheduleFileFrom } from './recording/bot/schedule.mjs'

const execFileAsync = promisify(execFile)
// bl/gh/ffmpeg output can be large; 64 MB cap mirrors process-recording.mjs.
const MAX_BUFFER = 64 * 1024 * 1024

const MODE_FLAGS = {
  '--finalize': 'finalize',
  '--decide': 'decide',
  '--missed': 'missed',
  '--run': 'run',
  '--watch': 'watch',
}
/** Modes whose first argument is a path rather than a `--flag value` pair. */
const VALUE_MODES = { finalize: 'audio', decide: 'file', missed: 'file' }
const OPTION_FLAGS = { '--room': 'room', '--base': 'base', '--schedule': 'schedule' }

export function usage() {
  return [
    'Usage:',
    '  node scripts/recording-bot.mjs --run --room rexi-<16hex> [--base <jitsi-url>]',
    '  node scripts/recording-bot.mjs --watch [--schedule <file>] [--room rexi-<16hex>]',
    '  node scripts/recording-bot.mjs --finalize <audio-file> --room rexi-<16hex>',
    '  node scripts/recording-bot.mjs --decide <participants.json>',
    '  node scripts/recording-bot.mjs --missed <schedule.json>',
  ].join('\n')
}

function collectOptions(argv) {
  const values = {}
  for (let i = 0; i < argv.length; i += 2) {
    const key = OPTION_FLAGS[argv[i]]
    if (!key || argv[i + 1] === undefined) return null
    values[key] = argv[i + 1]
  }
  return values
}

export function parseArgs(argv) {
  const mode = MODE_FLAGS[argv[0]]
  if (!mode) return { mode: 'usage' }
  const tail = argv.slice(1)
  const positional = VALUE_MODES[mode]
  const options = collectOptions(positional ? tail.slice(1) : tail)
  if (!options) return { mode: 'usage' }
  if (!positional) {
    if (mode === 'run' && !options.room) return { mode: 'usage' }
    return { mode, ...options }
  }
  if (tail.length === 0 || String(tail[0]).startsWith('--')) return { mode: 'usage' }
  const parsed = { mode, [positional]: tail[0], ...options }
  if (mode === 'finalize' && !parsed.room) return { mode: 'usage' }
  if (mode === 'run' && !parsed.room) return { mode: 'usage' }
  return parsed
}

function readJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'))
  } catch (err) {
    console.error(`[recording-bot] cannot read ${filePath}: ${errMessage(err)}`)
    return null
  }
}

function errMessage(err) {
  return err instanceof Error ? err.message : String(err)
}

function jitsiBaseUrl(parsed) {
  return parsed.base || process.env[JITSI_BASE_URL_ENV] || DEFAULT_JITSI_BASE_URL
}

async function runFinalize({ audio, room }) {
  const runner = async (cmd, args) => {
    const { stdout } = await execFileAsync(cmd, args, { maxBuffer: MAX_BUFFER })
    return { stdout: String(stdout) }
  }
  const result = await finalizeRecording({ room, audioPath: audio, env: process.env, runner })
  return result.ok ? 0 : 1
}

function runDecide({ file }) {
  const participants = readJson(file)
  if (!Array.isArray(participants)) return 2
  console.log(JSON.stringify(recordingAction({ participants, botIdentity: BOT_IDENTITY })))
  return 0
}

function runMissed({ file }) {
  const schedule = readJson(file)
  if (!Array.isArray(schedule)) return 2
  const missed = findMissedMeetings({
    schedule,
    recordingExists: (room) => recordingExistsForRoom({ room, env: process.env }),
  })
  recordMissedMeetings({ missed, env: process.env })
  console.log(`[recording-bot] missed meetings: ${missed.length}`)
  return 0
}

/**
 * Join one room and record it. A window whose humans never show up produces no
 * recording and exits 1 — the caller decides whether that is a failure (it is, for
 * `--run`) or expected (it is not, for `--watch`, where `--missed` owns the report).
 */
async function runRoom({ room, base }) {
  const result = await recordRoom({ room, baseUrl: base, env: process.env, log: console })
  if (!result.ok) {
    console.error(`[recording-bot] no recording for ${room} (${result.reason})`)
    return 1
  }
  console.log(`[recording-bot] recorded ${room} → ${result.file}`)
  return 0
}

/** A stop flag plus a sleep that a SIGTERM/SIGINT wakes immediately. */
function createStopSignal() {
  const state = { value: false }
  const stopped = new Promise((resolve) => {
    process.once('SIGTERM', () => {
      state.value = true
      resolve()
    })
    process.once('SIGINT', () => {
      state.value = true
      resolve()
    })
  })
  return {
    stopped: () => state.value,
    sleep: (ms) => Promise.race([delay(ms), stopped]),
  }
}

/** The rooms to be in right now: an explicit `--room`, or the schedule's live windows. */
function currentWindows({ file, room }) {
  return room ? [{ room }] : activeWindows(readSchedule({ file }), new Date())
}

/**
 * Follow the schedule and keep one session per active window, or — with an explicit
 * `--room` — that single room (ad-hoc operation without a schedule file).
 *
 * A window is handled once: after its session ends (threshold stop, idle timeout or
 * the duration cap) the same room is not retried, so a meeting that never started
 * cannot make the bot re-join in a loop.
 */
async function runWatch({ schedule, room, base }) {
  const file = schedule || scheduleFileFrom(process.env)
  const stop = createStopSignal()
  const handled = new Set()
  const running = new Map()
  const intervalMs = Number(process.env['BOT_WATCH_INTERVAL_MS'] || 60_000)
  while (!stop.stopped()) {
    for (const window of currentWindows({ file, room })) {
      if (handled.has(window.room) || running.has(window.room)) continue
      running.set(window.room, watchOne({ window, base, handled, running }))
    }
    await stop.sleep(intervalMs)
  }
  await Promise.allSettled([...running.values()])
  return 0
}

/** Run a single window's session and retire it when it ends. */
function watchOne({ window, base, handled, running }) {
  return runRoom({ room: window.room, base })
    .catch((err) => {
      console.error(`[recording-bot] session for ${window.room} failed: ${errMessage(err)}`)
      return 1
    })
    .finally(() => {
      handled.add(window.room)
      running.delete(window.room)
    })
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2))
  if (parsed.mode === 'usage') {
    console.error(usage())
    process.exit(2)
  }
  if (parsed.mode === 'decide') process.exit(runDecide(parsed))
  if (parsed.mode === 'missed') process.exit(runMissed(parsed))
  if (parsed.mode === 'run')
    process.exit(await runRoom({ room: parsed.room, base: jitsiBaseUrl(parsed) }))
  if (parsed.mode === 'watch') {
    process.exit(
      await runWatch({ schedule: parsed.schedule, room: parsed.room, base: jitsiBaseUrl(parsed) })
    )
  }
  process.exit(await runFinalize(parsed))
}

const invokedDirectly =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href

if (invokedDirectly) {
  main().catch((e) => {
    console.error(`recording-bot error: ${e instanceof Error ? e.stack : String(e)}`)
    process.exit(1)
  })
}
