// AC-007 Task 2: the calendar event is the durable store for reschedule state.
// Acceptance tests per
// specs/007-client-requested-reschedule/20-acceptance/AC-007-token-store.md
//
// There is no booking database: the billing-disabled path creates a UUID booking
// with no Stripe session at all, so a token must resolve from the event alone.
import { beforeEach, describe, expect, it } from 'vitest'

import {
  CLIENT_EMAIL_PROPERTY_ID,
  HOURS_PROPERTY_ID,
  JOIN_URL_PROPERTY_ID,
  LOCALE_PROPERTY_ID,
  RESCHEDULE_COUNT_PROPERTY_ID,
  RESCHEDULE_TOKEN_PROPERTY_ID,
  createGraphEvent,
  findBookingByRescheduleToken,
  moveGraphEvent,
} from '../domain/microsoftGraph'

import { createGraphHarness, useMicrosoftEnv, type GraphEvent } from './graph-harness'

const BRAND = 'https://meet.rexi-ai.com'
const ROOM = 'rexi-0123456789abcdef'
const JOIN_ES = `${BRAND}/${ROOM}?lang=es`
const TOKEN = 'a'.repeat(64)
const ROTATED = 'b'.repeat(64)
const BOOKING_ID = 'cs_test_123'

function props(event: GraphEvent | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  for (const p of event?.singleValueExtendedProperties ?? []) out[p.id] = p.value
  return out
}

function seededEvent(overrides: Partial<GraphEvent> = {}): GraphEvent {
  return {
    id: 'ev-seeded',
    subject: `Booking a@b.com`,
    body: { contentType: 'HTML', content: `<a href="${JOIN_ES}">Join</a>` },
    start: { dateTime: '2027-03-01T10:00:00', timeZone: 'Europe/Madrid' },
    end: { dateTime: '2027-03-01T11:00:00', timeZone: 'Europe/Madrid' },
    attendees: [{ emailAddress: { address: 'a@b.com' }, type: 'required' }],
    singleValueExtendedProperties: [
      {
        id: 'String {00020329-0000-0000-C000-000000000046} Name rexi_booking_id',
        value: BOOKING_ID,
      },
      { id: RESCHEDULE_TOKEN_PROPERTY_ID, value: TOKEN },
      { id: RESCHEDULE_COUNT_PROPERTY_ID, value: '0' },
      { id: JOIN_URL_PROPERTY_ID, value: JOIN_ES },
      { id: CLIENT_EMAIL_PROPERTY_ID, value: 'a@b.com' },
      { id: HOURS_PROPERTY_ID, value: '1' },
      { id: LOCALE_PROPERTY_ID, value: 'en' },
    ],
    ...overrides,
  }
}

describe('AC-007 reschedule state on the calendar event', () => {
  beforeEach(() => {
    useMicrosoftEnv()
  })

  it('AC-007-04: Create event writes the full reschedule state', async () => {
    const harness = createGraphHarness()
    await createGraphEvent(
      {
        bookingId: BOOKING_ID,
        email: 'a@b.com',
        date: '2027-03-01',
        startTime: '10:00',
        hours: 1,
        joinUrl: JOIN_ES,
        locale: 'es',
        rescheduleToken: TOKEN,
        timezone: 'Europe/Madrid',
      },
      { fetchImpl: harness.fetchImpl }
    )

    const written = props(harness.events[0])
    expect(written[RESCHEDULE_TOKEN_PROPERTY_ID]).toBe(TOKEN)
    expect(written[RESCHEDULE_COUNT_PROPERTY_ID]).toBe('0')
    expect(written[JOIN_URL_PROPERTY_ID]).toBe(JOIN_ES)
    expect(written[CLIENT_EMAIL_PROPERTY_ID]).toBe('a@b.com')
    expect(written[HOURS_PROPERTY_ID]).toBe('1')
    expect(written[LOCALE_PROPERTY_ID]).toBe('es')
    // The dedup property stays first: AC-009-03 reads index 0.
    expect(harness.events[0]?.singleValueExtendedProperties[0]).toEqual({
      id: 'String {00020329-0000-0000-C000-000000000046} Name rexi_booking_id',
      value: BOOKING_ID,
    })
  })

  it('AC-007-05: A token resolves to its booking’s current state', async () => {
    const harness = createGraphHarness([seededEvent()])
    const booking = await findBookingByRescheduleToken(TOKEN, { fetchImpl: harness.fetchImpl })

    expect(booking).toEqual({
      bookingId: BOOKING_ID,
      email: 'a@b.com',
      date: '2027-03-01',
      startTime: '10:00',
      hours: 1,
      joinUrl: JOIN_ES,
      locale: 'en',
      count: 0,
    })
  })

  it('AC-007-06: An unknown token resolves to null', async () => {
    const harness = createGraphHarness([seededEvent()])
    expect(await findBookingByRescheduleToken(ROTATED, { fetchImpl: harness.fetchImpl })).toBeNull()
    // A malformed candidate never reaches Graph at all.
    const before = harness.requests.length
    expect(
      await findBookingByRescheduleToken('not-a-token', { fetchImpl: harness.fetchImpl })
    ).toBeNull()
    expect(harness.requests.length).toBe(before)
  })

  it('AC-007-07: A rotated token no longer resolves', async () => {
    const harness = createGraphHarness([seededEvent()])
    await moveGraphEvent(
      {
        bookingId: BOOKING_ID,
        date: '2027-03-02',
        startTime: '09:00',
        hours: 1,
        joinUrl: JOIN_ES,
        email: 'a@b.com',
        locale: 'en',
        rescheduleToken: ROTATED,
        rescheduleCount: 1,
        timezone: 'Europe/Madrid',
      },
      { fetchImpl: harness.fetchImpl }
    )

    expect(await findBookingByRescheduleToken(TOKEN, { fetchImpl: harness.fetchImpl })).toBeNull()
    const current = await findBookingByRescheduleToken(ROTATED, {
      fetchImpl: harness.fetchImpl,
    })
    expect(current?.bookingId).toBe(BOOKING_ID)
    expect(current?.date).toBe('2027-03-02')
    expect(current?.count).toBe(1)
  })

  describe('unit: a booking with no token still carries its reschedule state', () => {
    it('writes the other six properties and no token property', async () => {
      // 10-tasks.md Task 2: a caller with no token to offer (every caller before
      // this spec, and any future one) must still produce a reschedulable event.
      // The missing token is the ONLY missing property.
      const harness = createGraphHarness()
      await createGraphEvent(
        {
          bookingId: BOOKING_ID,
          email: 'a@b.com',
          date: '2027-03-01',
          startTime: '10:00',
          hours: 2,
          joinUrl: JOIN_ES,
          timezone: 'Europe/Madrid',
        },
        { fetchImpl: harness.fetchImpl }
      )

      const written = props(harness.events[0])
      expect(written[RESCHEDULE_COUNT_PROPERTY_ID]).toBe('0')
      expect(written[JOIN_URL_PROPERTY_ID]).toBe(JOIN_ES)
      expect(written[CLIENT_EMAIL_PROPERTY_ID]).toBe('a@b.com')
      expect(written[HOURS_PROPERTY_ID]).toBe('2')
      // No locale offered: the stored value is the Spanish default, so a later
      // move sends the notice and the link in the booking's language.
      expect(written[LOCALE_PROPERTY_ID]).toBe('es')
      expect(RESCHEDULE_TOKEN_PROPERTY_ID in written).toBe(false)
    })
  })

  describe('unit: stored state is read defensively', () => {
    it('an event carrying no token is not a candidate at all', async () => {
      const bare = seededEvent({ singleValueExtendedProperties: [] })
      const harness = createGraphHarness([bare])
      expect(await findBookingByRescheduleToken(TOKEN, { fetchImpl: harness.fetchImpl })).toBeNull()
    })

    it('a non-numeric count reads as 0 rather than NaN', async () => {
      const harness = createGraphHarness([
        seededEvent({
          singleValueExtendedProperties: [
            { id: RESCHEDULE_TOKEN_PROPERTY_ID, value: TOKEN },
            {
              id: 'String {00020329-0000-0000-C000-000000000046} Name rexi_booking_id',
              value: BOOKING_ID,
            },
            { id: RESCHEDULE_COUNT_PROPERTY_ID, value: 'oops' },
          ],
        }),
      ])
      const booking = await findBookingByRescheduleToken(TOKEN, { fetchImpl: harness.fetchImpl })
      expect(booking?.count).toBe(0)
    })

    it('a booking with no locale reads as the Spanish default', async () => {
      const harness = createGraphHarness([
        seededEvent({
          singleValueExtendedProperties: [
            { id: RESCHEDULE_TOKEN_PROPERTY_ID, value: TOKEN },
            {
              id: 'String {00020329-0000-0000-C000-000000000046} Name rexi_booking_id',
              value: BOOKING_ID,
            },
          ],
        }),
      ])
      const booking = await findBookingByRescheduleToken(TOKEN, { fetchImpl: harness.fetchImpl })
      expect(booking?.locale).toBe('es')
      expect(booking?.joinUrl).toBeNull()
      expect(booking?.email).toBe('')
    })
  })
})
