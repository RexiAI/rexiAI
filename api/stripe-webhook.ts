import Stripe from 'stripe'

import { createCalendarEvent } from '../src/domain/calendar.js'
import { sendClientEmail, sendOperatorEmail } from '../src/domain/email.js'
import { markFreeHourUsed } from '../src/domain/freeHour.js'
import { findEventByBookingId, findOverlappingBookingId } from '../src/domain/gcal.js'
import { getCalendarProvider } from '../src/domain/providers.js'
import { getStripe } from '../src/domain/stripeClient.js'
import { markProcessed, wasProcessed } from '../src/domain/webhookDedup.js'

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

const emailSentForBooking = new Set<string>()

// Cheap first-level short-circuit for retries that land on the same warm
// lambda. It is NOT authoritative: Vercel gives every cold start and every
// concurrent invocation a fresh process, so the durable marker in Stripe
// customer metadata (webhookDedup) is what actually prevents duplicates.
const processedEventIds = new Set<string>()

export function _resetEmailSent() {
  emailSentForBooking.clear()
  processedEventIds.clear()
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
      freeHourApplied: boolean
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
      freeHourApplied: boolean
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
    freeHourApplied: metadata['free_hour_applied'] === 'true',
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
    freeHourApplied: raw.freeHourApplied,
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
    freeHourApplied: raw.freeHourApplied,
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
    kind?: 'reservation' | 'charge'
    slotConflictWith?: string | null
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
      ...(data.kind ? { kind: data.kind } : {}),
      ...(data.slotConflictWith ? { slotConflictWith: data.slotConflictWith } : {}),
    })
    emailSentForBooking.add(data.bookingId)
    return true
  } catch (e) {
    res.status(500).json({ error: { code: 'EMAIL_ERROR', message: errMsg(e) } })
    return false
  }
}

/**
 * The client confirmation is intentionally NOT allowed to fail the webhook.
 * Returning 5xx here would make Stripe retry the whole event, re-running the
 * operator-side effects (calendar insert, operator mail) for a problem that is
 * purely on the client-mail path. The failure is logged and swallowed instead.
 *
 * NOTE: with the Resend sandbox sender this call fails for every real client
 * address by design — see sendClientEmail in src/domain/email.ts.
 */
async function trySendClientEmail(data: {
  email: string
  date: string
  startTime: string
  hours: number
  joinUrl?: string | null
}): Promise<void> {
  try {
    await sendClientEmail({
      clientEmail: data.email,
      date: data.date,
      startTime: data.startTime,
      hours: Number.isFinite(data.hours) ? data.hours : 1,
      joinUrl: data.joinUrl ?? null,
    })
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`[stripe-webhook] client confirmation email failed: ${errMsg(e)}`)
  }
}

type MarkFreeOutcome = { ok: boolean; burned: boolean }

async function tryMarkFree(email: string, res: any): Promise<MarkFreeOutcome> {
  try {
    const result = await markFreeHourUsed(email)
    // `burned: false` means another request consumed the free hour first.
    return { ok: true, burned: result?.burned ?? true }
  } catch (e) {
    res.status(500).json({ error: { code: 'STRIPE_ERROR', message: errMsg(e) } })
    return { ok: false, burned: false }
  }
}

// A checkout session priced with the free hour whose burn was lost to another
// request: the client was charged the discounted amount but the discount was
// already spent. Stripe must not retry (the charge is final), so answer 200 and
// flag it instead.
// TODO(follow-up): surface freeHourConflict in the operator notification body;
// sendOperatorEmail lives in src/domain/email.ts, outside this change's scope.
function conflictBody(freeHourApplied: boolean, burned: boolean): Record<string, unknown> {
  if (freeHourApplied && !burned) return { received: true, freeHourConflict: true }
  return { received: true }
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
  data: { bookingId: string; email: string; amountTotal: number; freeHourApplied: boolean },
  res: any
): Promise<boolean> {
  // markFreeHourUsed is itself a compare-and-set, so no separate availability
  // probe is needed: it burns only when nobody else already did.
  let burned = true
  try {
    const mark = await tryMarkFree(data.email, res)
    if (!mark.ok) return true
    burned = mark.burned
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
        // Recorded-billing sessions are the actual post-meeting charge, even
        // when the pro-rata total happens to land on zero.
        kind: 'charge' as const,
      } as any,
      res
    ))
  )
    return true
  res.status(200).json({ ...conflictBody(data.freeHourApplied, burned), recordedBilling: true })
  return true
}

/**
 * Authoritative-ish slot check at the point the calendar event is written.
 *
 * api/bookings.ts re-checks the slot just before creating the Stripe session,
 * but that is still check-then-act: two clients can both pass it. This probe
 * runs later, against the calendar that actually holds the bookings, and
 * catches the case where a DIFFERENT bookingId already occupies the range.
 *
 * BEST-EFFORT, NOT A GUARANTEE — documented in findOverlappingBookingId. Two
 * webhooks processed concurrently can still both read "clear". When it does
 * fire, the money is already captured, so the correct answer is 200 plus a
 * flag: Stripe must not retry, and the operator must be told to refund.
 * A probe failure is swallowed: it must never block a paid booking.
 */
async function detectSlotConflict(d: {
  bookingId: string
  date: string
  startTime: string
  hours: number
}): Promise<string | null> {
  try {
    return await findOverlappingBookingId({
      bookingId: d.bookingId,
      date: d.date,
      startTime: d.startTime,
      hours: normalizeBookingHours(d.hours),
    })
  } catch {
    return null
  }
}

function bookingBody(
  freeHourApplied: boolean,
  burned: boolean,
  slotConflictWith: string | null
): Record<string, unknown> {
  const base = conflictBody(freeHourApplied, burned)
  if (slotConflictWith) return { ...base, slotConflict: true }
  return base
}

async function handleNewBooking(
  data: ReturnType<typeof extractBookingData> & {},
  res: any
): Promise<boolean> {
  const d = data!
  if (d.recordedBilling) {
    return handleRecordedBilling(d as any, res)
  }
  const mark = await tryMarkFree(d.email, res)
  if (!mark.ok) return true
  const slotConflictWith = await detectSlotConflict(d)
  if (!(await tryCreateEvent(d as any, res))) return true
  if (!(await trySendEmail({ ...(d as any), slotConflictWith }, res))) return true
  await trySendClientEmail(d)
  res.status(200).json(bookingBody(d.freeHourApplied, mark.burned, slotConflictWith))
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

async function dispatchSession(
  data: BookingData,
  session: Stripe.Checkout.Session,
  res: any
): Promise<void> {
  if (data.recordedBilling) {
    await handleRecordedSession(data, session, res)
    return
  }
  await handleStandardSession(data, res)
}

/** Records the status the handler answered with, and forwards it unchanged. */
function statusRecorder(res: any): { res: any; code: () => number } {
  let code = 0
  const proxy = {
    status(c: number) {
      code = c
      res.status(c)
      return proxy
    },
    json(body: unknown) {
      res.json(body)
      return proxy
    },
  }
  return { res: proxy, code: () => code }
}

async function isDuplicateEvent(email: string, eventId: string, res: any): Promise<boolean | null> {
  if (processedEventIds.has(eventId)) return true
  try {
    return await wasProcessed(email, eventId)
  } catch (e) {
    // Fail safe: never assume "already processed" on a lookup outage. A 5xx
    // makes Stripe retry, which is preferable to dropping a paid booking.
    res.status(500).json({ error: { code: 'STRIPE_ERROR', message: errMsg(e) } })
    return null
  }
}

async function recordProcessed(email: string, eventId: string): Promise<void> {
  processedEventIds.add(eventId)
  try {
    await markProcessed(email, eventId)
  } catch {
    // The response has already been sent and the side effects already happened;
    // a failed marker only risks a duplicate on a later retry, which the
    // per-booking guards still narrow.
  }
}

async function handleCheckoutSession(
  session: Stripe.Checkout.Session,
  res: any,
  eventId: string
): Promise<void> {
  const data = extractBookingData(session, res)
  if (!data) return
  const duplicate = await isDuplicateEvent(data.email, eventId, res)
  if (duplicate === null) return
  if (duplicate) {
    res.status(200).json({ received: true, deduped: true })
    return
  }
  const tracked = statusRecorder(res)
  await dispatchSession(data, session, tracked.res)
  if (tracked.code() === 200) await recordProcessed(data.email, eventId)
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
  await handleCheckoutSession(session, res, event.id)
}
