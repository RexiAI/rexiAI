import { hasConflict } from './bookings/calendar.js'
import { createCheckout } from './bookings/checkout.js'
import { prepareBookingInput } from './bookings/validation.js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res
      .status(405)
      .json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } })
  }
  const input = prepareBookingInput(req, res)
  if (!input) return
  if (await hasConflict(input.date, input.startTime, input.hours)) {
    return res
      .status(409)
      .json({ error: { code: 'SLOT_CONFLICT', message: 'Slot already booked' } })
  }
  const checkout = await createCheckout(
    input.email,
    input.date,
    input.startTime,
    input.hours,
    req,
    res
  )
  if (!checkout) return
  return res.status(200).json({ checkoutUrl: checkout.url })
}
