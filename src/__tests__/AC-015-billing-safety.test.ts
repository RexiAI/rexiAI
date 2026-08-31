import fs from 'fs'

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const billingMocks = vi.hoisted(() => ({
  mockSessionCreate: vi.fn(),
  mockFreeHourAvailable: vi.fn(),
  mockCreateTeamsMeeting: vi.fn(),
  mockHasConflict: vi.fn(),
}))

vi.mock('../domain/stripeClient', () => ({
  getStripe: () => ({
    checkout: { sessions: { create: billingMocks.mockSessionCreate } },
  }),
}))

vi.mock('../domain/freeHour', () => ({
  isFreeHourAvailable: billingMocks.mockFreeHourAvailable,
  markFreeHourUsed: vi.fn(),
}))

vi.mock('../domain/teams', () => ({
  createTeamsMeeting: billingMocks.mockCreateTeamsMeeting,
}))

// Only the conflict probe is stubbed; the slot-coverage helpers stay real so the
// booking validation path under test is the production one.
vi.mock('../../api/bookings/calendar', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/bookings/calendar')>()
  return { ...actual, hasConflict: billingMocks.mockHasConflict }
})

import bookingsHandler from '../../api/bookings'
import recordedBillingHandler from '../../api/bookings/recorded-billing'

const yamlContent = `
timezone: Europe/Madrid
weekly:
  monday:
    - {start: "09:00", end: "13:00"}
exceptions: {}
`

const ENV_KEYS = ['STRIPE_SECRET_KEY', 'RECORDED_BILLING_TOKEN', 'CALENDAR_PROVIDER'] as const

function makeRes() {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() } as any
}

function makeBookingReq(body: Record<string, unknown>) {
  return {
    method: 'POST',
    body,
    headers: { host: 'example.com', 'x-forwarded-proto': 'https' },
  } as any
}

function makeBillingReq(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return {
    method: 'POST',
    body,
    headers: { host: 'example.com', ...headers },
  } as any
}

describe('AC-015', () => {
  const savedEnv: Record<string, string | undefined> = {}

  beforeEach(() => {
    for (const k of ENV_KEYS) savedEnv[k] = process.env[k]
    vi.clearAllMocks()
    billingMocks.mockSessionCreate.mockReset()
    billingMocks.mockFreeHourAvailable.mockReset()
    billingMocks.mockCreateTeamsMeeting.mockReset()
    billingMocks.mockHasConflict.mockReset()

    process.env['STRIPE_SECRET_KEY'] = 'sk_test_dummy'
    delete process.env['RECORDED_BILLING_TOKEN']
    delete process.env['CALENDAR_PROVIDER']

    vi.spyOn(fs, 'readFileSync').mockReturnValue(yamlContent as any)
    billingMocks.mockHasConflict.mockResolvedValue(false)
    billingMocks.mockCreateTeamsMeeting.mockResolvedValue({ status: 'skipped' })
    billingMocks.mockFreeHourAvailable.mockResolvedValue(false)
    billingMocks.mockSessionCreate.mockResolvedValue({
      url: 'https://checkout.stripe.com/pay/cs_test_015',
      id: 'cs_test_015',
    })
  })

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (savedEnv[k] === undefined) delete process.env[k]
      else process.env[k] = savedEnv[k] as string
    }
    vi.restoreAllMocks()
  })

  it('AC-015-01: Returning-client booking reserves zero euro so recorded billing cannot double charge', async () => {
    billingMocks.mockFreeHourAvailable.mockResolvedValue(false)
    const res = makeRes()
    await bookingsHandler(
      makeBookingReq({
        email: 'returning@example.com',
        date: '2027-03-01',
        startTime: '10:00',
        hours: 2,
      }),
      res
    )
    expect(res.status).toHaveBeenCalledWith(200)
    expect(billingMocks.mockSessionCreate).toHaveBeenCalledTimes(1)
    const args = billingMocks.mockSessionCreate.mock.calls[0][0]
    expect(args.line_items[0].price_data.unit_amount).toBe(0)
  })

  it('AC-015-02: Reservation metadata carries reservation flag and quoted hours', async () => {
    const res = makeRes()
    await bookingsHandler(
      makeBookingReq({
        email: 'returning@example.com',
        date: '2027-03-01',
        startTime: '10:00',
        hours: 3,
      }),
      res
    )
    const args = billingMocks.mockSessionCreate.mock.calls[0][0]
    expect(args.metadata.reservation).toBe('1')
    expect(args.metadata.quoted_hours).toBe('3')
  })

  it('AC-015-03: Recorded billing without a configured token fails closed with 503 and no Stripe session', async () => {
    delete process.env['RECORDED_BILLING_TOKEN']
    const res = makeRes()
    await recordedBillingHandler(
      makeBillingReq(
        { bookingId: 'bk_1', email: 'returning@example.com', actualMinutes: 90 },
        { authorization: 'Bearer anything' }
      ),
      res
    )
    expect(res.status).toHaveBeenCalledWith(503)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'NOT_CONFIGURED' }) })
    )
    expect(billingMocks.mockSessionCreate).not.toHaveBeenCalled()
  })

  it('AC-015-04: Recorded billing without an authorization header is rejected 401 and no Stripe session', async () => {
    process.env['RECORDED_BILLING_TOKEN'] = 'secret-token-value'
    const res = makeRes()
    await recordedBillingHandler(
      makeBillingReq({ bookingId: 'bk_1', email: 'returning@example.com', actualMinutes: 90 }),
      res
    )
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'UNAUTHORIZED' }) })
    )
    expect(billingMocks.mockSessionCreate).not.toHaveBeenCalled()
  })

  it('AC-015-05: Recorded billing with a wrong bearer value is rejected 401 and no Stripe session', async () => {
    process.env['RECORDED_BILLING_TOKEN'] = 'secret-token-value'
    const res = makeRes()
    await recordedBillingHandler(
      makeBillingReq(
        { bookingId: 'bk_1', email: 'returning@example.com', actualMinutes: 90 },
        { authorization: 'Bearer wrong-token-value' }
      ),
      res
    )
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'UNAUTHORIZED' }) })
    )
    expect(billingMocks.mockSessionCreate).not.toHaveBeenCalled()
  })

  it('AC-015-06: Recorded billing with the correct bearer charges the pro-rata amount', async () => {
    process.env['RECORDED_BILLING_TOKEN'] = 'secret-token-value'
    billingMocks.mockFreeHourAvailable.mockResolvedValue(false)
    const res = makeRes()
    await recordedBillingHandler(
      makeBillingReq(
        { bookingId: 'bk_1', email: 'returning@example.com', actualMinutes: 90 },
        { authorization: 'Bearer secret-token-value' }
      ),
      res
    )
    expect(res.status).toHaveBeenCalledWith(200)
    expect(billingMocks.mockSessionCreate).toHaveBeenCalledTimes(1)
    const args = billingMocks.mockSessionCreate.mock.calls[0][0]
    expect(args.line_items[0].price_data.unit_amount).toBe(4500)
    expect(args.metadata.recorded_billing).toBe('1')
  })

  it('AC-015-07: Teams failure aborts the booking with 502 and leaves no orphan reservation', async () => {
    process.env['CALENDAR_PROVIDER'] = 'microsoft'
    billingMocks.mockCreateTeamsMeeting.mockResolvedValue({
      status: 'error',
      message: 'Graph responded 500',
    })
    const res = makeRes()
    await bookingsHandler(
      makeBookingReq({
        email: 'returning@example.com',
        date: '2027-03-01',
        startTime: '10:00',
        hours: 2,
      }),
      res
    )
    expect(res.status).toHaveBeenCalledWith(502)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'TEAMS_ERROR' }) })
    )
    expect(billingMocks.mockSessionCreate).not.toHaveBeenCalled()
  })

  it('AC-015-08: Skipped Teams provider still books a zero-euro reservation without a join URL', async () => {
    process.env['CALENDAR_PROVIDER'] = 'google'
    billingMocks.mockCreateTeamsMeeting.mockResolvedValue({ status: 'skipped' })
    const res = makeRes()
    await bookingsHandler(
      makeBookingReq({
        email: 'returning@example.com',
        date: '2027-03-01',
        startTime: '10:00',
        hours: 2,
      }),
      res
    )
    expect(res.status).toHaveBeenCalledWith(200)
    expect(billingMocks.mockSessionCreate).toHaveBeenCalledTimes(1)
    const args = billingMocks.mockSessionCreate.mock.calls[0][0]
    expect(args.line_items[0].price_data.unit_amount).toBe(0)
    const payload = res.json.mock.calls[0][0]
    expect(payload.joinUrl).toBeUndefined()
    expect(payload.checkoutUrl).toContain('https://')
  })
})
