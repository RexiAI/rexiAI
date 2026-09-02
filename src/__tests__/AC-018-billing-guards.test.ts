import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const guardMocks = vi.hoisted(() => ({
  mockSessionCreate: vi.fn(),
  mockSessionRetrieve: vi.fn(),
  mockConstruct: vi.fn(),
  mockCustomerList: vi.fn(),
  mockCustomerCreate: vi.fn(),
  mockCustomerUpdate: vi.fn(),
  mockFreeHourAvailable: vi.fn(),
  mockMarkFreeHour: vi.fn(),
  mockCreateTeamsMeeting: vi.fn(),
  mockHasConflict: vi.fn(),
  mockRecordedMinutes: vi.fn(),
  mockFind: vi.fn(),
  mockOverlap: vi.fn(),
  mockCreateCalendarEvent: vi.fn(),
  mockSendOperatorEmail: vi.fn(),
  mockSendClientEmail: vi.fn(),
}))

// One stub serves both the API handlers (checkout sessions) and the webhook
// (signature construction + the dedup marker store on customers).
vi.mock('../domain/stripeClient', () => ({
  getStripe: () => ({
    webhooks: { constructEvent: guardMocks.mockConstruct },
    checkout: {
      sessions: { create: guardMocks.mockSessionCreate, retrieve: guardMocks.mockSessionRetrieve },
    },
    customers: {
      list: guardMocks.mockCustomerList,
      create: guardMocks.mockCustomerCreate,
      update: guardMocks.mockCustomerUpdate,
    },
  }),
}))

vi.mock('../domain/freeHour', () => ({
  isFreeHourAvailable: guardMocks.mockFreeHourAvailable,
  markFreeHourUsed: guardMocks.mockMarkFreeHour,
}))
vi.mock('../domain/teams', () => ({ createTeamsMeeting: guardMocks.mockCreateTeamsMeeting }))
vi.mock('../domain/meetingDuration', () => ({
  getRecordedMinutes: guardMocks.mockRecordedMinutes,
}))
vi.mock('../domain/gcal', () => ({
  createGCalEvent: vi.fn(),
  findEventByBookingId: guardMocks.mockFind,
  findOverlappingBookingId: guardMocks.mockOverlap,
}))
vi.mock('../domain/calendar', () => ({
  createCalendarEvent: guardMocks.mockCreateCalendarEvent,
}))
vi.mock('../domain/email', () => ({
  sendOperatorEmail: guardMocks.mockSendOperatorEmail,
  sendClientEmail: guardMocks.mockSendClientEmail,
}))
vi.mock('../../api/bookings/calendar', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/bookings/calendar')>()
  return { ...actual, hasConflict: guardMocks.mockHasConflict }
})

import fs from 'fs'

import bookingsHandler from '../../api/bookings'
import recordedBillingHandler from '../../api/bookings/recorded-billing'
import webhook, { _resetEmailSent } from '../../api/stripe-webhook'
import { _resetRateLimit } from '../domain/rateLimit'

const yamlContent = `
timezone: Europe/Madrid
weekly:
  monday:
    - {start: "09:00", end: "13:00"}
exceptions: {}
`

const TOKEN = 'billing-token-value'
const CLIENT = 'client@example.com'

function makeRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
  } as any
}

function makeBillingReq(body: Record<string, unknown>) {
  return {
    method: 'POST',
    body,
    headers: { host: 'example.com', authorization: `Bearer ${TOKEN}` },
  } as any
}

function makeBookingReq(ip = '203.0.113.7') {
  return {
    method: 'POST',
    body: { email: CLIENT, date: '2027-03-01', startTime: '10:00', hours: 2 },
    headers: { host: 'example.com', 'x-forwarded-proto': 'https', 'x-forwarded-for': ip },
  } as any
}

function reservation(metadata: Record<string, string>) {
  return { id: 'bk_1', customer_email: CLIENT, metadata: { email: CLIENT, ...metadata } }
}

function makeWebhookReq() {
  return { method: 'POST', headers: { 'stripe-signature': 'sig' }, bodyRaw: '{}', body: {} } as any
}

function makeCheckoutEvent() {
  return {
    id: `evt_${Math.random().toString(36).slice(2)}`,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_018',
        customer_email: CLIENT,
        metadata: {
          email: CLIENT,
          date: '2027-03-01',
          start_time: '10:00',
          hours: '1',
          join_url: 'https://teams.microsoft.com/l/meetup-join/xyz',
        },
        amount_total: 0,
      },
    },
  }
}

const ENV_KEYS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'RECORDED_BILLING_TOKEN',
  'CALENDAR_PROVIDER',
  'BOOKING_RATE_LIMIT',
  'BOOKING_RATE_WINDOW_MIN',
  'RESEND_API_KEY',
  'EMAIL_FROM',
  'EMAIL_TO',
  'EMAIL_PROVIDER',
] as const

describe('AC-018', () => {
  const savedEnv: Record<string, string | undefined> = {}

  beforeEach(() => {
    for (const k of ENV_KEYS) savedEnv[k] = process.env[k]
    vi.clearAllMocks()
    _resetEmailSent()
    _resetRateLimit()

    process.env['STRIPE_SECRET_KEY'] = 'sk_test'
    process.env['STRIPE_WEBHOOK_SECRET'] = 'whsec_test'
    process.env['RECORDED_BILLING_TOKEN'] = TOKEN
    process.env['RESEND_API_KEY'] = 're_test'
    process.env['EMAIL_FROM'] = 'hola@rexi-ai.com'
    process.env['EMAIL_TO'] = 'operator@example.com'
    delete process.env['CALENDAR_PROVIDER']
    delete process.env['EMAIL_PROVIDER']
    delete process.env['BOOKING_RATE_LIMIT']
    delete process.env['BOOKING_RATE_WINDOW_MIN']

    vi.spyOn(fs, 'readFileSync').mockReturnValue(yamlContent as any)

    guardMocks.mockSessionCreate.mockResolvedValue({ url: 'https://pay/cs_1', id: 'cs_1' })
    guardMocks.mockSessionRetrieve.mockResolvedValue(reservation({ quoted_hours: '2' }))
    guardMocks.mockCustomerList.mockResolvedValue({ data: [] })
    guardMocks.mockCustomerCreate.mockResolvedValue({ id: 'cus_1', metadata: {} })
    guardMocks.mockCustomerUpdate.mockResolvedValue({})
    guardMocks.mockFreeHourAvailable.mockResolvedValue(false)
    guardMocks.mockMarkFreeHour.mockResolvedValue({ burned: true })
    guardMocks.mockCreateTeamsMeeting.mockResolvedValue({ status: 'skipped' })
    guardMocks.mockHasConflict.mockResolvedValue(false)
    guardMocks.mockRecordedMinutes.mockResolvedValue(null)
    guardMocks.mockFind.mockResolvedValue(false)
    guardMocks.mockOverlap.mockResolvedValue(null)
    guardMocks.mockCreateCalendarEvent.mockResolvedValue({ alreadyExists: false })
    guardMocks.mockSendOperatorEmail.mockResolvedValue(undefined)
    guardMocks.mockSendClientEmail.mockResolvedValue(undefined)
  })

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (savedEnv[k] === undefined) delete process.env[k]
      else process.env[k] = savedEnv[k] as string
    }
    vi.restoreAllMocks()
  })

  it('AC-018-01: Minutes beyond the booked hours plus grace are rejected 409 with no charge', async () => {
    guardMocks.mockSessionRetrieve.mockResolvedValue(reservation({ quoted_hours: '1' }))
    const res = makeRes()
    await recordedBillingHandler(
      makeBillingReq({ bookingId: 'bk_1', email: CLIENT, actualMinutes: 90 }),
      res
    )
    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'MINUTES_EXCEED_BOOKING' }),
      })
    )
    expect(guardMocks.mockSessionCreate).not.toHaveBeenCalled()
  })

  it('AC-018-02: Minutes inside the 15-minute overrun grace are accepted and charged', async () => {
    guardMocks.mockSessionRetrieve.mockResolvedValue(reservation({ quoted_hours: '1' }))
    const res = makeRes()
    await recordedBillingHandler(
      makeBillingReq({ bookingId: 'bk_1', email: CLIENT, actualMinutes: 75 }),
      res
    )
    expect(res.status).toHaveBeenCalledWith(200)
    expect(guardMocks.mockSessionCreate).toHaveBeenCalledTimes(1)
    expect(guardMocks.mockSessionCreate.mock.calls[0][0].line_items[0].price_data.unit_amount).toBe(
      3750
    )
  })

  it('AC-018-03: An unresolvable bookingId is rejected 404 and never billed', async () => {
    guardMocks.mockSessionRetrieve.mockRejectedValue(new Error('No such checkout.session'))
    const res = makeRes()
    await recordedBillingHandler(
      makeBillingReq({ bookingId: 'bk_unknown', email: CLIENT, actualMinutes: 30 }),
      res
    )
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'BOOKING_NOT_FOUND' }) })
    )
    expect(guardMocks.mockSessionCreate).not.toHaveBeenCalled()
  })

  it('AC-018-04: A Graph duration mismatch is advisory: charge succeeds with a warning field', async () => {
    guardMocks.mockSessionRetrieve.mockResolvedValue(
      reservation({ quoted_hours: '2', join_url: 'https://teams.microsoft.com/l/meetup-join/xyz' })
    )
    guardMocks.mockRecordedMinutes.mockResolvedValue(40)
    const res = makeRes()
    await recordedBillingHandler(
      makeBillingReq({ bookingId: 'bk_1', email: CLIENT, actualMinutes: 90 }),
      res
    )
    expect(res.status).toHaveBeenCalledWith(200)
    expect(guardMocks.mockSessionCreate).toHaveBeenCalledTimes(1)
    expect(res.json.mock.calls[0][0].durationMismatch).toEqual({ submitted: 90, observed: 40 })
  })

  it('AC-018-05: The client confirmation goes to the client address with the join link and pro-rata wording', async () => {
    const { sendClientEmail } =
      await vi.importActual<typeof import('../domain/email')>('../domain/email')
    const bodies: any[] = []
    const fetchImpl = vi.fn(async (_url: string, init: any) => {
      bodies.push(JSON.parse(init.body))
      return { ok: true, status: 200, text: async () => '' } as any
    }) as unknown as typeof fetch

    await sendClientEmail(
      {
        clientEmail: CLIENT,
        date: '2027-03-01',
        startTime: '10:00',
        hours: 1,
        joinUrl: 'https://teams.microsoft.com/l/meetup-join/xyz',
      },
      fetchImpl
    )

    const payload = bodies[0]
    expect(payload.to).toBe(CLIENT)
    expect(payload.to).not.toBe(process.env['EMAIL_TO'])
    expect(payload.text).toContain('https://teams.microsoft.com/l/meetup-join/xyz')
    expect(payload.text).toContain('Reserva sin cargo')
    expect(payload.text).toContain('0,50 EUR/min')
    expect(payload.text).toContain('60 minutos gratis')
    expect(payload.text).toContain('Hora (Europe/Madrid)')
  })

  it('AC-018-06: A client email failure does not fail the webhook: operator effects stand and Stripe gets 200', async () => {
    guardMocks.mockConstruct.mockReturnValue(makeCheckoutEvent())
    guardMocks.mockSendClientEmail.mockRejectedValue(new Error('Resend sandbox rejected recipient'))
    const res = makeRes()
    await webhook(makeWebhookReq(), res)
    expect(guardMocks.mockSendClientEmail).toHaveBeenCalledTimes(1)
    expect(guardMocks.mockSendOperatorEmail).toHaveBeenCalledTimes(1)
    expect(guardMocks.mockCreateCalendarEvent).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(200)
  })

  it('AC-018-07: A slot taken during the Teams round trip is caught by the pre-session re-check with 409', async () => {
    // First probe clear, second probe (after the slow Teams call) conflicting:
    // exactly the window a competing booking lands in.
    guardMocks.mockHasConflict.mockResolvedValueOnce(false).mockResolvedValueOnce(true)
    const res = makeRes()
    await bookingsHandler(makeBookingReq(), res)
    expect(guardMocks.mockHasConflict).toHaveBeenCalledTimes(2)
    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'SLOT_CONFLICT' }) })
    )
    expect(guardMocks.mockSessionCreate).not.toHaveBeenCalled()
  })

  it('AC-018-08: The 11th booking request from one IP inside the window is rate limited 429', async () => {
    for (let i = 0; i < 10; i++) {
      const ok = makeRes()
      await bookingsHandler(makeBookingReq(), ok)
      expect(ok.status).toHaveBeenCalledWith(200)
    }
    const blocked = makeRes()
    await bookingsHandler(makeBookingReq(), blocked)
    expect(blocked.status).toHaveBeenCalledWith(429)
    expect(blocked.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'RATE_LIMITED' }) })
    )
    expect(blocked.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String))
    expect(guardMocks.mockSessionCreate).toHaveBeenCalledTimes(10)
  })
})
