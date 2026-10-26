// AC-006 Task 1: the client-facing join URL is branded, the real room stays on
// meet.jit.si, and a missing brand fails loud instead of silently pointing at a
// public room nobody records. Acceptance tests per
// specs/006-branded-meeting-link-and-recording-bot/20-acceptance/AC-006-branded-link.md
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createMeetingLink, type MeetingResult } from '../domain/meeting'
import { realRoomUrl, roomFromJoinUrl } from '../domain/meetingUrl'

const BRAND = 'https://meet.rexi-ai.com'
const ROOM_RE = /^rexi-[0-9a-f]{16}$/
const IPV4_RE = /\b\d{1,3}(?:\.\d{1,3}){3}\b/
const MEET_INPUT = { date: '2027-03-01', startTime: '10:00', hours: 1, subject: 'AC-006' }

function okJoinUrl(result: MeetingResult): string {
  expect(result.status).toBe('ok')
  if (result.status !== 'ok') throw new Error('unreachable: asserted ok above')
  return result.joinUrl
}

describe('AC-006 branded meeting link', () => {
  const savedEnv: Record<string, string | undefined> = {}

  beforeEach(() => {
    savedEnv['MEETING_BASE_URL'] = process.env['MEETING_BASE_URL']
  })

  afterEach(() => {
    if (savedEnv['MEETING_BASE_URL'] === undefined) delete process.env['MEETING_BASE_URL']
    else process.env['MEETING_BASE_URL'] = savedEnv['MEETING_BASE_URL']
  })

  it('AC-006-01: branded https host, one path segment, exactly one lang query parameter', async () => {
    process.env['MEETING_BASE_URL'] = BRAND
    const joinUrl = okJoinUrl(await createMeetingLink({ ...MEET_INPUT, locale: 'en' }))

    const url = new URL(joinUrl)
    expect(url.protocol).toBe('https:')
    expect(url.host).toBe('meet.rexi-ai.com')
    expect(joinUrl).not.toMatch(IPV4_RE)
    // Shape pinned by the scenario, including the query the email will carry.
    expect(joinUrl).toMatch(/^https:\/\/meet\.rexi-ai\.com\/rexi-[0-9a-f]{16}\?lang=en$/)

    const segments = url.pathname.split('/').filter(Boolean)
    expect(segments).toHaveLength(1) // exactly one path segment
    expect(segments[0]).toMatch(ROOM_RE)

    const params = [...url.searchParams.entries()]
    expect(params).toHaveLength(1) // no query parameter other than "lang"
    expect(params[0][0]).toBe('lang')
    expect(['es', 'en']).toContain(params[0][1])
  })

  it('AC-006-02: the room is the last path segment and is rexi- plus 16 hex', async () => {
    process.env['MEETING_BASE_URL'] = BRAND
    const joinUrl = okJoinUrl(await createMeetingLink(MEET_INPUT))
    const lastSegment = joinUrl.split('?')[0].replace(/\/+$/, '').split('/').pop() as string

    expect(lastSegment).toMatch(ROOM_RE)
    expect(roomFromJoinUrl(joinUrl)).toBe(lastSegment)
    // lowercase only: the room is randomBytes(8).toString('hex')
    expect(lastSegment).toBe(lastSegment.toLowerCase())
  })

  it('AC-006-03: the real room resolves to meet.jit.si with the same room segment', async () => {
    process.env['MEETING_BASE_URL'] = BRAND
    const joinUrl = okJoinUrl(await createMeetingLink(MEET_INPUT))
    const brandedRoom = roomFromJoinUrl(joinUrl)

    expect(realRoomUrl('rexi-0123456789abcdef')).toBe('https://meet.jit.si/rexi-0123456789abcdef')
    expect(realRoomUrl(brandedRoom as string)).toBe(`https://meet.jit.si/${brandedRoom}`)
    // Same room on both sides: only the host differs (room → booking mapping holds).
    expect(new URL(realRoomUrl(brandedRoom as string)).pathname).toBe(`/${brandedRoom}`)
    expect(realRoomUrl(brandedRoom as string)).not.toContain('?')
  })

  it('AC-006-04: missing brand config fails loud, never a meet.jit.si join URL', async () => {
    for (const missing of [undefined, '']) {
      if (missing === undefined) delete process.env['MEETING_BASE_URL']
      else process.env['MEETING_BASE_URL'] = missing

      const result = await createMeetingLink({ ...MEET_INPUT, locale: 'es' })

      expect(result.status).toBe('error')
      expect(result).not.toHaveProperty('joinUrl')
      // No join URL on the public Jitsi host is produced (the failure message may
      // name the host; a URL is what must never appear).
      expect(JSON.stringify(result)).not.toMatch(/https:\/\/meet\.jit\.si\//)
    }
  })

  describe('unit: locale and base-URL normalisation', () => {
    it('absent, empty or unrecognised locales degrade to ?lang=es; only "en" selects English', async () => {
      process.env['MEETING_BASE_URL'] = BRAND
      const cases: Array<[string | null | undefined, string]> = [
        [undefined, 'es'],
        [null, 'es'],
        ['', 'es'],
        ['es', 'es'],
        ['en', 'en'],
        ['fr', 'es'],
        ['EN', 'es'],
      ]
      for (const [locale, expected] of cases) {
        const joinUrl = okJoinUrl(await createMeetingLink({ ...MEET_INPUT, locale }))
        expect(new URL(joinUrl).searchParams.get('lang')).toBe(expected)
      }
    })

    it('trailing slashes on the configured base are stripped', async () => {
      for (const base of [BRAND, `${BRAND}/`, `${BRAND}///`]) {
        process.env['MEETING_BASE_URL'] = base
        const joinUrl = okJoinUrl(await createMeetingLink(MEET_INPUT))
        expect(joinUrl.startsWith(`${BRAND}/rexi-`)).toBe(true)
        expect(joinUrl).not.toContain('//rexi-')
      }
    })

    it('every call mints a fresh room', async () => {
      process.env['MEETING_BASE_URL'] = BRAND
      const first = roomFromJoinUrl(okJoinUrl(await createMeetingLink(MEET_INPUT)))
      const second = roomFromJoinUrl(okJoinUrl(await createMeetingLink(MEET_INPUT)))
      expect(first).not.toBe(second)
    })

    it('roomFromJoinUrl tolerates a query string and trailing slash, and rejects a non-room last segment', () => {
      expect(roomFromJoinUrl('https://meet.rexi-ai.com/rexi-0123456789abcdef?lang=es')).toBe(
        'rexi-0123456789abcdef'
      )
      expect(roomFromJoinUrl('https://meet.rexi-ai.com/rexi-0123456789abcdef/')).toBe(
        'rexi-0123456789abcdef'
      )
      // Room extraction reads the LAST path segment (the whole URL contract pins
      // one segment; the page is what rejects anything else — AC-006-35/34).
      expect(roomFromJoinUrl('https://meet.rexi-ai.com/join/rexi-0123456789abcdef')).toBe(
        'rexi-0123456789abcdef'
      )
      expect(roomFromJoinUrl('https://meet.rexi-ai.com/join/notaroom')).toBeNull()
      expect(roomFromJoinUrl('https://meet.rexi-ai.com/rexi-0123456789ABCDEF')).toBeNull()
      expect(roomFromJoinUrl('not a url')).toBeNull()
    })
  })
})
