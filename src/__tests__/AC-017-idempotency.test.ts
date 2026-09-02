import { describe, it, expect, vi, beforeEach } from 'vitest'

const dedupMocks = vi.hoisted(() => ({
  mockCreateEvent: vi.fn(),
  mockFind: vi.fn(),
  mockSendEmail: vi.fn(),
  mockSendClientEmail: vi.fn(),
  mockOverlap: vi.fn(),
  mockConstruct: vi.fn(),
  mockList: vi.fn(),
  mockCustomerCreate: vi.fn(),
  mockCustomerUpdate: vi.fn(),
}))

vi.mock('../domain/gcal', () => ({
  createGCalEvent: dedupMocks.mockCreateEvent,
  findEventByBookingId: dedupMocks.mockFind,
  findOverlappingBookingId: dedupMocks.mockOverlap,
}))
vi.mock('../domain/email', () => ({
  sendOperatorEmail: dedupMocks.mockSendEmail,
  sendClientEmail: dedupMocks.mockSendClientEmail,
}))
vi.mock('stripe', () => ({
  default: vi.fn(function (this: unknown) {
    return {
      webhooks: { constructEvent: dedupMocks.mockConstruct },
      customers: {
        list: dedupMocks.mockList,
        create: dedupMocks.mockCustomerCreate,
        update: dedupMocks.mockCustomerUpdate,
      },
      checkout: { sessions: { create: vi.fn() } },
    }
  }),
}))

import webhook, { _resetEmailSent } from '../../api/stripe-webhook'
import { isFreeHourAvailable, markFreeHourUsed } from '../domain/freeHour'

function makeRes() {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() } as any
}

function makeReq() {
  return {
    method: 'POST',
    headers: { 'stripe-signature': 'sig' },
    bodyRaw: '{}',
    body: {},
  } as any
}

function makeEvent(id: string) {
  return {
    id,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_123',
        customer_email: 'client@example.com',
        metadata: {
          email: 'client@example.com',
          date: '2027-03-01',
          start_time: '10:00',
          hours: '1',
        },
        amount_total: 0,
      },
    },
  }
}

/** A Stripe customer store that actually persists metadata across calls. */
type StoredCustomer = {
  id?: string
  email?: string
  created?: number
  metadata: Record<string, any>
}

function makeCustomerStore(initial: Array<Record<string, any>> = []) {
  const customers: StoredCustomer[] = initial.map((c) => ({ metadata: {}, ...c }))
  dedupMocks.mockList.mockImplementation(async () => ({ data: customers }))
  dedupMocks.mockCustomerCreate.mockImplementation(async ({ email, metadata }: any) => {
    const c = { id: `cus_${customers.length + 1}`, email, created: 1000, metadata: metadata ?? {} }
    customers.push(c)
    return c
  })
  dedupMocks.mockCustomerUpdate.mockImplementation(async (id: string, { metadata }: any) => {
    const c = customers.find((x) => x.id === id)
    if (!c) return { id, metadata }
    const next: Record<string, any> = { ...c.metadata, ...metadata }
    for (const [k, v] of Object.entries(next)) if (v === null) delete next[k]
    c.metadata = next
    return c
  })
  return customers
}

function makeStripeStub(customers: Array<Record<string, any>>) {
  return {
    customers: {
      list: vi.fn().mockResolvedValue({ data: customers }),
      create: vi.fn().mockResolvedValue({ id: 'cus_new', metadata: {} }),
      update: vi.fn().mockResolvedValue({}),
    },
  } as any
}

describe('AC-017', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _resetEmailSent()
    process.env['STRIPE_SECRET_KEY'] = 'sk_test'
    process.env['STRIPE_WEBHOOK_SECRET'] = 'whsec_test'
    dedupMocks.mockCreateEvent.mockResolvedValue({ alreadyExists: false })
    dedupMocks.mockFind.mockResolvedValue(false)
    dedupMocks.mockSendEmail.mockResolvedValue(undefined)
    dedupMocks.mockSendClientEmail.mockResolvedValue(undefined)
    dedupMocks.mockOverlap.mockResolvedValue(null)
  })

  it('AC-017-01: second delivery of the same Stripe event id is deduped after a cold start', async () => {
    makeCustomerStore([{ id: 'cus_1', email: 'client@example.com', created: 100 }])
    dedupMocks.mockConstruct.mockReturnValue(makeEvent('evt_same'))

    await webhook(makeReq(), makeRes())
    expect(dedupMocks.mockSendEmail).toHaveBeenCalledTimes(1)

    // Cold start: fresh lambda, empty in-memory dedup state.
    _resetEmailSent()
    dedupMocks.mockFind.mockResolvedValue(false)
    const res2 = makeRes()
    await webhook(makeReq(), res2)

    expect(dedupMocks.mockSendEmail).toHaveBeenCalledTimes(1)
    expect(res2.status).toHaveBeenCalledWith(200)
    expect(res2.json).toHaveBeenCalledWith({ received: true, deduped: true })
  })

  it('AC-017-02: two different event ids both process', async () => {
    makeCustomerStore([{ id: 'cus_1', email: 'client@example.com', created: 100 }])

    dedupMocks.mockConstruct.mockReturnValue(makeEvent('evt_aaa'))
    await webhook(makeReq(), makeRes())

    _resetEmailSent()
    dedupMocks.mockConstruct.mockReturnValue(makeEvent('evt_bbb'))
    const res2 = makeRes()
    await webhook(makeReq(), res2)

    expect(dedupMocks.mockSendEmail).toHaveBeenCalledTimes(2)
    expect(res2.status).toHaveBeenCalledWith(200)
  })

  it('AC-017-03: metadata pruning keeps event markers under the Stripe 50-key limit', async () => {
    const meta: Record<string, string> = { rexi_free_hour_used: '1' }
    for (let i = 0; i < 42; i++) meta[`rexi_evt_old${i}`] = String(1000 + i)
    const customers = makeCustomerStore([
      { id: 'cus_1', email: 'client@example.com', created: 100, metadata: meta },
    ])

    dedupMocks.mockConstruct.mockReturnValue(makeEvent('evt_prune_me'))
    await webhook(makeReq(), makeRes())

    const finalMeta = customers[0]!.metadata as Record<string, string>
    const eventKeys = Object.keys(finalMeta).filter((k) => k.startsWith('rexi_evt_'))
    expect(eventKeys.length).toBeLessThanOrEqual(40)
    expect(Object.keys(finalMeta).length).toBeLessThan(50)
    // Oldest markers dropped first, newest retained.
    expect(finalMeta['rexi_evt_old0']).toBeUndefined()
    expect(finalMeta['rexi_evt_old41']).toBe('1041')
    expect(finalMeta['rexi_free_hour_used']).toBe('1')
  })

  it('AC-017-04: markFreeHourUsed burns once and reports the flag was already set', async () => {
    const first = await markFreeHourUsed(
      'a@example.com',
      makeStripeStub([{ id: 'cus_1', created: 100, metadata: {} }])
    )
    expect(first).toEqual({ burned: true })

    const second = await markFreeHourUsed(
      'a@example.com',
      makeStripeStub([{ id: 'cus_1', created: 100, metadata: { rexi_free_hour_used: '1' } }])
    )
    expect(second).toEqual({ burned: false })
  })

  it('AC-017-05: free hour is unavailable when any duplicate customer carries the flag', async () => {
    const stripe = makeStripeStub([
      { id: 'cus_1', created: 100, metadata: {} },
      { id: 'cus_2', created: 200, metadata: { rexi_free_hour_used: '1' } },
      { id: 'cus_3', created: 300, metadata: {} },
    ])
    await expect(isFreeHourAvailable('dupe@example.com', stripe)).resolves.toBe(false)
    expect(stripe.customers.list).toHaveBeenCalledWith({ email: 'dupe@example.com', limit: 100 })
  })

  it('AC-017-06: markFreeHourUsed targets the oldest customer when duplicates exist', async () => {
    const stripe = makeStripeStub([
      { id: 'cus_new', created: 900, metadata: {} },
      { id: 'cus_oldest', created: 100, metadata: {} },
      { id: 'cus_mid', created: 400, metadata: {} },
    ])
    await markFreeHourUsed('dupe@example.com', stripe)
    expect(stripe.customers.update).toHaveBeenCalledTimes(1)
    expect(stripe.customers.update).toHaveBeenCalledWith('cus_oldest', {
      metadata: { rexi_free_hour_used: '1' },
    })
  })
})
