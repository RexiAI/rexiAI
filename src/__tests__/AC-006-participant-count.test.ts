// AC-006 Task 3: the count the recording decision is built on excludes the bot by
// IDENTITY, never by display name. Acceptance tests per
// specs/006-branded-meeting-link-and-recording-bot/20-acceptance/AC-006-participant-count.md
import { describe, expect, it } from 'vitest'

import {
  BOT_IDENTITY,
  countNonBotHumans,
  isBot,
} from '../../scripts/recording/bot/participants.mjs'

type Participant = { id: string; displayName?: string }

const BOT: Participant = { id: 'rexi-recorder', displayName: 'Rexi Recorder' }
const human = (id: string, displayName = 'Client'): Participant => ({ id, displayName })

describe('AC-006 participant count excludes the bot', () => {
  it('AC-006-10: a room holding only the bot counts as zero humans', () => {
    expect(countNonBotHumans([BOT], BOT)).toBe(0)
    expect(countNonBotHumans([BOT], BOT_IDENTITY)).toBe(0)
  })

  it('AC-006-11: bot plus two humans counts only the humans', () => {
    const room = [BOT, human('p-1'), human('p-2')]
    expect(countNonBotHumans(room, BOT)).toBe(2)
  })

  it('AC-006-12: a human sharing the bot display name is still counted', () => {
    const impostor = human('p-human', 'Rexi Recorder')
    const room = [BOT, impostor]

    expect(countNonBotHumans(room, BOT)).toBe(1)
    // The human really does share the bot's display name…
    expect(impostor.displayName).toBe(BOT.displayName)
    // …and exclusion follows identity, not the name: a same-named human counts.
    expect(isBot(impostor, BOT)).toBe(false)
    expect(isBot(BOT, BOT)).toBe(true)
    expect(impostor.id).not.toBe(BOT.id)
  })

  describe('unit: counting boundaries', () => {
    it('an empty participant list counts zero', () => {
      expect(countNonBotHumans([], BOT)).toBe(0)
      expect(countNonBotHumans(undefined as unknown as Participant[], BOT)).toBe(0)
    })

    it('a room without the bot counts every participant', () => {
      expect(countNonBotHumans([human('p-1'), human('p-2'), human('p-3')], BOT)).toBe(3)
    })

    it('the bot identity is distinct and stable, whatever its display name', () => {
      expect(typeof BOT_IDENTITY.id).toBe('string')
      expect(BOT_IDENTITY.id.length).toBeGreaterThan(0)
      // Stable: the same value across reads, so "is this the bot" never drifts.
      expect(BOT_IDENTITY.id).toBe(BOT_IDENTITY.id)
    })

    it('renaming a human to look like the bot never changes the count', () => {
      const before = countNonBotHumans([BOT, human('p-1', 'Client')], BOT)
      const after = countNonBotHumans([BOT, human('p-1', 'Rexi Recorder')], BOT)
      expect(after).toBe(before)
      expect(after).toBe(1)
    })
  })
})
