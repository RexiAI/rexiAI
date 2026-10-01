import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const billingMocks = vi.hoisted(() => ({
  mockSessionCreate: vi.fn(),
  mockSessionRetrieve: vi.fn(),
}))

// The billing-disabled path must short-circuit BEFORE any Stripe call, so the
// Stripe client is mocked to prove it is never touched.
vi.mock('../domain/stripeClient', () => ({
  getStripe: () => ({
    checkout: {
      sessions: {
        create: billingMocks.mockSessionCreate,
        retrieve: billingMocks.mockSessionRetrieve,
      },
    },
  }),
}))

import recordedBillingHandler from '../../api/bookings/recorded-billing'
import configHandler from '../../api/config'
import { FreeModeBanner } from '../components/FreeModeBanner'
import { isBillingEnabled } from '../domain/billing'
import { es } from '../i18n/dictionary'

const TOKEN = 'test-billing-token'

function makeRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
  } as any
}

describe('billing kill-switch (BILLING_ENABLED)', () => {
  const saved: Record<string, string | undefined> = {}
  const KEYS = ['BILLING_ENABLED', 'RECORDED_BILLING_TOKEN', 'STRIPE_SECRET_KEY'] as const

  beforeEach(() => {
    for (const k of KEYS) saved[k] = process.env[k]
    vi.clearAllMocks()
    delete process.env['BILLING_ENABLED']
    process.env['RECORDED_BILLING_TOKEN'] = TOKEN
    process.env['STRIPE_SECRET_KEY'] = 'sk_test'
  })
  afterEach(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k]
      else process.env[k] = saved[k] as string
    }
  })

  it('isBillingEnabled defaults to true and only "false" disables (fail-safe)', () => {
    delete process.env['BILLING_ENABLED']
    expect(isBillingEnabled()).toBe(true)
    process.env['BILLING_ENABLED'] = 'false'
    expect(isBillingEnabled()).toBe(false)
    process.env['BILLING_ENABLED'] = ' FALSE '
    expect(isBillingEnabled()).toBe(false)
    process.env['BILLING_ENABLED'] = 'true'
    expect(isBillingEnabled()).toBe(true)
    process.env['BILLING_ENABLED'] = '0' // not the exact word → stays enabled
    expect(isBillingEnabled()).toBe(true)
  })

  it('GET /api/config reports billingEnabled from the env flag', async () => {
    const on = makeRes()
    await configHandler({ method: 'GET', headers: {} } as any, on)
    expect(on.status).toHaveBeenCalledWith(200)
    expect(on.json).toHaveBeenCalledWith({ billingEnabled: true })

    process.env['BILLING_ENABLED'] = 'false'
    const off = makeRes()
    await configHandler({ method: 'GET', headers: {} } as any, off)
    expect(off.json).toHaveBeenCalledWith({ billingEnabled: false })
  })

  it('GET /api/config rejects non-GET with 405', async () => {
    const res = makeRes()
    await configHandler({ method: 'POST', headers: {} } as any, res)
    expect(res.status).toHaveBeenCalledWith(405)
  })

  it('recorded-billing returns free and never touches Stripe when billing is disabled', async () => {
    process.env['BILLING_ENABLED'] = 'false'
    const res = makeRes()
    await recordedBillingHandler(
      {
        method: 'POST',
        headers: { host: 'example.com', authorization: `Bearer ${TOKEN}` },
        body: { bookingId: 'bk_1', email: 'client@example.com', actualMinutes: 90 },
      } as any,
      res
    )
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ amountCents: 0, checkoutUrl: null, billingDisabled: true })
    )
    expect(billingMocks.mockSessionCreate).not.toHaveBeenCalled()
    expect(billingMocks.mockSessionRetrieve).not.toHaveBeenCalled()
  })
})

describe('FreeModeBanner', () => {
  it('shows the FREE badge, the struck original price, and the "not free to build" fine print', () => {
    render(<FreeModeBanner dict={es} />)
    expect(screen.getByText(es.freeMode.badge)).toBeTruthy()
    expect(screen.getByText(es.freeMode.priceWas)).toBeTruthy()
    expect(screen.getByText(es.freeMode.bannerTitle, { exact: false })).toBeTruthy()
    expect(screen.getByText(es.freeMode.bannerFineprint)).toBeTruthy()
  })
})
