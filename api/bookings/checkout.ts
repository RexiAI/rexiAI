import { isFreeHourAvailable } from '../../src/domain/freeHour.js'
import { priceCents } from '../../src/domain/pricing.js'
import { getStripe } from '../../src/domain/stripeClient.js'

import { errMsg } from './config.js'

async function getFreeAvailable(email: string, res: any): Promise<boolean | null> {
  try {
    return await isFreeHourAvailable(email)
  } catch (e) {
    res.status(500).json({ error: { code: 'STRIPE_ERROR', message: errMsg(e) } })
    return null
  }
}

function getBaseUrl(req: any): string {
  const host = req.headers?.host
  const h = host ? host : 'example.com'
  const protocol = req.headers?.['x-forwarded-proto']
  const p = protocol ? protocol : 'https'
  return `${p}://${h}`
}

type SessionOpts = {
  email: string
  date: string
  startTime: string
  hours: number
  freeAvailable: boolean
  req: any
  res: any
  joinUrl?: string | null
}

// The booking is a €0 reservation: nothing is captured here and the free hour is
// NOT burned. The single charge happens after the meeting is recorded, via
// POST /api/bookings/recorded-billing (pro-rata per minute).
const RESERVATION_UNIT_AMOUNT = 0

function buildSessionParams(opts: SessionOpts, baseUrl: string) {
  const metadata: Record<string, string> = {
    email: opts.email,
    date: opts.date,
    start_time: opts.startTime,
    hours: String(opts.hours),
    quoted_hours: String(opts.hours),
    reservation: '1',
    free_hour_applied: String(opts.freeAvailable),
  }
  if (opts.joinUrl) metadata['join_url'] = opts.joinUrl
  // prettier-ignore
  return { mode: 'payment' as const, currency: 'eur' as const, line_items: [{ price_data: { currency: 'eur' as const, product_data: { name: `Booking ${opts.date} ${opts.startTime} (${opts.hours}h)` }, unit_amount: RESERVATION_UNIT_AMOUNT }, quantity: 1 as const }], customer_email: opts.email, metadata, success_url: `${baseUrl}/booking/success`, cancel_url: `${baseUrl}/booking/cancel` }
}

async function createSession(opts: SessionOpts) {
  try {
    const stripe = getStripe()
    const baseUrl = getBaseUrl(opts.req)
    const params = buildSessionParams(opts, baseUrl)
    return await stripe.checkout.sessions.create(params)
  } catch (e) {
    opts.res.status(500).json({ error: { code: 'STRIPE_ERROR', message: errMsg(e) } })
    return null
  }
}

function normalizeJoinUrl(joinUrl?: string | null): string | null {
  if (joinUrl) return joinUrl
  return null
}

// priceCents is still the duration validator for the booking form: an invalid
// duration must be rejected before any Stripe call. Its cents value is the legacy
// fixed-hours quote, used for estimate/display only — never the captured amount.
function isValidDuration(hours: number, freeAvailable: boolean, res: any): boolean {
  const priceRes = priceCents(hours, freeAvailable)
  if (priceRes.ok) return true
  res.status(400).json({ error: { code: 'INVALID_DURATION', message: priceRes.error.message } })
  return false
}

export async function createCheckout(
  email: string,
  date: string,
  startTime: string,
  hours: number,
  req: any,
  res: any,
  joinUrl?: string | null
) {
  const freeAvailable = await getFreeAvailable(email, res)
  if (freeAvailable === null) return null
  if (!isValidDuration(hours, freeAvailable, res)) return null
  return createSession({
    email,
    date,
    startTime,
    hours,
    freeAvailable,
    req,
    res,
    joinUrl: normalizeJoinUrl(joinUrl),
  })
}
