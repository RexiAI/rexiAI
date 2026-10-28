// AC-007 Task 6: reschedule notifications (operator + client).
// Acceptance tests per
// specs/007-client-requested-reschedule/20-acceptance/AC-007-reschedule-emails.md
//
// Both mails ride the existing email.ts / emailDirect.ts plumbing; the consent
// notice and locale rules are spec 006's, not new ones.
import fs from 'fs'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const cal = vi.hoisted(() => ({
  mockFindBooking: vi.fn(),
  mockMove: vi.fn(),
  mockOverlap: vi.fn(),
}))

vi.mock('../domain/calendar', () => ({
  findBookingByRescheduleToken: cal.mockFindBooking,
  moveCalendarEvent: cal.mockMove,
  findOverlappingBookingId: cal.mockOverlap,
}))

import rescheduleHandler from '../../api/reschedule'
import { NOTICE_EN, NOTICE_ES } from '../domain/consentNotice'
import {
  sendLimitBlockedOperatorEmail,
  sendRescheduleClientEmail,
  sendRescheduleOperatorEmail,
} from '../domain/email'
import { localeFreeJoinUrl } from '../domain/meetingUrl'
import { _resetRateLimit } from '../domain/rateLimit'

const yamlContent = `
timezone: Europe/Madrid
weekly:
  monday:
    - {start: "09:00", end: "13:00"}
  tuesday:
    - {start: "09:00", end: "13:00"}
exceptions: {}
`

const BRAND = 'https://meet.rexi-ai.com'
const ROOM = 'rexi-0123456789abcdef'
const JOIN_EN = `${BRAND}/${ROOM}?lang=en`
const JOIN_ES = `${BRAND}/${ROOM}?lang=es`
const CLIENT = 'a@b.com'
const OPERATOR = 'operator@example.com'
const BOOKING_ID = 'cs_test_123'
const TOKEN_OLD = 'a'.repeat(64)
const TOKEN_NEW = 'b'.repeat(64)

const OPERATOR_INPUT = {
  clientEmail: CLIENT,
  oldDate: '2027-03-01',
  oldStartTime: '10:00',
  date: '2027-03-02',
  startTime: '09:00',
  hours: 1,
  bookingId: BOOKING_ID,
  joinUrl: JOIN_EN,
  count: 1,
}

const CLIENT_INPUT = {
  clientEmail: CLIENT,
  date: '2027-03-02',
  startTime: '09:00',
  hours: 1,
  joinUrl: JOIN_EN,
  locale: 'en',
  rescheduleToken: TOKEN_NEW,
}

/** Captures the Resend payloads a send produces. */
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

describe('AC-007 reschedule notifications', () => {
  const savedEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    _resetRateLimit()
    process.env['RESEND_API_KEY'] = 're_test'
    process.env['EMAIL_FROM'] = 'hola@rexi-ai.com'
    process.env['EMAIL_TO'] = OPERATOR
    process.env['MEETING_BASE_URL'] = BRAND
    process.env['BOOKING_RATE_LIMIT'] = '1000'
    delete process.env['AVAILABILITY_TIMEZONE']
    delete process.env['TIMEZONE']
    vi.spyOn(fs, 'readFileSync').mockReturnValue(yamlContent as any)
  })

  afterEach(() => {
    process.env = { ...savedEnv }
    vi.restoreAllMocks()
  })

  it('AC-007-29: Operator is notified with old and new slot, bookingId, and count', async () => {
    const payload = await capture((f) => sendRescheduleOperatorEmail(OPERATOR_INPUT, f))

    expect(payload.to).toBe(OPERATOR)
    expect(payload.subject).toContain(CLIENT)
    expect(payload.subject).toContain('2027-03-01 10:00')
    expect(payload.subject).toContain('2027-03-02 09:00')
    for (const part of [payload.text, payload.html]) {
      expect(part).toContain(CLIENT)
      expect(part).toContain('2027-03-01 10:00')
      expect(part).toContain('2027-03-02 09:00')
      expect(part).toContain(BOOKING_ID)
      expect(part).toContain(localeFreeJoinUrl(JOIN_EN))
    }
    expect(payload.text).toContain('Cambios: 1')
  })

  it('AC-007-30: Operator email is locale-free and never carries the consent notice', async () => {
    const payload = await capture((f) => sendRescheduleOperatorEmail(OPERATOR_INPUT, f))

    for (const part of [payload.text, payload.html]) {
      expect(part).not.toContain('?lang=')
      expect(part).not.toContain('lang=en')
      expect(part).toContain(`${BRAND}/${ROOM}`)
    }
    for (const line of [...NOTICE_ES, ...NOTICE_EN]) {
      expect(payload.text).not.toContain(line)
      expect(payload.html).not.toContain(line)
    }
    expect(payload.text).not.toMatch(/Aviso de grabación|Recording notice/i)
  })

  it('AC-007-31: Client confirmation carries the new slot, notice, and join link', async () => {
    const payload = await capture((f) => sendRescheduleClientEmail(CLIENT_INPUT, f))
    const noticeAt = payload.html.indexOf(NOTICE_EN[0])

    expect(payload.to).toBe(CLIENT)
    for (const part of [payload.text, payload.html]) {
      expect(part).toContain('2027-03-02')
      expect(part).toContain('09:00')
      expect(part).toContain(`${JOIN_EN}`)
    }
    expect(noticeAt).toBeGreaterThan(-1)
    expect(payload.html).toContain(NOTICE_EN[1])
    // Before the join link, not after it (AC-006-07's rule, reused here).
    expect(noticeAt).toBeLessThan(payload.html.indexOf(`href="${JOIN_EN}"`))
  })

  it('AC-007-32: Client confirmation carries the new rotated token', async () => {
    const payload = await capture((f) => sendRescheduleClientEmail(CLIENT_INPUT, f))

    for (const part of [payload.text, payload.html]) {
      expect(part).toContain(`${BRAND}/reschedule/${TOKEN_NEW}?lang=en`)
      expect(part).not.toContain(TOKEN_OLD)
    }
  })

  it('AC-007-33: Operator is notified when the limit blocks a further reschedule', async () => {
    const payload = await capture((f) =>
      sendLimitBlockedOperatorEmail(
        {
          clientEmail: CLIENT,
          bookingId: BOOKING_ID,
          date: '2027-03-02',
          startTime: '09:00',
          count: 3,
          requestedDate: '2027-03-03',
          requestedStartTime: '11:00',
        },
        f
      )
    )

    expect(payload.to).toBe(OPERATOR)
    expect(payload.subject).toContain(CLIENT)
    expect(payload.subject.toLowerCase()).toContain('bloqueado')
    for (const part of [payload.text, payload.html]) {
      expect(part).toContain(CLIENT)
      expect(part).toContain(BOOKING_ID)
      expect(part).toContain('2027-03-03 11:00')
      // The client-only capability never leaks into operator mail.
      expect(part).not.toContain('/reschedule/')
    }
  })

  describe('failure policy (decision D5: the move always stands)', () => {
    const BOOKING = {
      bookingId: BOOKING_ID,
      email: CLIENT,
      date: '2027-03-01',
      startTime: '10:00',
      hours: 1,
      joinUrl: JOIN_EN,
      locale: 'en' as const,
      count: 0,
    }

    function makeRes() {
      return {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        setHeader: vi.fn().mockReturnThis(),
      } as any
    }

    function makeReq() {
      return {
        method: 'POST',
        body: { token: TOKEN_OLD, date: '2027-03-02', startTime: '09:00' },
        headers: { 'x-forwarded-for': '203.0.113.7' },
      } as any
    }

    /** Stubs global fetch so the send to `failingRecipient` rejects. */
    function stubResend(failingRecipient?: string): void {
      const stub = vi.fn(async (_url: string, init: any) => {
        const payload = JSON.parse(init.body)
        if (payload.to === failingRecipient) throw new Error('Resend exploded UPSTREAM-DETAIL')
        return { ok: true, status: 200, text: async () => '' } as Response
      })
      vi.stubGlobal('fetch', stub as unknown as typeof fetch)
    }

    beforeEach(() => {
      cal.mockFindBooking.mockResolvedValue(BOOKING)
      cal.mockOverlap.mockResolvedValue(null)
      cal.mockMove.mockResolvedValue(undefined)
    })

    it('AC-007-34: An operator-notification failure surfaces loudly and never rolls back the move', async () => {
      stubResend(OPERATOR)
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const res = makeRes()

      await rescheduleHandler(makeReq(), res)

      const status = res.status.mock.calls[0][0]
      expect(status).toBeGreaterThanOrEqual(500)
      // The move stands: exactly one move, and nothing compensating it.
      expect(cal.mockMove).toHaveBeenCalledTimes(1)
      expect(cal.mockFindBooking).toHaveBeenCalledTimes(1)
      // Logged, so the alert path can see it.
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('UPSTREAM-DETAIL'))
    })

    it('AC-007-49: A client-confirmation failure is logged and the move stands', async () => {
      stubResend(CLIENT)
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const res = makeRes()

      await rescheduleHandler(makeReq(), res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(cal.mockMove).toHaveBeenCalledTimes(1)
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('UPSTREAM-DETAIL'))
    })
  })

  it('AC-007-50: The client reschedule confirmation is Spanish-body with only the notice localised', async () => {
    const payload = await capture((f) => sendRescheduleClientEmail(CLIENT_INPUT, f))

    // Spanish body: subject, heading, fact labels, help line, CTA label.
    expect(payload.subject).toBe('Tu reunión se ha movido: 2027-03-02 09:00')
    // The heading is the HTML H1; the text part opens with the intro, exactly as
    // the booking confirmation does.
    expect(payload.html).toContain('Tu reunión se ha movido')
    expect(payload.text).toContain('Tu reunión con RexiAI tiene una nueva hora.')
    for (const part of [payload.text, payload.html]) {
      expect(part).toContain('Fecha')
      expect(part).toContain('Hora (Europe/Madrid)')
      expect(part).toContain('Duración')
      expect(part).toContain('¿Dudas? Responde a este correo.')
      expect(part).toContain('Unirse a la reunión')
    }
    // Only the notice localises, and only it carries lang="en".
    expect(payload.html).toContain(NOTICE_EN[0])
    expect(payload.html).not.toContain(NOTICE_ES[0])
    expect(payload.html).toContain(' lang="en"')
    // The join URL keeps the booking's locale.
    expect(payload.text).toContain('?lang=en')
  })

  describe('unit: the client reschedule mail degrades safely', () => {
    it('a Spanish booking gets the Spanish notice and ?lang=es', async () => {
      const payload = await capture((f) =>
        sendRescheduleClientEmail({ ...CLIENT_INPUT, locale: 'es', joinUrl: JOIN_ES }, f)
      )
      expect(payload.html).toContain(NOTICE_ES[0])
      expect(payload.html).not.toContain(NOTICE_EN[0])
      expect(payload.text).toContain('?lang=es')
    })

    it('no join URL means no join CTA but the mail still sends', async () => {
      const payload = await capture((f) =>
        sendRescheduleClientEmail({ ...CLIENT_INPUT, joinUrl: null }, f)
      )
      expect(payload.text).toContain('2027-03-02')
      expect(payload.html).not.toContain(`href="${JOIN_EN}"`)
      expect(payload.text).toContain('/reschedule/')
    })

    it('without a configured brand the reschedule link is omitted, never guessed', async () => {
      delete process.env['MEETING_BASE_URL']
      const payload = await capture((f) => sendRescheduleClientEmail(CLIENT_INPUT, f))
      expect(payload.text).toContain('2027-03-02')
      expect(payload.text).not.toContain('/reschedule/')
    })

    it('the operator mail renders the duration from the stored hours', async () => {
      const payload = await capture((f) =>
        sendRescheduleOperatorEmail({ ...OPERATOR_INPUT, hours: 2 }, f)
      )
      expect(payload.text).toContain('2 horas')
    })
  })
})
