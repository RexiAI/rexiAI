import { timingSafeEqual } from 'crypto'

import { isFreeHourAvailable } from '../../src/domain/freeHour.js'
import { recordedBillingCents, validateActualMinutes } from '../../src/domain/pricing.js'
import { getStripe } from '../../src/domain/stripeClient.js'
import { isValidEmail } from '../../src/domain/validation.js'

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

function equalsConstantTime(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  // timingSafeEqual throws on length mismatch, so the length is compared first.
  // Length is not secret; the byte content is what must not leak via timing.
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

function getBearerToken(req: any): string {
  const header = req.headers?.['authorization']
  if (typeof header !== 'string') return ''
  if (!header.startsWith('Bearer ')) return ''
  return header.slice('Bearer '.length)
}

// Fail closed: this endpoint captures money, so an unconfigured token means the
// endpoint is unavailable, never open. Runs before body parsing and before Stripe.
function isAuthorized(req: any, res: any): boolean {
  const expected = process.env['RECORDED_BILLING_TOKEN']
  if (!expected) {
    res
      .status(503)
      .json({ error: { code: 'NOT_CONFIGURED', message: 'Recorded billing is not configured' } })
    return false
  }
  if (!equalsConstantTime(getBearerToken(req), expected)) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } })
    return false
  }
  return true
}

function getBaseUrl(req: any): string {
  const host = req.headers?.host
  const h = host ? host : 'example.com'
  const protocol = req.headers?.['x-forwarded-proto']
  const p = protocol ? protocol : 'https'
  return `${p}://${h}`
}

function isPostMethod(req: any, res: any): boolean {
  if (req.method !== 'POST') {
    res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } })
    return false
  }
  return true
}

type ParsedRecordedBody = { bookingId: string; email: string; actualMinutes: unknown }

function parseRecordedBillingBody(body: any): ParsedRecordedBody {
  const b = body ?? {}
  const bookingId = typeof b.bookingId === 'string' ? b.bookingId.trim() : ''
  const email = typeof b.email === 'string' ? b.email.trim() : ''
  return { bookingId, email, actualMinutes: b.actualMinutes }
}

function validateRecordedBillingBody(parsed: ParsedRecordedBody, res: any): boolean {
  if (!parsed.bookingId) {
    res
      .status(400)
      .json({ error: { code: 'INVALID_BOOKING_ID', message: 'bookingId is required' } })
    return false
  }
  if (!isValidEmail(parsed.email)) {
    res.status(400).json({ error: { code: 'INVALID_EMAIL', message: 'Invalid email' } })
    return false
  }
  const minutesErr = validateActualMinutes(parsed.actualMinutes)
  if (minutesErr) {
    res.status(400).json({ error: { code: 'INVALID_DURATION', message: minutesErr } })
    return false
  }
  return true
}

async function getFreeHourAvailability(email: string, res: any): Promise<boolean | null> {
  try {
    return await isFreeHourAvailable(email)
  } catch (e) {
    res.status(500).json({ error: { code: 'STRIPE_ERROR', message: errMsg(e) } })
    return null
  }
}

function getFreeMinutes(freeAvailable: boolean): number {
  if (freeAvailable) return 60
  return 0
}

function getBillableMinutes(actualMinutes: number, freeAvailable: boolean): number {
  const free = getFreeMinutes(freeAvailable)
  const diff = actualMinutes - free
  if (diff <= 0) return 0
  return diff
}

function buildRecordedLineItems(
  parsed: ParsedRecordedBody,
  amount: number,
  billableMinutes: number
) {
  return [
    {
      price_data: {
        currency: 'eur' as const,
        product_data: {
          name: `RexiAI recorded ${parsed.actualMinutes as number}min (${billableMinutes}min billable)`,
        },
        unit_amount: amount,
      },
      quantity: 1 as const,
    },
  ]
}

function buildRecordedMetadata(
  parsed: ParsedRecordedBody,
  billableMinutes: number,
  freeAvailable: boolean
) {
  return {
    email: parsed.email,
    bookingId: parsed.bookingId,
    actual_minutes: String(parsed.actualMinutes),
    billable_minutes: String(billableMinutes),
    free_hour_applied: String(freeAvailable),
    recorded_billing: '1',
  }
}

function buildRecordedSessionParams(
  parsed: ParsedRecordedBody,
  amount: number,
  billableMinutes: number,
  freeAvailable: boolean,
  baseUrl: string
) {
  return {
    mode: 'payment' as const,
    currency: 'eur' as const,
    line_items: buildRecordedLineItems(parsed, amount, billableMinutes),
    customer_email: parsed.email,
    metadata: buildRecordedMetadata(parsed, billableMinutes, freeAvailable),
    success_url: `${baseUrl}/booking/success`,
    cancel_url: `${baseUrl}/booking/cancel`,
  } as any
}

async function createRecordedCheckout(
  parsed: ParsedRecordedBody,
  amount: number,
  billableMinutes: number,
  freeAvailable: boolean,
  baseUrl: string,
  res: any
): Promise<{ url: string; id: string } | null> {
  try {
    const stripe = getStripe()
    const params = buildRecordedSessionParams(
      parsed,
      amount,
      billableMinutes,
      freeAvailable,
      baseUrl
    )
    const session = await stripe.checkout.sessions.create(params)
    return session as unknown as { url: string; id: string }
  } catch (e) {
    res.status(500).json({ error: { code: 'STRIPE_ERROR', message: errMsg(e) } })
    return null
  }
}

function sendFreeCheckoutResponse(freeAvailable: boolean, res: any): void {
  res.status(200).json({
    amountCents: 0,
    billableMinutes: 0,
    freeMinutes: getFreeMinutes(freeAvailable),
    checkoutUrl: null,
    freeHourApplied: freeAvailable,
  })
}

async function handlePaidCheckout(
  parsed: ParsedRecordedBody,
  amount: number,
  freeAvailable: boolean,
  req: any,
  res: any
): Promise<void> {
  const billableMinutes = getBillableMinutes(parsed.actualMinutes as number, freeAvailable)
  const freeMinutes = getFreeMinutes(freeAvailable)
  const baseUrl = getBaseUrl(req)
  const session = await createRecordedCheckout(
    parsed,
    amount,
    billableMinutes,
    freeAvailable,
    baseUrl,
    res
  )
  if (!session) return
  res.status(200).json({
    amountCents: amount,
    billableMinutes,
    freeMinutes,
    checkoutUrl: (session as any).url,
    sessionId: (session as any).id,
  })
}

async function handleCheckoutResult(
  parsed: ParsedRecordedBody,
  amount: number,
  freeAvailable: boolean,
  req: any,
  res: any
): Promise<void> {
  if (amount <= 0) {
    sendFreeCheckoutResponse(freeAvailable, res)
    return
  }
  await handlePaidCheckout(parsed, amount, freeAvailable, req, res)
}

export default async function handler(req: any, res: any) {
  if (!isPostMethod(req, res)) return
  if (!isAuthorized(req, res)) return
  const parsed = parseRecordedBillingBody(req.body)
  if (!validateRecordedBillingBody(parsed, res)) return
  const freeAvailable = await getFreeHourAvailability(parsed.email, res)
  if (freeAvailable === null) return
  const amount = recordedBillingCents(parsed.actualMinutes as number, freeAvailable)
  await handleCheckoutResult(parsed, amount, freeAvailable, req, res)
}
