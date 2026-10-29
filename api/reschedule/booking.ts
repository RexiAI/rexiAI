// Reading the booking behind a token, for both halves of /api/reschedule
// (spec 007 Task 5).
//
// The distinction this module exists to keep: a calendar that cannot be READ is
// an outage (502, the page's recoverable load-failed state), while a token that
// resolves to no booking is a dead link (404, the page's invalid state). The GET
// and the POST must answer both identically, so the mapping lives once.
import {
  findBookingByRescheduleToken,
  type BookingRescheduleState,
} from '../../src/domain/calendar.js'
import type { ApiResponse } from '../httpTypes.js'

import { failCalendar } from './errors.js'

/** `{ booking: null }` when the token is dead; null when the calendar itself failed. */
export async function loadBooking(
  token: string,
  res: ApiResponse
): Promise<{ booking: BookingRescheduleState | null } | null> {
  try {
    return { booking: await findBookingByRescheduleToken(token) }
  } catch {
    // Nothing has been written: 502, so an outage never looks like a dead link.
    failCalendar(res, 'Could not load this booking')
    return null
  }
}
