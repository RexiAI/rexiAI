// AC-007 Task 1: the opaque reschedule token.
// Acceptance tests per
// specs/007-client-requested-reschedule/20-acceptance/AC-007-token.md
//
// A token is a client capability that travels in an email: it must reveal
// nothing about the booking, be cheap to reject, and never be derivable from
// booking data.
import { describe, expect, it, vi } from 'vitest'

import { generateRescheduleToken, isValidRescheduleToken } from '../domain/rescheduleToken'

describe('AC-007 opaque reschedule token', () => {
  it('AC-007-01: Token is 32 random bytes hex-encoded, lowercase, 64 chars', () => {
    const token = generateRescheduleToken()
    expect(token).toMatch(/^[0-9a-f]{64}$/)
    expect(token).toHaveLength(64)
    expect(token).toBe(token.toLowerCase())
    expect(token).not.toMatch(/[^0-9a-f]/)
  })

  it('AC-007-02: Generation is independent of booking data and random', () => {
    const first = generateRescheduleToken()
    const second = generateRescheduleToken()

    // No booking field is an input: the function takes no parameters at all.
    expect(generateRescheduleToken.length).toBe(0)
    expect(first).not.toBe(second)

    // Nothing about a booking can be recovered from a token.
    const booking = {
      email: 'a@b.com',
      bookingId: 'cs_test_123',
      room: 'rexi-0123456789abcdef',
      date: '2027-03-01',
      startTime: '10:00',
    }
    for (const token of [first, second]) {
      for (const value of Object.values(booking)) {
        expect(token).not.toContain(value)
      }
    }
  })

  it('AC-007-03: A malformed token is rejected without a calendar call', () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    try {
      const malformed: unknown[] = [
        '',
        'a'.repeat(32),
        'A'.repeat(64),
        `${'a'.repeat(63)}/`,
        `${'a'.repeat(63)}_`,
        `${'a'.repeat(63)}+`,
        `${'a'.repeat(63)}g`,
        `${'a'.repeat(63)} `,
        '0123456789abcdef'.repeat(4).toUpperCase(),
        null,
        undefined,
        42,
        {},
      ]
      for (const candidate of malformed) {
        expect(isValidRescheduleToken(candidate)).toBe(false)
      }
      expect(fetchSpy).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  describe('unit: the accepted shape is exactly one shape', () => {
    it('accepts only 64 lowercase hex characters', () => {
      expect(isValidRescheduleToken('0'.repeat(64))).toBe(true)
      expect(isValidRescheduleToken('0123456789abcdef'.repeat(4))).toBe(true)
      // One character off in either direction is rejected.
      expect(isValidRescheduleToken('0'.repeat(63))).toBe(false)
      expect(isValidRescheduleToken('0'.repeat(65))).toBe(false)
    })

    it('a generated token always validates and never repeats', () => {
      const seen = new Set<string>()
      for (let i = 0; i < 50; i += 1) {
        const token = generateRescheduleToken()
        expect(isValidRescheduleToken(token)).toBe(true)
        expect(seen.has(token)).toBe(false)
        seen.add(token)
      }
    })
  })
})
