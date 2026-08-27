import Stripe from 'stripe'

import { sendOperatorEmail } from '../src/domain/email.js'
import { markFreeHourUsed } from '../src/domain/freeHour.js'
import { createGCalEvent, findEventByBookingId } from '../src/domain/gcal.js'
import { getStripe } from '../src/domain/stripeClient.js'

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

const emailSentForBooking = new Set<string>()

export function _resetEmailSent() {
  emailSentForBooking.clear()
}

function validateMethod(req: any, res: any): boolean {
  if (req.method !== 'POST') {
    res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } })
    return false
  }
  return true
}

function getSignature(req: any): string | undefined {
  return req.headers?.['stripe-signature'] as string | undefined
}

function getWebhookSecret(): string | undefined {
  return process.env['STRIPE_WEBHOOK_SECRET']
}

function validateSignature(sig: string | undefined, secret: string | undefined, res: any): boolean {
  if (!secret || !sig) {
    res.status(400).json({ error: { code: 'INVALID_SIGNATURE', message: 'Missing signature' } })
    return false
  }
  return true
}

function buildPayload(req: any): string {
  const rawBody = req.bodyRaw ?? req.body ?? ''
  if (typeof rawBody === 'string') return rawBody
  return JSON.stringify(rawBody)
}

function constructStripeEvent(payload: string, sig: string, secret: string): Stripe.Event {
  const stripe = getStripe()
  return stripe.webhooks.constructEvent(payload, sig, secret)
}

function getVerifiedEvent(req: any, res: any): Stripe.Event | null {
  if (!validateMethod(req, res)) return null
  const sig = getSignature(req)
  const secret = getWebhookSecret()
  if (!validateSignature(sig, secret, res)) return null
  try {
    const payload = buildPayload(req)
    return constructStripeEvent(payload, sig!, secret!)
  } catch (e) {
    res.status(400).json({ error: { code: 'INVALID_SIGNATURE', message: errMsg(e) } })
    return null
  }
}

function metaValue(meta: Record<string, string>, key: string, fallback: string): string {
  const v = meta[key]
  if (v !== undefined) return v
  return fallback
}

function getMetadata(session: Stripe.Checkout.Session): Record<string, string> {
  if (session.metadata) return session.metadata as Record<string, string>
  return {}
}

function getCustomerEmail(session: Stripe.Checkout.Session): string {
  const e = session.customer_email
  if (e) return e
  return ''
}

function getAmountTotal(session: Stripe.Checkout.Session): number {
  const a = (session as unknown as { amount_total?: number }).amount_total
  if (a !== undefined) return a
  return 0
}

function hasRequiredFields(email: string, date: string, startTime: string, res: any): boolean {
  if (!email) {
    res
      .status(400)
      .json({ error: { code: 'INVALID_METADATA', message: 'Missing booking metadata' } })
    return false
  }
  if (!date) {
    res
      .status(400)
      .json({ error: { code: 'INVALID_METADATA', message: 'Missing booking metadata' } })
    return false
  }
  if (!startTime) {
    res
      .status(400)
      .json({ error: { code: 'INVALID_METADATA', message: 'Missing booking metadata' } })
    return false
  }
  return true
}

function extractBookingData(session: Stripe.Checkout.Session, res: any) {
  const bookingId = session.id
  const metadata = getMetadata(session)
  const email = metaValue(metadata, 'email', getCustomerEmail(session))
  const date = metaValue(metadata, 'date', '')
  const startTime = metaValue(metadata, 'start_time', '')
  const hours = parseInt(metaValue(metadata, 'hours', '1'), 10)
  const amountTotal = getAmountTotal(session)
  if (!hasRequiredFields(email, date, startTime, res)) return null
  return { bookingId, email, date, startTime, hours, amountTotal }
}

async function checkAlreadyExists(bookingId: string, res: any): Promise<boolean | null> {
  try {
    return await findEventByBookingId(bookingId)
  } catch (e) {
    res.status(500).json({ error: { code: 'GCAL_ERROR', message: errMsg(e) } })
    return null
  }
}

async function trySendEmail(
  data: {
    email: string
    date: string
    startTime: string
    hours: number
    amountTotal: number
    bookingId: string
  },
  res: any
): Promise<boolean> {
  try {
    await sendOperatorEmail({
      clientEmail: data.email,
      date: data.date,
      startTime: data.startTime,
      hours: Number.isFinite(data.hours) ? data.hours : 1,
      amountCents: data.amountTotal,
    })
    emailSentForBooking.add(data.bookingId)
    return true
  } catch (e) {
    res.status(500).json({ error: { code: 'EMAIL_ERROR', message: errMsg(e) } })
    return false
  }
}

async function tryMarkFree(email: string, res: any): Promise<boolean> {
  try {
    await markFreeHourUsed(email)
    return true
  } catch (e) {
    res.status(500).json({ error: { code: 'STRIPE_ERROR', message: errMsg(e) } })
    return false
  }
}

async function tryCreateEvent(
  data: { bookingId: string; email: string; date: string; startTime: string; hours: number },
  res: any
): Promise<boolean> {
  try {
    await createGCalEvent({
      bookingId: data.bookingId,
      email: data.email,
      date: data.date,
      startTime: data.startTime,
      hours: Number.isFinite(data.hours) ? data.hours : 1,
    })
    return true
  } catch (e) {
    res.status(500).json({ error: { code: 'GCAL_ERROR', message: errMsg(e) } })
    return false
  }
}

async function handleExistingBooking(
  data: ReturnType<typeof extractBookingData> & {},
  res: any
): Promise<boolean> {
  const d = data!
  if (emailSentForBooking.has(d.bookingId)) {
    res.status(200).json({ received: true, deduped: true })
    return true
  }
  if (await trySendEmail(d as any, res)) {
    res.status(200).json({ received: true, dedupedEmailSent: true })
  }
  return true
}

async function handleNewBooking(
  data: ReturnType<typeof extractBookingData> & {},
  res: any
): Promise<boolean> {
  const d = data!
  if (!(await tryMarkFree(d.email, res))) return true
  if (!(await tryCreateEvent(d as any, res))) return true
  if (!(await trySendEmail(d as any, res))) return true
  res.status(200).json({ received: true })
  return true
}

export default async function handler(req: any, res: any) {
  const event = getVerifiedEvent(req, res)
  if (!event) return
  if (event.type !== 'checkout.session.completed') {
    return res.status(200).json({ received: true })
  }
  const session = event.data.object as Stripe.Checkout.Session
  const data = extractBookingData(session, res)
  if (!data) return
  const alreadyExists = await checkAlreadyExists(data.bookingId, res)
  if (alreadyExists === null) return
  if (alreadyExists) {
    await handleExistingBooking(data, res)
    return
  }
  await handleNewBooking(data, res)
}
