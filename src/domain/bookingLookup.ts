import Stripe from 'stripe'

import { getStripe } from './stripeClient.js'

/**
 * Reservation lookup, used to bound what recorded billing is allowed to charge.
 *
 * WHY stripe.checkout.sessions.retrieve IS THE RIGHT MECHANISM: the bookingId
 * the operator submits to /api/bookings/recorded-billing is the reservation's
 * Stripe Checkout Session id. api/bookings/checkout.ts creates that session
 * with metadata { quoted_hours, date, start_time, join_url, reservation:'1' },
 * and api/stripe-webhook.ts derives its bookingId as `session.id` for the
 * standard path (getRawBookingFields) — so the id round-trips and a direct
 * retrieve resolves it. No Stripe metadata *search* is needed; that would only
 * be required if bookingId were an opaque id of our own, which it is not.
 */

export interface Reservation {
  quotedHours: number
  date: string
  startTime: string
  joinUrl: string | null
  email: string
}

function metaOf(session: Stripe.Checkout.Session): Record<string, string> {
  return (session.metadata as Record<string, string> | undefined) ?? {}
}

function parseQuotedHours(meta: Record<string, string>): number | null {
  const raw = meta['quoted_hours'] ?? meta['hours']
  if (!raw) return null
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

function metaString(meta: Record<string, string>, key: string): string {
  const v = meta[key]
  return v ? v : ''
}

function toReservation(session: Stripe.Checkout.Session): Reservation | null {
  const meta = metaOf(session)
  const quotedHours = parseQuotedHours(meta)
  // A session without quoted hours is not a reservation we issued (or is a
  // recorded-billing session). Refuse rather than bill against an unknown shape.
  if (quotedHours === null) return null
  const joinUrl = metaString(meta, 'join_url')
  return {
    quotedHours,
    date: metaString(meta, 'date'),
    startTime: metaString(meta, 'start_time'),
    joinUrl: joinUrl ? joinUrl : null,
    email: metaString(meta, 'email') || (session.customer_email ?? ''),
  }
}

/**
 * The reservation behind a bookingId, or null when it cannot be resolved.
 *
 * A Stripe outage is indistinguishable here from "no such session", and both
 * must stop the charge: the caller turns null into a refusal, never into a
 * bill. That is the safe direction for a money-moving endpoint.
 */
export async function findReservation(
  bookingId: string,
  client?: Stripe
): Promise<Reservation | null> {
  const stripe = client ?? getStripe()
  try {
    const session = await stripe.checkout.sessions.retrieve(bookingId)
    if (!session) return null
    return toReservation(session as Stripe.Checkout.Session)
  } catch {
    return null
  }
}
