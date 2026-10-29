// AC-007 Task 7: the reschedule link in the booking confirmation emails.
// Acceptance tests per
// specs/007-client-requested-reschedule/20-acceptance/AC-007-reschedule-link.md
//
// Both client variants (billing-enabled in email.ts, billing-disabled in
// emailDirect.ts) must carry the link; the operator mail never does — the token
// is a client-only capability.
import fs from 'fs'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const cal = vi.hoisted(() => ({
  mockCreateEvent: vi.fn(),
  mockOverlap: vi.fn(),
}))

vi.mock('../domain/calendar', () => ({
  createCalendarEvent: cal.mockCreateEvent,
  findEventByBookingId: vi.fn(async () => false),
  findOverlappingBookingId: cal.mockOverlap,
  getBusyIntervals: vi.fn(async () => []),
}))

vi.mock('../../api/bookings/calendar', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/bookings/calendar')>()
  return { ...actual, hasConflict: vi.fn(async () => false) }
})

import bookingsHandler from '../../api/bookings'
import { sendClientEmail, sendOperatorEmail, type ClientEmailInput } from '../domain/email'
import { _resetRateLimit } from '../domain/rateLimit'

const BRAND = 'https://meet.rexi-ai.com'
const ROOM = 'rexi-0123456789abcdef'
const CLIENT = 'client@example.com'
const BOOKING_ID = 'cs_test_123'
const TOKEN = 'a'.repeat(64)
const JOIN_EN = `${BRAND}/${ROOM}?lang=en`
const JOIN_ES = `${BRAND}/${ROOM}?lang=es`

const CLIENT_INPUT: ClientEmailInput = {
  clientEmail: CLIENT,
  date: '2027-03-01',
  startTime: '10:00',
  hours: 1,
  joinUrl: JOIN_EN,
}

const OPERATOR_INPUT = {
  clientEmail: CLIENT,
  date: '2027-03-01',
  startTime: '10:00',
  hours: 1,
  amountCents: 0,
  joinUrl: JOIN_EN,
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

/** Every /reschedule/ URL in a rendered part, as { token, lang }. */
function rescheduleLinks(part: string): Array<{ token: string; lang: string }> {
  const found: Array<{ token: string; lang: string }> = []
  const pattern = new RegExp(
    `${BRAND.replace(/\./g, '\\.')}/reschedule/([^"\\s?]+)\\?lang=(\\w+)`,
    'g'
  )
  for (const match of part.matchAll(pattern)) found.push({ token: match[1]!, lang: match[2]! })
  return found
}

describe('AC-007 reschedule link in booking confirmations', () => {
  const savedEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env['RESEND_API_KEY'] = 're_test'
    process.env['EMAIL_FROM'] = 'hola@rexi-ai.com'
    process.env['EMAIL_TO'] = 'operator@example.com'
    process.env['MEETING_BASE_URL'] = BRAND
    process.env['BILLING_ENABLED'] = 'false'
    process.env['BOOKING_RATE_LIMIT'] = '1000'
    _resetRateLimit()
    cal.mockCreateEvent.mockResolvedValue({ alreadyExists: false })
    cal.mockOverlap.mockResolvedValue(null)
  })

  afterEach(() => {
    process.env = { ...savedEnv }
    vi.restoreAllMocks()
  })

  it('AC-007-35: Enabled client email carries the reschedule link', async () => {
    const payload = await capture((f) =>
      sendClientEmail({ ...CLIENT_INPUT, locale: 'en' }, f, { rescheduleToken: TOKEN })
    )
    expect(payload.text).toContain(`${BRAND}/reschedule/${TOKEN}?lang=en`)
    expect(payload.html).toContain(`${BRAND}/reschedule/${TOKEN}?lang=en`)
    expect(rescheduleLinks(payload.text)).toEqual([{ token: TOKEN, lang: 'en' }])
    // Below the join link, so it never competes with the one CTA (15-design).
    expect(payload.html.indexOf('/reschedule/')).toBeGreaterThan(
      payload.html.indexOf(CLIENT_INPUT.joinUrl!)
    )
  })

  it('AC-007-36: Disabled (direct) client email carries the reschedule link', async () => {
    const payload = await capture((f) =>
      sendClientEmail({ ...CLIENT_INPUT, joinUrl: JOIN_ES, locale: 'es' }, f, {
        billingDisabled: true,
        rescheduleToken: TOKEN,
      })
    )
    expect(payload.text).toContain(`${BRAND}/reschedule/${TOKEN}?lang=es`)
    expect(payload.html).toContain(`${BRAND}/reschedule/${TOKEN}?lang=es`)
    expect(rescheduleLinks(payload.text)).toEqual([{ token: TOKEN, lang: 'es' }])
    // Below the join CTA and above the help line: the design's reading order.
    const linkAt = payload.html.indexOf('/reschedule/')
    expect(linkAt).toBeGreaterThan(payload.html.indexOf(`href="${JOIN_ES}"`))
    expect(linkAt).toBeLessThan(payload.html.indexOf('¿Dudas? Responde a este correo.'))
  })

  it('AC-007-37: The reschedule URL reveals nothing beyond the token', async () => {
    for (const [mode, joinUrl, locale] of [
      [{ rescheduleToken: TOKEN }, JOIN_EN, 'en'],
      [{ billingDisabled: true, rescheduleToken: TOKEN }, JOIN_ES, 'es'],
    ] as const) {
      const payload = await capture((f) =>
        sendClientEmail({ ...CLIENT_INPUT, joinUrl, locale }, f, mode as any)
      )
      for (const part of [payload.text, payload.html]) {
        for (const link of rescheduleLinks(part)) {
          expect(link.token).toMatch(/^[0-9a-f]{64}$/)
          expect(link.token).toBe(TOKEN)
          expect(link.lang).toBe(locale)
        }
        const url = `${BRAND}/reschedule/${TOKEN}?lang=${locale}`
        expect(part).not.toContain(`${url}&`)
        // Nothing about the booking leaks into the link itself.
        const occurrences = part.split(`/reschedule/${TOKEN}?lang=${locale}`).length - 1
        expect(occurrences).toBeGreaterThan(0)
      }
      const link = `${BRAND}/reschedule/${TOKEN}?lang=${locale}`
      expect(link).not.toContain(CLIENT)
      expect(link).not.toContain(BOOKING_ID)
      expect(link).not.toContain(ROOM)
      expect(link).not.toContain(CLIENT_INPUT.date)
      expect(link).not.toContain(CLIENT_INPUT.startTime)
      expect(new URL(link).pathname.split('/').length).toBe(3)
    }
  })

  it('AC-007-38: The operator email carries no reschedule link', async () => {
    for (const mode of [undefined, { billingDisabled: true }]) {
      const payload = await capture((f) => sendOperatorEmail(OPERATOR_INPUT, f, mode as any))
      for (const part of [payload.subject, payload.text, payload.html]) {
        expect(part).not.toContain('/reschedule/')
        expect(part).not.toContain(TOKEN)
        expect(part).not.toMatch(/[0-9a-f]{64}/)
      }
    }
  })

  describe('unit: the link is optional and locale-driven', () => {
    it('a booking with no token carries no reschedule link in either variant', async () => {
      for (const mode of [undefined, { billingDisabled: true }]) {
        const payload = await capture((f) => sendClientEmail(CLIENT_INPUT, f, mode as any))
        expect(payload.text).not.toContain('/reschedule/')
        expect(payload.html).not.toContain('/reschedule/')
      }
    })

    it('a booking with no locale falls back to Spanish in the link', async () => {
      const payload = await capture((f) =>
        sendClientEmail(CLIENT_INPUT, f, { rescheduleToken: TOKEN })
      )
      expect(payload.text).toContain(`/reschedule/${TOKEN}?lang=es`)
    })

    it('a malformed token produces no link at all, in either variant', async () => {
      // AC-007-37: the path segment must be exactly the 64-hex token. Anything
      // else has no honest URL to build, so the line is dropped rather than
      // printing a link whose path would 404 (or worse, say something else).
      for (const token of ['not-a-token', 'A'.repeat(64), TOKEN.slice(0, 63)]) {
        for (const mode of [undefined, { billingDisabled: true }]) {
          const payload = await capture((f) =>
            sendClientEmail(CLIENT_INPUT, f, { ...(mode ?? {}), rescheduleToken: token } as any)
          )
          expect(payload.text).not.toContain('/reschedule/')
          expect(payload.html).not.toContain('/reschedule/')
        }
      }
    })

    it('the token in the link is the SAME value written to the calendar event', async () => {
      // The one wiring invariant that cannot be checked in isolation: a token
      // minted for the mail that differs from the one persisted on the event
      // makes every link in every confirmation a 404.
      vi.spyOn(fs, 'readFileSync').mockReturnValue(
        `
timezone: Europe/Madrid
weekly:
  monday:
    - {start: "09:00", end: "13:00"}
exceptions: {}
` as any
      )
      const payloads: any[] = []
      vi.stubGlobal(
        'fetch',
        vi.fn(async (_url: string, init: any) => {
          payloads.push(JSON.parse(init.body))
          return { ok: true, status: 200, text: async () => '' }
        })
      )

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        setHeader: vi.fn().mockReturnThis(),
      } as any
      await bookingsHandler(
        {
          method: 'POST',
          body: {
            name: 'Ana López',
            email: CLIENT,
            date: '2027-03-01',
            startTime: '10:00',
            hours: 1,
          },
          headers: { 'x-forwarded-for': '198.51.100.4' },
        } as any,
        res
      )
      expect(res.status).toHaveBeenCalledWith(200)

      const persisted = cal.mockCreateEvent.mock.calls[0][0].rescheduleToken
      expect(persisted).toMatch(/^[0-9a-f]{64}$/)

      const clientMail = payloads.find((p) => p.to === CLIENT)
      const operatorMail = payloads.find((p) => p.to === 'operator@example.com')
      expect(rescheduleLinks(clientMail.text)).toEqual([{ token: persisted, lang: 'es' }])
      expect(rescheduleLinks(clientMail.html)).toEqual([{ token: persisted, lang: 'es' }])
      // Spec 007 Task 7: the operator mail carries neither the link nor the token.
      expect(operatorMail.text).not.toContain(persisted)
      expect(operatorMail.html).not.toContain(persisted)
      expect(operatorMail.html).not.toContain('/reschedule/')
      vi.unstubAllGlobals()
    })

    it('an unconfigured brand omits the link rather than inventing a host', async () => {
      delete process.env['MEETING_BASE_URL']
      const payload = await capture((f) =>
        sendClientEmail(CLIENT_INPUT, f, { rescheduleToken: TOKEN })
      )
      expect(payload.text).not.toContain('/reschedule/')
      expect(payload.text).toContain(CLIENT_INPUT.date)
    })
  })
})
