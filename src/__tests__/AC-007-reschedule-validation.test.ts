// AC-007 Task 4: reschedule validation (bounds, re-checked availability, limit).
// Acceptance tests per
// specs/007-client-requested-reschedule/20-acceptance/AC-007-reschedule-validation.md
//
// Pure validation with injected collaborators: it returns a typed result and
// never throws for an expected refusal, so the API layer only maps codes.
import { describe, expect, it, vi } from 'vitest'

import type { BookingRescheduleState } from '../domain/calendar'
import {
  MAX_RESCHEDULES,
  canReschedule,
  validateReschedule,
  type RescheduleDeps,
} from '../domain/reschedule'

const BOOKING: BookingRescheduleState = {
  bookingId: 'cs_test_123',
  email: 'a@b.com',
  date: '2027-03-01',
  startTime: '10:00',
  hours: 1,
  joinUrl: 'https://meet.rexi-ai.com/rexi-0123456789abcdef?lang=es',
  locale: 'es',
  count: 0,
}

// 2027-02-20T09:00:00Z: comfortably before every slot used below.
const NOW = new Date('2027-02-20T09:00:00Z')
const TARGET = { date: '2027-03-02', startTime: '09:00' }

function deps(overrides: Partial<RescheduleDeps> = {}): RescheduleDeps {
  return {
    now: NOW,
    timezone: 'Europe/Madrid',
    isPastDate: () => false,
    isSlotAvailable: () => true,
    findOverlappingBookingId: async () => null,
    ...overrides,
  }
}

describe('AC-007 reschedule validation', () => {
  it('AC-007-14: Cannot reschedule into a past date', async () => {
    const overlap = vi.fn(async () => null)
    const result = await validateReschedule(
      BOOKING,
      { date: '2027-01-05', startTime: '09:00' },
      deps({ isPastDate: (date) => date === '2027-01-05', findOverlappingBookingId: overlap })
    )
    expect(result).toEqual({ ok: false, code: 'PAST_DATE' })
    // A refused validation never probes the calendar: nothing is moved.
    expect(overlap).not.toHaveBeenCalled()
  })

  it('AC-007-15: Cannot reschedule a meeting that has already happened', async () => {
    const past: BookingRescheduleState = { ...BOOKING, date: '2027-02-01', startTime: '10:00' }
    const result = await validateReschedule(past, TARGET, deps())
    expect(result).toEqual({ ok: false, code: 'INVALID_RESCHEDULE_TOKEN' })
  })

  it('AC-007-16: Cannot move outside the availability windows', async () => {
    const result = await validateReschedule(
      BOOKING,
      { date: '2027-03-02', startTime: '23:00' },
      deps({ isSlotAvailable: () => false })
    )
    expect(result).toEqual({ ok: false, code: 'SLOT_UNAVAILABLE' })
  })

  it('AC-007-17: Cannot move into a slot occupied by a different booking', async () => {
    const overlap = vi.fn(async () => 'cs_test_other')
    const result = await validateReschedule(
      BOOKING,
      TARGET,
      deps({ findOverlappingBookingId: overlap })
    )

    expect(result).toEqual({ ok: false, code: 'SLOT_CONFLICT' })
    // The probe runs at submit time against the live calendar, for the slot the
    // client asked for and with this booking's own id excluded by the probe.
    expect(overlap).toHaveBeenCalledTimes(1)
    expect(overlap).toHaveBeenCalledWith({
      bookingId: BOOKING.bookingId,
      date: TARGET.date,
      startTime: TARGET.startTime,
      hours: BOOKING.hours,
    })
  })

  it('AC-007-18: The submit re-check catches the race between two clients', async () => {
    // A moved into X first, so the live probe now answers with A's id.
    const afterRace = vi.fn(async () => 'cs_test_a')
    const first = await validateReschedule(
      BOOKING,
      TARGET,
      deps({ findOverlappingBookingId: afterRace })
    )
    expect(first).toEqual({ ok: false, code: 'SLOT_CONFLICT' })
  })

  it('AC-007-19: A slot overlapping only one’s own event is not a conflict', async () => {
    // The probe reports the booking itself: not a different bookingId, so no conflict.
    const result = await validateReschedule(
      BOOKING,
      { date: BOOKING.date, startTime: BOOKING.startTime },
      deps({ findOverlappingBookingId: async () => BOOKING.bookingId })
    )
    expect(result).toEqual({ ok: true, count: 1 })
  })

  it('AC-007-20: Cannot exceed the reschedule limit', async () => {
    const atLimit: BookingRescheduleState = { ...BOOKING, count: MAX_RESCHEDULES }
    const overlap = vi.fn(async () => null)
    const result = await validateReschedule(
      atLimit,
      TARGET,
      deps({ findOverlappingBookingId: overlap })
    )

    expect(result).toEqual({ ok: false, code: 'RESCHEDULE_LIMIT' })
    expect(MAX_RESCHEDULES).toBe(3)
    // Refused before any calendar write path is reached.
    expect(overlap).not.toHaveBeenCalled()
  })

  it('AC-007-21: A reschedule within the limit succeeds and increments the count', async () => {
    const result = await validateReschedule(BOOKING, TARGET, deps())
    expect(result).toEqual({ ok: true, count: 1 })
  })

  describe('unit: refusal boundaries and precedence', () => {
    it('a count above the limit is refused as well', async () => {
      const over: BookingRescheduleState = { ...BOOKING, count: MAX_RESCHEDULES + 2 }
      expect(await validateReschedule(over, TARGET, deps())).toEqual({
        ok: false,
        code: 'RESCHEDULE_LIMIT',
      })
    })

    it('the last permitted reschedule still succeeds and lands on the limit', async () => {
      const penultimate: BookingRescheduleState = { ...BOOKING, count: MAX_RESCHEDULES - 1 }
      expect(await validateReschedule(penultimate, TARGET, deps())).toEqual({
        ok: true,
        count: MAX_RESCHEDULES,
      })
    })

    it('never throws for an expected refusal, whatever the collaborators answer', async () => {
      const refusals = [
        deps({ isPastDate: () => true }),
        deps({ isSlotAvailable: () => false }),
        deps({ findOverlappingBookingId: async () => 'cs_other' }),
      ]
      for (const decline of refusals) {
        await expect(validateReschedule(BOOKING, TARGET, decline)).resolves.toMatchObject({
          ok: false,
        })
      }
      const past = { ...BOOKING, date: '2020-01-01' }
      await expect(validateReschedule(past, TARGET, deps())).resolves.toMatchObject({ ok: false })
    })

    it('an expired booking is refused before the limit and before the slot checks', async () => {
      const expiredAtLimit: BookingRescheduleState = {
        ...BOOKING,
        date: '2027-02-01',
        count: MAX_RESCHEDULES,
      }
      const overlap = vi.fn(async () => null)
      expect(
        await validateReschedule(
          expiredAtLimit,
          TARGET,
          deps({ findOverlappingBookingId: overlap })
        )
      ).toEqual({ ok: false, code: 'INVALID_RESCHEDULE_TOKEN' })
      expect(overlap).not.toHaveBeenCalled()
    })

    it('a meeting starting exactly now has already started; an hour later is fine', async () => {
      // 10:00 Europe/Madrid on 2027-02-20 is exactly NOW (09:00Z).
      const startingNow: BookingRescheduleState = {
        ...BOOKING,
        date: '2027-02-20',
        startTime: '10:00',
      }
      expect(await validateReschedule(startingNow, TARGET, deps())).toEqual({
        ok: false,
        code: 'INVALID_RESCHEDULE_TOKEN',
      })
      const laterToday: BookingRescheduleState = {
        ...BOOKING,
        date: '2027-02-20',
        startTime: '11:00',
      }
      expect(await validateReschedule(laterToday, TARGET, deps())).toEqual({ ok: true, count: 1 })
    })
  })

  // Decision D2: one boolean tells the page whether the picker is worth showing,
  // so the client never fills a form that will be refused.
  describe('unit: canReschedule is the limit and the clock, nothing else', () => {
    it('is true below the limit while the meeting is still ahead', () => {
      expect(canReschedule(BOOKING, NOW, 'Europe/Madrid')).toBe(true)
      const penultimate: BookingRescheduleState = { ...BOOKING, count: MAX_RESCHEDULES - 1 }
      expect(canReschedule(penultimate, NOW, 'Europe/Madrid')).toBe(true)
    })

    it('is false at or over the limit', () => {
      expect(canReschedule({ ...BOOKING, count: MAX_RESCHEDULES }, NOW, 'Europe/Madrid')).toBe(
        false
      )
      expect(canReschedule({ ...BOOKING, count: MAX_RESCHEDULES + 1 }, NOW, 'Europe/Madrid')).toBe(
        false
      )
    })

    it('is false once the meeting has started, even with reschedules left', () => {
      const started: BookingRescheduleState = { ...BOOKING, date: '2027-02-01', startTime: '10:00' }
      expect(started.count).toBe(0)
      expect(canReschedule(started, NOW, 'Europe/Madrid')).toBe(false)
    })

    it('agrees with validateReschedule on both boundaries', async () => {
      // The page and the endpoint must never disagree: a `true` here that the
      // submit refuses would show a form destined to fail.
      const atLimit: BookingRescheduleState = { ...BOOKING, count: MAX_RESCHEDULES }
      expect(canReschedule(atLimit, NOW, 'Europe/Madrid')).toBe(false)
      expect(await validateReschedule(atLimit, TARGET, deps())).toMatchObject({ ok: false })

      const eligible: BookingRescheduleState = { ...BOOKING, count: MAX_RESCHEDULES - 1 }
      expect(canReschedule(eligible, NOW, 'Europe/Madrid')).toBe(true)
      expect(await validateReschedule(eligible, TARGET, deps())).toMatchObject({ ok: true })
    })
  })
})
