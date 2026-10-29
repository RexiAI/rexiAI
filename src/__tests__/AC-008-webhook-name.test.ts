// AC-008 Task 6 — the webhook reads the name from metadata and forwards it.
// Acceptance tests per
// specs/008-customer-name-and-recording-folders/20-acceptance/AC-008-webhook-name.md
//
// Session metadata is the only channel that survives the Stripe round trip, so
// these tests drive the real handler with a constructed event and assert on the
// operator-email payload it produces.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  mockMark: vi.fn(),
  mockCreateEvent: vi.fn(),
  mockFind: vi.fn(),
  mockSendEmail: vi.fn(),
  mockSendClientEmail: vi.fn(),
  mockOverlap: vi.fn(),
  mockConstruct: vi.fn(),
}))

vi.mock('../domain/freeHour', () => ({ markFreeHourUsed: mocks.mockMark }))
vi.mock('../domain/microsoftGraph', () => ({
  microsoftGraph: {
    createEvent: mocks.mockCreateEvent,
    findEventByBookingId: mocks.mockFind,
    findOverlappingBookingId: mocks.mockOverlap,
    getBusyIntervals: vi.fn(),
  },
}))
vi.mock('../domain/email', () => ({
  sendOperatorEmail: mocks.mockSendEmail,
  sendClientEmail: mocks.mockSendClientEmail,
}))
vi.mock('stripe', () => ({
  default: vi.fn(function (this: unknown) {
    return {
      webhooks: { constructEvent: mocks.mockConstruct },
      customers: { list: vi.fn(), create: vi.fn(), update: vi.fn() },
      checkout: { sessions: { create: vi.fn() } },
    }
  }),
}))

import webhook, { _resetEmailSent } from '../../api/stripe-webhook'

function makeEvent(metadata: Record<string, string>) {
  return {
    id: 'evt_name_1',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_name',
        customer_email: 'ana@example.com',
        metadata,
        amount_total: 0,
      },
    },
  }
}

function makeReq() {
  return {
    method: 'POST',
    headers: { 'stripe-signature': 'sig' },
    bodyRaw: '{}',
    body: {},
  } as any
}

function makeRes() {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() } as any
}

const BASE_METADATA = {
  email: 'ana@example.com',
  date: '2027-03-01',
  start_time: '10:00',
  hours: '1',
}

describe('AC-008 webhook name', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _resetEmailSent()
    process.env['STRIPE_SECRET_KEY'] = 'sk_test'
    process.env['STRIPE_WEBHOOK_SECRET'] = 'whsec_test'
    mocks.mockMark.mockResolvedValue(undefined)
    mocks.mockCreateEvent.mockResolvedValue({ alreadyExists: false })
    mocks.mockFind.mockResolvedValue(false)
    mocks.mockSendEmail.mockResolvedValue(undefined)
    mocks.mockSendClientEmail.mockResolvedValue(undefined)
    mocks.mockOverlap.mockResolvedValue(null)
  })

  it('AC-008-13: the metadata name reaches the operator email', async () => {
    mocks.mockConstruct.mockReturnValue(makeEvent({ ...BASE_METADATA, name: 'Ana López' }))
    const res = makeRes()

    await webhook(makeReq(), res)

    expect(mocks.mockSendEmail).toHaveBeenCalledTimes(1)
    expect(mocks.mockSendEmail.mock.calls[0][0]).toEqual(
      expect.objectContaining({ clientName: 'Ana López', clientEmail: 'ana@example.com' })
    )
    expect(res.status).toHaveBeenCalledWith(200)
  })

  it('AC-008-14: a session with no name metadata does not error', async () => {
    mocks.mockConstruct.mockReturnValue(makeEvent({ ...BASE_METADATA }))
    const res = makeRes()

    await webhook(makeReq(), res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(mocks.mockSendEmail).toHaveBeenCalledTimes(1)
    // The Nombre line is omitted: no name rides into the email payload.
    expect(mocks.mockSendEmail.mock.calls[0][0].clientName ?? '').toBe('')
  })
})
