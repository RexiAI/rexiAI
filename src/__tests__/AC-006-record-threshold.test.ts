// AC-006 Task 4: record iff at least two non-bot humans are present; the bot's own
// join/leave never moves the decision. Acceptance tests per
// specs/006-branded-meeting-link-and-recording-bot/20-acceptance/AC-006-record-threshold.md
import { describe, expect, it } from 'vitest'

import {
  RECORD_THRESHOLD,
  countNonBotHumans,
  recordingAction,
  shouldRecord,
} from '../../scripts/recording/bot/participants.mjs'

type Participant = { id: string; displayName?: string }

const BOT: Participant = { id: 'rexi-recorder', displayName: 'Rexi Recorder' }
const human = (n: number): Participant => ({ id: `p-${n}`, displayName: `Client ${n}` })
const humans = (n: number): Participant[] => Array.from({ length: n }, (_, i) => human(i + 1))

describe('AC-006 recording threshold', () => {
  it('AC-006-13: below two non-bot humans the decision is "do not record"', () => {
    for (const n of [0, 1]) {
      const room = [BOT, ...humans(n)]
      expect(shouldRecord(room, BOT)).toBe(false)
      expect(recordingAction({ recording: false, participants: room, botIdentity: BOT })).toBe(
        'idle'
      )
    }
    expect(RECORD_THRESHOLD).toBe(2)
  })

  it('AC-006-14: exactly two non-bot humans starts the recording', () => {
    const room = [BOT, ...humans(2)]
    expect(shouldRecord(room, BOT)).toBe(true)
    expect(recordingAction({ recording: false, participants: room, botIdentity: BOT })).toBe(
      'start'
    )
  })

  it('AC-006-15: three or more non-bot humans keeps recording', () => {
    const room = [BOT, ...humans(3)]
    expect(shouldRecord(room, BOT)).toBe(true)
    expect(recordingAction({ recording: true, participants: room, botIdentity: BOT })).toBe(
      'continue'
    )
  })

  it('AC-006-16: an in-progress recording stops when the human count drops below two', () => {
    const two = [BOT, ...humans(2)]
    const one = [BOT, ...humans(1)]

    expect(recordingAction({ recording: false, participants: two, botIdentity: BOT })).toBe('start')
    // The drop: same bot, one human left.
    expect(countNonBotHumans(one, BOT)).toBe(1)
    expect(recordingAction({ recording: true, participants: one, botIdentity: BOT })).toBe('stop')
  })

  it('AC-006-17: the bot joining or leaving never changes the decision', () => {
    const withoutBot = humans(2)
    const withBot = [BOT, ...humans(2)]

    expect(shouldRecord(withoutBot, BOT)).toBe(true) // bot absent
    expect(shouldRecord(withBot, BOT)).toBe(true) // bot joined
    expect(recordingAction({ recording: true, participants: withoutBot, botIdentity: BOT })).toBe(
      'continue'
    ) // bot left mid-recording

    // Below the threshold the same invariance holds.
    const oneWithoutBot = humans(1)
    const oneWithBot = [BOT, ...humans(1)]
    expect(shouldRecord(oneWithoutBot, BOT)).toBe(false)
    expect(shouldRecord(oneWithBot, BOT)).toBe(false)
  })

  describe('unit: decision boundaries', () => {
    it('a silent room while recording stops (0 humans)', () => {
      expect(recordingAction({ recording: true, participants: [BOT], botIdentity: BOT })).toBe(
        'stop'
      )
    })

    it('continues while the count stays at or above the threshold', () => {
      for (const n of [2, 5]) {
        expect(
          recordingAction({ recording: true, participants: [BOT, ...humans(n)], botIdentity: BOT })
        ).toBe('continue')
      }
    })

    it('the decision is a pure function of the participant list', () => {
      const room = [BOT, ...humans(2)]
      const snapshot = JSON.stringify(room)
      expect(recordingAction({ recording: false, participants: room, botIdentity: BOT })).toBe(
        'start'
      )
      expect(JSON.stringify(room)).toBe(snapshot) // no mutation, no I/O
    })
  })
})
