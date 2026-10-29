// The POST half of /api/reschedule (spec 007 Task 5): validate, move, notify.
//
// Failure policy is decision D5, and it is the most important behaviour here:
//   - the move stands no matter what the two emails do;
//   - an OPERATOR notification failure answers 5xx (never a silent success) —
//     a moved meeting nobody was told about must be visible;
//   - a CLIENT confirmation failure is logged and the answer stays 200;
//   - no compensating action is attempted in either case.
import {
  loadAvailabilityConfig,
  isPastDate,
  isSlotBookable,
} from '../../src/domain/availability.js'
import {
  findOverlappingBookingId,
  moveCalendarEvent,
  type BookingRescheduleState,
} from '../../src/domain/calendar.js'
import {
  sendLimitBlockedOperatorEmail,
  sendRescheduleClientEmail,
  sendRescheduleOperatorEmail,
} from '../../src/domain/email.js'
import {
  validateReschedule,
  type RescheduleErrorCode,
  type RescheduleValidation,
} from '../../src/domain/reschedule.js'
import {
  generateRescheduleToken,
  isValidRescheduleToken,
} from '../../src/domain/rescheduleToken.js'
import { getConfiguredTimezone } from '../../src/domain/time.js'
import { errorText } from '../errorText.js'
import type { ApiRequest, ApiResponse } from '../httpTypes.js'

import { loadBooking } from './booking.js'
import { failCalendar, reject, rejectInvalidToken } from './errors.js'

interface SubmitTarget {
  token: string
  date: string
  startTime: string
}

function textField(body: Record<string, unknown>, key: string): string {
  const value = body[key]
  return typeof value === 'string' ? value : ''
}

function readTarget(req: ApiRequest): SubmitTarget | null {
  const body = (req.body ?? {}) as Record<string, unknown>
  const token = body['token']
  const date = textField(body, 'date')
  const startTime = textField(body, 'startTime')
  // A malformed candidate is refused before ANY calendar read (AC-007-03/25):
  // a truncated or pasted link must not cost a Graph request.
  if (!isValidRescheduleToken(token) || !date || !startTime) return null
  return { token, date, startTime }
}

/** Everything Task 4's validation needs, wired to the live calendar and config. */
function rescheduleDeps() {
  const config = loadAvailabilityConfig()
  return {
    now: new Date(),
    timezone: config.timezone,
    isPastDate,
    isSlotAvailable: (date: string, startTime: string, hours: number) =>
      isSlotBookable(config, date, startTime, hours),
    findOverlappingBookingId,
  }
}

/**
 * The "a human should notice" backstop (AC-007-33). Best effort on purpose: the
 * client already has its refusal, and turning a mail failure into a 5xx would
 * show the page's "we could not confirm" state for a change that never happened.
 */
async function notifyLimitBlocked(
  booking: BookingRescheduleState,
  target: SubmitTarget
): Promise<void> {
  try {
    await sendLimitBlockedOperatorEmail({
      clientEmail: booking.email,
      bookingId: booking.bookingId,
      date: booking.date,
      startTime: booking.startTime,
      count: booking.count,
      requestedDate: target.date,
      requestedStartTime: target.startTime,
    })
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`[reschedule] limit-blocked operator email failed: ${errorText(e)}`)
  }
}

/**
 * The operator mail is on the critical path: its failure is a 5xx (D5). It takes
 * no token: the token is a client-only capability (AC-007-38), so the operator
 * notice has nothing to do with it.
 */
async function notifyOperator(
  booking: BookingRescheduleState,
  target: SubmitTarget
): Promise<boolean> {
  try {
    await sendRescheduleOperatorEmail({
      clientEmail: booking.email,
      oldDate: booking.date,
      oldStartTime: booking.startTime,
      date: target.date,
      startTime: target.startTime,
      hours: booking.hours,
      bookingId: booking.bookingId,
      joinUrl: booking.joinUrl,
      count: booking.count + 1,
    })
    return true
  } catch (e) {
    // The move stands (decision D5): no rollback, no compensation, just a loud
    // failure the alert path can see.
    // eslint-disable-next-line no-console
    console.error(`[reschedule] operator notification failed: ${errorText(e)}`)
    return false
  }
}

/** The client mail is best effort: logged, never a rollback (decision D5). */
async function notifyClient(
  booking: BookingRescheduleState,
  target: SubmitTarget,
  newToken: string
): Promise<void> {
  try {
    await sendRescheduleClientEmail({
      clientEmail: booking.email,
      ...movedSlot(booking, target),
      locale: booking.locale,
      rescheduleToken: newToken,
    })
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`[reschedule] client confirmation email failed: ${errorText(e)}`)
  }
}

/** Refuses, and tells the operator, when the limit is what stopped the move. */
async function refuse(
  res: ApiResponse,
  code: RescheduleErrorCode,
  booking: BookingRescheduleState,
  target: SubmitTarget
): Promise<void> {
  if (code === 'RESCHEDULE_LIMIT') await notifyLimitBlocked(booking, target)
  reject(res, code)
}

/**
 * Where the meeting sits after this move: the one shape the calendar write, the
 * client mail and the response body all describe. The join URL is the booking's
 * PRE-EXISTING room, byte-identical to before the move: the room never rotates
 * (AC-007-24).
 */
function movedSlot(
  booking: BookingRescheduleState,
  target: SubmitTarget
): { date: string; startTime: string; hours: number; joinUrl: string | null } {
  return {
    date: target.date,
    startTime: target.startTime,
    hours: booking.hours,
    joinUrl: booking.joinUrl,
  }
}

async function moveOrFail(
  res: ApiResponse,
  booking: BookingRescheduleState,
  target: SubmitTarget,
  count: number
): Promise<{ newToken: string } | null> {
  const newToken = generateRescheduleToken()
  try {
    await moveCalendarEvent({
      bookingId: booking.bookingId,
      timezone: getConfiguredTimezone(),
      ...movedSlot(booking, target),
      email: booking.email,
      locale: booking.locale,
      rescheduleToken: newToken,
      rescheduleCount: count,
    })
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`[reschedule] calendar move failed: ${errorText(e)}`)
    res.status(500).json({ error: { code: 'GCAL_ERROR', message: 'Could not move the meeting' } })
    return null
  }
  return { newToken }
}

/** Move, then notify in the order decision D5 pins: operator first, client last. */
async function completeMove(
  res: ApiResponse,
  booking: BookingRescheduleState,
  target: SubmitTarget,
  count: number
): Promise<void> {
  const moved = await moveOrFail(res, booking, target, count)
  if (!moved) return
  if (!(await notifyOperator(booking, target))) {
    res.status(502).json({
      error: {
        code: 'EMAIL_ERROR',
        message: 'The meeting moved but the operator was not notified',
      },
    })
    return
  }
  await notifyClient(booking, target, moved.newToken)
  res.status(200).json(movedSlot(booking, target))
}

/**
 * Validation reads the live calendar and the availability config, so it can
 * fail for reasons that are neither the client's fault nor a dead link: a 502
 * keeps that honest instead of surfacing an unhandled rejection as a 5xx the
 * page would read as "your change may have landed".
 */
async function validateOrFail(
  res: ApiResponse,
  booking: BookingRescheduleState,
  target: SubmitTarget
): Promise<RescheduleValidation | null> {
  try {
    return await validateReschedule(booking, target, rescheduleDeps())
  } catch {
    failCalendar(res, 'Could not check the calendar')
    return null
  }
}

async function runReschedule(
  res: ApiResponse,
  booking: BookingRescheduleState,
  target: SubmitTarget
): Promise<void> {
  const validation = await validateOrFail(res, booking, target)
  if (!validation) return
  if (!validation.ok) return refuse(res, validation.code, booking, target)
  await completeMove(res, booking, target, validation.count)
}

export async function submitReschedule(req: ApiRequest, res: ApiResponse): Promise<void> {
  const target = readTarget(req)
  if (!target) return rejectInvalidToken(res)

  const lookup = await loadBooking(target.token, res)
  if (!lookup) return
  if (!lookup.booking) return rejectInvalidToken(res)

  await runReschedule(res, lookup.booking, target)
}
