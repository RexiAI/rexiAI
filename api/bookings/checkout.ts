import { isFreeHourAvailable } from '../../src/domain/freeHour.js'
import { priceCents, PRODUCT_TAX_CODE } from '../../src/domain/pricing.js'
import { getStripe } from '../../src/domain/stripeClient.js'
import { errorText } from '../errorText.js'
import type { ApiRequest, ApiResponse } from '../httpTypes.js'
import type { BookingRequestFields } from './types.js'
async function getFreeAvailable(email: string, res: ApiResponse): Promise<boolean | null> {
  try {
    return await isFreeHourAvailable(email)
  } catch (e) {
    res.status(500).json({ error: { code: 'STRIPE_ERROR', message: errorText(e) } })
    return null
  }
}

function getBaseUrl(req: ApiRequest): string {
  const host = req.headers?.host
  const h = host ? host : 'example.com'
  const protocol = req.headers?.['x-forwarded-proto']
  const p = protocol ? protocol : 'https'
  return `${p}://${h}`
}

// The booking facts are declared once, in ./types.ts; this path adds only what the
// checkout round trip itself needs.
type SessionOpts = BookingRequestFields & {
  freeAvailable: boolean
  req: ApiRequest
  res: ApiResponse
  joinUrl?: string | null
}

// The booking is a €0 reservation: nothing is captured here and the free hour is
// NOT burned. The single charge happens after the meeting is recorded, via
// POST /api/bookings/recorded-billing (pro-rata per minute).
const RESERVATION_UNIT_AMOUNT = 0

function buildSessionParams(opts: SessionOpts, baseUrl: string) {
  const metadata: Record<string, string> = {
    // The customer's name: required at the API boundary, carried through the
    // Stripe round trip so the webhook email and the recording processor can use
    // it without a second source of truth (spec 008).
    name: opts.name,
    email: opts.email,
    date: opts.date,
    start_time: opts.startTime,
    hours: String(opts.hours),
    quoted_hours: String(opts.hours),
    reservation: '1',
    free_hour_applied: String(opts.freeAvailable),
  }
  if (opts.joinUrl) metadata['join_url'] = opts.joinUrl
  // Additive key (spec 006 Task 8): present only when the booking carried a locale,
  // so a locale-less booking's metadata stays byte-identical to before.
  if (opts.locale) metadata['locale'] = opts.locale
  // Managed Payments is disabled: RexiAI is live 1-1 coaching, which Stripe
  // categorically excludes from Managed Payments (professional services / human
  // intervention are unsupported categories). On an account where Managed
  // Payments is on by default, session creation fails without this. EU VAT is
  // then the merchant's concern via Stripe Tax — see PRODUCT_TAX_CODE in pricing.ts.
  // prettier-ignore
  return { mode: 'payment' as const, managed_payments: { enabled: false }, automatic_tax: { enabled: true }, currency: 'eur' as const, line_items: [{ price_data: { currency: 'eur' as const, product_data: { name: `Booking ${opts.date} ${opts.startTime} (${opts.hours}h)`, tax_code: PRODUCT_TAX_CODE }, unit_amount: RESERVATION_UNIT_AMOUNT }, quantity: 1 as const }], customer_email: opts.email, metadata, success_url: `${baseUrl}/booking/success`, cancel_url: `${baseUrl}/booking/cancel` }
}

async function createSession(opts: SessionOpts) {
  try {
    const stripe = getStripe()
    const baseUrl = getBaseUrl(opts.req)
    const params = buildSessionParams(opts, baseUrl)
    return await stripe.checkout.sessions.create(params)
  } catch (e) {
    opts.res.status(500).json({ error: { code: 'STRIPE_ERROR', message: errorText(e) } })
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
function isValidDuration(hours: number, freeAvailable: boolean, res: ApiResponse): boolean {
  const priceRes = priceCents(hours, freeAvailable)
  if (priceRes.ok) return true
  res.status(400).json({ error: { code: 'INVALID_DURATION', message: priceRes.error.message } })
  return false
}

export type CreateCheckoutInput = BookingRequestFields & {
  req: ApiRequest
  res: ApiResponse
  joinUrl?: string | null
}

export async function createCheckout(input: CreateCheckoutInput) {
  const { name, email, date, startTime, hours, req, res } = input
  const freeAvailable = await getFreeAvailable(email, res)
  if (freeAvailable === null) return null
  if (!isValidDuration(hours, freeAvailable, res)) return null
  return createSession({
    name,
    email,
    date,
    startTime,
    hours,
    freeAvailable,
    req,
    res,
    joinUrl: normalizeJoinUrl(input.joinUrl),
    ...(input.locale ? { locale: input.locale } : {}),
  })
}
