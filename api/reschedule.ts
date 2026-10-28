// Reschedule endpoint (spec 007 Task 5): one path, two operations.
//
//   GET  /api/reschedule?token=<t>            resolve the current slot
//   POST /api/reschedule { token, date, startTime }  move it
//
// Billing-agnostic by construction: the booking is read from the calendar event
// (see src/domain/calendar.ts), never from Stripe, which is what makes the
// billing-disabled path behave identically (AC-007-28).
import type { ApiRequest, ApiResponse } from './httpTypes.js'
import { resolveReschedule } from './reschedule/resolve.js'
import { submitReschedule } from './reschedule/submit.js'
import { enforceRateLimit, requireMethod } from './routeGuards.js'

const ALLOWED_METHODS = ['GET', 'POST']

// Own bucket, deliberately: a client hammering the reschedule page must not
// spend the booking endpoint's budget (AC-007-26).
const RATE_LIMIT_BUCKET = 'reschedule'

/**
 * The booking state is per-request and token-scoped, so nothing here may be
 * cached by a proxy (15-design Task 5 watch item).
 */
function noStore(res: ApiResponse): void {
  res.setHeader?.('Cache-Control', 'no-store')
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (!requireMethod(req, res, ALLOWED_METHODS)) return
  if (!enforceRateLimit(req, res, RATE_LIMIT_BUCKET)) return
  noStore(res)
  if (req.method === 'GET') return resolveReschedule(req, res)
  return submitReschedule(req, res)
}
