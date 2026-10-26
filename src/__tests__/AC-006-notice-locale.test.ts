// AC-006 Task 8: the consent notice follows the booking's language; Spanish is the
// default and only the notice (+ the join URL's lang value) ever localises.
// Acceptance tests per
// specs/006-branded-meeting-link-and-recording-bot/20-acceptance/AC-006-notice-locale.md
import fs from 'fs'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import bookingsHandler from '../../api/bookings'
import { NOTICE_EN, NOTICE_ES } from '../domain/consentNotice'
import { sendClientEmail, sendOperatorEmail, type ClientEmailInput } from '../domain/email'
import { createMeetingLink, type MeetingResult } from '../domain/meeting'
import { _resetRateLimit } from '../domain/rateLimit'

const mocks = vi.hoisted(() => ({
  mockGetStripe: vi.fn(),
  mockFreeHourAvailable: vi.fn(),
  mockMarkFreeHour: vi.fn(),
  mockHasConflict: vi.fn(),
  mockCreateCalendarEvent: vi.fn(),
  mockOverlap: vi.fn(),
}))

vi.mock('../domain/stripeClient', () => ({ getStripe: mocks.mockGetStripe }))
vi.mock('../domain/freeHour', () => ({
  isFreeHourAvailable: mocks.mockFreeHourAvailable,
  markFreeHourUsed: mocks.mockMarkFreeHour,
}))
vi.mock('../domain/calendar', () => ({
  createCalendarEvent: mocks.mockCreateCalendarEvent,
  findEventByBookingId: vi.fn(async () => false),
  findOverlappingBookingId: mocks.mockOverlap,
}))
vi.mock('../../api/bookings/calendar', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/bookings/calendar')>()
  return { ...actual, hasConflict: mocks.mockHasConflict }
})

const yamlContent = `
timezone: Europe/Madrid
weekly:
  monday:
    - {start: "09:00", end: "13:00"}
exceptions: {}
`

const BRAND = 'https://meet.rexi-ai.com'
const ROOM = 'rexi-0123456789abcdef'
const JOIN_ES = `${BRAND}/${ROOM}?lang=es`
const JOIN_EN = `${BRAND}/${ROOM}?lang=en`
const CLIENT = 'client@example.com'
const OPERATOR = 'operator@example.com'
const DIRECT_MODE = { billingDisabled: true }

const CLIENT_INPUT: ClientEmailInput = {
  clientEmail: CLIENT,
  date: '2027-03-01',
  startTime: '10:00',
  hours: 2,
  joinUrl: JOIN_ES,
}

async function capture(
  send: (fetchImpl: typeof fetch) => Promise<void>
): Promise<{ subject: string; text: string; html: string; to: string }> {
  const calls: any[] = []
  const fetchImpl = vi.fn(async (_url: string, init: any) => {
    calls.push(JSON.parse(init.body))
    return { ok: true, status: 200, text: async () => '' } as any
  }) as unknown as typeof fetch
  await send(fetchImpl)
  expect(calls).toHaveLength(1)
  return calls[0]
}

function captureClient(input: ClientEmailInput, mode?: unknown) {
  return capture((fetchImpl) => sendClientEmail(input, fetchImpl, mode as any))
}

function expectExactNotice(part: string, notice: readonly [string, string]): void {
  expect(part).toContain(notice[0])
  expect(part).toContain(notice[1])
}

function expectNoNotice(part: string, notice: readonly [string, string]): void {
  expect(part).not.toContain(notice[0])
  expect(part).not.toContain(notice[1])
}

/** Occurrences of a literal, counted without regex escaping surprises. */
function count(part: string, literal: string): number {
  return part.split(literal).length - 1
}

/** Normalises a rendered email so only the notice text and the join-url `lang`
 *  value can differ; the English notice's own `lang="en"` attribute is part of
 *  the notice block, so it is stripped with it. */
function normalise(part: string, notice: readonly [string, string]): string {
  return part
    .split(notice[0])
    .join('')
    .split(notice[1])
    .join('')
    .split(' lang="en"')
    .join('')
    .split('lang=en')
    .join('lang=__')
    .split('lang=es')
    .join('lang=__')
    // the calendar CTA percent-encodes the join URL (encodeURIComponent)
    .split('lang%3Den')
    .join('lang=__')
    .split('lang%3Des')
    .join('lang=__')
}

function makeRes() {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() } as any
}

describe('AC-006 locale-aware consent notice', () => {
  const savedEnv = { ...process.env }
  let resendPayloads: any[] = []

  beforeEach(() => {
    vi.clearAllMocks()
    _resetRateLimit()
    resendPayloads = []
    process.env['RESEND_API_KEY'] = 're_test'
    process.env['EMAIL_FROM'] = 'info@rexi-ai.com'
    process.env['EMAIL_TO'] = OPERATOR
    process.env['MEETING_BASE_URL'] = BRAND
    process.env['BILLING_ENABLED'] = 'false'
    process.env['BOOKING_RATE_LIMIT'] = '1000'
    delete process.env['AVAILABILITY_TIMEZONE']
    delete process.env['TIMEZONE']
    vi.spyOn(fs, 'readFileSync').mockReturnValue(yamlContent as any)

    const fetchStub = vi.fn(async (_url: string, init: any) => {
      resendPayloads.push(JSON.parse(init.body))
      return { ok: true, status: 200, text: async () => '' } as Response
    })
    vi.stubGlobal('fetch', fetchStub as unknown as typeof fetch)

    mocks.mockGetStripe.mockReturnValue({})
    mocks.mockHasConflict.mockResolvedValue(false)
    mocks.mockFreeHourAvailable.mockResolvedValue(true)
    mocks.mockMarkFreeHour.mockResolvedValue({ burned: true })
    mocks.mockOverlap.mockResolvedValue(null)
    mocks.mockCreateCalendarEvent.mockResolvedValue({ alreadyExists: false })
  })

  afterEach(() => {
    process.env = { ...savedEnv }
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('AC-006-27: the Spanish locale renders the exact Spanish notice in both variants', async () => {
    for (const mode of [undefined, DIRECT_MODE]) {
      const payload = await captureClient({ ...CLIENT_INPUT, locale: 'es' }, mode)
      expectExactNotice(payload.text, NOTICE_ES)
      expectExactNotice(payload.html, NOTICE_ES)
      expectNoNotice(payload.text, NOTICE_EN)
      expectNoNotice(payload.html, NOTICE_EN)
      // The two Spanish lines are the only consent notice present.
      expect(count(payload.text, NOTICE_ES[0])).toBe(1)
      expect(count(payload.html, NOTICE_ES[0])).toBe(1)
    }
  })

  it('AC-006-28: the English locale renders the exact English notice, before the join link', async () => {
    for (const mode of [undefined, DIRECT_MODE]) {
      const payload = await captureClient({ ...CLIENT_INPUT, joinUrl: JOIN_EN, locale: 'en' }, mode)
      expectExactNotice(payload.text, NOTICE_EN)
      expectExactNotice(payload.html, NOTICE_EN)
      expectNoNotice(payload.text, NOTICE_ES)
      expectNoNotice(payload.html, NOTICE_ES)
      // Before the join link in reading order, in both parts.
      expect(payload.text.indexOf(NOTICE_EN[0])).toBeLessThan(payload.text.indexOf(JOIN_EN))
      expect(payload.html.indexOf(NOTICE_EN[1])).toBeLessThan(payload.html.indexOf(JOIN_EN))
    }
  })

  it('AC-006-29: missing or unrecognised locales fall back to Spanish and never throw', async () => {
    const locales: Array<string | null | undefined> = [undefined, null, 'fr', '', 'EN', 'de-DE']
    for (const locale of locales) {
      for (const mode of [undefined, DIRECT_MODE]) {
        const payload = await captureClient({ ...CLIENT_INPUT, locale }, mode)
        expectExactNotice(payload.text, NOTICE_ES)
        expectNoNotice(payload.text, NOTICE_EN)
        expectNoNotice(payload.html, NOTICE_EN)
      }
    }
  })

  it('AC-006-30: locale changes only the notice and the join URL lang value', async () => {
    for (const mode of [undefined, DIRECT_MODE]) {
      const es = await captureClient({ ...CLIENT_INPUT, joinUrl: JOIN_ES, locale: 'es' }, mode)
      const en = await captureClient({ ...CLIENT_INPUT, joinUrl: JOIN_EN, locale: 'en' }, mode)

      // Exactly two permitted differences: the notice lines and the lang value.
      expect(normalise(en.text, NOTICE_EN)).toBe(normalise(es.text, NOTICE_ES))
      expect(normalise(en.html, NOTICE_EN)).toBe(normalise(es.html, NOTICE_ES))
    }

    // Everything else is still today's Spanish locked copy, byte for byte.
    const es = await captureClient({ ...CLIENT_INPUT, joinUrl: JOIN_ES, locale: 'es' }, DIRECT_MODE)
    const calendarLine = es.text
      .split('\n')
      .find((line) => line.startsWith('Añadir a Google Calendar: ')) as string
    expect(es.text.split('\n').filter((l) => !(NOTICE_ES as readonly string[]).includes(l))).toEqual([
      'Tu reserva con RexiAI está confirmada.',
      'Fecha: 2027-03-01',
      'Hora (Europe/Madrid): 10:00',
      'Duración: 2 horas',
      'Enlace de la reunión: ' + JOIN_ES,
      calendarLine,
      '¿Dudas? Responde a este correo.',
    ])
  })

  it('AC-006-31: the operator email is byte-identical regardless of the booking locale', async () => {
    const operatorInput = {
      clientEmail: CLIENT,
      date: '2027-03-01',
      startTime: '10:00',
      hours: 2,
      amountCents: 0,
    }
    for (const mode of [undefined, DIRECT_MODE]) {
      // The only locale-bearing input an operator mail could receive is the join
      // URL it is handed; the mail itself must not vary with it.
      const es = await capture((f) =>
        sendOperatorEmail({ ...operatorInput, joinUrl: JOIN_ES }, f, mode as any)
      )
      const en = await capture((f) =>
        sendOperatorEmail({ ...operatorInput, joinUrl: JOIN_EN }, f, mode as any)
      )
      expect(en.text).toBe(es.text)
      expect(en.html).toBe(es.html)
      for (const line of [...NOTICE_ES, ...NOTICE_EN]) {
        expect(es.text).not.toContain(line)
        expect(es.html).not.toContain(line)
      }
    }
  })

  it('AC-006-33: the join URL in the email carries lang matching the booking locale', async () => {
    for (const mode of [undefined, DIRECT_MODE]) {
      const es = await captureClient({ ...CLIENT_INPUT, joinUrl: JOIN_ES, locale: 'es' }, mode)
      const en = await captureClient({ ...CLIENT_INPUT, joinUrl: JOIN_EN, locale: 'en' }, mode)
      for (const part of [es.text, es.html]) expect(part).toContain(`?lang=es`)
      for (const part of [en.text, en.html]) expect(part).toContain(`?lang=en`)
      // Host, path and room unchanged; exactly one query parameter.
      for (const joinUrl of [JOIN_ES, JOIN_EN]) {
        const url = new URL(joinUrl)
        expect(url.host).toBe('meet.rexi-ai.com')
        expect(url.pathname).toBe(`/${ROOM}`)
        expect([...url.searchParams.keys()]).toEqual(['lang'])
      }
    }
  })

  describe('AC-006-33: the join URL is produced with the booking locale, end to end', () => {
    function makeBookingReq(body: Record<string, unknown>) {
      return {
        method: 'POST',
        body: { email: CLIENT, date: '2027-03-01', startTime: '10:00', hours: 1, ...body },
        headers: {
          host: 'example.com',
          'x-forwarded-proto': 'https',
          'x-forwarded-for': '203.0.113.9',
        },
      } as any
    }

    function clientPayload(): any {
      const matches = resendPayloads.filter((p) => p.to === CLIENT)
      expect(matches).toHaveLength(1)
      return matches[0]
    }

    it('an English booking sends ?lang=en and the English notice', async () => {
      const res = makeRes()
      await bookingsHandler(makeBookingReq({ locale: 'en' }), res)
      expect(res.status).toHaveBeenCalledWith(200)
      const payload = clientPayload()
      expect(payload.text).toMatch(/\/rexi-[0-9a-f]{16}\?lang=en/)
      expectExactNotice(payload.text, NOTICE_EN)
      expectExactNotice(payload.html, NOTICE_EN)
    })

    it('a Spanish booking sends ?lang=es and the Spanish notice', async () => {
      const res = makeRes()
      await bookingsHandler(makeBookingReq({ locale: 'es' }), res)
      expect(res.status).toHaveBeenCalledWith(200)
      const payload = clientPayload()
      expect(payload.text).toMatch(/\/rexi-[0-9a-f]{16}\?lang=es/)
      expectExactNotice(payload.text, NOTICE_ES)
    })

    it('an unrecognised locale is treated as Spanish, never rejected', async () => {
      const res = makeRes()
      await bookingsHandler(makeBookingReq({ locale: 'fr' }), res)
      expect(res.status).toHaveBeenCalledWith(200) // the booking still happens
      const payload = clientPayload()
      expect(payload.text).toMatch(/\/rexi-[0-9a-f]{16}\?lang=es/)
      expectExactNotice(payload.text, NOTICE_ES)
      expectNoNotice(payload.text, NOTICE_EN)
    })
  })

  describe('unit: locale normalisation and link/notice coupling', () => {
    it('only "en" selects English; everything else is Spanish', async () => {
      const { normalizeLocale } = await import('../domain/locale')
      expect(normalizeLocale('en')).toBe('en')
      for (const raw of ['es', 'fr', 'EN', '', null, undefined, 42, {}]) {
        expect(normalizeLocale(raw)).toBe('es')
      }
    })

    it('the notice and the link locale are selected from the same value', async () => {
      const joinFor = async (locale: unknown): Promise<string> => {
        const result: MeetingResult = await createMeetingLink({
          date: '2027-03-01',
          startTime: '10:00',
          hours: 1,
          subject: 'AC-006',
          locale: locale as string,
        })
        if (result.status !== 'ok') throw new Error('expected an ok meeting result')
        return result.joinUrl
      }
      for (const [locale, lang, notice] of [
        ['en', 'en', NOTICE_EN],
        ['es', 'es', NOTICE_ES],
        ['fr', 'es', NOTICE_ES],
      ] as const) {
        const joinUrl = await joinFor(locale)
        expect(new URL(joinUrl).searchParams.get('lang')).toBe(lang)
        const payload = await captureClient({ ...CLIENT_INPUT, joinUrl, locale }, DIRECT_MODE)
        expectExactNotice(payload.text, notice)
      }
    })
  })
})
