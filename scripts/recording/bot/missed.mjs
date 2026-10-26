// scripts/recording/bot/missed.mjs — "the machine was asleep" made visible.
//
// Spec 006 Task 7 / 10-tasks.md decision 5: we never probe power state. A missed
// meeting IS "the booked window elapsed and no recording exists for its room", so
// the determination is a pure function of (schedule entry, recording-exists
// predicate) with the clock injected — unit-testable, and honest about what it can
// and cannot know.
//
// A missed meeting is surfaced as a log line PLUS a persistent marker, so an
// operator who was not watching the console still finds it later.

import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { findMp4 } from '../billing.mjs'

import { botRecordingsDir } from './config.mjs'

export const MISSED_MARKER_SUFFIX = '.rexi-missed'

const MS_PER_HOUR = 3600 * 1000

function startInstant(entry) {
  return entry.startsAt instanceof Date ? entry.startsAt : new Date(entry.startsAt)
}

/** End of the booked window: start + hours. */
export function windowEndsAt(entry) {
  return new Date(startInstant(entry).getTime() + entry.hours * MS_PER_HOUR)
}

/** True once the whole booked window is in the past ("fully elapsed"). */
export function hasWindowElapsed(entry, now = new Date()) {
  return windowEndsAt(entry).getTime() <= now.getTime()
}

/**
 * The schedule entries whose window elapsed without a recording.
 *
 * @param {{ schedule: Array<{ room: string, startsAt: string|Date, hours: number }>,
 *   now?: Date, recordingExists: (room: string) => boolean }} input
 * @returns {Array<{ room: string, startsAt: string|Date, hours: number }>}
 */
export function findMissedMeetings({ schedule, now = new Date(), recordingExists }) {
  return (schedule || []).filter(
    (entry) => hasWindowElapsed(entry, now) && !recordingExists(entry.room)
  )
}

/** Where the durable "missed" record lives: a file at the recordings root, which
 *  the processor's sweep ignores (it only iterates directories). */
export function missedMarkerPath({ room, env }) {
  return path.join(botRecordingsDir(env), `${room}${MISSED_MARKER_SUFFIX}`)
}

function writeMarker({ marker, entry, now, log }) {
  try {
    const record = {
      room: entry.room,
      windowEndedAt: windowEndsAt(entry).toISOString(),
      detectedAt: now.toISOString(),
    }
    mkdirSync(path.dirname(marker), { recursive: true })
    writeFileSync(marker, `${JSON.stringify(record)}\n`)
    return marker
  } catch (err) {
    log.error(
      `[recording-bot] could not write missed-meeting marker ${marker}: ` +
        `${err instanceof Error ? err.message : err}`
    )
    return null
  }
}

/**
 * Persist and announce each missed meeting. Returns the marker paths written.
 *
 * @param {{ missed: Array<{ room: string, startsAt: string|Date, hours: number }>,
 *   env: Record<string, string|undefined>, now?: Date,
 *   log?: { log: Function, warn: Function, error: Function } }} input
 * @returns {string[]}
 */
export function recordMissedMeetings({ missed, env, now = new Date(), log = console }) {
  const written = []
  for (const entry of missed || []) {
    const marker = missedMarkerPath({ room: entry.room, env })
    const saved = writeMarker({ marker, entry, now, log })
    if (saved) written.push(saved)
    log.warn(
      `[recording-bot] MISSED MEETING: ${entry.room} ended ` +
        `${windowEndsAt(entry).toISOString()} with no recording (machine asleep or bot not joined).`
    )
  }
  return written
}

function holdsRecording(dir, room) {
  if (!dir.includes(room)) return false
  return Boolean(findMp4(dir))
}

function holdsRecordingFile(entry, room) {
  return !entry.endsWith(MISSED_MARKER_SUFFIX) && entry.includes(room) && entry.endsWith('.mp4')
}

/**
 * Does a recording exist in RECORDINGS_DIR for this room? Accepts the two shapes
 * the processor accepts: a session directory carrying an .mp4, or an .mp4 file
 * named for the room (manual import).
 *
 * @param {{ room: string, env: Record<string, string|undefined>, rootDir?: string }} input
 * @returns {boolean}
 */
export function recordingExistsForRoom({ room, env, rootDir }) {
  const root = rootDir || botRecordingsDir(env)
  if (!existsSync(root)) return false
  for (const entry of readdirSync(root)) {
    const full = path.join(root, entry)
    const found = statSync(full).isDirectory()
      ? holdsRecording(full, room)
      : holdsRecordingFile(entry, room)
    if (found) return true
  }
  return false
}
