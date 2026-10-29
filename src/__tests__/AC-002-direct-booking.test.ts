// AC-002 Task 1 (backend): POST /api/bookings direct path when BILLING_ENABLED=false.
// Handler-level acceptance tests: every side effect is asserted through module
// mocks of src/domain/calendar + src/domain/email, and "zero Stripe calls" is
// asserted through a mocked stripeClient (getStripe construction counter) plus
// mocked freeHour. Pattern follows AC-007 / AC-018.
import fs from 'fs'

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const m = vi.hoisted(() => ({
  mockGetStripe: vi.fn(),
  mockSessionCreate: vi.fn(),
  mockCustomerList: vi.fn(),
  mockFreeHourAvailable: vi.fn(),
  mockMarkFreeHour: vi.fn(),
  mockHasConflict: vi.fn(),
  mockCreateMeetingLink: vi.fn(),
  mockOverlap: vi.fn(),
  mockCreateCalendarEvent: vi.fn(),
  mockFindEventByBookingId: vi.fn(),
  mockSendOperatorEmail: vi.fn(),
  mockSendClientEmail: vi.fn(),
}))
const order = vi.hoisted(() => ({ calls: [] as string[] }))

vi.mock('../domain/stripeClient', () => ({
  getStripe: m.mockGetStripe,
}))

vi.mock('../domain/freeHour', () => ({
  isFreeHourAvailable: m.mockFreeHourAvailable,
  markFreeHourUsed: m.mockMarkFreeHour,
}))

vi.mock('../domain/meeting', () => ({
  createMeetingLink: m.mockCreateMeetingLink,
}))

vi.mock('../domain/calendar', () => ({
  createCalendarEvent: m.mockCreateCalendarEvent,
  findEventByBookingId: m.mockFindEventByBookingId,
  findOverlappingBookingId: m.mockOverlap,
}))

vi.mock('../domain/email', () => ({
  sendOperatorEmail: m.mockSendOperatorEmail,
  sendClientEmail: m.mockSendClientEmail,
}))

// Only the conflict probe is stubbed; the slot-coverage helpers stay real so the
// booking validation path under test is the production one.
vi.mock('../../api/bookings/calendar', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/bookings/calendar')>()
  return { ...actual, hasConflict: m.mockHasConflict }
})

import bookingsHandler from '../../api/bookings'
import { getCalendarProvider } from '../domain/providers'
import { _resetRateLimit } from '../domain/rateLimit'

const yamlContent = `
timezone: Europe/Madrid
weekly:
  monday:
    - {start: "09:00", end: "13:00"}
exceptions: {}
`

const JOIN_URL = 'https://meet.jit.si/rexi-direct-test'
const CLIENT = 'client@example.com'
// 2027-03-01 is a Monday; 10:00 for 1 hour sits inside the 09:00-13:00 window.
const VALID_BODY = {
  name: 'Ana López',
  email: CLIENT,
  date: '2027-03-01',
  startTime: '10:00',
  hours: 1,
}
const SUCCESS_BODY = { checkoutUrl: null, joinUrl: JOIN_URL, billingDisabled: true }

const ENV_KEYS = [
  'BILLING_ENABLED',
  'STRIPE_SECRET_KEY',
  'AVAILABILITY_TIMEZONE',
  'TIMEZONE',
  'BOOKING_RATE_LIMIT',
] as const

function makeRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
  } as any
}

function makeBookingReq(body: Record<string, unknown> = VALID_BODY) {
  return {
    method: 'POST',
    body,
    headers: {
      host: 'example.com',
      'x-forwarded-proto': 'https',
      'x-forwarded-for': '203.0.113.2',
    },
  } as any
}

function jsonBody(res: any): any {
  return res.json.mock.calls[res.json.mock.calls.length - 1][0]
}

describe('AC-002 direct booking (billing disabled)', () => {
  const savedEnv: Record<string, string | undefined> = {}
  let consoleError: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    for (const k of ENV_KEYS) savedEnv[k] = process.env[k]
    vi.clearAllMocks()
    delete process.env['BILLING_ENABLED']
    delete process.env['STRIPE_SECRET_KEY']
    delete process.env['AVAILABILITY_TIMEZONE']
    delete process.env['TIMEZONE']
    // Direct tests issue many POSTs per process; keep the per-process limiter out
    // of the way (10-tasks §Test conventions) and reset its bucket map anyway.
    process.env['BOOKING_RATE_LIMIT'] = '1000'
    _resetRateLimit()

    vi.spyOn(fs, 'readFileSync').mockReturnValue(yamlContent as any)
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Stripe surface: any construction or call is a test-visible violation.
    m.mockGetStripe.mockReturnValue({
      checkout: { sessions: { create: m.mockSessionCreate } },
      customers: { list: m.mockCustomerList },
    })
    m.mockSessionCreate.mockResolvedValue({
      url: 'https://checkout.stripe.com/pay/cs_test_002',
      id: 'cs_test_002',
    })
    m.mockFreeHourAvailable.mockResolvedValue(true)
    m.mockMarkFreeHour.mockResolvedValue({ burned: true })

    m.mockHasConflict.mockResolvedValue(false)
    m.mockCreateMeetingLink.mockResolvedValue({ status: 'ok', joinUrl: JOIN_URL })

    order.calls.length = 0
    m.mockOverlap.mockImplementation(() => {
      order.calls.push('overlap')
      return Promise.resolve(null)
    })
    m.mockCreateCalendarEvent.mockImplementation(() => {
      order.calls.push('calendar')
      return Promise.resolve({ alreadyExists: false })
    })
    m.mockFindEventByBookingId.mockResolvedValue(false)
    m.mockSendOperatorEmail.mockImplementation(() => {
      order.calls.push('operator-email')
      return Promise.resolve(undefined)
    })
    m.mockSendClientEmail.mockImplementation(() => {
      order.calls.push('client-email')
      return Promise.resolve(undefined)
    })
  })

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (savedEnv[k] === undefined) delete process.env[k]
      else process.env[k] = savedEnv[k] as string
    }
    vi.restoreAllMocks()
  })

  function assertZeroStripeCalls() {
    expect(m.mockGetStripe).not.toHaveBeenCalled()
    expect(m.mockSessionCreate).not.toHaveBeenCalled()
    expect(m.mockCustomerList).not.toHaveBeenCalled()
    expect(m.mockFreeHourAvailable).not.toHaveBeenCalled()
    expect(m.mockMarkFreeHour).not.toHaveBeenCalled()
  }

  it('AC-002-05: Direct booking succeeds with the fixed response shape and zero Stripe calls', async () => {
    process.env['BILLING_ENABLED'] = 'false'
    const res = makeRes()
    await bookingsHandler(makeBookingReq(), res)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(jsonBody(res)).toEqual(SUCCESS_BODY)
    assertZeroStripeCalls()
  })

  it('AC-002-06: Side effects run synchronously in webhook order with one server-generated bookingId', async () => {
    process.env['BILLING_ENABLED'] = 'false'
    const first = makeRes()
    await bookingsHandler(makeBookingReq(), first)
    expect(order.calls).toEqual(['overlap', 'calendar', 'operator-email', 'client-email'])

    const overlapArg = m.mockOverlap.mock.calls[0][0]
    const calendarArg = m.mockCreateCalendarEvent.mock.calls[0][0]
    expect(typeof overlapArg.bookingId).toBe('string')
    expect(overlapArg.bookingId.length).toBeGreaterThan(0)
    expect(calendarArg.bookingId).toBe(overlapArg.bookingId)
    expect(calendarArg.provider).toBe(getCalendarProvider())
    expect(calendarArg.email).toBe(CLIENT)
    expect(calendarArg.date).toBe('2027-03-01')
    expect(calendarArg.startTime).toBe('10:00')
    expect(calendarArg.hours).toBe(1)
    expect(calendarArg.joinUrl).toBe(JOIN_URL)

    const operatorArg = m.mockSendOperatorEmail.mock.calls[0][0]
    expect(operatorArg.clientEmail).toBe(CLIENT)
    expect(operatorArg.date).toBe('2027-03-01')
    expect(operatorArg.startTime).toBe('10:00')
    expect(operatorArg.hours).toBe(1)
    expect(operatorArg.amountCents).toBe(0)
    expect(operatorArg.joinUrl).toBe(JOIN_URL)
    expect(operatorArg.kind).toBe('reservation')
    expect('slotConflictWith' in operatorArg).toBe(false)

    const clientArg = m.mockSendClientEmail.mock.calls[0][0]
    expect(clientArg).toEqual({
      clientEmail: CLIENT,
      date: '2027-03-01',
      startTime: '10:00',
      hours: 1,
      joinUrl: JOIN_URL,
    })

    // Second direct booking in the same process: different server-generated id.
    order.calls.length = 0
    m.mockOverlap.mockClear()
    m.mockCreateCalendarEvent.mockClear()
    const second = makeRes()
    await bookingsHandler(makeBookingReq({ ...VALID_BODY, email: 'second@example.com' }), second)
    const secondId = m.mockOverlap.mock.calls[0][0].bookingId
    expect(secondId).not.toBe(overlapArg.bookingId)
    expect(m.mockCreateCalendarEvent.mock.calls[0][0].bookingId).toBe(secondId)
  })

  it('AC-002-07: Preflight still gates the direct branch: conflict answers 409 with zero side effects', async () => {
    process.env['BILLING_ENABLED'] = 'false'
    m.mockHasConflict.mockResolvedValue(true)
    const res = makeRes()
    await bookingsHandler(makeBookingReq(), res)
    expect(res.status).toHaveBeenCalledWith(409)
    expect(jsonBody(res).error.code).toBe('SLOT_CONFLICT')
    expect(m.mockOverlap).not.toHaveBeenCalled()
    expect(m.mockCreateCalendarEvent).not.toHaveBeenCalled()
    expect(m.mockSendOperatorEmail).not.toHaveBeenCalled()
    expect(m.mockSendClientEmail).not.toHaveBeenCalled()
    assertZeroStripeCalls()
  })

  it('AC-002-08: Overlap backstop flags the operator email without blocking the booking', async () => {
    process.env['BILLING_ENABLED'] = 'false'
    m.mockOverlap.mockResolvedValue('other-booking-id')
    const res = makeRes()
    await bookingsHandler(makeBookingReq(), res)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(jsonBody(res)).toEqual(SUCCESS_BODY)
    expect(m.mockCreateCalendarEvent).toHaveBeenCalledTimes(1)
    expect(m.mockSendClientEmail).toHaveBeenCalledTimes(1)
    expect(m.mockSendOperatorEmail.mock.calls[0][0].slotConflictWith).toBe('other-booking-id')
  })

  it('AC-002-09: Overlap probe failure is swallowed', async () => {
    process.env['BILLING_ENABLED'] = 'false'
    m.mockOverlap.mockRejectedValue(new Error('probe outage UPSTREAM-DETAIL'))
    const res = makeRes()
    await bookingsHandler(makeBookingReq(), res)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(jsonBody(res)).toEqual(SUCCESS_BODY)
    expect(m.mockCreateCalendarEvent).toHaveBeenCalledTimes(1)
    expect(m.mockSendOperatorEmail).toHaveBeenCalledTimes(1)
    expect(m.mockSendClientEmail).toHaveBeenCalledTimes(1)
    expect('slotConflictWith' in m.mockSendOperatorEmail.mock.calls[0][0]).toBe(false)
  })

  it('AC-002-10: Calendar failure aborts with a static 500 before any email', async () => {
    process.env['BILLING_ENABLED'] = 'false'
    m.mockCreateCalendarEvent.mockRejectedValue(new Error('Graph said UPSTREAM-BOOM-DETAIL'))
    const res = makeRes()
    await bookingsHandler(makeBookingReq(), res)
    expect(res.status).toHaveBeenCalledWith(500)
    const body = jsonBody(res)
    expect(body.error.code).toBe('GCAL_ERROR')
    expect(typeof body.error.message).toBe('string')
    expect(body.error.message.length).toBeGreaterThan(0)
    expect(body.error.message).not.toContain('UPSTREAM-BOOM-DETAIL')
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('UPSTREAM-BOOM-DETAIL'))
    expect(m.mockSendOperatorEmail).not.toHaveBeenCalled()
    expect(m.mockSendClientEmail).not.toHaveBeenCalled()
  })

  it('AC-002-11: Operator-email failure returns a static 500, skips the client email, and does not roll back the calendar event', async () => {
    process.env['BILLING_ENABLED'] = 'false'
    m.mockSendOperatorEmail.mockRejectedValue(new Error('Resend said UPSTREAM-BOOM-DETAIL'))
    const res = makeRes()
    await bookingsHandler(makeBookingReq(), res)
    expect(res.status).toHaveBeenCalledWith(500)
    const body = jsonBody(res)
    expect(body.error.code).toBe('EMAIL_ERROR')
    expect(typeof body.error.message).toBe('string')
    expect(body.error.message).not.toContain('UPSTREAM-BOOM-DETAIL')
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('UPSTREAM-BOOM-DETAIL'))
    expect(m.mockSendClientEmail).not.toHaveBeenCalled()
    // No rollback: the only calendar call is the original create, no correction call.
    expect(m.mockCreateCalendarEvent).toHaveBeenCalledTimes(1)
    expect(m.mockFindEventByBookingId).not.toHaveBeenCalled()
  })

  it('AC-002-12: Client-email failure is logged and swallowed; the booking still succeeds', async () => {
    process.env['BILLING_ENABLED'] = 'false'
    m.mockSendClientEmail.mockRejectedValue(new Error('sandbox sender rejected'))
    const res = makeRes()
    await bookingsHandler(makeBookingReq(), res)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(jsonBody(res)).toEqual(SUCCESS_BODY)
    expect(consoleError).toHaveBeenCalled()
  })

  it('AC-002-13: Invalid duration is rejected with zero Stripe calls and zero side effects', async () => {
    process.env['BILLING_ENABLED'] = 'false'
    const res = makeRes()
    await bookingsHandler(makeBookingReq({ ...VALID_BODY, hours: 5 }), res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(jsonBody(res).error.code).toBe('INVALID_DURATION')
    assertZeroStripeCalls()
    expect(m.mockCreateMeetingLink).not.toHaveBeenCalled()
    expect(m.mockOverlap).not.toHaveBeenCalled()
    expect(m.mockCreateCalendarEvent).not.toHaveBeenCalled()
    expect(m.mockSendOperatorEmail).not.toHaveBeenCalled()
    expect(m.mockSendClientEmail).not.toHaveBeenCalled()
  })

  it('AC-002-14: Calendar timezone resolution mirrors the webhook chain', async () => {
    process.env['BILLING_ENABLED'] = 'false'

    await bookingsHandler(makeBookingReq(), makeRes())
    expect(m.mockCreateCalendarEvent.mock.calls[0][0].timezone).toBe('Europe/Madrid')

    process.env['TIMEZONE'] = 'Europe/Lisbon'
    await bookingsHandler(makeBookingReq(), makeRes())
    expect(m.mockCreateCalendarEvent.mock.calls[1][0].timezone).toBe('Europe/Lisbon')

    process.env['AVAILABILITY_TIMEZONE'] = 'America/New_York'
    await bookingsHandler(makeBookingReq(), makeRes())
    expect(m.mockCreateCalendarEvent.mock.calls[2][0].timezone).toBe('America/New_York')
  })

  it('AC-002-15: Billing-enabled path is unchanged and the flag is consulted per request', async () => {
    // BILLING_ENABLED unset → enabled (fail-safe default).
    process.env['STRIPE_SECRET_KEY'] = 'sk_test_dummy'
    const enabled = makeRes()
    await bookingsHandler(makeBookingReq(), enabled)
    expect(m.mockSessionCreate).toHaveBeenCalledTimes(1)
    expect(m.mockSessionCreate.mock.calls[0][0].line_items[0].price_data.unit_amount).toBe(0)
    expect(enabled.status).toHaveBeenCalledWith(200)
    const enabledBody = jsonBody(enabled)
    expect(enabledBody.checkoutUrl).toBe('https://checkout.stripe.com/pay/cs_test_002')
    expect(typeof enabledBody.checkoutUrl).toBe('string')
    expect(enabledBody.checkoutUrl.length).toBeGreaterThan(0)
    expect('billingDisabled' in enabledBody).toBe(false)
    expect(m.mockOverlap).not.toHaveBeenCalled()
    expect(m.mockCreateCalendarEvent).not.toHaveBeenCalled()
    expect(m.mockSendOperatorEmail).not.toHaveBeenCalled()
    expect(m.mockSendClientEmail).not.toHaveBeenCalled()

    // Same process, flag flipped → next request takes the direct path, no Stripe.
    process.env['BILLING_ENABLED'] = 'false'
    const direct = makeRes()
    await bookingsHandler(makeBookingReq(), direct)
    expect(jsonBody(direct)).toEqual(SUCCESS_BODY)
    // Still exactly one session create and one free-hour probe, both from the first request.
    expect(m.mockSessionCreate).toHaveBeenCalledTimes(1)
    expect(m.mockFreeHourAvailable).toHaveBeenCalledTimes(1)
  })

  describe('unit: implied branches the scenarios do not spell out', () => {
    it("overlap probe echoing this booking's own id is not flagged as a conflict", async () => {
      // AC-002-06/08 pin null and a different id; the third reachable probe
      // answer is the generated id itself. The "different bookingId" rule
      // (10-tasks Task 1) must read it as no conflict — mirrors the webhook.
      process.env['BILLING_ENABLED'] = 'false'
      m.mockOverlap.mockImplementation(async (arg: { bookingId: string }) => arg.bookingId)
      const res = makeRes()
      await bookingsHandler(makeBookingReq(), res)
      expect(res.status).toHaveBeenCalledWith(200)
      expect(jsonBody(res)).toEqual(SUCCESS_BODY)
      expect('slotConflictWith' in m.mockSendOperatorEmail.mock.calls[0][0]).toBe(false)
      expect(m.mockSendClientEmail).toHaveBeenCalledTimes(1)
    })

    it('empty AVAILABILITY_TIMEZONE falls through to TIMEZONE (truthiness parity with the webhook)', async () => {
      process.env['BILLING_ENABLED'] = 'false'
      process.env['AVAILABILITY_TIMEZONE'] = ''
      process.env['TIMEZONE'] = 'Europe/Lisbon'
      await bookingsHandler(makeBookingReq(), makeRes())
      expect(m.mockCreateCalendarEvent.mock.calls[0][0].timezone).toBe('Europe/Lisbon')
    })
  })
})
