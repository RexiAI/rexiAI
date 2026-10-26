// AC-006 Task 7: a booked meeting whose window fully elapsed without a recording
// is surfaced (log line + persistent marker), never silent.
// Acceptance tests per
// specs/006-branded-meeting-link-and-recording-bot/20-acceptance/AC-006-missed-meeting.md
import fs from 'node:fs'
import path from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  findMissedMeetings,
  hasWindowElapsed,
  missedMarkerPath,
  recordMissedMeetings,
  recordingExistsForRoom,
  windowEndsAt,
} from '../../scripts/recording/bot/missed.mjs'

import { captureLog, mkTmpDir, rmTmpDir } from './recording-harness'

const ROOM = 'rexi-0123456789abcdef'
const START = '2026-10-21T10:00:00Z'
const AFTER = new Date('2026-10-22T00:00:00Z') // window long gone
const BEFORE = new Date('2026-10-21T09:00:00Z') // not started yet
const DURING = new Date('2026-10-21T10:30:00Z') // in progress (1h booking)

const entry = (overrides: Record<string, unknown> = {}) => ({
  room: ROOM,
  startsAt: START,
  hours: 1,
  ...overrides,
})

let base: string
beforeAll(() => {
  base = mkTmpDir('rexi-006-missed-')
})
afterAll(() => {
  rmTmpDir(base)
})

describe('AC-006 missed meetings', () => {
  it('AC-006-24: an elapsed, unrecorded meeting is reported missed and left as a durable record', () => {
    const recordings = path.join(base, 'AC-006-24')
    const schedule = [entry()]
    const recordingExists = () => false

    const missed = findMissedMeetings({ schedule, now: AFTER, recordingExists })
    expect(missed).toHaveLength(1)
    expect(missed[0].room).toBe(ROOM)

    // Durable, operator-visible record: a log line plus a persistent marker.
    const { lines, log } = captureLog()
    const written = recordMissedMeetings({ missed, env: { RECORDINGS_DIR: recordings }, now: AFTER, log })
    expect(lines.join('\n')).toContain(ROOM)
    expect(lines.join('\n')).toMatch(/missed/i)
    expect(written).toHaveLength(1)

    const marker = missedMarkerPath({ room: ROOM, env: { RECORDINGS_DIR: recordings } })
    expect(written[0]).toBe(marker)
    expect(fs.existsSync(marker)).toBe(true)
    const record = JSON.parse(fs.readFileSync(marker, 'utf8'))
    expect(record.room).toBe(ROOM)
    expect(record.windowEndedAt).toBe('2026-10-21T11:00:00.000Z')
  })

  it('AC-006-25: a meeting that has not started or is still running is never reported missed', () => {
    const schedule = [entry()]
    const recordingExists = () => false

    expect(findMissedMeetings({ schedule, now: BEFORE, recordingExists })).toEqual([])
    expect(findMissedMeetings({ schedule, now: DURING, recordingExists })).toEqual([])
  })

  it('AC-006-26: an elapsed meeting that WAS recorded is not reported missed', () => {
    const recordings = path.join(base, 'AC-006-26')
    // A real recording in RECORDINGS_DIR for the room: the predicate the bot uses.
    const sessionDir = path.join(recordings, `${ROOM}_2026-10-21-10-00-00`)
    fs.mkdirSync(sessionDir, { recursive: true })
    fs.writeFileSync(path.join(sessionDir, `${ROOM}_2026-10-21-10-00-00.mp4`), 'x')

    const recordingExists = (room: string) => recordingExistsForRoom({ room, env: { RECORDINGS_DIR: recordings } })
    expect(recordingExists(ROOM)).toBe(true)
    expect(findMissedMeetings({ schedule: [entry()], now: AFTER, recordingExists })).toEqual([])
  })

  describe('unit: window and recording-existence boundaries', () => {
    it('the window ends at start + hours', () => {
      expect(windowEndsAt(entry()).toISOString()).toBe('2026-10-21T11:00:00.000Z')
      expect(windowEndsAt(entry({ hours: 2 })).toISOString()).toBe('2026-10-21T12:00:00.000Z')
      expect(hasWindowElapsed(entry(), AFTER)).toBe(true)
      expect(hasWindowElapsed(entry(), DURING)).toBe(false)
    })

    it('only the fully elapsed window counts; the exact end instant is elapsed', () => {
      const atEnd = new Date('2026-10-21T11:00:00Z')
      expect(hasWindowElapsed(entry(), atEnd)).toBe(true)
      expect(hasWindowElapsed(entry(), new Date('2026-10-21T10:59:59Z'))).toBe(false)
    })

    it('every elapsed, unrecorded entry is reported; recorded ones are filtered out', () => {
      const other = 'rexi-fedcba9876543210'
      const schedule = [entry(), entry({ room: other, startsAt: '2026-10-20T10:00:00Z' })]
      const missed = findMissedMeetings({
        schedule,
        now: AFTER,
        recordingExists: (room: string) => room === other,
      })
      expect(missed.map((m: { room: string }) => m.room)).toEqual([ROOM])
    })

    it('recordingExistsForRoom: per-session dir, root-level mp4, and missing root', () => {
      const recordings = path.join(base, 'unit-exists')
      fs.mkdirSync(recordings, { recursive: true })
      // A dir named for the room but still being written (no mp4) is NOT a recording.
      fs.mkdirSync(path.join(recordings, `${ROOM}_2026-10-21-10-00-00`))
      expect(recordingExistsForRoom({ room: ROOM, env: { RECORDINGS_DIR: recordings } })).toBe(false)

      // A root-level mp4 for the room counts.
      fs.writeFileSync(path.join(recordings, `${ROOM}_import.mp4`), 'x')
      expect(recordingExistsForRoom({ room: ROOM, env: { RECORDINGS_DIR: recordings } })).toBe(true)
      expect(
        recordingExistsForRoom({ room: 'rexi-fedcba9876543210', env: { RECORDINGS_DIR: recordings } })
      ).toBe(false)

      const missing = path.join(base, 'unit-exists-missing')
      expect(recordingExistsForRoom({ room: ROOM, env: { RECORDINGS_DIR: missing } })).toBe(false)
    })
  })
})
