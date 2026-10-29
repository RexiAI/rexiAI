// AC-008 Task 7 — the recording pipeline resolves the customer name and the
// meeting date from the Stripe reservation.
// Acceptance tests per
// specs/008-customer-name-and-recording-folders/20-acceptance/AC-008-recording-resolve-name.md
//
// Both seams are injected (fetch, no real Stripe) so this stays a unit test of the
// attribution contract: room -> reservation -> { name, date, email, ... }.
import { describe, expect, it } from 'vitest'

import { findReservationByRoom } from '../../scripts/recording/billing.mjs'
import { insightContext } from '../../scripts/recording/pipeline.mjs'

import { makeFetch } from './recording-harness.ts'

const ROOM = 'rexi-abc'
const MP4 = `/recordings/${ROOM}_2026-10-28-10-00-00.mp4`

function session(metadata: Record<string, string>) {
  return { id: 'cs_test_1', customer_email: 'ana@example.com', metadata }
}

function reservationFetch(metadata: Record<string, string>) {
  return makeFetch(() => ({ status: 200, body: { data: [session(metadata)], has_more: false } }))
}

const MATCHING = {
  join_url: `https://meet.example/${ROOM}`,
  quoted_hours: '1',
  email: 'ana@example.com',
}

describe('AC-008 recording attribution', () => {
  it('AC-008-15: the reservation name and date are resolved into the session context', async () => {
    const { fetch } = reservationFetch({ ...MATCHING, name: 'Ana López', date: '2026-10-28' })

    const attribution = await findReservationByRoom({
      room: ROOM,
      env: { STRIPE_SECRET_KEY: 'sk_test_x' },
      fetch,
    })
    if (!attribution) throw new Error('expected the room to resolve to a reservation')

    expect(attribution.name).toBe('Ana López')
    expect(attribution.date).toBe('2026-10-28')

    const context = insightContext({ room: ROOM, mp4s: [MP4], target: MP4, attribution })
    expect(context.clientName).toBe('Ana López')
    // The pre-existing attribution fields still ride along untouched.
    expect(context.clientEmail).toBe('ana@example.com')
    expect(context.bookingId).toBe('cs_test_1')
  })

  it('AC-008-16: a missing reservation name does not break attribution', async () => {
    const { fetch } = reservationFetch({ ...MATCHING, date: '2026-10-28' })

    const attribution = await findReservationByRoom({
      room: ROOM,
      env: { STRIPE_SECRET_KEY: 'sk_test_x' },
      fetch,
    })
    if (!attribution) throw new Error('expected the room to resolve to a reservation')

    expect(attribution.name ?? '').toBe('')
    expect(attribution.email).toBe('ana@example.com')
    expect(attribution.quotedHours).toBe(1)

    const context = insightContext({ room: ROOM, mp4s: [MP4], target: MP4, attribution })
    expect(context.clientName ?? '').toBe('')
    expect(context.unattributed).toBe(false)
  })
})
