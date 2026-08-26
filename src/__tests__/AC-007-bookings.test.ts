import { describe, it, expect, vi, beforeEach } from 'vitest'

const stripeMocks = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockList: vi.fn(),
}))
const gcalMocks = vi.hoisted(() => ({
  mockFreeBusy: vi.fn(),
  mockList: vi.fn(),
  mockInsert: vi.fn(),
}))

vi.mock('stripe', () => ({
  default: vi.fn(function (this: unknown) {
    return {
      customers: { list: stripeMocks.mockList },
      checkout: { sessions: { create: stripeMocks.mockCreate } },
      webhooks: { constructEvent: vi.fn() },
    }
  }),
}))

vi.mock('googleapis', () => ({
  google: {
    auth: { JWT: class { constructor() {} } as any },
    calendar: vi.fn().mockImplementation(() => ({
      freebusy: { query: gcalMocks.mockFreeBusy },
      events: { list: gcalMocks.mockList, insert: gcalMocks.mockInsert },
    })),
  },
}))

import bookingsHandler from '../../api/bookings'
import fs from 'fs'

const yamlContent = `
timezone: Europe/Madrid
weekly:
  monday:
    - {start: "09:00", end: "13:00"}
exceptions: {}
`

describe('AC-007', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    stripeMocks.mockCreate.mockReset()
    stripeMocks.mockList.mockReset()
    gcalMocks.mockFreeBusy.mockReset()
    process.env['STRIPE_SECRET_KEY'] = 'sk_test_dummy'
    process.env['GOOGLE_CALENDAR_ID'] = 'test-cal'
    process.env['GOOGLE_SERVICE_ACCOUNT_JSON'] = JSON.stringify({ client_email: 'a@b', private_key: 'k' })
    vi.spyOn(fs, 'readFileSync').mockReturnValue(yamlContent as any)
    gcalMocks.mockFreeBusy.mockResolvedValue({ data: { calendars: { 'test-cal': { busy: [] } } } })
    stripeMocks.mockList.mockResolvedValue({ data: [] })
    stripeMocks.mockCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/pay/cs_test_123', id: 'cs_test_123' })
  })

  it('AC-007-01: First-timer one-hour booking creates a zero-euro checkout session', async () => {
    const req: any = {
      method: 'POST',
      body: { email: 'first@example.com', date: '2027-03-01', startTime: '10:00', hours: 1 },
      headers: { host: 'example.com', 'x-forwarded-proto': 'https' },
    }
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() }
    await bookingsHandler(req, res)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(stripeMocks.mockCreate).toHaveBeenCalled()
    const args = stripeMocks.mockCreate.mock.calls[0][0]
    const unitAmount = args.line_items[0].price_data.unit_amount
    expect(unitAmount).toBe(0)
    expect(args.metadata.free_hour_applied).toBe('true')
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ checkoutUrl: expect.stringContaining('https://') }))
  })

  it('AC-007-02: First-timer two-hour booking charges 30 EUR', async () => {
    stripeMocks.mockList.mockResolvedValue({ data: [] })
    const req: any = {
      method: 'POST',
      body: { email: 'first@example.com', date: '2027-03-01', startTime: '10:00', hours: 2 },
      headers: { host: 'example.com' },
    }
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() }
    await bookingsHandler(req, res)
    const unitAmount = stripeMocks.mockCreate.mock.calls[0][0].line_items[0].price_data.unit_amount
    expect(unitAmount).toBe(3000)
    expect(stripeMocks.mockCreate.mock.calls[0][0].metadata.free_hour_applied).toBe('true')
  })

  it('AC-007-03: Returning client pays full price', async () => {
    stripeMocks.mockList.mockResolvedValue({ data: [{ id: 'cus_1', metadata: { rexi_free_hour_used: '1' } }] })
    const req: any = {
      method: 'POST',
      body: { email: 'returning@example.com', date: '2027-03-01', startTime: '10:00', hours: 2 },
      headers: { host: 'example.com' },
    }
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() }
    await bookingsHandler(req, res)
    const unitAmount = stripeMocks.mockCreate.mock.calls[0][0].line_items[0].price_data.unit_amount
    expect(unitAmount).toBe(6000)
    expect(stripeMocks.mockCreate.mock.calls[0][0].metadata.free_hour_applied).toBe('false')
  })

  it('AC-007-04: Invalid email rejected without calling Stripe', async () => {
    const req: any = { method: 'POST', body: { email: 'not-an-email', date: '2027-03-01', startTime: '10:00', hours: 1 } }
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() }
    await bookingsHandler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(stripeMocks.mockCreate).not.toHaveBeenCalled()
  })

  it('AC-007-05: Invalid durations rejected without calling Stripe', async () => {
    for (const h of [0, 5, 2.5]) {
      vi.clearAllMocks()
      stripeMocks.mockCreate.mockReset()
      vi.spyOn(fs, 'readFileSync').mockReturnValue(yamlContent as any)
      gcalMocks.mockFreeBusy.mockResolvedValue({ data: { calendars: { 'test-cal': { busy: [] } } } })
      stripeMocks.mockList.mockResolvedValue({ data: [] })
      const req: any = { method: 'POST', body: { email: 'a@b.com', date: '2027-03-01', startTime: '10:00', hours: h } }
      const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() }
      await bookingsHandler(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
      expect(stripeMocks.mockCreate).not.toHaveBeenCalled()
    }
  })

  it('AC-007-06: Off-grid start time rejected', async () => {
    const req: any = { method: 'POST', body: { email: 'a@b.com', date: '2027-03-01', startTime: '09:15', hours: 1 } }
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() }
    await bookingsHandler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(stripeMocks.mockCreate).not.toHaveBeenCalled()
  })

  it('AC-007-07: Start outside availability rejected', async () => {
    const req: any = { method: 'POST', body: { email: 'a@b.com', date: '2027-03-01', startTime: '18:00', hours: 1 } }
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() }
    await bookingsHandler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(stripeMocks.mockCreate).not.toHaveBeenCalled()
  })

  it('AC-007-08: Conflicting existing booking rejected', async () => {
    gcalMocks.mockFreeBusy.mockResolvedValue({
      data: { calendars: { 'test-cal': { busy: [{ start: new Date('2027-03-01T09:00:00.000Z').toISOString(), end: new Date('2027-03-01T10:00:00.000Z').toISOString() }] } } },
    })
    const req: any = {
      method: 'POST',
      body: { email: 'a@b.com', date: '2027-03-01', startTime: '10:00', hours: 1 },
      headers: { host: 'example.com' },
    }
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() }
    await bookingsHandler(req, res)
    expect(res.status).toHaveBeenCalledWith(409)
    expect(stripeMocks.mockCreate).not.toHaveBeenCalled()
  })
})
