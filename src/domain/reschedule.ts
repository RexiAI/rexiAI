// Reschedule validation (spec 007 Task 4). Pure, typed, and free of I/O of its
// own: the caller injects the clock, the availability rules and the live
// conflict probe, so every refusal is testable without a calendar or a config
// file. It NEVER throws for an expected refusal — the API layer only maps codes.
import type { BookingRescheduleState, SlotInput } from './calendar.js'
import { zonedToUtc } from './time.js'

/**
 * How many times a client may move their own booking from the reschedule page
 * (10-tasks.md decision 4). Every later attempt is refused AND surfaced to the
 * operator, which turns "at some point a human should notice" into a bound.
 */
export const MAX_RESCHEDULES = 3

export type RescheduleErrorCode =
  | 'INVALID_RESCHEDULE_TOKEN'
  | 'PAST_DATE'
  | 'SLOT_UNAVAILABLE'
  | 'SLOT_CONFLICT'
  | 'RESCHEDULE_LIMIT'

export interface RescheduleTarget {
  date: string
  startTime: string
}

export interface RescheduleDeps {
  /** The moment the submit is evaluated. */
  now: Date
  /** The deployment timezone; the meeting start is read in it. */
  timezone: string
  /** True when the date is before today in the deployment timezone. */
  isPastDate: (date: string) => boolean
  /** True when the slot sits inside an availability window for that date. */
  isSlotAvailable: (date: string, startTime: string, hours: number) => boolean
  /** Live conflict probe; it excludes the booking's own id (see microsoftGraph). */
  findOverlappingBookingId: (input: SlotInput) => Promise<string | null>
}

export type RescheduleValidation =
  { ok: true; count: number } | { ok: false; code: RescheduleErrorCode }

/** A meeting that has started (or is starting now) has nothing left to move. */
function hasStarted(booking: BookingRescheduleState, now: Date, timezone: string): boolean {
  try {
    return zonedToUtc(timezone, booking.date, booking.startTime).getTime() <= now.getTime()
  } catch {
    // An uninterpretable stored start is treated as started: refuse rather than
    // move a meeting whose current slot cannot even be read.
    return true
  }
}

/**
 * Refusals that depend only on the booking itself. Order is deliberate: an
 * expired link reads as an expired link (AC-007-25's single generic failure),
 * and the limit is checked before any slot work so a booking at the limit can
 * never be moved even if the requested slot is valid (AC-007-20).
 */
function checkBooking(
  booking: BookingRescheduleState,
  now: Date,
  timezone: string
): RescheduleErrorCode | null {
  if (hasStarted(booking, now, timezone)) return 'INVALID_RESCHEDULE_TOKEN'
  if (booking.count >= MAX_RESCHEDULES) return 'RESCHEDULE_LIMIT'
  return null
}

/**
 * Refusals that depend on the requested slot. The conflict probe runs against
 * the LIVE calendar at submit time, not against the availability list the client
 * already saw, which is what closes the window between page load and submit
 * (AC-007-17/18).
 */
async function checkTarget(
  booking: BookingRescheduleState,
  target: RescheduleTarget,
  deps: RescheduleDeps
): Promise<RescheduleErrorCode | null> {
  if (deps.isPastDate(target.date)) return 'PAST_DATE'
  if (!deps.isSlotAvailable(target.date, target.startTime, booking.hours)) return 'SLOT_UNAVAILABLE'
  const other = await deps.findOverlappingBookingId({
    bookingId: booking.bookingId,
    date: target.date,
    startTime: target.startTime,
    hours: booking.hours,
  })
  // A probe echoing this booking's own id is not a conflict: a client may move a
  // meeting by an hour into a range that still overlaps where it is now
  // (AC-007-19).
  if (other && other !== booking.bookingId) return 'SLOT_CONFLICT'
  return null
}

/**
 * Validates a reschedule and, on success, returns the count the move must write:
 * the count is read from the event for every submit, so two racing submits both
 * see the live value and the limit cannot be bypassed by interleaving them
 * (10-tasks.md Task 4).
 */
export async function validateReschedule(
  booking: BookingRescheduleState,
  target: RescheduleTarget,
  deps: RescheduleDeps
): Promise<RescheduleValidation> {
  const refused = checkBooking(booking, deps.now, deps.timezone)
  if (refused) return { ok: false, code: refused }
  const targetRefused = await checkTarget(booking, target, deps)
  if (targetRefused) return { ok: false, code: targetRefused }
  return { ok: true, count: booking.count + 1 }
}

/**
 * True when the booking is still below the limit AND its meeting is in the
 * future: the one boolean the resolve response exposes so the page can show the
 * limit state before the client fills the form (decision D2).
 */
export function canReschedule(
  booking: BookingRescheduleState,
  now: Date,
  timezone: string
): boolean {
  return booking.count < MAX_RESCHEDULES && !hasStarted(booking, now, timezone)
}
