// AC-003 Task 1: Google Calendar TEMPLATE link builder (spec 003,
// 20-acceptance/AC-003-calendar-link.md). Pure URL builder — slot times derive
// from the SAME env timezone chain the direct-path calendar event uses
// (AVAILABILITY_TIMEZONE → TIMEZONE → Europe/Madrid via src/domain/time.ts),
// never a second conversion or a fixed UTC offset.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildCalendarTemplateUrl } from '../domain/calendarLink'

const TITLE = 'Sesión con RexiAI'
const JOIN = 'https://meet.jit.si/rexi-cal'
const DETAILS = `Enlace de acceso a la sesión: ${JOIN}`

const ENV_KEYS = ['AVAILABILITY_TIMEZONE', 'TIMEZONE'] as const
const savedEnv: Record<string, string | undefined> = {}

function build(overrides: Partial<Parameters<typeof buildCalendarTemplateUrl>[0]> = {}): string {
  return buildCalendarTemplateUrl({
    date: '2027-03-01',
    startTime: '10:00',
    hours: 2,
    title: TITLE,
    details: DETAILS,
    ...overrides,
  })
}

function datesParam(url: string): string {
  return url.split('&dates=')[1].split('&details=')[0]
}

/** 'YYYYMMDDTHHMMSSZ' → epoch ms. The stamps are fixed-width by construction. */
function parseStamp(stamp: string): number {
  return Date.UTC(
    Number(stamp.slice(0, 4)),
    Number(stamp.slice(4, 6)) - 1,
    Number(stamp.slice(6, 8)),
    Number(stamp.slice(9, 11)),
    Number(stamp.slice(11, 13)),
    Number(stamp.slice(13, 15))
  )
}

describe('AC-003 calendar link builder', () => {
  beforeEach(() => {
    for (const k of ENV_KEYS) {
      savedEnv[k] = process.env[k]
      delete process.env[k]
    }
  })

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (savedEnv[k] === undefined) delete process.env[k]
      else process.env[k] = savedEnv[k] as string
    }
  })

  it('AC-003-10: TEMPLATE URL shape, UTC dates from the slot, duration, and full encoding', () => {
    const url = build()
    expect(url).toBe(
      'https://calendar.google.com/calendar/render?action=TEMPLATE' +
        `&text=${encodeURIComponent(TITLE)}` +
        '&dates=20270301T090000Z/20270301T110000Z' +
        `&details=${encodeURIComponent(DETAILS)}`
    )
    expect(decodeURIComponent(url.split('&details=')[1])).toContain(JOIN)
    const [start, end] = datesParam(url).split('/')
    expect(parseStamp(end) - parseStamp(start)).toBe(2 * 3600000)
  })

  it('AC-003-11: Timezone env chain drives the conversion, same as the calendar event', () => {
    process.env['AVAILABILITY_TIMEZONE'] = 'America/New_York'
    expect(datesParam(build({ hours: 1 }))).toBe('20270301T150000Z/20270301T160000Z')

    delete process.env['AVAILABILITY_TIMEZONE']
    process.env['TIMEZONE'] = 'Europe/Lisbon'
    expect(datesParam(build({ hours: 1 }))).toBe('20270301T100000Z/20270301T110000Z')

    // Empty AVAILABILITY_TIMEZONE behaves as unset (truthiness parity with
    // resolveCalendarTimezone in api/bookings/direct.ts).
    process.env['AVAILABILITY_TIMEZONE'] = ''
    expect(datesParam(build({ hours: 1 }))).toBe('20270301T100000Z/20270301T110000Z')

    delete process.env['AVAILABILITY_TIMEZONE']
    delete process.env['TIMEZONE']
    expect(datesParam(build({ hours: 1 }))).toBe('20270301T090000Z/20270301T100000Z')
  })

  it('AC-003-12: Summer-time slots convert with the DST offset, never a fixed one', () => {
    const summer = build({ date: '2027-07-15', hours: 1 })
    expect(datesParam(summer)).toBe('20270715T080000Z/20270715T090000Z')
    // The same wall-clock time in winter is CET (UTC+1) while July is CEST
    // (UTC+2): a hardcoded offset would give identical conversions for both.
    const winter = build({ date: '2027-03-01', hours: 1 })
    expect(datesParam(winter)).toBe('20270301T090000Z/20270301T100000Z')
  })

  it('AC-003-13: Hostile and special-character values are percent-encoded, separators stay structural', () => {
    const title = 'Reunión "urgente" <script>& x=1'
    const details = 'Únete: https://meet.jit.si/rexi-abc?a=1&b=2#frag'
    const url = build({ title, details })
    const rawCount = (s: string, ch: string) => s.split(ch).length - 1
    expect(rawCount(url, '&')).toBe(3)
    expect(rawCount(url, '=')).toBe(4)
    for (const ch of [' ', '<', '>', '"', "'"]) {
      expect(url).not.toContain(ch)
    }
    expect(url.split('&text=')[1].split('&dates=')[0]).toBe(encodeURIComponent(title))
    expect(url.split('&details=')[1]).toBe(encodeURIComponent(details))
    expect(datesParam(url)).toMatch(/^\d{8}T\d{6}Z\/\d{8}T\d{6}Z$/)
  })

  describe('unit: builder boundaries the scenarios do not spell out', () => {
    it('empty details never throws and still returns a well-formed encoded URL', () => {
      const url = build({ details: '' })
      expect(url.endsWith('&details=')).toBe(true)
      expect(url.split('&').length).toBe(4)
    })

    it('hours pass straight through to the end timestamp (4h)', () => {
      const [start, end] = datesParam(build({ hours: 4 })).split('/')
      expect(start).toBe('20270301T090000Z')
      expect(parseStamp(end) - parseStamp(start)).toBe(4 * 3600000)
    })
  })
})
