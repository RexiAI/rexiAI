import { checkRateLimit, getClientIp } from '../src/domain/rateLimit.js'
import { createTeamsMeeting, type TeamsMeetingResult } from '../src/domain/teams.js'

import { hasConflict } from './bookings/calendar.js'
import { createCheckout } from './bookings/checkout.js'
import { prepareBookingInput } from './bookings/validation.js'

function isPostMethod(req: any, res: any): boolean {
  if (req.method !== 'POST') {
    res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } })
    return false
  }
  return true
}

// Runs before validation and before any Stripe or Graph call, so a spam burst
// costs nothing downstream. Best-effort only — see src/domain/rateLimit.ts.
function enforceRateLimit(req: any, res: any): boolean {
  const result = checkRateLimit(`bookings:${getClientIp(req)}`)
  if (result.allowed) return true
  res.setHeader?.('Retry-After', String(result.retryAfterSeconds))
  res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many requests' } })
  return false
}

type BookingInput = { email: string; date: string; startTime: string; hours: number }

async function resolveTeamsMeeting(input: {
  date: string
  startTime: string
  hours: number
  email: string
}): Promise<TeamsMeetingResult> {
  return createTeamsMeeting({
    date: input.date,
    startTime: input.startTime,
    hours: input.hours,
    subject: `RexiAI booking ${input.email} ${input.date} ${input.startTime}`,
  })
}

// A Teams failure must abort before the Stripe session is created, otherwise the
// client holds a reservation for a meeting that has no room to join.
function rejectOnTeamsError(meeting: TeamsMeetingResult, res: any): boolean {
  if (meeting.status !== 'error') return false
  res.status(502).json({
    error: {
      code: 'TEAMS_ERROR',
      message: 'Could not create the Teams meeting; booking not made',
    },
  })
  return true
}

async function checkSlotConflict(
  input: { date: string; startTime: string; hours: number },
  res: any
): Promise<boolean> {
  if (await hasConflict(input.date, input.startTime, input.hours)) {
    res.status(409).json({ error: { code: 'SLOT_CONFLICT', message: 'Slot already booked' } })
    return true
  }
  return false
}

function toOptionalJoinUrl(meeting: TeamsMeetingResult): string | undefined {
  if (meeting.status === 'ok') return meeting.joinUrl
  return undefined
}

function buildBookingResponse(checkout: { url: string | null }, meeting: TeamsMeetingResult) {
  return { checkoutUrl: checkout.url, joinUrl: toOptionalJoinUrl(meeting) }
}

/** Method, rate limit, field validation and the first slot probe. */
async function runPreflight(req: any, res: any) {
  if (!isPostMethod(req, res)) return null
  if (!enforceRateLimit(req, res)) return null
  const input = prepareBookingInput(req, res)
  if (!input) return null
  if (await checkSlotConflict(input, res)) return null
  return input
}

function reserve(input: BookingInput, meeting: TeamsMeetingResult, req: any, res: any) {
  return createCheckout(
    input.email,
    input.date,
    input.startTime,
    input.hours,
    req,
    res,
    toOptionalJoinUrl(meeting)
  )
}

/**
 * The second slot probe is deliberately AFTER the Teams round trip. Creating the
 * meeting is the slow step, and it is exactly the window in which a competing
 * booking lands. Re-checking there narrows check-then-act from "seconds" to "one
 * Stripe call" — it does NOT eliminate it. Without a transactional slot store two
 * requests can still interleave between that probe and sessions.create; the
 * webhook's overlap detection is the backstop that makes the case visible.
 */
export default async function handler(req: any, res: any) {
  const input = await runPreflight(req, res)
  if (!input) return
  const meeting = await resolveTeamsMeeting(input)
  if (rejectOnTeamsError(meeting, res)) return
  if (await checkSlotConflict(input, res)) return
  const checkout = await reserve(input, meeting, req, res)
  if (!checkout) return
  return res.status(200).json(buildBookingResponse(checkout, meeting))
}
