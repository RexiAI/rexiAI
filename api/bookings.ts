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

export default async function handler(req: any, res: any) {
  if (!isPostMethod(req, res)) return
  const input = prepareBookingInput(req, res)
  if (!input) return
  if (await checkSlotConflict(input, res)) return
  const meeting = await resolveTeamsMeeting(input)
  if (rejectOnTeamsError(meeting, res)) return
  const checkout = await createCheckout(
    input.email,
    input.date,
    input.startTime,
    input.hours,
    req,
    res,
    toOptionalJoinUrl(meeting)
  )
  if (!checkout) return
  return res.status(200).json(buildBookingResponse(checkout, meeting))
}
