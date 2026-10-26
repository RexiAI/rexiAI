// Invariant tests for the recording-decision module (spec 006 Tasks 3-4).
//
// WHY NOT fast-check: not a dependency, tier is `mvp`. Instead every participant
// SET is enumerated exhaustively over a small universe (2^5 subsets), which is a
// strictly stronger quantifier than sampling for this domain: the counting rule is
// the whole input space, so exhaustive beats random.
//
// These are structural invariants, not acceptance scenarios: they carry no AC id.
import { describe, expect, it } from 'vitest'

import {
  BOT_IDENTITY,
  RECORD_THRESHOLD,
  countNonBotHumans,
  isBot,
  recordingAction,
  shouldRecord,
} from '../../scripts/recording/bot/participants.mjs'

type Participant = { id: string; displayName?: string }

const BOT: Participant = { id: BOT_IDENTITY.id, displayName: BOT_IDENTITY.displayName }

/** The universe the enumeration quantifies over, including the impostor case. */
const UNIVERSE: Participant[] = [
  BOT,
  { id: 'p-1', displayName: 'Client 1' },
  { id: 'p-2', displayName: 'Client 2' },
  { id: 'p-3', displayName: 'Client 3' },
  // A human wearing the bot's display name is a DIFFERENT participant.
  { id: 'p-human', displayName: 'Rexi Recorder' },
]

/** All 2^n subsets of the universe. */
function allSubsets(items: Participant[]): Participant[][] {
  const subsets: Participant[][] = []
  for (let mask = 0; mask < 1 << items.length; mask += 1) {
    subsets.push(items.filter((_, i) => (mask & (1 << i)) !== 0))
  }
  return subsets
}

const SUBSETS = allSubsets(UNIVERSE)

/** Participants without the bot, i.e. the humans the count is defined over. */
const humansOnly = (room: Participant[]): Participant[] => room.filter((p) => !isBot(p, BOT))

describe('PROP participants: the non-bot count is bounded by the room', () => {
  it('is never negative and never exceeds the total, for every subset', () => {
    expect(SUBSETS).toHaveLength(32)
    for (const room of SUBSETS) {
      const count = countNonBotHumans(room, BOT_IDENTITY)
      expect(count).toBeGreaterThanOrEqual(0)
      expect(count).toBeLessThanOrEqual(room.length)
    }
  })

  it('equals the room size minus the bot, for every subset', () => {
    for (const room of SUBSETS) {
      const botPresent = room.filter((p) => isBot(p, BOT_IDENTITY)).length
      expect(countNonBotHumans(room, BOT_IDENTITY)).toBe(room.length - botPresent)
    }
  })

  it('is monotone: adding a participant never lowers the count', () => {
    for (const room of SUBSETS) {
      const base = countNonBotHumans(room, BOT_IDENTITY)
      for (const extra of UNIVERSE) {
        if (room.includes(extra)) continue
        expect(countNonBotHumans([...room, extra], BOT_IDENTITY)).toBeGreaterThanOrEqual(base)
      }
    }
  })
})

describe('PROP participants: the count is invariant to the bot itself', () => {
  it('the bot joining or leaving never moves the count', () => {
    for (const room of SUBSETS) {
      const withoutBot = humansOnly(room)
      const withBot = withoutBot.concat([BOT])
      expect(countNonBotHumans(withBot, BOT_IDENTITY)).toBe(
        countNonBotHumans(withoutBot, BOT_IDENTITY)
      )
    }
  })

  it('the count is invariant to order and to display names', () => {
    for (const room of SUBSETS) {
      const expected = countNonBotHumans(room, BOT_IDENTITY)
      expect(countNonBotHumans(room.slice().reverse(), BOT_IDENTITY)).toBe(expected)
      const renamed = room.map((p) => ({ ...p, displayName: `renamed-${p.id}` }))
      expect(countNonBotHumans(renamed, BOT_IDENTITY)).toBe(expected)
    }
  })

  it('an empty or missing participant list counts as zero, never throws', () => {
    for (const empty of [[], undefined, null]) {
      expect(countNonBotHumans(empty as Participant[], BOT_IDENTITY)).toBe(0)
    }
  })
})

describe('PROP participants: the decision follows the count', () => {
  it('shouldRecord is exactly "count reaches the threshold", for every subset', () => {
    for (const room of SUBSETS) {
      const count = countNonBotHumans(room, BOT_IDENTITY)
      expect(shouldRecord(room, BOT_IDENTITY)).toBe(count >= RECORD_THRESHOLD)
    }
  })

  it('recordingAction is a total function whose start/stop states agree with shouldRecord', () => {
    const actions = new Set(['start', 'continue', 'stop', 'idle'])
    for (const room of SUBSETS) {
      const wanted = shouldRecord(room, BOT_IDENTITY)
      for (const recording of [false, true]) {
        const action = recordingAction({ recording, participants: room, botIdentity: BOT_IDENTITY })
        expect(actions.has(action)).toBe(true)
        // Already recording => continue/stop; not recording => start/idle.
        expect(action === 'continue' || action === 'stop').toBe(recording)
        expect(action === 'start' || action === 'continue').toBe(wanted)
      }
    }
  })

  it('the decision does not oscillate: re-deciding on an unchanged room is stable', () => {
    for (const room of SUBSETS) {
      const first = recordingAction({
        recording: false,
        participants: room,
        botIdentity: BOT_IDENTITY,
      })
      const second = recordingAction({
        recording: first === 'start',
        participants: room,
        botIdentity: BOT_IDENTITY,
      })
      // 'start' settles into 'continue'; 'idle' stays 'idle'. Never a flip-flop.
      expect(second).toBe(first === 'start' ? 'continue' : 'idle')
    }
  })
})
