// Direct booking path — used by api/bookings.ts when isBillingEnabled() is
// false. No Stripe session is created: the booking is completed synchronously
// with the side effects the webhook would otherwise run after
// checkout.session.completed (overlap probe → calendar event → operator email
// → client email), minus every Stripe step.
//
// Error policy is webhook parity (handleNewBooking in api/stripe-webhook.ts),
// with one deliberate divergence: these 500s answer a BROWSER, not Stripe, so
// the bodies carry static messages only — the thrown error's text stays in the
// server log (docs/SECURITY.md §Upstream Error Responses Must Not Reach the
// Client). There is no retry loop here: nothing re-runs these side effects.
import { randomUUID } from 'crypto'

import { createCalendarEvent, findOverlappingBookingId } from '../../src/domain/calendar.js'
import { sendClientEmail, sendOperatorEmail } from '../../src/domain/email.js'
import type { Locale } from '../../src/domain/locale.js'
import { getCalendarProvider } from '../../src/domain/providers.js'
import type { ApiResponse } from '../httpTypes.js'

import { errMsg } from './config.js'

export type DirectBookingInput = {
  email: string
  date: string
  startTime: string
  hours: number
  /** The booking's locale; selects the client consent notice (spec 006 Task 8). */
  locale?: Locale
}

// Mirrors resolveCalendarTimezone in api/stripe-webhook.ts (minus the session
// metadata input, which this path does not have).
function resolveCalendarTimezone(): string {
  const envTz = process.env['AVAILABILITY_TIMEZONE']
  if (envTz) return envTz
  const fallbackTz = process.env['TIMEZONE']
  if (fallbackTz) return fallbackTz
  return 'Europe/Madrid'
}

/** Best-effort backstop probe: a failure reads as "no conflict", never blocks. */
async function detectSlotConflict(bookingId: string, input: DirectBookingInput): Promise<string> {
  try {
    const overlap = await findOverlappingBookingId({
      bookingId,
      date: input.date,
      startTime: input.startTime,
      hours: input.hours,
    })
    if (overlap && overlap !== bookingId) return overlap
    return ''
  } catch {
    return ''
  }
}

async function createCalendarSideEffect(
  bookingId: string,
  input: DirectBookingInput,
  joinUrl: string
): Promise<void> {
  await createCalendarEvent({
    provider: getCalendarProvider(),
    timezone: resolveCalendarTimezone(),
    bookingId,
    email: input.email,
    date: input.date,
    startTime: input.startTime,
    hours: input.hours,
    joinUrl,
  })
}

async function notifyOperator(
  input: DirectBookingInput,
  joinUrl: string,
  slotConflictWith: string
): Promise<void> {
  // Spec 003: this path only runs with billing disabled, so the operator mail
  // renders the billing-disabled variant. The mode rides as a third argument
  // with an explicit undefined fetchImpl (default global fetch) — the input
  // object keeps AC-002-06's pinned shape.
  await sendOperatorEmail(
    {
      clientEmail: input.email,
      date: input.date,
      startTime: input.startTime,
      hours: input.hours,
      amountCents: 0,
      joinUrl,
      kind: 'reservation',
      ...(slotConflictWith ? { slotConflictWith } : {}),
    },
    undefined,
    { billingDisabled: true }
  )
}

/** Logs the full error server-side, answers the browser with a static body. */
function failStatic(
  res: ApiResponse,
  status: number,
  code: string,
  message: string,
  cause: unknown
): void {
  // eslint-disable-next-line no-console
  console.error(`[bookings-direct] ${code}: ${errMsg(cause)}`)
  res.status(status).json({ error: { code, message } })
}

async function trySendClientEmail(input: DirectBookingInput, joinUrl: string): Promise<void> {
  try {
    // First argument keeps the AC-002-06 pinned shape unless this booking carried
    // a locale, which is the one additive field (spec 006 Task 8); the billing
    // mode travels in the third argument position (Decision 3).
    await sendClientEmail(
      {
        clientEmail: input.email,
        date: input.date,
        startTime: input.startTime,
        hours: input.hours,
        joinUrl,
        ...(input.locale ? { locale: input.locale } : {}),
      },
      undefined,
      { billingDisabled: true }
    )
  } catch (e) {
    // Webhook parity: the booking stands; a client-mail failure is log-only.
    // eslint-disable-next-line no-console
    console.error(`[bookings-direct] client confirmation email failed: ${errMsg(e)}`)
  }
}

export async function finishDirectBooking(
  input: DirectBookingInput,
  joinUrl: string,
  res: ApiResponse
): Promise<void> {
  const bookingId = randomUUID()
  const slotConflictWith = await detectSlotConflict(bookingId, input)
  try {
    await createCalendarSideEffect(bookingId, input, joinUrl)
  } catch (e) {
    failStatic(res, 500, 'GCAL_ERROR', 'Could not create the calendar event', e)
    return
  }
  try {
    await notifyOperator(input, joinUrl, slotConflictWith)
  } catch (e) {
    // Webhook parity: the created event is NOT rolled back — there is no retry
    // here that could double-insert, and rollback is not part of the webhook
    // behaviour this path mirrors (10-tasks §Documented decisions 2).
    failStatic(res, 500, 'EMAIL_ERROR', 'Could not notify the operator', e)
    return
  }
  await trySendClientEmail(input, joinUrl)
  res.status(200).json({ checkoutUrl: null, joinUrl, billingDisabled: true })
}
