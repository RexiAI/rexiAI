// scripts/recording/bot/schedule.mjs — which rooms the bot should be in, and when.
//
// The bot cannot be triggered from outside (the host is behind carrier NAT), so it
// has to know the booked windows itself. That list is a file:
//
//   [{"room":"rexi-<16hex>","startsAt":"<ISO instant>","hours":1}]
//
// `startsAt` is already an instant. Resolving a booking's wall time (`date` +
// `start_time` in AVAILABILITY_TIMEZONE) to an instant belongs to whoever writes
// the file — the booking side, which owns that timezone setting — exactly as
// 10-tasks.md specifies, so this module stays timezone-free (and therefore
// testable) and there is only one place a timezone is applied.

import { existsSync, readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export const SCHEDULE_FILE_ENV = 'BOT_SCHEDULE_FILE'
export const DEFAULT_SCHEDULE_FILE = path.join(os.homedir(), '.rexi-recording-bot', 'schedule.json')

const MS_PER_HOUR = 3600 * 1000

/** Where the schedule lives: an explicit override, else the per-user default. */
export function scheduleFileFrom(env = {}) {
  const configured = env[SCHEDULE_FILE_ENV]
  return configured && configured.length > 0 ? configured : DEFAULT_SCHEDULE_FILE
}

function startInstant(entry) {
  return entry.startsAt instanceof Date ? entry.startsAt : new Date(entry.startsAt)
}

/** An entry is usable only with a room and a resolvable start instant. */
export function isValidEntry(entry) {
  if (!entry || typeof entry.room !== 'string' || entry.room.length === 0) return false
  return !Number.isNaN(startInstant(entry).getTime())
}

/**
 * Read the schedule file. A missing or unreadable file is an empty schedule with a
 * warning, not a crash: `--missed` runs from a timer and must not fail the unit on
 * a host that has never booked anything.
 *
 * @param {{ file: string, log?: Console }} input
 * @returns {Array<{ room: string, startsAt: string|Date, hours: number }>}
 */
export function readSchedule({ file, log = console }) {
  if (!existsSync(file)) {
    log.log(`[recording-bot] no schedule file at ${file} — nothing scheduled`)
    return []
  }
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8'))
    if (!Array.isArray(parsed)) throw new Error('schedule must be a JSON array')
    return parsed.filter(isValidEntry)
  } catch (err) {
    log.error(`[recording-bot] cannot read schedule ${file}: ${err.message}`)
    return []
  }
}

/**
 * The windows that contain `now`: the bot should be in the room for these, and for
 * no other. A window runs from `startsAt` to `startsAt + hours`.
 *
 * @param {Array<{ room: string, startsAt: string|Date, hours: number }>} schedule
 * @param {Date} now
 * @returns {Array<{ room: string, startsAt: string|Date, hours: number }>}
 */
export function activeWindows(schedule, now = new Date()) {
  return (schedule || []).filter((entry) => {
    if (!isValidEntry(entry)) return false
    const start = startInstant(entry).getTime()
    const end = start + (entry.hours || 0) * MS_PER_HOUR
    return start <= now.getTime() && now.getTime() < end
  })
}
