// AC-008 Task 3 — the customer name persists in Checkout Session metadata.
// Acceptance tests per
// specs/008-customer-name-and-recording-folders/20-acceptance/AC-008-stripe-metadata-name.md
import { beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({
  mockFreeHourAvailable: vi.fn(),
  mockSessionCreate: vi.fn(),
}))

vi.mock('../domain/freeHour', () => ({ isFreeHourAvailable: m.mockFreeHourAvailable }))
vi.mock('../domain/stripeClient', () => ({
  getStripe: () => ({ checkout: { sessions: { create: m.mockSessionCreate } } }),
}))

import { createCheckout } from '../../api/bookings/checkout'

function makeRes() {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() } as any
}

const INPUT = {
  name: 'Ana López',
  email: 'ana@example.com',
  date: '2027-03-01',
  startTime: '10:00',
  hours: 1,
}

describe('AC-008 stripe metadata', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    m.mockFreeHourAvailable.mockResolvedValue(true)
    m.mockSessionCreate.mockResolvedValue({ id: 'cs_test_1', url: 'https://checkout.stripe.com/x' })
  })

  it('AC-008-07: the name is written to checkout session metadata', async () => {
    const res = makeRes()
    await createCheckout({
      ...INPUT,
      req: { method: 'POST', headers: { host: 'example.com' } } as any,
      res,
    })

    expect(m.mockSessionCreate).toHaveBeenCalledTimes(1)
    const params = m.mockSessionCreate.mock.calls[0][0]
    expect(params.metadata.name).toBe('Ana López')
    // The pre-existing metadata keys are untouched.
    expect(params.metadata).toEqual(
      expect.objectContaining({
        email: 'ana@example.com',
        date: '2027-03-01',
        start_time: '10:00',
        hours: '1',
        quoted_hours: '1',
        reservation: '1',
        free_hour_applied: 'true',
      })
    )
  })
})
