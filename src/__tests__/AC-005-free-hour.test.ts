import { describe, it, expect, vi } from 'vitest'

import { isFreeHourAvailable, markFreeHourUsed } from '../domain/freeHour'

function makeMockStripe(opts: { listData?: any[]; listError?: boolean; updateImpl?: any; createImpl?: any }) {
  const list = vi.fn().mockImplementation(async () => {
    if (opts.listError) throw new Error('network error')
    return { data: opts.listData ?? [] }
  })
  const update = vi.fn().mockImplementation(opts.updateImpl ?? (async () => ({})))
  const create = vi.fn().mockImplementation(opts.createImpl ?? (async () => ({ id: 'cus_new', metadata: {} })))
  return {
    customers: { list, update, create },
  } as any
}

describe('AC-005', () => {
  it('AC-005-01: Unknown email is eligible', async () => {
    const stripe = makeMockStripe({ listData: [] })
    const res = await isFreeHourAvailable('new@example.com', stripe)
    expect(res).toBe(true)
  })
  it('AC-005-02: Customer without the flag is eligible', async () => {
    const stripe = makeMockStripe({ listData: [{ id: 'cus_1', metadata: {} }] })
    const res = await isFreeHourAvailable('once@example.com', stripe)
    expect(res).toBe(true)
  })
  it('AC-005-03: Customer with the flag is not eligible', async () => {
    const stripe = makeMockStripe({ listData: [{ id: 'cus_1', metadata: { rexi_free_hour_used: '1' } }] })
    const res = await isFreeHourAvailable('returning@example.com', stripe)
    expect(res).toBe(false)
  })
  it('AC-005-04: Marking usage persists the flag', async () => {
    // Use in-memory mock that remembers
    const store: Record<string, any> = {}
    const stripe: any = {
      customers: {
        list: vi.fn().mockImplementation(async ({ email }: any) => {
          const c = store[email]
          return { data: c ? [c] : [] }
        }),
        create: vi.fn().mockImplementation(async ({ email }: any) => {
          const c = { id: 'cus_new', email, metadata: { rexi_free_hour_used: '1' } }
          store[email] = c
          return c
        }),
        update: vi.fn().mockImplementation(async (id: string, { metadata }: any) => {
          for (const k of Object.keys(store)) {
            if (store[k].id === id) {
              store[k] = { ...store[k], metadata }
              return store[k]
            }
          }
          return { id, metadata }
        }),
      },
    }
    await markFreeHourUsed('fresh@example.com', stripe)
    const available = await isFreeHourAvailable('fresh@example.com', stripe)
    expect(available).toBe(false)
  })
  it('AC-005-05: Stripe failure is never treated as eligible', async () => {
    const stripe = makeMockStripe({ listError: true })
    await expect(isFreeHourAvailable('err@example.com', stripe)).rejects.toThrow(/Stripe lookup failed/i)
  })
})
