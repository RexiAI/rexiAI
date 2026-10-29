// The GET half of /api/reschedule (spec 007 Task 5): resolve a token to the
// booking's CURRENT slot plus one eligibility boolean.
//
// Response shape is pinned by AC-007-22/23 and decision D2: `{ date, startTime,
// hours, canReschedule }` and NOTHING else. No email, no bookingId, no joinUrl,
// no count — the page never learns them, so a screenshot of the page cannot
// identify the booking.
import { canReschedule } from '../../src/domain/reschedule.js'
import { isValidRescheduleToken } from '../../src/domain/rescheduleToken.js'
import { getConfiguredTimezone } from '../../src/domain/time.js'
import type { ApiRequest, ApiResponse } from '../httpTypes.js'

import { loadBooking } from './booking.js'
import { rejectInvalidToken } from './errors.js'

/** The token parameter, or null when absent or malformed (no calendar call). */
export function readToken(req: ApiRequest): string | null {
  const raw = req.query?.['token']
  const token = Array.isArray(raw) ? raw[0] : raw
  return isValidRescheduleToken(token) ? token : null
}

export async function resolveReschedule(req: ApiRequest, res: ApiResponse): Promise<void> {
  const token = readToken(req)
  if (!token) return rejectInvalidToken(res)

  const lookup = await loadBooking(token, res)
  if (!lookup) return
  if (!lookup.booking) return rejectInvalidToken(res)

  const { booking } = lookup
  // An elapsed meeting still RESOLVES; it simply cannot be moved any more, and
  // `canReschedule: false` is what the page renders (AC-007-48).
  res.status(200).json({
    date: booking.date,
    startTime: booking.startTime,
    hours: booking.hours,
    canReschedule: canReschedule(booking, new Date(), getConfiguredTimezone()),
  })
}
