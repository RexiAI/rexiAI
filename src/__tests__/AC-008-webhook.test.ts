import { describe, it, expect, vi, beforeEach } from 'vitest'

const webhookMocks = vi.hoisted(() => ({
  mockMark: vi.fn(),
  mockCreateEvent: vi.fn(),
  mockFind: vi.fn(),
  mockSendEmail: vi.fn(),
  mockConstruct: vi.fn(),
}))

vi.mock('../domain/freeHour', () => ({ markFreeHourUsed: webhookMocks.mockMark }))
vi.mock('../domain/gcal', () => ({
  createGCalEvent: webhookMocks.mockCreateEvent,
  findEventByBookingId: webhookMocks.mockFind,
}))
vi.mock('../domain/email', () => ({ sendOperatorEmail: webhookMocks.mockSendEmail }))
vi.mock('stripe', () => ({
  default: vi.fn(function (this: unknown) {
    return {
      webhooks: { constructEvent: webhookMocks.mockConstruct },
      customers: { list: vi.fn(), create: vi.fn(), update: vi.fn() },
      checkout: { sessions: { create: vi.fn() } },
    }
  }),
}))

import webhook, { _resetEmailSent } from '../../api/stripe-webhook'

describe('AC-008', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    webhookMocks.mockMark.mockReset()
    webhookMocks.mockCreateEvent.mockReset()
    webhookMocks.mockFind.mockReset()
    webhookMocks.mockSendEmail.mockReset()
    webhookMocks.mockConstruct.mockReset()
    _resetEmailSent()
    process.env['STRIPE_SECRET_KEY'] = 'sk_test'
    process.env['STRIPE_WEBHOOK_SECRET'] = 'whsec_test'
    webhookMocks.mockMark.mockResolvedValue(undefined)
    webhookMocks.mockCreateEvent.mockResolvedValue({ alreadyExists: false })
    webhookMocks.mockFind.mockResolvedValue(false)
    webhookMocks.mockSendEmail.mockResolvedValue(undefined)
  })

  function makeEvent(overrides: any = {}) {
    return {
      id: 'evt_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          customer_email: 'client@example.com',
          metadata: { email: 'client@example.com', date: '2027-03-01', start_time: '10:00', hours: '1' },
          amount_total: 0,
          ...overrides.object,
        },
      },
    }
  }

  it('AC-008-01: Completed payment triggers all three side effects once', async () => {
    const ev = makeEvent()
    webhookMocks.mockConstruct.mockReturnValue(ev)
    const req: any = { method: 'POST', headers: { 'stripe-signature': 'sig' }, bodyRaw: '{}', body: {} }
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() }
    await webhook(req, res)
    expect(webhookMocks.mockMark).toHaveBeenCalledTimes(1)
    expect(webhookMocks.mockCreateEvent).toHaveBeenCalledTimes(1)
    expect(webhookMocks.mockSendEmail).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(200)
  })

  it('AC-008-02: Replayed event causes no duplicate side effects', async () => {
    const ev = makeEvent()
    webhookMocks.mockConstruct.mockReturnValue(ev)
    webhookMocks.mockFind.mockResolvedValue(false)
    const req: any = { method: 'POST', headers: { 'stripe-signature': 'sig' }, bodyRaw: '{}', body: {} }
    const res1: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() }
    await webhook(req, res1)
    webhookMocks.mockFind.mockResolvedValue(true)
    const res2: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() }
    await webhook(req, res2)
    expect(webhookMocks.mockCreateEvent).toHaveBeenCalledTimes(1)
    expect(webhookMocks.mockSendEmail).toHaveBeenCalledTimes(1)
    expect(res2.status).toHaveBeenCalledWith(200)
  })

  it('AC-008-03: Invalid signature rejected with zero side effects', async () => {
    webhookMocks.mockConstruct.mockImplementation(() => { throw new Error('invalid sig') })
    const req: any = { method: 'POST', headers: { 'stripe-signature': 'bad' }, bodyRaw: '{}', body: {} }
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() }
    await webhook(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(webhookMocks.mockMark).not.toHaveBeenCalled()
    expect(webhookMocks.mockCreateEvent).not.toHaveBeenCalled()
    expect(webhookMocks.mockSendEmail).not.toHaveBeenCalled()
  })

  it('AC-008-04: Unrelated event types ignored', async () => {
    const ev = { id: 'evt_2', type: 'invoice.paid', data: { object: { id: 'in_1' } } }
    webhookMocks.mockConstruct.mockReturnValue(ev)
    const req: any = { method: 'POST', headers: { 'stripe-signature': 'sig' }, bodyRaw: '{}', body: {} }
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() }
    await webhook(req, res)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(webhookMocks.mockMark).not.toHaveBeenCalled()
  })

  it('AC-008-05: Calendar failure yields retryable response without email', async () => {
    const ev = makeEvent()
    webhookMocks.mockConstruct.mockReturnValue(ev)
    webhookMocks.mockFind.mockResolvedValue(false)
    webhookMocks.mockCreateEvent.mockRejectedValue(new Error('gcal fail'))
    const req: any = { method: 'POST', headers: { 'stripe-signature': 'sig' }, bodyRaw: '{}', body: {} }
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() }
    await webhook(req, res)
    expect(res.status).toHaveBeenCalledWith(500)
    expect(webhookMocks.mockSendEmail).not.toHaveBeenCalled()
  })

  it('AC-008-06: Email failure after calendar success yields retryable response', async () => {
    const ev = makeEvent()
    webhookMocks.mockConstruct.mockReturnValue(ev)
    webhookMocks.mockFind.mockResolvedValue(false)
    webhookMocks.mockSendEmail.mockRejectedValueOnce(new Error('email fail'))
    const req: any = { method: 'POST', headers: { 'stripe-signature': 'sig' }, bodyRaw: '{}', body: {} }
    const res1: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() }
    await webhook(req, res1)
    expect(res1.status).toHaveBeenCalledWith(500)
    webhookMocks.mockFind.mockResolvedValue(true)
    webhookMocks.mockSendEmail.mockResolvedValueOnce(undefined)
    const res2: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() }
    await webhook(req, res2)
    expect(res2.status).toHaveBeenCalledWith(200)
    expect(webhookMocks.mockSendEmail).toHaveBeenCalledTimes(2)
  })
})
