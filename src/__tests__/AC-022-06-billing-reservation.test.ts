// AC-022-06-04 — characterization of scripts/recording/billing.mjs
// reservationFields, reached through its exported caller findReservationByRoom
// (injected fetch, no Stripe).
import { describe, expect, it } from 'vitest'

import { findReservationByRoom } from '../../scripts/recording/billing.mjs'

const ROOM = 'rexi-0123456789abcdef'
const JOIN = `https://meet.example/${ROOM}`

type Session = {
  id: string
  customer_email?: string
  metadata?: Record<string, string>
}

async function lookup(session: Session) {
  const fetch = async () => ({ ok: true, json: async () => ({ data: [session], has_more: false }) })
  return findReservationByRoom({
    room: ROOM,
    env: { STRIPE_SECRET_KEY: 'sk_test_x' },
    fetch: fetch as unknown as typeof globalThis.fetch,
  })
}

describe('AC-022-06-04: reservationFields branches are pinned', () => {
  it('AC-022-06-04: every metadata field present', async () => {
    expect(
      await lookup({
        id: 'cs_1',
        customer_email: 'stripe@example.com',
        metadata: {
          join_url: JOIN,
          quoted_hours: '2',
          email: 'meta@example.com',
          name: 'Ana',
          date: '2026-09-20',
        },
      })
    ).toEqual({
      bookingId: 'cs_1',
      email: 'meta@example.com',
      name: 'Ana',
      date: '2026-09-20',
      quotedHours: 2,
      joinUrl: JOIN,
    })
  })

  it('AC-022-06-04: email falls back to the session customer_email, then to empty', async () => {
    const base = { join_url: JOIN, quoted_hours: '1' }
    expect(
      (await lookup({ id: 'a', customer_email: 'c@example.com', metadata: base }))?.email
    ).toBe('c@example.com')
    expect((await lookup({ id: 'b', metadata: base }))?.email).toBe('')
  })

  it('AC-022-06-04: absent name/date degrade to empty strings', async () => {
    const found = await lookup({ id: 'c', metadata: { join_url: JOIN, quoted_hours: '1' } })
    expect(found?.name).toBe('')
    expect(found?.date).toBe('')
  })

  it('AC-022-06-04: reservation=1 without quoted_hours gives quotedHours 0', async () => {
    const found = await lookup({ id: 'd', metadata: { join_url: JOIN, reservation: '1' } })
    expect(found).toEqual({
      bookingId: 'd',
      email: '',
      name: '',
      date: '',
      quotedHours: 0,
      joinUrl: JOIN,
    })
  })

  it('AC-022-06-04: a non-numeric quoted_hours parses to NaN', async () => {
    const found = await lookup({ id: 'e', metadata: { join_url: JOIN, quoted_hours: 'abc' } })
    expect(Number.isNaN(found?.quotedHours)).toBe(true)
  })

  it('AC-022-06-04: sessions that are not a reservation for the room are skipped', async () => {
    expect(await lookup({ id: 'f', metadata: { join_url: JOIN } })).toBeNull()
    expect(
      await lookup({ id: 'g', metadata: { join_url: 'https://x/other', quoted_hours: '1' } })
    ).toBeNull()
    expect(await lookup({ id: 'h' })).toBeNull()
  })
})
