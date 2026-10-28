// AC-007 Task 3: the move operation and the event's `location` field.
// Acceptance tests per
// specs/007-client-requested-reschedule/20-acceptance/AC-007-calendar-move.md
//
// The move is a PATCH of the ONE existing event, never delete-and-recreate: the
// room (and therefore the recording pipeline's room -> booking mapping) and the
// bookingId stay traceable across any number of reschedules.
import { beforeEach, describe, expect, it } from 'vitest'

import {
  CLIENT_EMAIL_PROPERTY_ID,
  DEDUP_PROPERTY_ID,
  HOURS_PROPERTY_ID,
  JOIN_URL_PROPERTY_ID,
  LOCALE_PROPERTY_ID,
  RESCHEDULE_COUNT_PROPERTY_ID,
  RESCHEDULE_TOKEN_PROPERTY_ID,
  createGraphEvent,
  findOverlappingBookingId,
  moveGraphEvent,
} from '../domain/microsoftGraph'

import { createGraphHarness, useMicrosoftEnv, type GraphEvent } from './graph-harness'

const BRAND = 'https://meet.rexi-ai.com'
const ROOM = 'rexi-0123456789abcdef'
const JOIN_ES = `${BRAND}/${ROOM}?lang=es`
const JOIN_EN = `${BRAND}/${ROOM}?lang=en`
const TOKEN_T0 = 'a'.repeat(64)
const TOKEN_T1 = 'b'.repeat(64)
const BOOKING_ID = 'cs_test_123'
const OTHER_BOOKING = 'cs_test_other'

function seededBooking(overrides: Partial<GraphEvent> = {}): GraphEvent {
  return {
    id: 'ev-booking',
    subject: 'Booking a@b.com',
    body: {
      contentType: 'HTML',
      content: `Client: a@b.com - 1h<br/><a href="${JOIN_ES}">Join meeting: ${JOIN_ES}</a>`,
    },
    start: { dateTime: '2027-03-01T10:00:00', timeZone: 'Europe/Madrid' },
    end: { dateTime: '2027-03-01T11:00:00', timeZone: 'Europe/Madrid' },
    attendees: [{ emailAddress: { address: 'a@b.com' }, type: 'required' }],
    singleValueExtendedProperties: [
      { id: DEDUP_PROPERTY_ID, value: BOOKING_ID },
      { id: RESCHEDULE_TOKEN_PROPERTY_ID, value: TOKEN_T0 },
      { id: RESCHEDULE_COUNT_PROPERTY_ID, value: '0' },
      { id: JOIN_URL_PROPERTY_ID, value: JOIN_ES },
      { id: CLIENT_EMAIL_PROPERTY_ID, value: 'a@b.com' },
      { id: HOURS_PROPERTY_ID, value: '1' },
      { id: LOCALE_PROPERTY_ID, value: 'es' },
    ],
    ...overrides,
  }
}

function props(event: GraphEvent | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  for (const p of event?.singleValueExtendedProperties ?? []) out[p.id] = p.value
  return out
}

const MOVE = {
  bookingId: BOOKING_ID,
  date: '2027-03-02',
  startTime: '09:00',
  hours: 1,
  joinUrl: JOIN_ES,
  email: 'a@b.com',
  locale: 'es',
  rescheduleToken: TOKEN_T1,
  rescheduleCount: 1,
  timezone: 'Europe/Madrid',
}

describe('AC-007 calendar move', () => {
  beforeEach(() => {
    useMicrosoftEnv()
  })

  it('AC-007-08: Move changes start and end, keeps the duration and booking id', async () => {
    const harness = createGraphHarness([seededBooking()])
    await moveGraphEvent(MOVE, { fetchImpl: harness.fetchImpl })

    const event = harness.events[0]!
    expect(event.start).toEqual({ dateTime: '2027-03-02T09:00:00', timeZone: 'Europe/Madrid' })
    expect(event.end).toEqual({ dateTime: '2027-03-02T10:00:00', timeZone: 'Europe/Madrid' })
    expect(props(event)[DEDUP_PROPERTY_ID]).toBe(BOOKING_ID)
    // Duration is unchanged: still exactly one hour.
    const startMs = Date.parse(`${event.start.dateTime}Z`)
    const endMs = Date.parse(`${event.end.dateTime}Z`)
    expect(endMs - startMs).toBe(60 * 60 * 1000)
  })

  it('AC-007-09: Move releases the old slot', async () => {
    const harness = createGraphHarness([seededBooking()])
    const client = { fetchImpl: harness.fetchImpl }

    // The booking occupies its own old slot before the move...
    expect(
      await findOverlappingBookingId(
        { bookingId: 'someone-else', date: '2027-03-01', startTime: '10:00', hours: 1 },
        client
      )
    ).toBe(BOOKING_ID)

    await moveGraphEvent(MOVE, client)

    // ...and no longer does afterwards.
    expect(
      await findOverlappingBookingId(
        { bookingId: 'someone-else', date: '2027-03-01', startTime: '10:00', hours: 1 },
        client
      )
    ).toBeNull()
    expect(
      await findOverlappingBookingId(
        { bookingId: 'someone-else', date: '2027-03-02', startTime: '09:00', hours: 1 },
        client
      )
    ).toBe(BOOKING_ID)
  })

  it('AC-007-10: Location field carries the branded join URL on create', async () => {
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
        rescheduleToken: TOKEN_T0,
        timezone: 'Europe/Madrid',
      },
      { fetchImpl: harness.fetchImpl }
    )

    const event = harness.events[0]!
    expect(event.location).toEqual({ displayName: JOIN_ES })
    expect(event.location?.displayName).not.toContain('meet.jit.si')
    // Byte-identical to the join URL in the body.
    expect(event.body?.content).toContain(`href="${event.location?.displayName}"`)
  })

  it('AC-007-11: Location field carries the branded join URL on move', async () => {
    // An English booking: its body and its stored join URL both carry ?lang=en.
    const english = seededBooking({
      body: {
        contentType: 'HTML',
        content: `Client: a@b.com - 1h<br/><a href="${JOIN_EN}">Join meeting: ${JOIN_EN}</a>`,
      },
      singleValueExtendedProperties: seededBooking().singleValueExtendedProperties.map((p) =>
        p.id === JOIN_URL_PROPERTY_ID ? { ...p, value: JOIN_EN } : p
      ),
    })
    const harness = createGraphHarness([english])
    await moveGraphEvent({ ...MOVE, joinUrl: JOIN_EN }, { fetchImpl: harness.fetchImpl })

    const event = harness.events[0]!
    expect(event.location).toEqual({ displayName: JOIN_EN })
    expect(event.body?.content).toContain(`href="${event.location?.displayName}"`)
  })

  it('AC-007-12: The room never rotates on reschedule', async () => {
    const harness = createGraphHarness([seededBooking()])
    const before = harness.events[0]!.body?.content
    await moveGraphEvent(MOVE, { fetchImpl: harness.fetchImpl })

    const event = harness.events[0]!
    expect(props(event)[JOIN_URL_PROPERTY_ID]).toBe(JOIN_ES)
    expect(event.location?.displayName).toContain(ROOM)
    expect(event.body?.content).toContain(ROOM)
    // The body is not rewritten by the move, so no new room can appear in it.
    expect(event.body?.content).toBe(before)
    expect(event.body?.content).not.toMatch(/rexi-(?!0123456789abcdef)[0-9a-f]{16}/)
  })

  it('AC-007-13: Move writes the new token and increments the count', async () => {
    const harness = createGraphHarness([seededBooking()])
    await moveGraphEvent(MOVE, { fetchImpl: harness.fetchImpl })

    const written = props(harness.events[0])
    expect(written[RESCHEDULE_TOKEN_PROPERTY_ID]).toBe(TOKEN_T1)
    expect(written[RESCHEDULE_COUNT_PROPERTY_ID]).toBe('1')
  })

  describe('unit: the move leaves everything else alone', () => {
    it('subject, attendees and body survive the move untouched', async () => {
      const seed = seededBooking()
      const harness = createGraphHarness([seed])
      await moveGraphEvent(MOVE, { fetchImpl: harness.fetchImpl })
      const event = harness.events[0]!
      expect(event.subject).toBe(seed.subject)
      expect(event.attendees).toEqual(seed.attendees)
      expect(event.body).toEqual(seed.body)
    })

    it('a second booking at the old slot is not disturbed by the move', async () => {
      const other: GraphEvent = {
        ...seededBooking(),
        id: 'ev-other',
        start: { dateTime: '2027-03-01T10:00:00', timeZone: 'Europe/Madrid' },
        end: { dateTime: '2027-03-01T11:00:00', timeZone: 'Europe/Madrid' },
        singleValueExtendedProperties: [{ id: DEDUP_PROPERTY_ID, value: OTHER_BOOKING }],
      }
      const harness = createGraphHarness([seededBooking(), other])
      await moveGraphEvent(MOVE, { fetchImpl: harness.fetchImpl })

      const untouched = harness.events.find((e) => e.id === 'ev-other')!
      expect(untouched.start.dateTime).toBe('2027-03-01T10:00:00')
      expect(props(untouched)[DEDUP_PROPERTY_ID]).toBe(OTHER_BOOKING)
    })

    it('a move for an unknown booking id fails loudly instead of writing a stray event', async () => {
      const harness = createGraphHarness([seededBooking()])
      await expect(
        moveGraphEvent(
          { ...MOVE, bookingId: 'cs_does_not_exist' },
          { fetchImpl: harness.fetchImpl }
        )
      ).rejects.toThrow(/not found/i)
      expect(harness.requests.filter((r) => r.method === 'PATCH')).toHaveLength(0)
    })

    it('no join URL means no location field, and never a raw Jitsi room', async () => {
      const harness = createGraphHarness()
      await createGraphEvent(
        {
          bookingId: BOOKING_ID,
          email: 'a@b.com',
          date: '2027-03-01',
          startTime: '10:00',
          hours: 1,
          joinUrl: 'https://meet.jit.si/rexi-not-a-room',
          timezone: 'Europe/Madrid',
        },
        { fetchImpl: harness.fetchImpl }
      )
      expect(harness.events[0]!.location).toBeUndefined()
    })
  })
})
