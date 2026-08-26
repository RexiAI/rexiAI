import { describe, it, expect } from 'vitest'
import { priceCents } from '../domain/pricing'

describe('AC-004', () => {
  it('AC-004-01: First-time client pricing table', () => {
    expect(priceCents(1, true)).toEqual({ ok: true, cents: 0 })
    expect(priceCents(2, true)).toEqual({ ok: true, cents: 3000 })
    expect(priceCents(3, true)).toEqual({ ok: true, cents: 6000 })
    expect(priceCents(4, true)).toEqual({ ok: true, cents: 9000 })
  })
  it('AC-004-02: Returning client pricing table', () => {
    expect(priceCents(1, false)).toEqual({ ok: true, cents: 3000 })
    expect(priceCents(2, false)).toEqual({ ok: true, cents: 6000 })
    expect(priceCents(3, false)).toEqual({ ok: true, cents: 9000 })
    expect(priceCents(4, false)).toEqual({ ok: true, cents: 12000 })
  })
  it('AC-004-03: Zero hours rejected', () => {
    const r = priceCents(0, true)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.message).toMatch(/at least 1 hour/i)
  })
  it('AC-004-04: Hours above maximum rejected', () => {
    const r = priceCents(5, true)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.message).toMatch(/at most 4 hours/i)
  })
  it('AC-004-05: Negative hours rejected', () => {
    const r = priceCents(-1, false)
    expect(r.ok).toBe(false)
  })
  it('AC-004-06: Fractional hours rejected', () => {
    const r = priceCents(1.5, true)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.message).toMatch(/whole hours/i)
  })
})
