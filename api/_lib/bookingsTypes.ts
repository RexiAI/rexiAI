// api/bookings/types.ts — the booking facts that cross the booking-request
// boundary, in one place.
//
// Three request paths used to declare this shape independently (`BookingInput` in
// api/bookings.ts, `DirectBookingInput` in direct.ts, and the checkout/session
// options) and spec 008 had to add `name` to all of them. They are not merely
// similar: a new booking fact has to reach every path, so they share one reason
// to change. Each path keeps its own extras by intersection rather than by
// restating the core.
import type { Locale } from '../../src/domain/locale.js'

export type BookingRequestFields = {
  /** The customer's name: emailed to the operator, carried through the Stripe
   *  round trip, and — for a recorded session — the recording folder key. */
  name: string
  email: string
  date: string
  startTime: string
  hours: number
  /** The booking's locale; selects the client consent notice (spec 006 Task 8). */
  locale?: Locale
}
