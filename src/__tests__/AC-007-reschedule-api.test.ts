// AC-007 Task 5: the resolve + submit endpoints.
// Acceptance tests per
// specs/007-client-requested-reschedule/20-acceptance/AC-007-reschedule-api.md
//
// Billing-agnostic by construction: booking state comes from the calendar event,
// so the billing-disabled path (a UUID booking id with no Stripe session at all)
// behaves identically.
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

const mail = vi.hoisted(() => ({
  mockOperator: vi.fn(),
  mockClient: vi.fn(),
  mockLimit: vi.fn(),
}))

vi.mock('../domain/email', () => ({
  sendRescheduleOperatorEmail: mail.mockOperator,
  sendRescheduleClientEmail: mail.mockClient,
  sendLimitBlockedOperatorEmail: mail.mockLimit,
}))

const stripe = vi.hoisted(() => ({ mockGetStripe: vi.fn() }))
vi.mock('../domain/stripeClient', () => ({ getStripe: stripe.mockGetStripe }))

import rescheduleHandler from '../../api/reschedule'
import type { BookingRescheduleState } from '../../src/domain/calendar'
import { _resetRateLimit } from '../../src/domain/rateLimit'

const yamlContent = `
timezone: Europe/Madrid
weekly:
  monday:
    - {start: "09:00", end: "13:00"}
exceptions: {}
`

const TOKEN = 'a'.repeat(64)
const ROTATED = 'b'.repeat(64)
const WRONG = 'c'.repeat(64)
const JOIN = 'https://meet.rexi-ai.com/rexi-0123456789abcdef?lang=es'
const IP = '203.0.113.5'

const BOOKING: BookingRescheduleState = {
  bookingId: 'cs_test_123',
  email: 'client@example.com',
  date: '2027-03-01',
  startTime: '10:00',
  hours: 1,
  joinUrl: JOIN,
  locale: 'es',
  count: 0,
}

const ENV_KEYS = [
  'BOOKING_RATE_LIMIT',
  'BOOKING_RATE_WINDOW_MIN',
  'AVAILABILITY_TIMEZONE',
  'TIMEZONE',
]

function makeRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
  } as any
}

function getReq(token: string | null = TOKEN, headers: Record<string, string> = {}) {
  return {
    method: 'GET',
    query: token === null ? {} : { token },
    headers: { 'x-forwarded-for': IP, ...headers },
  } as any
}

function postReq(body: unknown, headers: Record<string, string> = {}) {
  return {
    method: 'POST',
    body,
    headers: { 'x-forwarded-for': IP, ...headers },
  } as any
}

function bodyOf(res: any): any {
  return res.json.mock.calls[res.json.mock.calls.length - 1][0]
}

describe('AC-007 reschedule API', () => {
  const savedEnv: Record<string, string | undefined> = {}

  beforeEach(() => {
    for (const k of ENV_KEYS) savedEnv[k] = process.env[k]
    vi.clearAllMocks()
    _resetRateLimit()
    process.env['BOOKING_RATE_LIMIT'] = '1000'
    delete process.env['AVAILABILITY_TIMEZONE']
    delete process.env['TIMEZONE']
    vi.spyOn(fs, 'readFileSync').mockReturnValue(yamlContent as any)

    cal.mockFindBooking.mockResolvedValue(BOOKING)
    cal.mockOverlap.mockResolvedValue(null)
    cal.mockMove.mockResolvedValue(undefined)
    mail.mockOperator.mockResolvedValue(undefined)
    mail.mockClient.mockResolvedValue(undefined)
    mail.mockLimit.mockResolvedValue(undefined)
  })

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (savedEnv[k] === undefined) delete process.env[k]
      else process.env[k] = savedEnv[k] as string
    }
    vi.restoreAllMocks()
  })

  it('AC-007-22: GET resolves a valid token to the current slot and reschedule eligibility', async () => {
    const res = makeRes()
    await rescheduleHandler(getReq(), res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(bodyOf(res)).toEqual({
      date: '2027-03-01',
      startTime: '10:00',
      hours: 1,
      canReschedule: true,
    })
    // Nothing else at all: the field set is exactly these four.
    expect(Object.keys(bodyOf(res)).sort()).toEqual(['canReschedule', 'date', 'hours', 'startTime'])
  })

  it('AC-007-23: GET does not reveal email, bookingId, or join URL', async () => {
    const res = makeRes()
    await rescheduleHandler(getReq(), res)
    const raw = JSON.stringify(bodyOf(res))
    expect(raw).not.toContain(BOOKING.email)
    expect(raw).not.toContain(BOOKING.bookingId)
    expect(raw).not.toContain(JOIN)
    expect(raw).not.toContain('rexi-0123456789abcdef')
  })

  it('AC-007-24: POST moves the meeting and returns the unchanged join URL', async () => {
    const res = makeRes()
    await rescheduleHandler(postReq({ token: TOKEN, date: '2027-03-01', startTime: '12:00' }), res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(bodyOf(res)).toEqual({ date: '2027-03-01', startTime: '12:00', hours: 1, joinUrl: JOIN })
    expect(bodyOf(res).joinUrl).toBe(BOOKING.joinUrl)

    expect(cal.mockMove).toHaveBeenCalledTimes(1)
    const move = cal.mockMove.mock.calls[0][0]
    expect(move).toMatchObject({
      bookingId: BOOKING.bookingId,
      date: '2027-03-01',
      startTime: '12:00',
      hours: 1,
      joinUrl: JOIN,
      rescheduleCount: 1,
    })
    // A fresh token is minted for the moved booking, never the one just used.
    expect(move.rescheduleToken).toMatch(/^[0-9a-f]{64}$/)
    expect(move.rescheduleToken).not.toBe(TOKEN)
  })

  it('AC-007-25: A wrong, expired, or already-used token returns one generic error', async () => {
    const bodies: string[] = []

    // Wrong token: nothing resolves.
    cal.mockFindBooking.mockResolvedValueOnce(null)
    const wrong = makeRes()
    await rescheduleHandler(
      postReq({ token: WRONG, date: '2027-03-01', startTime: '12:00' }),
      wrong
    )
    bodies.push(JSON.stringify(bodyOf(wrong)))
    expect(wrong.status).toHaveBeenCalledWith(404)

    // Rotated token: also unresolvable.
    cal.mockFindBooking.mockResolvedValueOnce(null)
    const rotated = makeRes()
    await rescheduleHandler(
      postReq({ token: ROTATED, date: '2027-03-01', startTime: '12:00' }),
      rotated
    )
    bodies.push(JSON.stringify(bodyOf(rotated)))
    expect(rotated.status).toHaveBeenCalledWith(404)

    // Expired: the meeting already happened, so the token is dead.
    cal.mockFindBooking.mockResolvedValueOnce({ ...BOOKING, date: '2020-01-06' })
    const expired = makeRes()
    await rescheduleHandler(
      postReq({ token: TOKEN, date: '2027-03-01', startTime: '12:00' }),
      expired
    )
    bodies.push(JSON.stringify(bodyOf(expired)))
    expect(expired.status).toHaveBeenCalledWith(404)

    expect(new Set(bodies).size).toBe(1)
    expect(bodyOf(expired).error.code).toBe('INVALID_RESCHEDULE_TOKEN')
    expect(typeof bodyOf(expired).error.message).toBe('string')
    // No disturbance to the calendar in any of the three cases.
    expect(cal.mockMove).not.toHaveBeenCalled()
  })

  it('AC-007-26: Reschedule is rate-limited independently of booking', async () => {
    process.env['BOOKING_RATE_LIMIT'] = '1'
    _resetRateLimit()

    const first = makeRes()
    await rescheduleHandler(
      postReq({ token: TOKEN, date: '2027-03-01', startTime: '12:00' }),
      first
    )
    expect(first.status).toHaveBeenCalledWith(200)

    const blocked = makeRes()
    await rescheduleHandler(
      postReq({ token: TOKEN, date: '2027-03-01', startTime: '12:00' }),
      blocked
    )
    expect(blocked.status).toHaveBeenCalledWith(429)
    expect(blocked.setHeader).toHaveBeenCalledWith('Retry-After', expect.anything())
    // The booking endpoint has its own bucket and is untouched by this one.
    const { checkRateLimit } = await import('../domain/rateLimit')
    expect(checkRateLimit(`bookings:${IP}`).allowed).toBe(true)
  })

  it('AC-007-27: Wrong method is rejected', async () => {
    for (const method of ['PUT', 'DELETE', 'PATCH', 'OPTIONS']) {
      const res = makeRes()
      await rescheduleHandler({ method, headers: { 'x-forwarded-for': IP } } as any, res)
      expect(res.status).toHaveBeenCalledWith(405)
      expect(bodyOf(res).error.code).toBe('METHOD_NOT_ALLOWED')
    }
    expect(cal.mockFindBooking).not.toHaveBeenCalled()
  })

  it('AC-007-28: Reschedule works without a Stripe session (billing-disabled parity)', async () => {
    // The direct path's bookingId is a bare UUID: no checkout session exists.
    const directBooking: BookingRescheduleState = {
      ...BOOKING,
      bookingId: '3f9a1c72-8d4e-4a1b-9a77-2f4a1f6f0001',
    }
    cal.mockFindBooking.mockResolvedValue(directBooking)

    const resolved = makeRes()
    await rescheduleHandler(getReq(), resolved)
    expect(resolved.status).toHaveBeenCalledWith(200)

    const submitted = makeRes()
    await rescheduleHandler(
      postReq({ token: TOKEN, date: '2027-03-01', startTime: '12:00' }),
      submitted
    )
    expect(submitted.status).toHaveBeenCalledWith(200)
    expect(cal.mockMove.mock.calls[0][0].bookingId).toBe(directBooking.bookingId)

    // Nothing on this path reaches Stripe.
    expect(stripe.mockGetStripe).not.toHaveBeenCalled()
  })

  it('AC-007-48: GET reports canReschedule false at the limit or after the meeting', async () => {
    cal.mockFindBooking.mockResolvedValue({ ...BOOKING, count: 3 })
    const atLimit = makeRes()
    await rescheduleHandler(getReq(), atLimit)
    expect(atLimit.status).toHaveBeenCalledWith(200)
    expect(bodyOf(atLimit).canReschedule).toBe(false)
    expect(Object.keys(bodyOf(atLimit)).sort()).toEqual([
      'canReschedule',
      'date',
      'hours',
      'startTime',
    ])

    cal.mockFindBooking.mockResolvedValue({ ...BOOKING, date: '2020-01-06' })
    const past = makeRes()
    await rescheduleHandler(getReq(), past)
    expect(past.status).toHaveBeenCalledWith(200)
    expect(bodyOf(past).canReschedule).toBe(false)
    const raw = JSON.stringify(bodyOf(past))
    expect(raw).not.toContain(BOOKING.email)
    expect(raw).not.toContain(BOOKING.bookingId)
    expect(raw).not.toContain(JOIN)
    expect(raw).not.toContain('"count"')
  })

  describe('unit: refusals, failures and the surfaces the page branches on', () => {
    it('a malformed token is refused before any calendar read', async () => {
      const res = makeRes()
      await rescheduleHandler(
        postReq({ token: 'nope', date: '2027-03-01', startTime: '12:00' }),
        res
      )
      expect(res.status).toHaveBeenCalledWith(404)
      expect(cal.mockFindBooking).not.toHaveBeenCalled()
      expect(cal.mockMove).not.toHaveBeenCalled()
    })

    it('a missing token on GET is the same generic refusal, with no calendar read', async () => {
      const res = makeRes()
      await rescheduleHandler(getReq(null), res)
      expect(res.status).toHaveBeenCalledWith(404)
      expect(bodyOf(res).error.code).toBe('INVALID_RESCHEDULE_TOKEN')
      expect(cal.mockFindBooking).not.toHaveBeenCalled()
    })

    it('a slot outside the availability windows is SLOT_UNAVAILABLE', async () => {
      const res = makeRes()
      await rescheduleHandler(
        postReq({ token: TOKEN, date: '2027-03-01', startTime: '22:00' }),
        res
      )
      expect(res.status).toHaveBeenCalledWith(400)
      expect(bodyOf(res).error.code).toBe('SLOT_UNAVAILABLE')
      expect(cal.mockMove).not.toHaveBeenCalled()
    })

    it('a past requested date is PAST_DATE', async () => {
      const res = makeRes()
      await rescheduleHandler(
        postReq({ token: TOKEN, date: '2020-01-06', startTime: '10:00' }),
        res
      )
      expect(bodyOf(res).error.code).toBe('PAST_DATE')
      expect(cal.mockMove).not.toHaveBeenCalled()
    })

    it('a slot taken by a different booking is SLOT_CONFLICT', async () => {
      cal.mockOverlap.mockResolvedValue('cs_test_other')
      const res = makeRes()
      await rescheduleHandler(
        postReq({ token: TOKEN, date: '2027-03-01', startTime: '12:00' }),
        res
      )
      expect(res.status).toHaveBeenCalledWith(409)
      expect(bodyOf(res).error.code).toBe('SLOT_CONFLICT')
      expect(cal.mockMove).not.toHaveBeenCalled()
    })

    it('a booking at the limit is RESCHEDULE_LIMIT and tells the operator', async () => {
      cal.mockFindBooking.mockResolvedValue({ ...BOOKING, count: 3 })
      const res = makeRes()
      await rescheduleHandler(
        postReq({ token: TOKEN, date: '2027-03-01', startTime: '12:00' }),
        res
      )
      expect(res.status).toHaveBeenCalledWith(409)
      expect(bodyOf(res).error.code).toBe('RESCHEDULE_LIMIT')
      expect(cal.mockMove).not.toHaveBeenCalled()
      expect(mail.mockLimit).toHaveBeenCalledTimes(1)
    })

    it('a duration in the request body is ignored: the stored hours win', async () => {
      // The client never submits a duration (10-tasks.md Task 5); a hand-crafted
      // body that tries to shorten the meeting must not be obeyed.
      const res = makeRes()
      await rescheduleHandler(
        postReq({ token: TOKEN, date: '2027-03-01', startTime: '12:00', hours: 4 }),
        res
      )
      expect(res.status).toHaveBeenCalledWith(200)
      expect(bodyOf(res).hours).toBe(1)
      expect(cal.mockMove.mock.calls[0][0].hours).toBe(1)
    })

    it('the slot window is re-derived at submit time, end boundary included', async () => {
      // The Monday window in the fixture is 09:00-13:00. A one-hour slot that ends
      // exactly at the window's end fits; one that starts at the end does not.
      // This is the LIVE re-check of 10-tasks.md Task 4, not the list the client
      // was shown.
      const fitting = makeRes()
      await rescheduleHandler(
        postReq({ token: TOKEN, date: '2027-03-01', startTime: '12:00' }),
        fitting
      )
      expect(fitting.status).toHaveBeenCalledWith(200)

      const overrun = makeRes()
      await rescheduleHandler(
        postReq({ token: TOKEN, date: '2027-03-01', startTime: '13:00' }),
        overrun
      )
      expect(overrun.status).toHaveBeenCalledWith(400)
      expect(bodyOf(overrun).error.code).toBe('SLOT_UNAVAILABLE')
    })

    it('two racing submits cannot bypass the limit: every submit re-reads the count', async () => {
      // Each submit re-reads the count from the event, so the second one sees the
      // value the first move wrote rather than the one the client loaded with.
      cal.mockFindBooking
        .mockResolvedValueOnce({ ...BOOKING, count: 2 })
        .mockResolvedValueOnce({ ...BOOKING, count: 3 })

      const first = makeRes()
      await rescheduleHandler(
        postReq({ token: TOKEN, date: '2027-03-01', startTime: '12:00' }),
        first
      )
      expect(first.status).toHaveBeenCalledWith(200)
      expect(cal.mockMove.mock.calls[0][0].rescheduleCount).toBe(3)

      const second = makeRes()
      await rescheduleHandler(
        postReq({ token: TOKEN, date: '2027-03-01', startTime: '12:00' }),
        second
      )
      expect(second.status).toHaveBeenCalledWith(409)
      expect(bodyOf(second).error.code).toBe('RESCHEDULE_LIMIT')
      // One move, one operator notice about the blocked attempt.
      expect(cal.mockMove).toHaveBeenCalledTimes(1)
      expect(mail.mockLimit).toHaveBeenCalledTimes(1)
    })

    it('a calendar read failure is a 502, never the generic dead-link 404', async () => {
      // An outage must not tell the client their link is dead: the page has a
      // recoverable load-failed state and a dead end respectively.
      cal.mockFindBooking.mockRejectedValue(new Error('Graph exploded UPSTREAM-DETAIL'))

      const get = makeRes()
      await rescheduleHandler(getReq(), get)
      expect(get.status).toHaveBeenCalledWith(502)
      expect(bodyOf(get).error.code).toBe('CALENDAR_ERROR')
      expect(JSON.stringify(bodyOf(get))).not.toContain('UPSTREAM-DETAIL')

      const post = makeRes()
      await rescheduleHandler(
        postReq({ token: TOKEN, date: '2027-03-01', startTime: '12:00' }),
        post
      )
      expect(post.status).toHaveBeenCalledWith(502)
      expect(cal.mockMove).not.toHaveBeenCalled()
      expect(mail.mockOperator).not.toHaveBeenCalled()
      expect(mail.mockClient).not.toHaveBeenCalled()
    })

    it('both operations are uncacheable', async () => {
      // 15-design Task 5 watch item: the document may be cached, the booking state
      // behind a token may not.
      const get = makeRes()
      await rescheduleHandler(getReq(), get)
      expect(get.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store')

      const post = makeRes()
      await rescheduleHandler(
        postReq({ token: TOKEN, date: '2027-03-01', startTime: '12:00' }),
        post
      )
      expect(post.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store')
    })

    it('a calendar write failure is a static 500 and sends no confirmation', async () => {
      cal.mockMove.mockRejectedValue(new Error('Graph said UPSTREAM-DETAIL'))
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const res = makeRes()
      await rescheduleHandler(
        postReq({ token: TOKEN, date: '2027-03-01', startTime: '12:00' }),
        res
      )

      expect(res.status).toHaveBeenCalledWith(500)
      expect(bodyOf(res).error.code).toBe('GCAL_ERROR')
      expect(JSON.stringify(bodyOf(res))).not.toContain('UPSTREAM-DETAIL')
      expect(mail.mockOperator).not.toHaveBeenCalled()
      expect(mail.mockClient).not.toHaveBeenCalled()
      expect(errorSpy).toHaveBeenCalled()
    })
  })
})
