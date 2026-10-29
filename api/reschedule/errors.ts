// The error envelope for /api/reschedule, in one place (spec 007 Task 5).
//
// The page branches on the CODE, never on the status, so the code → status →
// message table IS the endpoint's error contract. Both halves answer through this
// module so one code can never come to mean two different things, and so the
// envelope shape has one reason to change.
import type { RescheduleErrorCode } from '../../src/domain/reschedule.js'
import type { ApiResponse } from '../httpTypes.js'

const STATUS: Record<RescheduleErrorCode, number> = {
  INVALID_RESCHEDULE_TOKEN: 404,
  PAST_DATE: 400,
  SLOT_UNAVAILABLE: 400,
  SLOT_CONFLICT: 409,
  RESCHEDULE_LIMIT: 409,
}

const MESSAGE: Record<RescheduleErrorCode, string> = {
  INVALID_RESCHEDULE_TOKEN: 'This reschedule link is no longer valid',
  PAST_DATE: 'The requested date is in the past',
  SLOT_UNAVAILABLE: 'That slot is not available',
  SLOT_CONFLICT: 'That slot is already booked',
  RESCHEDULE_LIMIT: 'This meeting has reached its reschedule limit',
}

/** Any refusal, with its mapped status and message. */
export function reject(res: ApiResponse, code: RescheduleErrorCode): void {
  res.status(STATUS[code]).json({ error: { code, message: MESSAGE[code] } })
}

/**
 * One refusal for a wrong, a rotated, and an expired token (AC-007-25): the
 * client is never told which, because "this one was used already" tells whoever
 * forwarded the link that it exists. A named entry point because these three
 * cases are one answer, and a call site should not have to repeat the code to
 * say so.
 */
export function rejectInvalidToken(res: ApiResponse): void {
  reject(res, 'INVALID_RESCHEDULE_TOKEN')
}

/**
 * A calendar that cannot be read is not a dead link: answer 502 so the page shows
 * its recoverable load-failed state instead of a dead end.
 */
export function failCalendar(res: ApiResponse, message: string): void {
  res.status(502).json({ error: { code: 'CALENDAR_ERROR', message } })
}
