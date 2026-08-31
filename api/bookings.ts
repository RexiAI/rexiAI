import { createTeamsMeeting } from '../src/domain/teams.js'

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

async function resolveTeamsJoinUrl(input: {
  date: string
  startTime: string
  hours: number
  email: string
}): Promise<string | null> {
  try {
    return await createTeamsMeeting({
      date: input.date,
      startTime: input.startTime,
      hours: input.hours,
      subject: `RexiAI booking ${input.email} ${input.date} ${input.startTime}`,
    })
  } catch {
    return null
  }
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

function toOptionalJoinUrl(joinUrl: string | null): string | undefined {
  if (joinUrl) return joinUrl
  return undefined
}

function buildBookingResponse(checkout: { url: string | null }, joinUrl: string | null) {
  return { checkoutUrl: checkout.url, joinUrl: toOptionalJoinUrl(joinUrl) }
}

export default async function handler(req: any, res: any) {
  if (!isPostMethod(req, res)) return
  const input = prepareBookingInput(req, res)
  if (!input) return
  if (await checkSlotConflict(input, res)) return
  const joinUrl = await resolveTeamsJoinUrl(input)
  const checkout = await createCheckout(
    input.email,
    input.date,
    input.startTime,
    input.hours,
    req,
    res,
    joinUrl
  )
  if (!checkout) return
  return res.status(200).json(buildBookingResponse(checkout, joinUrl))
}
