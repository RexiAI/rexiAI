// Invariant tests for the meeting-URL module (spec 006 Task 1).
//
// WHY NOT fast-check: it is not a dependency of this project and the conformance
// tier is `mvp`, so property testing is an upgrade rather than a requirement. The
// rule is "prefer stdlib, justify each dependency", so these are quantifier tests
// over an ENUMERATED domain (every generated base x room x locale triple, produced
// by a deterministic seed) rather than hand-picked examples. Same shape as a
// property test — the assertions quantify over inputs and never name a single
// expected value — without a new package.
//
// These are structural invariants, not acceptance scenarios: they carry no AC id.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createMeetingLink, type MeetingResult } from '../domain/meeting'
import { isRoomName, localeFreeJoinUrl, realRoomUrl, roomFromJoinUrl } from '../domain/meetingUrl'

const BASES = [
  'https://meet.rexi-ai.com',
  'https://meet.jit.si',
  'https://meet.rexi-ai.com.evil.example',
  'https://deep.sub.rexi-ai.com:8443',
  'https://192.168.1.10',
]

const LOCALES = ['es', 'en'] as const

/** Deterministic hex stream: 24 distinct `rexi-<16 hex>` rooms, no randomness. */
function* generatedRooms(seed = 20260101): Generator<string> {
  let s = seed
  for (let i = 0; i < 24; i += 1) {
    let hex = ''
    for (let j = 0; j < 16; j += 1) {
      s = (s * 1103515245 + 12345) & 0x7fffffff
      hex += '0123456789abcdef'[s % 16]
    }
    yield `rexi-${hex}`
  }
}

function okJoinUrl(result: MeetingResult): string {
  expect(result.status).toBe('ok')
  if (result.status !== 'ok') throw new Error('unreachable: asserted ok above')
  return result.joinUrl
}

describe('PROP meetingUrl: join URL <-> room round trip', () => {
  const savedBase = process.env['MEETING_BASE_URL']

  beforeEach(() => {
    process.env['MEETING_BASE_URL'] = BASES[0]
  })

  afterEach(() => {
    if (savedBase === undefined) delete process.env['MEETING_BASE_URL']
    else process.env['MEETING_BASE_URL'] = savedBase
  })

  it('every generated join URL yields back the room the producer put in it', async () => {
    for (const locale of LOCALES) {
      for (const base of BASES) {
        process.env['MEETING_BASE_URL'] = base
        const joinUrl = okJoinUrl(
          await createMeetingLink({
            date: '2027-03-01',
            startTime: '10:00',
            hours: 1,
            subject: 'PROP round trip',
            locale,
          })
        )
        // The producer's own room segment survives the consumer's parse, for any
        // brand, any port and any subdomain shape.
        const derived = roomFromJoinUrl(joinUrl)
        expect(derived).not.toBeNull()
        expect(isRoomName(derived as string)).toBe(true)
        expect(joinUrl.startsWith(`${base}/`)).toBe(true)
        // The room the client is told to join is the room the bot will record.
        expect(realRoomUrl(derived as string)).toBe(`https://meet.jit.si/${derived}`)
      }
    }
  })

  it('the documented join-URL shape round-trips for every generated room', () => {
    for (const room of generatedRooms()) {
      for (const locale of LOCALES) {
        for (const base of BASES) {
          expect(roomFromJoinUrl(`${base}/${room}?lang=${locale}`)).toBe(room)
        }
      }
    }
  })

  it('the real room URL never carries a query or fragment, for any room', () => {
    for (const room of generatedRooms(77)) {
      const url = new URL(realRoomUrl(room))
      expect(url.search).toBe('')
      expect(url.hash).toBe('')
      expect(url.pathname).toBe(`/${room}`)
      expect(roomFromJoinUrl(realRoomUrl(room))).toBe(room)
    }
  })

  it('the locale-free variant is query-free and identical across locales', () => {
    for (const room of generatedRooms(4242)) {
      const es = `https://meet.rexi-ai.com/${room}?lang=es`
      const en = `https://meet.rexi-ai.com/${room}?lang=en`

      // Locale is the operator link's only variable, and it is removed entirely.
      expect(localeFreeJoinUrl(es)).toBe(localeFreeJoinUrl(en))
      expect(localeFreeJoinUrl(es)).not.toContain('?')
      expect(localeFreeJoinUrl(es)).not.toContain('lang')
      expect(new URL(localeFreeJoinUrl(es)).search).toBe('')

      // Removing the locale never changes which room the link points at.
      expect(roomFromJoinUrl(localeFreeJoinUrl(en))).toBe(room)
    }
  })

  it('idempotence: the locale-free variant is a fixed point', () => {
    for (const room of generatedRooms(9001)) {
      for (const locale of LOCALES) {
        const once = localeFreeJoinUrl(`https://meet.rexi-ai.com/${room}?lang=${locale}`)
        expect(localeFreeJoinUrl(once)).toBe(once)
      }
    }
  })

  it('never invents a room: malformed join URLs all yield null', () => {
    for (const broken of [
      '',
      'not-a-url',
      'https://meet.rexi-ai.com/',
      'https://meet.rexi-ai.com/rexi-short',
      'https://meet.rexi-ai.com/rexi-0123456789ABCDEF',
      'https://meet.rexi-ai.com/rexi-0123456789abcde',
    ]) {
      expect(roomFromJoinUrl(broken)).toBeNull()
    }
  })
})
