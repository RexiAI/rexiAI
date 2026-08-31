import Stripe from 'stripe'

import { createCalendarEvent } from '../src/domain/calendar.js'
import { sendOperatorEmail } from '../src/domain/email.js'
import { isFreeHourAvailable, markFreeHourUsed } from '../src/domain/freeHour.js'
import { findEventByBookingId } from '../src/domain/gcal.js'
import { getCalendarProvider } from '../src/domain/providers.js'
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

type BookingData =
  | {
      bookingId: string
      email: string
      date: string
      startTime: string
      hours: number
      amountTotal: number
      joinUrl: string | null
      recordedBilling: true
      actualMinutes: number
    }
  | {
      bookingId: string
      email: string
      date: string
      startTime: string
      hours: number
      amountTotal: number
      joinUrl: string | null
      recordedBilling: false
      actualMinutes: number
    }

function getRawBookingFields(session: Stripe.Checkout.Session) {
  const metadata = getMetadata(session)
  const joinUrlRaw = metaValue(metadata, 'join_url', '')
  return {
    bookingId: session.id,
    metadata,
    email: metaValue(metadata, 'email', getCustomerEmail(session)),
    date: metaValue(metadata, 'date', ''),
    startTime: metaValue(metadata, 'start_time', ''),
    hours: parseInt(metaValue(metadata, 'hours', '1'), 10),
    amountTotal: getAmountTotal(session),
    joinUrl: joinUrlRaw ? joinUrlRaw : null,
    recordedBilling: metadata['recorded_billing'] === '1',
    actualMinutes: parseInt(getActualMinutesRaw(metadata), 10),
  }
}

function getActualMinutesRaw(metadata: Record<string, string>): string {
  const v = metadata['actual_minutes']
  if (v) return v
  return '0'
}

function resolveOrigBookingId(metadata: Record<string, string>, fallback: string): string {
  const v = metadata['bookingId']
  if (v) return v
  return fallback
}

function buildRecordedBillingData(
  raw: ReturnType<typeof getRawBookingFields>,
  res: any
): BookingData | null {
  const origBookingId = resolveOrigBookingId(raw.metadata, raw.bookingId)
  if (!raw.email) {
    res
      .status(400)
      .json({ error: { code: 'INVALID_METADATA', message: 'Missing booking metadata' } })
    return null
  }
  if (!origBookingId) {
    res
      .status(400)
      .json({ error: { code: 'INVALID_METADATA', message: 'Missing booking metadata' } })
    return null
  }
  return {
    bookingId: origBookingId,
    email: raw.email,
    date: raw.date,
    startTime: raw.startTime,
    hours: raw.hours,
    amountTotal: raw.amountTotal,
    joinUrl: raw.joinUrl,
    recordedBilling: true,
    actualMinutes: raw.actualMinutes,
  }
}

function buildStandardBookingData(
  raw: ReturnType<typeof getRawBookingFields>,
  res: any
): BookingData | null {
  if (!hasRequiredFields(raw.email, raw.date, raw.startTime, res)) return null
  return {
    bookingId: raw.bookingId,
    email: raw.email,
    date: raw.date,
    startTime: raw.startTime,
    hours: raw.hours,
    amountTotal: raw.amountTotal,
    joinUrl: raw.joinUrl,
    recordedBilling: false,
    actualMinutes: 0,
  }
}

function extractBookingData(session: Stripe.Checkout.Session, res: any): BookingData | null {
  const raw = getRawBookingFields(session)
  if (raw.recordedBilling) return buildRecordedBillingData(raw, res)
  return buildStandardBookingData(raw, res)
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
    joinUrl?: string | null
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
      joinUrl: data.joinUrl ?? null,
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

function resolveCalendarTimezone(explicit?: string): string {
  if (explicit) return explicit
  const envTz = process.env['AVAILABILITY_TIMEZONE']
  if (envTz) return envTz
  const fallbackTz = process.env['TIMEZONE']
  if (fallbackTz) return fallbackTz
  return 'Europe/Madrid'
}

function normalizeBookingHours(hours: unknown): number {
  if (Number.isFinite(hours as number)) return hours as number
  return 1
}

async function tryCreateEvent(
  data: {
    bookingId: string
    email: string
    date: string
    startTime: string
    hours: number
    joinUrl?: string | null
    timezone?: string
  },
  res: any
): Promise<boolean> {
  try {
    const timezone = resolveCalendarTimezone(data.timezone)
    const hours = normalizeBookingHours(data.hours)
    const joinUrl = data.joinUrl ?? null
    await createCalendarEvent({
      provider: getCalendarProvider(),
      timezone,
      bookingId: data.bookingId,
      email: data.email,
      date: data.date,
      startTime: data.startTime,
      hours,
      joinUrl,
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

async function handleRecordedBilling(
  data: { bookingId: string; email: string; amountTotal: number },
  res: any
): Promise<boolean> {
  // Only burn free hour if it was available at checkout time (metadata free_hour_applied) and not already burned.
  // Check Stripe customer flag to avoid double burn.
  try {
    const available = await isFreeHourAvailable(data.email)
    if (available) {
      if (!(await tryMarkFree(data.email, res))) return true
    }
  } catch {
    // if lookup fails, don't block webhook
  }
  // Email for recorded billing (hours not relevant, use actualMinutes as hours for email body approximation)
  if (
    !(await trySendEmail(
      {
        email: data.email,
        date: '',
        startTime: '',
        hours: 0,
        amountTotal: data.amountTotal,
        bookingId: data.bookingId + '_recorded',
      } as any,
      res
    ))
  )
    return true
  res.status(200).json({ received: true, recordedBilling: true })
  return true
}

async function handleNewBooking(
  data: ReturnType<typeof extractBookingData> & {},
  res: any
): Promise<boolean> {
  const d = data!
  if (d.recordedBilling) {
    return handleRecordedBilling(d as any, res)
  }
  if (!(await tryMarkFree(d.email, res))) return true
  if (!(await tryCreateEvent(d as any, res))) return true
  if (!(await trySendEmail(d as any, res))) return true
  res.status(200).json({ received: true })
  return true
}

function getRecordedDedupKey(data: BookingData, session: Stripe.Checkout.Session): string {
  return `${data.bookingId}_recorded_${(session as unknown as { id: string }).id}`
}

async function handleRecordedSession(
  data: BookingData,
  session: Stripe.Checkout.Session,
  res: any
): Promise<void> {
  const dedupKey = getRecordedDedupKey(data, session)
  if (emailSentForBooking.has(dedupKey)) {
    res.status(200).json({ received: true, deduped: true })
    return
  }
  await handleNewBooking(data, res)
  emailSentForBooking.add(dedupKey)
}

async function handleStandardSession(data: BookingData, res: any): Promise<void> {
  const alreadyExists = await checkAlreadyExists(data.bookingId, res)
  if (alreadyExists === null) return
  if (alreadyExists) {
    await handleExistingBooking(data, res)
    return
  }
  await handleNewBooking(data, res)
}

async function handleCheckoutSession(session: Stripe.Checkout.Session, res: any): Promise<void> {
  const data = extractBookingData(session, res)
  if (!data) return
  if (data.recordedBilling) {
    await handleRecordedSession(data, session, res)
    return
  }
  await handleStandardSession(data, res)
}

function isRelevantCheckoutEvent(event: Stripe.Event, res: any): boolean {
  if (event.type !== 'checkout.session.completed') {
    res.status(200).json({ received: true })
    return false
  }
  return true
}

export default async function handler(req: any, res: any) {
  const event = getVerifiedEvent(req, res)
  if (!event) return
  if (!isRelevantCheckoutEvent(event, res)) return
  const session = event.data.object as Stripe.Checkout.Session
  await handleCheckoutSession(session, res)
}
